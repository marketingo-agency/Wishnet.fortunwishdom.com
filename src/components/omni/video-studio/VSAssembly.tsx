"use client";

/**
 * Video Studio stage 5: hero re-renders + timeline assembly (Plan 2 Phase 6b).
 * Heroes go through the SAME video-submit path as drafts (tier 'hero', Kling
 * v3 Pro per Q6 — i2v when the scene has a keyframe); the superseded draft is
 * tagged metadata.superseded_by and assembly prefers the hero. Assembly runs
 * as one server-side job (merge → mix → loudnorm → persist) against a polled
 * asset row — closing the tab is safe. Continues to stage 6 (Captions).
 */

import { useEffect, useRef, useState } from 'react';
import { Clapperboard, Crown, Film, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { callOmniVideo } from '@/lib/omniApi';
import {
  markSuperseded, usePolledAsset, useVideoAudioActions,
} from '@/hooks/omni/useVideoAudio';
import type { OmniScenarioScene, OmniVideoScenario } from '@/hooks/omni';

const HERO_T2V = 'fal-ai/kling-video/v3/pro/text-to-video';
const HERO_I2V = 'fal-ai/kling-video/v3/pro/image-to-video';
const HERO_PRICE_PER_S = 0.14;

interface VSAssemblyProps {
  runId: string;
  scenario: OmniVideoScenario;
  approvedIds: string[];
  voiceoverAssetId?: string;
  musicAssetId?: string;
  assemblyAssetId?: string;
  onHeroStarted: (sceneIdx: number, assetId: string) => void;
  onAssemblyStarted: (assetId: string) => void;
  onContinue: () => void;
}

/** One scene row: cut status + hero re-render lifecycle (sub-component so
 *  each row can poll its own hero asset — the EntryImageLoader pattern). */
function SceneCutRow({
  runId, scene, approved, heroBusyGlobal, onHeroStarted,
}: {
  runId: string;
  scene: OmniScenarioScene;
  approved: boolean;
  heroBusyGlobal: boolean;
  onHeroStarted: (sceneIdx: number, assetId: string) => void;
}) {
  const hero = usePolledAsset(scene.hero_asset_id);
  const [submitting, setSubmitting] = useState(false);
  const supersededRef = useRef(false);

  // Tag the draft once its hero lands (best-effort, Sentry-logged).
  useEffect(() => {
    if (hero.status === 'done' && scene.clip_asset_id && scene.hero_asset_id && !supersededRef.current) {
      supersededRef.current = true;
      void markSuperseded(scene.clip_asset_id, scene.hero_asset_id);
    }
  }, [hero.status, scene.clip_asset_id, scene.hero_asset_id]);

  const heroBusy = hero.status === 'generating' || hero.status === 'persisting';
  const inCut = hero.status === 'done' || (approved && !!scene.clip_asset_id);

  const startHero = async () => {
    setSubmitting(true);
    try {
      const useI2v = !!scene.keyframe_asset_id;
      const body: Record<string, unknown> = {
        run_id: runId,
        scene_idx: scene.idx,
        model_id: useI2v ? HERO_I2V : HERO_T2V,
        prompt: `${scene.visual_prompt}${scene.camera ? `, ${scene.camera} camera` : ''}`,
        prompt_provenance: 'raw',
        tier: 'hero',
        params: { duration: scene.duration_s, seconds: scene.duration_s, aspect: '16:9' },
      };
      if (useI2v) body.start_asset_id = scene.keyframe_asset_id;
      const res = await callOmniVideo<{ asset_id: string }>('video-submit', body);
      supersededRef.current = false;
      onHeroStarted(scene.idx, res.asset_id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Hero render could not be started');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn(
      'flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 transition-colors duration-200',
      inCut ? 'border-border bg-card' : 'border-dashed border-border bg-muted/20',
    )}>
      <div className="min-w-0">
        <p className="truncate text-xs">
          <span className="font-semibold">Scene {scene.idx}</span>
          <span className="text-muted-foreground"> · {scene.duration_s}s · {scene.visual_prompt}</span>
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {hero.status === 'done' ? (
            <span className="inline-flex items-center gap-1 text-amber-600 [[data-omni-theme=dark]_&]:text-amber-400">
              <Crown className="h-3 w-3" /> Hero cut
            </span>
          ) : heroBusy ? (
            'Hero rendering — the draft stays in the cut until it lands'
          ) : hero.status === 'failed' ? (
            <span className="text-destructive">Hero failed: {hero.error}</span>
          ) : inCut ? 'Draft cut (approved)' : 'Not in the cut — approve its draft in Scenes, or render a hero'}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void startHero()}
        disabled={submitting || heroBusy || heroBusyGlobal}
        className="h-8 shrink-0 cursor-pointer gap-1.5 text-xs"
      >
        {submitting || heroBusy
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : hero.status === 'done' ? <RefreshCw className="h-3.5 w-3.5" /> : <Crown className="h-3.5 w-3.5" />}
        {heroBusy ? 'Rendering…' : hero.status === 'done' ? 'Re-render hero' : `Hero render (~$${(HERO_PRICE_PER_S * (scene.duration_s || 0)).toFixed(2)})`}
      </Button>
    </div>
  );
}

export function VSAssembly({
  runId, scenario, approvedIds, voiceoverAssetId, musicAssetId, assemblyAssetId,
  onHeroStarted, onAssemblyStarted, onContinue,
}: VSAssemblyProps) {
  const approved = new Set(approvedIds);
  const actions = useVideoAudioActions(runId);
  const vo = usePolledAsset(voiceoverAssetId);
  const music = usePolledAsset(musicAssetId);
  const assembly = usePolledAsset(assemblyAssetId);
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');

  // A scene is in the cut with its hero (once done) or its approved draft.
  // Hero DONE-ness is only known to each row's poller, so the cut computed
  // here treats a scene with a hero id as hero-intent: assembly re-checks
  // readiness server-side (a not-yet-persisted asset 400s with a clear message).
  const cutScenes = scenario.scenes
    .filter((s) => s.hero_asset_id || (s.clip_asset_id && approved.has(s.clip_asset_id)))
    .sort((a, b) => a.idx - b.idx);
  const timelineSeconds = cutScenes.reduce((sum, s) => sum + (s.duration_s || 0), 0);
  const assemblyBusy = assembly.status === 'generating' || assembly.status === 'persisting';
  const audioPending = (voiceoverAssetId && vo.status !== 'done' && vo.status !== 'failed' && vo.status !== 'idle')
    || (musicAssetId && music.status !== 'done' && music.status !== 'failed' && music.status !== 'idle');

  const startAssembly = async () => {
    if (cutScenes.length === 0) {
      toast.error('The cut is empty — approve at least one scene.');
      return;
    }
    try {
      const assetId = await actions.assemble({
        scene_asset_ids: cutScenes.map((s) => s.hero_asset_id ?? s.clip_asset_id!) as string[],
        timeline_seconds: timelineSeconds,
        ...(voiceoverAssetId && vo.status === 'done' ? { voiceover_asset_id: voiceoverAssetId } : {}),
        ...(musicAssetId && music.status === 'done' ? { music_asset_id: musicAssetId } : {}),
        resolution,
        fps: 30,
      });
      onAssemblyStarted(assetId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Assembly could not be started');
    }
  };

  return (
    <div className="space-y-6">
      {/* The cut */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold">The cut</h2>
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {cutScenes.length}/{scenario.scenes.length} scenes · ≈{timelineSeconds}s
            {voiceoverAssetId && vo.status === 'done' && ' · voiceover'}
            {musicAssetId && music.status === 'done' && ' · music'}
          </p>
        </div>
        <div className="space-y-2">
          {scenario.scenes.map((scene) => (
            <SceneCutRow
              key={scene.idx}
              runId={runId}
              scene={scene}
              approved={!!scene.clip_asset_id && approved.has(scene.clip_asset_id)}
              heroBusyGlobal={assemblyBusy}
              onHeroStarted={onHeroStarted}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Hero renders use Kling v3 Pro (${HERO_PRICE_PER_S.toFixed(2)}/s){' '}
          and anchor on the scene&apos;s keyframe when it has one. Drafts stay retrievable in History.
        </p>
      </section>

      {/* Assemble */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold">Assemble the film</h2>
          </div>
          <div className="flex items-center gap-2">
            <Select value={resolution} onValueChange={(v) => setResolution(v as '1080p' | '720p')} disabled={assemblyBusy}>
              <SelectTrigger className="h-8 w-28 cursor-pointer text-xs" aria-label="Output resolution">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1080p" className="cursor-pointer text-xs">1080p</SelectItem>
                <SelectItem value="720p" className="cursor-pointer text-xs">720p</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => void startAssembly()}
              disabled={assemblyBusy || actions.isSubmitting || cutScenes.length === 0 || !!audioPending}
              className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
            >
              {assemblyBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clapperboard className="h-3.5 w-3.5" />}
              {assemblyBusy ? 'Assembling…' : assembly.status === 'done' ? 'Re-assemble' : 'Assemble the film'}
            </Button>
          </div>
        </div>
        {audioPending && (
          <p className="text-[11px] text-amber-600 [[data-omni-theme=dark]_&]:text-amber-400" aria-live="polite">
            Audio is still rendering — assembly unlocks when it lands (or fails, in which case the film assembles without it).
          </p>
        )}
        {assemblyBusy && (
          <p className="text-[11px] text-muted-foreground" aria-live="polite">
            Merging scenes, mixing audio, normalizing loudness — closing the tab is safe; the render continues server-side.
          </p>
        )}
        {assembly.status === 'failed' && (
          <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
            <XCircle className="h-3.5 w-3.5 shrink-0" /> {assembly.error}
          </p>
        )}
        {assembly.status === 'done' && assembly.url && (
          <div className="space-y-2">
            <video
              src={assembly.url}
              poster={assembly.thumbUrl}
              controls
              preload="metadata"
              className="w-full rounded-lg border border-border"
              aria-label="Assembled film"
            />
            {typeof assembly.durationS === 'number' && (
              <p className="text-[11px] text-muted-foreground">≈{assembly.durationS}s final cut · {resolution}</p>
            )}
          </div>
        )}
      </section>

      {assembly.status === 'done' && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center">
          <Clapperboard className="h-5 w-5 text-violet-400" />
          <p className="text-sm font-medium">Your film is assembled and saved.</p>
          <p className="max-w-md text-xs text-muted-foreground">Next: captions, per-network variants, and the Content Library.</p>
          <Button
            size="sm"
            onClick={onContinue}
            className="h-8 cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
          >
            Continue to Captions
          </Button>
        </div>
      )}
    </div>
  );
}
