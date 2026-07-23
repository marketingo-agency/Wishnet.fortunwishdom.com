import { Send, Paperclip, Loader2, Bot, Trash2, Check, X, Search, BookOpen, Square, Circle, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { OshaMessageBubble } from './OshaMessageBubble';
import { OshaFileAttachment } from './OshaFileAttachment';
import { ACCEPTED_FILE_TYPES } from '@/lib/fileProcessing';
import type { OshaMessage, OshaSettings } from '@/hooks/useOsha';
import { ASSISTANT_MODES, POWER_MODES, DEEP_RESEARCH_STAGES } from './oshaConstants';
import { useOshaChatController } from '@/hooks/useOshaChatController';


interface DeepResearchProgressProps {
  stages: string[];
  currentStage: number;
  elapsed: number;
  formatElapsed: (s: number) => string;
}

function DeepResearchProgress({ stages, currentStage, elapsed, formatElapsed }: DeepResearchProgressProps) {
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {stages.map((label, i) => {
          const isDone = i < currentStage;
          const isActive = i === currentStage;
          return (
            <li key={i} className="flex items-center gap-2 text-xs">
              {isDone ? (
                <Check className="h-3.5 w-3.5 text-teal-500 shrink-0" aria-hidden />
              ) : isActive ? (
                <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0 animate-pulse" aria-hidden />
              ) : (
                <Circle className="h-3 w-3 text-muted-foreground/40 shrink-0" aria-hidden />
              )}
              <span
                className={cn(
                  isDone && 'text-muted-foreground line-through decoration-muted-foreground/40',
                  isActive && 'text-foreground font-medium',
                  !isDone && !isActive && 'text-muted-foreground/50'
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-muted-foreground/50">Researching… {formatElapsed(elapsed)}</p>
    </div>
  );
}

interface OshaChatProps {
  messages: OshaMessage[];
  settings: OshaSettings;
  isLoadingMessages: boolean;
  onMessagesChange?: () => void;
  compact?: boolean;
  showModeSelector?: boolean;
}

export function OshaChat({ messages, settings, isLoadingMessages, onMessagesChange, compact = false, showModeSelector = false }: OshaChatProps) {
  const ctrl = useOshaChatController({ messages, settings, onMessagesChange, compact });

  return (
    <div
      className="flex flex-col h-full bg-card rounded-xl sm:rounded-2xl border border-border shadow-sm overflow-hidden"
      onDrop={ctrl.handleDrop}
      onDragOver={ctrl.handleDragOver}
    >
      {/* Header bar — mode selector with three groups */}
      {!compact && (
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border/50 shrink-0 gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {/* Assistant modes */}
            {ASSISTANT_MODES.map(m => (
              <button
                key={m.value}
                onClick={() => ctrl.setMode(m.value)}
                disabled={ctrl.isPending}
                title={m.description}
                aria-pressed={ctrl.mode === m.value}
                className={cn(
                  'px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 min-h-[36px]',
                  ctrl.mode === m.value
                    ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border/50'
                )}
              >
                {m.label}
              </button>
            ))}
            {/* Separator */}
            <div className="h-5 w-px bg-border/60 mx-1 shrink-0" />
            {/* Power modes */}
            {POWER_MODES.map(m => (
              <button
                key={m.value}
                onClick={() => ctrl.setMode(m.value)}
                disabled={ctrl.isPending}
                title={m.description}
                aria-pressed={ctrl.mode === m.value}
                className={cn(
                  'px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 min-h-[36px]',
                  ctrl.mode === m.value
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border/50'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {ctrl.localMessages.length > 0 && (
              <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">{ctrl.localMessages.length} msgs</span>
            )}
            {ctrl.localMessages.length > 0 && (
              ctrl.clearPending ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                    onClick={() => { ctrl.clearHistory(undefined, { onSuccess: () => {} }); ctrl.setClearPending(false); }}
                    disabled={ctrl.isClearing}
                  >
                    {ctrl.isClearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Confirm</span>
                   </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => ctrl.setClearPending(false)}>
                    <X className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cancel</span>
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => ctrl.setClearPending(true)}>
                  <Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Clear</span>
                </Button>
              )
            )}
          </div>
        </div>
      )}

      {/* Compact mode selector (bubble) */}
      {compact && showModeSelector && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-muted/20 shrink-0">
          <Select value={ctrl.mode} onValueChange={ctrl.setMode} disabled={ctrl.isPending}>
            <SelectTrigger className="h-7 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Assistant</div>
              {ASSISTANT_MODES.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
              ))}
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase mt-1">Power</div>
              {POWER_MODES.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-[10px] px-1.5 capitalize shrink-0">{ctrl.mode}</Badge>
        </div>
      )}

      {/* Messages */}
      <div
        ref={ctrl.scrollRef}
        className={cn(
          'flex-1 min-h-0 overflow-y-auto px-4 py-4',
          '[&::-webkit-scrollbar]:w-1.5',
          '[&::-webkit-scrollbar-thumb]:rounded-full',
          '[&::-webkit-scrollbar-thumb]:bg-border',
          '[&::-webkit-scrollbar-track]:transparent',
        )}
      >
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : ctrl.localMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-4">
            <div className={cn(
              'h-16 w-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg',
              ctrl.isPowerMode
                ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/20'
                : 'bg-gradient-to-br from-sky-500 to-cyan-400 shadow-sky-500/20'
            )}>
              {ctrl.isPowerMode ? (
                <BookOpen className="h-9 w-9 text-white" />
              ) : (
                <Bot className="h-9 w-9 text-white" />
              )}
            </div>
            <h3 className="font-semibold text-foreground mb-1 text-base">
              {ctrl.isPowerMode ? 'What shall I research?' : 'How can I help you today?'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">
              {compact && settings.bubble_greeting
                ? settings.bubble_greeting
                : ctrl.isPowerMode
                  ? "I'll conduct in-depth research using AI, searching the web and synthesizing comprehensive findings."
                  : "I'm Osha — your Fortun Wishnet assistant. Ask me anything, attach files, or pick a starter below."}
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {ctrl.quickStarters.map((qs, i) => (
                <button
                  key={i}
                  onClick={() => ctrl.setInput(qs.prompt)}
                  className={cn(
                    'text-xs border rounded-xl px-3 py-2 transition-all text-left max-w-[200px]',
                    ctrl.isPowerMode
                      ? 'bg-muted hover:bg-teal-500/10 hover:text-teal-700 dark:hover:text-teal-400 border-border hover:border-teal-500/30'
                      : 'bg-sky-500/8 hover:bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:scale-105'
                  )}
                >
                  {ctrl.isPowerMode && <Search className="h-3 w-3 inline mr-1" />}
                  {qs.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {ctrl.displayMessages.map(msg => (
              <OshaMessageBubble
                key={msg.id}
                message={msg}
                copiedId={ctrl.copiedId}
                onCopy={ctrl.handleCopy}
                onDelete={msg.isProgressMessage ? undefined : ctrl.handleDeleteMessage}
                showSaveToBrain={!msg.isProgressMessage && msg.role === 'assistant'}
              />
            ))}

            {ctrl.isPending && (
              <div className="flex gap-2.5 items-end">
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ring-2',
                  ctrl.isPowerMode
                    ? 'bg-gradient-to-br from-teal-500 to-emerald-600 ring-teal-300/20'
                    : 'bg-gradient-to-br from-sky-500 to-cyan-400 ring-sky-300/20'
                )}>
                  {ctrl.isPowerMode ? (
                    <Search className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className="bg-card border border-border/60 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-md">
                  {ctrl.mode === 'deep-research' && ctrl.researchPhase === 'researching' ? (
                    <DeepResearchProgress
                      stages={DEEP_RESEARCH_STAGES}
                      currentStage={ctrl.researchStageIndex}
                      elapsed={ctrl.researchElapsed}
                      formatElapsed={ctrl.formatElapsed}
                    />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full animate-bounce bg-sky-400" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full animate-bounce bg-sky-400" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full animate-bounce bg-sky-400" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attachment preview strip */}
      {ctrl.pendingAttachments.length > 0 && (
        <div className="px-4 pt-2 pb-1 flex flex-wrap gap-2 border-t border-border/40 shrink-0">
          {ctrl.pendingAttachments.map(att => (
            <OshaFileAttachment
              key={att.id}
              attachment={att}
              onRemove={(id) => ctrl.setPendingAttachments(prev => prev.filter(a => a.id !== id))}
            />
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="p-3 border-t border-border/50 shrink-0">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background shadow-sm px-3 py-2">
          {!ctrl.isPowerMode && (
            <button
              className="h-10 w-10 sm:h-8 sm:w-8 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 self-end mb-0.5"
              onClick={() => ctrl.fileInputRef.current?.click()}
              disabled={ctrl.isPending}
              title="Attach file (PDF, DOCX, XLSX, CSV, TXT, images)"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          )}

          <textarea
            ref={ctrl.textareaRef}
            value={ctrl.input}
            onChange={ctrl.handleTextareaInput}
            onKeyDown={ctrl.handleKeyDown}
            onPaste={ctrl.handlePaste}
            placeholder={
              ctrl.isPowerMode
                ? (ctrl.researchPhase === 'clarifying' ? 'Answer the questions above, or say "go ahead" to start...' : 'Describe what to research in depth...')
                : ctrl.mode === 'workshop'
                  ? 'Describe your workshop goal...'
                  : 'Ask Osha anything…'
            }
            rows={1}
            disabled={ctrl.isPending}
            className={cn(
              'flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[32px] max-h-[160px] py-1 leading-relaxed',
              ctrl.isPowerMode && 'focus-visible:border-teal-500'
            )}
          />

          {ctrl.isPending ? (
            <button
              onClick={ctrl.handleAbort}
              className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 self-end mb-0.5 transition-all bg-destructive text-destructive-foreground shadow-sm hover:scale-105 active:scale-95"
              title="Stop"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <>
              <button
                onClick={ctrl.handleOptimizeDraft}
                disabled={!ctrl.input.trim() || ctrl.isOptimizing}
                title="Optimize this draft"
                aria-label="Optimize this draft"
                className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 self-end mb-0.5 transition-all text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {ctrl.isOptimizing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => ctrl.handleSend()}
                disabled={!ctrl.input.trim() && ctrl.pendingAttachments.filter(a => a.status === 'ready').length === 0}
                className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center shrink-0 self-end mb-0.5 transition-all',
                  ctrl.isPowerMode
                    ? 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-sm hover:from-teal-600 hover:to-emerald-600'
                    : 'bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-sm hover:from-sky-600 hover:to-cyan-500',
                  'hover:scale-105 active:scale-95',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100'
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        <input
          ref={ctrl.fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES.join(',')}
          className="hidden"
          onChange={(e) => ctrl.handleFileSelect(e.target.files)}
        />

        <p className="text-[10px] text-muted-foreground/40 mt-1.5 text-center">
          {ctrl.isPowerMode
            ? 'Results are enhanced with Heart rules and Brain knowledge for brand compliance'
            : 'Osha retrieves Heart rules and Brain knowledge before responding • Web search used automatically when needed'}
        </p>
      </div>
    </div>
  );
}
