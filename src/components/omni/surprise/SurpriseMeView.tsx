"use client";

/**
 * Surprise Me (Mode 5): Omni mines the knowledge base (Brain + Wishpedia,
 * Heart-compliant) and proposes concrete creation ideas. Picking one starts
 * a surprise_me run with the objective prefilled and hands the user into the
 * Omni Images wizard at step 1.
 */

import { motion } from 'framer-motion';
import { BrainCircuit, Dices, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStartRunFromIdea, useSurpriseIdeas, type OmniRun, type SurpriseIdea } from '@/hooks/omni';
import { SurpriseIdeaCard } from './SurpriseIdeaCard';

interface SurpriseMeViewProps {
  onRunStarted: (run: OmniRun) => void;
  onExit: () => void;
}

export function SurpriseMeView({ onRunStarted, onExit }: SurpriseMeViewProps) {
  const mine = useSurpriseIdeas();
  const startRun = useStartRunFromIdea();

  const handleUse = (idea: SurpriseIdea) => {
    startRun.mutate(idea, { onSuccess: (run) => onRunStarted(run) });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Surprise Me</p>
          <h1 className="truncate text-sm font-semibold sm:text-base">Ideas mined from your knowledge base</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={onExit} aria-label="Back to the Images hub" className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-5">
          {!mine.data && !mine.isPending && !mine.isError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex flex-col items-center gap-4 py-16 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-500/20">
                <Dices className="h-8 w-8" />
              </div>
              <div className="max-w-md">
                <h2 className="text-base font-semibold">Let Omni surprise you</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Omni samples your Brain documents and Wishpedia canon, applies every Heart rule, and proposes concrete image ideas you can generate immediately.
                </p>
              </div>
              <Button
                onClick={() => mine.mutate()}
                className="cursor-pointer gap-2 bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
              >
                <Dices className="h-4 w-4" />
                Mine the knowledge base
              </Button>
            </motion.div>
          )}

          {mine.isPending && (
            <div className="flex flex-col items-center gap-3 py-16 text-center" aria-live="polite">
              <Loader2 className="h-7 w-7 animate-spin text-fuchsia-400" />
              <p className="text-sm text-muted-foreground">Sampling the universe and drafting ideas...</p>
            </div>
          )}

          {mine.isError && !mine.isPending && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="max-w-md text-sm text-destructive">{mine.error.message}</p>
              <Button variant="outline" onClick={() => mine.mutate()} className="cursor-pointer gap-1.5">
                <RefreshCw className="h-4 w-4" /> Try again
              </Button>
            </div>
          )}

          {mine.data && !mine.isPending && (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BrainCircuit className="h-3.5 w-3.5" />
                  Grounded in {mine.data.retrieval.brain_chunks} Brain + {mine.data.retrieval.wishpedia_chunks} Wishpedia samples under {mine.data.retrieval.heart_rules} Heart rules
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => mine.mutate()}
                  disabled={startRun.isPending}
                  className="h-8 cursor-pointer gap-1.5 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Surprise me again
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {mine.data.ideas.map((idea, index) => (
                  <SurpriseIdeaCard
                    key={`${idea.title}-${index}`}
                    idea={idea}
                    index={index}
                    isStarting={startRun.isPending}
                    onUse={() => handleUse(idea)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
