"use client";

/**
 * Scenario Studio stage 3: storyboard keyframes. Pick the fal image model here,
 * then generate one image per scene via the EXISTING image pipeline (omni
 * variant-submit), sequential submits + batched polling, per-scene re-roll.
 * Keyframes are optional — scenes can continue without one.
 *
 * References (Wishpedia canon from step 1 + each scene's resolved cast art)
 * route to an edit model so the storyboard shows the REAL character; every
 * downstream i2v clip inherits it.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ImageOff, Loader2, Play, RefreshCw, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  CANON_KEYFRAME_MODEL, KEYFRAME_MODEL, canonRefsForScene, pollKeyframes, submitKeyframe,
} from '@/hooks/omni/useScenario';
import { getFalPrice } from '@/config/falPricing';
import { stripKnowledgeMarkers } from '@/lib/omni/stripKnowledgeMarkers';
import type { OmniScenarioScene, OmniVideoScenario, OmniWishReferenceRef } from '@/hooks/omni';
import { ScenarioModelPicker } from './ScenarioModelPicker';

interface FrameState {
  status: 'none' | 'generating' | 'done' | 'failed';
  assetId?: string;
  url?: string;
  error?: string;
}

/** Poll ceiling (TOP-5 fix): a stuck frame stops blocking after this. */
const POLL_DEADLINE_MS = 10 * 60_000;
const MAX_KEYFRAME_REFS = 8;
const FRAME_MEGAPIXELS = (1024 * 576) / 1_000_000;

interface ScenarioStoryboardProps {
  runId: string;
  scenario: OmniVideoScenario;
  /** Reference images chosen in the brief (anchor every scene's keyframe). */
  references: OmniWishReferenceRef[];
  onChange: (scenario: OmniVideoScenario) => void;
  onNext: () => void;
}

export function ScenarioStoryboard({ runId, scenario, references, onChange, onNext }: ScenarioStoryboardProps) {
  const step1RefIds = useMemo(() => references.map((r) => r.wishpediaImageId), [references]);
  const hasCanon = useMemo(
    () => scenario.scenes.some((s) => canonRefsForScene(scenario, s).length > 0),
    [scenario],
  );
  const needsEdit = step1RefIds.length > 0 || hasCanon;

  const [model, setModel] = useState<{ id: string; isEdit: boolean }>(() =>
    (step1RefIds.length > 0 || hasCanon) ? { id: CANON_KEYFRAME_MODEL, isEdit: true } : { id: KEYFRAME_MODEL, isEdit: false });

  const [frames, setFrames] = useState<Record<number, FrameState>>(() => {
    const init: Record<number, FrameState> = {};
    for (const s of scenario.scenes) {
      init[s.idx] = s.keyframe_asset_id ? { status: 'generating', assetId: s.keyframe_asset_id } : { status: 'none' };
    }
    return init;
  });
  const [isRunning, setIsRunning] = useState(false);
  const stopRef = useRef(false);
  useEffect(() => {
    stopRef.current = false;
    return () => { stopRef.current = true; };
  }, []);

  // Restore: previously generated keyframes re-sign on mount via one poll.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const ids = scenario.scenes.map((s) => s.keyframe_asset_id).filter((x): x is string => !!x);
    if (ids.length === 0) return;
    void pollKeyframes(ids).then((results) => {
      setFrames((prev) => {
        const next = { ...prev };
        for (const scene of scenario.scenes) {
          const r = results.find((x) => x.id === scene.keyframe_asset_id);
          if (!r) continue;
          next[scene.idx] = r.status === 'done'
            ? { status: 'done', assetId: r.id, url: r.url ?? undefined }
            : r.status === 'generating'
              ? { status: 'generating', assetId: r.id }
              : { status: 'failed', assetId: r.id, error: r.error ?? 'Generation failed' };
        }
        return next;
      });
    }).catch(() => { /* restore is best-effort; per-frame re-roll recovers */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once
  }, []);

  const price = getFalPrice(model.id);
  // Per-image models bill per image; only megapixel-priced models scale by size.
  const perFrame = price.unitPrice == null
    ? null
    : price.unit === 'megapixel'
      ? price.unitPrice * FRAME_MEGAPIXELS
      : price.unit === 'image'
        ? price.unitPrice
        : null;

  const refsForScene = (scene: OmniScenarioScene): string[] =>
    [...new Set([...step1RefIds, ...canonRefsForScene(scenario, scene)])].slice(0, MAX_KEYFRAME_REFS);

  /**
   * Submit new keyframes for `submitIdxs`, and RESUME polling (never resubmit)
   * for `resumeEntries` — scenes already generating server-side, whose assets
   * are already paid for. This is the paid-safety guarantee: Stop-then-Generate
   * or a poll-deadline lapse never double-charges an in-flight frame.
   */
  const runScenes = async (submitIdxs: number[], resumeEntries: { idx: number; assetId: string }[] = []) => {
    if (isRunning || (submitIdxs.length === 0 && resumeEntries.length === 0)) return;
    setIsRunning(true);
    stopRef.current = false;
    try {
      const pending = new Map<string, number>();
      const submitted = new Map<string, number>();
      for (const e of resumeEntries) pending.set(e.assetId, e.idx);

      for (const idx of submitIdxs) {
        if (stopRef.current) break;
        const scene = scenario.scenes.find((s) => s.idx === idx);
        if (!scene || !scene.visual_prompt.trim()) continue;
        try {
          const assetId = await submitKeyframe(runId, scene.visual_prompt, {
            modelId: model.id,
            modelIsEdit: model.isEdit,
            referenceImageIds: refsForScene(scene),
            camera: scene.camera,
          });
          pending.set(assetId, idx);
          submitted.set(assetId, idx);
          setFrames((prev) => ({ ...prev, [idx]: { status: 'generating', assetId } }));
        } catch (e) {
          setFrames((prev) => ({ ...prev, [idx]: { status: 'failed', error: e instanceof Error ? e.message : 'Submit failed' } }));
        }
      }
      // Persist only the NEWLY submitted asset ids (paid outputs).
      if (submitted.size > 0) {
        onChange({
          ...scenario,
          scenes: scenario.scenes.map((s) => {
            const entry = [...submitted.entries()].find(([, idx]) => idx === s.idx);
            return entry ? { ...s, keyframe_asset_id: entry[0] } : s;
          }),
        });
      }
      // TOP-5 fix: a hard deadline — a stuck frame can no longer spin forever.
      const deadline = Date.now() + POLL_DEADLINE_MS;
      while (pending.size > 0 && !stopRef.current && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 3000));
        const results = await pollKeyframes([...pending.keys()]).catch(() => []);
        for (const r of results) {
          const idx = pending.get(r.id);
          if (idx === undefined || r.status === 'generating') continue;
          pending.delete(r.id);
          setFrames((prev) => ({
            ...prev,
            [idx]: r.status === 'done'
              ? { status: 'done', assetId: r.id, url: r.url ?? undefined }
              : { status: 'failed', assetId: r.id, error: r.error ?? 'Generation failed' },
          }));
        }
      }
      if (pending.size > 0 && !stopRef.current) {
        toast.warning('Some keyframes are taking unusually long — they keep rendering server-side and restore when you come back.');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const incomplete = scenario.scenes.filter((s) => frames[s.idx]?.status !== 'done');
  // Only 'none'/'failed' scenes are (re)submitted; in-flight ones are resumed.
  const submitIdxs = incomplete
    .filter((s) => { const st = frames[s.idx]?.status; return st === undefined || st === 'none' || st === 'failed'; })
    .map((s) => s.idx);
  const resumeEntries = incomplete
    .filter((s) => frames[s.idx]?.status === 'generating' && frames[s.idx]?.assetId)
    .map((s) => ({ idx: s.idx, assetId: frames[s.idx]!.assetId! }));
  const doneCount = scenario.scenes.length - incomplete.length;

  return (
    <div className="space-y-4">
      <ScenarioModelPicker
        modelId={model.id}
        onChange={(id, isEdit) => setModel({ id, isEdit })}
        needsEdit={needsEdit}
        disabled={isRunning}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {doneCount}/{scenario.scenes.length} keyframes
          {perFrame != null && ` · ≈$${perFrame.toFixed(3)}/frame`}
          {' · keyframes are optional'}
        </p>
        <div className="flex items-center gap-2">
          {isRunning && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { stopRef.current = true; }}
              className="h-8 cursor-pointer gap-1.5 text-xs"
            >
              <Square className="h-3 w-3" /> Stop
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => { void runScenes(submitIdxs, resumeEntries); }}
            disabled={isRunning || incomplete.length === 0}
            className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
          >
            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {isRunning ? 'Generating…' : `Generate ${incomplete.length === scenario.scenes.length ? 'all' : 'missing'} (${incomplete.length})`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scenario.scenes.map((scene) => {
          const frame = frames[scene.idx] ?? { status: 'none' };
          return (
            <div key={scene.idx} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative flex aspect-video items-center justify-center bg-muted/40">
                {frame.status === 'done' && frame.url ? (
                  <img src={frame.url} alt={`Scene ${scene.idx} keyframe`} className="h-full w-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : frame.status === 'generating' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                ) : frame.status === 'failed' ? (
                  <p className="px-3 text-center text-[11px] text-destructive">{frame.error}</p>
                ) : (
                  <ImageOff className="h-5 w-5 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border p-2">
                <p className="min-w-0 truncate text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Scene {scene.idx}</span> · {stripKnowledgeMarkers(scene.visual_prompt) || 'No prompt'}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (!scene.visual_prompt.trim()) {
                      toast.warning(`Scene ${scene.idx} has no visual prompt.`);
                      return;
                    }
                    void runScenes([scene.idx]);
                  }}
                  disabled={isRunning}
                  aria-label={`Regenerate scene ${scene.idx} keyframe`}
                  className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end border-t pt-4">
        {/* TOP-5 fix: keyframes are optional — Continue is NEVER gated on the run. */}
        <Button
          onClick={onNext}
          className="cursor-pointer gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white transition-all duration-300 hover:opacity-90"
        >
          <ArrowRight className="h-4 w-4" />
          Continue to export
        </Button>
      </div>
    </div>
  );
}
