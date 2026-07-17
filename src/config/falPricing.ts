/**
 * fal.ai per-model image pricing — verified via fal-ai MCP get_pricing 2026-06-14.
 *
 * Units differ per model: some bill per image, some per (mega)pixel. Megapixel
 * models depend on the chosen output size, so cost is estimated from the step-4
 * spec via specToPixels. GPT-Image bills opaquely ("units"), so it is shown as
 * "varies" and excluded from the precise total.
 */

import { specToPixels } from './falSpecs';
import type { OmniModelSelection, OmniVariantSpec } from '@/hooks/omni';

export type FalPriceUnit = 'image' | 'megapixel' | 'second' | 'generation' | 'unknown';

export interface FalPrice {
  unitPrice: number | null;
  unit: FalPriceUnit;
  /** Unit-priced models (Seedance/Hailuo-class "units") whose real $ is not
   *  derivable from the API — the UI renders "≈, verify" until a live
   *  dashboard calibration replaces the estimate (Plan 2 D-V9). */
  calibrate?: boolean;
}

export const FAL_PRICING: Record<string, FalPrice> = {
  // text-to-image
  'fal-ai/flux-pro/v1.1-ultra': { unitPrice: 0.06, unit: 'image' },
  'fal-ai/flux-pro/v1.1': { unitPrice: 0.04, unit: 'megapixel' },
  'fal-ai/flux/dev': { unitPrice: 0.025, unit: 'megapixel' },
  'fal-ai/flux/schnell': { unitPrice: 0.003, unit: 'megapixel' },
  'fal-ai/flux-2-max': { unitPrice: 0.07, unit: 'megapixel' },
  'fal-ai/ideogram/v3': { unitPrice: 0.03, unit: 'image' },
  'fal-ai/recraft/v4/text-to-image': { unitPrice: 0.04, unit: 'image' },
  'fal-ai/imagen4/preview': { unitPrice: 0.04, unit: 'image' },
  // image-to-image / edit
  'fal-ai/nano-banana-pro/edit': { unitPrice: 0.15, unit: 'image' },
  'fal-ai/nano-banana-2/edit': { unitPrice: 0.08, unit: 'image' },
  'fal-ai/flux-pro/kontext/max/multi': { unitPrice: 0.08, unit: 'image' },
  'fal-ai/flux-pro/kontext/multi': { unitPrice: 0.04, unit: 'image' },
  'fal-ai/bytedance/seedream/v4/edit': { unitPrice: 0.03, unit: 'image' },
  'fal-ai/qwen-image-edit-plus': { unitPrice: 0.03, unit: 'megapixel' },
  'fal-ai/flux-2-pro/edit': { unitPrice: 0.03, unit: 'megapixel' },
  'fal-ai/gpt-image-1.5/edit': { unitPrice: null, unit: 'unknown' },
  'fal-ai/gemini-25-flash-image/edit': { unitPrice: 0.0398, unit: 'image' },
  // repurposing tier 2 (AI extend — schemas verified live 2026-07-16, Plan 1 D-TIER)
  'fal-ai/flux-2-pro/outpaint': { unitPrice: 0.03, unit: 'megapixel' },
  'fal-ai/bria/expand': { unitPrice: 0.04, unit: 'image' },
  'fal-ai/ideogram/v3/reframe': { unitPrice: 0.03, unit: 'image' },
  // ── Videos track (Plan 2 §1.1/1.2, live-priced 2026-07-16) ──────────────────
  // generation
  'fal-ai/kling-video/v3/pro/text-to-video': { unitPrice: 0.14, unit: 'second' },
  'fal-ai/kling-video/v3/pro/image-to-video': { unitPrice: 0.14, unit: 'second' },
  'fal-ai/veo3.1': { unitPrice: 0.4, unit: 'second' },
  'fal-ai/veo3.1/fast': { unitPrice: 0.15, unit: 'second' },
  'fal-ai/veo3.1/first-last-frame-to-video': { unitPrice: 0.4, unit: 'second' },
  'bytedance/seedance-2.0/text-to-video': { unitPrice: 0.014, unit: 'unknown', calibrate: true },
  'bytedance/seedance-2.0/image-to-video': { unitPrice: 0.014, unit: 'unknown', calibrate: true },
  'fal-ai/ltx-2.3/text-to-video': { unitPrice: 0.08, unit: 'second' },
  'fal-ai/ltx-2.3/text-to-video/fast': { unitPrice: 0.06, unit: 'second' },
  'fal-ai/longcat-video/text-to-video/720p': { unitPrice: 0.04, unit: 'second' },
  // 2026-07-17 rehab additions (live-priced via fal get_pricing that day)
  'fal-ai/pixverse/v6/text-to-video': { unitPrice: 0.005, unit: 'second' },
  'fal-ai/wan/v2.7/text-to-video': { unitPrice: 0.1, unit: 'second' },
  'fal-ai/kling-video/v2.6/pro/text-to-video': { unitPrice: 0.07, unit: 'second' },
  'fal-ai/veo3.1/image-to-video': { unitPrice: 0.4, unit: 'second' },
  'fal-ai/ltx-2.3/image-to-video': { unitPrice: 0.08, unit: 'second' },
  'bytedance/seedance-2.0/reference-to-video': { unitPrice: 0.014, unit: 'unknown', calibrate: true },
  'fal-ai/kling-video/ai-avatar/v2/pro': { unitPrice: 0.115, unit: 'second' },
  'fal-ai/kling-video/ai-avatar/v2/standard': { unitPrice: 0.0562, unit: 'second' },
  // post / assembly
  'fal-ai/ltx-2.3/reframe': { unitPrice: 0.1, unit: 'second' },
  'fal-ai/topaz/upscale/video': { unitPrice: 0.01, unit: 'second' },
  'fal-ai/film/video': { unitPrice: 0.0013, unit: 'second' },
  'fal-ai/ffmpeg-api/compose': { unitPrice: 0.0002, unit: 'second' },
  'fal-ai/ffmpeg-api/merge-videos': { unitPrice: 0.0002, unit: 'second' },
  'fal-ai/ffmpeg-api/merge-audio-video': { unitPrice: 0.0002, unit: 'second' },
  'fal-ai/mmaudio-v2': { unitPrice: 0.001, unit: 'second' },
  // lipsync
  'fal-ai/latentsync': { unitPrice: 0.005, unit: 'second' },
  'fal-ai/sync-lipsync/v3': { unitPrice: 8 / 60, unit: 'second' },
  // audio beds ($0.10 per ~30s generation); lyria3 is the cheaper successor
  'fal-ai/lyria2': { unitPrice: 0.1, unit: 'generation' },
  'fal-ai/lyria3': { unitPrice: 0.04, unit: 'generation' },
  // ~30s beds; stable-audio does up to 380s (price unverified - calibrate).
  'fal-ai/stable-audio': { unitPrice: null, unit: 'generation', calibrate: true },
};

/** Estimated cost of a per-second-priced fal job (Plan 2 D-V9). Returns null
 *  for opaque/calibratable pricing so the UI shows "≈, verify" instead of a
 *  fabricated number. */
export function estimateSecondsCost(modelId: string, seconds: number): number | null {
  const price = getFalPrice(modelId);
  if (price.unitPrice == null || price.calibrate) return null;
  if (price.unit === 'second') return price.unitPrice * Math.max(0, seconds);
  if (price.unit === 'generation') return price.unitPrice;
  return null;
}

export function getFalPrice(modelId: string): FalPrice {
  return FAL_PRICING[modelId] ?? { unitPrice: null, unit: 'unknown' };
}

export interface ModelCostLine {
  modelId: string;
  name: string;
  variants: number;
  unitLabel: string;
  /** Estimated total cost for this model's variants, or null if pricing is opaque. */
  estimated: number | null;
}

export interface PlanCost {
  lines: ModelCostLine[];
  total: number;
  hasUnknown: boolean;
}

export function estimateModelCost(sel: OmniModelSelection, specs?: OmniVariantSpec[]): ModelCostLine {
  const price = getFalPrice(sel.model_id);
  if (price.unitPrice == null) {
    return { modelId: sel.model_id, name: sel.name, variants: sel.variants, unitLabel: 'varies', estimated: null };
  }
  if (price.unit === 'image') {
    return {
      modelId: sel.model_id,
      name: sel.name,
      variants: sel.variants,
      unitLabel: `$${price.unitPrice.toFixed(price.unitPrice < 0.01 ? 3 : 2)}/image`,
      estimated: price.unitPrice * sel.variants,
    };
  }
  // megapixel: sum per-variant using the chosen output size
  let total = 0;
  for (let i = 0; i < sel.variants; i++) {
    const { width, height } = specToPixels(sel.model_id, specs?.[i]);
    total += price.unitPrice * ((width * height) / 1_000_000);
  }
  return {
    modelId: sel.model_id,
    name: sel.name,
    variants: sel.variants,
    unitLabel: `$${price.unitPrice.toFixed(price.unitPrice < 0.01 ? 3 : 2)}/MP`,
    estimated: total,
  };
}

export function estimatePlanCost(
  selections: OmniModelSelection[],
  modelSpecs?: Record<string, OmniVariantSpec[]>,
): PlanCost {
  const lines = selections.map((s) => estimateModelCost(s, modelSpecs?.[s.model_id]));
  const total = lines.reduce((sum, l) => sum + (l.estimated ?? 0), 0);
  const hasUnknown = lines.some((l) => l.estimated == null);
  return { lines, total, hasUnknown };
}

export interface AssetCostInput {
  model_id: string | null;
  width: number | null;
  height: number | null;
  status: string;
}

/**
 * Estimated fal spend for a run's PRODUCED assets (History cost chip).
 * Only fal-generated rows count: model_id null = uploaded/referenced bytes
 * (free). 'done' and 'discarded' were both paid outputs; 'failed' submissions
 * are excluded (fal does not bill a failed job). Megapixel models use the
 * stored intrinsic dimensions; a priced model with unknown dims (or an
 * opaque-priced model) flags hasUnknown instead of guessing.
 */
export function estimateAssetsCost(assets: AssetCostInput[]): { total: number; hasUnknown: boolean } {
  let total = 0;
  let hasUnknown = false;
  for (const a of assets) {
    if (!a.model_id) continue;
    if (a.status !== 'done' && a.status !== 'discarded') continue;
    const price = getFalPrice(a.model_id);
    if (price.unitPrice == null || price.calibrate) {
      hasUnknown = true;
      continue;
    }
    if (price.unit === 'image') {
      total += price.unitPrice;
      continue;
    }
    if (price.unit === 'megapixel') {
      if (a.width && a.height) {
        total += price.unitPrice * ((a.width * a.height) / 1_000_000);
      } else {
        hasUnknown = true;
      }
      continue;
    }
    // second / generation / unknown: duration-priced assets need their own
    // helper (estimateSecondsCost) — never guess from pixel dims.
    hasUnknown = true;
  }
  return { total, hasUnknown };
}

export function formatUsd(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}$${abs < 0.01 && abs > 0 ? abs.toFixed(3) : abs.toFixed(2)}`;
}

// -- ElevenLabs char-based estimate (Plan 3 D-A9) -----------------------------

/** Default $/1k chars; plan-dependent - configurable, shown as an estimate. */
// Verified 2026-07-17 via fal get_pricing: fal-ai/elevenlabs/tts/* bills
// $0.10 per 1000 characters (the app's TTS routes through fal by default).
export const ELEVENLABS_DEFAULT_RATE_PER_1K_CHARS = 0.10;

/** Honest TTS cost estimate for a script; null when chars is unknown. */
export function estimateTtsCost(
  chars: number,
  ratePer1k: number = ELEVENLABS_DEFAULT_RATE_PER_1K_CHARS,
): number | null {
  if (!Number.isFinite(chars) || chars <= 0) return null;
  return (chars / 1000) * ratePer1k;
}
