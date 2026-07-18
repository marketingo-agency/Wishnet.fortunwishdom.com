"use client";

/**
 * OmniHomeBrainstormBar: the centered composer pinned to the bottom of the Omni
 * home screen. Brainstorming moved out of the tile grid and lives here now.
 *
 * Coming-soon by design: typing feels alive, but every action (send, attach,
 * optimize, Enter) surfaces a "coming soon" toast instead of running the real
 * brainstorm backend. Mirrors BrainstormComposer's premium look so the eventual
 * wiring is a drop-in.
 */

import { useState } from 'react';
import { Lightbulb, Paperclip, SendHorizonal, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function OmniHomeBrainstormBar() {
  const [text, setText] = useState('');

  const comingSoon = () => {
    toast.info('Brainstorming is coming soon', {
      description: "Soon you'll shape an idea with Omni here, then jump straight into the right creation mode.",
    });
  };

  return (
    // Inner content capped to the message column and centered — keeps the send
    // button clear of the global Osha assistant button at the bottom-right,
    // matching BrainstormComposer.
    <div className="shrink-0 border-t border-border bg-background/70 px-4 py-4 backdrop-blur sm:px-6 [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-2xl">
      <div>
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500 [[data-omni-theme=dark]_&]:text-amber-400" />
            Brainstorm with Omni
          </span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 [[data-omni-theme=dark]_&]:text-amber-300">
            Coming soon
          </span>
        </div>

        <div className="group relative">
          {/* Soft gradient aura, brighter on focus — static, so it needs no
              reduced-motion guard. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 opacity-60 blur-md transition-opacity duration-500 group-focus-within:opacity-100"
          />
          <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card/80 px-2.5 py-1.5 shadow-sm backdrop-blur transition-colors duration-300 focus-within:border-amber-500/40">
            <Button
              variant="ghost"
              size="icon"
              onClick={comingSoon}
              aria-label="Attach images (coming soon)"
              className="h-9 w-9 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  comingSoon();
                }
              }}
              placeholder="Share an idea to develop with Omni..."
              rows={1}
              aria-label="Brainstorm with Omni (coming soon)"
              className={cn(
                'max-h-32 min-h-[38px] flex-1 resize-none border-0 bg-transparent px-1 py-1.5 shadow-none',
                'focus-visible:ring-0 focus-visible:ring-offset-0',
              )}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={comingSoon}
              aria-label="Optimize with Promptor (coming soon)"
              className="h-9 w-9 shrink-0 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-violet-400"
            >
              <Wand2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={comingSoon}
              aria-label="Send (coming soon)"
              className="h-9 w-9 shrink-0 cursor-pointer bg-gradient-to-r from-amber-500 to-orange-600 text-white transition-all duration-300 hover:opacity-90"
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
