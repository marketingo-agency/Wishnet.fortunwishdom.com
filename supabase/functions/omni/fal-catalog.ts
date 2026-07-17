/**
 * fal.ai model catalog for Omni.
 *
 * Dynamic-first: the catalog is fetched live from fal's documented public
 * Model Search API (GET https://api.fal.ai/v1/models, list/find/search modes),
 * so new fal models become available with zero code changes.
 * A small curated STATIC_FALLBACK below is used only when the live API is
 * unreachable; it is one data module and trivial to update.
 *
 * Verified response shape (probed live 2026-06-12):
 * { models: [{ endpoint_id, metadata: { display_name, category, description,
 *   status, thumbnail_url, license_type, tags, ... } }], next_cursor, has_more }
 * Free-text search uses the `q` query param. Upscalers are categorized as
 * image-to-image, so the "upscale" capability maps to category + q=upscale.
 * Auth is optional; sending the key grants higher rate limits.
 */

const FAL_MODELS_API = 'https://api.fal.ai/v1/models';
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15_000;

export type FalCapability = 'text-to-image' | 'image-to-image' | 'upscale' | 'text-to-video' | 'image-to-video';

export interface FalModel {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnailUrl: string | null;
  licenseType: string | null;
  tags: string[];
}

export interface CatalogPage {
  models: FalModel[];
  nextCursor: string | null;
  hasMore: boolean;
  source: 'live' | 'fallback';
}

const CAPABILITY_QUERY: Record<FalCapability, { category: string; q?: string }> = {
  'text-to-image': { category: 'text-to-image' },
  'image-to-image': { category: 'image-to-image' },
  upscale: { category: 'image-to-image', q: 'upscale' },
  'text-to-video': { category: 'text-to-video' },
  'image-to-video': { category: 'image-to-video' },
};

export function isFalCapability(value: unknown): value is FalCapability {
  return value === 'text-to-image' || value === 'image-to-image' || value === 'upscale'
    || value === 'text-to-video' || value === 'image-to-video';
}

interface RawFalModel {
  endpoint_id?: string;
  metadata?: {
    display_name?: string;
    category?: string;
    description?: string;
    status?: string;
    thumbnail_url?: string;
    license_type?: string;
    tags?: string[];
  };
}

function normalizeModel(raw: RawFalModel): FalModel | null {
  if (!raw.endpoint_id) return null;
  const meta = raw.metadata ?? {};
  return {
    id: raw.endpoint_id,
    name: meta.display_name || raw.endpoint_id,
    category: meta.category || 'unknown',
    description: meta.description || '',
    thumbnailUrl: meta.thumbnail_url || null,
    licenseType: meta.license_type || null,
    tags: Array.isArray(meta.tags) ? meta.tags : [],
  };
}

// Per-instance cache; resets on cold start, which is fine for a catalog.
const cache = new Map<string, { at: number; page: CatalogPage }>();

interface CatalogQuery {
  capability?: FalCapability;
  q?: string;
  cursor?: string;
  limit?: number;
  falKey?: string | null;
}

export async function fetchFalCatalog(opts: CatalogQuery): Promise<CatalogPage> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const mapped = opts.capability ? CAPABILITY_QUERY[opts.capability] : undefined;
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (mapped?.category) params.set('category', mapped.category);
  const q = opts.q?.trim() || mapped?.q;
  if (q) params.set('q', q.slice(0, 100));
  if (opts.cursor) params.set('cursor', opts.cursor.slice(0, 100));

  const cacheKey = params.toString();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.page;

  try {
    const res = await fetch(`${FAL_MODELS_API}?${cacheKey}`, {
      headers: opts.falKey ? { Authorization: `Key ${opts.falKey}` } : {},
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`fal models API responded ${res.status}`);
    const data = await res.json();

    const models = (Array.isArray(data.models) ? data.models : [])
      .map((m: RawFalModel) => normalizeModel(m))
      .filter((m: FalModel | null): m is FalModel => m !== null);

    const page: CatalogPage = {
      models,
      nextCursor: typeof data.next_cursor === 'string' ? data.next_cursor : null,
      hasMore: Boolean(data.has_more),
      source: 'live',
    };
    cache.set(cacheKey, { at: Date.now(), page });
    return page;
  } catch (e) {
    console.error('Omni: fal catalog live fetch failed, using fallback:', e instanceof Error ? e.message : e);
    return fallbackCatalog(opts.capability, q);
  }
}

/** Find one model by exact endpoint id (used to validate fal-submit targets). */
export async function findFalModel(modelId: string, falKey?: string | null): Promise<FalModel | null> {
  const cacheKey = `find:${modelId}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.page.models[0] ?? null;

  try {
    const res = await fetch(`${FAL_MODELS_API}?endpoint_id=${encodeURIComponent(modelId)}`, {
      headers: falKey ? { Authorization: `Key ${falKey}` } : {},
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`fal models API responded ${res.status}`);
    const data = await res.json();
    const model = (Array.isArray(data.models) ? data.models : [])
      .map((m: RawFalModel) => normalizeModel(m))
      .find((m: FalModel | null) => m?.id === modelId) ?? null;

    cache.set(cacheKey, { at: Date.now(), page: { models: model ? [model] : [], nextCursor: null, hasMore: false, source: 'live' } });
    return model;
  } catch (e) {
    console.error('Omni: fal model find failed, checking fallback:', e instanceof Error ? e.message : e);
    return STATIC_FALLBACK.find((m) => m.id === modelId) ?? null;
  }
}

function fallbackCatalog(capability?: FalCapability, q?: string): CatalogPage {
  const mapped = capability ? CAPABILITY_QUERY[capability] : undefined;
  const needle = q?.toLowerCase();
  const models = STATIC_FALLBACK.filter((m) => {
    if (mapped?.category && m.category !== mapped.category) return false;
    if (needle && !`${m.id} ${m.name}`.toLowerCase().includes(needle)) return false;
    return true;
  });
  return { models, nextCursor: null, hasMore: false, source: 'fallback' };
}

/**
 * Curated outage fallback only. The live API is the source of truth;
 * keep this list short and update it freely.
 */
const STATIC_FALLBACK: FalModel[] = [
  { id: 'fal-ai/flux/schnell', name: 'FLUX.1 [schnell]', category: 'text-to-image', description: 'Fast 1-4 step text-to-image generation.', thumbnailUrl: null, licenseType: 'commercial', tags: [] },
  { id: 'fal-ai/flux/dev', name: 'FLUX.1 [dev]', category: 'text-to-image', description: 'High-quality text-to-image generation.', thumbnailUrl: null, licenseType: 'commercial', tags: [] },
  { id: 'fal-ai/flux-pro/v1.1-ultra', name: 'FLUX1.1 [pro] ultra', category: 'text-to-image', description: 'Top-tier FLUX text-to-image with up to 2K resolution.', thumbnailUrl: null, licenseType: 'commercial', tags: [] },
  { id: 'fal-ai/nano-banana-2', name: 'Nano Banana 2', category: 'text-to-image', description: 'Google state-of-the-art fast image generation and editing.', thumbnailUrl: null, licenseType: 'commercial', tags: [] },
  { id: 'fal-ai/ideogram/v3', name: 'Ideogram V3', category: 'text-to-image', description: 'Typography-strong text-to-image generation.', thumbnailUrl: null, licenseType: 'commercial', tags: [] },
  { id: 'fal-ai/recraft/v4/text-to-image', name: 'Recraft V4', category: 'text-to-image', description: 'Design-grade text-to-image generation.', thumbnailUrl: null, licenseType: 'commercial', tags: [] },
  { id: 'fal-ai/nano-banana-2/edit', name: 'Nano Banana 2 Edit', category: 'image-to-image', description: 'Image editing with Nano Banana 2.', thumbnailUrl: null, licenseType: 'commercial', tags: [] },
  { id: 'fal-ai/nano-banana-pro/edit', name: 'Nano Banana Pro Edit', category: 'image-to-image', description: 'Image editing with Nano Banana Pro.', thumbnailUrl: null, licenseType: 'commercial', tags: [] },
  { id: 'fal-ai/topaz/upscale/image', name: 'Topaz Image Upscale', category: 'image-to-image', description: 'Professional-grade image upscaling.', thumbnailUrl: null, licenseType: 'commercial', tags: ['upscale'] },
  { id: 'fal-ai/seedvr/upscale/image', name: 'SeedVR Image Upscale', category: 'image-to-image', description: 'High-fidelity image upscaling.', thumbnailUrl: null, licenseType: 'commercial', tags: ['upscale'] },
  { id: 'fal-ai/recraft/upscale/crisp', name: 'Recraft Crisp Upscale', category: 'image-to-image', description: 'Crisp upscaling for design assets.', thumbnailUrl: null, licenseType: 'commercial', tags: ['upscale'] },
  { id: 'fal-ai/kling-video/v3/pro/text-to-video', name: 'Kling v3 Pro', category: 'text-to-video', description: 'Cinematic text-to-video with native audio, 3-15s, multi-shot.', thumbnailUrl: null, licenseType: 'commercial', tags: [] },
  { id: 'fal-ai/veo3.1', name: 'Veo 3.1', category: 'text-to-video', description: 'Google DeepMind flagship text-to-video with native audio.', thumbnailUrl: null, licenseType: 'commercial', tags: [] },
  { id: 'bytedance/seedance-2.0/text-to-video', name: 'Seedance 2.0', category: 'text-to-video', description: 'Cinematic text-to-video, 21:9-9:16, native audio at no extra cost.', thumbnailUrl: null, licenseType: 'commercial', tags: [] },
  { id: 'fal-ai/ltx-2.3/text-to-video/fast', name: 'LTX 2.3 Fast', category: 'text-to-video', description: 'Fast high-res text-to-video with native audio.', thumbnailUrl: null, licenseType: 'commercial', tags: [] },
  { id: 'fal-ai/pixverse/v6/text-to-video', name: 'PixVerse V6', category: 'text-to-video', description: 'Cheapest social-tier video generation (opt-in audio).', thumbnailUrl: null, licenseType: 'commercial', tags: [] },
  { id: 'bytedance/seedance-2.0/image-to-video', name: 'Seedance 2.0 i2v', category: 'image-to-video', description: 'Keyframe-anchored image-to-video with native audio.', thumbnailUrl: null, licenseType: 'commercial', tags: [] },
  { id: 'fal-ai/kling-video/v3/pro/image-to-video', name: 'Kling v3 Pro i2v', category: 'image-to-video', description: 'Start/end-frame image-to-video with native audio.', thumbnailUrl: null, licenseType: 'commercial', tags: [] },
];
