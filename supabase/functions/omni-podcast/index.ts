/**
 * omni-podcast edge function: the Audios-track backend (Plan 3 Phase 2).
 *
 * A SEPARATE function (the omni-video precedent - omni sits at the MCP
 * deploy ceiling) with the same auth model: Bearer + getUser on every
 * request, per-user rate limit, service-role DB access scoped by user_id,
 * signed URLs only, verify_jwt TRUE at the gateway.
 *
 * Actions: podcast-voices / podcast-preview-line / podcast-script /
 * podcast-shownotes / podcast-cover / podcast-jingle / podcast-render /
 * podcast-assemble / podcast-poll.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rate-limit.ts';
import { TOKEN_BUDGETS } from '../_shared/token-budgets.ts';
import { persistFalMedia } from '../_shared/fal.ts';
import {
  getElevenKey, listVoices, previewLine, renderLines, type SpeakerLine,
} from '../_shared/elevenlabs.ts';
import {
  DEFAULT_DISCLOSURE_LINE, buildChapterScriptPrompt, buildOutlinePrompt, buildShownotesPrompt,
  fetchUrlText, parseJsonObject, parseOutline, parseSegments,
  type OutlineChapter, type PodcastPersonaBrief,
} from '../_shared/podcast.ts';
import { FalUserError, falStatus, falSubmit } from '../omni/fal-runner.ts';
import { buildHeartBlock, buildKnowledgeBlock, fetchHeartRules, retrieveKnowledge } from '../omni/context.ts';
import { openAiTuning } from '../omni/llm.ts';

const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });

let corsHeaders: Record<string, string> = getCorsHeaders(null);

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type AdminClient = ReturnType<typeof createClient>;

const AUDIO_BUCKET = 'omni-audio';
const QUEUE_BASE = 'https://queue.fal.run';
const CHUNK_MAX_BYTES = 20 * 1024 * 1024;
const EPISODE_MAX_BYTES = 200 * 1024 * 1024;
const ELEVEN_NOT_CONNECTED = 'ElevenLabs is not connected. Add the key in Pulse Settings.';
const FAL_NOT_CONFIGURED = 'fal.ai is not configured. Add a fal.ai API key in Settings > LLM Providers.';

async function getFalKey(supabaseAdmin: AdminClient): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from('llm_settings').select('fal_api_key').single();
  if (error) console.error('omni-podcast: llm_settings read error:', error.message);
  const key = (data?.fal_api_key as string | null) || Deno.env.get('FAL_KEY') || '';
  return key.trim().length > 0 ? key.trim() : null;
}

/** Owner-namespaced signed URL in the omni-audio bucket (the Plan-1 lesson). */
async function signAudioPath(supabaseAdmin: AdminClient, storagePath: string, ownerId: string, ttl = 60 * 60): Promise<string | null> {
  if (!storagePath.startsWith(`${ownerId}/`)) {
    console.error('omni-podcast: refused to sign a path outside the caller namespace');
    return null;
  }
  const { data, error } = await supabaseAdmin.storage.from(AUDIO_BUCKET).createSignedUrl(storagePath, ttl);
  if (error) {
    console.error('omni-podcast: signed URL error:', error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

/** LLM call using the configured text provider (the scenario-generate pattern). */
async function callLlm(supabaseAdmin: AdminClient, prompt: string, maxTokens: number): Promise<Record<string, unknown>> {
  const { data: llm } = await supabaseAdmin
    .from('llm_settings')
    .select('openai_api_key, gemini_api_key, openai_text_model, gemini_text_model, active_text_provider')
    .single();
  const openaiKey = ((llm?.openai_api_key as string | null) || Deno.env.get('OPENAI_API_KEY') || '').trim();
  const geminiKey = ((llm?.gemini_api_key as string | null) || Deno.env.get('GEMINI_API_KEY') || '').trim();
  if (!openaiKey && !geminiKey) throw new Error('An OpenAI or Gemini API key is required. Configure one in Settings > LLM Providers.');
  const configured = (llm?.active_text_provider as string | null) ?? null;
  const provider = configured === 'gemini' && geminiKey ? 'gemini'
    : configured === 'openai' && openaiKey ? 'openai'
    : openaiKey ? 'openai' : 'gemini';

  if (provider === 'gemini') {
    const model = (llm?.gemini_text_model as string | null) || 'gemini-2.5-flash';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(120_000),
      },
    );
    if (!res.ok) throw new Error(`Gemini generation failed (${res.status})`);
    const data = await res.json();
    return parseJsonObject(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}');
  }

  const model = (llm?.openai_text_model as string | null) || 'gpt-4o';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      ...openAiTuning(model, maxTokens, 0.7),
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`OpenAI generation failed (${res.status})`);
  const data = await res.json();
  return parseJsonObject(data.choices?.[0]?.message?.content ?? '{}');
}

/** Resolve the caller's OWN personas into prompt briefs, keyed by label. */
async function resolvePersonas(
  supabaseAdmin: AdminClient,
  userId: string,
  raw: unknown,
): Promise<PodcastPersonaBrief[]> {
  if (!Array.isArray(raw)) return [];
  const wanted = raw
    .filter((p: Record<string, unknown>) => typeof p?.label === 'string' && typeof p?.persona_id === 'string')
    .slice(0, 6) as Array<{ label: string; persona_id: string }>;
  if (wanted.length === 0) return [];
  const { data } = await supabaseAdmin
    .from('omni_personas')
    .select('id, name, role, personality, speaking_style')
    .in('id', wanted.map((w) => w.persona_id))
    .eq('user_id', userId);
  const byId = new Map(((data ?? []) as Record<string, unknown>[]).map((p) => [p.id as string, p]));
  return wanted
    .map((w) => {
      const p = byId.get(w.persona_id);
      if (!p) return null;
      return {
        label: w.label.slice(0, 40).toUpperCase(),
        name: String(p.name ?? 'Host').slice(0, 80),
        role: typeof p.role === 'string' ? p.role.slice(0, 120) : undefined,
        personality: typeof p.personality === 'string' ? p.personality.slice(0, 400) : undefined,
        speaking_style: typeof p.speaking_style === 'string' ? p.speaking_style.slice(0, 400) : undefined,
      } as PodcastPersonaBrief;
    })
    .filter((p): p is PodcastPersonaBrief => p !== null);
}

/** Render ONE claimed chunk row: TTS its lines, upload, flip the row. */
async function renderChunk(
  supabaseAdmin: AdminClient,
  ownerId: string,
  runId: string,
  chunkId: string,
  lines: SpeakerLine[],
  modelId: string,
  key: string,
): Promise<void> {
  try {
    const { bytes, words } = await renderLines(key, lines, modelId);
    if (bytes.length > CHUNK_MAX_BYTES) throw new Error('This chapter renders above the 20MB chunk cap; split it.');
    const storagePath = `${ownerId}/omni-podcast/${runId}/chunk-${chunkId}.mp3`;
    const { error: upErr } = await supabaseAdmin.storage
      .from(AUDIO_BUCKET)
      .upload(storagePath, bytes, { contentType: 'audio/mpeg', upsert: true });
    if (upErr) throw new Error(upErr.message);
    const { data: row } = await supabaseAdmin.from('omni_assets').select('metadata').eq('id', chunkId).maybeSingle();
    const meta = ((row as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    await supabaseAdmin
      .from('omni_assets')
      .update({
        status: 'done',
        storage_path: storagePath,
        mime_type: 'audio/mpeg',
        metadata: { ...meta, byte_size: bytes.length, duration_s: Math.max(1, Math.round(words / 2.5)) },
      })
      .eq('id', chunkId);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Chapter render failed';
    console.error('omni-podcast: chunk render error:', message);
    await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', chunkId);
  }
}

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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
    if (userError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const userId = user.id;

    if (rateLimiter.check(userId)) {
      return jsonResponse({ error: 'Rate limit exceeded. Please wait a moment and try again.' }, 429);
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = typeof body?.action === 'string' ? body.action : '';

    const ownRun = async (runId: unknown): Promise<boolean> => {
      if (typeof runId !== 'string') return false;
      const { data } = await supabaseAdmin
        .from('omni_runs')
        .select('id')
        .eq('id', runId)
        .eq('user_id', userId)
        .maybeSingle();
      return !!data;
    };

    // -- podcast-voices -----
    if (action === 'podcast-voices') {
      const key = await getElevenKey(supabaseAdmin);
      if (!key) return jsonResponse({ error: ELEVEN_NOT_CONNECTED }, 503);
      try {
        return jsonResponse({ voices: await listVoices(key) });
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Could not list voices' }, 502);
      }
    }

    // -- podcast-preview-line -----
    if (action === 'podcast-preview-line') {
      const key = await getElevenKey(supabaseAdmin);
      if (!key) return jsonResponse({ error: ELEVEN_NOT_CONNECTED }, 503);
      const voiceId = typeof body.voice_id === 'string' ? body.voice_id.slice(0, 64) : '';
      const text = typeof body.text === 'string' && body.text.trim() ? body.text.trim() : 'Welcome to the show.';
      if (!voiceId) return jsonResponse({ error: 'voice_id is required' }, 400);
      try {
        const dataUrl = await previewLine(key, voiceId, text);
        return jsonResponse({ audio: dataUrl });
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Preview failed' }, 502);
      }
    }

    // -- podcast-script (outline + chapter modes, D-A3) -----
    if (action === 'podcast-script') {
      const mode = body.mode === 'chapter' ? 'chapter' : 'outline';
      let heartRules;
      try {
        heartRules = await fetchHeartRules(supabaseAdmin);
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Heart rules unavailable' }, 503);
      }
      const heartSection = buildHeartBlock(heartRules);
      const personas = await resolvePersonas(supabaseAdmin, userId, body.personas);

      const { data: llmRow } = await supabaseAdmin.from('llm_settings').select('openai_api_key').single();
      const openaiKey = ((llmRow?.openai_api_key as string | null) || Deno.env.get('OPENAI_API_KEY') || '').trim();

      if (mode === 'outline') {
        const brief = typeof body.brief === 'string' ? body.brief.trim().slice(0, 4000) : '';
        const pasted = typeof body.pasted_text === 'string' ? body.pasted_text.slice(0, 20000) : '';
        const sourceUrl = typeof body.source_url === 'string' ? body.source_url.slice(0, 2000) : '';
        if (!brief && !pasted && !sourceUrl) return jsonResponse({ error: 'Provide a brief, pasted text, or a source URL' }, 400);
        const targetMinutes = Math.min(Math.max(Math.round(Number(body.target_minutes) || 30), 5), 90);
        const urlText = sourceUrl ? await fetchUrlText(sourceUrl) : '';
        const sourceText = [pasted, urlText].filter(Boolean).join('\n\n').slice(0, 24000);
        const knowledge = openaiKey ? await retrieveKnowledge(supabaseAdmin, openaiKey, brief || sourceText.slice(0, 600)) : [];
        try {
          const parsed = await callLlm(supabaseAdmin, buildOutlinePrompt({
            heartSection,
            knowledgeSection: buildKnowledgeBlock(knowledge),
            sourceText,
            showName: typeof body.show_name === 'string' ? body.show_name.slice(0, 120) : 'the show',
            brief: brief || 'Derive the brief from the source material.',
            targetMinutes,
            personas,
          }), TOKEN_BUDGETS.CONTENT_GENERATION);
          const outline = parseOutline(parsed, targetMinutes);
          if (outline.chapters.length === 0) return jsonResponse({ error: 'The outline came back empty. Refine the brief and try again.' }, 502);
          return jsonResponse({ ...outline, retrieval: { brain_chunks: knowledge.length, heart_rules: heartRules.length } });
        } catch (e) {
          return jsonResponse({ error: e instanceof Error ? e.message : 'Outline generation failed' }, 502);
        }
      }

      // chapter mode
      const rawOutline = Array.isArray(body.outline) ? body.outline.slice(0, 12) : [];
      const outline: OutlineChapter[] = rawOutline
        .filter((c: Record<string, unknown>) => typeof c?.title === 'string')
        .map((c: Record<string, unknown>, i: number) => ({
          idx: i + 1,
          title: String(c.title).slice(0, 200),
          summary: typeof c.summary === 'string' ? c.summary.slice(0, 600) : '',
          minutes: Math.min(Math.max(Math.round(Number(c.minutes) || 6), 2), 15),
        }));
      const chapterIdx = Math.round(Number(body.chapter_idx) || 1);
      const chapter = outline.find((c) => c.idx === chapterIdx);
      if (!chapter) return jsonResponse({ error: 'chapter_idx is not in the outline' }, 400);
      const knowledge = openaiKey
        ? await retrieveKnowledge(supabaseAdmin, openaiKey, `${chapter.title} ${chapter.summary}`.slice(0, 600))
        : [];
      try {
        const parsed = await callLlm(supabaseAdmin, buildChapterScriptPrompt({
          heartSection,
          knowledgeSection: buildKnowledgeBlock(knowledge),
          episodeTitle: typeof body.episode_title === 'string' ? body.episode_title.slice(0, 200) : 'the episode',
          showName: typeof body.show_name === 'string' ? body.show_name.slice(0, 120) : 'the show',
          outline,
          chapter,
          priorTail: typeof body.prior_tail === 'string' ? body.prior_tail.slice(0, 2000) : '',
          personas,
          isFirst: chapterIdx === 1,
          isLast: chapterIdx === outline.length,
          disclosureLine: chapterIdx === outline.length
            ? (typeof body.disclosure_line === 'string' && body.disclosure_line.trim()
              ? body.disclosure_line.trim().slice(0, 300)
              : DEFAULT_DISCLOSURE_LINE)
            : undefined,
        }), TOKEN_BUDGETS.CHAT_RESPONSE);
        const segments = parseSegments(parsed);
        if (segments.length === 0) return jsonResponse({ error: 'The chapter came back empty. Try again.' }, 502);
        return jsonResponse({ segments });
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Chapter generation failed' }, 502);
      }
    }

    // -- podcast-shownotes -----
    if (action === 'podcast-shownotes') {
      let heartRules;
      try {
        heartRules = await fetchHeartRules(supabaseAdmin);
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Heart rules unavailable' }, 503);
      }
      const rawOutline = Array.isArray(body.outline) ? body.outline.slice(0, 12) : [];
      const outline: OutlineChapter[] = rawOutline.map((c: Record<string, unknown>, i: number) => ({
        idx: i + 1,
        title: String(c?.title ?? '').slice(0, 200),
        summary: typeof c?.summary === 'string' ? c.summary.slice(0, 600) : '',
        minutes: Math.round(Number(c?.minutes) || 6),
      }));
      try {
        const parsed = await callLlm(supabaseAdmin, buildShownotesPrompt({
          heartSection: buildHeartBlock(heartRules),
          episodeTitle: typeof body.episode_title === 'string' ? body.episode_title.slice(0, 200) : 'the episode',
          outline,
          scriptSample: typeof body.script_sample === 'string' ? body.script_sample : '',
        }), TOKEN_BUDGETS.CONTENT_GENERATION);
        return jsonResponse({
          title: typeof parsed.title === 'string' ? parsed.title.slice(0, 200) : '',
          description: typeof parsed.description === 'string' ? parsed.description.slice(0, 4000) : '',
          tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: unknown) => typeof t === 'string').slice(0, 20) : [],
        });
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Show notes generation failed' }, 502);
      }
    }

    // -- podcast-cover (fal image -> omni-audio bucket) -----
    if (action === 'podcast-cover') {
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);
      const runId = body.run_id;
      if (!(await ownRun(runId))) return jsonResponse({ error: 'Run not found' }, 404);
      const prompt = typeof body.prompt === 'string' && body.prompt.trim()
        ? body.prompt.trim().slice(0, 2000)
        : 'minimal bold podcast cover art, large typography space, square';
      try {
        const submission = await falSubmit(falKey, 'fal-ai/flux/schnell', {
          prompt: `${prompt}. Square podcast cover, 3000x3000 aesthetic, no text.`,
          image_size: 'square_hd',
        });
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const s = await falStatus(falKey, 'fal-ai/flux/schnell', submission.requestId);
          if (s.status === 'COMPLETED') {
            const res = await fetch(`${QUEUE_BASE}/fal-ai/flux/requests/${submission.requestId}`, {
              headers: { Authorization: `Key ${falKey}` },
              signal: AbortSignal.timeout(30_000),
            });
            const data = await res.json().catch(() => ({}));
            const img = (data.images as Array<{ url?: string; content_type?: string }> | undefined)?.[0];
            if (!img?.url) return jsonResponse({ error: 'The cover came back empty. Try again.' }, 502);
            const persisted = await persistFalMedia(supabaseAdmin, {
              bucket: AUDIO_BUCKET,
              basePath: `${userId}/omni-podcast/${runId}/cover-${submission.requestId}`,
              falUrl: img.url,
              contentType: img.content_type ?? 'image/png',
            });
            const url = await signAudioPath(supabaseAdmin, persisted.storagePath, userId);
            return jsonResponse({ cover_path: persisted.storagePath, url });
          }
        }
        return jsonResponse({ error: 'Cover generation timed out. Try again.' }, 504);
      } catch (e) {
        if (e instanceof FalUserError) return jsonResponse({ error: e.message }, 400);
        throw e;
      }
    }

    // -- podcast-jingle (lyria2 -> pollable asset row) -----
    if (action === 'podcast-jingle') {
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);
      const runId = body.run_id;
      if (!(await ownRun(runId))) return jsonResponse({ error: 'Run not found' }, 404);
      const prompt = typeof body.prompt === 'string' && body.prompt.trim()
        ? body.prompt.trim().slice(0, 500)
        : 'short upbeat podcast intro jingle, warm and modern, instrumental';
      const kind = body.kind === 'outro' ? 'outro_jingle' : 'intro_jingle';
      const { data: asset, error: assetError } = await supabaseAdmin
        .from('omni_assets')
        .insert({
          user_id: userId,
          run_id: runId,
          kind: 'audio',
          model_id: 'fal-ai/lyria2',
          prompt,
          status: 'generating',
          metadata: { kind },
        })
        .select('id')
        .single();
      if (assetError || !asset) {
        console.error('omni-podcast: jingle insert error:', assetError?.message);
        return jsonResponse({ error: 'Failed to create the jingle record' }, 500);
      }
      const assetId = (asset as { id: string }).id;
      try {
        const submission = await falSubmit(falKey, 'fal-ai/lyria2', { prompt });
        await supabaseAdmin.from('omni_assets')
          .update({ metadata: { kind, fal_request_id: submission.requestId } })
          .eq('id', assetId);
        return jsonResponse({ asset_id: assetId, request_id: submission.requestId });
      } catch (e) {
        const message = e instanceof FalUserError ? e.message : 'Jingle generation could not be submitted';
        await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', assetId);
        if (e instanceof FalUserError) return jsonResponse({ asset_id: assetId, error: message }, 400);
        throw e;
      }
    }

    // -- podcast-render (D-A3.3: chunk rows up front; ONE chunk per call) -----
    if (action === 'podcast-render') {
      const runId = body.run_id;
      if (!(await ownRun(runId))) return jsonResponse({ error: 'Run not found' }, 404);
      const key = await getElevenKey(supabaseAdmin);
      if (!key) return jsonResponse({ error: ELEVEN_NOT_CONNECTED }, 503);

      // First call carries the chapters; rows are created idempotently.
      if (Array.isArray(body.chapters) && body.chapters.length > 0) {
        const { data: existing } = await supabaseAdmin
          .from('omni_assets')
          .select('id, metadata')
          .eq('run_id', runId)
          .eq('user_id', userId)
          .eq('kind', 'audio');
        const existingIdxs = new Set(
          ((existing ?? []) as { metadata: Record<string, unknown> | null }[])
            .filter((a) => a.metadata?.kind === 'podcast_chunk')
            .map((a) => a.metadata?.chapter_idx),
        );
        for (const ch of (body.chapters as Record<string, unknown>[]).slice(0, 12)) {
          const idx = Math.round(Number(ch?.idx) || 0);
          if (idx < 1 || existingIdxs.has(idx)) continue;
          const lines = (Array.isArray(ch?.lines) ? ch.lines : [])
            .filter((l: Record<string, unknown>) => typeof l?.text === 'string' && typeof l?.voice_id === 'string')
            .slice(0, 200)
            .map((l: Record<string, unknown>) => ({
              text: String(l.text).slice(0, 20000),
              voice_id: String(l.voice_id).slice(0, 64),
              ...(l.settings && typeof l.settings === 'object' ? { settings: l.settings } : {}),
            }));
          if (lines.length === 0) continue;
          await supabaseAdmin.from('omni_assets').insert({
            user_id: userId,
            run_id: runId,
            kind: 'audio',
            model_id: null,
            prompt: null,
            status: 'pending',
            metadata: { kind: 'podcast_chunk', chapter_idx: idx, lines, tts_model: 'eleven_multilingual_v2' },
          });
        }
      }

      // Claim + render ONE pending chunk (CAS via conditional update).
      const { data: pendingRows } = await supabaseAdmin
        .from('omni_assets')
        .select('id, metadata')
        .eq('run_id', runId)
        .eq('user_id', userId)
        .eq('kind', 'audio')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);
      const chunk = ((pendingRows ?? []) as { id: string; metadata: Record<string, unknown> | null }[])
        .find((r) => r.metadata?.kind === 'podcast_chunk');
      if (chunk) {
        const { data: claimed } = await supabaseAdmin
          .from('omni_assets')
          .update({ status: 'generating' })
          .eq('id', chunk.id)
          .eq('status', 'pending')
          .select('id');
        if (((claimed ?? []) as { id: string }[]).length > 0) {
          const lines = (chunk.metadata?.lines ?? []) as SpeakerLine[];
          const ttsModel = typeof chunk.metadata?.tts_model === 'string' ? chunk.metadata.tts_model as string : 'eleven_multilingual_v2';
          EdgeRuntime.waitUntil(renderChunk(supabaseAdmin, userId, runId as string, chunk.id, lines, ttsModel, key));
          return jsonResponse({ rendering_chunk_id: chunk.id, status: 'generating' });
        }
      }
      return jsonResponse({ rendering_chunk_id: null, status: 'idle' });
    }

    // -- podcast-assemble (merge chunks + jingles -> episode; fal queue job) --
    if (action === 'podcast-assemble') {
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);
      const runId = body.run_id;
      if (!(await ownRun(runId))) return jsonResponse({ error: 'Run not found' }, 404);

      const { data: rows } = await supabaseAdmin
        .from('omni_assets')
        .select('id, status, storage_path, metadata')
        .eq('run_id', runId)
        .eq('user_id', userId)
        .eq('kind', 'audio');
      const assets = (rows ?? []) as { id: string; status: string; storage_path: string | null; metadata: Record<string, unknown> | null }[];
      const chunks = assets
        .filter((a) => a.metadata?.kind === 'podcast_chunk')
        .sort((a, b) => Number(a.metadata?.chapter_idx ?? 0) - Number(b.metadata?.chapter_idx ?? 0));
      if (chunks.length === 0) return jsonResponse({ error: 'No rendered chapters found' }, 400);
      if (chunks.some((c) => c.status !== 'done' || !c.storage_path)) {
        return jsonResponse({ error: 'Not every chapter has finished rendering yet' }, 400);
      }

      const urls: string[] = [];
      const introId = typeof body.intro_jingle_asset_id === 'string' ? body.intro_jingle_asset_id : null;
      const outroId = typeof body.outro_jingle_asset_id === 'string' ? body.outro_jingle_asset_id : null;
      const signAsset = async (id: string): Promise<string | null> => {
        const a = assets.find((x) => x.id === id);
        if (!a || a.status !== 'done' || !a.storage_path) return null;
        return signAudioPath(supabaseAdmin, a.storage_path, userId);
      };
      if (introId) {
        const u = await signAsset(introId);
        if (!u) return jsonResponse({ error: 'The intro jingle is not ready yet' }, 400);
        urls.push(u);
      }
      for (const c of chunks) {
        const u = await signAudioPath(supabaseAdmin, c.storage_path!, userId);
        if (!u) return jsonResponse({ error: 'A chapter file could not be signed' }, 500);
        urls.push(u);
      }
      if (outroId) {
        const u = await signAsset(outroId);
        if (!u) return jsonResponse({ error: 'The outro jingle is not ready yet' }, 400);
        urls.push(u);
      }

      const { data: episodeAsset, error: assetError } = await supabaseAdmin
        .from('omni_assets')
        .insert({
          user_id: userId,
          run_id: runId,
          kind: 'audio',
          model_id: 'fal-ai/ffmpeg-api/merge-audios',
          prompt: null,
          status: 'generating',
          metadata: { kind: 'podcast_episode', chapters: chunks.length },
        })
        .select('id')
        .single();
      if (assetError || !episodeAsset) {
        console.error('omni-podcast: episode insert error:', assetError?.message);
        return jsonResponse({ error: 'Failed to create the episode record' }, 500);
      }
      const episodeId = (episodeAsset as { id: string }).id;
      try {
        const submission = await falSubmit(falKey, 'fal-ai/ffmpeg-api/merge-audios', { audio_urls: urls });
        await supabaseAdmin.from('omni_assets')
          .update({ metadata: { kind: 'podcast_episode', chapters: chunks.length, fal_request_id: submission.requestId } })
          .eq('id', episodeId);
        return jsonResponse({ asset_id: episodeId, request_id: submission.requestId });
      } catch (e) {
        const message = e instanceof FalUserError ? e.message : 'Episode assembly could not be submitted';
        await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', episodeId);
        if (e instanceof FalUserError) return jsonResponse({ asset_id: episodeId, error: message }, 400);
        throw e;
      }
    }

    // -- podcast-library-item (Phase 7 D-A10: item-only audio entry; full
    // episodes publish via RSS, so no per-network posts here - audiograms and
    // clips flow through the video track's normal Content Library path) -----
    if (action === 'podcast-library-item') {
      const runId = body.run_id;
      if (!(await ownRun(runId))) return jsonResponse({ error: 'Run not found' }, 404);
      // Idempotent per run (the finalize-run pattern).
      const { data: existingItem } = await supabaseAdmin
        .from('content_library_items')
        .select('id')
        .eq('source_run_id', runId)
        .limit(1)
        .maybeSingle();
      if (existingItem) {
        return jsonResponse({ item_id: (existingItem as { id: string }).id, already_exists: true });
      }
      const episodeAssetId = typeof body.episode_asset_id === 'string' ? body.episode_asset_id : '';
      const { data: episodeRow } = await supabaseAdmin
        .from('omni_assets')
        .select('id, status, storage_path, metadata')
        .eq('id', episodeAssetId)
        .eq('user_id', userId)
        .eq('run_id', runId)
        .maybeSingle();
      const episode = episodeRow as { id: string; status: string; storage_path: string | null; metadata: Record<string, unknown> | null } | null;
      if (!episode || episode.status !== 'done' || !episode.storage_path) {
        return jsonResponse({ error: 'The episode is not assembled yet' }, 400);
      }
      const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 200) : 'Untitled episode';
      const description = typeof body.description === 'string' ? body.description.slice(0, 4000) : '';
      const durationS = Number(body.duration_s);
      const { data: item, error: itemError } = await supabaseAdmin
        .from('content_library_items')
        .insert({
          title,
          description: description || null,
          source_run_id: runId,
          networks: [],
          status: 'ready',
          media_type: 'audio',
          metadata: {
            mode: 'omni_podcast',
            asset_ids: [episode.id],
            ...(Number.isFinite(durationS) && durationS > 0 ? { duration_s: Math.round(durationS) } : {}),
          },
          created_by: userId,
        })
        .select('id')
        .single();
      if (itemError || !item) {
        console.error('omni-podcast: library item insert error:', itemError?.message);
        return jsonResponse({ error: 'Failed to create the Content Library item' }, 500);
      }
      return jsonResponse({ item_id: (item as { id: string }).id });
    }

    // -- podcast-poll (batched; persists fal-backed rows into omni-audio) -----
    if (action === 'podcast-poll') {
      const assetIds = Array.isArray(body.asset_ids)
        ? body.asset_ids.filter((x: unknown) => typeof x === 'string').slice(0, 12)
        : [];
      if (assetIds.length === 0) return jsonResponse({ error: 'asset_ids is required' }, 400);
      const falKey = await getFalKey(supabaseAdmin);

      const { data: assets } = await supabaseAdmin
        .from('omni_assets')
        .select('id, run_id, model_id, status, storage_path, error, metadata, updated_at')
        .in('id', assetIds)
        .eq('user_id', userId);

      const results = await Promise.all(((assets as Record<string, unknown>[] | null) ?? []).map(async (a) => {
        const id = a.id as string;
        const status = a.status as string;
        const meta = (a.metadata ?? {}) as Record<string, unknown>;

        if (status === 'done' && a.storage_path) {
          const url = await signAudioPath(supabaseAdmin, a.storage_path as string, userId);
          return { id, status: 'done', url, duration_s: meta.duration_s ?? null, chapter_idx: meta.chapter_idx ?? null };
        }
        if (status === 'failed') return { id, status: 'failed', error: a.error ?? 'Generation failed', chapter_idx: meta.chapter_idx ?? null };
        if (status === 'discarded') return { id, status: 'discarded' };
        if (status === 'persisting') return { id, status: 'persisting' };

        const requestId = meta.fal_request_id;
        const modelId = a.model_id as string | null;
        if (typeof requestId !== 'string' || !modelId) {
          // TTS chunks: rendered by waitUntil or the finisher sweep.
          const staleMs = Date.now() - new Date(a.updated_at as string).getTime();
          if (staleMs > 15 * 60_000 && status === 'generating') {
            const message = 'The render stalled (the server worker was interrupted). Retry it.';
            await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', id);
            return { id, status: 'failed', error: message, chapter_idx: meta.chapter_idx ?? null };
          }
          return { id, status, chapter_idx: meta.chapter_idx ?? null };
        }

        if (!falKey) return { id, status: 'generating' };
        try {
          const jobStatus = await falStatus(falKey, modelId, requestId);
          if (jobStatus.status !== 'COMPLETED') return { id, status: 'generating', queue_position: jobStatus.queuePosition };
          const res = await fetch(`${QUEUE_BASE}/${modelId.split('/').slice(0, 2).join('/')}/requests/${requestId}`, {
            headers: { Authorization: `Key ${falKey}` },
            signal: AbortSignal.timeout(30_000),
          });
          if (!res.ok) throw new Error(`fal result failed (${res.status})`);
          const data = await res.json() as Record<string, unknown>;
          const audio = (data.audio ?? data.media) as { url?: string; content_type?: string } | undefined;
          const audioUrl = audio?.url ?? (typeof data.audio_url === 'string' ? data.audio_url as string : undefined);
          if (!audioUrl) throw new FalUserError('The job completed but returned no audio output.');

          // CAS claim (one persister; the finisher shares the row states).
          const { data: claimed } = await supabaseAdmin
            .from('omni_assets')
            .update({ status: 'persisting' })
            .eq('id', id)
            .in('status', ['pending', 'generating'])
            .select('id');
          if (((claimed ?? []) as { id: string }[]).length === 0) return { id, status: 'persisting' };

          const persisted = await persistFalMedia(supabaseAdmin, {
            bucket: AUDIO_BUCKET,
            basePath: `${userId}/omni-podcast/${a.run_id as string}/${id}`,
            falUrl: audioUrl,
            contentType: audio?.content_type ?? 'audio/mpeg',
            maxBytes: EPISODE_MAX_BYTES,
          });
          await supabaseAdmin.from('omni_assets')
            .update({ status: 'done', storage_path: persisted.storagePath, mime_type: persisted.mimeType, metadata: { ...meta, byte_size: persisted.byteSize } })
            .eq('id', id);
          const url = await signAudioPath(supabaseAdmin, persisted.storagePath, userId);
          return { id, status: 'done', url, duration_s: meta.duration_s ?? null };
        } catch (e) {
          const message = e instanceof FalUserError ? e.message : 'Generation failed';
          console.error('omni-podcast: poll error:', e instanceof Error ? e.message : e);
          await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', id);
          return { id, status: 'failed', error: message };
        }
      }));

      return jsonResponse({ results });
    }

    return jsonResponse({ error: 'Invalid action' }, 400);
  } catch (e) {
    if (e instanceof FalUserError) return jsonResponse({ error: e.message }, 400);
    console.error('omni-podcast: unhandled error:', e instanceof Error ? e.message : String(e));
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});
