"use client";

/**
 * PodcastScenarioWizard: podcast pre-production (Plan 3 Phase 5).
 * Four stages on the registry's ordinals: 1 Show & brief → 2 Outline →
 * 3 Script → 4 Cast & handoff. Persists with the CR-C1 pattern (latest-state
 * ref + functional patches + a serialized write queue) because stage 3's
 * chapter loop persists mid-flight.
 */

import { useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VIDEO_MODES, VIDEO_SCHEMA_VERSION, resolveVideoPosition } from '../stepRegistry';
import { useCreateOmniRun, useOmniRun, useUpdateOmniRun } from '@/hooks/omni';
import type { OmniImagesState, OmniPodcastBrief, OmniPodcastOutline } from '@/hooks/omni';
import { PSShowBrief } from './PSShowBrief';
import { PSOutline } from './PSOutline';
import { PSScript } from './PSScript';
import { PSCastHandoff } from './PSCastHandoff';

const MODE = 'podcast_scenario' as const;

interface PodcastScenarioWizardProps {
  runId: string | null;
  onRunCreated: (runId: string) => void;
  onExit: () => void;
  /** Activated in Phase 6: seeds a Podcast Studio run from this scenario. */
  onHandoffToStudio?: (studioRunId: string) => void;
}

export function PodcastScenarioWizard({ runId, onRunCreated, onExit, onHandoffToStudio }: PodcastScenarioWizardProps) {
  const reduceMotion = useReducedMotion();
  const run = useOmniRun(runId);
  const createRun = useCreateOmniRun();
  const updateRun = useUpdateOmniRun();
  const [localState, setLocalState] = useState<OmniImagesState | null>(null);
  const [finishing, setFinishing] = useState(false);

  const state: OmniImagesState = useMemo(
    () => localState ?? ((run.data?.step_state ?? {}) as OmniImagesState),
    [localState, run.data],
  );
  const rawStep = run.data?.current_step ?? 1;
  const position = resolveVideoPosition(MODE, state, runId ? rawStep : 1);
  const stages = VIDEO_MODES[MODE].stages;

  // CR-C1: stage 3's chapter loop rebuilds patches from the LATEST state and
  // serializes writes — useUpdateOmniRun replaces step_state wholesale, so a
  // stale-closure rebuild would drop earlier chapters' text.
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

  const handleOutlined = async (
    showId: string,
    brief: OmniPodcastBrief,
    cast: Record<string, string>,
    outline: OmniPodcastOutline,
  ) => {
    if (!runId) {
      try {
        const created = await createRun.mutateAsync({
          mode: MODE,
          title: outline.title.slice(0, 80),
          current_step: 2,
          step_state: {
            podcast_show_id: showId,
            podcast_brief: brief,
            podcast_cast: cast,
            podcast_outline: outline,
            video_schema_version: VIDEO_SCHEMA_VERSION,
            max_step_reached: 2,
          },
        });
        setLocalState((created.step_state ?? {}) as OmniImagesState);
        onRunCreated(created.id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not create the scenario run');
      }
      return;
    }
    await persist(2, { podcast_show_id: showId, podcast_brief: brief, podcast_cast: cast, podcast_outline: outline, title: outline.title });
  };

  const handleSendToStudio = async () => {
    if (!runId || !stateRef.current.podcast_outline || finishing) return;
    setFinishing(true);
    try {
      const base = stateRef.current;
      const created = await createRun.mutateAsync({
        mode: 'omni_podcast',
        title: base.podcast_outline!.title.slice(0, 80),
        current_step: 2,
        step_state: {
          podcast_show_id: base.podcast_show_id,
          podcast_brief: base.podcast_brief,
          podcast_outline: base.podcast_outline,
          podcast_script: base.podcast_script,
          podcast_cast: base.podcast_cast,
          podcast_source_run_id: runId,
          video_schema_version: VIDEO_SCHEMA_VERSION,
          max_step_reached: 2,
        },
      });
      await updateRun.mutateAsync({
        runId,
        status: 'completed',
        step_state: { ...base, video_schema_version: VIDEO_SCHEMA_VERSION, max_step_reached: stages.length },
        current_step: stages.length,
      });
      toast.success('Sent to Podcast Studio.');
      onHandoffToStudio?.(created.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not hand off to Podcast Studio');
    } finally {
      setFinishing(false);
    }
  };

  const handleFinish = async () => {
    if (!runId || finishing) return;
    setFinishing(true);
    try {
      const base = stateRef.current;
      await updateRun.mutateAsync({
        runId,
        status: 'completed',
        title: base.podcast_outline?.title,
        step_state: { ...base, video_schema_version: VIDEO_SCHEMA_VERSION, max_step_reached: stages.length },
        current_step: stages.length,
      });
      toast.success('Scenario saved. Retake or reopen it anytime from History.');
      onExit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the scenario');
    } finally {
      setFinishing(false);
    }
  };

  if (runId && run.isLoading) {
    return (
      <div className="flex h-full items-center justify-center" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }
  if (runId && run.isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-destructive">Could not load this scenario run.</p>
        <Button variant="outline" size="sm" onClick={onExit} className="h-8 cursor-pointer text-xs">Back to the Audios hub</Button>
      </div>
    );
  }

  const ordinal = position.ordinal;
  const outline = state.podcast_outline;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Podcast Scenario · Stage {ordinal} of {stages.length}
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
            aria-label="Exit Podcast Scenario"
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
                'relative h-1.5 flex-1 rounded-full transition-colors duration-200',
                // WCAG target size: the 6px bar keeps its look; the hit area grows.
                "before:absolute before:-inset-y-2.5 before:inset-x-0 before:content-['']",
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                s.ordinal === ordinal ? 'bg-orange-500'
                  : reachable ? 'cursor-pointer bg-orange-500/35 hover:bg-orange-500/60'
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
            <PSShowBrief
              initialShowId={state.podcast_show_id ?? null}
              initialBrief={state.podcast_brief ?? null}
              onOutlined={(showId, brief, cast, o) => void handleOutlined(showId, brief, cast, o)}
            />
          )}
          {ordinal === 2 && outline && (
            <PSOutline
              outline={outline}
              onChange={(o) => void persist(2, { podcast_outline: o })}
              onNext={() => void persist(3, {})}
            />
          )}
          {ordinal === 3 && outline && (
            <PSScript
              state={state}
              onScriptChange={(chapterIdx, segments) =>
                void persist(3, (prev) => ({
                  podcast_script: { ...(prev.podcast_script ?? {}), [String(chapterIdx)]: segments },
                }))
              }
              onNext={() => void persist(4, {})}
            />
          )}
          {ordinal === 4 && outline && (
            <PSCastHandoff
              state={state}
              onFinish={() => void handleFinish()}
              onSendToStudio={onHandoffToStudio ? () => void handleSendToStudio() : undefined}
              finishing={finishing}
            />
          )}
          {ordinal > 1 && !outline && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">This run has no outline yet.</p>
              <Button variant="outline" size="sm" onClick={() => void persist(1, {})} className="h-8 cursor-pointer text-xs">
                Back to the brief
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
