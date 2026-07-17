/**
 * Pure helpers for the per-model generation-quality controls (kept separate
 * from SpecControls.tsx so that file stays components-only for fast refresh).
 */

import { defaultSpecForModel } from '@/config/falSpecs';
import type { OmniModelSelection, OmniVariantSpec } from '@/hooks/omni';

export const clampDim = (v: string) => Math.min(4096, Math.max(64, Math.round(Number(v) || 1024)));

/** Build a per-model spec array of exactly `variants` length, reusing prior specs. */
export function reconcileSpecs(
  selections: OmniModelSelection[],
  initial: Record<string, OmniVariantSpec[]>,
): Record<string, OmniVariantSpec[]> {
  const out: Record<string, OmniVariantSpec[]> = {};
  for (const sel of selections) {
    const existing = initial[sel.model_id] ?? [];
    out[sel.model_id] = Array.from({ length: sel.variants }, (_, i) =>
      existing[i] ? { ...existing[i] } : defaultSpecForModel(sel.model_id),
    );
  }
  return out;
}

export const specsAllEqual = (arr: OmniVariantSpec[]) =>
  arr.length <= 1 || arr.every((s) => JSON.stringify(s) === JSON.stringify(arr[0]));
