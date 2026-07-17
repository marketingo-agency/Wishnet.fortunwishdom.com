"use client";

/**
 * Video Studio scene runner (Plan 2 Phase 5b): sequential per-scene submits
 * through omni-video, batched polling every ~3.5s. GEN-01 semantics from
 * Plan 1 apply verbatim: a failed clip gets Retry and is NEVER counted as
 * fulfilled; the finisher covers closed tabs (rows keep completing server-
 * side and restore on resume).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { callOmniVideo } from '@/lib/omniApi';
import type { OmniScenarioScene } from './types';

export type SceneClipStatus = 'none' | 'generating' | 'persisting' | 'done' | 'failed';

export interface SceneClipState {
  status: SceneClipStatus;
  assetId?: string;
  url?: string;
  error?: string;
}

export interface VideoPollEntry {
  id: string;
  status: string;
  url?: string | null;
  error?: string | null;
  duration_s?: number | null;
}

export interface DraftEngine {
  modelId: string;
  /** i2v engines anchor each scene on its keyframe. */
  i2v: boolean;
  resolution?: string;
  generateAudio?: boolean;
  /** Target aspect; Studio defaults to 16:9, Clips to 9:16. */
  aspect?: string;
}

export async function pollVideoAssets(assetIds: string[]): Promise<VideoPollEntry[]> {
  if (assetIds.length === 0) return [];
  const res = await callOmniVideo<{ results: VideoPollEntry[] }>('video-poll', { asset_ids: assetIds });
  return res.results;
}

export function useVideoScenes(runId: string | null) {
  const [clips, setClips] = useState<Record<number, SceneClipState>>({});
  const [isRunning, setIsRunning] = useState(false);
  const stopRef = useRef(false);
  useEffect(() => {
    stopRef.current = false;
    return () => { stopRef.current = true; };
  }, []);

  const patch = useCallback((idx: number, next: SceneClipState) => {
    setClips((prev) => ({ ...prev, [idx]: next }));
  }, []);

  /** Restore clip states from persisted asset ids (resume / finisher completions). */
  const restore = useCallback(async (scenes: OmniScenarioScene[]) => {
    const withClips = scenes.filter((s) => s.clip_asset_id);
    if (withClips.length === 0) return;
    setClips((prev) => {
      const next = { ...prev };
      for (const s of withClips) {
        if (!next[s.idx]) next[s.idx] = { status: 'generating', assetId: s.clip_asset_id };
      }
      return next;
    });
    try {
      const results = await pollVideoAssets(withClips.map((s) => s.clip_asset_id!));
      setClips((prev) => {
        const next = { ...prev };
        for (const s of withClips) {
          const r = results.find((x) => x.id === s.clip_asset_id);
          if (!r) continue;
          next[s.idx] = r.status === 'done'
            ? { status: 'done', assetId: r.id, url: r.url ?? undefined }
            : r.status === 'failed'
              ? { status: 'failed', assetId: r.id, error: r.error ?? 'Generation failed' }
              : { status: r.status === 'persisting' ? 'persisting' : 'generating', assetId: r.id };
        }
        return next;
      });
    } catch { /* best-effort; the run loop and per-scene retry recover */ }
  }, []);

  /**
   * Generate the given scenes sequentially on the chosen engine. Returns the
   * scene→asset map so the caller persists ids the moment they exist (paid
   * outputs persist immediately — project rule).
   */
  const runScenes = useCallback(async (
    scenes: OmniScenarioScene[],
    engine: DraftEngine,
    onAssetCreated: (sceneIdx: number, assetId: string) => void,
    nextKeyframeOf?: (sceneIdx: number) => string | undefined,
  ) => {
    if (!runId || isRunning || scenes.length === 0) return;
    stopRef.current = false;
    setIsRunning(true);
    try {
      const pending = new Map<string, number>();
      for (const scene of scenes) {
        if (stopRef.current) break;
        try {
          const body: Record<string, unknown> = {
            run_id: runId,
            scene_idx: scene.idx,
            model_id: engine.modelId,
            prompt: `${scene.visual_prompt}${scene.camera ? `, ${scene.camera} camera` : ''}`,
            prompt_provenance: 'raw',
            tier: 'draft',
            params: {
              duration: scene.duration_s,
              seconds: scene.duration_s,
              aspect: engine.aspect ?? '16:9',
              ...(engine.resolution ? { resolution: engine.resolution } : {}),
              ...(engine.generateAudio !== undefined ? { generate_audio: engine.generateAudio } : {}),
            },
          };
          if (engine.i2v && scene.keyframe_asset_id) {
            body.start_asset_id = scene.keyframe_asset_id;
            const endFrame = nextKeyframeOf?.(scene.idx);
            if (endFrame) body.end_asset_id = endFrame;
          }
          const res = await callOmniVideo<{ asset_id: string }>('video-submit', body);
          pending.set(res.asset_id, scene.idx);
          patch(scene.idx, { status: 'generating', assetId: res.asset_id });
          onAssetCreated(scene.idx, res.asset_id);
        } catch (e) {
          patch(scene.idx, { status: 'failed', error: e instanceof Error ? e.message : 'Submit failed' });
        }
      }

      let consecutiveErrors = 0;
      while (pending.size > 0 && !stopRef.current) {
        await new Promise((r) => setTimeout(r, 3500));
        let results: VideoPollEntry[];
        try {
          results = await pollVideoAssets([...pending.keys()]);
          consecutiveErrors = 0;
        } catch {
          consecutiveErrors += 1;
          if (consecutiveErrors >= 3) break; // resume/finisher will recover
          continue;
        }
        for (const r of results) {
          const idx = pending.get(r.id);
          if (idx === undefined) continue;
          if (r.status === 'done') {
            pending.delete(r.id);
            patch(idx, { status: 'done', assetId: r.id, url: r.url ?? undefined });
          } else if (r.status === 'failed') {
            pending.delete(r.id);
            patch(idx, { status: 'failed', assetId: r.id, error: r.error ?? 'Generation failed' });
          } else if (r.status === 'persisting') {
            patch(idx, { status: 'persisting', assetId: r.id });
          }
        }
      }
    } finally {
      setIsRunning(false);
    }
  }, [runId, isRunning, patch]);

  const stop = useCallback(() => {
    stopRef.current = true;
  }, []);

  return { clips, isRunning, runScenes, restore, stop, patch };
}
