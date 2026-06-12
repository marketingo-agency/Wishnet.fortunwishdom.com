/**
 * Content Library dispatch edge function.
 *
 * Drives the posting queue on content_library_posts: instant posting,
 * scheduling, and the cron-fired dispatcher that publishes due posts through
 * per-network connectors. Built as its OWN function so the Pulse edge
 * (pulse-api) stays untouched (Omni spec rule 3).
 *
 * Auth model (verify_jwt=false, SEC-006 in-function pattern):
 * - Admin path: Bearer JWT -> getUser -> is_admin RPC (all actions).
 * - Cron path: action 'dispatch-due' with cron_secret matching the
 *   admin-only pulse_connections row provider='omni_dispatch' (seeded by
 *   migration). pg_cron + pg_net post it every 5 minutes.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rate-limit.ts';
import { CONNECTORS, NotConnectedError, type ConnectionRow, type ConnectionsMap } from './connectors.ts';

const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });

let corsHeaders: Record<string, string> = getCorsHeaders(null);

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type AdminClient = ReturnType<typeof createClient>;

async function loadConnections(supabaseAdmin: AdminClient): Promise<ConnectionsMap> {
  const { data } = await supabaseAdmin
    .from('pulse_connections')
    .select('provider, api_key, meta_app_id, meta_app_secret, meta_page_tokens, config, status');
  const map: ConnectionsMap = new Map();
  for (const row of (data as ConnectionRow[] | null) ?? []) {
    map.set(row.provider, {
      ...row,
      meta_page_tokens: (row.meta_page_tokens ?? {}) as Record<string, string>,
      config: (row.config ?? {}) as Record<string, unknown>,
    });
  }
  return map;
}

interface PostRow {
  id: string;
  item_id: string;
  network: string;
  asset_id: string | null;
  caption: string | null;
  status: string;
  scheduled_at: string | null;
}

/** Publish one post through its connector; mutates the row to a terminal/parked state. */
async function dispatchPost(supabaseAdmin: AdminClient, post: PostRow, connections: ConnectionsMap): Promise<string> {
  const connector = CONNECTORS[post.network];
  if (!connector) {
    await supabaseAdmin.from('content_library_posts')
      .update({ status: 'failed', error: `Unknown network: ${post.network}` })
      .eq('id', post.id);
    return 'failed';
  }

  if (!connector.isConfigured(connections)) {
    await supabaseAdmin.from('content_library_posts')
      .update({ status: 'queued', error: connector.statusDetail(connections) })
      .eq('id', post.id);
    return 'queued';
  }

  if (!post.asset_id) {
    await supabaseAdmin.from('content_library_posts')
      .update({ status: 'failed', error: 'Post has no image asset' })
      .eq('id', post.id);
    return 'failed';
  }
  const { data: asset } = await supabaseAdmin
    .from('omni_assets')
    .select('storage_path')
    .eq('id', post.asset_id)
    .maybeSingle();
  const storagePath = (asset as { storage_path: string | null } | null)?.storage_path;
  if (!storagePath) {
    await supabaseAdmin.from('content_library_posts')
      .update({ status: 'failed', error: 'Image asset is missing from storage' })
      .eq('id', post.id);
    return 'failed';
  }
  const { data: signed } = await supabaseAdmin.storage.from('files').createSignedUrl(storagePath, 60 * 60);
  const imageUrl = signed?.signedUrl;
  if (!imageUrl) {
    await supabaseAdmin.from('content_library_posts')
      .update({ status: 'failed', error: 'Could not sign the image asset' })
      .eq('id', post.id);
    return 'failed';
  }

  try {
    const result = await connector.publish({ caption: post.caption ?? '', imageUrl }, connections);
    await supabaseAdmin.from('content_library_posts')
      .update({ status: 'posted', external_post_id: result.externalId, posted_at: new Date().toISOString(), error: null })
      .eq('id', post.id);
    return 'posted';
  } catch (e) {
    if (e instanceof NotConnectedError) {
      await supabaseAdmin.from('content_library_posts')
        .update({ status: 'queued', error: e.message })
        .eq('id', post.id);
      return 'queued';
    }
    const message = e instanceof Error ? e.message.slice(0, 500) : 'Publish failed';
    console.error('Content Library: publish error:', message);
    await supabaseAdmin.from('content_library_posts')
      .update({ status: 'failed', error: message })
      .eq('id', post.id);
    return 'failed';
  }
}

/** Find and dispatch everything due: scheduled posts past their time, plus parked queued posts. */
async function dispatchDue(supabaseAdmin: AdminClient): Promise<Record<string, number>> {
  const nowIso = new Date().toISOString();
  const { data: scheduled } = await supabaseAdmin
    .from('content_library_posts')
    .select('id, item_id, network, asset_id, caption, status, scheduled_at')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso)
    .limit(20);
  const { data: queued } = await supabaseAdmin
    .from('content_library_posts')
    .select('id, item_id, network, asset_id, caption, status, scheduled_at')
    .eq('status', 'queued')
    .limit(20);

  const posts = [...((scheduled as PostRow[] | null) ?? []), ...((queued as PostRow[] | null) ?? [])];
  const summary: Record<string, number> = { posted: 0, queued: 0, failed: 0 };
  if (posts.length === 0) return summary;

  const connections = await loadConnections(supabaseAdmin);
  for (const post of posts) {
    const outcome = await dispatchPost(supabaseAdmin, post, connections);
    summary[outcome] = (summary[outcome] ?? 0) + 1;
  }
  return summary;
}

const SETTABLE_PROVIDERS = new Set(['x', 'tiktok']);

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = typeof body?.action === 'string' ? body.action : '';

    // Cron path: dispatch-due with the DB-seeded secret, no user session.
    if (action === 'dispatch-due' && typeof body.cron_secret === 'string') {
      const { data: secretRow } = await supabaseAdmin
        .from('pulse_connections')
        .select('api_key')
        .eq('provider', 'omni_dispatch')
        .maybeSingle();
      const expected = (secretRow as { api_key: string | null } | null)?.api_key;
      if (!expected || body.cron_secret !== expected) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
      const summary = await dispatchDue(supabaseAdmin);
      return jsonResponse({ success: true, via: 'cron', ...summary });
    }

    // Admin path: bearer JWT + is_admin for every action.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const userId = user.id;

    if (rateLimiter.check(userId)) {
      return jsonResponse({ error: 'Rate limit exceeded. Please wait a moment and try again.' }, 429);
    }

    const { data: isAdmin, error: adminErr } = await supabaseAdmin.rpc('is_admin', { _user_id: userId });
    if (adminErr || !isAdmin) return jsonResponse({ error: 'Admin access required' }, 403);

    // ── dispatch-due (manual "Run dispatch now") ──────────────────────────────
    if (action === 'dispatch-due') {
      const summary = await dispatchDue(supabaseAdmin);
      return jsonResponse({ success: true, via: 'manual', ...summary });
    }

    // ── post-now ─────────────────────────────────────────────────────────────
    if (action === 'post-now') {
      const postId = body.post_id;
      if (typeof postId !== 'string') return jsonResponse({ error: 'post_id is required' }, 400);
      const { data: post } = await supabaseAdmin
        .from('content_library_posts')
        .select('id, item_id, network, asset_id, caption, status, scheduled_at')
        .eq('id', postId)
        .maybeSingle();
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      if ((post as PostRow).status === 'posted') return jsonResponse({ error: 'Already posted' }, 400);
      const connections = await loadConnections(supabaseAdmin);
      const outcome = await dispatchPost(supabaseAdmin, post as PostRow, connections);
      return jsonResponse({ success: true, outcome });
    }

    // ── schedule-post / unschedule-post ──────────────────────────────────────
    if (action === 'schedule-post') {
      const postId = body.post_id;
      const scheduledAt = body.scheduled_at;
      if (typeof postId !== 'string' || typeof scheduledAt !== 'string' || Number.isNaN(Date.parse(scheduledAt))) {
        return jsonResponse({ error: 'post_id and a valid scheduled_at are required' }, 400);
      }
      const { error } = await supabaseAdmin
        .from('content_library_posts')
        .update({ status: 'scheduled', scheduled_at: new Date(scheduledAt).toISOString(), error: null })
        .eq('id', postId)
        .neq('status', 'posted');
      if (error) return jsonResponse({ error: 'Failed to schedule the post' }, 500);
      return jsonResponse({ success: true });
    }
    if (action === 'unschedule-post') {
      const postId = body.post_id;
      if (typeof postId !== 'string') return jsonResponse({ error: 'post_id is required' }, 400);
      const { error } = await supabaseAdmin
        .from('content_library_posts')
        .update({ status: 'draft', scheduled_at: null, error: null })
        .eq('id', postId)
        .neq('status', 'posted');
      if (error) return jsonResponse({ error: 'Failed to unschedule the post' }, 500);
      return jsonResponse({ success: true });
    }

    // ── connections-status ───────────────────────────────────────────────────
    if (action === 'connections-status') {
      const connections = await loadConnections(supabaseAdmin);
      const networks = Object.fromEntries(
        Object.values(CONNECTORS).map((c) => [
          c.network,
          { connected: c.isConfigured(connections), detail: c.statusDetail(connections) },
        ]),
      );
      return jsonResponse({ networks });
    }

    // ── set-connection (x / tiktok credential rows) ──────────────────────────
    if (action === 'set-connection') {
      const provider = body.provider;
      if (typeof provider !== 'string' || !SETTABLE_PROVIDERS.has(provider)) {
        return jsonResponse({ error: 'provider must be x or tiktok' }, 400);
      }
      const apiKey = typeof body.api_key === 'string' && body.api_key.trim() ? body.api_key.trim().slice(0, 4096) : null;
      const config = body.config && typeof body.config === 'object' && !Array.isArray(body.config)
        ? body.config as Record<string, unknown>
        : {};
      const { data: existing } = await supabaseAdmin
        .from('pulse_connections')
        .select('id')
        .eq('provider', provider)
        .maybeSingle();
      const patch = { api_key: apiKey, config, status: apiKey ? 'connected' : 'disconnected' };
      const { error } = existing
        ? await supabaseAdmin.from('pulse_connections').update(patch).eq('provider', provider)
        : await supabaseAdmin.from('pulse_connections').insert({ provider, ...patch });
      if (error) return jsonResponse({ error: 'Failed to save the connection' }, 500);
      return jsonResponse({ success: true });
    }

    // ── library-asset-urls (cross-user signed URLs for the admin library) ────
    if (action === 'library-asset-urls') {
      const assetIds = Array.isArray(body.asset_ids)
        ? body.asset_ids.filter((x: unknown) => typeof x === 'string').slice(0, 60)
        : [];
      if (assetIds.length === 0) return jsonResponse({ error: 'asset_ids is required' }, 400);
      const { data: assets } = await supabaseAdmin
        .from('omni_assets')
        .select('id, storage_path')
        .in('id', assetIds);
      const urls: Record<string, string> = {};
      for (const a of (assets as { id: string; storage_path: string | null }[] | null) ?? []) {
        if (!a.storage_path) continue;
        const { data: signed } = await supabaseAdmin.storage.from('files').createSignedUrl(a.storage_path, 60 * 60 * 24);
        if (signed?.signedUrl) urls[a.id] = signed.signedUrl;
      }
      return jsonResponse({ urls });
    }

    return jsonResponse({ error: 'Invalid action' }, 400);
  } catch (e) {
    console.error('Content Library: unhandled error:', e instanceof Error ? e.message : String(e));
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});
