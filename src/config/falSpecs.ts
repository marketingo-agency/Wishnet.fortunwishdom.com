/**
 * fal.ai image-spec schemas — per-model size / aspect / quality controls.
 *
 * fal models use three different sizing conventions (verified via fal-ai MCP
 * get_model_schema 2026-06-14):
 *   - image_size      : a named preset string OR a { width, height } object
 *                       (FLUX family, Recraft, Ideogram, Seedream edit, Qwen edit, FLUX.2 Pro edit)
 *   - aspect_resolution: aspect_ratio string + resolution (1K/2K/4K)
 *                       (Nano Banana Pro/2 edit, Imagen 4, FLUX.1.1 Ultra [aspect only])
 *   - pixel_enum      : image_size as a fixed pixel-string enum + quality + input_fidelity
 *                       (GPT-Image 1.5)
 *
 * This drives the Step 4 (Image specs) UI. The matching edge translator lives in
 * supabase/functions/omni/fal-specs.ts — keep the two consistent.
 */

import type { OmniVariantSpec } from '@/hooks/omni';

export type FalSizeConvention = 'image_size' | 'aspect_resolution' | 'pixel_enum';

export interface FalOption {
  value: string;
  label: string;
}

export interface FalQualityKnob {
  label: string;
  options: FalOption[];
}

export interface FalSpecSchema {
  convention: FalSizeConvention;
  imageSizePresets?: FalOption[];
  allowCustom?: boolean;
  aspectRatios?: FalOption[];
  resolutions?: FalOption[];
  pixelSizes?: FalOption[];
  quality?: FalQualityKnob;
  inputFidelity?: FalQualityKnob;
  defaults: OmniVariantSpec;
}

const STD_PRESETS: FalOption[] = [
  { value: 'square_hd', label: 'Square HD · 1:1' },
  { value: 'square', label: 'Square · 1:1' },
  { value: 'landscape_4_3', label: 'Landscape · 4:3' },
  { value: 'landscape_16_9', label: 'Landscape · 16:9' },
  { value: 'portrait_4_3', label: 'Portrait · 3:4' },
  { value: 'portrait_16_9', label: 'Portrait · 9:16' },
];

const STD_ASPECTS: FalOption[] = [
  { value: '1:1', label: '1:1 · Square' },
  { value: '4:5', label: '4:5 · Portrait' },
  { value: '9:16', label: '9:16 · Story' },
  { value: '16:9', label: '16:9 · Landscape' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '2:3', label: '2:3' },
  { value: '3:2', label: '3:2' },
];

const IMAGEN_ASPECTS: FalOption[] = [
  { value: '1:1', label: '1:1 · Square' },
  { value: '16:9', label: '16:9 · Landscape' },
  { value: '9:16', label: '9:16 · Story' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
];

// The Black Forest Labs FLUX family (Kontext + v1.1 Ultra) accepts this ratio set
// (no 4:5 / 5:4, no resolution param). These UI options stay a subset of each
// model's MODEL_ASPECT_ENUMS, so nothing here is silently snapped server-side.
const FLUX_ASPECTS: FalOption[] = [
  { value: '1:1', label: '1:1 · Square' },
  { value: '16:9', label: '16:9 · Landscape' },
  { value: '9:16', label: '9:16 · Story' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
  { value: '21:9', label: '21:9 · Cinematic' },
];

const RES_1K_4K: FalOption[] = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

const RES_NB2: FalOption[] = [{ value: '0.5K', label: '0.5K' }, ...RES_1K_4K];

const RES_1K_2K: FalOption[] = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
];

const GPT_PIXELS: FalOption[] = [
  { value: 'auto', label: 'Auto' },
  { value: '1024x1024', label: '1024 × 1024 · 1:1' },
  { value: '1536x1024', label: '1536 × 1024 · 3:2' },
  { value: '1024x1536', label: '1024 × 1536 · 2:3' },
];

const QUALITY_LMH: FalQualityKnob = {
  label: 'Quality',
  options: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ],
};

const imageSize = (defaultPreset: string, extra?: Partial<FalSpecSchema>): FalSpecSchema => ({
  convention: 'image_size',
  imageSizePresets: STD_PRESETS,
  allowCustom: true,
  defaults: { imageSize: defaultPreset },
  ...extra,
});

const aspectRes = (
  aspectRatios: FalOption[],
  resolutions: FalOption[] | undefined,
  defaults: OmniVariantSpec,
): FalSpecSchema => ({ convention: 'aspect_resolution', aspectRatios, resolutions, defaults });

export const FAL_SPEC_SCHEMAS: Record<string, FalSpecSchema> = {
  // ── text-to-image ─────────────────────────────────────────────────────────
  'fal-ai/flux/dev': imageSize('square_hd'),
  'fal-ai/flux/schnell': imageSize('square_hd'),
  'fal-ai/flux-pro/v1.1': imageSize('square_hd'),
  'fal-ai/flux-2-max': imageSize('square_hd'),
  'fal-ai/recraft/v4/text-to-image': imageSize('square_hd'),
  'fal-ai/ideogram/v3': imageSize('square_hd', {
    quality: {
      label: 'Rendering',
      options: [
        { value: 'TURBO', label: 'Turbo (fast)' },
        { value: 'BALANCED', label: 'Balanced' },
        { value: 'QUALITY', label: 'Quality' },
      ],
    },
    defaults: { imageSize: 'square_hd', quality: 'BALANCED' },
  }),
  'fal-ai/flux-pro/v1.1-ultra': aspectRes(FLUX_ASPECTS, undefined, { aspectRatio: '1:1' }),
  'fal-ai/imagen4/preview': aspectRes(IMAGEN_ASPECTS, RES_1K_2K, { aspectRatio: '1:1', resolution: '1K' }),

  // ── image-to-image / edit ───────────────────────────────────────────────────
  'fal-ai/nano-banana-pro/edit': aspectRes(STD_ASPECTS, RES_1K_4K, { aspectRatio: '1:1', resolution: '1K' }),
  'fal-ai/nano-banana-2/edit': aspectRes(STD_ASPECTS, RES_NB2, { aspectRatio: '1:1', resolution: '1K' }),
  'fal-ai/flux-pro/kontext/max/multi': aspectRes(FLUX_ASPECTS, undefined, { aspectRatio: '1:1' }),
  'fal-ai/flux-pro/kontext/multi': aspectRes(FLUX_ASPECTS, undefined, { aspectRatio: '1:1' }),
  'fal-ai/gemini-25-flash-image/edit': aspectRes(STD_ASPECTS, undefined, { aspectRatio: '1:1' }),
  'fal-ai/bytedance/seedream/v4/edit': imageSize('square_hd', {
    quality: {
      label: 'Prompt enhance',
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'fast', label: 'Fast' },
      ],
    },
    defaults: { imageSize: 'square_hd', quality: 'standard' },
  }),
  'fal-ai/qwen-image-edit-plus': imageSize('square_hd'),
  'fal-ai/flux-2-pro/edit': imageSize('square_hd'),
  'fal-ai/gpt-image-1.5/edit': {
    convention: 'pixel_enum',
    pixelSizes: GPT_PIXELS,
    quality: QUALITY_LMH,
    inputFidelity: {
      label: 'Input fidelity',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'high', label: 'High' },
      ],
    },
    defaults: { imageSize: 'auto', quality: 'high', inputFidelity: 'high' },
  },
};

/** Fallback for arbitrary live-catalog models: preset image_size + custom dims. */
export const DEFAULT_SPEC_SCHEMA: FalSpecSchema = imageSize('square_hd');

export function getFalSpecSchema(modelId: string): FalSpecSchema {
  return FAL_SPEC_SCHEMAS[modelId] ?? DEFAULT_SPEC_SCHEMA;
}

export function defaultSpecForModel(modelId: string): OmniVariantSpec {
  return { ...getFalSpecSchema(modelId).defaults };
}

// ── pixel estimation (for the Phase 6 cost card, megapixel-priced models) ─────

const PRESET_DIMS: Record<string, [number, number]> = {
  square_hd: [1024, 1024],
  square: [512, 512],
  landscape_4_3: [1024, 768],
  landscape_16_9: [1024, 576],
  portrait_4_3: [768, 1024],
  portrait_16_9: [576, 1024],
};

const RES_LONG_EDGE: Record<string, number> = { '0.5K': 512, '1K': 1024, '2K': 2048, '4K': 4096 };

/** Best-effort output pixel dimensions for a spec, used to estimate megapixels. */
export function specToPixels(modelId: string, spec: OmniVariantSpec | undefined): { width: number; height: number } {
  const schema = getFalSpecSchema(modelId);
  const s = spec ?? schema.defaults;

  if (schema.convention === 'aspect_resolution') {
    const long = RES_LONG_EDGE[s.resolution ?? '1K'] ?? 1024;
    const [rw, rh] = parseRatio(s.aspectRatio ?? '1:1');
    return rw >= rh
      ? { width: long, height: Math.round((long * rh) / rw) }
      : { width: Math.round((long * rw) / rh), height: long };
  }
  if (schema.convention === 'pixel_enum') {
    if (s.imageSize && /^\d+x\d+$/.test(s.imageSize)) {
      const [w, h] = s.imageSize.split('x').map(Number);
      return { width: w, height: h };
    }
    return { width: 1024, height: 1024 };
  }
  // image_size convention
  if (s.imageSize === 'custom' && s.width && s.height) return { width: s.width, height: s.height };
  const dims = PRESET_DIMS[s.imageSize ?? 'square_hd'];
  return dims ? { width: dims[0], height: dims[1] } : { width: 1024, height: 1024 };
}

function parseRatio(ratio: string): [number, number] {
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(ratio);
  if (!m) return [1, 1];
  return [Number(m[1]) || 1, Number(m[2]) || 1];
}

// ── per-model aspect_ratio enums + snapping ───────────────────────────────────
// fal validates aspect_ratio against a FIXED per-model enum and rejects anything
// else (e.g. nano-banana-pro/edit rejects 2:1/3:1). Single source of truth;
// MIRRORED in supabase/functions/omni/fal-specs.ts — keep the two identical.
// Only 'aspect_resolution' models have an aspect_ratio param; each must appear here.
const ASPECT_RE = /^[1-9]\d?:[1-9]\d?$/;

export const MODEL_ASPECT_ENUMS: Record<string, string[]> = {
  'fal-ai/flux-pro/v1.1-ultra': ['21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:21'],
  'fal-ai/imagen4/preview': ['1:1', '16:9', '9:16', '4:3', '3:4'],
  'fal-ai/nano-banana-pro/edit': ['auto', '21:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16'],
  'fal-ai/nano-banana-2/edit': ['auto', '21:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16', '4:1', '1:4', '8:1', '1:8'],
  'fal-ai/flux-pro/kontext/max/multi': ['21:9', '16:9', '4:3', '3:2', '1:1', '3:4', '2:3', '9:16', '9:21'],
  'fal-ai/flux-pro/kontext/multi': ['21:9', '16:9', '4:3', '3:2', '1:1', '3:4', '2:3', '9:16', '9:21'],
  'fal-ai/gemini-25-flash-image/edit': ['auto', '21:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16'],
};

function ratioValue(r: string): number | null {
  const m = /^([1-9]\d?):([1-9]\d?)$/.exec(r);
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  return h > 0 ? w / h : null;
}

function nearestInEnum(enums: string[], target: number): string | null {
  let best: string | null = null;
  let bestDiff = Infinity;
  for (const cand of enums) {
    const v = ratioValue(cand);
    if (v == null) continue;
    const diff = Math.abs(v - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = cand;
    }
  }
  return best;
}

/**
 * Snap an aspect_ratio string to the model's accepted enum (mirror of the edge
 * helper). Returns null when the model has no aspect_ratio param so callers omit it.
 */
export function snapAspectRatio(modelId: string, ar: string | null | undefined): string | null {
  if (typeof ar !== 'string' || ar.length === 0 || ar.length > 12) return null;
  const enums = MODEL_ASPECT_ENUMS[modelId];
  if (enums) {
    if (enums.includes(ar)) return ar;
    const target = ratioValue(ar);
    if (target == null) return enums.includes('auto') ? 'auto' : null;
    return nearestInEnum(enums, target);
  }
  if (FAL_SPEC_SCHEMAS[modelId] && FAL_SPEC_SCHEMAS[modelId].convention !== 'aspect_resolution') return null;
  return ASPECT_RE.test(ar) ? ar : null;
}

/**
 * Nearest accepted aspect_ratio for a target pixel size — used by the repurpose
 * runner to pick a valid ratio for the redesign model from a network preset.
 * Returns null only when the model has no known enum (caller should fall back).
 */
export function nearestAspectRatio(modelId: string, width: number, height: number): string | null {
  const enums = MODEL_ASPECT_ENUMS[modelId];
  if (!enums || !(width > 0) || !(height > 0)) return null;
  return nearestInEnum(enums, width / height);
}
