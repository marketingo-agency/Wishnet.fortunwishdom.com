"use client";

/**
 * Live generation runner for wizard step 5.
 * Submits one fal queue job per variant, ONE MODEL AT A TIME (spec), and
 * polls all in-flight variants with a single batched call every 3 seconds
 * so images appear progressively as each variant completes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { callOmni } from '@/lib/omniApi';
import type { OmniModelSelection, VariantPollResult } from './types';

export interface VariantView {
  assetId: string;
  modelId: string;
  modelName: string;
  status: 'generating' | 'done' | 'failed' | 'discarded';
  url?: string | null;
  width?: number | null;
  height?: number | null;
  error?: string;
  isRegeneration?: boolean;
}

const POLL_INTERVAL_MS = 3000;

export function useGenerationRunner(runId: string | null) {
  const [variants, setVariants] = useState<VariantView[]>([]);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const stopRef = useRef(false);

  useEffect(() => {
    // Reset on (re)mount: a cleanup-only stop flag is the documented BUG-01
    // StrictMode footgun (mount, cleanup, remount leaves it stuck true).
    stopRef.current = false;
    return () => {
      stopRef.current = true;
    };
  }, []);

  const patchVariant = useCallback((assetId: string, patch: Partial<VariantView>) => {
    setVariants((prev) => prev.map((v) => (v.assetId === assetId ? { ...v, ...patch } : v)));
  }, []);

  /** Poll the given asset ids until every one reaches a terminal state. */
  const pollUntilSettled = useCallback(async (assetIds: string[]) => {
    let pending = [...assetIds];
    while (pending.length > 0 && !stopRef.current) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      if (stopRef.current) return;
      try {
        const res = await callOmni<{ results: VariantPollResult[] }>('variants-poll', { asset_ids: pending });
        for (const r of res.results) {
          if (r.status === 'done') {
            patchVariant(r.id, { status: 'done', url: r.url, width: r.width, height: r.height });
          } else if (r.status === 'failed') {
            patchVariant(r.id, { status: 'failed', error: r.error });
          }
        }
        pending = res.results.filter((r) => r.status === 'generating').map((r) => r.id);
      } catch (e) {
        // Transient poll failure (network blip / rate limit): keep trying.
        console.warn('Omni poll retry:', e instanceof Error ? e.message : e);
      }
    }
  }, [patchVariant]);

  /** Submit count variants for one model; returns the created asset ids. */
  const submitModelBatch = useCallback(
    async (modelSel: OmniModelSelection, prompt: string): Promise<string[]> => {
      const created: string[] = [];
      for (let i = 0; i < modelSel.variants; i++) {
        if (stopRef.current) break;
        try {
          const res = await callOmni<{ asset_id: string }>('variant-submit', {
            run_id: runId,
            model_id: modelSel.model_id,
            prompt,
          });
          created.push(res.asset_id);
          setVariants((prev) => [
            ...prev,
            { assetId: res.asset_id, modelId: modelSel.model_id, modelName: modelSel.name, status: 'generating' },
          ]);
        } catch (e) {
          toast.error(`${modelSel.name}: ${e instanceof Error ? e.message : 'submit failed'}`);
        }
      }
      return created;
    },
    [runId],
  );

  /** Run the full plan: one model at a time, polling between batches. */
  const runPlan = useCallback(
    async (selections: OmniModelSelection[], prompt: string) => {
      if (!runId || isRunning) return;
      stopRef.current = false;
      setIsRunning(true);
      try {
        for (const sel of selections) {
          if (stopRef.current) break;
          setActiveModel(sel.model_id);
          const ids = await submitModelBatch(sel, prompt);
          if (ids.length > 0) await pollUntilSettled(ids);
        }
      } finally {
        setActiveModel(null);
        setIsRunning(false);
      }
    },
    [runId, isRunning, submitModelBatch, pollUntilSettled],
  );

  /** Regenerate a variation of an existing image with its ORIGINAL model. */
  const regenerateVariation = useCallback(
    async (source: VariantView, changeNotes: string, basePrompt: string) => {
      if (!runId) return;
      const prompt = `${basePrompt}\n\nREQUESTED CHANGES: ${changeNotes.trim()}\nGenerate a NEW variation that keeps the core concept but applies the requested changes.`;
      try {
        const res = await callOmni<{ asset_id: string }>('variant-submit', {
          run_id: runId,
          model_id: source.modelId,
          prompt,
          parent_asset_id: source.assetId,
        });
        setVariants((prev) => [
          ...prev,
          { assetId: res.asset_id, modelId: source.modelId, modelName: source.modelName, status: 'generating', isRegeneration: true },
        ]);
        void pollUntilSettled([res.asset_id]);
      } catch (e) {
        toast.error(`Regeneration failed: ${e instanceof Error ? e.message : 'unknown error'}`);
      }
    },
    [runId, pollUntilSettled],
  );

  /** Restore tiles for a resumed run (assets already in the DB). */
  const restoreVariants = useCallback((restored: VariantView[]) => {
    setVariants(restored);
    const pending = restored.filter((v) => v.status === 'generating').map((v) => v.assetId);
    if (pending.length > 0) void pollUntilSettled(pending);
  }, [pollUntilSettled]);

  return { variants, activeModel, isRunning, runPlan, regenerateVariation, restoreVariants, patchVariant };
}
