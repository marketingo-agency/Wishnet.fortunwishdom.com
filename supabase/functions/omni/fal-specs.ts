/**
 * fal.ai per-model spec translation (edge side).
 *
 * Translates an OmniVariantSpec (from the client step-4 Image specs) into the
 * correct fal input params for each model's sizing convention. Mirrors the UI
 * config at src/config/falSpecs.ts - keep the two consistent.
 *
 * Conventions (verified via fal-ai MCP get_model_schema 2026-06-14):
 *  - image_size       : preset string OR { width, height }   (FLUX family, Recraft, Ideogram, Seedream/Qwen/FLUX.2 edit)
 *  - aspect_resolution: aspect_ratio + resolution (1K/2K/4K)  (Nano Banana Pro/2 edit, Imagen 4, FLUX1.1 Ultra [aspect only])
 *  - pixel_enum       : image_size pixel enum + quality + input_fidelity (GPT-Image 1.5)
 */

type Convention = 'image_size' | 'aspect_resolution' | 'pixel_enum';

interface EdgeSpecSchema {
  convention: Convention;
  /** image_size models that expose a quality knob (param name on the fal input). */
  qualityParam?: string;
  /** Whether the model accepts num_images (FLUX.2 max / pro-edit and Recraft do not). */
  supportsNumImages: boolean;
}

const SCHEMAS: Record<string, EdgeSpecSchema> = {
  'fal-ai/flux/dev': { convention: 'image_size', supportsNumImages: true },
  'fal-ai/flux/schnell': { convention: 'image_size', supportsNumImages: true },
  'fal-ai/flux-pro/v1.1': { convention: 'image_size', supportsNumImages: true },
  'fal-ai/flux-2-max': { convention: 'image_size', supportsNumImages: false },
  'fal-ai/recraft/v4/text-to-image': { convention: 'image_size', supportsNumImages: false },
  'fal-ai/ideogram/v3': { convention: 'image_size', qualityParam: 'rendering_speed', supportsNumImages: true },
  'fal-ai/flux-pro/v1.1-ultra': { convention: 'aspect_resolution', supportsNumImages: true },
  'fal-ai/imagen4/preview': { convention: 'aspect_resolution', supportsNumImages: true },
  'fal-ai/nano-banana-pro/edit': { convention: 'aspect_resolution', supportsNumImages: true },
  'fal-ai/nano-banana-2/edit': { convention: 'aspect_resolution', supportsNumImages: true },
  'fal-ai/flux-pro/kontext/max/multi': { convention: 'aspect_resolution', supportsNumImages: true },
  'fal-ai/flux-pro/kontext/multi': { convention: 'aspect_resolution', supportsNumImages: true },
  'fal-ai/gemini-25-flash-image/edit': { convention: 'aspect_resolution', supportsNumImages: true },
  'fal-ai/bytedance/seedream/v4/edit': { convention: 'image_size', qualityParam: 'enhance_prompt_mode', supportsNumImages: true },
  'fal-ai/qwen-image-edit-plus': { convention: 'image_size', supportsNumImages: true },
  'fal-ai/flux-2-pro/edit': { convention: 'image_size', supportsNumImages: false },
  'fal-ai/gpt-image-1.5/edit': { convention: 'pixel_enum', supportsNumImages: true },
};

const PRESETS = new Set(['square_hd', 'square', 'landscape_4_3', 'landscape_16_9', 'portrait_4_3', 'portrait_16_9']);
const RESOLUTIONS = new Set(['0.5K', '1K', '2K', '4K']);
const PIXEL_SIZES = new Set(['auto', '1024x1024', '1536x1024', '1024x1536']);
const ASPECT_RE = /^[1-9]\d?:[1-9]\d?$/;

// Per-model accepted aspect_ratio enums - the load-bearing fix for fal's
// "Input should be 'auto', '21:9', ..." rejections. fal validates aspect_ratio
// against a FIXED per-model enum, so a format-valid-but-out-of-enum value (e.g.
// 2:1 / 3:1 from a 1.91:1 target) is rejected. Every 'aspect_resolution' model in
// SCHEMAS must appear here. Single source of truth; mirrored in
// src/config/falSpecs.ts. (Enums from fal runtime validation + get_model_schema
// 2026-06-14; nano-banana-2 additionally accepts extreme ratios.)
const MODEL_ASPECT_ENUMS: Record<string, string[]> = {
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

/**
 * Snap an aspect_ratio to the model's accepted enum so fal never rejects it.
 *  - model with a known enum  -> the value if already accepted, else the NEAREST
 *    accepted ratio by numeric value ('auto' only when explicitly requested).
 *  - known model with NO aspect_ratio param -> null (caller omits aspect_ratio).
 *  - unknown live-catalog model -> the value unchanged if format-valid, else null
 *    (preserves legacy pass-through). Pure + never throws.
 */
export function snapAspectRatio(modelId: string, ar: unknown): string | null {
  if (typeof ar !== 'string' || ar.length === 0 || ar.length > 12) return null;
  const enums = MODEL_ASPECT_ENUMS[modelId];
  if (enums) {
    if (enums.includes(ar)) return ar;
    const target = ratioValue(ar);
    if (target == null) return enums.includes('auto') ? 'auto' : null;
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
  // No known enum: omit for known non-aspect models, else pass a format-valid value.
  if (SCHEMAS[modelId] && SCHEMAS[modelId].convention !== 'aspect_resolution') return null;
  return ASPECT_RE.test(ar) ? ar : null;
}

// Allowed values per quality knob - membership-validated so only known enum
// values reach fal (same discipline as PRESETS/RESOLUTIONS/PIXEL_SIZES).
const QUALITY_VALUES: Record<string, Set<string>> = {
  quality: new Set(['low', 'medium', 'high']),
  rendering_speed: new Set(['TURBO', 'BALANCED', 'QUALITY']),
  enhance_prompt_mode: new Set(['standard', 'fast']),
  input_fidelity: new Set(['low', 'high']),
};

export function modelSupportsNumImages(modelId: string): boolean {
  // Unknown live-catalog models default to NO num_images: fal accepts the
  // implicit single image for nearly all models, while a few (FLUX.2 max/edit,
  // Recraft) reject the param outright. Known models set it explicitly.
  return SCHEMAS[modelId]?.supportsNumImages ?? false;
}

function str(v: unknown, max: number): string | null {
  return typeof v === 'string' && v.length > 0 && v.length <= max ? v : null;
}

function dim(v: unknown): number | null {
  const n = typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? Math.min(4096, Math.max(64, Math.round(n))) : null;
}

/** Mutates `input` with the model-correct size/quality params for the given spec. */
export function applySpecToInput(
  modelId: string,
  spec: Record<string, unknown> | null,
  input: Record<string, unknown>,
): void {
  if (!spec) return;
  const schema = SCHEMAS[modelId];
  const conv = schema?.convention;

  if (conv === 'aspect_resolution') {
    // Snap to the model's accepted enum (never pass an out-of-enum ratio to fal).
    const snapped = snapAspectRatio(modelId, spec.aspectRatio);
    if (snapped) input.aspect_ratio = snapped;
    const res = str(spec.resolution, 6);
    if (res && RESOLUTIONS.has(res)) input.resolution = res;
    return;
  }

  if (conv === 'pixel_enum') {
    const size = str(spec.imageSize, 16);
    if (size && PIXEL_SIZES.has(size)) input.image_size = size;
    const q = str(spec.quality, 12);
    if (q && QUALITY_VALUES.quality.has(q)) input.quality = q;
    const fid = str(spec.inputFidelity, 12);
    if (fid && QUALITY_VALUES.input_fidelity.has(fid)) input.input_fidelity = fid;
    return;
  }

  // image_size convention. Custom dimensions are honored for any model (explicit
  // user intent); a named preset is only sent to known image_size models so an
  // arbitrary live-catalog model is never handed an unsupported preset.
  const size = str(spec.imageSize, 24);
  if (size === 'custom') {
    const w = dim(spec.width);
    const h = dim(spec.height);
    if (w && h) input.image_size = { width: w, height: h };
  } else if (conv === 'image_size' && size && PRESETS.has(size)) {
    input.image_size = size;
  }
  if (conv === 'image_size' && schema?.qualityParam) {
    const q = str(spec.quality, 32);
    const allowed = QUALITY_VALUES[schema.qualityParam];
    if (q && (!allowed || allowed.has(q))) input[schema.qualityParam] = q;
  }
}
