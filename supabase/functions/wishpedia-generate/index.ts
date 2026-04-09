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
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

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

async function fetchReferenceBlobs(urls: string[], max: number): Promise<Blob[]> {
  const blobs: Blob[] = [];
  for (const url of urls.slice(0, max)) {
    try {
      const res = await fetch(url);
      if (res.ok) blobs.push(await res.blob());
    } catch { /* skip */ }
  }
  return blobs;
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
  imageProvider: string;
  imageModel: string;
  openaiKey: string;
  geminiKey: string;
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
  const template = ctx.anglePrompts[angle];
  const angleInstruction = template
    ? template.replace(/\{name\}/g, ctx.characterName)
    : `Generate a ${angle} view of ${ctx.characterName} based on the provided reference image(s), maintaining exact visual consistency with the reference.`;

  const transparencyInstruction = ctx.transparencyEnabled
    ? '\nTRANSPARENT BACKGROUND: The image MUST have a fully transparent background (PNG alpha channel). Render the character completely isolated on transparency with NO background elements, NO shadows on ground, NO environment.'
    : '';

  const feedbackInstruction = feedback
    ? `\nCORRECTION: The previous generation was rejected because: "${feedback}". Please correct this in the new generation.`
    : '';

  const userAddition = customPrompt ? `\nAdditional direction: ${customPrompt}` : '';
  const preamble = ctx.customSystemPrompt ? `${ctx.customSystemPrompt}\n\n` : '';

  return `${preamble}${angleInstruction}${transparencyInstruction}${feedbackInstruction}${userAddition}\n\nStyle: ${ctx.stylePrompt}`;
}

async function generateSingleImage(
  ctx: GenerationContext,
  angle: string,
  refBlobs: Blob[],
  refUrls: string[],
  prompt: string,
): Promise<Blob> {
  const genSizeMap: Record<string, string> = { '1:1': '1024x1024', '16:9': '1792x1024', '9:16': '1024x1792' };
  const genSize = genSizeMap[ctx.aspectRatio] || '1024x1024';

  const editsSizeMap: Record<string, string> = { '1:1': '1024x1024', '16:9': '1536x1024', '9:16': '1024x1536' };
  const editsSize = editsSizeMap[ctx.aspectRatio] || '1024x1024';

  if (ctx.imageProvider === 'gemini' && ctx.geminiKey) {
    const parts: any[] = [{ text: prompt }];
    for (const url of refUrls.slice(0, ctx.maxRefImages)) {
      try {
        const imgRes = await fetch(url);
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          const mime = imgRes.headers.get('content-type') || 'image/png';
          parts.push({ inlineData: { mimeType: mime, data: b64 } });
        }
      } catch { /* skip */ }
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${ctx.imageModel}:generateContent?key=${ctx.geminiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseModalities: ['image', 'text'] },
      }),
    });
    if (!geminiRes.ok) throw new Error(await geminiRes.text());
    const geminiData = await geminiRes.json();
    const resParts = geminiData.candidates?.[0]?.content?.parts || [];
    const imgPart = resParts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
    if (!imgPart?.inlineData?.data) throw new Error('Gemini did not return an image');
    const binary = atob(imgPart.inlineData.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: imgPart.inlineData.mimeType || 'image/png' });
  } else {
    if (!ctx.openaiKey) throw new Error('OpenAI API key not configured.');

    let imageRes: Response;
    if (refBlobs.length > 0) {
      const formData = new FormData();
      for (const blob of refBlobs) {
        formData.append('image[]', blob, 'reference.png');
      }
      formData.append('prompt', prompt);
      const editsModel = ctx.imageModel === 'gpt-image-1.5' ? 'gpt-image-1' : ctx.imageModel;
      formData.append('model', editsModel);
      formData.append('n', '1');
      formData.append('size', editsSize);
      imageRes = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ctx.openaiKey}` },
        body: formData,
      });
    } else {
      imageRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.openaiKey}` },
        body: JSON.stringify({ model: ctx.imageModel, prompt, n: 1, size: genSize }),
      });
    }

    if (!imageRes.ok) throw new Error(await imageRes.text());
    const imageData = await imageRes.json();
    const imageResult = imageData.data?.[0];
    if (!imageResult) throw new Error('No image returned');
    if (imageResult.b64_json) {
      const binary = atob(imageResult.b64_json);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: 'image/png' });
    } else if (imageResult.url) {
      return await fetch(imageResult.url).then(r => r.blob());
    }
    throw new Error('No image URL or base64 data returned');
  }
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

  const { data: roleData } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  if (!roleData) return json({ error: 'Admin access required' }, 403);

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

  const openaiKey = Deno.env.get('OPENAI_API_KEY') || llmSettings?.openai_api_key || '';
  const geminiKey = Deno.env.get('GEMINI_API_KEY') || llmSettings?.gemini_api_key || '';
  if (!openaiKey && !geminiKey) return json({ error: 'No AI provider configured.' }, 503);

  const imageProvider = llmSettings?.active_image_provider || 'openai';
  const imageModel = imageProvider === 'gemini'
    ? (llmSettings?.gemini_image_model || 'gemini-2.5-flash-image')
    : (llmSettings?.openai_image_model || 'gpt-image-1');

  const characterName = entryName || entry.name;

  const ctx: GenerationContext = {
    supabaseAdmin,
    userId,
    entryId,
    characterName,
    stylePrompt: 'high-quality digital art, clean lines, vibrant colors',
    transparencyEnabled: true,
    customSystemPrompt: '',
    namingPattern: '{name}_{angle}',
    imageProvider,
    imageModel,
    openaiKey,
    geminiKey,
    aspectRatio: aspectRatio || '1:1',
    maxRefImages: 3,
    anglePrompts: {},
  };

  const refUrls = await fetchReferenceUrls(supabaseAdmin, referenceMediaIds || []);
  const refBlobs = await fetchReferenceBlobs(refUrls, ctx.maxRefImages);

  if (action === 'generate-image') {
    const angleSuffix = angle || 'generated';
    const prompt = buildPromptForAngle(ctx, angleSuffix, feedback, customPrompt);

    try {
      const imageBlob = await generateSingleImage(ctx, angleSuffix, refBlobs, refUrls, prompt);
      const result = await saveMediaToStorage(ctx, angleSuffix, imageBlob, prompt, entry.name);
      return json(result);
    } catch (e: any) {
      console.error('Wishpedia generate error:', e);
      return json({ error: e.message || 'Generation failed' }, 500);
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
        const imageBlob = await generateSingleImage(ctx, ang, refBlobs, refUrls, prompt);
        const saved = await saveMediaToStorage(ctx, ang, imageBlob, prompt, entry.name);
        return { angle: ang, ...saved };
      })
    );

    const output = results.map((r, i) => {
      if (r.status === 'fulfilled') {
        return { angle: batchAngles[i], mediaUrl: r.value.mediaUrl, media: r.value.media };
      } else {
        console.error(`Batch generate error for ${batchAngles[i]}:`, r.reason);
        return { angle: batchAngles[i], error: r.reason?.message || 'Generation failed' };
      }
    });

    return json({ results: output });
  }

  return json({ error: 'Unknown action' }, 400);
});
