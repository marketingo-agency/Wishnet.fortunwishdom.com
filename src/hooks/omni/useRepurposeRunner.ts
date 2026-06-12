"use client";

/**
 * Repurposing runner for wizard step 10.
 * Deterministic jobs run the client canvas engine (resize + cover-crop).
 * AI-extend jobs go through the generic fal runner (nano-banana edit family,
 * aspect_ratio steered), then a final canvas crop guarantees exact pixels.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { callOmni } from '@/lib/omniApi';
import { repurposeEngine } from '@/lib/omni/repurpose';
import { getPreset, type OmniNetworkId } from '@/components/omni/omniNetworkPresets';
import { getAssetSignedUrl, uploadRepurposedAsset } from './useOmniGeneration';
import type { OmniAsset, OmniRepurposedRef, VariantPollResult } from './types';

export type RepurposeMode = 'crop' | 'ai';

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

const AI_EXTEND_MODEL = 'fal-ai/nano-banana-2/edit';
const ALLOWED_AI_RATIOS = ['1:1', '4:5', '5:4', '3:4', '4:3', '2:3', '3:2', '9:16', '16:9', '2:1', '1:2', '3:1', '21:9'];

function nearestAiRatio(width: number, height: number): string {
  const target = width / height;
  let best = ALLOWED_AI_RATIOS[0];
  let bestDiff = Infinity;
  for (const ratio of ALLOWED_AI_RATIOS) {
    const [w, h] = ratio.split(':').map(Number);
    const diff = Math.abs(w / h - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = ratio;
    }
  }
  return best;
}

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

  const runJob = useCallback(
    async (job: RepurposeJob): Promise<void> => {
      const preset = getPreset(job.network, job.presetId);
      const source = assetsById.get(job.sourceAssetId);
      if (!preset || !source?.storage_path) {
        patchJob(job.key, { status: 'failed', error: 'Source image is not available' });
        return;
      }
      patchJob(job.key, { status: 'working' });
      try {
        let cropSourceUrl: string;

        if (job.mode === 'ai') {
          const submit = await callOmni<{ asset_id: string }>('variant-submit', {
            run_id: runId,
            model_id: AI_EXTEND_MODEL,
            prompt: `Extend this image naturally to a ${preset.ratio} canvas for a ${job.network} ${preset.label}. Keep the main subject fully intact and centered; continue the scene seamlessly at the edges. Do not add text or logos.`,
            parent_asset_id: job.sourceAssetId,
            source_asset_id: job.sourceAssetId,
            aspect_ratio: nearestAiRatio(preset.width, preset.height),
          });
          const result = await pollSingle(submit.asset_id);
          if (result.status !== 'done' || !result.url) {
            patchJob(job.key, { status: 'failed', error: result.error ?? 'AI extension failed' });
            return;
          }
          cropSourceUrl = result.url;
        } else {
          const url = await getAssetSignedUrl(source.storage_path);
          if (!url) {
            patchJob(job.key, { status: 'failed', error: 'Could not access the source image' });
            return;
          }
          cropSourceUrl = url;
        }

        // Exact pixel dimensions are always guaranteed by the canvas pass.
        const blob = await repurposeEngine.render(cropSourceUrl, { width: preset.width, height: preset.height });
        const assetId = await uploadRepurposedAsset({
          runId,
          sourceAssetId: job.sourceAssetId,
          blob,
          width: preset.width,
          height: preset.height,
          network: job.network,
          presetId: job.presetId,
        });
        patchJob(job.key, { status: 'done', resultAssetId: assetId, previewUrl: URL.createObjectURL(blob) });
      } catch (e) {
        patchJob(job.key, { status: 'failed', error: e instanceof Error ? e.message : 'Repurposing failed' });
      }
    },
    [assetsById, patchJob, pollSingle, runId],
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

  return { jobs, setJobs, patchJob, runAll, isRunning, collectRefs };
}
