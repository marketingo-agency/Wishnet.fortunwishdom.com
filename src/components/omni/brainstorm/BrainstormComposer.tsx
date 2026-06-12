"use client";

/**
 * Chat composer: message input with image attachments (3 max, 3MB each),
 * one-click Promptor optimization, and send. Enter sends; Shift+Enter
 * adds a line.
 */

import { useRef, useState } from 'react';
import { Loader2, Paperclip, SendHorizonal, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useOptimizeDraft } from '@/hooks/promptor';
import { readAttachment, type PendingAttachment } from '@/hooks/omni';

interface BrainstormComposerProps {
  disabled: boolean;
  onSend: (text: string, attachments: PendingAttachment[]) => void;
}

export function BrainstormComposer({ disabled, onSend }: BrainstormComposerProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isOptimizingLocal, setIsOptimizingLocal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { optimizeDraft } = useOptimizeDraft();

  const canSend = text.trim().length > 0 && !disabled && !isOptimizingLocal;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim(), attachments);
    setText('');
    setAttachments([]);
  };

  const handleAttach = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (attachments.length >= 3) {
        toast.error('Up to 3 images per message');
        break;
      }
      try {
        const attachment = await readAttachment(file);
        setAttachments((prev) => (prev.length < 3 ? [...prev, attachment] : prev));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not read the image');
      }
    }
  };

  const handleOptimize = async () => {
    if (!text.trim() || isOptimizingLocal) return;
    setIsOptimizingLocal(true);
    try {
      const optimized = await optimizeDraft(text.trim());
      setText(optimized);
    } catch {
      // useOptimizeDraft already toasts.
    } finally {
      setIsOptimizingLocal(false);
    }
  };

  return (
    // Inner content is capped to the message column width, which also keeps
    // the send button clear of the global Osha assistant button bottom-right.
    <div className="shrink-0 border-t border-border px-4 py-3 sm:px-6 [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-2xl">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div key={`${a.name}-${i}`} className="group relative h-14 w-14 overflow-hidden rounded-lg border border-border">
              <img src={a.previewUrl} alt={a.name} className="h-full w-full object-cover" />
              <button
                onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${a.name}`}
                className="absolute right-0.5 top-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || attachments.length >= 3}
          aria-label="Attach images (PNG, JPEG, WebP, up to 3MB each)"
          className="h-9 w-9 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          aria-label="Attach images"
          onChange={(e) => { void handleAttach(e.target.files); e.target.value = ''; }}
        />
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Share an idea to develop with Omni..."
          rows={1}
          className="max-h-32 min-h-[38px] flex-1 resize-none"
          aria-label="Brainstorm message"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void handleOptimize()}
          disabled={!text.trim() || disabled || isOptimizingLocal}
          aria-label="Optimize with Promptor"
          className="h-9 w-9 shrink-0 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-violet-400"
        >
          {isOptimizingLocal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className="h-9 w-9 shrink-0 cursor-pointer bg-gradient-to-r from-amber-500 to-orange-600 text-white transition-all duration-300 hover:opacity-90"
        >
          {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
