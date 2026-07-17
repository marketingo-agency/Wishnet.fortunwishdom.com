"use client";

/**
 * Live generation runner for the Studio Generate stage (and Transform's
 * generation step). Submits one fal queue job per variant, ONE MODEL AT A
 * TIME, and polls all in-flight variants with a single batched call every 3
 * seconds so images appear progressively as each variant completes.
 *
 * Phase-6 hardening:
 *  - stop(): user-facing Stop that halts submits/polling (jobs already
 *    submitted keep running server-side and are recovered on resume).
 *  - retryVariant(): a failed tile resubmits with its original model/spec
 *    (GEN-01 — failures are no longer dead ends).
 *  - 3-strike poll failure cap → connectionLost banner state (GEN-02),
 *    mirroring the repurpose runner's discipline.
 *  - progress {done,total} counters for the "k of N" readout (GEN-02).
 *  - promptProvenance is forwarded to variant-submit so the edge knows
 *    whether to inject the Heart digest (Phase 5 contract).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { callOmni } from '@/lib/omniApi';
import type { OmniModelSelection, OmniVariantSpec, VariantPollResult } from './types';

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
  /** The spec this variant was submitted with (drives Retry, GEN-01). */
  spec?: OmniVariantSpec;
}

const POLL_INTERVAL_MS = 3000;
const MAX_CONSECUTIVE_POLL_FAILURES = 3;

export interface RunnerContext {
  prompt: string;
  sourceAssetId?: string;
  referenceImageIds?: string[];
  promptProvenance?: string;
}

export function useGenerationRunner(runId: string | null) {
  const [variants, setVariants] = useState<VariantView[]>([]);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
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
    let consecutiveFailures = 0;
    while (pending.length > 0 && !stopRef.current) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      if (stopRef.current) return;
      try {
        const res = await callOmni<{ results: VariantPollResult[] }>('variants-poll', { asset_ids: pending });
        consecutiveFailures = 0;
        setConnectionLost(false);
        for (const r of res.results) {
          if (r.status === 'done') {
            patchVariant(r.id, { status: 'done', url: r.url, width: r.width, height: r.height });
          } else if (r.status === 'failed') {
            patchVariant(r.id, { status: 'failed', error: r.error });
          }
        }
        pending = res.results.filter((r) => r.status === 'generating').map((r) => r.id);
      } catch (e) {
        // Transient poll failure (network blip / rate limit): retry with a
        // strike cap so a dead connection surfaces instead of spinning forever.
        consecutiveFailures += 1;
        console.warn('Omni poll retry:', e instanceof Error ? e.message : e);
        if (consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          setConnectionLost(true);
          return;
        }
      }
    }
  }, [patchVariant]);

  /** Submit count variants for one model; returns the created asset ids. */
  const submitModelBatch = useCallback(
    async (modelSel: OmniModelSelection, ctx: RunnerContext, variantSpecs?: OmniVariantSpec[]): Promise<string[]> => {
      const created: string[] = [];
      for (let i = 0; i < modelSel.variants; i++) {
        if (stopRef.current) break;
        const spec = variantSpecs?.[i] ?? variantSpecs?.[0];
        try {
          const res = await callOmni<{ asset_id: string }>('variant-submit', {
            run_id: runId,
            model_id: modelSel.model_id,
            prompt: ctx.prompt,
            source_asset_id: ctx.sourceAssetId,
            reference_image_ids: ctx.referenceImageIds,
            spec,
            prompt_provenance: ctx.promptProvenance,
          });
          created.push(res.asset_id);
          setVariants((prev) => [
            ...prev,
            { assetId: res.asset_id, modelId: modelSel.model_id, modelName: modelSel.name, status: 'generating', spec },
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
    async (selections: OmniModelSelection[], prompt: string, sourceAssetId?: string, referenceImageIds?: string[], modelSpecs?: Record<string, OmniVariantSpec[]>, promptProvenance?: string) => {
      if (!runId || isRunning) return;
      stopRef.current = false;
      setConnectionLost(false);
      setIsRunning(true);
      const ctx: RunnerContext = { prompt, sourceAssetId, referenceImageIds, promptProvenance };
      try {
        for (const sel of selections) {
          if (stopRef.current) break;
          setActiveModel(sel.model_id);
          const ids = await submitModelBatch(sel, ctx, modelSpecs?.[sel.model_id]);
          if (ids.length > 0) await pollUntilSettled(ids);
        }
      } finally {
        setActiveModel(null);
        setIsRunning(false);
      }
    },
    [runId, isRunning, submitModelBatch, pollUntilSettled],
  );

  /**
   * Stop submitting/polling. Jobs already submitted keep running (and bill)
   * server-side — resume recovers them from their asset rows.
   */
  const stop = useCallback(() => {
    stopRef.current = true;
    setIsRunning(false);
    setActiveModel(null);
  }, []);

  /** Resume polling after a connection-lost strike-out. */
  const resumePolling = useCallback((assetIds: string[]) => {
    stopRef.current = false;
    setConnectionLost(false);
    if (assetIds.length > 0) void pollUntilSettled(assetIds);
  }, [pollUntilSettled]);

  /** GEN-01: resubmit a FAILED variant with its original model + spec. */
  const retryVariant = useCallback(
    async (failed: VariantView, ctx: RunnerContext) => {
      if (!runId) return;
      try {
        const res = await callOmni<{ asset_id: string }>('variant-submit', {
          run_id: runId,
          model_id: failed.modelId,
          prompt: ctx.prompt,
          source_asset_id: ctx.sourceAssetId,
          reference_image_ids: ctx.referenceImageIds,
          spec: failed.spec,
          prompt_provenance: ctx.promptProvenance,
        });
        // The failed tile is replaced in place by its retry.
        setVariants((prev) => prev.map((v) => (
          v.assetId === failed.assetId
            ? { assetId: res.asset_id, modelId: failed.modelId, modelName: failed.modelName, status: 'generating' as const, spec: failed.spec }
            : v
        )));
        void pollUntilSettled([res.asset_id]);
      } catch (e) {
        toast.error(`Retry failed: ${e instanceof Error ? e.message : 'unknown error'}`);
      }
    },
    [runId, pollUntilSettled],
  );

  /** Regenerate a variation of an existing image with its ORIGINAL model. */
  const regenerateVariation = useCallback(
    async (source: VariantView, changeNotes: string, basePrompt: string, sourceAssetId?: string, referenceImageIds?: string[], spec?: OmniVariantSpec, promptProvenance?: string) => {
      if (!runId) return;
      const prompt = `${basePrompt}\n\nREQUESTED CHANGES: ${changeNotes.trim()}\nGenerate a NEW variation that keeps the core concept but applies the requested changes.`;
      try {
        const res = await callOmni<{ asset_id: string }>('variant-submit', {
          run_id: runId,
          model_id: source.modelId,
          prompt,
          parent_asset_id: source.assetId,
          source_asset_id: sourceAssetId,
          reference_image_ids: referenceImageIds,
          spec,
          prompt_provenance: promptProvenance,
        });
        setVariants((prev) => [
          ...prev,
          { assetId: res.asset_id, modelId: source.modelId, modelName: source.modelName, status: 'generating', isRegeneration: true, spec },
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

  return {
    variants, activeModel, isRunning, connectionLost,
    runPlan, stop, resumePolling, retryVariant, regenerateVariation, restoreVariants, patchVariant,
  };
}
