import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Send, Loader2, Palette, Paperclip, Smile, Clock, X, FileText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { PixelOutputCard, PixelUserBrief } from './PixelOutputCard';
import type { PendingAttachment } from '@/types/attachments';
import { extractTextFromFile, ACCEPTED_FILE_TYPES } from '@/lib/fileProcessing';
import { formatFileSize } from '@/lib/fileTypes';
import {
  useSendPixelMessage, useDeletePixelMessage,
  type PixelMessage, type PixelSettings, type AttachmentContext, type PixelBlueprint,
} from '@/hooks/usePixel';
import { toast } from 'sonner';
import type { PixelMode } from './PixelTopBar';
import { EMPTY_STAGE_CARDS, MODE_PLACEHOLDERS } from './pixelConstants';

interface PixelStudioProps {
  messages: PixelMessage[];
  settings: PixelSettings;
  isLoadingMessages: boolean;
  onMessagesChange?: () => void;
  activeBlueprint: PixelBlueprint | null;
  onBlueprintSelect: (bp: PixelBlueprint | null) => void;
  mode: PixelMode;
  styleLock: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  pendingAttachments: PendingAttachment[];
  onAttachmentsChange: (attachments: PendingAttachment[]) => void;
  onAuditUpdate: (audit: { heartCount: number; brainCount: number; complianceStatus: string }) => void;
  onSendStarterPrompt: (prompt: string) => void;
  _starterPrompt?: string;
  _starterTrigger?: number;
  selectedPostType?: string | null;
  selectedSize?: { width: number; height: number; ratio: string } | null;
  globalReferences?: PendingAttachment[];
}

export function PixelStudio({
  messages, settings, isLoadingMessages, onMessagesChange,
  activeBlueprint, mode, styleLock, fileInputRef,
  pendingAttachments, onAttachmentsChange, onAuditUpdate, onSendStarterPrompt,
  _starterPrompt, _starterTrigger,
  selectedPostType, selectedSize,
  globalReferences = [],
}: PixelStudioProps) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<PixelMessage[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [pendingStarter, setPendingStarter] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevTriggerRef = useRef(0);

  const isVideoGeneration = useMemo(() => {
    const vt = selectedPostType?.toLowerCase() || '';
    return vt.includes('video') || vt.includes('reel') || vt.includes('story') || vt.includes('tiktok');
  }, [selectedPostType]);

  // Simulated progress timer
  useEffect(() => {
    if (isPending) {
      setGenerationStartTime(Date.now());
      setGenerationProgress(0);
      const interval = setInterval(() => {
        setGenerationStartTime(prev => {
          if (!prev) return prev;
          const elapsed = (Date.now() - prev) / 1000;
          const expectedDuration = isVideoGeneration ? 60 : 15;
          const progress = 95 * (1 - Math.exp(-elapsed / (expectedDuration * 0.4)));
          setGenerationProgress(Math.round(progress));
          return prev;
        });
      }, 500);
      return () => clearInterval(interval);
    } else if (generationStartTime) {
      setGenerationProgress(100);
      const timeout = setTimeout(() => { setGenerationStartTime(null); setGenerationProgress(0); }, 600);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- generationStartTime is intentionally excluded to avoid restart loops
  }, [isPending, isVideoGeneration]);

  const { mutateAsync: sendMessage } = useSendPixelMessage();
  const { mutate: deleteMessage } = useDeletePixelMessage();

  useEffect(() => { setLocalMessages(messages); }, [messages]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [localMessages, isPending]);

  useEffect(() => {
    if (_starterTrigger && _starterTrigger !== prevTriggerRef.current && _starterPrompt) {
      prevTriggerRef.current = _starterTrigger;
      setPendingStarter(_starterPrompt);
    }
  }, [_starterTrigger, _starterPrompt]);

  const handleDeleteMessage = useCallback((id: string) => {
    setLocalMessages(prev => prev.filter(m => m.id !== id));
    deleteMessage(id);
  }, [deleteMessage]);

  const handleCopy = useCallback(async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { toast.error('Failed to copy'); }
  }, []);

  const handleTextareaInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, []);

  const attachmentPreviews = useMemo(() => {
    return pendingAttachments.map(att => ({
      ...att,
      previewUrl: att.type.startsWith('image/') ? URL.createObjectURL(att.file) : undefined,
    }));
  }, [pendingAttachments]);

  useEffect(() => {
    return () => { attachmentPreviews.forEach(a => { if (a.previewUrl) URL.revokeObjectURL(a.previewUrl); }); };
  }, [attachmentPreviews]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    const readyAttachments = pendingAttachments.filter(a => a.status === 'ready');
    const readyGlobalRefs = globalReferences.filter(a => a.status === 'ready');
    if (!text && readyAttachments.length === 0 && readyGlobalRefs.length === 0) return;
    if (isPending) return;
    if (pendingAttachments.some(a => a.status === 'processing')) { toast.info('Please wait for file processing'); return; }

    const userMsg: PixelMessage = {
      id: crypto.randomUUID(), user_id: '', role: 'user',
      content: text || '(attached files)', mode,
      attachments: readyAttachments.map(a => ({ name: a.name, type: a.type, size: a.file.size })),
      created_at: new Date().toISOString(),
      selected_post_type: selectedPostType || undefined,
      selected_size: selectedSize || undefined,
    };

    setLocalMessages(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    onAttachmentsChange([]);
    setIsPending(true);

    const contextHistory = localMessages.map(m => {
      let content = m.content;
      if (m.is_image && m.image_url) content += `\n[Generated image: ${m.image_url}]`;
      if (m.is_video && m.video_url) content += `\n[Generated video: ${m.video_url}]`;
      if (m.attachments?.length) content += `\n[Attached files: ${m.attachments.map(a => a.name).join(', ')}]`;
      if (m.selected_post_type) content += `\n[Format: ${m.selected_post_type}${m.selected_size ? `, ${m.selected_size.width}x${m.selected_size.height}` : ''}]`;
      return { role: m.role as 'user' | 'assistant', content };
    });

    const attachmentsCtx: AttachmentContext[] = [];
    for (const a of readyGlobalRefs) {
      attachmentsCtx.push({ name: a.name, type: a.type, content: a.isImage ? (a.base64 || '') : (a.type === 'application/pdf' ? (a.base64 || '') : (a.extractedContent || '')), isImage: a.isImage });
    }
    for (const a of readyAttachments) {
      attachmentsCtx.push({ name: a.name, type: a.type, content: a.isImage ? (a.base64 || '') : (a.type === 'application/pdf' ? (a.base64 || '') : (a.extractedContent || '')), isImage: a.isImage });
    }
    const lastAssistant = [...localMessages].reverse().find(m => m.role === 'assistant');
    const lastBlueprintSummary = styleLock && lastAssistant ? lastAssistant.content.slice(0, 500) : undefined;

    try {
      const result = await sendMessage({
        message: text || 'Please analyze the attached file(s)',
        mode, conversationHistory: contextHistory, attachments: attachmentsCtx,
        blueprint: activeBlueprint || undefined, styleLock, lastBlueprintSummary,
        selectedPostType: selectedPostType || undefined,
        selectedSize: selectedSize || undefined,
      });
      if (result.audit) onAuditUpdate(result.audit);
      const assistantMsg: PixelMessage = {
        id: crypto.randomUUID(), user_id: '', role: 'assistant',
        content: result.content, mode,
        is_image: result.isImage || false, image_url: result.imageUrl,
        is_video: result.isVideo || false, video_url: result.videoUrl,
        created_at: new Date().toISOString(),
        selected_post_type: selectedPostType || undefined,
        selected_size: selectedSize || undefined,
      };
      setLocalMessages(prev => [...prev, assistantMsg]);
      onMessagesChange?.();
    } catch {
      setLocalMessages(prev => [...prev, {
        id: crypto.randomUUID(), user_id: '', role: 'assistant',
        content: "I'm having trouble processing your request. Please try again.",
        mode, created_at: new Date().toISOString(),
      }]);
    } finally { setIsPending(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedPostType and selectedSize are read from refs at call time, not reactive deps
  }, [input, pendingAttachments, globalReferences, isPending, mode, localMessages, sendMessage, onMessagesChange, activeBlueprint, styleLock, onAuditUpdate, onAttachmentsChange]);

  useEffect(() => {
    if (pendingStarter && !isPending) {
      const prompt = pendingStarter;
      setPendingStarter(null);
      setInput(prompt);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px';
          textareaRef.current.focus();
        }
      });
    }
  }, [pendingStarter, isPending]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const newAttachments: PendingAttachment[] = [];
    for (const file of Array.from(files)) {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) { toast.error(`${file.name}: unsupported file type`); continue; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: exceeds 10MB limit`); continue; }
      newAttachments.push({ id: crypto.randomUUID(), file, name: file.name, type: file.type, status: 'processing' });
    }
    const allAttachments = [...pendingAttachments, ...newAttachments];
    onAttachmentsChange(allAttachments);
    for (const att of newAttachments) {
      try {
        const result = await extractTextFromFile(att.file);
        onAttachmentsChange(allAttachments.map(a => a.id === att.id ? { ...a, status: 'ready' as const, extractedContent: result.text, isImage: result.isImage, base64: result.base64 } : a));
      } catch (e: any) {
        onAttachmentsChange(allAttachments.map(a => a.id === att.id ? { ...a, status: 'error' as const, errorMessage: e.message } : a));
      }
    }
  }, [pendingAttachments, onAttachmentsChange]);

  // Pair up messages
  const messagePairs: Array<{ user: PixelMessage; ai: PixelMessage | null }> = [];
  const msgs = [...localMessages];
  let i = 0;
  while (i < msgs.length) {
    if (msgs[i].role === 'user') {
      const user = msgs[i];
      const ai = msgs[i + 1]?.role === 'assistant' ? msgs[i + 1] : null;
      messagePairs.push({ user, ai });
      i += ai ? 2 : 1;
    } else { i++; }
  }

  const stageCards = EMPTY_STAGE_CARDS[mode] || EMPTY_STAGE_CARDS.cross_platform;

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 bg-background">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES.join(',')}
        className="hidden"
        onChange={e => handleFileSelect(e.target.files)}
      />

      {/* Output canvas */}
      <div
        ref={scrollRef}
        className={cn(
          'flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6',
          '[&::-webkit-scrollbar]:w-1.5',
          '[&::-webkit-scrollbar-thumb]:rounded-full',
          '[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30',
          '[&::-webkit-scrollbar-track]:transparent',
        )}
      >
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
          </div>
        ) : localMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4 select-none">
            <div className="relative mb-8">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-2xl shadow-pink-500/30">
                <Palette className="h-11 w-11 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-card" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">What shall we create?</h2>
            <p className="text-sm text-muted-foreground mb-10 max-w-sm leading-relaxed">
              I'm Pixel — your visual director. Describe a creative goal below, or start with one of these:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl w-full">
              {stageCards.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendStarterPrompt(card.prompt)}
                  disabled={isPending}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-border bg-background hover:bg-muted hover:border-pink-500/30 text-muted-foreground hover:text-foreground transition-all group"
                >
                  <div className="h-9 w-9 rounded-xl bg-muted group-hover:bg-pink-500/10 border border-border group-hover:border-pink-500/25 flex items-center justify-center text-muted-foreground group-hover:text-pink-400 transition-all">
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground group-hover:text-foreground transition-colors">{card.label}</p>
                    <p className="text-[10px] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors mt-0.5">{card.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8 max-w-3xl mx-auto">
            {messagePairs.map(({ user, ai }) =>
              ai ? (
                <PixelOutputCard
                  key={user.id}
                  userMessage={user}
                  aiMessage={ai}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                  onDelete={handleDeleteMessage}
                  blueprintName={activeBlueprint?.name}
                  selectedPostType={user.selected_post_type}
                  selectedSize={user.selected_size}
                  mode={user.mode}
                />
              ) : (
                <PixelUserBrief key={user.id} message={user} onDelete={handleDeleteMessage} />
              )
            )}
            {isPending && (
              <div className="ml-0 sm:ml-8 animate-in slide-in-from-bottom-3 duration-300">
                <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-pink-500/10 to-transparent border-b border-border">
                    <div className="h-5 w-5 rounded-md bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                      <Palette className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs text-pink-400 font-medium">
                      {generationProgress >= 100 ? 'Done!' : 'Creating…'}
                    </span>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <Progress value={generationProgress} className="h-2 bg-muted" indicatorClassName="bg-gradient-to-r from-pink-500 to-rose-500" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {(() => {
                          const elapsed = generationStartTime ? (Date.now() - generationStartTime) / 1000 : 0;
                          if (elapsed < 3) return 'Analyzing your brief…';
                          if (elapsed < 8) return 'Composing layout…';
                          if (elapsed < 15) return 'Rendering visuals…';
                          if (elapsed < 30) return 'Applying style & detail…';
                          if (elapsed < 60) return 'Refining output…';
                          return 'Almost there…';
                        })()}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {generationStartTime ? `${Math.round((Date.now() - generationStartTime) / 1000)}s` : '0s'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Creative input bar */}
      <div className="shrink-0 border-t border-border bg-background/80 px-3 py-3 sm:px-6 sm:py-4">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border bg-background focus-within:border-pink-500/50 focus-within:ring-1 focus-within:ring-pink-500/15 transition-all shadow-lg shadow-black/20">
            {pendingAttachments.length > 0 && (
              <div className="px-3 pt-3 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:transparent">
                {attachmentPreviews.map(att => (
                  <div key={att.id} className="relative shrink-0 group">
                    {att.type.startsWith('image/') && att.previewUrl ? (
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-border bg-muted">
                        <Image src={att.previewUrl} alt={att.name} fill className="object-cover" unoptimized />
                        {att.status === 'processing' && (
                          <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg">
                            <Loader2 className="h-3 w-3 animate-spin text-pink-400" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-12 flex items-center gap-2 px-2.5 rounded-lg border border-border bg-muted max-w-[160px]">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-medium text-foreground truncate leading-tight">{att.name}</p>
                          <p className="text-[9px] text-muted-foreground/60 leading-tight">
                            {att.status === 'processing' ? 'Reading…' : att.status === 'error' ? 'Error' : formatFileSize(att.file.size)}
                          </p>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => onAttachmentsChange(pendingAttachments.filter(a => a.id !== att.id))}
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted text-foreground hover:text-rose-400 hover:bg-muted flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              disabled={isPending}
              rows={1}
              placeholder={MODE_PLACEHOLDERS[mode]}
              className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50 min-h-[48px] max-h-[180px] leading-relaxed"
            />
            <div className="flex items-center justify-between px-3 pb-2.5">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                  className="h-8 w-8 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
                  title="Attach file (temporary)"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <Popover>
                  <PopoverTrigger asChild>
                    <button disabled={isPending} className="h-8 w-8 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50" title="Insert emoji">
                      <Smile className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-auto p-2 bg-muted border-border">
                    <div className="grid grid-cols-8 gap-1">
                      {['😀','😂','🔥','❤️','✨','👏','🎨','💡','🚀','💪','🎯','⭐','👀','💯','🙌','✅','📸','🎬','🖼️','📐','🎭','💎','🌟','⚡','🏆','💫','🎉','🤩','😍','👌','✌️','🤘'].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            const ta = textareaRef.current;
                            if (ta) {
                              const start = ta.selectionStart;
                              const end = ta.selectionEnd;
                              const newVal = input.slice(0, start) + emoji + input.slice(end);
                              setInput(newVal);
                              requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + emoji.length; });
                            } else { setInput(prev => prev + emoji); }
                          }}
                          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-base transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <button
                onClick={() => handleSend()}
                disabled={isPending || (!input.trim() && pendingAttachments.filter(a => a.status === 'ready').length === 0 && globalReferences.filter(a => a.status === 'ready').length === 0)}
                className={cn(
                  'h-9 w-9 flex items-center justify-center rounded-xl transition-all',
                  isPending || (!input.trim() && pendingAttachments.filter(a => a.status === 'ready').length === 0 && globalReferences.filter(a => a.status === 'ready').length === 0)
                    ? 'bg-muted text-muted-foreground/60 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-105'
                )}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/60 text-center mt-2">↵ Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
