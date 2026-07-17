"use client";

/**
 * ClipsWizard: the video_clips fast lane (Plan 2 Phase 8) — an opinionated
 * PRESET over Studio machinery, not a fork. Four screens: Idea (hook-first
 * templates) → Generate (1-2 takes on native-audio engines, 9:16) → Captions
 * & format (VSCaptions reused on the chosen take + 9:16 network chips) →
 * Finalize (VSFinalizeVideo reused verbatim). Engine ceilings bound clips at
 * ≤15s (Kling/Seedance enums) — longer stories belong in Video Studio.
 */

import { useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Loader2, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { VIDEO_MODES, VIDEO_SCHEMA_VERSION, resolveVideoPosition } from '../stepRegistry';
import { useCreateOmniRun, useOmniRun, useUpdateOmniRun } from '@/hooks/omni';
import type { OmniImagesState, OmniVideoVariantRef } from '@/hooks/omni';
import { OMNI_VIDEO_NETWORKS } from '../omniVideoNetworkPresets';
import { VSCaptions } from '../video-studio/VSCaptions';
import { VSFinalizeVideo } from '../video-studio/VSFinalizeVideo';
import { CLGenerate } from './CLGenerate';
import {
  CLIP_ENGINES, CLIP_NETWORK_PRESETS, CLIP_TEMPLATES, estimateClipCost, type ClipEngineOption,
} from './clipsTemplates';

const MODE = 'video_clips' as const;

interface ClipsWizardProps {
  runId: string | null;
  onRunCreated: (runId: string) => void;
  onExit: () => void;
}

export function ClipsWizard({ runId, onRunCreated, onExit }: ClipsWizardProps) {
  const reduceMotion = useReducedMotion();
  const run = useOmniRun(runId);
  const createRun = useCreateOmniRun();
  const updateRun = useUpdateOmniRun();
  const [localState, setLocalState] = useState<OmniImagesState | null>(null);

  // Idea-screen state (pre-run).
  const [templateId, setTemplateId] = useState(CLIP_TEMPLATES[0].id);
  const [idea, setIdea] = useState('');
  const [seconds, setSeconds] = useState(10);
  const [engineId, setEngineId] = useState(CLIP_ENGINES[0].id);
  const [takes, setTakes] = useState<1 | 2>(1);

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

  const engine: ClipEngineOption = CLIP_ENGINES.find((e) => e.id === (state.video_engine_id ?? engineId)) ?? CLIP_ENGINES[0];

  const startClip = async () => {
    const trimmed = idea.trim();
    if (!trimmed) {
      toast.error('Describe the clip idea first.');
      return;
    }
    const template = CLIP_TEMPLATES.find((t) => t.id === templateId) ?? CLIP_TEMPLATES[0];
    const chosen = CLIP_ENGINES.find((e) => e.id === engineId) ?? CLIP_ENGINES[0];
    const clampedSeconds = Math.min(seconds, chosen.maxSeconds);
    const prompt = template.compose(trimmed);
    const scenes = Array.from({ length: takes }, (_, i) => ({
      idx: i + 1,
      visual_prompt: prompt,
      narration: '',
      duration_s: clampedSeconds,
    }));
    try {
      const created = await createRun.mutateAsync({
        mode: MODE,
        title: trimmed.slice(0, 80),
        current_step: 2,
        step_state: {
          objective: trimmed,
          scenario: { title: trimmed.slice(0, 120), scenes },
          video_engine_id: chosen.id,
          video_schema_version: VIDEO_SCHEMA_VERSION,
          max_step_reached: 2,
        },
      });
      setLocalState((created.step_state ?? {}) as OmniImagesState);
      onRunCreated(created.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the clip run');
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
        <p className="text-sm text-destructive">Could not load this clip run.</p>
        <Button variant="outline" size="sm" onClick={onExit} className="h-8 cursor-pointer text-xs">Back to the Videos hub</Button>
      </div>
    );
  }

  const ordinal = position.ordinal;
  const scenario = state.scenario;
  const chosenClipId = (state.approved_asset_ids ?? [])[0];
  const selectedNetworks = new Set(Object.values(state.video_variants ?? {}).map((v) => v.network));

  const toggleNetwork = (network: string, presetId: string) => {
    void persist(3, (prev) => {
      const variants: Record<string, OmniVideoVariantRef> = { ...(prev.video_variants ?? {}) };
      if (variants[presetId]) delete variants[presetId];
      else if (chosenClipId) variants[presetId] = { asset_id: chosenClipId, network, preset_id: presetId };
      return { video_variants: variants };
    });
  };

  const chosenEngineForIdea = CLIP_ENGINES.find((e) => e.id === engineId) ?? CLIP_ENGINES[0];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Clips · Screen {ordinal} of {stages.length}
          </p>
          <h1 className="truncate text-sm font-semibold sm:text-base">{stages[ordinal - 1].title}</h1>
        </div>
        <div className="flex items-center gap-1">
          {ordinal > 1 && (
            <Button variant="ghost" size="icon" onClick={() => void persist(ordinal - 1, {})} aria-label="Back one screen" className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onExit} aria-label="Exit Clips" className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 gap-1.5 border-b border-border px-4 py-2 sm:px-6" role="group" aria-label="Screens">
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
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Hook template">
                {CLIP_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    aria-pressed={templateId === t.id}
                    className={cn(
                      'cursor-pointer rounded-xl border p-3 text-left transition-colors duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      templateId === t.id ? 'border-violet-500/60 bg-violet-500/10' : 'border-border hover:border-violet-500/40',
                    )}
                  >
                    <p className="text-xs font-semibold">{t.label}{templateId === t.id && <Check className="ml-1.5 inline h-3 w-3" />}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{t.blurb}</p>
                  </button>
                ))}
              </div>
              <Textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={3}
                placeholder="What is this clip about?"
                className="min-h-[76px] resize-y text-sm"
                aria-label="Clip idea"
              />
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5" role="group" aria-label="Clip length">
                  {[6, 10, 15].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSeconds(s)}
                      aria-pressed={seconds === s}
                      disabled={s > chosenEngineForIdea.maxSeconds}
                      className={cn(
                        'cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40',
                        seconds === s ? 'border-violet-500/60 bg-violet-500/10 font-medium' : 'border-border hover:border-violet-500/40',
                      )}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5" role="group" aria-label="Takes">
                  {[1, 2].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTakes(t as 1 | 2)}
                      aria-pressed={takes === t}
                      className={cn(
                        'cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        takes === t ? 'border-violet-500/60 bg-violet-500/10 font-medium' : 'border-border hover:border-violet-500/40',
                      )}
                    >
                      {t} take{t === 1 ? '' : 's'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2" role="group" aria-label="Engine">
                {CLIP_ENGINES.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => { setEngineId(e.id); setSeconds((s) => Math.min(s, e.maxSeconds)); }}
                    aria-pressed={engineId === e.id}
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 text-left transition-colors duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      engineId === e.id ? 'border-violet-500/60 bg-violet-500/10' : 'border-border hover:border-violet-500/40',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold">{e.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{e.blurb}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{e.priceLabel}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground" aria-live="polite">
                  {estimateClipCost(chosenEngineForIdea, Math.min(seconds, chosenEngineForIdea.maxSeconds), takes)} · 9:16 vertical · longer stories belong in Video Studio
                </p>
                <Button
                  size="sm"
                  onClick={() => void startClip()}
                  disabled={createRun.isPending || !idea.trim()}
                  className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
                >
                  {createRun.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  Generate the clip
                </Button>
              </div>
            </div>
          )}

          {ordinal === 2 && scenario && runId && (
            <CLGenerate
              runId={runId}
              scenario={scenario}
              engine={engine}
              chosenClipId={chosenClipId}
              onClipCreated={(sceneIdx, assetId) => {
                void persist(2, (prev) => ({
                  scenario: prev.scenario && {
                    ...prev.scenario,
                    scenes: prev.scenario.scenes.map((s) => (s.idx === sceneIdx ? { ...s, clip_asset_id: assetId } : s)),
                  },
                }));
              }}
              onChosen={(assetId) => void persist(2, { approved_asset_ids: [assetId] })}
              onNext={() => void persist(3, {})}
            />
          )}

          {ordinal === 3 && runId && (
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
                  <p className="text-[11px] text-muted-foreground">Your 9:16 clip fits every one of these as-is — no reprocessing needed.</p>
                </section>
                <VSCaptions
                  runId={runId}
                  assemblyAssetId={chosenClipId}
                  srtPath={state.srt_path}
                  onSrtSaved={(path) => void persist(3, { srt_path: path })}
                  onNext={() => {
                    if (selectedNetworks.size === 0) {
                      toast.error('Pick at least one network first.');
                      return;
                    }
                    void persist(4, {});
                  }}
                  nextLabel="Continue to Finalize"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-sm text-muted-foreground">Pick a take first — captions transcribe the chosen clip.</p>
                <Button variant="outline" size="sm" onClick={() => void persist(2, {})} className="h-8 cursor-pointer text-xs">Back to Generate</Button>
              </div>
            )
          )}

          {ordinal === 4 && runId && (
            <VSFinalizeVideo
              runId={runId}
              runTitle={run.data?.title ?? state.title ?? 'Clip'}
              runStatus={run.data?.status ?? 'active'}
              assemblyAssetId={chosenClipId}
              srtPath={state.srt_path}
              variants={state.video_variants ?? {}}
              captions={state.video_captions ?? {}}
              onCaptionChange={(presetId, caption) =>
                void persist(4, (prev) => ({ video_captions: { ...(prev.video_captions ?? {}), [presetId]: caption } }))}
            />
          )}

          {ordinal > 1 && !scenario && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">This run has no clip idea yet.</p>
              <Button variant="outline" size="sm" onClick={() => void persist(1, {})} className="h-8 cursor-pointer text-xs">Back to the idea screen</Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
