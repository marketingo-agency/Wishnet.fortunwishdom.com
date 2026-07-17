/**
 * omni-video edge function: the Videos-track backend (Plan 2 Phase 2).
 *
 * A SEPARATE function from omni (EXECUTION_LOG decision: omni's deploy
 * payload sits at the MCP output ceiling) with omni's exact auth model:
 * Bearer + getUser on every request, per-user rate limit, service-role DB
 * access scoped by user_id, signed URLs only, verify_jwt TRUE at the gateway.
 *
 * Actions: video-submit / video-poll / video-utility / scenario-generate /
 * list-voices / voiceover-render / music-generate / assemble-run /
 * transcribe / video-finalize.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rate-limit.ts';
import { FalUserError, assertValidModelId, assertValidRequestId, falStatus, falSubmit } from '../omni/fal-runner.ts';
import { buildHeartDigest, fetchHeartRules, retrieveKnowledge } from '../omni/context.ts';
import {
  UTILITY_ALLOWLIST, buildVideoInput, isAllowedVideoModel, type VideoSubmitParams,
} from './video-specs.ts';
import {
  HARD_MAX_BYTES, IN_REQUEST_MAX_BYTES, claimForPersist, isFalMediaHost, persistFalVideo, signVideoPath,
} from './persist.ts';
import { fetchUrlText, generateScenario } from './scenario.ts';
import { getElevenKey, listVoices, renderVoiceover, type VoiceoverLine } from './audio.ts';
import { assembleRun, mediaUrlFrom } from './assembly.ts';

// 60/min: generation surfaces poll every ~3-4s; one active run fits.
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });

let corsHeaders: Record<string, string> = getCorsHeaders(null);

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type AdminClient = ReturnType<typeof createClient>;

const FAL_NOT_CONFIGURED = 'fal.ai is not configured. Add a fal.ai API key in Settings > LLM Providers.';

async function getFalKey(supabaseAdmin: AdminClient): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from('llm_settings').select('fal_api_key').single();
  if (error) console.error('omni-video: llm_settings read error:', error.message);
  const key = (data?.fal_api_key as string | null) || Deno.env.get('FAL_KEY') || '';
  return key.trim().length > 0 ? key.trim() : null;
}

const QUEUE_BASE = 'https://queue.fal.run';

// Video-capable networks (DB CHECK widened to these 6 in 20260614120000).
const VIDEO_NETWORKS = new Set(['facebook', 'instagram', 'x', 'tiktok', 'youtube', 'pinterest']);

/** Raw queue result normalized to VIDEO output shapes ({video} | {videos[]}).
 *  fal-runner's falResult is image-typed; this is its video twin. */
async function falVideoResult(
  falKey: string,
  modelId: string,
  requestId: string,
): Promise<{ url: string; contentType: string | null; fileSize: number | null }> {
  assertValidModelId(modelId);
  assertValidRequestId(requestId);
  const appId = modelId.split('/').slice(0, 2).join('/');
  const res = await fetch(`${QUEUE_BASE}/${appId}/requests/${requestId}`, {
    headers: { Authorization: `Key ${falKey}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    if (res.status === 422) {
      let detail = '';
      try {
        const body = JSON.parse(bodyText);
        detail = Array.isArray(body.detail)
          ? body.detail.map((d: { msg?: string }) => d.msg ?? 'invalid').join('; ')
          : String(body.detail ?? body.message ?? '');
      } catch { /* keep generic */ }
      // Phase-0 probe verdict: output validators (e.g. Seedance audio) can
      // reject COMPLETED jobs at result time - surface the reason.
      throw new FalUserError(`The model rejected this output${detail ? `: ${detail}` : ''}. Adjust the prompt (or disable audio) and retry.`);
    }
    throw new Error(`fal result failed (${res.status}): ${bodyText.slice(0, 300)}`);
  }
  const data = await res.json() as Record<string, unknown>;
  const candidates: unknown[] = [data.video, data.audio, data.media, ...(Array.isArray(data.videos) ? data.videos : [])];
  for (const c of candidates) {
    const f = c as { url?: string; content_type?: string; file_size?: number } | null;
    if (f && typeof f.url === 'string' && f.url.length > 0) {
      return {
        url: f.url,
        contentType: typeof f.content_type === 'string' ? f.content_type : null,
        fileSize: typeof f.file_size === 'number' ? f.file_size : null,
      };
    }
  }
  // Utility results carry bare URL strings (compose/merge return video_url).
  const bare = mediaUrlFrom(data);
  if (bare) return { url: bare, contentType: null, fileSize: null };
  throw new FalUserError('The job completed but returned no media output.');
}

/** Signed URL for an OWN image asset in the private files bucket (i2v frames). */
async function signFilesPath(supabaseAdmin: AdminClient, path: string, ownerId: string): Promise<string | null> {
  if (!path.startsWith(`${ownerId}/`)) return null;
  const { data, error } = await supabaseAdmin.storage.from('files').createSignedUrl(path, 60 * 60);
  if (error) {
    console.error('omni-video: files sign error:', error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

/** Resolve an OWN asset's storage path + bucket-signed URL (images live in
 *  'files', videos in 'omni-video' - derived from the path prefix layout). */
async function signOwnAsset(supabaseAdmin: AdminClient, assetId: string, ownerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('omni_assets')
    .select('storage_path')
    .eq('id', assetId)
    .eq('user_id', ownerId)
    .maybeSingle();
  const path = (data as { storage_path: string | null } | null)?.storage_path;
  if (!path) return null;
  return path.includes('/omni-videos/')
    ? signVideoPath(supabaseAdmin, path, ownerId, 60 * 60)
    : signFilesPath(supabaseAdmin, path, ownerId);
}

/** video-utility media URLs must be fal outputs or this project's storage. */
function isAllowedMediaUrl(value: string, supabaseUrl: string): boolean {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:') return false;
    if (isFalMediaHost(value)) return true;
    const projectHost = new URL(supabaseUrl).hostname;
    return u.hostname === projectHost && u.pathname.startsWith('/storage/');
  } catch {
    return false;
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

    // -- video-submit -----
    if (action === 'video-submit') {
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);

      const runId = body.run_id;
      const modelId = body.model_id;
      const promptStr = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      const sceneIdx = typeof body.scene_idx === 'number' && Number.isInteger(body.scene_idx) ? body.scene_idx : null;
      const tier = body.tier === 'hero' ? 'hero' : 'draft';
      if (typeof runId !== 'string' || typeof modelId !== 'string') {
        return jsonResponse({ error: 'run_id and model_id are required' }, 400);
      }
      if (!isAllowedVideoModel(modelId)) {
        return jsonResponse({ error: `"${modelId}" is not a supported video model.` }, 400);
      }
      if (promptStr.length === 0) return jsonResponse({ error: 'prompt is required' }, 400);
      if (promptStr.length > 8000) return jsonResponse({ error: 'Prompt is too long (8000 char cap)' }, 400);
      if (!(await ownRun(runId))) return jsonResponse({ error: 'Run not found' }, 404);

      const rawParams = (body.params && typeof body.params === 'object' && !Array.isArray(body.params)
        ? body.params : {}) as Record<string, unknown>;
      const params: VideoSubmitParams = {
        duration: typeof rawParams.duration === 'number' ? rawParams.duration : undefined,
        seconds: typeof rawParams.seconds === 'number' ? rawParams.seconds : undefined,
        aspect: typeof rawParams.aspect === 'string' && rawParams.aspect.length <= 12 ? rawParams.aspect : undefined,
        resolution: typeof rawParams.resolution === 'string' && rawParams.resolution.length <= 8 ? rawParams.resolution : undefined,
        fps: typeof rawParams.fps === 'number' ? rawParams.fps : undefined,
        generateAudio: typeof rawParams.generate_audio === 'boolean' ? rawParams.generate_audio : undefined,
      };

      // i2v frames: OWN asset ids only, resolved + signed server-side.
      const images: { startUrl?: string; endUrl?: string; refUrls?: string[]; audioUrl?: string } = {};
      if (typeof body.start_asset_id === 'string') {
        const url = await signOwnAsset(supabaseAdmin, body.start_asset_id, userId);
        if (!url) return jsonResponse({ error: 'Start frame not found or not persisted yet' }, 400);
        images.startUrl = url;
      }
      if (typeof body.end_asset_id === 'string') {
        const url = await signOwnAsset(supabaseAdmin, body.end_asset_id, userId);
        if (!url) return jsonResponse({ error: 'End frame not found or not persisted yet' }, 400);
        images.endUrl = url;
      }
      // Animate references (Phase 9): OWN image assets and/or Wishpedia
      // entry-image IDS (never raw URLs - the omni variant-submit rule).
      const refUrls: string[] = [];
      if (Array.isArray(body.reference_asset_ids)) {
        for (const id of body.reference_asset_ids.filter((x: unknown) => typeof x === 'string').slice(0, 9)) {
          const url = await signOwnAsset(supabaseAdmin, id, userId);
          if (!url) return jsonResponse({ error: 'A reference asset is missing or not persisted yet' }, 400);
          refUrls.push(url);
        }
      }
      if (Array.isArray(body.wishpedia_image_ids)) {
        const ids = body.wishpedia_image_ids.filter((x: unknown) => typeof x === 'string').slice(0, 9);
        if (ids.length > 0) {
          const { data: rows } = await supabaseAdmin
            .from('wishpedia_entry_images')
            .select('id, storage_path')
            .in('id', ids);
          const found = ((rows ?? []) as { id: string; storage_path: string | null }[]);
          if (found.length !== ids.length) return jsonResponse({ error: 'A Wishpedia reference image was not found' }, 400);
          for (const row of found) {
            if (!row.storage_path) continue;
            // wishpedia-media is a public bucket - getPublicUrl needs no signing.
            const { data: pub } = supabaseAdmin.storage.from('wishpedia-media').getPublicUrl(row.storage_path);
            if (pub?.publicUrl) refUrls.push(pub.publicUrl);
          }
        }
      }
      if (refUrls.length > 0) {
        images.refUrls = refUrls.slice(0, 9);
        // Avatar-style models take ONE image - the first reference drives it.
        if (!images.startUrl) images.startUrl = refUrls[0];
      }
      if (typeof body.audio_asset_id === 'string') {
        const url = await signOwnAsset(supabaseAdmin, body.audio_asset_id, userId);
        if (!url) return jsonResponse({ error: 'The audio track is not ready yet' }, 400);
        images.audioUrl = url;
      }

      const input = buildVideoInput(modelId, promptStr, params, images);

      // KB-GAP rule from Plan 1, verbatim: 'raw' provenance gets the Heart
      // digest server-side; Promptor-engineered prompts are not double-injected.
      const provenance = typeof body.prompt_provenance === 'string' ? body.prompt_provenance : null;
      if (provenance && provenance !== 'promptor' && typeof input.prompt === 'string') {
        let rules;
        try {
          rules = await fetchHeartRules(supabaseAdmin);
        } catch (e) {
          return jsonResponse({ error: e instanceof Error ? e.message : 'Heart rules unavailable' }, 503);
        }
        const digest = buildHeartDigest(rules);
        if (digest) {
          const combined = `${digest}\n${input.prompt}`;
          if (combined.length <= 8000) input.prompt = combined;
        }
      }

      const durationS = typeof input.duration === 'string' ? Number(input.duration)
        : typeof input.duration === 'number' ? input.duration
        : typeof input.num_frames === 'number' ? Math.round((input.num_frames as number) / 30)
        : null;
      const baseMeta = {
        scene_idx: sceneIdx,
        tier,
        duration_s: durationS,
        params: { aspect: input.aspect_ratio ?? null, resolution: input.resolution ?? null },
      };

      const { data: asset, error: assetError } = await supabaseAdmin
        .from('omni_assets')
        .insert({
          user_id: userId,
          run_id: runId,
          kind: 'video',
          model_id: modelId,
          prompt: promptStr,
          status: 'generating',
          metadata: baseMeta,
        })
        .select('id')
        .single();
      if (assetError || !asset) {
        console.error('omni-video: asset insert error:', assetError?.message);
        return jsonResponse({ error: 'Failed to create the clip record' }, 500);
      }
      const assetId = (asset as { id: string }).id;

      try {
        const submission = await falSubmit(falKey, modelId, input);
        await supabaseAdmin
          .from('omni_assets')
          .update({ metadata: { ...baseMeta, fal_request_id: submission.requestId } })
          .eq('id', assetId);
        return jsonResponse({ asset_id: assetId, request_id: submission.requestId, queue_position: submission.queuePosition });
      } catch (e) {
        const message = e instanceof FalUserError ? e.message : 'Generation could not be submitted';
        await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', assetId);
        if (e instanceof FalUserError) return jsonResponse({ asset_id: assetId, error: message }, 400);
        throw e;
      }
    }

    // -- video-poll (batched; CAS-claimed persist per D-V7, memory policy D-V8) -
    if (action === 'video-poll') {
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);

      const assetIds = Array.isArray(body.asset_ids)
        ? body.asset_ids.filter((x: unknown) => typeof x === 'string').slice(0, 12)
        : [];
      if (assetIds.length === 0) return jsonResponse({ error: 'asset_ids is required' }, 400);

      const { data: assets } = await supabaseAdmin
        .from('omni_assets')
        .select('id, run_id, model_id, status, storage_path, error, metadata')
        .in('id', assetIds)
        .eq('user_id', userId);

      const results = await Promise.all(((assets as Record<string, unknown>[] | null) ?? []).map(async (a) => {
        const id = a.id as string;
        const status = a.status as string;
        const meta = (a.metadata ?? {}) as Record<string, unknown>;

        if (status === 'done' && a.storage_path) {
          const url = await signVideoPath(supabaseAdmin, a.storage_path as string, userId);
          const thumb = typeof meta.thumb_path === 'string'
            ? await signVideoPath(supabaseAdmin, meta.thumb_path, userId)
            : null;
          return { id, status: 'done', url, thumb_url: thumb, duration_s: meta.duration_s ?? null };
        }
        if (status === 'failed') return { id, status: 'failed', error: a.error ?? 'Generation failed' };
        if (status === 'discarded') return { id, status: 'discarded' };
        if (status === 'persisting') return { id, status: 'persisting' };

        const requestId = meta.fal_request_id;
        const modelId = a.model_id as string | null;
        if (typeof requestId !== 'string' || !modelId) {
          // Background jobs (voiceover / assembly) have no fal id: their
          // waitUntil worker flips the row - report progress as-is.
          if (meta.kind === 'voiceover' || meta.kind === 'assembly') {
            return { id, status: 'generating' };
          }
          return { id, status: 'failed', error: 'Missing generation reference' };
        }

        try {
          const jobStatus = await falStatus(falKey, modelId, requestId);
          if (jobStatus.status !== 'COMPLETED') {
            return { id, status: 'generating', queue_position: jobStatus.queuePosition };
          }
          const video = await falVideoResult(falKey, modelId, requestId);

          // D-V7: exactly one persister. Losing the claim means the finisher
          // (or a parallel poll) owns it - report 'persisting' and move on.
          if (!(await claimForPersist(supabaseAdmin, id))) {
            return { id, status: 'persisting' };
          }

          const finishPersist = async () => {
            const persisted = await persistFalVideo(supabaseAdmin, userId, a.run_id as string, id, video.url, video.contentType);
            await supabaseAdmin
              .from('omni_assets')
              .update({
                status: 'done',
                storage_path: persisted.storagePath,
                mime_type: persisted.mimeType,
                metadata: { ...meta, byte_size: persisted.byteSize },
              })
              .eq('id', id);
            return persisted;
          };

          // D-V8 memory policy: small files persist in-request; large ones in
          // a background task while the client keeps polling the row.
          if (video.fileSize != null && video.fileSize > HARD_MAX_BYTES) {
            const message = 'The rendered video exceeds the 200MB cap. Split the timeline into shorter parts.';
            await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', id);
            return { id, status: 'failed', error: message };
          }
          if (video.fileSize == null || video.fileSize > IN_REQUEST_MAX_BYTES) {
            EdgeRuntime.waitUntil(finishPersist().catch(async (e) => {
              const message = e instanceof Error ? e.message : 'Persist failed';
              console.error('omni-video: background persist error:', message);
              await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', id);
            }));
            return { id, status: 'persisting' };
          }
          const persisted = await finishPersist();
          const url = await signVideoPath(supabaseAdmin, persisted.storagePath, userId);
          return { id, status: 'done', url, duration_s: meta.duration_s ?? null };
        } catch (e) {
          const message = e instanceof FalUserError ? e.message : 'Generation failed';
          console.error('omni-video: poll error:', e instanceof Error ? e.message : e);
          await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', id);
          return { id, status: 'failed', error: message };
        }
      }));

      return jsonResponse({ results });
    }

    // -- video-utility (allowlisted fal utilities; server-side input shaping) --
    if (action === 'video-utility') {
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);

      const runId = body.run_id;
      const op = typeof body.op === 'string' ? body.op : '';
      const allowedKeys = UTILITY_ALLOWLIST[op];
      if (!allowedKeys) return jsonResponse({ error: 'Unsupported utility operation' }, 400);
      if (!(await ownRun(runId))) return jsonResponse({ error: 'Run not found' }, 404);

      const rawInput = (body.input && typeof body.input === 'object' && !Array.isArray(body.input)
        ? body.input : {}) as Record<string, unknown>;
      const input: Record<string, unknown> = {};
      for (const key of allowedKeys) {
        const v = rawInput[key];
        if (v === undefined || v === null) continue;
        if (key.endsWith('_url')) {
          if (typeof v !== 'string' || !isAllowedMediaUrl(v, supabaseUrl)) {
            return jsonResponse({ error: `${key} must point at fal.media or this project's storage` }, 400);
          }
          input[key] = v;
        } else if (key.endsWith('_urls')) {
          const urls = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 40) : [];
          if (urls.length === 0 || urls.some((u) => !isAllowedMediaUrl(u, supabaseUrl))) {
            return jsonResponse({ error: `${key} must point at fal.media or this project's storage` }, 400);
          }
          input[key] = urls;
        } else if (key === 'tracks') {
          const tracks = Array.isArray(v) ? v.slice(0, 6) : [];
          for (const t of tracks) {
            const track = t as { keyframes?: unknown[] };
            const frames = Array.isArray(track?.keyframes) ? track.keyframes.slice(0, 100) : [];
            for (const f of frames) {
              const url = (f as { url?: unknown })?.url;
              if (typeof url !== 'string' || !isAllowedMediaUrl(url, supabaseUrl)) {
                return jsonResponse({ error: 'Every compose keyframe url must point at fal.media or this project\'s storage' }, 400);
              }
            }
          }
          input.tracks = tracks;
        } else if (typeof v === 'number') {
          input[key] = Math.min(Math.max(v, 0), 100_000);
        } else if (typeof v === 'string' && v.length <= 64) {
          input[key] = v;
        } else if (typeof v === 'boolean') {
          input[key] = v;
        }
      }

      // Short-poll ops (metadata / frame extraction) resolve synchronously.
      const syncOps = new Set(['fal-ai/ffmpeg-api/metadata', 'fal-ai/ffmpeg-api/extract-frame']);
      const submission = await falSubmit(falKey, op, input);
      if (syncOps.has(op)) {
        for (let i = 0; i < 25; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const s = await falStatus(falKey, op, submission.requestId);
          if (s.status === 'COMPLETED') {
            const appId = op.split('/').slice(0, 2).join('/');
            const res = await fetch(`${QUEUE_BASE}/${appId}/requests/${submission.requestId}`, {
              headers: { Authorization: `Key ${falKey}` },
              signal: AbortSignal.timeout(30_000),
            });
            const data = await res.json().catch(() => ({}));
            return jsonResponse({ status: 'done', result: data });
          }
        }
        return jsonResponse({ error: 'The utility timed out. Try again.' }, 504);
      }

      // Long ops become pollable video assets (video-poll persists them).
      const { data: asset, error: assetError } = await supabaseAdmin
        .from('omni_assets')
        .insert({
          user_id: userId,
          run_id: runId,
          kind: 'video',
          model_id: op,
          prompt: null,
          status: 'generating',
          metadata: { utility: op, fal_request_id: submission.requestId },
        })
        .select('id')
        .single();
      if (assetError || !asset) {
        console.error('omni-video: utility asset insert error:', assetError?.message);
        return jsonResponse({ error: 'Failed to create the output record' }, 500);
      }
      return jsonResponse({ asset_id: (asset as { id: string }).id, request_id: submission.requestId });
    }

    // -- list-voices (ElevenLabs picker; key shared via pulse_connections) ----
    if (action === 'list-voices') {
      const key = await getElevenKey(supabaseAdmin);
      if (!key) return jsonResponse({ error: 'ElevenLabs is not connected. Add the key in Pulse Settings.' }, 503);
      try {
        const voices = await listVoices(key);
        return jsonResponse({ voices });
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Could not list voices' }, 502);
      }
    }

    // -- voiceover-render (whisper long-job pattern; polled omni_assets row) --
    if (action === 'voiceover-render') {
      const runId = body.run_id;
      if (!(await ownRun(runId))) return jsonResponse({ error: 'Run not found' }, 404);
      const rawLines = Array.isArray(body.lines) ? body.lines.slice(0, 64) : [];
      const lines: VoiceoverLine[] = rawLines
        .map((l: Record<string, unknown>) => ({
          text: typeof l?.text === 'string' ? l.text.trim().slice(0, 5000) : '',
          voice_id: typeof l?.voice_id === 'string' ? l.voice_id.slice(0, 64) : '',
        }))
        .filter((l: VoiceoverLine) => l.text && l.voice_id);
      if (lines.length === 0) return jsonResponse({ error: 'At least one narration line with a voice is required' }, 400);

      const key = await getElevenKey(supabaseAdmin);
      if (!key) return jsonResponse({ error: 'ElevenLabs is not connected. Add the key in Pulse Settings.' }, 503);

      const { data: asset, error: assetError } = await supabaseAdmin
        .from('omni_assets')
        .insert({
          user_id: userId,
          run_id: runId,
          kind: 'audio',
          model_id: null,
          prompt: null,
          status: 'generating',
          metadata: { kind: 'voiceover', lines: lines.length },
        })
        .select('id')
        .single();
      if (assetError || !asset) {
        console.error('omni-video: voiceover asset insert error:', assetError?.message);
        return jsonResponse({ error: 'Failed to create the voiceover record' }, 500);
      }
      const assetId = (asset as { id: string }).id;
      EdgeRuntime.waitUntil(renderVoiceover({
        supabaseAdmin, ownerId: userId, runId: runId as string, assetId, lines, key,
        modelId: 'eleven_multilingual_v2',
      }));
      return jsonResponse({ asset_id: assetId, status: 'generating' });
    }

    // -- music-generate (lyria2 bed; polled like any fal-backed asset) --------
    if (action === 'music-generate') {
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);
      const runId = body.run_id;
      if (!(await ownRun(runId))) return jsonResponse({ error: 'Run not found' }, 404);
      const prompt = typeof body.prompt === 'string' && body.prompt.trim()
        ? body.prompt.trim().slice(0, 500)
        : 'quiet ambient instrumental bed, soft pads, calm, minimal, background music';

      const { data: asset, error: assetError } = await supabaseAdmin
        .from('omni_assets')
        .insert({
          user_id: userId,
          run_id: runId,
          kind: 'audio',
          model_id: 'fal-ai/lyria2',
          prompt,
          status: 'generating',
          metadata: { kind: 'music' },
        })
        .select('id')
        .single();
      if (assetError || !asset) {
        console.error('omni-video: music asset insert error:', assetError?.message);
        return jsonResponse({ error: 'Failed to create the music record' }, 500);
      }
      const assetId = (asset as { id: string }).id;
      try {
        const submission = await falSubmit(falKey, 'fal-ai/lyria2', { prompt });
        await supabaseAdmin
          .from('omni_assets')
          .update({ metadata: { kind: 'music', fal_request_id: submission.requestId } })
          .eq('id', assetId);
        return jsonResponse({ asset_id: assetId, request_id: submission.requestId });
      } catch (e) {
        const message = e instanceof FalUserError ? e.message : 'Music generation could not be submitted';
        await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', assetId);
        if (e instanceof FalUserError) return jsonResponse({ asset_id: assetId, error: message }, 400);
        throw e;
      }
    }

    // -- assemble-run (merge -> mix -> loudnorm -> persist; background job) ---
    if (action === 'assemble-run') {
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);
      const runId = body.run_id;
      if (!(await ownRun(runId))) return jsonResponse({ error: 'Run not found' }, 404);

      const sceneIds = Array.isArray(body.scene_asset_ids)
        ? body.scene_asset_ids.filter((x: unknown) => typeof x === 'string').slice(0, 32)
        : [];
      if (sceneIds.length === 0) return jsonResponse({ error: 'At least one scene clip is required' }, 400);

      const sceneUrls: string[] = [];
      for (const id of sceneIds) {
        const url = await signOwnAsset(supabaseAdmin, id, userId);
        if (!url) return jsonResponse({ error: 'A scene clip is missing or not persisted yet' }, 400);
        sceneUrls.push(url);
      }
      const voiceoverUrl = typeof body.voiceover_asset_id === 'string'
        ? await signOwnAsset(supabaseAdmin, body.voiceover_asset_id, userId) ?? undefined
        : undefined;
      if (typeof body.voiceover_asset_id === 'string' && !voiceoverUrl) {
        return jsonResponse({ error: 'The voiceover is not ready yet' }, 400);
      }
      const musicUrl = typeof body.music_asset_id === 'string'
        ? await signOwnAsset(supabaseAdmin, body.music_asset_id, userId) ?? undefined
        : undefined;
      if (typeof body.music_asset_id === 'string' && !musicUrl) {
        return jsonResponse({ error: 'The music bed is not ready yet' }, 400);
      }

      const timelineSeconds = Math.min(Math.max(Number(body.timeline_seconds) || 0, 1), 3600);
      const resolution = body.resolution === '720p' ? '720p' : '1080p';
      const fps = body.fps === 24 || body.fps === 25 ? body.fps as number : 30;

      const { data: asset, error: assetError } = await supabaseAdmin
        .from('omni_assets')
        .insert({
          user_id: userId,
          run_id: runId,
          kind: 'video',
          model_id: 'fal-ai/ffmpeg-api/compose',
          prompt: null,
          status: 'generating',
          metadata: { kind: 'assembly', scenes: sceneIds.length, duration_s: timelineSeconds },
        })
        .select('id')
        .single();
      if (assetError || !asset) {
        console.error('omni-video: assembly asset insert error:', assetError?.message);
        return jsonResponse({ error: 'Failed to create the assembly record' }, 500);
      }
      const assetId = (asset as { id: string }).id;
      EdgeRuntime.waitUntil(assembleRun({
        supabaseAdmin, falKey, ownerId: userId, runId: runId as string, assetId,
        sceneUrls, timelineSeconds, voiceoverUrl, musicUrl, resolution, fps,
      }));
      return jsonResponse({ asset_id: assetId, status: 'generating' });
    }

    // -- transcribe (word-level via ElevenLabs Scribe on fal; wizper fallback) -
    if (action === 'transcribe') {
      const falKey = await getFalKey(supabaseAdmin);
      if (!falKey) return jsonResponse({ error: FAL_NOT_CONFIGURED }, 503);
      const assetId = body.asset_id;
      if (typeof assetId !== 'string') return jsonResponse({ error: 'asset_id is required' }, 400);
      const mediaUrl = await signOwnAsset(supabaseAdmin, assetId, userId);
      if (!mediaUrl) return jsonResponse({ error: 'Asset not found or not persisted yet' }, 404);

      const runStt = async (modelId: string, input: Record<string, unknown>) => {
        const submission = await falSubmit(falKey, modelId, input);
        for (let i = 0; i < 90; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const s = await falStatus(falKey, modelId, submission.requestId);
          if (s.status === 'COMPLETED') {
            const appId = modelId.split('/').slice(0, 2).join('/');
            const res = await fetch(`${QUEUE_BASE}/${appId}/requests/${submission.requestId}`, {
              headers: { Authorization: `Key ${falKey}` },
              signal: AbortSignal.timeout(30_000),
            });
            if (!res.ok) throw new Error(`transcription result failed (${res.status})`);
            return await res.json() as Record<string, unknown>;
          }
        }
        throw new Error('Transcription timed out');
      };

      try {
        const result = await runStt('fal-ai/elevenlabs/speech-to-text', { audio_url: mediaUrl });
        return jsonResponse({ engine: 'scribe', result });
      } catch (scribeError) {
        console.warn('omni-video: scribe failed, falling back to wizper:', scribeError instanceof Error ? scribeError.message : scribeError);
        try {
          const result = await runStt('fal-ai/wizper', { audio_url: mediaUrl });
          return jsonResponse({ engine: 'wizper', result });
        } catch (e) {
          return jsonResponse({ error: e instanceof Error ? e.message : 'Transcription failed' }, 502);
        }
      }
    }

    // -- scenario-generate -----
    if (action === 'scenario-generate') {
      const brief = typeof body.brief === 'string' ? body.brief.trim().slice(0, 4000) : '';
      const pasted = typeof body.pasted_text === 'string' ? body.pasted_text.slice(0, 20000) : '';
      const sourceUrl = typeof body.source_url === 'string' ? body.source_url.slice(0, 2000) : '';
      if (!brief && !pasted && !sourceUrl) {
        return jsonResponse({ error: 'Provide a brief, pasted text, or a source URL' }, 400);
      }
      const targetScenes = typeof body.target_scenes === 'number' ? body.target_scenes : 6;
      const secondsPerScene = typeof body.seconds_per_scene === 'number' ? body.seconds_per_scene : 8;

      const { data: llm } = await supabaseAdmin
        .from('llm_settings')
        .select('openai_api_key, gemini_api_key, openai_text_model, gemini_text_model, active_text_provider')
        .single();
      const openaiKey = ((llm?.openai_api_key as string | null) || Deno.env.get('OPENAI_API_KEY') || '').trim();
      const geminiKey = ((llm?.gemini_api_key as string | null) || Deno.env.get('GEMINI_API_KEY') || '').trim();
      if (!openaiKey && !geminiKey) {
        return jsonResponse({ error: 'An OpenAI or Gemini API key is required for scenario generation. Configure one in Settings > LLM Providers.' }, 503);
      }
      const configured = (llm?.active_text_provider as string | null) ?? null;
      const provider = configured === 'gemini' && geminiKey ? 'gemini'
        : configured === 'openai' && openaiKey ? 'openai'
        : openaiKey ? 'openai' : 'gemini';
      const model = provider === 'gemini'
        ? ((llm?.gemini_text_model as string | null) || 'gemini-2.5-flash')
        : ((llm?.openai_text_model as string | null) || 'gpt-4o');

      let heartRules;
      try {
        heartRules = await fetchHeartRules(supabaseAdmin);
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Heart rules unavailable' }, 503);
      }

      const urlText = sourceUrl ? await fetchUrlText(sourceUrl) : '';
      const sourceText = [pasted, urlText].filter(Boolean).join('\n\n').slice(0, 24000);
      const knowledge = openaiKey
        ? await retrieveKnowledge(supabaseAdmin, openaiKey, brief || sourceText.slice(0, 600))
        : [];

      try {
        const scenario = await generateScenario({
          provider, model, keys: { openaiKey, geminiKey },
          heartRules, knowledge,
          brief: brief || 'Derive the brief from the source material.',
          sourceText, targetScenes, secondsPerScene,
        });
        return jsonResponse({ scenario, retrieval: { brain_chunks: knowledge.length, heart_rules: heartRules.length } });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Scenario generation failed';
        console.error('omni-video: scenario error:', message);
        return jsonResponse({ error: message }, 502);
      }
    }

    // -- video-finalize (omni finalize-run mirrored, media_type 'video') -------
    // Lives HERE, not on omni (EXECUTION_LOG deviation: omni's deploy payload
    // sits at the MCP ceiling - zero-risk to the images track).
    if (action === 'video-finalize') {
      const runId = body.run_id;
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : '';
      const description = typeof body.description === 'string' ? body.description.slice(0, 4000) : '';
      const networks = Array.isArray(body.networks)
        ? body.networks.filter((n: unknown) => typeof n === 'string' && VIDEO_NETWORKS.has(n))
        : [];
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
        .select('id, status, mode')
        .eq('id', runId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!run) return jsonResponse({ error: 'Run not found' }, 404);
      const runMode = typeof (run as { mode?: string }).mode === 'string'
        ? (run as { mode: string }).mode
        : 'omni_videos';

      // Plan-2 finalize extension: the assembly's SRT/thumbnail sidecars ride
      // the item metadata (paths only, D-V8) - resolved server-side from the
      // caller's OWN assembly asset, never from client-supplied paths.
      let srtPath: string | null = null;
      let thumbPath: string | null = null;
      let assemblyDurationS: number | null = null;
      if (typeof body.assembly_asset_id === 'string') {
        const { data: assembly } = await supabaseAdmin
          .from('omni_assets')
          .select('metadata')
          .eq('id', body.assembly_asset_id)
          .eq('user_id', userId)
          .eq('run_id', runId)
          .maybeSingle();
        const assemblyMeta = ((assembly as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
        if (typeof assemblyMeta.srt_path === 'string' && assemblyMeta.srt_path.startsWith(`${userId}/`)) srtPath = assemblyMeta.srt_path;
        if (typeof assemblyMeta.thumb_path === 'string' && assemblyMeta.thumb_path.startsWith(`${userId}/`)) thumbPath = assemblyMeta.thumb_path;
        if (typeof assemblyMeta.duration_s === 'number') assemblyDurationS = assemblyMeta.duration_s;
      }

      // Idempotency: finalize is the only path to 'completed' (omni pattern).
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

      // Every referenced asset must belong to the caller AND this run.
      const finalizeAssetIds = itemOnly
        ? itemAssetIds
        : ([...new Set(posts.map((p: Record<string, unknown>) => p.asset_id).filter((x: unknown) => typeof x === 'string'))] as string[]);
      const { data: ownedAssets } = await supabaseAdmin
        .from('omni_assets')
        .select('id')
        .in('id', finalizeAssetIds)
        .eq('user_id', userId)
        .eq('run_id', runId);
      const ownedIds = new Set(((ownedAssets as { id: string }[] | null) ?? []).map((a) => a.id));
      if (finalizeAssetIds.some((id) => !ownedIds.has(id))) {
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
          media_type: 'video',
          metadata: {
            mode: runMode,
            ...(itemOnly ? { asset_ids: itemAssetIds } : {}),
            ...(srtPath ? { srt_path: srtPath } : {}),
            ...(thumbPath ? { thumb_path: thumbPath } : {}),
            ...(assemblyDurationS != null ? { duration_s: assemblyDurationS } : {}),
          },
          created_by: userId,
        })
        .select('id')
        .single();
      if (itemError || !item) {
        console.error('omni-video: library item insert error:', itemError?.message);
        return jsonResponse({ error: 'Failed to create the Content Library item' }, 500);
      }
      const itemId = (item as { id: string }).id;

      let postsCreated = 0;
      if (!itemOnly) {
        const postRows = posts
          .filter((p: Record<string, unknown>) => typeof p.network === 'string' && VIDEO_NETWORKS.has(p.network as string) && typeof p.asset_id === 'string')
          .map((p: Record<string, unknown>) => ({
            item_id: itemId,
            network: p.network as string,
            asset_id: p.asset_id as string,
            caption: typeof p.caption === 'string' ? p.caption.slice(0, 4000) : description || null,
            status: 'draft',
            media_type: 'video',
            created_by: userId,
          }));
        const { error: postsError } = await supabaseAdmin.from('content_library_posts').insert(postRows);
        if (postsError) {
          console.error('omni-video: library posts insert error:', postsError.message);
          // No transaction via supabase-js: roll the item back so a posts
          // failure never leaves an orphaned library entry (omni P1 lesson).
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
    if (e instanceof FalUserError) return jsonResponse({ error: e.message }, 400);
    console.error('omni-video: unhandled error:', e instanceof Error ? e.message : String(e));
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});
