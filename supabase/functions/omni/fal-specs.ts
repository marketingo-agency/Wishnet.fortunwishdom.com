/**
 * fal.ai per-model spec translation (edge side).
 *
 * Translates an OmniVariantSpec (from the client step-4 Image specs) into the
 * correct fal input params for each model's sizing convention. Mirrors the UI
 * config at src/config/falSpecs.ts — keep the two consistent.
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
  'fal-ai/bytedance/seedream/v4/edit': { convention: 'image_size', qualityParam: 'enhance_prompt_mode', supportsNumImages: true },
  'fal-ai/qwen-image-edit-plus': { convention: 'image_size', supportsNumImages: true },
  'fal-ai/flux-2-pro/edit': { convention: 'image_size', supportsNumImages: false },
  'fal-ai/gpt-image-1.5/edit': { convention: 'pixel_enum', supportsNumImages: true },
};

const PRESETS = new Set(['square_hd', 'square', 'landscape_4_3', 'landscape_16_9', 'portrait_4_3', 'portrait_16_9']);
const RESOLUTIONS = new Set(['0.5K', '1K', '2K', '4K']);
const PIXEL_SIZES = new Set(['auto', '1024x1024', '1536x1024', '1024x1536']);
const ASPECT_RE = /^[1-9]\d?:[1-9]\d?$/;

// Allowed values per quality knob — membership-validated so only known enum
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
    const ar = str(spec.aspectRatio, 12);
    if (ar && ASPECT_RE.test(ar)) input.aspect_ratio = ar;
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
