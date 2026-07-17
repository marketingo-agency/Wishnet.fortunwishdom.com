"use client";

/**
 * Brainstorming (Mode 6): a RAG-grounded creative chat with provider and
 * model pickers, image attachments, and Promptor optimization. The session
 * is an omni_runs row (mode 'brainstorming'); locking the idea distills the
 * conversation into a brief and hands the SAME run to the Omni Images wizard
 * at step 1 with the objective prefilled.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BrainCircuit, Lightbulb, Lock, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GEMINI_TEXT_MODELS, OPENAI_TEXT_MODELS } from '@/config/llmModels';
import {
  trimMessages, useBrainstormChat, useCreateBrainstormRun, useLockBrainstormIdea, useOmniRun, useUpdateOmniRun,
  type OmniChatMessage, type OmniImagesState, type OmniRun, type PendingAttachment,
} from '@/hooks/omni';
import { BrainstormMessage } from './BrainstormMessage';
import { BrainstormComposer } from './BrainstormComposer';

interface BrainstormViewProps {
  runId: string | null;
  onRunCreated: (runId: string) => void;
  onLocked: (run: OmniRun) => void;
  onExit: () => void;
}

export function BrainstormView({ runId, onRunCreated, onLocked, onExit }: BrainstormViewProps) {
  const run = useOmniRun(runId);
  const createRun = useCreateBrainstormRun();
  const updateRun = useUpdateOmniRun();
  const chat = useBrainstormChat();
  const lock = useLockBrainstormIdea();

  const [localMessages, setLocalMessages] = useState<OmniChatMessage[] | null>(null);
  const baseState = useMemo(() => (run.data?.step_state ?? {}) as OmniImagesState, [run.data]);
  const messages = localMessages ?? baseState.messages ?? [];

  const [provider, setProvider] = useState<'openai' | 'gemini'>('openai');
  const [model, setModel] = useState('default');
  const modelOptions = provider === 'openai' ? OPENAI_TEXT_MODELS : GEMINI_TEXT_MODELS;
  const resolvedModel = model === 'default' ? '' : model;

  const [lastRetrieval, setLastRetrieval] = useState<{ brain_chunks: number; heart_rules: number } | null>(null);
  const busy = chat.isPending || lock.isPending || createRun.isPending;

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, chat.isPending]);

  // SIB-15: a failed persist is non-fatal (the next one retries with the full
  // local list) but no longer silent — the composer shows a not-saved note.
  const [persistFailed, setPersistFailed] = useState(false);
  const persistMessages = async (targetRunId: string, next: OmniChatMessage[], state: OmniImagesState) => {
    try {
      await updateRun.mutateAsync({ runId: targetRunId, step_state: { ...state, messages: trimMessages(next) } });
      setPersistFailed(false);
    } catch {
      setPersistFailed(true);
    }
  };

  const handleSend = async (text: string, attachments: PendingAttachment[]) => {
    if (busy) return;
    let targetRunId = runId;
    let state = baseState;
    if (!targetRunId) {
      const created = await createRun.mutateAsync({ firstMessage: text }).catch(() => null);
      if (!created) return;
      targetRunId = created.id;
      state = {};
      onRunCreated(created.id);
    }

    const userMessage: OmniChatMessage = {
      role: 'user',
      content: text,
      attachment_names: attachments.length > 0 ? attachments.map((a) => a.name) : undefined,
      created_at: new Date().toISOString(),
    };
    const withUser = trimMessages([...messages, userMessage]);
    setLocalMessages(withUser);
    void persistMessages(targetRunId, withUser, state);

    try {
      const result = await chat.mutateAsync({
        runId: targetRunId,
        messages: withUser,
        attachments,
        provider,
        model: resolvedModel,
      });
      setLastRetrieval(result.retrieval);
      const withReply = trimMessages([...withUser, {
        role: 'assistant' as const,
        content: result.reply,
        created_at: new Date().toISOString(),
      }]);
      setLocalMessages(withReply);
      void persistMessages(targetRunId, withReply, state);
    } catch {
      // useBrainstormChat already toasts; the user message stays visible.
    }
  };

  const handleLock = async () => {
    if (!runId || messages.length < 2 || busy) return;
    try {
      const brief = await lock.mutateAsync({ runId, messages, provider, model: resolvedModel });
      const updated = await updateRun.mutateAsync({
        runId,
        title: brief.title,
        step_state: { ...baseState, messages: trimMessages(messages), objective: brief.objective, idea_locked: true },
      });
      toast.success(`Idea locked: ${brief.title}`);
      onLocked(updated);
    } catch {
      // Hooks already toast.
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Brainstorming</p>
          <h1 className="truncate text-sm font-semibold sm:text-base">Develop an idea with Omni</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Select value={provider} onValueChange={(v) => { setProvider(v as 'openai' | 'gemini'); setModel('default'); }}>
            <SelectTrigger className="h-8 w-[100px] text-xs" aria-label="Provider"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="openai" className="text-xs">OpenAI</SelectItem>
              <SelectItem value="gemini" className="text-xs">Gemini</SelectItem>
            </SelectContent>
          </Select>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Model"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default" className="text-xs">Workspace default</SelectItem>
              {modelOptions.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => void handleLock()}
            disabled={!runId || messages.length < 2 || busy}
            className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-xs text-white transition-all duration-300 hover:opacity-90"
          >
            <Lock className="h-3.5 w-3.5" /> {lock.isPending ? 'Locking...' : 'Lock idea'}
          </Button>
          <Button variant="ghost" size="icon" onClick={onExit} aria-label="Exit brainstorming" className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          {messages.length === 0 && !busy ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/20">
                <Lightbulb className="h-8 w-8" />
              </div>
              <div className="max-w-md">
                <h2 className="text-base font-semibold">What are you imagining?</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Share a spark of an idea. Omni develops it with you, grounded in your Brain knowledge, Wishpedia canon, and every Heart rule. Lock it when it feels right and continue straight into generation.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) => <BrainstormMessage key={`${m.created_at}-${i}`} message={m} />)}
              {chat.isPending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                    <Lightbulb className="h-4 w-4 animate-pulse" />
                  </span>
                  Omni is thinking...
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {lastRetrieval && (
        <p className="flex shrink-0 items-center gap-1.5 px-4 pb-1 text-[10px] text-muted-foreground sm:px-6">
          <BrainCircuit className="h-3 w-3" />
          Last reply grounded in {lastRetrieval.brain_chunks} knowledge chunks under {lastRetrieval.heart_rules} Heart rules
        </p>
      )}

      {persistFailed && (
        <p
          role="status"
          className="flex shrink-0 items-center gap-1.5 px-4 pb-1 text-xs text-amber-700 [[data-omni-theme=dark]_&]:text-amber-300 sm:px-6"
        >
          <AlertTriangle className="h-3 w-3 shrink-0" />
          The latest messages are not saved yet — they stay in this session and saving retries with your next message.
        </p>
      )}

      <BrainstormComposer disabled={busy} onSend={(text, attachments) => void handleSend(text, attachments)} />
    </div>
  );
}
