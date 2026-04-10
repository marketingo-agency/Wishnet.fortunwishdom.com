/**
 * Osha Chat Controller Hook
 * Extracts all state, refs, and handlers from OshaChat into a reusable hook.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { PendingAttachment } from '@/types/attachments';
import { extractTextFromFile, ACCEPTED_FILE_TYPES } from '@/lib/fileProcessing';
import {
  useSendOshaMessage,
  useClearOshaHistory,
  useDeleteOshaMessage,
  type OshaMessage,
  type OshaSettings,
  type AttachmentContext,
} from '@/hooks/useOsha';
import { useOshaDeepResearch, useOshaDeepResearchClarify } from '@/hooks/useOshaPower';
import { toast } from 'sonner';
import {
  IDEATION_MODE_VALUES,
  POWER_MODE_VALUES,
  ASSISTANT_STARTERS,
  IDEATION_STARTERS,
  POWER_STARTERS,
  getProgressMessage,
} from '@/components/osha/oshaConstants';

interface UseOshaChatControllerParams {
  messages: OshaMessage[];
  settings: OshaSettings;
  onMessagesChange?: () => void;
  compact?: boolean;
}

export function useOshaChatController({
  messages,
  settings,
  onMessagesChange,
  compact = false,
}: UseOshaChatControllerParams) {
  // ── State ──────────────────────────────────────────────────────────────
  const [input, setInput] = useState('');
  const [mode, setMode] = useState(settings.default_mode || 'guide');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<OshaMessage[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [clearPending, setClearPending] = useState(false);
  const [researchElapsed, setResearchElapsed] = useState(0);
  const [researchTopic, setResearchTopic] = useState('');
  const [researchProgressText, setResearchProgressText] = useState('');
  const [researchPhase, setResearchPhase] = useState<'idle' | 'clarifying' | 'researching'>('idle');
  const [researchOriginalTopic, setResearchOriginalTopic] = useState('');

  // ── Refs ───────────────────────────────────────────────────────────────
  const dbSyncCooldownRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const researchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Mutations ──────────────────────────────────────────────────────────
  const { mutateAsync: sendMessage } = useSendOshaMessage();
  const { mutate: clearHistory, isPending: isClearing } = useClearOshaHistory();
  const { mutate: deleteMessage } = useDeleteOshaMessage();
  const deepResearch = useOshaDeepResearch();
  const deepResearchClarify = useOshaDeepResearchClarify();

  // ── Derived ────────────────────────────────────────────────────────────
  const isIdeationMode = IDEATION_MODE_VALUES.has(mode);
  const isPowerMode = POWER_MODE_VALUES.has(mode);

  // ── Effects ────────────────────────────────────────────────────────────

  // Sync messages from DB
  useEffect(() => {
    if (isPending) return;
    if (dbSyncCooldownRef.current) return;
    setLocalMessages(prev => {
      if (messages.length === 0 && prev.length === 0) return messages;
      if (messages.length >= prev.length) return messages;
      const lastLocal = prev[prev.length - 1];
      if (lastLocal && messages.some(m => m.content === lastLocal.content)) return messages;
      return prev;
    });
  }, [messages, isPending]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [localMessages, isPending, researchProgressText]);

  // Sync default mode
  useEffect(() => { setMode(settings.default_mode || 'guide'); }, [settings.default_mode]);

  // Deep research progress text
  useEffect(() => {
    if (!isPending || researchPhase !== 'researching' || !researchTopic) return;
    const msg = getProgressMessage(researchElapsed, researchTopic);
    if (msg) setResearchProgressText(msg);
  }, [researchElapsed, isPending, researchPhase, researchTopic]);

  // Cleanup research timer
  useEffect(() => {
    return () => { if (researchTimerRef.current) clearInterval(researchTimerRef.current); };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleDeleteMessage = useCallback((id: string) => {
    setLocalMessages(prev => prev.filter(m => m.id !== id));
    deleteMessage(id);
  }, [deleteMessage]);

  const handleTextareaInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const handleCopy = useCallback(async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { toast.error('Failed to copy'); }
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const maxSize = settings.max_file_size_mb * 1024 * 1024;
    const newAttachments: PendingAttachment[] = [];

    for (const file of Array.from(files)) {
      if (!ACCEPTED_FILE_TYPES.includes(file.type) && !file.name.match(/\.(txt|md|csv|json|pdf|docx|xlsx|png|jpg|jpeg|webp)$/i)) {
        toast.error(`${file.name}: unsupported file type`);
        continue;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name}: exceeds ${settings.max_file_size_mb}MB limit`);
        continue;
      }
      newAttachments.push({ id: crypto.randomUUID(), file, name: file.name, type: file.type, status: 'processing' });
    }

    setPendingAttachments(prev => [...prev, ...newAttachments]);

    for (const att of newAttachments) {
      try {
        const result = await extractTextFromFile(att.file, settings.max_pages_processed);
        setPendingAttachments(prev =>
          prev.map(a => a.id === att.id
            ? { ...a, status: 'ready', extractedContent: result.text, isImage: result.isImage, base64: result.base64 }
            : a
          )
        );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- file extraction errors have no stable type
      } catch (e: any) {
        setPendingAttachments(prev =>
          prev.map(a => a.id === att.id ? { ...a, status: 'error', errorMessage: e.message } : a)
        );
      }
    }
  }, [settings.max_file_size_mb, settings.max_pages_processed]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text && pendingAttachments.filter(a => a.status === 'ready').length === 0) return;
    if (isPending) return;

    const readyAttachments = pendingAttachments.filter(a => a.status === 'ready');
    if (pendingAttachments.some(a => a.status === 'processing')) {
      toast.info('Please wait for file processing to complete');
      return;
    }

    const userMsg: OshaMessage = {
      id: crypto.randomUUID(),
      user_id: '',
      role: 'user',
      content: text || '(attached files)',
      mode,
      attachments: readyAttachments.map(a => ({ name: a.name, type: a.type, size: a.file.size })),
      created_at: new Date().toISOString(),
    };

    setLocalMessages(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setPendingAttachments([]);
    setIsPending(true);

    // ── Deep Research flow ───────────────────────────────────────────────
    if (mode === 'deep-research') {
      if (researchPhase === 'idle') {
        const history = localMessages.slice(-20).map(m => ({
          role: m.role as 'user' | 'assistant', content: m.content,
        }));
        try {
          const result = await deepResearchClarify.mutateAsync({ message: text, conversationHistory: history });
          setLocalMessages(prev => [...prev, {
            id: crypto.randomUUID(), user_id: '', role: 'assistant',
            content: result.questions, mode, created_at: new Date().toISOString(),
          }]);
          setResearchPhase('clarifying');
          setResearchOriginalTopic(text);
        } catch {
          setLocalMessages(prev => [...prev, {
            id: crypto.randomUUID(), user_id: '', role: 'assistant',
            content: "I couldn't generate clarifying questions. Please try again.",
            mode, created_at: new Date().toISOString(),
          }]);
        } finally { setIsPending(false); }
        return;
      }

      if (researchPhase === 'clarifying') {
        setResearchPhase('researching');
        setResearchElapsed(0);
        setResearchTopic(researchOriginalTopic);
        setResearchProgressText('');
        dbSyncCooldownRef.current = true;
        researchTimerRef.current = setInterval(() => setResearchElapsed(prev => prev + 1), 1000);

        const history = localMessages.slice(-20).map(m => ({
          role: m.role as 'user' | 'assistant', content: m.content,
        }));
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
          const result = await deepResearch.mutateAsync({
            message: researchOriginalTopic, clarificationAnswers: text,
            conversationHistory: history, signal: abortController.signal,
            onResolvedTopic: (resolved) => setResearchTopic(resolved),
          });
          setResearchProgressText('');
          setLocalMessages(prev => [...prev, {
            id: crypto.randomUUID(), user_id: '', role: 'assistant',
            content: result.content, mode, created_at: new Date().toISOString(),
          }]);
          setTimeout(() => { dbSyncCooldownRef.current = false; onMessagesChange?.(); }, 8000);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- edge function errors may include AbortError name check
        } catch (err: any) {
          setResearchProgressText('');
          const content = err?.name === 'AbortError'
            ? "🛑 Research was cancelled."
            : "Deep research encountered an error. Please try again.";
          setLocalMessages(prev => [...prev, {
            id: crypto.randomUUID(), user_id: '', role: 'assistant',
            content, mode, created_at: new Date().toISOString(),
          }]);
          dbSyncCooldownRef.current = false;
        } finally {
          if (researchTimerRef.current) clearInterval(researchTimerRef.current);
          researchTimerRef.current = null;
          abortControllerRef.current = null;
          setResearchTopic('');
          setResearchPhase('idle');
          setResearchOriginalTopic('');
          setIsPending(false);
        }
        return;
      }
      setIsPending(false);
      return;
    }

    // ── Standard chat flow ──────────────────────────────────────────────
    const contextHistory = localMessages.map(m => ({
      role: m.role as 'user' | 'assistant', content: m.content,
    }));
    const attachmentsCtx: AttachmentContext[] = readyAttachments.map(a => {
      if (a.type === 'application/pdf') {
        return { name: a.name, type: 'application/pdf', content: a.base64 || '', isImage: false };
      }
      return { name: a.name, type: a.type, content: a.isImage ? (a.base64 || '') : (a.extractedContent || ''), isImage: a.isImage };
    });

    try {
      const result = await sendMessage({
        message: text || 'Please analyze the attached file(s)',
        mode, conversationHistory: contextHistory, attachments: attachmentsCtx,
      });
      setLocalMessages(prev => [...prev, {
        id: crypto.randomUUID(), user_id: '', role: 'assistant',
        content: result.content, mode,
        is_image: result.isImage || false, image_url: result.imageUrl,
        usedWebSearch: result.usedWebSearch || false, analyzedUrls: result.analyzedUrls || false,
        created_at: new Date().toISOString(),
      }]);
      onMessagesChange?.();
    } catch {
      setLocalMessages(prev => [...prev, {
        id: crypto.randomUUID(), user_id: '', role: 'assistant',
        content: "I'm having trouble processing your request right now. Please try again.",
        mode, created_at: new Date().toISOString(),
      }]);
    } finally { setIsPending(false); }
  }, [input, pendingAttachments, isPending, mode, localMessages, sendMessage, onMessagesChange, deepResearch, deepResearchClarify, researchPhase, researchOriginalTopic]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }, [handleFileSelect]);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const files = e.clipboardData?.files;
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    e.preventDefault();
    const dt = new DataTransfer();
    imageFiles.forEach(f => dt.items.add(f));
    handleFileSelect(dt.files);
  }, [handleFileSelect]);

  const handleAbort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsPending(false);
    if (researchTimerRef.current) {
      clearInterval(researchTimerRef.current);
      researchTimerRef.current = null;
    }
  }, []);

  // Quick starters
  const hasCustomStarters = compact && settings.bubble_quick_starters?.length > 0 && settings.bubble_quick_starters.some(qs => qs.label?.trim());
  const quickStarters = hasCustomStarters
    ? settings.bubble_quick_starters.filter(qs => qs.label?.trim())
    : isPowerMode
      ? (POWER_STARTERS[mode] || POWER_STARTERS['deep-research'])
      : isIdeationMode
        ? (IDEATION_STARTERS[mode] || IDEATION_STARTERS.spark)
        : (ASSISTANT_STARTERS[mode] || ASSISTANT_STARTERS.guide);

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const getModeGradient = () => {
    if (isPowerMode) return 'from-teal-500 to-emerald-500';
    if (isIdeationMode) return 'from-yellow-500 to-amber-500';
    return 'from-sky-500 to-cyan-400';
  };

  return {
    // State
    input, setInput, mode, setMode,
    pendingAttachments, setPendingAttachments,
    copiedId, localMessages, isPending,
    clearPending, setClearPending,
    researchElapsed, researchTopic, researchProgressText, researchPhase,
    isIdeationMode, isPowerMode,
    isClearing, quickStarters,

    // Refs
    scrollRef, fileInputRef, textareaRef,

    // Handlers
    handleSend, handleKeyDown, handleCopy, handleDeleteMessage,
    handleTextareaInput, handleFileSelect,
    handleDrop, handleDragOver, handlePaste, handleAbort,
    clearHistory, formatElapsed, getModeGradient,

    // Display
    displayMessages: localMessages,
  };
}
