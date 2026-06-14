/**
 * Wishpedia Generate Edge Function
 * AI media generation for Wishpedia entries.
 * Supports single image generation and batch angle generation.
 *
 * AGENT-001 fix (2026-04-09): previous versions read from non-existent
 * `wishpedia_media` and `wishpedia_settings` tables. Table refs renamed to
 * `wishpedia_entry_images` and the settings table reference was dropped in
 * favour of `llm_settings` + inline defaults.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rate-limit.ts';
import { generateImageViaFal, DEFAULT_FAL_EDIT_MODEL } from '../_shared/fal.ts';

// SEC-12: rate-limit the cost-bearing image-generation endpoint.
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 15 });

async function fetchReferenceUrls(
  supabaseAdmin: ReturnType<typeof createClient>,
  referenceMediaIds: string[],
): Promise<string[]> {
  if (!referenceMediaIds?.length) return [];
  const { data, error } = await supabaseAdmin
    .from('wishpedia_entry_images')
    .select('storage_path')
    .in('id', referenceMediaIds);
  if (error || !data) return [];
  return data.map((m: any) => {
    const { data: pub } = supabaseAdmin.storage.from('wishpedia-media').getPublicUrl(m.storage_path);
    return pub.publicUrl;
  });
}

function sanitizeName(name: string): string {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

interface GenerationContext {
  supabaseAdmin: ReturnType<typeof createClient>;
  userId: string;
  entryId: string;
  characterName: string;
  stylePrompt: string;
  transparencyEnabled: boolean;
  customSystemPrompt: string;
  namingPattern: string;
  falKey: string;
  imageModel: string;
  aspectRatio: string;
  maxRefImages: number;
  anglePrompts: Record<string, string>;
}

function buildPromptForAngle(
  ctx: GenerationContext,
  angle: string,
  feedback?: string,
  customPrompt?: string,
): string {
  // Newline-strip + length-cap the request-supplied fields before they enter the fal image prompt.
  const safeFeedback = feedback ? feedback.replace(/[\r\n\t]+/g, ' ').slice(0, 500) : feedback;
  const safeCustomPrompt = customPrompt ? customPrompt.replace(/[\r\n\t]+/g, ' ').slice(0, 1000) : customPrompt;

  const template = ctx.anglePrompts[angle];
  const angleInstruction = template
    ? template.replace(/\{name\}/g, ctx.characterName)
    : `Generate a ${angle} view of ${ctx.characterName} based on the provided reference image(s), maintaining exact visual consistency with the reference.`;

  const transparencyInstruction = ctx.transparencyEnabled
    ? '\nTRANSPARENT BACKGROUND: The image MUST have a fully transparent background (PNG alpha channel). Render the character completely isolated on transparency with NO background elements, NO shadows on ground, NO environment.'
    : '';

  const feedbackInstruction = safeFeedback
    ? `\nCORRECTION: The previous generation was rejected because: "${safeFeedback}". Please correct this in the new generation.`
    : '';

  const userAddition = safeCustomPrompt ? `\nAdditional direction: ${safeCustomPrompt}` : '';
  const preamble = ctx.customSystemPrompt ? `${ctx.customSystemPrompt}\n\n` : '';

  return `${preamble}${angleInstruction}${transparencyInstruction}${feedbackInstruction}${userAddition}\n\nStyle: ${ctx.stylePrompt}`;
}

async function generateSingleImage(
  ctx: GenerationContext,
  _angle: string,
  refUrls: string[],
  prompt: string,
): Promise<Blob> {
  // fal.ai is the SOLE image engine. Wishpedia reference art (public wishpedia-media URLs)
  // maps straight to image_urls for image-to-image canon-angle recreation; with references
  // present we route to the edit model so the canon character is recreated faithfully.
  const refs = refUrls.slice(0, ctx.maxRefImages);
  const modelId = refs.length > 0 ? DEFAULT_FAL_EDIT_MODEL : ctx.imageModel;

  const media = await generateImageViaFal({
    falKey: ctx.falKey,
    modelId,
    prompt,
    imageUrls: refs,
    aspectRatio: ctx.aspectRatio,
  });

  const host = new URL(media.url).hostname;
  if (host !== 'fal.media' && !host.endsWith('.fal.media')) {
    throw new Error(`Unexpected fal image host: ${host}`);
  }
  const res = await fetch(media.url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`fal image download failed (${res.status})`);
  return await res.blob();
}

async function saveMediaToStorage(
  ctx: GenerationContext,
  angle: string,
  imageBlob: Blob,
  _prompt: string,
  _entryName: string,
): Promise<{ mediaUrl: string; media: any }> {
  const safeName = sanitizeName(ctx.characterName);
  const fileName = ctx.namingPattern.replace('{name}', safeName).replace('{angle}', angle) + '.png';
  const storagePath = `${ctx.entryId}/${Date.now()}_${fileName}`;

  const { error: uploadErr } = await ctx.supabaseAdmin.storage
    .from('wishpedia-media')
    .upload(storagePath, imageBlob, { contentType: 'image/png', upsert: false });
  if (uploadErr) throw uploadErr;

  const { data: publicData } = ctx.supabaseAdmin.storage.from('wishpedia-media').getPublicUrl(storagePath);

  const { data: media, error: mediaErr } = await ctx.supabaseAdmin
    .from('wishpedia_entry_images')
    .insert({
      entry_id: ctx.entryId,
      storage_path: storagePath,
      original_name: fileName,
      mime_type: 'image/png',
      size: imageBlob.size,
      angle: angle || null,
      uploaded_by: ctx.userId,
    })
    .select()
    .single();
  if (mediaErr) throw mediaErr;

  return { mediaUrl: publicData.publicUrl, media };
}

Deno.serve(async (req) => {
  // SEC-01: per-request CORS from the shared allowlist (was wildcard '*').
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return json({ error: 'Unauthorized' }, 401);
  const userId = user.id;

  // SEC-12: standardize on the is_admin RPC (consistent with other privileged fns)
  const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: userId });
  if (!isAdmin) return json({ error: 'Admin access required' }, 403);

  // SEC-12: rate limit the cost-bearing generation endpoint
  if (rateLimiter.check(userId)) return json({ error: 'Too many requests. Please slow down.' }, 429);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { action, entryId, customPrompt, aspectRatio, angle, referenceMediaIds, feedback, entryName, angles } = body;

  if (action !== 'generate-image' && action !== 'generate-batch') {
    return json({ error: 'Unknown action' }, 400);
  }
  if (!entryId) return json({ error: 'entryId required' }, 400);

  // Fetch entry and llm_settings in parallel. The legacy wishpedia_settings
  // table does not exist — we fall back to llm_settings plus inline defaults.
  const [{ data: entry, error: entryError }, { data: llmSettings }] = await Promise.all([
    supabaseAdmin.from('wishpedia_entries').select('name').eq('id', entryId).single(),
    supabaseAdmin.from('llm_settings').select('*').limit(1).maybeSingle(),
  ]);
  if (entryError || !entry) return json({ error: 'Entry not found' }, 404);

  // fal.ai is the SOLE image engine (OpenAI/Gemini image generation retired).
  const falKey = ((llmSettings?.fal_api_key as string | null) || Deno.env.get('FAL_KEY') || '').trim();
  if (!falKey) return json({ error: 'fal.ai is not configured. Add a fal.ai API key in Settings > LLM Providers.' }, 503);

  const imageModel = llmSettings?.fal_image_model || 'fal-ai/flux-pro/v1.1-ultra';

  const characterName = (entryName || entry.name || '').replace(/[\r\n\t]+/g, ' ').slice(0, 80);

  const ctx: GenerationContext = {
    supabaseAdmin,
    userId,
    entryId,
    characterName,
    stylePrompt: 'high-quality digital art, clean lines, vibrant colors',
    transparencyEnabled: true,
    customSystemPrompt: '',
    namingPattern: '{name}_{angle}',
    falKey,
    imageModel,
    aspectRatio: aspectRatio || '1:1',
    maxRefImages: 3,
    anglePrompts: {},
  };

  const refUrls = await fetchReferenceUrls(supabaseAdmin, referenceMediaIds || []);

  if (action === 'generate-image') {
    const angleSuffix = angle || 'generated';
    const prompt = buildPromptForAngle(ctx, angleSuffix, feedback, customPrompt);

    try {
      const imageBlob = await generateSingleImage(ctx, angleSuffix, refUrls, prompt);
      const result = await saveMediaToStorage(ctx, angleSuffix, imageBlob, prompt, entry.name);
      return json(result);
    } catch (e: any) {
      console.error('Wishpedia generate error:', e);
      return json({ error: 'Generation failed' }, 500);
    }
  }

  if (action === 'generate-batch') {
    const batchAngles: string[] = angles;
    if (!Array.isArray(batchAngles) || batchAngles.length === 0) {
      return json({ error: 'angles array required for generate-batch' }, 400);
    }

    const results = await Promise.allSettled(
      batchAngles.map(async (ang: string) => {
        const prompt = buildPromptForAngle(ctx, ang, undefined, customPrompt);
        const imageBlob = await generateSingleImage(ctx, ang, refUrls, prompt);
        const saved = await saveMediaToStorage(ctx, ang, imageBlob, prompt, entry.name);
        return { angle: ang, ...saved };
      })
    );

    const output = results.map((r, i) => {
      if (r.status === 'fulfilled') {
        return { angle: batchAngles[i], mediaUrl: r.value.mediaUrl, media: r.value.media };
      } else {
        console.error(`Batch generate error for ${batchAngles[i]}:`, r.reason);
        return { angle: batchAngles[i], error: 'Generation failed' };
      }
    });

    return json({ results: output });
  }

  return json({ error: 'Unknown action' }, 400);
});
