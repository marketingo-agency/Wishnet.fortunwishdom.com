"use client";

/**
 * Active state of the One-Screen Preview: a mock conversation (chat entries
 * and composer sends) or a run-card snapshot (wizard entries). Replies are
 * canned and delayed briefly to sell the loop; no AI is called.
 */
import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { FortunLogo } from '@/components/brand/FortunLogo';
import { cn } from '@/lib/utils';
import {
  ADHOC_REPLY,
  MOCK_THREADS,
  type PreviewMessage,
  type PreviewRun,
} from './previewMockData';
import { PreviewComposer } from './PreviewComposer';
import { PreviewRunCard } from './PreviewRunCard';
import { PT } from './previewTokens';

interface PreviewActiveViewProps {
  run?: PreviewRun;
  adhocPrompt?: string;
}

const FOLLOWUP_REPLY: PreviewMessage = {
  role: 'omni',
  text: 'Noted. In the real build this reply is generated live, grounded in your Heart rules and Brain knowledge, and the thread keeps resuming from this exact point.',
};

const FALLBACK_THREAD: PreviewMessage[] = [
  { role: 'omni', text: 'This entry opens its saved conversation here in the real build. The preview scripts a few of the threads; pick "Q3 giveaway brainstorm" for the full demo.' },
];

const TypingDots = () => (
  <span className="flex items-center gap-1 py-1" role="status" aria-label="Omni is typing">
    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:0ms]" />
    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
  </span>
);

const MessageBubble = ({ message }: { message: PreviewMessage }) => {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className={cn('max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed', PT.bubbleUser)}>
          {message.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <FortunLogo variant="mini" className="mt-0.5 h-7 w-7 shrink-0" />
      <div className="min-w-0 flex-1 space-y-3">
        <p className={cn('text-sm leading-relaxed', PT.muted)}>{message.text}</p>
        {message.tiles && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {message.tiles.map((tile) => (
              <div
                key={tile.label}
                className={cn('relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br', tile.gradient)}
                role="img"
                aria-label={`Mock ${tile.label} visual, ${tile.ratio}`}
              >
                <ImageIcon className="h-6 w-6 text-white/70" aria-hidden="true" />
                <div className="absolute bottom-1.5 left-2 leading-tight">
                  <p className="text-[11px] font-semibold text-white/90">{tile.label}</p>
                  <p className="text-[10px] text-white/70">{tile.ratio}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const PreviewActiveView = ({ run, adhocPrompt }: PreviewActiveViewProps) => {
  const isRunCard = !!run && run.kind === 'run';
  const [messages, setMessages] = useState<PreviewMessage[]>(() => {
    if (adhocPrompt) return [{ role: 'user', text: adhocPrompt }];
    if (run && run.kind === 'chat') return MOCK_THREADS[run.id] ?? FALLBACK_THREAD;
    return [];
  });
  const [isTyping, setIsTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ad-hoc sends open with the user's prompt, then a simulated reply lands.
  useEffect(() => {
    if (!adhocPrompt) return;
    setIsTyping(true);
    timerRef.current = setTimeout(() => {
      setMessages((prev) => [...prev, ADHOC_REPLY]);
      setIsTyping(false);
    }, 900);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [adhocPrompt]);

  // Chat-thread sends set the timer OUTSIDE the adhoc effect (which early
  // returns and registers no cleanup), and the parent remounts this view per
  // selection — so the timer needs an unconditional unmount cleanup.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [messages.length, isTyping]);

  const handleSend = (text: string) => {
    setDraft('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setIsTyping(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setMessages((prev) => [...prev, FOLLOWUP_REPLY]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          {isRunCard && run ? (
            <PreviewRunCard run={run} />
          ) : (
            <div className="space-y-5">
              {messages.map((message, i) => (
                <MessageBubble key={`${message.role}-${i}`} message={message} />
              ))}
              {isTyping && (
                <div className={cn('flex items-center gap-3', PT.faint)}>
                  <FortunLogo variant="mini" className="h-7 w-7 shrink-0" />
                  <TypingDots />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!isRunCard && (
        <div className={cn('shrink-0 border-t px-4 py-3 sm:px-6', PT.border)}>
          <div className="mx-auto w-full max-w-3xl">
            <PreviewComposer
              value={draft}
              onChange={setDraft}
              onSend={handleSend}
              docked
              placeholder="Reply to Omni…"
            />
            <p className={cn('mt-2 text-center text-[11px]', PT.faint)}>
              Simulated response. No AI is called in this preview.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
