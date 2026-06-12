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
import { FalUserError, falResult, falStatus, falSubmit } from './fal-runner.ts';
import { persistFalImage, registerInFilesManager, signStoragePath } from './storage.ts';
import { analyzeImage, retrieveKnowledge } from './analysis.ts';
import { mineSurpriseIdeas } from './surprise.ts';
import { chatBrainstorm, lockIdea, type BrainstormAttachment, type BrainstormMessageInput } from './brainstorm.ts';

// 60/min: the generation workspace polls in-flight variants every ~3s.
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });

let corsHeaders: Record<string, string> = getCorsHeaders(null);

// ── Settings ─────────────────────────────────────────────────────────────────

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

// ── Heart rules (AGENT key "omni") ───────────────────────────────────────────

export interface HeartRule {
  name: string;
  content: string;
  priority: string;
}

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Fetch ALL active Heart rules that are global or assigned to "omni".
 * Errors are surfaced to the caller, never silently degraded to zero rules:
 * a fetch failure blocks generation rather than producing non-compliant output.
 * Rules are sorted high priority first so the most important rules are injected
 * first and are never the ones dropped by any downstream truncation.
 * `priority` is a text column, so ordering happens in code via a rank map.
 */
export async function fetchHeartRules(
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<HeartRule[]> {
  const { data, error } = await supabaseAdmin
    .from('heart_rules')
    .select('name, rule_content, priority, sort_order, is_global, assigned_agents, is_active')
    .eq('is_active', true)
    .or('is_global.eq.true,assigned_agents.cs.{"omni"}');

  if (error) {
    console.error('Omni: Heart rules fetch error:', error.message);
    throw new Error('Heart rules could not be loaded. Generation is blocked to guarantee brand compliance. Please try again.');
  }

  const rank = (p: string) => PRIORITY_RANK[p.toLowerCase()] ?? 2;

  return (data || [])
    .map((r: { name?: string; rule_content?: string; priority?: string; sort_order?: number }) => ({
      name: sanitizeForPrompt(r.name ?? ''),
      content: sanitizeForPrompt(r.rule_content ?? ''),
      priority: r.priority ?? 'medium',
      sortOrder: r.sort_order ?? 0,
    }))
    .sort((a, b) => rank(a.priority) - rank(b.priority) || a.sortOrder - b.sortOrder)
    .map(({ name, content, priority }) => ({ name, content, priority }));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

const FAL_NOT_CONFIGURED = 'fal.ai is not configured. Add a fal.ai API key in Settings > LLM Providers.';
const TEST_MODEL_ID = 'fal-ai/flux/schnell';
const NETWORKS = new Set(['facebook', 'instagram', 'x', 'tiktok']);

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

// ── Server ───────────────────────────────────────────────────────────────────

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

    // ── get-settings ─────────────────────────────────────────────────────────
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

    // ── save-settings ────────────────────────────────────────────────────────
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

    // ── list-fal-models ──────────────────────────────────────────────────────
    if (action === 'list-fal-models') {
      const capability = isFalCapability(body.capability) ? body.capability : undefined;
      const q = typeof body.q === 'string' ? body.q : undefined;
      const cursor = typeof body.cursor === 'string' ? body.cursor : undefined;
      const limit = typeof body.limit === 'number' ? body.limit : undefined;

      const falKey = await getFalKey(supabaseAdmin);
      const page = await fetchFalCatalog({ capability, q, cursor, limit, falKey });
      return jsonResponse({ ...page, falConfigured: falKey !== null });
    }

    // ── fal-submit ───────────────────────────────────────────────────────────
    if (action === 'fal-submit') {
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);

      const modelId = body.model_id;
      const input = body.input;
      if (typeof modelId !== 'string' || !input || typeof input !== 'object' || Array.isArray(input)) {
        return jsonResponse({ error: 'model_id (string) and input (object) are required' }, 400);
      }

      const model = await findFalModel(modelId, falKey);
      if (!model) {
        return jsonResponse({ error: `Model "${modelId}" is not in the fal catalog.` }, 400);
      }

      const submission = await falSubmit(falKey, modelId, input as Record<string, unknown>);
      return jsonResponse({ request_id: submission.requestId, queue_position: submission.queuePosition });
    }

    // ── fal-status ───────────────────────────────────────────────────────────
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

    // ── fal-test-generate (admin-only health check) ──────────────────────────
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

    // ── variant-submit (one fal job per variant; supports regenerate lineage) ─
    if (action === 'variant-submit') {
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);

      const runId = body.run_id;
      const modelId = body.model_id;
      const parentAssetId = typeof body.parent_asset_id === 'string' ? body.parent_asset_id : null;
      const sourceAssetId = typeof body.source_asset_id === 'string' ? body.source_asset_id : null;
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

      const input: Record<string, unknown> = { num_images: 1 };
      if (promptStr) input.prompt = promptStr;
      // Image-to-image source: resolved server-side to a short-lived signed URL
      // of the caller's own asset (the client never supplies arbitrary URLs).
      // Input key per model family: upscalers take image_url (singular), the
      // edit families take image_urls (array). aspect_ratio steers extended
      // canvases (exact pixels are cropped client-side afterwards).
      if (sourceAssetId) {
        const { data: sourceAsset } = await supabaseAdmin
          .from('omni_assets')
          .select('storage_path')
          .eq('id', sourceAssetId)
          .eq('user_id', userId)
          .maybeSingle();
        const sourcePath = (sourceAsset as { storage_path: string | null } | null)?.storage_path;
        if (!sourcePath) return jsonResponse({ error: 'Source asset not found or not persisted yet' }, 400);
        const sourceUrl = await signStoragePath(supabaseAdmin, sourcePath, 60 * 60);
        if (!sourceUrl) return jsonResponse({ error: 'Could not sign the source image' }, 500);
        if (/(\/|-)upscal/i.test(modelId)) {
          input.image_url = sourceUrl;
          delete input.num_images;
        } else {
          input.image_urls = [sourceUrl];
        }
        const aspectRatio = typeof body.aspect_ratio === 'string' && /^\d{1,2}:\d{1,2}$/.test(body.aspect_ratio)
          ? body.aspect_ratio
          : null;
        if (aspectRatio) input.aspect_ratio = aspectRatio;
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
          metadata: { source_asset_id: sourceAssetId },
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
          .update({ metadata: { source_asset_id: sourceAssetId, fal_request_id: submission.requestId } })
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

    // ── variants-poll (batched; persists completed images, idempotent) ────────
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
          const url = await signStoragePath(supabaseAdmin, a.storage_path as string);
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
          const url = await signStoragePath(supabaseAdmin, persisted.storagePath);
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

    // ── asset-url (fresh signed URL for an owned, persisted asset) ────────────
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
      const url = await signStoragePath(supabaseAdmin, path);
      return jsonResponse({ url });
    }

    // ── save-asset-to-files (register in Files Manager / Omni AI sector) ──────
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

    // ── analyze-image (vision + RAG + universe-relation conclusion) ───────────
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

      const signedUrl = await signStoragePath(supabaseAdmin, record.storage_path, 60 * 60);
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

    // ── surprise-ideas (mine the knowledge base for creation ideas) ───────────
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

    // ── brainstorm-chat / brainstorm-lock (Mode 6: RAG-grounded creative chat) ─
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
        .select('openai_api_key, gemini_api_key, openai_text_model, gemini_text_model')
        .single();
      const openaiKey = ((llm?.openai_api_key as string | null) || Deno.env.get('OPENAI_API_KEY') || '').trim();
      const geminiKey = ((llm?.gemini_api_key as string | null) || Deno.env.get('GEMINI_API_KEY') || '').trim();
      if (!openaiKey && !geminiKey) {
        return jsonResponse({ error: 'An OpenAI or Gemini API key is required for brainstorming. Configure one in Settings > LLM Providers.' }, 503);
      }

      // Per-message picker: provider/model from the request, validated against
      // available keys; falls back to the configured text model defaults.
      const requestedProvider = body.provider === 'gemini' || body.provider === 'openai' ? body.provider : null;
      const provider = requestedProvider === 'gemini' && geminiKey ? 'gemini'
        : requestedProvider === 'openai' && openaiKey ? 'openai'
        : openaiKey ? 'openai' : 'gemini';
      const requestedModel = typeof body.model === 'string' && body.model.length <= 200 ? body.model : null;
      const model = requestedModel || (provider === 'gemini'
        ? ((llm?.gemini_text_model as string | null) || 'gemini-2.5-flash')
        : ((llm?.openai_text_model as string | null) || 'gpt-4o'));

      if (action === 'brainstorm-lock') {
        try {
          const result = await lockIdea({ provider, model, keys: { openaiKey, geminiKey }, messages });
          return jsonResponse(result);
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Lock failed';
          console.error('Omni: brainstorm-lock error:', message);
          return jsonResponse({ error: message }, 502);
        }
      }

      let heartRules;
      try {
        heartRules = await fetchHeartRules(supabaseAdmin);
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Heart rules unavailable' }, 503);
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

    // ── finalize-run (save the approved set into the Pulse Content Library) ───
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
        .select('id, step_state')
        .eq('id', runId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!run) return jsonResponse({ error: 'Run not found' }, 404);

      // Every referenced asset must belong to the caller.
      const assetIds = itemOnly
        ? itemAssetIds
        : ([...new Set(posts.map((p: Record<string, unknown>) => p.asset_id).filter((x: unknown) => typeof x === 'string'))] as string[]);
      const { data: ownedAssets } = await supabaseAdmin
        .from('omni_assets')
        .select('id')
        .in('id', assetIds)
        .eq('user_id', userId);
      const ownedIds = new Set(((ownedAssets as { id: string }[] | null) ?? []).map((a) => a.id));
      if (assetIds.some((id) => !ownedIds.has(id))) {
        return jsonResponse({ error: 'One or more assets do not belong to this run owner' }, 403);
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
            ? { mode: 'transform_upscale', asset_ids: itemAssetIds }
            : { mode: 'omni_images' },
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
