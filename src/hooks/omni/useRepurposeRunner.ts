"use client";

/**
 * Repurposing runner for the merged Repurpose & approve step.
 * 'crop' jobs run the client canvas engine (resize + cover-crop) for free.
 * 'redesign' jobs ask an edit model to re-lay-out the post for the target
 * aspect (keeping subjects, text, colors), then contain-fit to exact pixels so
 * the re-designed composition is never re-cropped.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { callOmni } from '@/lib/omniApi';
import { supabase } from '@/integrations/supabase/client';
import { repurposeEngine } from '@/lib/omni/repurpose';
import { getPreset, type OmniNetworkId } from '@/components/omni/omniNetworkPresets';
import { nearestAspectRatio } from '@/config/falSpecs';
import { getAssetSignedUrl, uploadRepurposedAsset } from './useOmniGeneration';
import type { OmniAsset, OmniRepurposedRef, VariantPollResult } from './types';

/**
 * The extend tier needs the source's intrinsic dimensions on its asset row
 * (the edge computes the outpaint geometry server-side from STORED dims).
 * Uploads record them; Files/Content-Library references may not — measure the
 * caller's own image once and backfill the row.
 */
async function ensureSourceDims(source: OmniAsset): Promise<{ width: number; height: number }> {
  if (source.width && source.height) return { width: source.width, height: source.height };
  if (!source.storage_path) throw new Error('Source image is not available');
  const url = await getAssetSignedUrl(source.storage_path);
  if (!url) throw new Error('Could not access the source image');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not load the source image');
  const bitmap = await createImageBitmap(await res.blob());
  const dims = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  await supabase.from('omni_assets').update(dims).eq('id', source.id);
  return dims;
}

export type RepurposeMode = 'crop' | 'redesign' | 'extend';

/**
 * Tier auto-suggestion (Plan 1 D-TIER, REP-04) keyed on the aspect delta
 * d = max(srcAR, tgtAR) / min(srcAR, tgtAR):
 *   d < 1.15      → 'crop'    (free; the trim is negligible)
 *   1.15 ≤ d ≤ 2.2 → 'extend' (pixel-preserving outpaint)
 *   d > 2.2       → 'redesign' (full re-layout)
 */
export function suggestRepurposeMode(srcW: number, srcH: number, dstW: number, dstH: number): RepurposeMode {
  if (!(srcW > 0) || !(srcH > 0) || !(dstW > 0) || !(dstH > 0)) return 'redesign';
  const srcAR = srcW / srcH;
  const dstAR = dstW / dstH;
  const d = Math.max(srcAR, dstAR) / Math.min(srcAR, dstAR);
  if (d < 1.15) return 'crop';
  if (d <= 2.2) return 'extend';
  return 'redesign';
}

/** Fraction of the source lost to a straight cover-crop (for the tier hint). */
export function cropTrimFraction(srcW: number, srcH: number, dstW: number, dstH: number): number {
  if (!(srcW > 0) || !(srcH > 0) || !(dstW > 0) || !(dstH > 0)) return 0;
  const srcAR = srcW / srcH;
  const dstAR = dstW / dstH;
  const d = Math.max(srcAR, dstAR) / Math.min(srcAR, dstAR);
  return Math.max(0, 1 - 1 / d);
}

export interface RepurposeJob {
  key: string;
  sourceAssetId: string;
  network: OmniNetworkId;
  presetId: string;
  mode: RepurposeMode;
  status: 'pending' | 'working' | 'done' | 'failed';
  resultAssetId?: string;
  previewUrl?: string;
  error?: string;
}

// Nano Banana Pro edit gives the best fidelity at preserving text + subjects
// while recomposing the layout for a new aspect ratio. The target ratio is
// snapped to this model's accepted enum (nearestAspectRatio) so fal never
// rejects it; the output is contain-fit to exact pixels afterwards regardless.
export const REDESIGN_MODEL = 'fal-ai/nano-banana-pro/edit';

export function useRepurposeRunner(runId: string, assetsById: Map<string, OmniAsset>) {
  const [jobs, setJobs] = useState<RepurposeJob[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const stopRef = useRef(false);

  // Mirror of jobs so the run loop reads each job's LATEST state (mode flips,
  // completions) instead of the snapshot captured at click time.
  const jobsRef = useRef<RepurposeJob[]>([]);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  // Stop the loop when the step unmounts. Reset in setup, not just cleanup:
  // a cleanup-only ref stays stuck after StrictMode's mount/unmount replay
  // (the documented BUG-01 footgun).
  useEffect(() => {
    stopRef.current = false;
    return () => {
      stopRef.current = true;
    };
  }, []);

  const pollSingle = useCallback(async (assetId: string): Promise<VariantPollResult> => {
    let consecutiveErrors = 0;
    for (;;) {
      if (stopRef.current) throw new Error('Repurposing was interrupted');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        const res = await callOmni<{ results: VariantPollResult[] }>('variants-poll', { asset_ids: [assetId] });
        consecutiveErrors = 0;
        const r = res.results.find((x) => x.id === assetId);
        if (r && r.status !== 'generating') return r;
      } catch (e) {
        // Tolerate transient poll failures; only three in a row is a real error.
        consecutiveErrors += 1;
        if (consecutiveErrors >= 3) throw e;
      }
    }
  }, []);

  const patchJob = useCallback((key: string, patch: Partial<RepurposeJob>) => {
    setJobs((prev) => prev.map((j) => (j.key === key ? { ...j, ...patch } : j)));
  }, []);

  // Produce one repurposed output (AI re-design or free client crop) and return
  // the new asset WITHOUT mutating job state — shared by the batch runner (runJob)
  // and the compare-modal candidate flow (generateCandidate). Throws on failure.
  const produceOutput = useCallback(
    async (job: RepurposeJob): Promise<{ assetId: string; previewUrl: string }> => {
      const preset = getPreset(job.network, job.presetId);
      const source = assetsById.get(job.sourceAssetId);
      if (!preset || !source?.storage_path) throw new Error('Source image is not available');

      let blob: Blob;
      if (job.mode === 'redesign') {
        const submit = await callOmni<{ asset_id: string }>('variant-submit', {
          run_id: runId,
          model_id: REDESIGN_MODEL,
          prompt: `Re-compose this image as a native ${preset.ratio} ${job.network} ${preset.label}. Reposition and rescale the main subject(s) and any text so the whole layout is balanced and fully visible inside the new ${preset.ratio} frame; intelligently rebuild and extend the background to fill the canvas. Preserve the exact subjects, their text content, colors, fonts, and brand style. Do not letterbox, do not crop the subjects, do not invent new text.`,
          parent_asset_id: job.sourceAssetId,
          source_asset_id: job.sourceAssetId,
          aspect_ratio: nearestAspectRatio(REDESIGN_MODEL, preset.width, preset.height) ?? '1:1',
        });
        const result = await pollSingle(submit.asset_id);
        if (result.status !== 'done' || !result.url) throw new Error(result.error ?? 'AI re-design failed');
        // The fal output already matches the target aspect; contain-fit to the
        // exact pixels (blurred backdrop on any sliver, REP-06) so the
        // re-designed composition is never re-cropped.
        blob = await repurposeEngine.render(result.url, { width: preset.width, height: preset.height }, 'contain-blur');
      } else if (job.mode === 'extend') {
        // Tier 2 (Plan 1 D-TIER): pixel-preserving outpaint. The edge computes
        // the expand geometry server-side from the stored source dimensions;
        // the output canvas already has the target ASPECT, so the final render
        // is a plain high-quality downscale to exact pixels (cover on a
        // matching ratio trims sub-pixel rounding only — no contain-fit hack).
        await ensureSourceDims(source);
        const submit = await callOmni<{ asset_id: string }>('repurpose-submit', {
          run_id: runId,
          source_asset_id: job.sourceAssetId,
          target_w: preset.width,
          target_h: preset.height,
        });
        const result = await pollSingle(submit.asset_id);
        if (result.status !== 'done' || !result.url) throw new Error(result.error ?? 'AI extend failed');
        blob = await repurposeEngine.render(result.url, { width: preset.width, height: preset.height }, 'cover');
      } else {
        const url = await getAssetSignedUrl(source.storage_path);
        if (!url) throw new Error('Could not access the source image');
        blob = await repurposeEngine.render(url, { width: preset.width, height: preset.height }, 'cover');
      }

      const assetId = await uploadRepurposedAsset({
        runId,
        sourceAssetId: job.sourceAssetId,
        blob,
        width: preset.width,
        height: preset.height,
        network: job.network,
        presetId: job.presetId,
      });
      return { assetId, previewUrl: URL.createObjectURL(blob) };
    },
    [assetsById, pollSingle, runId],
  );

  const runJob = useCallback(
    async (job: RepurposeJob): Promise<void> => {
      patchJob(job.key, { status: 'working' });
      try {
        const out = await produceOutput(job);
        patchJob(job.key, { status: 'done', resultAssetId: out.assetId, previewUrl: out.previewUrl });
      } catch (e) {
        patchJob(job.key, { status: 'failed', error: e instanceof Error ? e.message : 'Repurposing failed' });
      }
    },
    [patchJob, produceOutput],
  );

  // Generate a candidate for the compare modal WITHOUT touching the live tile —
  // the original output stays visible until the user approves the replacement.
  const generateCandidate = useCallback(
    (job: RepurposeJob): Promise<{ assetId: string; previewUrl: string }> => produceOutput(job),
    [produceOutput],
  );

  const runAll = useCallback(
    async (toRun: RepurposeJob[]) => {
      if (isRunning) return;
      stopRef.current = false;
      setIsRunning(true);
      try {
        for (const queued of toRun) {
          if (stopRef.current) break;
          const job = jobsRef.current.find((j) => j.key === queued.key) ?? queued;
          if (job.status === 'done') continue;
          await runJob(job);
        }
      } finally {
        setIsRunning(false);
      }
    },
    [isRunning, runJob],
  );

  const collectRefs = useCallback((): OmniRepurposedRef[] => {
    return jobs
      .filter((j) => j.status === 'done' && j.resultAssetId)
      .map((j) => ({
        asset_id: j.resultAssetId!,
        source_asset_id: j.sourceAssetId,
        network: j.network,
        preset_id: j.presetId,
        mode: j.mode,
      }));
  }, [jobs]);

  return { jobs, setJobs, patchJob, runAll, generateCandidate, isRunning, collectRefs };
}
