"use client";

/**
 * InspireMe: Surprise Me folded into the wizard's first step (Plan 1 Q3).
 * Self-contained — button + idea sheet + its own hook wiring — so the Phase 6
 * Brief stage can re-mount it with zero rework. Mining still runs through the
 * `surprise-ideas` edge action (knowledge sampling + Heart grounding); picking
 * an idea fills the objective field instead of creating a separate run.
 * The last batch is cached in the query client so an unmount never discards
 * a paid mining result (SIB-05).
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BrainCircuit, Check, Dices, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { useSurpriseIdeas, type SurpriseIdea, type SurpriseResult } from '@/hooks/omni';

const BATCH_CACHE_KEY = ['omni-surprise-batch'];

interface InspireMeProps {
  onPick: (objective: string) => void;
  disabled?: boolean;
}

export function InspireMe({ onPick, disabled }: InspireMeProps) {
  const queryClient = useQueryClient();
  const mine = useSurpriseIdeas();
  const [open, setOpen] = useState(false);

  const batch = mine.data ?? queryClient.getQueryData<SurpriseResult>(BATCH_CACHE_KEY);

  const handleMine = () => {
    mine.mutate(undefined, {
      onSuccess: (result) => queryClient.setQueryData(BATCH_CACHE_KEY, result),
    });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && !batch && !mine.isPending) handleMine();
  };

  const handleUse = (idea: SurpriseIdea) => {
    onPick(idea.objective);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(true)}
        disabled={disabled}
        className="cursor-pointer gap-1.5 text-fuchsia-600 transition-colors duration-200 hover:text-fuchsia-500 [[data-omni-theme=dark]_&]:text-fuchsia-400 [[data-omni-theme=dark]_&]:hover:text-fuchsia-300"
      >
        <Dices className="h-4 w-4" />
        Inspire me
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-5 py-4 text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Dices className="h-4 w-4 text-fuchsia-500" />
              Inspire me
            </SheetTitle>
            <SheetDescription className="text-xs">
              Omni samples your Brain documents and Wishpedia canon, applies every Heart rule,
              and proposes concrete ideas. Picking one fills your objective.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {mine.isPending && (
              <div className="flex flex-col items-center gap-3 py-14 text-center" aria-live="polite">
                <Loader2 className="h-6 w-6 animate-spin text-fuchsia-500" />
                <p className="text-sm text-muted-foreground">Sampling the universe and drafting ideas...</p>
              </div>
            )}

            {mine.isError && !mine.isPending && (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <p className="max-w-xs text-sm text-destructive">{mine.error.message}</p>
                {/* SIB-17: name the two sampled sources so an empty-knowledge
                    failure points at the actual fix. */}
                <p className="max-w-xs text-xs text-muted-foreground">
                  Ideas are mined from your indexed Brain documents and Wishpedia entries — both need content for sampling to work.
                </p>
                <Button variant="outline" size="sm" onClick={handleMine} className="cursor-pointer gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Try again
                </Button>
              </div>
            )}

            {batch && !mine.isPending && batch.ideas.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <p className="text-sm text-muted-foreground">No usable ideas came back this round.</p>
                <Button variant="outline" size="sm" onClick={handleMine} className="cursor-pointer gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> New batch
                </Button>
              </div>
            )}

            {batch && !mine.isPending && batch.ideas.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <BrainCircuit className="h-3.5 w-3.5 shrink-0" />
                    {batch.retrieval.brain_chunks} Brain + {batch.retrieval.wishpedia_chunks} Wishpedia samples
                    · {batch.retrieval.heart_rules} Heart rules
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMine}
                    className="h-7 shrink-0 cursor-pointer gap-1.5 text-xs"
                  >
                    <RefreshCw className="h-3 w-3" /> New batch
                  </Button>
                </div>
                {batch.ideas.map((idea, index) => (
                  <div
                    key={`${idea.title}-${index}`}
                    className="rounded-lg border border-border bg-card p-3 transition-colors duration-200 hover:border-fuchsia-500/40"
                  >
                    <h3 className="text-sm font-semibold">{idea.title}</h3>
                    {idea.summary && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{idea.summary}</p>
                    )}
                    {idea.grounding && (
                      <p className="mt-1.5 text-[11px] italic text-muted-foreground/70">{idea.grounding}</p>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleUse(idea)}
                      className="mt-2.5 h-7 cursor-pointer gap-1.5 bg-gradient-to-r from-fuchsia-500 to-violet-600 text-xs text-white transition-all duration-300 hover:opacity-90"
                    >
                      <Check className="h-3 w-3" />
                      Use this idea
                    </Button>
                  </div>
                ))}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
