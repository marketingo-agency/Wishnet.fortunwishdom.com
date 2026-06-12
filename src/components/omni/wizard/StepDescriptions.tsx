"use client";

/**
 * Step 7: Promptor suggests several social media descriptions
 * (client-side optimize-draft variation loop, the Pulse bulk pattern).
 * Pick one, regenerate with change notes, lock to continue.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2, Lock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useOmniDescriptions } from '@/hooks/omni';

const DESCRIPTION_COUNT = 4;

interface StepDescriptionsProps {
  objective: string;
  lockedPrompt: string;
  initialDescriptions: string[];
  initialChosen: string;
  onLock: (descriptions: string[], chosen: string) => void;
}

export function StepDescriptions({ objective, lockedPrompt, initialDescriptions, initialChosen, onLock }: StepDescriptionsProps) {
  const { generate, isGenerating, progress } = useOmniDescriptions();
  const [descriptions, setDescriptions] = useState<string[]>(initialDescriptions);
  const [chosen, setChosen] = useState<string>(initialChosen);
  const [changeNotes, setChangeNotes] = useState('');
  const autoRanRef = useRef(false);

  const brief = `Social media caption for this visual.\nObjective: ${objective}\nVisual prompt: ${lockedPrompt}`;

  const run = async (notes?: string) => {
    const results = await generate(brief, DESCRIPTION_COUNT, notes);
    if (results.length > 0) {
      setDescriptions(results);
      setChosen('');
    }
  };

  useEffect(() => {
    if (initialDescriptions.length === 0 && !autoRanRef.current) {
      autoRanRef.current = true;
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-generate once on first visit
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Promptor wrote these with your Heart rules and brand knowledge. Pick one, or regenerate with notes.
      </p>

      {isGenerating ? (
        <div className="space-y-3" aria-label="Generating descriptions">
          {Array.from({ length: DESCRIPTION_COUNT }).map((_, i) => (
            <Skeleton key={i} className={cn('h-16 rounded-xl', i < progress && 'opacity-40')} />
          ))}
          <p className="text-xs text-muted-foreground">
            Writing description {Math.min(progress + 1, DESCRIPTION_COUNT)} of {DESCRIPTION_COUNT}...
          </p>
        </div>
      ) : descriptions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No descriptions yet. Generate to get options.</p>
      ) : (
        <div className="space-y-2" role="radiogroup" aria-label="Description options">
          {descriptions.map((d, i) => (
            <button
              key={i}
              role="radio"
              aria-checked={chosen === d}
              onClick={() => setChosen(d)}
              className={cn(
                'w-full cursor-pointer rounded-xl border bg-card p-3 text-left text-sm transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                chosen === d ? 'border-cyan-500 shadow-lg shadow-cyan-500/10' : 'border-border hover:border-cyan-500/30',
              )}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Regenerate with change notes (optional)</p>
        <div className="flex gap-2">
          <Textarea
            value={changeNotes}
            onChange={(e) => setChangeNotes(e.target.value)}
            placeholder="Example: shorter, more playful, end with a question..."
            className="min-h-[60px] flex-1 focus-visible:ring-cyan-500/50"
            disabled={isGenerating}
            aria-label="Change notes"
          />
          <Button
            variant="outline"
            onClick={() => run(changeNotes)}
            disabled={isGenerating}
            className="cursor-pointer gap-1.5 self-end transition-colors duration-200"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Regenerate
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => onLock(descriptions, chosen)}
          disabled={!chosen || isGenerating}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          <Lock className="h-4 w-4" />
          Lock description and continue
        </Button>
      </div>
    </div>
  );
}
