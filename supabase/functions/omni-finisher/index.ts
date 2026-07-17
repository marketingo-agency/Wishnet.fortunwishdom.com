/**
 * omni-finisher: the tab-closed completion sweep for video assets (Plan 2
 * D-V7). pg_cron fires this every 2 minutes via pg_net.
 *
 * DEPLOYED verify_jwt=false BY DESIGN (landmine #12: pg_net cannot carry a
 * user JWT, so a verify_jwt=true function 401s at the gateway before code
 * runs). Auth = a DB-seeded cron_secret validated in-function with a
 * constant-time compare - the exact content-library cron pattern.
 *
 * Sweep: video assets stuck in pending/generating (>90s untouched) with a
 * fal_request_id, plus stale 'persisting' claims (>10 min) - poll fal, take
 * the CAS claim, persist, flip the row. Exactly one of client-poll/finisher
 * ever persists an asset (the claim is the guard).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { FalUserError, assertValidModelId, assertValidRequestId, falStatus } from '../omni/fal-runner.ts';
import { claimForPersist, persistFalVideo } from '../omni-video/persist.ts';

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
  const candidates: unknown[] = [data.video, ...(Array.isArray(data.videos) ? data.videos : [])];
  for (const c of candidates) {
    const f = c as { url?: string; content_type?: string } | null;
    if (f && typeof f.url === 'string' && f.url.length > 0) {
      return { url: f.url, contentType: typeof f.content_type === 'string' ? f.content_type : null };
    }
  }
  throw new FalUserError('The job completed but returned no video output.');
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
    .eq('kind', 'video')
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
      const persisted = await persistFalVideo(supabaseAdmin, row.user_id, row.run_id, row.id, video.url, video.contentType);
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
    return json({ success: true, ...summary });
  } catch (e) {
    console.error('omni-finisher: unhandled error:', e instanceof Error ? e.message : String(e));
    return json({ error: 'Internal error' }, 500);
  }
});
