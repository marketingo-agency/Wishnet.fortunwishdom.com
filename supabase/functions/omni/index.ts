/**
 * Omni edge function: backend for the Omni Multimodal Creation AI.
 *
 * Phase 0 skeleton: auth + rate limit + action dispatch with settings actions.
 * Later phases add: fal catalog + runner, wizard run engine, vision analysis,
 * social descriptions, repurposing, surprise-me, brainstorming.
 *
 * Security baseline (per OMNI_SPEC.md):
 * - Bearer auth + getUser validation on every request
 * - Per-user rate limit (client polling needs headroom)
 * - Service-role client for DB work, scoped manually by user_id
 * - sanitizeForPrompt on all retrieved content before prompt interpolation
 * - Signed URLs only for private-bucket outputs, never getPublicUrl
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { sanitizeForPrompt } from '../_shared/sanitize.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rate-limit.ts';
import { fetchFalCatalog, findFalModel, isFalCapability } from './fal-catalog.ts';
import { applySpecToInput, modelSupportsNumImages, snapAspectRatio } from './fal-specs.ts';
import { FalUserError, falResult, falStatus, falSubmit } from './fal-runner.ts';
import { persistFalImage, registerInFilesManager, signStoragePath } from './storage.ts';
import { analyzeImage } from './analysis.ts';
import { mineSurpriseIdeas } from './surprise.ts';
import { chatBrainstorm, lockIdea, type BrainstormAttachment, type BrainstormMessageInput } from './brainstorm.ts';
import { buildHeartDigest, fetchHeartRules, retrieveKnowledge } from './context.ts';
import { generateCaptions } from './captions.ts';

// 60/min: the generation workspace polls in-flight variants every ~3s.
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });

let corsHeaders: Record<string, string> = getCorsHeaders(null);

// -- Settings -----

interface OmniSettingsInput {
  analysis_provider?: string;
  analysis_model?: string | null;
  default_variants?: number;
  defaults?: Record<string, unknown>;
}

const ANALYSIS_PROVIDERS = new Set(['openai', 'gemini']);

/**
 * Whitelist + validate the incoming settings payload. Unlike the legacy
 * spread-anything pattern, unknown fields are dropped and values are checked.
 */
function sanitizeSettingsInput(raw: unknown): OmniSettingsInput {
  const input = (raw ?? {}) as Record<string, unknown>;
  const out: OmniSettingsInput = {};

  if (typeof input.analysis_provider === 'string' && ANALYSIS_PROVIDERS.has(input.analysis_provider)) {
    out.analysis_provider = input.analysis_provider;
  }
  if (input.analysis_model === null) {
    out.analysis_model = null;
  } else if (typeof input.analysis_model === 'string' && input.analysis_model.length <= 200) {
    out.analysis_model = input.analysis_model;
  }
  if (typeof input.default_variants === 'number' && Number.isInteger(input.default_variants)
    && input.default_variants >= 1 && input.default_variants <= 10) {
    out.default_variants = input.default_variants;
  }
  if (input.defaults && typeof input.defaults === 'object' && !Array.isArray(input.defaults)) {
    out.defaults = input.defaults as Record<string, unknown>;
  }

  return out;
}

// Heart rules + knowledge grounding live in the context engine (context.ts):
// fetchHeartRules keeps its throw-on-error semantics - a Heart fetch failure
// blocks generation, it never silently degrades.

// -- Helpers -----

function jsonResponse(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

/** Resolve the fal.ai key: DB column first, env secret fallback (Batch Task 6 pattern). */
async function getFalKey(supabaseAdmin: ReturnType<typeof createClient>): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('llm_settings')
    .select('fal_api_key')
    .single();
  if (error) console.error('Omni: llm_settings read error:', error.message);
  const key = (data?.fal_api_key as string | null) || Deno.env.get('FAL_KEY') || '';
  return key.trim().length > 0 ? key.trim() : null;
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Restrict the deep fallback to keys that unambiguously mean "remaining balance"
// (not consumed/cost/owed numerics) and clamp to a sane USD range, so an unknown
// payload can never surface a misleading credits figure. The explicit candidate
// paths above cover every known fal shape; this only fires on truly-novel ones.
const BALANCE_KEY_RE = /^(current_balance|balance|credit_balance|available_credits)$/i;
function deepFindBalance(obj: Record<string, unknown>, depth: number): number | null {
  if (depth > 3) return null;
  for (const [k, v] of Object.entries(obj)) {
    if (BALANCE_KEY_RE.test(k)) {
      const n = toNum(v);
      if (n != null && n >= 0 && n <= 1e7) return n;
    }
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const n = deepFindBalance(v as Record<string, unknown>, depth + 1);
      if (n != null) return n;
    }
  }
  return null;
}

/**
 * Parse fal's GET /account/billing?expand=credits payload into a USD balance.
 * fal does not contractually fix the JSON shape, so probe the common paths
 * (credits as a number | { balance|amount|available|remaining|total|credits },
 * or a top-level balance/credit_balance), then fall back to a shallow key-name
 * search. Pure, never throws. Currency read from the payload when present.
 */
function extractCreditBalance(data: unknown): { balance: number | null; currency: string } {
  if (!data || typeof data !== 'object') return { balance: null, currency: 'USD' };
  const root = data as Record<string, unknown>;
  const credits = root.credits;
  const co = credits && typeof credits === 'object' ? (credits as Record<string, unknown>) : null;
  const currencyOf = (o: Record<string, unknown> | null): string | null => {
    const c = o?.currency;
    return typeof c === 'string' && c.length === 3 ? c.toUpperCase() : null;
  };
  const currency = currencyOf(co) ?? currencyOf(root) ?? 'USD';
  const candidates: unknown[] = [
    credits,
    // fal's documented shape is { credits: { current_balance, currency } } - most
    // specific path FIRST so it matches deterministically (not via the fallback).
    co?.current_balance, co?.balance, co?.amount, co?.available, co?.remaining, co?.total, co?.credits,
    root.current_balance, root.balance, root.credit_balance, root.available_credits, root.amount,
  ];
  for (const c of candidates) {
    const n = toNum(c);
    if (n != null) return { balance: n, currency };
  }
  return { balance: deepFindBalance(root, 0), currency };
}

const FAL_NOT_CONFIGURED = 'fal.ai is not configured. Add a fal.ai API key in Settings > LLM Providers.';
const TEST_MODEL_ID = 'fal-ai/flux/schnell';
// Tier-2 AI extend (Plan 1 D-TIER): schema verified live 2026-07-16 - singular
// image_url + expand_{top,bottom,left,right} px, NO prompt, interior pixels
// untouched, ~$0.03/processed MP. bria/expand + ideogram/v3/reframe remain
// documented alternatives pending the delivery A/B.
const EXTEND_MODEL_ID = 'fal-ai/flux-2-pro/outpaint';
const NETWORKS = new Set(['facebook', 'instagram', 'x', 'tiktok', 'youtube', 'pinterest']);

// Per-edit-model reference-image caps (mirrors src/config/llmModels FAL_EDIT_MODELS).
// reference_image_ids are clamped to the chosen model's max before resolution.
const EDIT_MODEL_MAX_REFS: Record<string, number> = {
  'fal-ai/nano-banana-pro/edit': 8,
  'fal-ai/nano-banana-2/edit': 8,
  'fal-ai/flux-pro/kontext/max/multi': 4,
  'fal-ai/flux-pro/kontext/multi': 4,
  'fal-ai/gemini-25-flash-image/edit': 8,
  'fal-ai/bytedance/seedream/v4/edit': 10,
  'fal-ai/qwen-image-edit-plus': 6,
  'fal-ai/flux-2-pro/edit': 8,
  'fal-ai/gpt-image-1.5/edit': 8,
};
const DEFAULT_EDIT_MODEL_MAX_REFS = 6;

interface WishpediaReference {
  url: string;
  entryName: string;
  angle: string | null;
}

/**
 * Resolve Wishpedia entry-image IDs to public URLs + canon entry names.
 *
 * Security: the client passes only IDs (never raw URLs), so a caller cannot
 * point fal at an arbitrary host. Only IDs that exist in wishpedia_entry_images
 * resolve; everything else is silently dropped. The wishpedia-media bucket is
 * public, so getPublicUrl needs no signing. Names are fetched in a second query
 * (no FK-embedding dependency) and sanitized before they reach a prompt.
 */
async function resolveWishpediaReferences(
  supabaseAdmin: ReturnType<typeof createClient>,
  ids: string[],
): Promise<WishpediaReference[]> {
  if (ids.length === 0) return [];
  const { data: imgs, error } = await supabaseAdmin
    .from('wishpedia_entry_images')
    .select('storage_path, angle, entry_id')
    .in('id', ids);
  if (error || !imgs) {
    console.error('Omni: wishpedia reference resolve error:', error?.message);
    return [];
  }

  const rows = imgs as { storage_path: string | null; angle: string | null; entry_id: string | null }[];
  const entryIds = [...new Set(rows.map((r) => r.entry_id).filter((x): x is string => !!x))];
  const nameById = new Map<string, string>();
  if (entryIds.length > 0) {
    const { data: entries } = await supabaseAdmin
      .from('wishpedia_entries')
      .select('id, name')
      .in('id', entryIds);
    for (const e of (entries as { id: string; name: string | null }[] | null) ?? []) {
      nameById.set(e.id, e.name ?? '');
    }
  }

  return rows
    .filter((r) => !!r.storage_path)
    .map((r) => {
      const { data: pub } = supabaseAdmin.storage.from('wishpedia-media').getPublicUrl(r.storage_path as string);
      return {
        url: pub.publicUrl,
        entryName: sanitizeForPrompt(nameById.get(r.entry_id ?? '') ?? ''),
        angle: r.angle ?? null,
      };
    })
    .filter((r) => !!r.url);
}

/**
 * Download a fal CDN image and return it as a data URI.
 * Used by the health check only: the app CSP allowlists data: but not
 * fal.media, and user-facing renders go through Supabase storage signed URLs.
 */
async function falImageToDataUri(url: string, contentType: string | null): Promise<string | null> {
  try {
    const host = new URL(url).hostname;
    if (host !== 'fal.media' && !host.endsWith('.fal.media')) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 10 * 1024 * 1024) return null;
    const bytes = new Uint8Array(buf);
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const mime = contentType || res.headers.get('content-type') || 'image/jpeg';
    return `data:${mime};base64,${btoa(binary)}`;
  } catch (e) {
    console.error('Omni: test image data-uri conversion failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

// -- Server -----

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const userId = user.id;

    if (rateLimiter.check(userId)) {
      return jsonResponse(
        { error: 'Rate limit exceeded. Please wait a moment and try again.' },
        429,
        { 'Retry-After': '60' },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = typeof body?.action === 'string' ? body.action : '';

    // -- get-settings -----
    if (action === 'get-settings') {
      const { data: settings, error } = await supabaseAdmin
        .from('omni_settings')
        .select('analysis_provider, analysis_model, default_variants, defaults')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Omni: get-settings error:', error.message);
        return jsonResponse({ error: 'Failed to load settings' }, 500);
      }
      return jsonResponse({ settings: settings ?? null });
    }

    // -- save-settings -----
    if (action === 'save-settings') {
      const clean = sanitizeSettingsInput(body.settings);

      const { data: existing, error: selectError } = await supabaseAdmin
        .from('omni_settings')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (selectError) {
        console.error('Omni: save-settings select error:', selectError.message);
        return jsonResponse({ error: 'Failed to save settings' }, 500);
      }

      const writeError = existing
        ? (await supabaseAdmin
            .from('omni_settings')
            .update({ ...clean, updated_at: new Date().toISOString() })
            .eq('id', existing.id)).error
        : (await supabaseAdmin
            .from('omni_settings')
            .insert({ ...clean, user_id: userId })).error;

      if (writeError) {
        console.error('Omni: save-settings write error:', writeError.message);
        return jsonResponse({ error: 'Failed to save settings' }, 500);
      }
      return jsonResponse({ success: true });
    }

    // -- list-fal-models -----
    if (action === 'list-fal-models') {
      const capability = isFalCapability(body.capability) ? body.capability : undefined;
      const q = typeof body.q === 'string' ? body.q : undefined;
      const cursor = typeof body.cursor === 'string' ? body.cursor : undefined;
      const limit = typeof body.limit === 'number' ? body.limit : undefined;

      const falKey = await getFalKey(supabaseAdmin);
      const page = await fetchFalCatalog({ capability, q, cursor, limit, falKey });
      return jsonResponse({ ...page, falConfigured: falKey !== null });
    }

    // -- fal-submit (admin-only raw passthrough; KB-GAP-5) -----
    // No shipped client surface calls this action (grep-verified 2026-07-16):
    // every user funnel goes through variant-submit, which creates asset rows
    // and grounds prompts. Raw submits stay available to admins for debugging
    // only, with the same prompt cap the governed path enforces.
    if (action === 'fal-submit') {
      const { data: isSubmitAdmin, error: submitAdminErr } = await supabaseAdmin.rpc('is_admin', { _user_id: userId });
      if (submitAdminErr || !isSubmitAdmin) {
        return jsonResponse({ error: 'Admin access required' }, 403);
      }

      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);

      const modelId = body.model_id;
      const input = body.input;
      if (typeof modelId !== 'string' || !input || typeof input !== 'object' || Array.isArray(input)) {
        return jsonResponse({ error: 'model_id (string) and input (object) are required' }, 400);
      }
      const rawPrompt = (input as Record<string, unknown>).prompt;
      if (typeof rawPrompt === 'string' && rawPrompt.length > 8000) {
        return jsonResponse({ error: 'Prompt is too long (8000 char cap)' }, 400);
      }

      const model = await findFalModel(modelId, falKey);
      if (!model) {
        return jsonResponse({ error: `Model "${modelId}" is not in the fal catalog.` }, 400);
      }

      const submission = await falSubmit(falKey, modelId, input as Record<string, unknown>);
      return jsonResponse({ request_id: submission.requestId, queue_position: submission.queuePosition });
    }

    // -- fal-status -----
    if (action === 'fal-status') {
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);

      const modelId = body.model_id;
      const requestId = body.request_id;
      if (typeof modelId !== 'string' || typeof requestId !== 'string') {
        return jsonResponse({ error: 'model_id and request_id are required' }, 400);
      }

      const status = await falStatus(falKey, modelId, requestId);
      if (status.status !== 'COMPLETED') {
        return jsonResponse({ status: status.status, queue_position: status.queuePosition });
      }

      try {
        const result = await falResult(falKey, modelId, requestId);
        return jsonResponse({ status: 'COMPLETED', result: { images: result.images, seed: result.seed } });
      } catch (e) {
        if (e instanceof FalUserError) {
          return jsonResponse({ status: 'ERROR', error: e.message });
        }
        throw e;
      }
    }

    // -- fal-test-generate (admin-only health check) -----
    if (action === 'fal-test-generate') {
      const { data: isAdmin, error: adminErr } = await supabaseAdmin.rpc('is_admin', { _user_id: userId });
      if (adminErr || !isAdmin) {
        return jsonResponse({ error: 'Admin access required' }, 403);
      }

      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);

      const startedAt = Date.now();
      const submission = await falSubmit(falKey, TEST_MODEL_ID, {
        prompt: 'A serene mountain landscape at golden hour, crisp light, premium digital art',
        image_size: 'square',
        num_images: 1,
      });

      // flux/schnell completes in seconds; poll server-side up to 60s.
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const status = await falStatus(falKey, TEST_MODEL_ID, submission.requestId);
        if (status.status === 'COMPLETED') {
          const result = await falResult(falKey, TEST_MODEL_ID, submission.requestId);
          const images = await Promise.all(result.images.map(async (img) => ({
            ...img,
            url: (await falImageToDataUri(img.url, img.contentType)) ?? img.url,
          })));
          return jsonResponse({
            success: true,
            model: TEST_MODEL_ID,
            images,
            elapsed_ms: Date.now() - startedAt,
          });
        }
      }
      return jsonResponse({ error: 'Test generation timed out after 60 seconds.' }, 504);
    }

    // -- variant-submit (one fal job per variant; supports regenerate lineage) -
    // -- fal account credit balance (Recap cost card, admin-only) -----
    if (action === 'fal-credits') {
      // Org financial data: admin-gated. Non-admins get the estimate-only view
      // (the client degrades gracefully to "Unavailable").
      const { data: isCreditsAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: userId });
      if (!isCreditsAdmin) return jsonResponse({ balance: null, currency: 'USD', configured: false, reason: 'not_admin' });
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ balance: null, currency: 'USD', configured: false, reason: 'no_key' });
      try {
        const res = await fetch('https://api.fal.ai/v1/account/billing?expand=credits', {
          headers: { Authorization: `Key ${falKey}` },
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) {
          // A 401/403 here almost always means the stored fal key lacks Admin
          // (billing) scope - the inference key that works for generation is not
          // guaranteed to cover /account/billing. The reason is admin-only + carries
          // no secret, so the UI can surface a precise hint.
          console.warn(`Omni fal-credits: billing returned HTTP ${res.status}`);
          return jsonResponse({ balance: null, currency: 'USD', configured: true, reason: `http_${res.status}` });
        }
        const data = (await res.json().catch(() => null)) as unknown;
        const { balance, currency } = extractCreditBalance(data);
        if (balance == null && data && typeof data === 'object') {
          // Allowlist-filtered keys only (never values): admin-only, lets us see an
          // unexpected fal shape from the client network response without dashboard logs.
          const safeKeys = Object.keys(data as Record<string, unknown>).filter((k) => /^[a-z_][a-z0-9_]{0,32}$/i.test(k));
          console.warn('Omni fal-credits: unparsed billing payload; keys =', safeKeys.join(','));
          return jsonResponse({ balance: null, currency, configured: true, reason: 'unparsed', keys: safeKeys });
        }
        return jsonResponse({ balance, currency, configured: true });
      } catch (e) {
        console.warn('Omni fal-credits: billing fetch failed:', e instanceof Error ? e.message : 'unknown');
        return jsonResponse({ balance: null, currency: 'USD', configured: true, reason: 'fetch_error' });
      }
    }

    if (action === 'variant-submit') {
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);

      const runId = body.run_id;
      const modelId = body.model_id;
      const parentAssetId = typeof body.parent_asset_id === 'string' ? body.parent_asset_id : null;
      const sourceAssetId = typeof body.source_asset_id === 'string' ? body.source_asset_id : null;
      // Wishpedia character references for canon-accurate recreation: IDs only,
      // resolved to public URLs server-side. Capped to the generous edit-model
      // default (the UI mixes images across entries up to this many; per-model
      // clamping is enforced client-side at model selection).
      const referenceImageIds = Array.isArray(body.reference_image_ids)
        ? (body.reference_image_ids as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 10)
        : [];
      const promptStr = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      if (typeof runId !== 'string' || typeof modelId !== 'string') {
        return jsonResponse({ error: 'run_id and model_id are required' }, 400);
      }
      // Upscalers run without a prompt; everything else needs one.
      if (!sourceAssetId && promptStr.length === 0) {
        return jsonResponse({ error: 'prompt is required' }, 400);
      }
      if (promptStr.length > 8000) return jsonResponse({ error: 'Prompt is too long (8000 char cap)' }, 400);

      const { data: run } = await supabaseAdmin
        .from('omni_runs')
        .select('id')
        .eq('id', runId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!run) return jsonResponse({ error: 'Run not found' }, 404);

      const model = await findFalModel(modelId, falKey);
      if (!model) return jsonResponse({ error: `Model "${modelId}" is not in the fal catalog.` }, 400);

      // Per-variant technical spec (size/ratio/quality) from the wizard's step 4.
      const spec = body.spec && typeof body.spec === 'object' && !Array.isArray(body.spec)
        ? (body.spec as Record<string, unknown>)
        : null;

      const input: Record<string, unknown> = {};
      // Some models (FLUX.2 max / pro-edit, Recraft) reject num_images entirely.
      if (modelSupportsNumImages(modelId)) input.num_images = 1;
      if (promptStr) input.prompt = promptStr;

      // Build the image-to-image input from two server-resolved sources, so the
      // client never supplies a raw URL:
      //  - sourceAssetId: the caller's own prior Omni asset (Transform/Upscale).
      //  - reference_image_ids: Wishpedia canon art (character recreation).
      // Input key per model family: upscalers take image_url (singular); the
      // edit families take image_urls (array). aspect_ratio steers extended
      // canvases (exact pixels are cropped client-side afterwards).
      const isUpscaler = /(\/|-)upscal/i.test(modelId);
      const imageUrls: string[] = [];

      if (sourceAssetId) {
        const { data: sourceAsset } = await supabaseAdmin
          .from('omni_assets')
          .select('storage_path')
          .eq('id', sourceAssetId)
          .eq('user_id', userId)
          .maybeSingle();
        const sourcePath = (sourceAsset as { storage_path: string | null } | null)?.storage_path;
        if (!sourcePath) return jsonResponse({ error: 'Source asset not found or not persisted yet' }, 400);
        const sourceUrl = await signStoragePath(supabaseAdmin, sourcePath, userId, 60 * 60);
        if (!sourceUrl) return jsonResponse({ error: 'Could not sign the source image' }, 500);
        imageUrls.push(sourceUrl);
      }

      let referenceNames: string[] = [];
      if (referenceImageIds.length > 0) {
        // Model-aware clamp: the edit models differ on how many input images they
        // accept (e.g. Seedream 10, Qwen 6). Use only as many as this model handles.
        const maxRefs = EDIT_MODEL_MAX_REFS[modelId] ?? DEFAULT_EDIT_MODEL_MAX_REFS;
        const refs = await resolveWishpediaReferences(supabaseAdmin, referenceImageIds.slice(0, maxRefs));
        for (const r of refs) imageUrls.push(r.url);
        referenceNames = [...new Set(refs.map((r) => r.entryName).filter((n) => n.length > 0))];
      }

      if (imageUrls.length > 0) {
        if (isUpscaler) {
          input.image_url = imageUrls[0];
          delete input.num_images;
        } else {
          input.image_urls = imageUrls;
        }
      }
      // The generation flow sends a per-variant spec -> model-correct size/quality
      // params. The repurpose flow sends no spec and steers with a legacy
      // aspect_ratio (only meaningful when there is a source/reference image).
      if (spec) {
        applySpecToInput(modelId, spec, input);
      } else if (imageUrls.length > 0) {
        // Repurpose/redesign path: snap the requested ratio to the model's enum
        // so fal never rejects it (and omit it for models with no aspect param).
        const aspectRatio = snapAspectRatio(modelId, body.aspect_ratio);
        if (aspectRatio) input.aspect_ratio = aspectRatio;
      }

      // Anchor the edit model on the canon subject(s) so it recreates the actual
      // Wishpedia character from the references, not a generic look-alike.
      if (referenceNames.length > 0 && typeof input.prompt === 'string') {
        // Collapse line breaks and hard-cap each name: the names are admin-set
        // Wishpedia titles interpolated into the fal IMAGE prompt, where
        // sanitizeForPrompt (built for system prompts) does not strip newlines
        // or bound length. Prevents a long/multi-line title from steering or
        // overflowing the prompt. (security-auditor MEDIUM-1 / LOW-2)
        const subjects = referenceNames.map((n) => n.replace(/[\r\n\t]+/g, ' ').slice(0, 80)).join(', ');
        input.prompt = `Using the provided reference image(s) of the Fortun Wishnet canon subject(s): ${subjects}. Recreate ${referenceNames.length > 1 ? 'them' : 'it'} faithfully, preserving the exact appearance, colors, shapes, and proportions shown in the references. ${input.prompt}`;
      }

      // KB-GAP-1/2: ground EVERY paid image in the Heart rules - server-side,
      // so no client detour can skip brand compliance. OPT-IN via
      // prompt_provenance: the old prod client never sends the field, so its
      // behavior is byte-identical; prompts already engineered by Promptor
      // (provenance 'promptor') are Heart-grounded upstream and are not
      // double-injected. A Heart fetch failure blocks the paid submit.
      const promptProvenance = typeof body.prompt_provenance === 'string' ? body.prompt_provenance : null;
      if (promptProvenance && promptProvenance !== 'promptor' && typeof input.prompt === 'string') {
        let digestRules;
        try {
          digestRules = await fetchHeartRules(supabaseAdmin);
        } catch (e) {
          return jsonResponse({ error: e instanceof Error ? e.message : 'Heart rules unavailable' }, 503);
        }
        const digest = buildHeartDigest(digestRules);
        if (digest) {
          const combined = `${digest}\n${input.prompt}`;
          // Respect the 8000-char prompt cap: the digest gives way, never the
          // user's prompt. Skip injection when there is no meaningful room.
          if (combined.length <= 8000) {
            input.prompt = combined;
          } else {
            const room = 8000 - (input.prompt as string).length - 1;
            if (room > 40) input.prompt = `${digest.slice(0, room)}\n${input.prompt}`;
          }
        }
      }

      const { data: asset, error: assetError } = await supabaseAdmin
        .from('omni_assets')
        .insert({
          user_id: userId,
          run_id: runId,
          parent_asset_id: parentAssetId,
          kind: 'image',
          model_id: modelId,
          prompt: promptStr || null,
          status: 'generating',
          metadata: { source_asset_id: sourceAssetId, reference_image_ids: referenceImageIds },
        })
        .select('id')
        .single();
      if (assetError || !asset) {
        console.error('Omni: asset insert error:', assetError?.message);
        return jsonResponse({ error: 'Failed to create the variant record' }, 500);
      }
      const assetId = (asset as { id: string }).id;

      try {
        const submission = await falSubmit(falKey, modelId, input);
        await supabaseAdmin
          .from('omni_assets')
          .update({ metadata: { source_asset_id: sourceAssetId, reference_image_ids: referenceImageIds, fal_request_id: submission.requestId } })
          .eq('id', assetId);
        return jsonResponse({ asset_id: assetId, request_id: submission.requestId, queue_position: submission.queuePosition });
      } catch (e) {
        const message = e instanceof FalUserError ? e.message : 'Generation could not be submitted';
        await supabaseAdmin
          .from('omni_assets')
          .update({ status: 'failed', error: message })
          .eq('id', assetId);
        if (e instanceof FalUserError) return jsonResponse({ asset_id: assetId, error: message }, 400);
        throw e;
      }
    }

    // -- repurpose-submit (tier-2 AI extend: pixel-preserving outpaint) -----
    // Dedicated action (Plan 1 D-TIER): variant-submit's input inference must
    // not learn a third family - outpainters take singular image_url + pixel
    // expand geometry and no prompt. The expand math runs SERVER-side from the
    // source asset's STORED dimensions (client pixel math is never trusted).
    if (action === 'repurpose-submit') {
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);

      const runId = body.run_id;
      const sourceAssetId = body.source_asset_id;
      const targetW = typeof body.target_w === 'number' ? Math.round(body.target_w) : NaN;
      const targetH = typeof body.target_h === 'number' ? Math.round(body.target_h) : NaN;
      if (typeof runId !== 'string' || typeof sourceAssetId !== 'string') {
        return jsonResponse({ error: 'run_id and source_asset_id are required' }, 400);
      }
      if (!Number.isFinite(targetW) || !Number.isFinite(targetH)
        || targetW < 64 || targetW > 8192 || targetH < 64 || targetH > 8192) {
        return jsonResponse({ error: 'target_w and target_h must be between 64 and 8192' }, 400);
      }
      // Only the verified outpainter runs in v1; bria/expand and ideogram
      // reframe stay documented alternatives pending the live A/B.
      const modelId = EXTEND_MODEL_ID;

      const { data: run } = await supabaseAdmin
        .from('omni_runs')
        .select('id')
        .eq('id', runId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!run) return jsonResponse({ error: 'Run not found' }, 404);

      const { data: sourceAsset } = await supabaseAdmin
        .from('omni_assets')
        .select('id, storage_path, width, height')
        .eq('id', sourceAssetId)
        .eq('user_id', userId)
        .maybeSingle();
      const source = sourceAsset as { storage_path: string | null; width: number | null; height: number | null } | null;
      if (!source?.storage_path) return jsonResponse({ error: 'Source asset not found or not persisted yet' }, 400);
      const srcW = source.width ?? 0;
      const srcH = source.height ?? 0;
      if (srcW < 16 || srcH < 16) {
        return jsonResponse({ error: 'Source dimensions are unknown - reopen or re-add the source image first' }, 400);
      }

      // Expand to the TARGET ASPECT at the source's own scale; the client
      // downscales the result to exact pixels (interior pixels untouched).
      const srcAR = srcW / srcH;
      const tgtAR = targetW / targetH;
      let expandLeft = 0, expandRight = 0, expandTop = 0, expandBottom = 0;
      if (tgtAR > srcAR) {
        const totalW = Math.round(srcH * tgtAR);
        const dx = totalW - srcW;
        expandLeft = Math.floor(dx / 2);
        expandRight = dx - expandLeft;
      } else {
        const totalH = Math.round(srcW / tgtAR);
        const dy = totalH - srcH;
        expandTop = Math.floor(dy / 2);
        expandBottom = dy - expandTop;
      }
      if (expandLeft + expandRight + expandTop + expandBottom < 8) {
        return jsonResponse({ error: 'The aspect already matches - use the free Smart crop instead' }, 400);
      }
      // Bound the computed canvas (security-auditor L1): stored dims are
      // client-writable, so an extreme aspect must not turn into a
      // million-pixel outpaint bill. Mirrors the 8192 target clamp.
      const outW = srcW + expandLeft + expandRight;
      const outH = srcH + expandTop + expandBottom;
      if (outW > 8192 || outH > 8192 || outW * outH > 48_000_000) {
        return jsonResponse({ error: 'This source and target combination is too large to extend - use Smart crop or AI re-design instead' }, 400);
      }

      const sourceUrl = await signStoragePath(supabaseAdmin, source.storage_path, userId, 60 * 60);
      if (!sourceUrl) return jsonResponse({ error: 'Could not sign the source image' }, 500);

      const { data: asset, error: assetError } = await supabaseAdmin
        .from('omni_assets')
        .insert({
          user_id: userId,
          run_id: runId,
          parent_asset_id: sourceAssetId,
          kind: 'image',
          model_id: modelId,
          prompt: null,
          status: 'generating',
          metadata: { source_asset_id: sourceAssetId, repurpose_tier: 'extend', target_w: targetW, target_h: targetH },
        })
        .select('id')
        .single();
      if (assetError || !asset) {
        console.error('Omni: repurpose asset insert error:', assetError?.message);
        return jsonResponse({ error: 'Failed to create the output record' }, 500);
      }
      const assetId = (asset as { id: string }).id;

      try {
        const submission = await falSubmit(falKey, modelId, {
          image_url: sourceUrl,
          expand_left: expandLeft,
          expand_right: expandRight,
          expand_top: expandTop,
          expand_bottom: expandBottom,
        });
        await supabaseAdmin
          .from('omni_assets')
          .update({ metadata: { source_asset_id: sourceAssetId, repurpose_tier: 'extend', target_w: targetW, target_h: targetH, fal_request_id: submission.requestId } })
          .eq('id', assetId);
        return jsonResponse({ asset_id: assetId, request_id: submission.requestId, queue_position: submission.queuePosition });
      } catch (e) {
        const message = e instanceof FalUserError ? e.message : 'The extend job could not be submitted';
        await supabaseAdmin
          .from('omni_assets')
          .update({ status: 'failed', error: message })
          .eq('id', assetId);
        if (e instanceof FalUserError) return jsonResponse({ asset_id: assetId, error: message }, 400);
        throw e;
      }
    }

    // -- variants-poll (batched; persists completed images, idempotent) -----
    if (action === 'variants-poll') {
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);

      const assetIds = Array.isArray(body.asset_ids) ? body.asset_ids.filter((x: unknown) => typeof x === 'string').slice(0, 12) : [];
      if (assetIds.length === 0) return jsonResponse({ error: 'asset_ids is required' }, 400);

      const { data: assets } = await supabaseAdmin
        .from('omni_assets')
        .select('id, run_id, model_id, status, storage_path, error, metadata, width, height')
        .in('id', assetIds)
        .eq('user_id', userId);

      const results = await Promise.all(((assets as Record<string, unknown>[] | null) ?? []).map(async (a) => {
        const id = a.id as string;
        const status = a.status as string;
        const meta = (a.metadata ?? {}) as Record<string, unknown>;

        if (status === 'done' && a.storage_path) {
          const url = await signStoragePath(supabaseAdmin, a.storage_path as string, userId);
          return { id, status: 'done', url, width: a.width, height: a.height };
        }
        if (status === 'failed') return { id, status: 'failed', error: a.error ?? 'Generation failed' };
        if (status === 'discarded') return { id, status: 'discarded' };

        const requestId = meta.fal_request_id;
        const modelId = a.model_id as string | null;
        if (typeof requestId !== 'string' || !modelId) {
          return { id, status: 'failed', error: 'Missing generation reference' };
        }

        try {
          const jobStatus = await falStatus(falKey, modelId, requestId);
          if (jobStatus.status !== 'COMPLETED') {
            return { id, status: 'generating', queue_position: jobStatus.queuePosition };
          }
          const result = await falResult(falKey, modelId, requestId);
          const image = result.images[0];
          const persisted = await persistFalImage(supabaseAdmin, userId, a.run_id as string, id, image.url, image.contentType);
          await supabaseAdmin
            .from('omni_assets')
            .update({
              status: 'done',
              storage_path: persisted.storagePath,
              mime_type: persisted.mimeType,
              width: image.width,
              height: image.height,
              metadata: { ...meta, byte_size: persisted.byteSize, seed: result.seed },
            })
            .eq('id', id);
          const url = await signStoragePath(supabaseAdmin, persisted.storagePath, userId);
          return { id, status: 'done', url, width: image.width, height: image.height };
        } catch (e) {
          const message = e instanceof FalUserError ? e.message : 'Generation failed';
          console.error('Omni: variant poll error:', e instanceof Error ? e.message : e);
          await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', id);
          return { id, status: 'failed', error: message };
        }
      }));

      return jsonResponse({ results });
    }

    // -- asset-url (fresh signed URL for an owned, persisted asset) -----
    if (action === 'asset-url') {
      const assetId = body.asset_id;
      if (typeof assetId !== 'string') return jsonResponse({ error: 'asset_id is required' }, 400);
      const { data: asset } = await supabaseAdmin
        .from('omni_assets')
        .select('storage_path')
        .eq('id', assetId)
        .eq('user_id', userId)
        .maybeSingle();
      const path = (asset as { storage_path: string | null } | null)?.storage_path;
      if (!path) return jsonResponse({ error: 'Asset not found or not persisted' }, 404);
      const url = await signStoragePath(supabaseAdmin, path, userId);
      return jsonResponse({ url });
    }

    // -- save-asset-to-files (register in Files Manager / Omni AI sector) -----
    if (action === 'save-asset-to-files') {
      const assetId = body.asset_id;
      if (typeof assetId !== 'string') return jsonResponse({ error: 'asset_id is required' }, 400);

      const { data: asset } = await supabaseAdmin
        .from('omni_assets')
        .select('id, storage_path, mime_type, metadata')
        .eq('id', assetId)
        .eq('user_id', userId)
        .maybeSingle();
      const record = asset as { storage_path: string | null; mime_type: string | null; metadata: Record<string, unknown> } | null;
      if (!record?.storage_path) return jsonResponse({ error: 'Asset not found or not persisted yet' }, 404);

      const ext = record.storage_path.split('.').pop() ?? 'png';
      const ok = await registerInFilesManager(supabaseAdmin, userId, `omni-${assetId.slice(0, 8)}.${ext}`, {
        storagePath: record.storage_path,
        mimeType: record.mime_type ?? 'image/png',
        byteSize: typeof record.metadata?.byte_size === 'number' ? (record.metadata.byte_size as number) : 0,
      });
      if (!ok) return jsonResponse({ error: 'Could not register the file in the Files Manager' }, 500);
      return jsonResponse({ success: true });
    }

    // -- analyze-image (vision + RAG + universe-relation conclusion) -----
    if (action === 'analyze-image') {
      const assetId = body.asset_id;
      if (typeof assetId !== 'string') return jsonResponse({ error: 'asset_id is required' }, 400);

      const { data: asset } = await supabaseAdmin
        .from('omni_assets')
        .select('storage_path, mime_type')
        .eq('id', assetId)
        .eq('user_id', userId)
        .maybeSingle();
      const record = asset as { storage_path: string | null; mime_type: string | null } | null;
      if (!record?.storage_path) return jsonResponse({ error: 'Image not found or not persisted yet' }, 404);

      const { data: omniSettings } = await supabaseAdmin
        .from('omni_settings')
        .select('analysis_provider, analysis_model')
        .eq('user_id', userId)
        .maybeSingle();
      const { data: llm } = await supabaseAdmin
        .from('llm_settings')
        .select('openai_api_key, gemini_api_key, openai_text_model, gemini_text_model')
        .single();

      const openaiKey = ((llm?.openai_api_key as string | null) || Deno.env.get('OPENAI_API_KEY') || '').trim();
      const geminiKey = ((llm?.gemini_api_key as string | null) || Deno.env.get('GEMINI_API_KEY') || '').trim();
      // Embeddings for RAG always run on OpenAI (platform-wide constraint).
      if (!openaiKey) {
        return jsonResponse({ error: 'An OpenAI API key is required for analysis (vision and knowledge retrieval). Configure it in Settings > LLM Providers.' }, 503);
      }

      const settingsProvider = (omniSettings as { analysis_provider?: string } | null)?.analysis_provider;
      const provider = settingsProvider === 'gemini' && geminiKey ? 'gemini' : 'openai';
      const settingsModel = (omniSettings as { analysis_model?: string | null } | null)?.analysis_model;
      const model = settingsModel || (provider === 'gemini'
        ? ((llm?.gemini_text_model as string | null) || 'gemini-2.5-flash')
        : ((llm?.openai_text_model as string | null) || 'gpt-4o'));

      let heartRules;
      try {
        heartRules = await fetchHeartRules(supabaseAdmin);
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Heart rules unavailable' }, 503);
      }

      const signedUrl = await signStoragePath(supabaseAdmin, record.storage_path, userId, 60 * 60);
      if (!signedUrl) return jsonResponse({ error: 'Could not access the image' }, 500);

      let imageBase64: string | null = null;
      if (provider === 'gemini') {
        const imgRes = await fetch(signedUrl, { signal: AbortSignal.timeout(60_000) });
        if (!imgRes.ok) return jsonResponse({ error: 'Could not download the image for analysis' }, 500);
        const buf = await imgRes.arrayBuffer();
        if (buf.byteLength > 20 * 1024 * 1024) return jsonResponse({ error: 'Image exceeds the 20MB analysis cap' }, 400);
        const bytes = new Uint8Array(buf);
        let binary = '';
        const CHUNK = 0x8000;
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
        }
        imageBase64 = btoa(binary);
      }

      const result = await analyzeImage({
        supabaseAdmin,
        keys: { openaiKey, geminiKey },
        provider,
        model,
        heartRules,
        imageSignedUrl: signedUrl,
        imageBase64,
        imageMime: record.mime_type ?? 'image/png',
      });
      return jsonResponse(result);
    }

    // -- surprise-ideas (mine the knowledge base for creation ideas) -----
    if (action === 'surprise-ideas') {
      const { data: omniSettings } = await supabaseAdmin
        .from('omni_settings')
        .select('analysis_provider, analysis_model')
        .eq('user_id', userId)
        .maybeSingle();
      const { data: llm } = await supabaseAdmin
        .from('llm_settings')
        .select('openai_api_key, gemini_api_key, openai_text_model, gemini_text_model')
        .single();

      const openaiKey = ((llm?.openai_api_key as string | null) || Deno.env.get('OPENAI_API_KEY') || '').trim();
      const geminiKey = ((llm?.gemini_api_key as string | null) || Deno.env.get('GEMINI_API_KEY') || '').trim();
      // No embeddings here (sampling, not similarity search), so either provider works.
      if (!openaiKey && !geminiKey) {
        return jsonResponse({ error: 'An OpenAI or Gemini API key is required for idea generation. Configure one in Settings > LLM Providers.' }, 503);
      }

      const settingsProvider = (omniSettings as { analysis_provider?: string } | null)?.analysis_provider;
      const provider = settingsProvider === 'gemini' && geminiKey ? 'gemini' : openaiKey ? 'openai' : 'gemini';
      const settingsModel = (omniSettings as { analysis_model?: string | null } | null)?.analysis_model;
      const model = settingsModel || (provider === 'gemini'
        ? ((llm?.gemini_text_model as string | null) || 'gemini-2.5-flash')
        : ((llm?.openai_text_model as string | null) || 'gpt-4o'));

      let heartRules;
      try {
        heartRules = await fetchHeartRules(supabaseAdmin);
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Heart rules unavailable' }, 503);
      }

      try {
        const result = await mineSurpriseIdeas({
          supabaseAdmin,
          keys: { openaiKey, geminiKey },
          provider,
          model,
          heartRules,
        });
        return jsonResponse(result);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Idea generation failed';
        console.error('Omni: surprise-ideas error:', message);
        return jsonResponse({ error: message }, 502);
      }
    }

    // -- brainstorm-chat / brainstorm-lock (Mode 6: RAG-grounded creative chat) -
    if (action === 'brainstorm-chat' || action === 'brainstorm-lock') {
      const runId = body.run_id;
      if (typeof runId !== 'string') return jsonResponse({ error: 'run_id is required' }, 400);
      const { data: run } = await supabaseAdmin
        .from('omni_runs')
        .select('id')
        .eq('id', runId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!run) return jsonResponse({ error: 'Run not found' }, 404);

      const rawMessages = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
      const messages: BrainstormMessageInput[] = rawMessages
        .filter((m: Record<string, unknown>) =>
          (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string' && (m.content as string).length > 0)
        .map((m: Record<string, unknown>) => ({ role: m.role as 'user' | 'assistant', content: (m.content as string).slice(0, 8000) }));
      if (messages.length === 0) return jsonResponse({ error: 'At least one message is required' }, 400);

      const ATTACHMENT_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);
      const rawAttachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 3) : [];
      const attachments: BrainstormAttachment[] = rawAttachments
        .filter((a: Record<string, unknown>) =>
          typeof a?.mime === 'string' && ATTACHMENT_MIMES.has(a.mime as string)
          && typeof a?.data === 'string' && (a.data as string).length <= 4_400_000)
        .map((a: Record<string, unknown>) => ({ mime: a.mime as string, data: a.data as string }));

      const { data: llm } = await supabaseAdmin
        .from('llm_settings')
        .select('openai_api_key, gemini_api_key, openai_text_model, gemini_text_model, active_text_provider')
        .single();
      const openaiKey = ((llm?.openai_api_key as string | null) || Deno.env.get('OPENAI_API_KEY') || '').trim();
      const geminiKey = ((llm?.gemini_api_key as string | null) || Deno.env.get('GEMINI_API_KEY') || '').trim();
      if (!openaiKey && !geminiKey) {
        return jsonResponse({ error: 'An OpenAI or Gemini API key is required for brainstorming. Configure one in Settings > LLM Providers.' }, 503);
      }

      // Per-message picker: provider/model from the request, validated against
      // available keys. The FALLBACK honors llm_settings.active_text_provider
      // (SIB-06) instead of silently preferring whichever key exists; a
      // configured provider omni has no branch for (claude) falls through to
      // key availability.
      const requestedProvider = body.provider === 'gemini' || body.provider === 'openai' ? body.provider : null;
      const configuredRaw = (llm?.active_text_provider as string | null) ?? null;
      const configuredProvider = configuredRaw === 'gemini' && geminiKey ? 'gemini'
        : configuredRaw === 'openai' && openaiKey ? 'openai'
        : null;
      const provider = requestedProvider === 'gemini' && geminiKey ? 'gemini'
        : requestedProvider === 'openai' && openaiKey ? 'openai'
        : configuredProvider ?? (openaiKey ? 'openai' : 'gemini');
      const requestedModel = typeof body.model === 'string' && body.model.length <= 200 ? body.model : null;
      const model = requestedModel || (provider === 'gemini'
        ? ((llm?.gemini_text_model as string | null) || 'gemini-2.5-flash')
        : ((llm?.openai_text_model as string | null) || 'gpt-4o'));

      let heartRules;
      try {
        heartRules = await fetchHeartRules(supabaseAdmin);
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Heart rules unavailable' }, 503);
      }

      if (action === 'brainstorm-lock') {
        try {
          // KB-GAP-4: the distilled brief seeds the whole run - Heart-grounded.
          const result = await lockIdea({ provider, model, keys: { openaiKey, geminiKey }, messages, heartRules });
          return jsonResponse(result);
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Lock failed';
          console.error('Omni: brainstorm-lock error:', message);
          return jsonResponse({ error: message }, 502);
        }
      }

      // Embeddings need OpenAI; without that key the chat degrades honestly
      // to Heart-only grounding (the system prompt states it).
      const ragAvailable = openaiKey.length > 0;
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const knowledge = ragAvailable && lastUser
        ? await retrieveKnowledge(supabaseAdmin, openaiKey, lastUser.content)
        : [];

      try {
        const reply = await chatBrainstorm({
          provider, model, keys: { openaiKey, geminiKey },
          heartRules, knowledge, ragAvailable, messages, attachments,
        });
        return jsonResponse({
          reply,
          rag_available: ragAvailable,
          retrieval: { brain_chunks: knowledge.length, heart_rules: heartRules.length },
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Brainstorm reply failed';
        console.error('Omni: brainstorm-chat error:', message);
        return jsonResponse({ error: message }, 502);
      }
    }

    // -- generate-captions (one image -> captions for all its networks) -----
    if (action === 'generate-captions') {
      const runId = body.run_id;
      if (typeof runId !== 'string') return jsonResponse({ error: 'run_id is required' }, 400);
      const { data: run } = await supabaseAdmin
        .from('omni_runs')
        .select('id')
        .eq('id', runId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!run) return jsonResponse({ error: 'Run not found' }, 404);

      const networks = Array.isArray(body.networks)
        ? (body.networks as unknown[]).filter((n): n is string => typeof n === 'string' && NETWORKS.has(n)).slice(0, 6)
        : [];
      if (networks.length === 0) return jsonResponse({ error: 'At least one valid network is required' }, 400);
      const objective = typeof body.objective === 'string' ? body.objective.slice(0, 2000) : '';
      const imagePrompt = typeof body.image_prompt === 'string' ? body.image_prompt.slice(0, 4000) : '';
      const optionsPerNetwork = typeof body.options_per_network === 'number'
        && Number.isInteger(body.options_per_network)
        && body.options_per_network >= 1 && body.options_per_network <= 3
        ? body.options_per_network
        : 1;

      const { data: llm } = await supabaseAdmin
        .from('llm_settings')
        .select('openai_api_key, gemini_api_key, openai_text_model, gemini_text_model, active_text_provider')
        .single();
      const openaiKey = ((llm?.openai_api_key as string | null) || Deno.env.get('OPENAI_API_KEY') || '').trim();
      const geminiKey = ((llm?.gemini_api_key as string | null) || Deno.env.get('GEMINI_API_KEY') || '').trim();
      if (!openaiKey && !geminiKey) {
        return jsonResponse({ error: 'An OpenAI or Gemini API key is required for caption generation. Configure one in Settings > LLM Providers.' }, 503);
      }
      const configuredText = (llm?.active_text_provider as string | null) ?? null;
      const provider = configuredText === 'gemini' && geminiKey ? 'gemini'
        : configuredText === 'openai' && openaiKey ? 'openai'
        : openaiKey ? 'openai' : 'gemini';
      const model = provider === 'gemini'
        ? ((llm?.gemini_text_model as string | null) || 'gemini-2.5-flash')
        : ((llm?.openai_text_model as string | null) || 'gpt-4o');

      // Captions run under OMNI's Heart scope (KB-GAP-3), not Promptor's.
      let heartRules;
      try {
        heartRules = await fetchHeartRules(supabaseAdmin);
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Heart rules unavailable' }, 503);
      }

      try {
        const captions = await generateCaptions({
          provider, model, keys: { openaiKey, geminiKey },
          heartRules, objective, imagePrompt, networks, optionsPerNetwork,
        });
        return jsonResponse({ captions });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Caption generation failed';
        console.error('Omni: generate-captions error:', message);
        return jsonResponse({ error: message }, 502);
      }
    }

    // -- finalize-run (save the approved set into the Pulse Content Library) ---
    if (action === 'finalize-run') {
      const runId = body.run_id;
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : '';
      const description = typeof body.description === 'string' ? body.description.slice(0, 4000) : '';
      const networks = Array.isArray(body.networks) ? body.networks.filter((n: unknown) => typeof n === 'string' && NETWORKS.has(n)) : [];
      const posts = Array.isArray(body.posts) ? body.posts.slice(0, 100) : [];
      const itemOnly = body.save_mode === 'item_only';
      const itemAssetIds = itemOnly && Array.isArray(body.asset_ids)
        ? body.asset_ids.filter((x: unknown) => typeof x === 'string').slice(0, 50)
        : [];
      if (typeof runId !== 'string' || !title) return jsonResponse({ error: 'run_id and title are required' }, 400);
      if (itemOnly) {
        if (itemAssetIds.length === 0) return jsonResponse({ error: 'At least one asset is required' }, 400);
      } else if (networks.length === 0 || posts.length === 0) {
        return jsonResponse({ error: 'At least one network and one post are required' }, 400);
      }

      const { data: run } = await supabaseAdmin
        .from('omni_runs')
        .select('id, status, step_state, mode')
        .eq('id', runId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!run) return jsonResponse({ error: 'Run not found' }, 404);
      // The item metadata records the run's REAL mode (GAP-6): repurposing and
      // surprise runs were previously mislabeled 'omni_images'. Write-only field
      // today (Pulse reads only asset_ids), so correcting it is safe.
      const runMode = typeof (run as { mode?: string }).mode === 'string'
        ? (run as { mode: string }).mode
        : 'omni_images';

      // Idempotency: finalize is the only path to 'completed'. Re-finalizing
      // a completed run (resume at step 12, double click) returns the
      // existing library item instead of inserting a duplicate.
      if ((run as { status?: string }).status === 'completed') {
        const { data: existingItem } = await supabaseAdmin
          .from('content_library_items')
          .select('id')
          .eq('source_run_id', runId)
          .limit(1)
          .maybeSingle();
        if (existingItem) {
          return jsonResponse({ item_id: (existingItem as { id: string }).id, posts_created: 0, already_finalized: true });
        }
      }

      // Every referenced asset must belong to the caller.
      const assetIds = itemOnly
        ? itemAssetIds
        : ([...new Set(posts.map((p: Record<string, unknown>) => p.asset_id).filter((x: unknown) => typeof x === 'string'))] as string[]);
      const { data: ownedAssets } = await supabaseAdmin
        .from('omni_assets')
        .select('id')
        .in('id', assetIds)
        .eq('user_id', userId)
        .eq('run_id', runId);
      const ownedIds = new Set(((ownedAssets as { id: string }[] | null) ?? []).map((a) => a.id));
      if (assetIds.some((id) => !ownedIds.has(id))) {
        return jsonResponse({ error: 'One or more assets do not belong to this run' }, 403);
      }

      const { data: item, error: itemError } = await supabaseAdmin
        .from('content_library_items')
        .insert({
          title,
          description: description || null,
          source_run_id: runId,
          networks,
          status: 'ready',
          metadata: itemOnly
            ? { mode: runMode, asset_ids: itemAssetIds }
            : { mode: runMode },
          created_by: userId,
        })
        .select('id')
        .single();
      if (itemError || !item) {
        console.error('Omni: library item insert error:', itemError?.message);
        return jsonResponse({ error: 'Failed to create the Content Library item' }, 500);
      }
      const itemId = (item as { id: string }).id;

      let postsCreated = 0;
      if (!itemOnly) {
        const postRows = posts
          .filter((p: Record<string, unknown>) => typeof p.network === 'string' && NETWORKS.has(p.network as string) && typeof p.asset_id === 'string')
          .map((p: Record<string, unknown>) => ({
            item_id: itemId,
            network: p.network as string,
            asset_id: p.asset_id as string,
            caption: typeof p.caption === 'string' ? p.caption.slice(0, 4000) : description || null,
            status: 'draft',
            created_by: userId,
          }));
        const { error: postsError } = await supabaseAdmin.from('content_library_posts').insert(postRows);
        if (postsError) {
          console.error('Omni: library posts insert error:', postsError.message);
          // No transaction available via supabase-js: if the posts insert fails,
          // roll back the item we just created so a posts failure never leaves an
          // orphaned, empty Content Library item behind.
          await supabaseAdmin.from('content_library_items').delete().eq('id', itemId);
          return jsonResponse({ error: 'Failed to create the Content Library posts' }, 500);
        }
        postsCreated = postRows.length;
      }

      await supabaseAdmin
        .from('omni_runs')
        .update({ status: 'completed' })
        .eq('id', runId);

      return jsonResponse({ item_id: itemId, posts_created: postsCreated });
    }

    return jsonResponse({ error: 'Invalid action' }, 400);
  } catch (e) {
    if (e instanceof FalUserError) {
      return jsonResponse({ error: e.message }, 400);
    }
    console.error('Omni: unhandled error:', e instanceof Error ? e.message : String(e));
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});
