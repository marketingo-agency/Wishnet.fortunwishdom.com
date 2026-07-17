"use client";

/**
 * VideoStudioWizard: the omni_videos orchestrator (Plan 2 Phases 5-7 —
 * all 8 stages: scenario → storyboard & cast → scenes → audio → assembly →
 * captions → distribution → finalize). Video-ordinal persistence with a
 * high-water mark; resumes clamp to the registry's builtThrough.
 */

import { useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VIDEO_MODES, VIDEO_SCHEMA_VERSION, resolveVideoPosition } from '../stepRegistry';
import { useCreateOmniRun, useOmniRun, useUpdateOmniRun } from '@/hooks/omni';
import type { OmniImagesState, OmniVideoScenario } from '@/hooks/omni';
import { DRAFT_ENGINES } from './vsEngines';
import { VSScenario } from './VSScenario';
import { VSStoryboardCast } from './VSStoryboardCast';
import { VSScenes } from './VSScenes';
import { VSAudio } from './VSAudio';
import { VSAssembly } from './VSAssembly';
import { VSCaptions } from './VSCaptions';
import { VSDistribution } from './VSDistribution';
import { VSFinalizeVideo } from './VSFinalizeVideo';

const MODE = 'omni_videos' as const;

interface VideoStudioWizardProps {
  runId: string | null;
  onRunCreated: (runId: string) => void;
  onExit: () => void;
}

export function VideoStudioWizard({ runId, onRunCreated, onExit }: VideoStudioWizardProps) {
  const reduceMotion = useReducedMotion();
  const run = useOmniRun(runId);
  const createRun = useCreateOmniRun();
  const updateRun = useUpdateOmniRun();
  const [localState, setLocalState] = useState<OmniImagesState | null>(null);

  const state: OmniImagesState = useMemo(
    () => localState ?? ((run.data?.step_state ?? {}) as OmniImagesState),
    [localState, run.data],
  );
  const rawStep = run.data?.current_step ?? 1;
  const position = resolveVideoPosition(MODE, state, runId ? rawStep : 1);
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

  const handleScenarioPicked = async (scenario: OmniVideoScenario, sourceRunId: string | null, brief: string) => {
    if (!runId) {
      try {
        const created = await createRun.mutateAsync({
          mode: MODE,
          title: scenario.title.slice(0, 80),
          current_step: 2,
          step_state: {
            objective: brief,
            scenario,
            scenario_source_run_id: sourceRunId ?? undefined,
            video_schema_version: VIDEO_SCHEMA_VERSION,
            max_step_reached: 2,
          },
        });
        setLocalState((created.step_state ?? {}) as OmniImagesState);
        onRunCreated(created.id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not create the Studio run');
      }
      return;
    }
    await persist(2, { objective: brief, scenario, scenario_source_run_id: sourceRunId ?? undefined, title: scenario.title });
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
        <p className="text-sm text-destructive">Could not load this Video Studio run.</p>
        <Button variant="outline" size="sm" onClick={onExit} className="h-8 cursor-pointer text-xs">Back to the Videos hub</Button>
      </div>
    );
  }

  const ordinal = position.ordinal;
  const scenario = state.scenario;
  const engine = DRAFT_ENGINES.find((e) => e.id === state.video_engine_id) ?? null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Video Studio · Stage {ordinal} of {stages.length}
            {built < stages.length && ` · built through stage ${built} in this phase`}
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
            aria-label="Exit Video Studio"
            className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
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
              aria-label={`${s.title}${reachable ? '' : s.ordinal > built ? ' (lands in a later phase)' : ' (not reached yet)'}`}
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
            <VSScenario onPicked={(sc, src, brief) => void handleScenarioPicked(sc, src, brief)} />
          )}
          {ordinal === 2 && scenario && (
            <VSStoryboardCast
              scenario={scenario}
              initialEngineId={state.video_engine_id}
              onNext={(picked) => void persist(3, { video_engine_id: picked.id })}
            />
          )}
          {ordinal === 3 && scenario && runId && (
            <VSScenes
              runId={runId}
              scenario={scenario}
              engine={engine ?? DRAFT_ENGINES[0]}
              approvedIds={state.approved_asset_ids ?? []}
              onClipCreated={(sceneIdx, assetId) => {
                void persist(3, (prev) => ({
                  scenario: prev.scenario && {
                    ...prev.scenario,
                    scenes: prev.scenario.scenes.map((s) => (s.idx === sceneIdx ? { ...s, clip_asset_id: assetId } : s)),
                  },
                }));
              }}
              onApprovedChange={(ids) => void persist(3, { approved_asset_ids: ids })}
              onContinue={() => void persist(4, {})}
            />
          )}
          {ordinal === 4 && scenario && runId && (
            <VSAudio
              runId={runId}
              scenario={scenario}
              voiceoverAssetId={state.voiceover_asset_id}
              voiceId={state.voiceover_voice_id}
              musicAssetId={state.music_asset_id}
              musicPrompt={state.music_prompt}
              onNarrationChange={(sceneIdx, narration) => {
                void persist(4, (prev) => ({
                  scenario: prev.scenario && {
                    ...prev.scenario,
                    scenes: prev.scenario.scenes.map((s) => (s.idx === sceneIdx ? { ...s, narration } : s)),
                  },
                }));
              }}
              onVoiceoverStarted={(assetId, pickedVoiceId) =>
                void persist(4, { voiceover_asset_id: assetId, voiceover_voice_id: pickedVoiceId })}
              onMusicStarted={(assetId, prompt) =>
                void persist(4, { music_asset_id: assetId, music_prompt: prompt })}
              onNext={() => void persist(5, {})}
            />
          )}
          {ordinal === 5 && scenario && runId && (
            <VSAssembly
              runId={runId}
              scenario={scenario}
              approvedIds={state.approved_asset_ids ?? []}
              voiceoverAssetId={state.voiceover_asset_id}
              musicAssetId={state.music_asset_id}
              assemblyAssetId={state.assembly_asset_id}
              onHeroStarted={(sceneIdx, assetId) => {
                void persist(5, (prev) => ({
                  scenario: prev.scenario && {
                    ...prev.scenario,
                    scenes: prev.scenario.scenes.map((s) => (s.idx === sceneIdx ? { ...s, hero_asset_id: assetId } : s)),
                  },
                }));
              }}
              onAssemblyStarted={(assetId) => void persist(5, { assembly_asset_id: assetId })}
              onContinue={() => void persist(6, {})}
            />
          )}
          {ordinal === 6 && scenario && runId && (
            <VSCaptions
              runId={runId}
              assemblyAssetId={state.assembly_asset_id}
              srtPath={state.srt_path}
              onSrtSaved={(path) => void persist(6, { srt_path: path })}
              onNext={() => void persist(7, {})}
            />
          )}
          {ordinal === 7 && scenario && runId && (
            <VSDistribution
              runId={runId}
              assemblyAssetId={state.assembly_asset_id}
              timelineSeconds={scenario.scenes
                .filter((s) => s.hero_asset_id || (s.clip_asset_id && (state.approved_asset_ids ?? []).includes(s.clip_asset_id)))
                .reduce((sum, s) => sum + (s.duration_s || 0), 0) || scenario.scenes.reduce((sum, s) => sum + (s.duration_s || 0), 0)}
              variants={state.video_variants ?? {}}
              onVariantSaved={(presetId, ref) =>
                void persist(7, (prev) => ({ video_variants: { ...(prev.video_variants ?? {}), [presetId]: ref } }))}
              onNext={() => void persist(8, {})}
            />
          )}
          {ordinal === 8 && scenario && runId && (
            <VSFinalizeVideo
              runId={runId}
              runTitle={run.data?.title ?? state.title ?? scenario.title}
              runStatus={run.data?.status ?? 'active'}
              assemblyAssetId={state.assembly_asset_id}
              srtPath={state.srt_path}
              variants={state.video_variants ?? {}}
              captions={state.video_captions ?? {}}
              onCaptionChange={(presetId, caption) =>
                void persist(8, (prev) => ({ video_captions: { ...(prev.video_captions ?? {}), [presetId]: caption } }))}
            />
          )}
          {ordinal > 1 && !scenario && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">This run has no scenario yet.</p>
              <Button variant="outline" size="sm" onClick={() => void persist(1, {})} className="h-8 cursor-pointer text-xs">
                Back to the scenario stage
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
