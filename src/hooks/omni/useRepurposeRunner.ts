"use client";

/**
 * Repurposing runner for wizard step 10.
 * Deterministic jobs run the client canvas engine (resize + cover-crop).
 * AI-extend jobs go through the generic fal runner (nano-banana edit family,
 * aspect_ratio steered), then a final canvas crop guarantees exact pixels.
 */

import { useCallback, useRef, useState } from 'react';
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

async function pollSingle(assetId: string): Promise<VariantPollResult> {
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const res = await callOmni<{ results: VariantPollResult[] }>('variants-poll', { asset_ids: [assetId] });
    const r = res.results.find((x) => x.id === assetId);
    if (r && r.status !== 'generating') return r;
  }
}

export function useRepurposeRunner(runId: string, assetsById: Map<string, OmniAsset>) {
  const [jobs, setJobs] = useState<RepurposeJob[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const stopRef = useRef(false);

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
    [assetsById, patchJob, runId],
  );

  const runAll = useCallback(
    async (toRun: RepurposeJob[]) => {
      if (isRunning) return;
      stopRef.current = false;
      setIsRunning(true);
      try {
        for (const job of toRun) {
          if (stopRef.current) break;
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
