"use client";

/**
 * PodcastStudioWizard: the flagship Audios surface (Plan 3 Phase 6).
 * Five registry stages: 1 Script in → 2 Cast → 3 Render → 4 Package →
 * 5 Finalize. CR-C1 persist (render/package persist mid-flight).
 */

import { useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VIDEO_MODES, VIDEO_SCHEMA_VERSION, resolveVideoPosition } from '../stepRegistry';
import { useOmniRun, useUpdateOmniRun } from '@/hooks/omni';
import type { OmniImagesState } from '@/hooks/omni';
import { PDScriptIn } from './PDScriptIn';
import { PDCast } from './PDCast';
import { PDRender } from './PDRender';
import { PDPackage } from './PDPackage';
import { PDFinalize } from './PDFinalize';

const MODE = 'omni_podcast' as const;

interface PodcastStudioWizardProps {
  runId: string | null;
  onRunCreated: (runId: string) => void;
  onExit: () => void;
}

export function PodcastStudioWizard({ runId, onRunCreated, onExit }: PodcastStudioWizardProps) {
  const reduceMotion = useReducedMotion();
  const run = useOmniRun(runId);
  const updateRun = useUpdateOmniRun();
  const [localState, setLocalState] = useState<OmniImagesState | null>(null);

  const state: OmniImagesState = useMemo(
    () => localState ?? ((run.data?.step_state ?? {}) as OmniImagesState),
    [localState, run.data],
  );
  const rawStep = run.data?.current_step ?? 1;
  const position = resolveVideoPosition(MODE, state, runId ? rawStep : 1);
  const stages = VIDEO_MODES[MODE].stages;

  // CR-C1: latest-state ref + functional patches + serialized writes — the
  // render loop persists chunk/jingle ids while other patches are in flight.
  const stateRef = useRef(state);
  stateRef.current = state;
  const persistQueue = useRef(Promise.resolve());
  const persist = async (
    nextOrdinal: number,
    patch: Partial<OmniImagesState> | ((prev: OmniImagesState) => Partial<OmniImagesState>),
  ) => {
    const base = stateRef.current;
    const resolved = typeof patch === 'function' ? patch(base) : patch;
    const nextState: OmniImagesState = {
      ...base,
      ...resolved,
      video_schema_version: VIDEO_SCHEMA_VERSION,
      max_step_reached: Math.max(base.max_step_reached ?? 1, position.maxStageOrdinal, nextOrdinal),
    };
    stateRef.current = nextState;
    setLocalState(nextState);
    if (!runId) return;
    persistQueue.current = persistQueue.current
      .then(() => updateRun.mutateAsync({ runId, current_step: nextOrdinal, step_state: nextState }))
      .then(() => undefined)
      .catch((e: unknown) => {
        toast.error(`Progress could not be saved: ${e instanceof Error ? e.message : 'unknown error'}`);
      });
    await persistQueue.current;
  };

  const finishRun = async () => {
    if (!runId) return;
    const base = stateRef.current;
    await updateRun.mutateAsync({
      runId,
      status: 'completed',
      title: base.podcast_shownotes?.title || base.podcast_outline?.title,
      step_state: { ...base, video_schema_version: VIDEO_SCHEMA_VERSION, max_step_reached: stages.length },
      current_step: stages.length,
    });
    toast.success('Episode saved. Publish it from Publish & Feed once that ships.');
    onExit();
  };

  if (runId && run.isLoading) {
    return (
      <div className="flex h-full items-center justify-center" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
      </div>
    );
  }
  if (runId && run.isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-destructive">Could not load this Studio run.</p>
        <Button variant="outline" size="sm" onClick={onExit} className="h-8 cursor-pointer text-xs">Back to the Audios hub</Button>
      </div>
    );
  }

  const ordinal = position.ordinal;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Podcast Studio · Stage {ordinal} of {stages.length}
          </p>
          <h1 className="truncate text-sm font-semibold sm:text-base">{stages[ordinal - 1].title}</h1>
        </div>
        <div className="flex items-center gap-1">
          {ordinal > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void persist(ordinal - 1, {})}
              aria-label="Back one stage"
              className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onExit}
            aria-label="Exit Podcast Studio"
            className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 gap-1.5 border-b border-border px-4 py-2 sm:px-6" role="group" aria-label="Stages">
        {stages.map((s) => {
          const reachable = s.ordinal <= position.maxStageOrdinal;
          return (
            <button
              key={s.id}
              onClick={() => reachable && s.ordinal !== ordinal && void persist(s.ordinal, {})}
              disabled={!reachable}
              aria-label={`${s.title}${reachable ? '' : ' (not reached yet)'}`}
              aria-current={s.ordinal === ordinal ? 'step' : undefined}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                s.ordinal === ordinal ? 'bg-rose-500'
                  : reachable ? 'cursor-pointer bg-rose-500/35 hover:bg-rose-500/60'
                  : 'bg-muted',
              )}
            />
          );
        })}
      </div>

      <motion.div
        key={ordinal}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl">
          {ordinal === 1 && (
            <PDScriptIn
              state={state}
              runId={runId}
              onRunCreated={(id, seeded) => {
                setLocalState(seeded);
                onRunCreated(id);
              }}
              onReady={(patch) => void persist(2, patch)}
            />
          )}
          {ordinal === 2 && (
            <PDCast state={state} onNext={(cast) => void persist(3, { podcast_cast: cast })} />
          )}
          {ordinal === 3 && runId && (
            <PDRender state={state} runId={runId} persist={persist} onNext={() => void persist(4, {})} />
          )}
          {ordinal === 4 && runId && (
            <PDPackage state={state} runId={runId} persist={persist} onNext={() => void persist(5, {})} />
          )}
          {ordinal === 5 && runId && (
            <PDFinalize state={state} runId={runId} persist={persist} onFinish={() => void finishRun()} />
          )}
        </div>
      </motion.div>
    </div>
  );
}
