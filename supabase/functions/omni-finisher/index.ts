/**
 * omni-finisher: the tab-closed completion sweep for video AND podcast
 * assets (Plan 2 D-V7 + Plan 3 D-A3.3). pg_cron fires this every 2 minutes
 * via pg_net.
 *
 * DEPLOYED verify_jwt=false BY DESIGN (landmine #12: pg_net cannot carry a
 * user JWT, so a verify_jwt=true function 401s at the gateway before code
 * runs). Auth = a DB-seeded cron_secret validated in-function with a
 * constant-time compare - the exact content-library cron pattern.
 *
 * Three branches per sweep:
 *  1. fal poller: video/audio rows with a fal_request_id stuck in
 *     pending/generating (>90s) or stale 'persisting' (>10 min) - poll fal,
 *     CAS-claim, persist (bucket-aware: podcast rows land in omni-audio).
 *  2. TTS worker (Plan 3): ONE stale unclaimed podcast_chunk per sweep -
 *     CAS-claim, execute the ElevenLabs render, persist. Chunks have no
 *     fal_request_id and are invisible to branch 1 (landmine #11).
 *  3. Assembly tail (Plan 3): a run whose chunks are ALL done and whose
 *     step_state.render_stage is 'chunks' gets its merge-audios submitted
 *     (jingle ids from step_state) - branch 1 then persists the result.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { FalUserError, assertValidModelId, assertValidRequestId, falStatus, falSubmit } from '../omni/fal-runner.ts';
import { claimForPersist, persistFalVideo } from '../omni-video/persist.ts';
import { persistFalMedia } from '../_shared/fal.ts';
import { getElevenKey, renderLines, type SpeakerLine } from '../_shared/elevenlabs.ts';

type AdminClient = ReturnType<typeof createClient>;

const SWEEP_LIMIT = 10;
const STALE_GENERATING_MS = 90_000;
const STALE_PERSISTING_MS = 10 * 60_000;
const QUEUE_BASE = 'https://queue.fal.run';

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Constant-time secret comparison (digest both sides first). */
async function secretsMatch(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const xa = new Uint8Array(da);
  const xb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < xa.length; i++) diff |= xa[i] ^ xb[i];
  return diff === 0;
}

async function falVideoResult(
  falKey: string,
  modelId: string,
  requestId: string,
): Promise<{ url: string; contentType: string | null }> {
  assertValidModelId(modelId);
  assertValidRequestId(requestId);
  const appId = modelId.split('/').slice(0, 2).join('/');
  const res = await fetch(`${QUEUE_BASE}/${appId}/requests/${requestId}`, {
    headers: { Authorization: `Key ${falKey}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    if (res.status === 422) {
      throw new FalUserError('The model rejected this output at result time.');
    }
    throw new Error(`fal result failed (${res.status})`);
  }
  const data = await res.json() as Record<string, unknown>;
  const candidates: unknown[] = [data.video, data.audio, data.media, ...(Array.isArray(data.videos) ? data.videos : [])];
  for (const c of candidates) {
    const f = c as { url?: string; content_type?: string } | null;
    if (f && typeof f.url === 'string' && f.url.length > 0) {
      return { url: f.url, contentType: typeof f.content_type === 'string' ? f.content_type : null };
    }
  }
  // Utility results carry bare URL strings (compose/merge return video_url).
  for (const key of ['video_url', 'audio_url']) {
    const v = data[key];
    if (typeof v === 'string' && v.length > 0) return { url: v, contentType: null };
  }
  throw new FalUserError('The job completed but returned no media output.');
}

interface SweepRow {
  id: string;
  user_id: string;
  run_id: string;
  model_id: string | null;
  status: string;
  metadata: Record<string, unknown>;
}

async function sweep(supabaseAdmin: AdminClient, falKey: string): Promise<Record<string, number>> {
  const genCutoff = new Date(Date.now() - STALE_GENERATING_MS).toISOString();
  const persistCutoff = new Date(Date.now() - STALE_PERSISTING_MS).toISOString();

  const { data, error } = await supabaseAdmin
    .from('omni_assets')
    .select('id, user_id, run_id, model_id, status, metadata')
    .in('kind', ['video', 'audio'])
    .or(`and(status.in.(pending,generating),updated_at.lt.${genCutoff}),and(status.eq.persisting,updated_at.lt.${persistCutoff})`)
    .order('updated_at', { ascending: true })
    .limit(SWEEP_LIMIT);
  if (error) {
    console.error('omni-finisher: sweep query error:', error.message);
    return { swept: 0, persisted: 0, failed: 0, waiting: 0 };
  }

  const rows = ((data ?? []) as SweepRow[]).filter((r) => typeof r.metadata?.fal_request_id === 'string');
  const summary = { swept: rows.length, persisted: 0, failed: 0, waiting: 0 };

  for (const row of rows) {
    const requestId = row.metadata.fal_request_id as string;
    const modelId = row.model_id;
    if (!modelId) continue;
    try {
      const status = await falStatus(falKey, modelId, requestId);
      if (status.status !== 'COMPLETED') {
        summary.waiting += 1;
        continue;
      }
      const video = await falVideoResult(falKey, modelId, requestId);
      // Stale-persisting rows are reclaimable; fresh ones respect the claim.
      if (!(await claimForPersist(supabaseAdmin, row.id, row.status === 'persisting'))) {
        summary.waiting += 1;
        continue;
      }
      const isPodcast = typeof row.metadata?.kind === 'string' && String(row.metadata.kind).startsWith('podcast_');
      const persisted = isPodcast
        ? await persistFalMedia(supabaseAdmin, {
          bucket: 'omni-audio',
          basePath: `${row.user_id}/omni-podcast/${row.run_id}/${row.id}`,
          falUrl: video.url,
          contentType: video.contentType ?? 'audio/mpeg',
          maxBytes: 200 * 1024 * 1024,
        })
        : await persistFalVideo(supabaseAdmin, row.user_id, row.run_id, row.id, video.url, video.contentType);
      await supabaseAdmin
        .from('omni_assets')
        .update({
          status: 'done',
          storage_path: persisted.storagePath,
          mime_type: persisted.mimeType,
          metadata: { ...row.metadata, byte_size: persisted.byteSize, finished_by: 'finisher' },
        })
        .eq('id', row.id);
      summary.persisted += 1;
    } catch (e) {
      const message = e instanceof FalUserError ? e.message : 'Generation failed';
      console.error('omni-finisher: row error:', row.id, e instanceof Error ? e.message : e);
      // Only user-visible fal rejections mark the row failed; transient
      // errors leave it for the next sweep.
      if (e instanceof FalUserError) {
        await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', row.id);
        summary.failed += 1;
      }
    }
  }
  return summary;
}

/**
 * Plan 3 branch 2: render ONE stale unclaimed podcast chunk per sweep.
 * Pending chunks older than 90s (the interactive path gets first shot) or
 * 'generating' rows stale >10 min (a killed worker) are eligible.
 */
async function ttsSweep(supabaseAdmin: AdminClient): Promise<number> {
  const key = await getElevenKey(supabaseAdmin);
  if (!key) return 0;
  const genCutoff = new Date(Date.now() - 90_000).toISOString();
  const staleCutoff = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data } = await supabaseAdmin
    .from('omni_assets')
    .select('id, user_id, run_id, status, metadata')
    .eq('kind', 'audio')
    .or(`and(status.eq.pending,created_at.lt.${genCutoff}),and(status.eq.generating,updated_at.lt.${staleCutoff})`)
    .order('created_at', { ascending: true })
    .limit(20);
  const chunk = (((data ?? []) as SweepRow[]))
    .find((r) => r.metadata?.kind === 'podcast_chunk' && typeof r.metadata?.fal_request_id !== 'string');
  if (!chunk) return 0;

  // CAS-claim (pending -> generating; or refresh a stale generating row).
  const { data: claimed } = await supabaseAdmin
    .from('omni_assets')
    .update({ status: 'generating' })
    .eq('id', chunk.id)
    .in('status', ['pending', 'generating'])
    .select('id');
  if (((claimed ?? []) as { id: string }[]).length === 0) return 0;

  try {
    const lines = (chunk.metadata?.lines ?? []) as SpeakerLine[];
    if (!Array.isArray(lines) || lines.length === 0) throw new Error('The chapter has no renderable lines');
    const ttsModel = typeof chunk.metadata?.tts_model === 'string' ? chunk.metadata.tts_model as string : 'eleven_multilingual_v2';
    const { bytes, words } = await renderLines(key, lines, ttsModel);
    if (bytes.length > 20 * 1024 * 1024) throw new Error('This chapter renders above the 20MB chunk cap; split it.');
    const storagePath = `${chunk.user_id}/omni-podcast/${chunk.run_id}/chunk-${chunk.id}.mp3`;
    const { error: upErr } = await supabaseAdmin.storage
      .from('omni-audio')
      .upload(storagePath, bytes, { contentType: 'audio/mpeg', upsert: true });
    if (upErr) throw new Error(upErr.message);
    await supabaseAdmin
      .from('omni_assets')
      .update({
        status: 'done',
        storage_path: storagePath,
        mime_type: 'audio/mpeg',
        metadata: { ...chunk.metadata, byte_size: bytes.length, duration_s: Math.max(1, Math.round(words / 2.5)), finished_by: 'finisher' },
      })
      .eq('id', chunk.id);
    return 1;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Chapter render failed';
    console.error('omni-finisher: TTS chunk error:', chunk.id, message);
    await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', chunk.id);
    return 0;
  }
}

/**
 * Plan 3 branch 3: submit the merge for runs whose chunks are all done and
 * whose step_state.render_stage is 'chunks' (set by the client at render
 * start; jingle ids ride step_state too). Branch 1 persists the result.
 */
async function assemblySweep(supabaseAdmin: AdminClient, falKey: string): Promise<number> {
  const { data: runs } = await supabaseAdmin
    .from('omni_runs')
    .select('id, user_id, step_state')
    .eq('mode', 'omni_podcast')
    .eq('status', 'active')
    .limit(20);
  let submitted = 0;
  for (const run of ((runs ?? []) as { id: string; user_id: string; step_state: Record<string, unknown> | null }[])) {
    const state = run.step_state ?? {};
    if (state.render_stage !== 'chunks') continue;
    const { data: rows } = await supabaseAdmin
      .from('omni_assets')
      .select('id, status, storage_path, metadata')
      .eq('run_id', run.id)
      .eq('kind', 'audio');
    const assets = (rows ?? []) as { id: string; status: string; storage_path: string | null; metadata: Record<string, unknown> | null }[];
    const chunks = assets
      .filter((a) => a.metadata?.kind === 'podcast_chunk')
      .sort((a, b) => Number(a.metadata?.chapter_idx ?? 0) - Number(b.metadata?.chapter_idx ?? 0));
    if (chunks.length === 0 || chunks.some((c) => c.status !== 'done' || !c.storage_path)) continue;
    if (assets.some((a) => a.metadata?.kind === 'podcast_episode')) continue; // already assembling

    const sign = async (path: string): Promise<string | null> => {
      if (!path.startsWith(`${run.user_id}/`)) return null;
      const { data } = await supabaseAdmin.storage.from('omni-audio').createSignedUrl(path, 60 * 60);
      return data?.signedUrl ?? null;
    };
    const urls: string[] = [];
    const jingle = async (idField: string) => {
      const id = state[idField];
      if (typeof id !== 'string') return null;
      const a = assets.find((x) => x.id === id && x.status === 'done' && x.storage_path);
      return a ? sign(a.storage_path!) : null;
    };
    const intro = await jingle('intro_jingle_asset_id');
    if (intro) urls.push(intro);
    let ok = true;
    for (const c of chunks) {
      const u = await sign(c.storage_path!);
      if (!u) { ok = false; break; }
      urls.push(u);
    }
    if (!ok) continue;
    const outro = await jingle('outro_jingle_asset_id');
    if (outro) urls.push(outro);

    const { data: episodeAsset } = await supabaseAdmin
      .from('omni_assets')
      .insert({
        user_id: run.user_id,
        run_id: run.id,
        kind: 'audio',
        model_id: 'fal-ai/ffmpeg-api/merge-audios',
        prompt: null,
        status: 'generating',
        metadata: { kind: 'podcast_episode', chapters: chunks.length },
      })
      .select('id')
      .single();
    if (!episodeAsset) continue;
    const episodeId = (episodeAsset as { id: string }).id;
    try {
      const submission = await falSubmit(falKey, 'fal-ai/ffmpeg-api/merge-audios', { audio_urls: urls });
      await supabaseAdmin.from('omni_assets')
        .update({ metadata: { kind: 'podcast_episode', chapters: chunks.length, fal_request_id: submission.requestId, finished_by: 'finisher' } })
        .eq('id', episodeId);
      await supabaseAdmin.from('omni_runs')
        .update({ step_state: { ...state, render_stage: 'assembling' } })
        .eq('id', run.id);
      submitted += 1;
    } catch (e) {
      const message = e instanceof FalUserError ? e.message : 'Episode assembly could not be submitted';
      console.error('omni-finisher: assembly error:', run.id, message);
      await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', episodeId);
    }
  }
  return submitted;
}

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    if (typeof body.cron_secret !== 'string') return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: secretRow } = await supabaseAdmin
      .from('pulse_connections')
      .select('api_key')
      .eq('provider', 'omni_video_finisher')
      .maybeSingle();
    const expected = (secretRow as { api_key: string | null } | null)?.api_key;
    if (!expected || !(await secretsMatch(body.cron_secret, expected))) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { data: llm } = await supabaseAdmin.from('llm_settings').select('fal_api_key').single();
    const falKey = ((llm?.fal_api_key as string | null) || Deno.env.get('FAL_KEY') || '').trim();
    if (!falKey) return json({ swept: 0, note: 'fal not configured' });

    const summary = await sweep(supabaseAdmin, falKey);
    const tts = await ttsSweep(supabaseAdmin);
    const assembled = await assemblySweep(supabaseAdmin, falKey);
    return json({ success: true, ...summary, tts_rendered: tts, assemblies_submitted: assembled });
  } catch (e) {
    console.error('omni-finisher: unhandled error:', e instanceof Error ? e.message : String(e));
    return json({ error: 'Internal error' }, 500);
  }
});
