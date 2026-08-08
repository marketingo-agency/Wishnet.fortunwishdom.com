"use client";

/**
 * Shared composer for the One-Screen Preview: the hero input on the home
 * state and the docked input under an active thread. Attach/wand/mic are
 * visual only; send is real within the mock (it feeds the simulated thread).
 */
import { useCallback } from 'react';
import { Mic, Paperclip, Send, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PT } from './previewTokens';

interface PreviewComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  placeholder?: string;
  docked?: boolean;
}

const VisualAction = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <button
    type="button"
    aria-label={`${label} (preview only)`}
    title={`${label} (preview only)`}
    className={cn(
      'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 motion-reduce:transition-none',
      PT.ghostBtn,
      PT.focusRing,
    )}
  >
    {children}
  </button>
);

export const PreviewComposer = ({
  value,
  onChange,
  onSend,
  placeholder = 'Ask Omni to create anything for Fortun…',
  docked = false,
}: PreviewComposerProps) => {
  const canSend = value.trim().length > 0;

  const handleSend = useCallback(() => {
    const text = value.trim();
    if (!text) return;
    onSend(text);
  }, [value, onSend]);

  return (
    <div
      className={cn(
        'w-full rounded-3xl border p-2 pl-3 backdrop-blur-sm transition-shadow duration-300 motion-reduce:transition-none',
        'focus-within:shadow-xl focus-within:shadow-cyan-500/10 focus-within:ring-1 focus-within:ring-cyan-400/40',
        PT.panel,
        docked ? 'shadow-lg' : 'shadow-xl shadow-black/20',
      )}
    >
      <div className="flex items-end gap-1.5">
        <VisualAction label="Attach files">
          <Paperclip className="h-4 w-4" />
        </VisualAction>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={docked ? 1 : 2}
          placeholder={placeholder}
          aria-label="Message Omni"
          className={cn(
            'min-h-[40px] w-full resize-none self-center border-0 bg-transparent px-1 py-2 text-sm leading-relaxed outline-none',
            'text-zinc-100 placeholder:text-zinc-500 [[data-preview-theme=light]_&]:text-zinc-900 [[data-preview-theme=light]_&]:placeholder:text-zinc-400',
          )}
        />
        <VisualAction label="Optimize prompt">
          <Wand2 className="h-4 w-4" />
        </VisualAction>
        <VisualAction label="Dictate">
          <Mic className="h-4 w-4" />
        </VisualAction>
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send"
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 motion-reduce:transition-none',
            PT.focusRing,
            canSend
              ? cn('cursor-pointer', PT.accentBtn)
              : 'cursor-not-allowed bg-white/[0.06] text-zinc-600 [[data-preview-theme=light]_&]:bg-zinc-900/[0.06] [[data-preview-theme=light]_&]:text-zinc-400',
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
