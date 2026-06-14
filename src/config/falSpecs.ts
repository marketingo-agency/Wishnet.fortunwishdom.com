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
  'fal-ai/flux-pro/v1.1-ultra': aspectRes(STD_ASPECTS, undefined, { aspectRatio: '1:1' }),
  'fal-ai/imagen4/preview': aspectRes(IMAGEN_ASPECTS, RES_1K_2K, { aspectRatio: '1:1', resolution: '1K' }),

  // ── image-to-image / edit ───────────────────────────────────────────────────
  'fal-ai/nano-banana-pro/edit': aspectRes(STD_ASPECTS, RES_1K_4K, { aspectRatio: '1:1', resolution: '1K' }),
  'fal-ai/nano-banana-2/edit': aspectRes(STD_ASPECTS, RES_NB2, { aspectRatio: '1:1', resolution: '1K' }),
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
