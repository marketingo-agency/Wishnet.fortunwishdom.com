"use client";

/**
 * RepurposeVideoWizard: video_repurpose (Plan 2 Phase 10) — fan a finished
 * video out to network formats and enhance it, on Studio machinery: stage 2
 * reuses VSDistribution wholesale (trim + LTX reframe snapping), stage 3 is
 * the enhance ops (upscale / SFX / thumbnails), stage 4 reuses
 * VSFinalizeVideo. No new edge actions — video-utility covers everything.
 *
 * 2026-07-17 rehab fixes: TOP-1 (stage-1 re-pick persists into the SAME run
 * instead of forking a new one), TOP-6 (real source duration probed via the
 * sync ffmpeg metadata utility; the 30s fallback is labeled unverified),
 * TOP-8 (the paid SFX asset id persists into step_state on submit), TOP-10
 * (shared StageRail replaces the inline 6px bar row).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { VIDEO_MODES, VIDEO_SCHEMA_VERSION, resolveVideoPosition } from '../stepRegistry';
import { useCreateOmniRun, useOmniRun, useUpdateOmniRun } from '@/hooks/omni';
import type { OmniImagesState } from '@/hooks/omni';
import { callOmniVideo } from '@/lib/omniApi';
import { pollVideoAssets } from '@/hooks/omni/useVideoScenes';
import { StageRail } from '../wizard/StageRail';
import { VSDistribution } from '../video-studio/VSDistribution';
import { VSFinalizeVideo } from '../video-studio/VSFinalizeVideo';
import { VRSource } from './VRSource';
import { VREnhance } from './VREnhance';

const MODE = 'video_repurpose' as const;

/** Honest fallback when the source row has no measured duration AND the probe
 *  failed — always LABELED as unverified wherever it feeds plans or costs. */
const FALLBACK_DURATION_S = 30;

/** Repurpose-only step_state extras (TOP-6 / TOP-8). OmniImagesState lives in
 *  hooks/omni (out of bounds for this fix wave), so the mode-local fields
 *  extend it here — structurally assignable to every OmniImagesState consumer. */
export interface RepurposeState extends OmniImagesState {
  /** TOP-8: the paid mmaudio SFX output, persisted the moment submit returns
   *  so a closed tab never orphans it — resume polls it back to life. */
  sfx_asset_id?: string;
  /** TOP-6: true once ffmpeg metadata confirmed the CURRENT source's length;
   *  absent/false means the duration is an estimate and is labeled as such. */
  source_duration_verified?: boolean;
}

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
  const [localState, setLocalState] = useState<RepurposeState | null>(null);
  const [measuring, setMeasuring] = useState(false);

  const state: RepurposeState = useMemo(
    () => localState ?? ((run.data?.step_state ?? {}) as RepurposeState),
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
  /** Async completions (the duration probe) persist at the ordinal the user is
   *  ON when they land, never the one captured at submit time. */
  const ordinalRef = useRef(position.ordinal);
  ordinalRef.current = position.ordinal;
  const persistQueue = useRef(Promise.resolve());
  const persistTo = async (
    rid: string | null,
    nextOrdinal: number,
    patch: Partial<RepurposeState> | ((prev: RepurposeState) => Partial<RepurposeState>),
  ) => {
    const base = stateRef.current;
    const resolved = typeof patch === 'function' ? patch(base) : patch;
    const nextState: RepurposeState = {
      ...base,
      ...resolved,
      video_schema_version: VIDEO_SCHEMA_VERSION,
      max_step_reached: Math.max(base.max_step_reached ?? 1, position.maxStageOrdinal, nextOrdinal),
    };
    stateRef.current = nextState;
    setLocalState(nextState);
    if (!rid) return;
    persistQueue.current = persistQueue.current
      .then(() => updateRun.mutateAsync({ runId: rid, current_step: nextOrdinal, step_state: nextState }))
      .then(() => undefined)
      .catch((e: unknown) => {
        toast.error(`Progress could not be saved: ${e instanceof Error ? e.message : 'unknown error'}`);
      });
    await persistQueue.current;
  };
  const persist = (
    nextOrdinal: number,
    patch: Partial<RepurposeState> | ((prev: RepurposeState) => Partial<RepurposeState>),
  ) => persistTo(runId, nextOrdinal, patch);

  // TOP-6: probe the REAL source duration through the sync ffmpeg metadata
  // utility (the PVGenerate audiogram pattern). Success persists the probed
  // value + the verified flag into step_state, so a resumed run never
  // re-probes; failure keeps the labeled ~30s estimate and never blocks.
  const probeTokenRef = useRef(0);
  const measureDuration = async (rid: string, assetId: string) => {
    const token = ++probeTokenRef.current;
    setMeasuring(true);
    try {
      let probed: number | null = null;
      const [r] = await pollVideoAssets([assetId]);
      if (r?.status === 'done' && typeof r.duration_s === 'number' && r.duration_s > 0) {
        // The asset row already carries a server-measured duration.
        probed = r.duration_s;
      } else if (r?.status === 'done' && r.url) {
        const res = await callOmniVideo<{ status: string; result?: { media?: { duration?: number }; duration?: number } }>('video-utility', {
          run_id: rid,
          op: 'fal-ai/ffmpeg-api/metadata',
          input: { media_url: r.url },
        });
        const value = res.result?.media?.duration ?? res.result?.duration;
        if (typeof value === 'number' && value > 0) probed = Math.round(value * 10) / 10;
      }
      // A re-pick mid-probe invalidates this measurement.
      if (token !== probeTokenRef.current || stateRef.current.source_asset_id !== assetId) return;
      if (probed !== null) {
        const durationS = probed;
        await persistTo(rid, ordinalRef.current, (prev) => ({
          source_duration_verified: true,
          scenario: prev.scenario
            ? { ...prev.scenario, scenes: prev.scenario.scenes.map((s, i) => (i === 0 ? { ...s, duration_s: durationS } : s)) }
            : { title: prev.objective ?? 'Repurposed video', scenes: [{ idx: 1, visual_prompt: prev.objective ?? 'video', narration: '', duration_s: durationS }] },
        }));
      }
    } catch {
      // Fall back to the labeled estimate — the probe must never block the flow.
    } finally {
      if (token === probeTokenRef.current) setMeasuring(false);
    }
  };
  const measureRef = useRef(measureDuration);
  measureRef.current = measureDuration;

  const sourceId = state.source_asset_id;
  const durationS = state.scenario?.scenes[0]?.duration_s ?? FALLBACK_DURATION_S;
  const durationVerified = state.source_duration_verified === true;

  // One probe path for every entry: fresh pick (once runId lands), same-run
  // source replacement, SFX working-source swap, and resume of a pre-fix run
  // that still carries the fabricated estimate.
  useEffect(() => {
    if (!runId || !sourceId || durationVerified) return;
    void measureRef.current(runId, sourceId);
  }, [runId, sourceId, durationVerified]);

  const startRun = async (assetId: string, durationS0: number | null, label: string) => {
    try {
      const initialState: RepurposeState = {
        source_asset_id: assetId,
        objective: label,
        video_schema_version: VIDEO_SCHEMA_VERSION,
        max_step_reached: 2,
        source_duration_verified: durationS0 !== null,
        scenario: { title: label, scenes: [{ idx: 1, visual_prompt: label, narration: '', duration_s: durationS0 ?? FALLBACK_DURATION_S }] },
      };
      const created = await createRun.mutateAsync({
        mode: MODE,
        title: `Repurpose: ${label}`.slice(0, 80),
        current_step: 2,
        step_state: initialState,
      });
      setLocalState((created.step_state ?? {}) as RepurposeState);
      onRunCreated(created.id);
      // The unverified-source effect probes the real duration once runId lands.
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the repurpose run');
    }
  };

  // TOP-1: a stage-1 re-pick on an EXISTING run rides the same-run replace
  // flow (the SFX onSourceReplaced pattern) instead of forking a new run.
  const replaceSource = async (assetId: string, durationS0: number | null, label: string) => {
    await persist(2, {
      source_asset_id: assetId,
      objective: label,
      source_duration_verified: durationS0 !== null,
      // The old source's SFX pass is meaningless for a new source.
      sfx_asset_id: undefined,
      scenario: { title: label, scenes: [{ idx: 1, visual_prompt: label, narration: '', duration_s: durationS0 ?? FALLBACK_DURATION_S }] },
    });
    toast.info('Source replaced on this run — redo targets to re-fan from the new video.');
  };

  const handlePicked = (assetId: string, durationS0: number | null, label: string) => {
    if (!runId) {
      void startRun(assetId, durationS0, label);
      return;
    }
    if (assetId === stateRef.current.source_asset_id) {
      // Same source re-picked — just continue forward on this run.
      void persist(2, {});
      return;
    }
    void replaceSource(assetId, durationS0, label);
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

      <StageRail
        stages={stages.map((s) => ({ ordinal: s.ordinal, title: s.title }))}
        current={ordinal}
        isReachable={(o) => o <= Math.min(position.maxStageOrdinal, built)}
        onJump={(o) => void persist(o, {})}
        accent="purple"
      />

      <motion.div
        key={ordinal}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl">
          {ordinal === 1 && (
            <VRSource
              creating={createRun.isPending || updateRun.isPending}
              currentSourceId={sourceId ?? null}
              onPicked={handlePicked}
            />
          )}

          {ordinal === 2 && runId && sourceId && (
            measuring ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center" aria-live="polite">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                <p className="text-xs text-muted-foreground">Measuring the source duration…</p>
              </div>
            ) : (
              <div className="space-y-3">
                {!durationVerified && (
                  <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 [[data-omni-theme=dark]_&]:text-amber-400" role="note">
                    The source length could not be verified — trim and cost plans assume ~{durationS}s (unverified).
                  </p>
                )}
                <VSDistribution
                  runId={runId}
                  assemblyAssetId={sourceId}
                  timelineSeconds={durationS}
                  variants={state.video_variants ?? {}}
                  onVariantSaved={(presetId, ref) =>
                    void persist(2, (prev) => ({ video_variants: { ...(prev.video_variants ?? {}), [presetId]: ref } }))}
                  onNext={() => void persist(3, {})}
                />
              </div>
            )
          )}

          {ordinal === 3 && runId && sourceId && (
            <VREnhance
              runId={runId}
              sourceAssetId={sourceId}
              durationS={durationS}
              durationVerified={durationVerified}
              sfxAssetId={state.sfx_asset_id ?? null}
              onSfxSubmitted={(assetId) => void persist(3, { sfx_asset_id: assetId })}
              upscaleVariant={state.video_variants?.yt_longform}
              onUpscaleSaved={(ref) =>
                void persist(3, (prev) => ({ video_variants: { ...(prev.video_variants ?? {}), [ref.preset_id]: ref } }))}
              onSourceReplaced={(assetId) => {
                toast.success('The SFX version is now the working source — redo targets to re-fan from it.');
                // The SFX render's length may differ (mmaudio caps at 30s) —
                // drop the verified flag so the probe re-measures the new source.
                void persist(3, { source_asset_id: assetId, source_duration_verified: false });
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
