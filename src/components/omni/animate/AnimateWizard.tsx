"use client";

/**
 * AnimateWizard: video_animate (Plan 2 Phase 9). Bring a character to life:
 * Source (Wishpedia entry images — the Wishu engine; IDs resolve server-side,
 * never raw URLs) → Motion or talk (Seedance reference-to-video ≤9 refs, or
 * script → ElevenLabs voice → Kling AI Avatar v2 Pro) → Generate & review →
 * Formats & finalize (network chips + captions + VSFinalizeVideo — the Clips
 * tail reused). Files/Omni-asset/Library sources land in the polish pass.
 */

import { useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VIDEO_MODES, VIDEO_SCHEMA_VERSION, resolveVideoPosition } from '../stepRegistry';
import { useCreateOmniRun, useOmniRun, useUpdateOmniRun } from '@/hooks/omni';
import type { OmniImagesState, OmniVideoVariantRef } from '@/hooks/omni';
import { OMNI_VIDEO_NETWORKS } from '../omniVideoNetworkPresets';
import { VSCaptions } from '../video-studio/VSCaptions';
import { VSFinalizeVideo } from '../video-studio/VSFinalizeVideo';
import { CLIP_NETWORK_PRESETS } from '../clips/clipsTemplates';
import { ANSource } from './ANSource';
import { ANDirection } from './ANDirection';
import { ANGenerate } from './ANGenerate';

const MODE = 'video_animate' as const;

interface AnimateWizardProps {
  runId: string | null;
  onRunCreated: (runId: string) => void;
  onExit: () => void;
}

export function AnimateWizard({ runId, onRunCreated, onExit }: AnimateWizardProps) {
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

  const startRun = async (patch: Partial<OmniImagesState>, title: string) => {
    try {
      const created = await createRun.mutateAsync({
        mode: MODE,
        title: title.slice(0, 80),
        current_step: 2,
        step_state: { ...patch, video_schema_version: VIDEO_SCHEMA_VERSION, max_step_reached: 2 },
      });
      setLocalState((created.step_state ?? {}) as OmniImagesState);
      onRunCreated(created.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the Animate run');
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
        <p className="text-sm text-destructive">Could not load this Animate run.</p>
        <Button variant="outline" size="sm" onClick={onExit} className="h-8 cursor-pointer text-xs">Back to the Videos hub</Button>
      </div>
    );
  }

  const ordinal = position.ordinal;
  const refs = state.animate_refs ?? [];
  const chosenClipId = (state.approved_asset_ids ?? [])[0];
  const selectedNetworks = new Set(Object.values(state.video_variants ?? {}).map((v) => v.network));

  const toggleNetwork = (network: string, presetId: string) => {
    void persist(4, (prev) => {
      const variants: Record<string, OmniVideoVariantRef> = { ...(prev.video_variants ?? {}) };
      if (variants[presetId]) delete variants[presetId];
      else if (chosenClipId) variants[presetId] = { asset_id: chosenClipId, network, preset_id: presetId };
      return { video_variants: variants };
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Animate · Stage {ordinal} of {stages.length}
          </p>
          <h1 className="truncate text-sm font-semibold sm:text-base">{stages[ordinal - 1].title}</h1>
        </div>
        <div className="flex items-center gap-1">
          {ordinal > 1 && (
            <Button variant="ghost" size="icon" onClick={() => void persist(ordinal - 1, {})} aria-label="Back one stage" className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onExit} aria-label="Exit Animate" className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground">
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
            <ANSource
              creating={createRun.isPending}
              onPicked={(picked, entryName) => void startRun({ animate_refs: picked, objective: entryName, title: entryName }, `Animate ${entryName}`)}
            />
          )}

          {ordinal === 2 && runId && (
            refs.length > 0 ? (
              <ANDirection
                state={state}
                onMotion={(prompt) => void persist(3, { animate_path: 'motion', animate_prompt: prompt })}
                onTalk={(script, voiceId) => void persist(3, { animate_path: 'talk', animate_script: script, animate_voice_id: voiceId })}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-sm text-muted-foreground">This run has no character reference yet.</p>
                <Button variant="outline" size="sm" onClick={() => void persist(1, {})} className="h-8 cursor-pointer text-xs">Back to Source</Button>
              </div>
            )
          )}

          {ordinal === 3 && runId && state.animate_path && (
            <ANGenerate
              runId={runId}
              state={state}
              chosenClipId={chosenClipId}
              onVoStarted={(assetId) => void persist(3, { animate_vo_asset_id: assetId })}
              onClipStarted={(assetId) => void persist(3, { approved_asset_ids: [assetId] })}
              onNext={() => void persist(4, {})}
            />
          )}
          {ordinal === 3 && runId && !state.animate_path && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">Pick motion or talk first.</p>
              <Button variant="outline" size="sm" onClick={() => void persist(2, {})} className="h-8 cursor-pointer text-xs">Back to direction</Button>
            </div>
          )}

          {ordinal === 4 && runId && (
            chosenClipId ? (
              <div className="space-y-6">
                <section className="space-y-2">
                  <p className="text-xs font-semibold">Where does this clip go?</p>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Networks">
                    {CLIP_NETWORK_PRESETS.map(({ network, presetId }) => {
                      const meta = OMNI_VIDEO_NETWORKS.find((n) => n.id === network)!;
                      const active = selectedNetworks.has(network);
                      return (
                        <button
                          key={presetId}
                          onClick={() => toggleNetwork(network, presetId)}
                          aria-pressed={active}
                          className={cn(
                            'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors duration-200',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            active ? 'border-violet-500/60 bg-violet-500/10 font-medium' : 'border-border hover:border-violet-500/40',
                          )}
                        >
                          <meta.icon className={cn('h-3.5 w-3.5', meta.accent)} aria-hidden />
                          {meta.label}
                          {active && <Check className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">The clip posts as-is; pick where it should go.</p>
                </section>
                <VSCaptions
                  runId={runId}
                  assemblyAssetId={chosenClipId}
                  srtPath={state.srt_path}
                  onSrtSaved={(path) => void persist(4, { srt_path: path })}
                  onNext={() => undefined}
                  nextLabel={null}
                />
                <VSFinalizeVideo
                  runId={runId}
                  runTitle={run.data?.title ?? state.title ?? 'Animated clip'}
                  runStatus={run.data?.status ?? 'active'}
                  assemblyAssetId={chosenClipId}
                  srtPath={state.srt_path}
                  variants={state.video_variants ?? {}}
                  captions={state.video_captions ?? {}}
                  onCaptionChange={(presetId, caption) =>
                    void persist(4, (prev) => ({ video_captions: { ...(prev.video_captions ?? {}), [presetId]: caption } }))}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-sm text-muted-foreground">Generate the clip first.</p>
                <Button variant="outline" size="sm" onClick={() => void persist(3, {})} className="h-8 cursor-pointer text-xs">Back to Generate</Button>
              </div>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
}
