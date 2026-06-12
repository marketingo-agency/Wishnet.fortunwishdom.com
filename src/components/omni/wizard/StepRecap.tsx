"use client";

/**
 * Step 4: recap of everything about to be generated.
 */

import { Layers, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OmniModelSelection } from '@/hooks/omni';

interface StepRecapProps {
  lockedPrompt: string;
  selections: OmniModelSelection[];
  onGenerate: () => void;
}

export function StepRecap({ lockedPrompt, selections, onGenerate }: StepRecapProps) {
  const totalImages = selections.reduce((sum, s) => sum + s.variants, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          Locked prompt
        </p>
        <p className="mt-2 whitespace-pre-wrap font-mono text-sm">{lockedPrompt}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Layers className="h-3.5 w-3.5 text-violet-400" />
          Generation plan
        </p>
        <ul className="mt-2 space-y-1.5">
          {selections.map((s) => (
            <li key={s.model_id} className="flex items-center justify-between text-sm">
              <span className="truncate">{s.name}</span>
              <span className="shrink-0 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                {s.variants} variant{s.variants === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-border pt-2 text-sm font-medium">
          {totalImages} image{totalImages === 1 ? '' : 's'} across {selections.length} model{selections.length === 1 ? '' : 's'}, generated one model at a time
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onGenerate}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          <Zap className="h-4 w-4" />
          Generate
        </Button>
      </div>
    </div>
  );
}
