"use client";

/**
 * RepurposeVideoWizard: video_repurpose (Plan 2 Phase 10) — fan a finished
 * video out to network formats and enhance it, on Studio machinery: stage 2
 * reuses VSDistribution wholesale (trim + LTX reframe snapping), stage 3 is
 * the enhance ops (upscale / SFX / thumbnails), stage 4 reuses
 * VSFinalizeVideo. No new edge actions — video-utility covers everything.
 */

import { useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VIDEO_MODES, VIDEO_SCHEMA_VERSION, resolveVideoPosition } from '../stepRegistry';
import { useCreateOmniRun, useOmniRun, useUpdateOmniRun } from '@/hooks/omni';
import type { OmniImagesState } from '@/hooks/omni';
import { VSDistribution } from '../video-studio/VSDistribution';
import { VSFinalizeVideo } from '../video-studio/VSFinalizeVideo';
import { VRSource } from './VRSource';
import { VREnhance } from './VREnhance';

const MODE = 'video_repurpose' as const;

interface RepurposeVideoWizardProps {
  runId: string | null;
  onRunCreated: (runId: string) => void;
  onExit: () => void;
}

export function RepurposeVideoWizard({ runId, onRunCreated, onExit }: RepurposeVideoWizardProps) {
  const reduceMotion = useReducedMotion();
  const run = useOmniRun(runId);
  const createRun = useCreateOmniRun();
  const updateRun = useUpdateOmniRun();
  const [localState, setLocalState] = useState<OmniImagesState | null>(null);

  const state: OmniImagesState = useMemo(
    () => localState ?? ((run.data?.step_state ?? {}) as OmniImagesState),
    [localState, run.data],
  );
  const position = resolveVideoPosition(MODE, state, runId ? (run.data?.current_step ?? 1) : 1);
  const stages = VIDEO_MODES[MODE].stages;
  const built = Math.max(VIDEO_MODES[MODE].builtThrough, 1);

  // CR-C1 fix: runner loops fire several persists from ONE stale closure, and
  // useUpdateOmniRun replaces step_state wholesale - so (a) every write builds
  // on a ref of the LATEST state (functional updaters compose), and (b) the
  // network writes are serialized so an earlier write can never land last.
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

  const startRun = async (assetId: string, durationS: number, label: string) => {
    try {
      const created = await createRun.mutateAsync({
        mode: MODE,
        title: `Repurpose: ${label}`.slice(0, 80),
        current_step: 2,
        step_state: {
          source_asset_id: assetId,
          objective: label,
          // Duration rides descriptions[0] slots? No - keep it honest in its own field.
          video_schema_version: VIDEO_SCHEMA_VERSION,
          max_step_reached: 2,
          scenario: { title: label, scenes: [{ idx: 1, visual_prompt: label, narration: '', duration_s: durationS }] },
        },
      });
      setLocalState((created.step_state ?? {}) as OmniImagesState);
      onRunCreated(created.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the repurpose run');
    }
  };

  if (runId && run.isLoading) {
    return (
      <div className="flex h-full items-center justify-center" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    );
  }
  if (runId && run.isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-destructive">Could not load this repurpose run.</p>
        <Button variant="outline" size="sm" onClick={onExit} className="h-8 cursor-pointer text-xs">Back to the Videos hub</Button>
      </div>
    );
  }

  const ordinal = position.ordinal;
  const sourceId = state.source_asset_id;
  const durationS = state.scenario?.scenes[0]?.duration_s ?? 30;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Repurpose &amp; Enhance · Stage {ordinal} of {stages.length}
          </p>
          <h1 className="truncate text-sm font-semibold sm:text-base">{stages[ordinal - 1].title}</h1>
        </div>
        <div className="flex items-center gap-1">
          {ordinal > 1 && (
            <Button variant="ghost" size="icon" onClick={() => void persist(ordinal - 1, {})} aria-label="Back one stage" className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onExit} aria-label="Exit Repurpose" className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 gap-1.5 border-b border-border px-4 py-2 sm:px-6" role="group" aria-label="Stages">
        {stages.map((s) => {
          const reachable = s.ordinal <= Math.min(position.maxStageOrdinal, built);
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
                s.ordinal === ordinal ? 'bg-purple-500'
                  : reachable ? 'cursor-pointer bg-purple-500/35 hover:bg-purple-500/60'
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
            <VRSource creating={createRun.isPending} onPicked={(id, d, label) => void startRun(id, d, label)} />
          )}

          {ordinal === 2 && runId && sourceId && (
            <VSDistribution
              runId={runId}
              assemblyAssetId={sourceId}
              timelineSeconds={durationS}
              variants={state.video_variants ?? {}}
              onVariantSaved={(presetId, ref) =>
                void persist(2, (prev) => ({ video_variants: { ...(prev.video_variants ?? {}), [presetId]: ref } }))}
              onNext={() => void persist(3, {})}
            />
          )}

          {ordinal === 3 && runId && sourceId && (
            <VREnhance
              runId={runId}
              sourceAssetId={sourceId}
              durationS={durationS}
              upscaleVariant={state.video_variants?.yt_longform}
              onUpscaleSaved={(ref) =>
                void persist(3, (prev) => ({ video_variants: { ...(prev.video_variants ?? {}), [ref.preset_id]: ref } }))}
              onSourceReplaced={(assetId) => {
                toast.success('The SFX version is now the working source — redo targets to re-fan from it.');
                void persist(3, { source_asset_id: assetId });
              }}
              onNext={() => void persist(4, {})}
            />
          )}

          {ordinal === 4 && runId && (
            <VSFinalizeVideo
              runId={runId}
              runTitle={run.data?.title ?? state.title ?? 'Repurposed video'}
              runStatus={run.data?.status ?? 'active'}
              assemblyAssetId={sourceId}
              srtPath={state.srt_path}
              variants={state.video_variants ?? {}}
              captions={state.video_captions ?? {}}
              onCaptionChange={(presetId, caption) =>
                void persist(4, (prev) => ({ video_captions: { ...(prev.video_captions ?? {}), [presetId]: caption } }))}
            />
          )}

          {ordinal > 1 && !sourceId && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">This run has no source video yet.</p>
              <Button variant="outline" size="sm" onClick={() => void persist(1, {})} className="h-8 cursor-pointer text-xs">Back to Source</Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
