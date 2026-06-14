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
import { repurposeEngine } from '@/lib/omni/repurpose';
import { getPreset, type OmniNetworkId } from '@/components/omni/omniNetworkPresets';
import { nearestAspectRatio } from '@/config/falSpecs';
import { getAssetSignedUrl, uploadRepurposedAsset } from './useOmniGeneration';
import type { OmniAsset, OmniRepurposedRef, VariantPollResult } from './types';

export type RepurposeMode = 'crop' | 'redesign';

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
        // exact pixels so the re-designed composition is never re-cropped.
        blob = await repurposeEngine.render(result.url, { width: preset.width, height: preset.height }, 'contain');
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
