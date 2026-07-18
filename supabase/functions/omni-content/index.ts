/**
 * omni-content edge function: the Content hub / Publishing Desk backend.
 *
 * A manual-handoff publisher (NOT an auto-poster): admins stage posts (media +
 * per-network captions/post types + a schedule); any admin works the Publish
 * Queue, downloads the asset, posts it manually elsewhere, and marks the
 * target published. Data is admin-SHARED (created_by / published_by give the
 * trail) - the whisper/pulse admin model, not Omni's per-user runs.
 *
 * Security: Bearer -> getUser -> is_admin gate on EVERY action; per-user rate
 * limit; service-role DB access; private omni-content bucket, signed URLs
 * only; register-media re-validates client-uploaded objects (uploader
 * namespace + post binding + MIME allowlist + server-derived size).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rate-limit.ts';
import { fetchHeartRules, retrieveKnowledge } from '../omni/context.ts';
import { generateDeskCaptions, type CaptionTargetInput } from './captions.ts';
import {
  NETWORK_TO_PROVIDER, createScheduledPost, deleteScheduledPost, fetchBrands,
  fetchPinterestBoards, getScheduledPostStatus, normalizeMedia,
  type MetricoolAuth, type TargetPushInput,
} from './metricool.ts';

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });

let corsHeaders: Record<string, string> = getCorsHeaders(null);

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type AdminClient = ReturnType<typeof createClient>;

const BUCKET = 'omni-content';
const SIGNED_TTL = 60 * 60;
const NETWORKS = new Set(['facebook', 'instagram', 'x', 'tiktok', 'youtube', 'pinterest', 'other']);
const ALLOWED_MIME: Record<string, 'image' | 'video'> = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface TargetRow {
  id: string;
  post_id: string;
  network: string;
  network_label: string | null;
  post_type: string;
  caption: string;
  status: string;
  published_at: string | null;
  published_by: string | null;
  published_url: string | null;
}

interface MediaRow {
  id: string;
  post_id: string;
  kind: string;
  storage_path: string;
  mime_type: string;
  sort: number;
  width: number | null;
  height: number | null;
  byte_size: number | null;
}

/** Whitelist + shape one incoming target payload; null on invalid.
 *  'other' networks can never ride the auto lane (no Metricool provider). */
function cleanTarget(raw: unknown): (Omit<TargetRow, 'id' | 'post_id' | 'status' | 'published_at' | 'published_by' | 'published_url'> & { publish_mode: string }) | null {
  const t = (raw ?? {}) as Record<string, unknown>;
  const network = typeof t.network === 'string' ? t.network : '';
  if (!NETWORKS.has(network)) return null;
  return {
    network,
    network_label: network === 'other' && typeof t.network_label === 'string'
      ? t.network_label.trim().slice(0, 60) || null
      : null,
    post_type: typeof t.post_type === 'string' ? t.post_type.trim().slice(0, 60) : '',
    caption: typeof t.caption === 'string' ? t.caption.slice(0, 6000) : '',
    publish_mode: t.publish_mode === 'auto' && network !== 'other' ? 'auto' : 'manual',
  };
}

/** Derive the post status from its targets. Archived is sticky; the approval
 *  states (pending_approval / approved) are preserved until publishing
 *  actually progresses. */
async function recomputePostStatus(admin: AdminClient, postId: string): Promise<string> {
  const { data: post } = await admin
    .from('omni_content_posts')
    .select('status, scheduled_at')
    .eq('id', postId)
    .maybeSingle();
  if (!post) return 'draft';
  const p = post as { status: string; scheduled_at: string | null };
  if (p.status === 'archived') return 'archived';
  const { data: targets } = await admin
    .from('omni_content_targets')
    .select('status')
    .eq('post_id', postId);
  const rows = (targets ?? []) as { status: string }[];
  const published = rows.filter((t) => t.status === 'published').length;
  const next = rows.length > 0 && published === rows.length
    ? 'published'
    : published > 0
      ? 'partially_published'
      : (p.status === 'pending_approval' || p.status === 'approved')
        ? p.status
        : p.scheduled_at
          ? 'scheduled'
          : 'draft';
  await admin.from('omni_content_posts').update({ status: next }).eq('id', postId);
  return next;
}

interface ConnectionRow {
  id: string;
  api_token: string;
  metricool_user_id: string;
  blog_id: string | null;
  brand_label: string | null;
  brand_timezone: string | null;
  networks: Record<string, string>;
  pinterest_boards: { id: string; name: string }[];
  last_checked_at: string | null;
}

async function getConnection(admin: AdminClient): Promise<ConnectionRow | null> {
  const { data } = await admin
    .from('omni_content_connections')
    .select('*')
    .eq('provider', 'metricool')
    .maybeSingle();
  return (data as ConnectionRow | null) ?? null;
}

const connAuth = (c: ConnectionRow): MetricoolAuth => ({
  token: c.api_token,
  userId: c.metricool_user_id,
  blogId: c.blog_id,
});

interface ArmedTargetRow extends TargetRow {
  publish_mode: string;
  metricool_post_id: string | null;
  metricool_status: string | null;
  sync_error: string | null;
  last_synced_at: string | null;
}

/** Pull Metricool per-provider status onto our armed, not-yet-published
 *  targets. Safe to run repeatedly; recomputes each touched post. */
async function syncArmedTargets(admin: AdminClient, conn: ConnectionRow, postId?: string): Promise<number> {
  let query = admin
    .from('omni_content_targets')
    .select('*')
    .not('metricool_post_id', 'is', null)
    // 'claim:' ids are transient mid-approve markers, not real Metricool posts.
    .not('metricool_post_id', 'like', 'claim:%')
    .neq('status', 'published');
  if (postId) query = query.eq('post_id', postId);
  const { data } = await query.limit(60);
  const targets = (data ?? []) as ArmedTargetRow[];
  const touchedPosts = new Set<string>();
  for (const t of targets) {
    try {
      const status = await getScheduledPostStatus(connAuth(conn), t.metricool_post_id as string);
      if (!status) continue;
      const patch: Record<string, unknown> = {
        metricool_status: status.status,
        sync_error: status.status === 'ERROR' ? (status.detailedStatus ?? 'Metricool reported an error') : null,
        last_synced_at: new Date().toISOString(),
      };
      if (status.status === 'PUBLISHED') {
        patch.status = 'published';
        patch.published_at = new Date().toISOString();
        if (status.publicUrl) patch.published_url = status.publicUrl;
      }
      await admin.from('omni_content_targets').update(patch).eq('id', t.id);
      touchedPosts.add(t.post_id);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'sync failed';
      // A deleted-in-Metricool post reads as an upstream 404: surface honestly.
      await admin.from('omni_content_targets').update({
        sync_error: /404/.test(message) ? 'The scheduled post no longer exists in Metricool' : message.slice(0, 300),
        last_synced_at: new Date().toISOString(),
      }).eq('id', t.id);
      touchedPosts.add(t.post_id);
    }
  }
  for (const pid of touchedPosts) await recomputePostStatus(admin, pid);
  return targets.length;
}

/** Batch-sign media previews + per-file download URLs (downloads need a
 *  per-file filename, so they sign individually - in PARALLEL, never
 *  sequentially: a board of dozens of posts must not pay N round-trips). */
async function signMedia(admin: AdminClient, media: MediaRow[]): Promise<Record<string, { url: string | null; download_url: string | null }>> {
  const out: Record<string, { url: string | null; download_url: string | null }> = {};
  if (media.length === 0) return out;
  const paths = media.map((m) => m.storage_path);
  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrls(paths, SIGNED_TTL);
  const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const downloads = await Promise.all(media.map(async (m) => {
    const ext = m.storage_path.split('.').pop() ?? 'bin';
    const { data: dl } = await admin.storage.from(BUCKET).createSignedUrl(
      m.storage_path,
      SIGNED_TTL,
      { download: `${m.post_id.slice(0, 8)}-${m.sort + 1}.${ext}` },
    );
    return [m.id, m.storage_path, dl?.signedUrl ?? null] as const;
  }));
  for (const [id, path, downloadUrl] of downloads) {
    out[id] = { url: byPath.get(path) ?? null, download_url: downloadUrl };
  }
  return out;
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
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // The whole Desk is admin-shared: gate every action once.
    const { data: isAdmin, error: adminErr } = await supabaseAdmin.rpc('is_admin', { _user_id: userId });
    if (adminErr || !isAdmin) return jsonResponse({ error: 'Admin access required' }, 403);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = typeof body?.action === 'string' ? body.action : '';

    const getPost = async (postId: unknown) => {
      if (typeof postId !== 'string' || !UUID_RE.test(postId)) return null;
      const { data } = await supabaseAdmin
        .from('omni_content_posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();
      return data as Record<string, unknown> | null;
    };

    // -- list-posts (posts + media + targets + signed URLs) -----
    if (action === 'list-posts') {
      const includeArchived = body.include_archived === true;
      let query = supabaseAdmin
        .from('omni_content_posts')
        .select('*')
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(300);
      if (!includeArchived) query = query.neq('status', 'archived');
      const { data: posts, error } = await query;
      if (error) {
        console.error('omni-content: list error:', error.message);
        return jsonResponse({ error: 'Failed to load the posts' }, 500);
      }
      const rows = (posts ?? []) as Record<string, unknown>[];
      const ids = rows.map((p) => p.id as string);
      let media: MediaRow[] = [];
      let targets: TargetRow[] = [];
      if (ids.length > 0) {
        const [{ data: m }, { data: t }] = await Promise.all([
          supabaseAdmin.from('omni_content_media').select('*').in('post_id', ids).order('sort', { ascending: true }),
          supabaseAdmin.from('omni_content_targets').select('*').in('post_id', ids).order('created_at', { ascending: true }),
        ]);
        media = (m ?? []) as MediaRow[];
        targets = (t ?? []) as TargetRow[];
      }
      const urls = await signMedia(supabaseAdmin, media);

      // Freshness without cron: Metricool publishes on schedule regardless of
      // us - this sync only refreshes OUR status display. If any armed target
      // is stale (>2 min), refresh it in the background; the next load (or a
      // manual Sync) shows the result.
      const staleCutoff = Date.now() - 2 * 60 * 1000;
      const hasStaleArmed = (targets as ArmedTargetRow[]).some((t) =>
        t.metricool_post_id && t.status !== 'published'
        && (!t.last_synced_at || Date.parse(t.last_synced_at) < staleCutoff));
      if (hasStaleArmed && typeof EdgeRuntime !== 'undefined') {
        EdgeRuntime.waitUntil((async () => {
          const conn = await getConnection(supabaseAdmin);
          if (conn) await syncArmedTargets(supabaseAdmin, conn);
        })().catch((e) => console.error('omni-content: background sync error:', e instanceof Error ? e.message : String(e))));
      }

      return jsonResponse({
        posts: rows.map((p) => ({
          ...p,
          media: media.filter((m) => m.post_id === p.id).map((m) => ({ ...m, ...urls[m.id] })),
          targets: targets.filter((t) => t.post_id === p.id),
        })),
      });
    }

    // -- create-post -----
    if (action === 'create-post') {
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : '';
      const notes = typeof body.notes === 'string' ? body.notes.slice(0, 4000) : '';
      const scheduledAt = typeof body.scheduled_at === 'string' && body.scheduled_at ? body.scheduled_at : null;
      if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) {
        return jsonResponse({ error: 'Invalid schedule date' }, 400);
      }
      const targetsIn = (Array.isArray(body.targets) ? body.targets : [])
        .map(cleanTarget)
        .filter((t): t is NonNullable<ReturnType<typeof cleanTarget>> => t !== null)
        .slice(0, 12);

      const { data: post, error } = await supabaseAdmin
        .from('omni_content_posts')
        .insert({
          created_by: userId,
          title,
          notes: notes || null,
          scheduled_at: scheduledAt,
          status: scheduledAt ? 'scheduled' : 'draft',
        })
        .select('*')
        .single();
      if (error || !post) {
        console.error('omni-content: create error:', error?.message);
        return jsonResponse({ error: 'Failed to create the post' }, 500);
      }
      const postId = (post as { id: string }).id;
      if (targetsIn.length > 0) {
        const { error: tErr } = await supabaseAdmin
          .from('omni_content_targets')
          .insert(targetsIn.map((t) => ({ ...t, post_id: postId })));
        if (tErr) {
          console.error('omni-content: targets insert error:', tErr.message);
          await supabaseAdmin.from('omni_content_posts').delete().eq('id', postId);
          return jsonResponse({ error: 'Failed to save the post destinations' }, 500);
        }
      }
      return jsonResponse({ post });
    }

    // -- update-post (fields + full target replacement, published preserved) --
    if (action === 'update-post') {
      const post = await getPost(body.post_id);
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      const postId = post.id as string;

      // Armed targets (pushed to Metricool, not yet published) lock the
      // schedule: Metricool holds the old time, so a silent reschedule here
      // would lie. The client must revert the approval first.
      const { data: armedCheck } = await supabaseAdmin
        .from('omni_content_targets')
        .select('id')
        .eq('post_id', postId)
        .not('metricool_post_id', 'is', null)
        .neq('status', 'published')
        .limit(1);
      const hasArmed = (armedCheck ?? []).length > 0;

      const patch: Record<string, unknown> = {};
      if (typeof body.title === 'string') patch.title = body.title.trim().slice(0, 200);
      if (typeof body.notes === 'string' || body.notes === null) {
        patch.notes = typeof body.notes === 'string' ? body.notes.slice(0, 4000) || null : null;
      }
      if (typeof body.scheduled_at === 'string' || body.scheduled_at === null) {
        if (typeof body.scheduled_at === 'string' && Number.isNaN(Date.parse(body.scheduled_at))) {
          return jsonResponse({ error: 'Invalid schedule date' }, 400);
        }
        const changed = (body.scheduled_at ?? null) !== ((post.scheduled_at as string | null) ?? null);
        if (changed && hasArmed) {
          return jsonResponse({ error: 'This post is armed for auto-publish. Revert the approval before rescheduling.' }, 409);
        }
        patch.scheduled_at = body.scheduled_at;
      }
      if (Object.keys(patch).length > 0) {
        const { error } = await supabaseAdmin.from('omni_content_posts').update(patch).eq('id', postId);
        if (error) return jsonResponse({ error: 'Failed to update the post' }, 500);
      }

      if (Array.isArray(body.targets)) {
        const targetsIn = body.targets
          .map(cleanTarget)
          .filter((t): t is NonNullable<ReturnType<typeof cleanTarget>> => t !== null)
          .slice(0, 12);
        // Published targets are the publish trail and ARMED targets are live
        // in Metricool - NEVER replaced here (revert-approval disarms first).
        const { error: delErr } = await supabaseAdmin
          .from('omni_content_targets')
          .delete()
          .eq('post_id', postId)
          .eq('status', 'scheduled')
          .is('metricool_post_id', null);
        if (delErr) return jsonResponse({ error: 'Failed to update the destinations' }, 500);
        // Concurrency guard (shared-admin model): another admin may have
        // published or armed a network while this editor's snapshot still
        // listed it as free - re-inserting it would duplicate the network.
        const { data: kept } = await supabaseAdmin
          .from('omni_content_targets')
          .select('network, network_label, status, metricool_post_id')
          .eq('post_id', postId);
        const targetKey = (network: string, label: string | null) =>
          network === 'other' ? `other:${(label ?? '').trim().toLowerCase()}` : network;
        const keptKeys = new Set(
          ((kept ?? []) as { network: string; network_label: string | null }[])
            .map((t) => targetKey(t.network, t.network_label)),
        );
        const insertable = targetsIn.filter((t) => !keptKeys.has(targetKey(t.network, t.network_label)));
        if (insertable.length > 0) {
          const { error: insErr } = await supabaseAdmin
            .from('omni_content_targets')
            .insert(insertable.map((t) => ({ ...t, post_id: postId })));
          if (insErr) return jsonResponse({ error: 'Failed to save the destinations' }, 500);
        }
      }

      const status = await recomputePostStatus(supabaseAdmin, postId);
      return jsonResponse({ success: true, status });
    }

    // -- register-media (validate a client-direct upload, insert the row) -----
    if (action === 'register-media') {
      const post = await getPost(body.post_id);
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      const postId = post.id as string;
      const storagePath = typeof body.storage_path === 'string' ? body.storage_path : '';

      // The client uploads to `${uid}/${postId}/${uuid}.${ext}` (storage RLS
      // already confines writes to the caller's own uid folder). Re-validate
      // the shape here: uploader namespace + THIS post + a server-parseable
      // uuid filename; no traversal.
      const segments = storagePath.split('/');
      if (
        segments.length !== 3
        || segments[0] !== userId
        || segments[1] !== postId
        || storagePath.includes('..')
        || storagePath.length > 300
      ) {
        return jsonResponse({ error: 'Invalid media path' }, 400);
      }

      // Confirm the object exists and derive size/MIME SERVER-side.
      const { data: listed, error: listErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .list(`${segments[0]}/${segments[1]}`, { search: segments[2], limit: 10 });
      const entry = (listed ?? []).find((f) => f.name === segments[2]);
      if (listErr || !entry) return jsonResponse({ error: 'The uploaded file was not found in storage' }, 400);
      const meta = (entry.metadata ?? {}) as { size?: number; mimetype?: string };
      const mime = meta.mimetype ?? '';
      const kind = ALLOWED_MIME[mime];
      if (!kind) {
        await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
        return jsonResponse({ error: 'Unsupported file type' }, 400);
      }

      const { data: existing } = await supabaseAdmin
        .from('omni_content_media')
        .select('sort')
        .eq('post_id', postId)
        .order('sort', { ascending: false })
        .limit(1);
      const nextSort = ((existing ?? [])[0] as { sort: number } | undefined)?.sort ?? -1;

      const width = typeof body.width === 'number' && body.width > 0 && body.width <= 20000 ? Math.round(body.width) : null;
      const height = typeof body.height === 'number' && body.height > 0 && body.height <= 20000 ? Math.round(body.height) : null;
      const { data: mediaRow, error: insErr } = await supabaseAdmin
        .from('omni_content_media')
        .insert({
          post_id: postId,
          kind,
          storage_path: storagePath,
          mime_type: mime,
          sort: nextSort + 1,
          width,
          height,
          byte_size: typeof meta.size === 'number' ? meta.size : null,
        })
        .select('*')
        .single();
      if (insErr || !mediaRow) {
        console.error('omni-content: media insert error:', insErr?.message);
        return jsonResponse({ error: 'Failed to register the media' }, 500);
      }
      const urls = await signMedia(supabaseAdmin, [mediaRow as MediaRow]);
      return jsonResponse({ media: { ...(mediaRow as MediaRow), ...urls[(mediaRow as MediaRow).id] } });
    }

    // -- delete-media -----
    if (action === 'delete-media') {
      const mediaId = body.media_id;
      if (typeof mediaId !== 'string' || !UUID_RE.test(mediaId)) return jsonResponse({ error: 'media_id is required' }, 400);
      const { data: row } = await supabaseAdmin
        .from('omni_content_media')
        .select('id, storage_path')
        .eq('id', mediaId)
        .maybeSingle();
      if (!row) return jsonResponse({ error: 'Media not found' }, 404);
      await supabaseAdmin.storage.from(BUCKET).remove([(row as { storage_path: string }).storage_path]);
      const { error } = await supabaseAdmin.from('omni_content_media').delete().eq('id', mediaId);
      if (error) return jsonResponse({ error: 'Failed to delete the media' }, 500);
      return jsonResponse({ success: true });
    }

    // -- reorder-media -----
    if (action === 'reorder-media') {
      const post = await getPost(body.post_id);
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      const ids = Array.isArray(body.media_ids)
        ? (body.media_ids as unknown[]).filter((x): x is string => typeof x === 'string' && UUID_RE.test(x)).slice(0, 50)
        : [];
      for (let i = 0; i < ids.length; i++) {
        await supabaseAdmin
          .from('omni_content_media')
          .update({ sort: i })
          .eq('id', ids[i])
          .eq('post_id', post.id as string);
      }
      return jsonResponse({ success: true });
    }

    // -- media-urls (re-sign previews + downloads) -----
    if (action === 'media-urls') {
      const ids = Array.isArray(body.media_ids)
        ? (body.media_ids as unknown[]).filter((x): x is string => typeof x === 'string' && UUID_RE.test(x)).slice(0, 60)
        : [];
      if (ids.length === 0) return jsonResponse({ error: 'media_ids is required' }, 400);
      const { data: rows } = await supabaseAdmin
        .from('omni_content_media')
        .select('*')
        .in('id', ids);
      const urls = await signMedia(supabaseAdmin, (rows ?? []) as MediaRow[]);
      return jsonResponse({ urls });
    }

    // -- generate-captions (full-RAG, per network + post type) -----
    if (action === 'generate-captions') {
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : '';
      const notes = typeof body.notes === 'string' ? body.notes.slice(0, 2000) : '';
      const mediaSummary = typeof body.media_summary === 'string' ? body.media_summary.slice(0, 300) : '';
      const targets: CaptionTargetInput[] = (Array.isArray(body.targets) ? body.targets : [])
        .map(cleanTarget)
        .filter((t): t is NonNullable<ReturnType<typeof cleanTarget>> => t !== null)
        .slice(0, 12);
      if (targets.length === 0) return jsonResponse({ error: 'At least one destination is required' }, 400);
      if (!title && !notes) return jsonResponse({ error: 'Give the post a title or notes so the captions have something to say' }, 400);

      let heartRules;
      try {
        heartRules = await fetchHeartRules(supabaseAdmin);
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Heart rules unavailable' }, 503);
      }

      const { data: llm } = await supabaseAdmin
        .from('llm_settings')
        .select('openai_api_key, gemini_api_key, openai_text_model, gemini_text_model, active_text_provider')
        .single();
      const openaiKey = ((llm?.openai_api_key as string | null) || Deno.env.get('OPENAI_API_KEY') || '').trim();
      const geminiKey = ((llm?.gemini_api_key as string | null) || Deno.env.get('GEMINI_API_KEY') || '').trim();
      if (!openaiKey && !geminiKey) {
        return jsonResponse({ error: 'An OpenAI or Gemini API key is required for caption generation. Configure one in Settings > LLM Providers.' }, 503);
      }
      const configured = (llm?.active_text_provider as string | null) ?? null;
      const provider = configured === 'gemini' && geminiKey ? 'gemini'
        : configured === 'openai' && openaiKey ? 'openai'
        : openaiKey ? 'openai' : 'gemini';
      const model = provider === 'gemini'
        ? ((llm?.gemini_text_model as string | null) || 'gemini-2.5-flash')
        : ((llm?.openai_text_model as string | null) || 'gpt-4o');

      // Full RAG: Brain + Wishpedia retrieval (embeddings need the OpenAI key;
      // without it, captions stay Heart-grounded only).
      const knowledge = openaiKey
        ? await retrieveKnowledge(supabaseAdmin, openaiKey, `${title} ${notes}`.trim().slice(0, 600))
        : [];

      try {
        const captions = await generateDeskCaptions({
          provider, model, keys: { openaiKey, geminiKey },
          heartRules, knowledge, title, notes, mediaSummary, targets,
        });
        return jsonResponse({
          captions,
          retrieval: { brain_chunks: knowledge.length, heart_rules: heartRules.length },
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Caption generation failed';
        console.error('omni-content: captions error:', message);
        return jsonResponse({ error: message }, 502);
      }
    }

    // -- mark-published / unpublish-target (the manual handoff) -----
    if (action === 'mark-published' || action === 'unpublish-target') {
      const targetId = body.target_id;
      if (typeof targetId !== 'string' || !UUID_RE.test(targetId)) return jsonResponse({ error: 'target_id is required' }, 400);
      const { data: target } = await supabaseAdmin
        .from('omni_content_targets')
        .select('id, post_id, metricool_post_id')
        .eq('id', targetId)
        .maybeSingle();
      if (!target) return jsonResponse({ error: 'Destination not found' }, 404);
      if (action === 'unpublish-target' && (target as { metricool_post_id: string | null }).metricool_post_id) {
        return jsonResponse({ error: 'This destination was published automatically via Metricool and is live on the network - it cannot be undone here.' }, 400);
      }

      if (action === 'mark-published') {
        const publishedUrl = typeof body.published_url === 'string' && body.published_url.trim()
          ? body.published_url.trim().slice(0, 600)
          : null;
        if (publishedUrl && !/^https?:\/\//i.test(publishedUrl)) {
          return jsonResponse({ error: 'The live URL must start with http(s)://' }, 400);
        }
        const { error } = await supabaseAdmin
          .from('omni_content_targets')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            published_by: userId,
            published_url: publishedUrl,
          })
          .eq('id', targetId);
        if (error) return jsonResponse({ error: 'Failed to mark the destination published' }, 500);
      } else {
        const { error } = await supabaseAdmin
          .from('omni_content_targets')
          .update({ status: 'scheduled', published_at: null, published_by: null, published_url: null })
          .eq('id', targetId);
        if (error) return jsonResponse({ error: 'Failed to revert the destination' }, 500);
      }
      const status = await recomputePostStatus(supabaseAdmin, (target as { post_id: string }).post_id);
      return jsonResponse({ success: true, post_status: status });
    }

    // -- Metricool connection management -----
    if (action === 'metricool-save-token') {
      const token = typeof body.token === 'string' ? body.token.trim() : '';
      const mcUserId = typeof body.metricool_user_id === 'string' ? body.metricool_user_id.trim() : '';
      if (!token || token.length > 4096 || !/^\d{1,15}$/.test(mcUserId)) {
        return jsonResponse({ error: 'A Metricool API token and numeric user id are required' }, 400);
      }
      let brands;
      try {
        brands = await fetchBrands({ token, userId: mcUserId });
      } catch (e) {
        return jsonResponse({ error: `Metricool rejected the credentials: ${e instanceof Error ? e.message : 'unknown error'}` }, 400);
      }
      // A credential change resets the brand linkage: a fresh brand pick is
      // mandatory so a new account can never inherit the old blogId/networks.
      const { error } = await supabaseAdmin
        .from('omni_content_connections')
        .upsert({
          provider: 'metricool',
          api_token: token,
          metricool_user_id: mcUserId,
          created_by: userId,
          blog_id: null,
          brand_label: null,
          brand_timezone: null,
          networks: {},
          pinterest_boards: [],
          last_checked_at: new Date().toISOString(),
        }, { onConflict: 'provider' });
      if (error) {
        console.error('omni-content: connection save error:', error.message);
        return jsonResponse({ error: 'Failed to save the connection' }, 500);
      }
      return jsonResponse({ success: true, brands });
    }

    if (action === 'metricool-status') {
      const conn = await getConnection(supabaseAdmin);
      if (!conn) return jsonResponse({ configured: false });
      return jsonResponse({
        configured: true,
        brand_selected: Boolean(conn.blog_id),
        brand_label: conn.brand_label,
        brand_timezone: conn.brand_timezone,
        networks: conn.networks ?? {},
        pinterest_boards: (conn.pinterest_boards ?? []).length,
        last_checked_at: conn.last_checked_at,
      });
    }

    if (action === 'metricool-brands') {
      const conn = await getConnection(supabaseAdmin);
      if (!conn) return jsonResponse({ error: 'Connect Metricool first' }, 400);
      try {
        const brands = await fetchBrands(connAuth(conn));
        await supabaseAdmin.from('omni_content_connections')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('id', conn.id);
        return jsonResponse({ brands });
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Metricool request failed' }, 502);
      }
    }

    if (action === 'metricool-save-brand') {
      const conn = await getConnection(supabaseAdmin);
      if (!conn) return jsonResponse({ error: 'Connect Metricool first' }, 400);
      const blogId = typeof body.blog_id === 'string' || typeof body.blog_id === 'number' ? String(body.blog_id) : '';
      if (!/^\d{1,15}$/.test(blogId)) return jsonResponse({ error: 'blog_id is required' }, 400);
      let brands;
      try {
        brands = await fetchBrands(connAuth(conn));
      } catch (e) {
        return jsonResponse({ error: e instanceof Error ? e.message : 'Metricool request failed' }, 502);
      }
      const brand = brands.find((b) => String(b.id) === blogId);
      if (!brand) return jsonResponse({ error: 'That brand was not found on the Metricool account' }, 404);
      const boards = await fetchPinterestBoards({ ...connAuth(conn), blogId });
      const { error } = await supabaseAdmin.from('omni_content_connections').update({
        blog_id: blogId,
        brand_label: brand.label,
        brand_timezone: brand.timezone,
        networks: brand.networks,
        pinterest_boards: boards,
        last_checked_at: new Date().toISOString(),
      }).eq('id', conn.id);
      if (error) return jsonResponse({ error: 'Failed to save the brand' }, 500);
      return jsonResponse({ success: true, brand: { ...brand, pinterest_boards: boards.length } });
    }

    if (action === 'metricool-disconnect') {
      await supabaseAdmin.from('omni_content_connections').delete().eq('provider', 'metricool');
      return jsonResponse({ success: true });
    }

    // -- Approval layer -----
    if (action === 'submit-for-approval' || action === 'reject-post') {
      const post = await getPost(body.post_id);
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      const postId = post.id as string;
      if (action === 'submit-for-approval') {
        const { error } = await supabaseAdmin.from('omni_content_posts').update({
          status: 'pending_approval',
          rejected_reason: null,
        }).eq('id', postId);
        if (error) return jsonResponse({ error: 'Failed to submit for approval' }, 500);
        return jsonResponse({ success: true, post_status: 'pending_approval' });
      }
      const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : '';
      const { error } = await supabaseAdmin.from('omni_content_posts').update({
        status: 'draft',
        approved_by: null,
        approved_at: null,
        rejected_reason: reason || null,
      }).eq('id', postId);
      if (error) return jsonResponse({ error: 'Failed to reject the post' }, 500);
      return jsonResponse({ success: true, post_status: 'draft' });
    }

    // -- approve-post: the trigger that arms auto-publish -----
    if (action === 'approve-post') {
      const post = await getPost(body.post_id);
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      const postId = post.id as string;
      if (post.status === 'archived') return jsonResponse({ error: 'Unarchive the post first' }, 400);

      const { data: t } = await supabaseAdmin
        .from('omni_content_targets')
        .select('*')
        .eq('post_id', postId);
      const targets = (t ?? []) as ArmedTargetRow[];
      const autoTargets = targets.filter((x) =>
        x.publish_mode === 'auto' && x.status !== 'published' && !x.metricool_post_id);

      const conn = await getConnection(supabaseAdmin);
      if (autoTargets.length > 0) {
        if (!conn || !conn.blog_id) {
          return jsonResponse({ error: 'Connect Metricool and pick a brand before approving auto-publish targets' }, 400);
        }
        if (!post.scheduled_at) {
          return jsonResponse({ error: 'Set a publish date and hour before approving auto-publish targets' }, 400);
        }
      }

      // Media prep runs BEFORE the status flip so a transfer failure leaves
      // the post untouched (still pending_approval) - no incoherent state.
      // Images ride the proven normalize endpoint (cached in post metadata so
      // a retry never re-uploads); videos have NO normalize equivalent, so
      // they ride as signed URLs with saveExternalMediaFiles (Metricool
      // copies them at creation).
      let hostedUrls: string[] = [];
      let hasExternalMedia = false;
      if (autoTargets.length > 0 && conn) {
        const { data: mediaRows } = await supabaseAdmin
          .from('omni_content_media')
          .select('*')
          .eq('post_id', postId)
          .order('sort', { ascending: true });
        const media = (mediaRows ?? []) as MediaRow[];
        const meta = (post.metadata ?? {}) as Record<string, unknown>;
        const hostedCache: Record<string, string> = { ...((meta.metricool_hosted as Record<string, string> | undefined) ?? {}) };
        let cacheChanged = false;
        try {
          for (const m of media) {
            if (m.kind === 'image' && hostedCache[m.id]) {
              hostedUrls.push(hostedCache[m.id]);
              continue;
            }
            const { data: signed } = await supabaseAdmin.storage
              .from(BUCKET)
              .createSignedUrl(m.storage_path, SIGNED_TTL);
            if (!signed?.signedUrl) throw new Error('Could not sign a media file');
            if (m.kind === 'image') {
              const hosted = await normalizeMedia(connAuth(conn), signed.signedUrl);
              hostedCache[m.id] = hosted;
              cacheChanged = true;
              hostedUrls.push(hosted);
            } else {
              hostedUrls.push(signed.signedUrl);
              hasExternalMedia = true;
            }
          }
        } catch (e) {
          return jsonResponse({
            error: `Media transfer to Metricool failed: ${e instanceof Error ? e.message : 'unknown'}. Nothing was approved - try again.`,
          }, 502);
        }
        if (cacheChanged) {
          await supabaseAdmin.from('omni_content_posts')
            .update({ metadata: { ...meta, metricool_hosted: hostedCache } })
            .eq('id', postId);
        }
      }

      await supabaseAdmin.from('omni_content_posts').update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        rejected_reason: null,
      }).eq('id', postId);

      let pushed = 0;
      let demoted = 0;
      const failures: { network: string; error: string }[] = [];
      if (autoTargets.length > 0 && conn) {
        for (const target of autoTargets) {
          const provider = NETWORK_TO_PROVIDER[target.network];
          const connected = conn.networks && Object.prototype.hasOwnProperty.call(conn.networks, target.network);
          if (!provider || !connected) {
            // Honest demotion: this network cannot auto-publish on this brand.
            await supabaseAdmin.from('omni_content_targets').update({
              publish_mode: 'manual',
              sync_error: provider ? 'Network not connected on the Metricool brand' : 'This network only supports the manual lane',
            }).eq('id', target.id);
            demoted++;
            continue;
          }
          // Atomic claim (shared-admin race): two admins approving at once must
          // never create two Metricool posts for one target. The conditional
          // update IS the claim - 0 rows back means the other admin owns it.
          const claimToken = `claim:${crypto.randomUUID()}`;
          const { data: claimed } = await supabaseAdmin
            .from('omni_content_targets')
            .update({ metricool_post_id: claimToken })
            .eq('id', target.id)
            .is('metricool_post_id', null)
            .select('id');
          if (!claimed || claimed.length === 0) continue;
          try {
            const metricoolPostId = await createScheduledPost(connAuth(conn), {
              targetId: target.id,
              network: target.network,
              postType: target.post_type,
              caption: target.caption,
              postTitle: (post.title as string) ?? '',
              scheduledAtIso: post.scheduled_at as string,
              mediaUrls: hostedUrls,
              hasExternalMedia,
              pinterestBoards: conn.pinterest_boards ?? [],
            });
            await supabaseAdmin.from('omni_content_targets').update({
              metricool_post_id: metricoolPostId,
              metricool_status: 'PENDING',
              sync_error: null,
              last_synced_at: new Date().toISOString(),
            }).eq('id', target.id);
            pushed++;
          } catch (e) {
            const message = e instanceof Error ? e.message : 'push failed';
            // Release the claim so a re-approve can retry this target.
            await supabaseAdmin.from('omni_content_targets').update({
              metricool_post_id: null,
              sync_error: message.slice(0, 300),
            }).eq('id', target.id);
            failures.push({ network: target.network, error: message.slice(0, 200) });
          }
        }
      }
      const status = await recomputePostStatus(supabaseAdmin, postId);
      return jsonResponse({ success: true, post_status: status, pushed, demoted, failures });
    }

    // -- revert-approval: disarm (delete the Metricool posts, back to review) --
    if (action === 'revert-approval') {
      const post = await getPost(body.post_id);
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      const postId = post.id as string;
      const conn = await getConnection(supabaseAdmin);
      const { data: t } = await supabaseAdmin
        .from('omni_content_targets')
        .select('*')
        .eq('post_id', postId)
        .not('metricool_post_id', 'is', null)
        .neq('status', 'published');
      const armed = (t ?? []) as ArmedTargetRow[];
      const failures: string[] = [];
      for (const target of armed) {
        try {
          const mcId = target.metricool_post_id as string;
          // A 'claim:' marker never reached Metricool - just clear it locally.
          if (conn && !mcId.startsWith('claim:')) await deleteScheduledPost(connAuth(conn), mcId);
          await supabaseAdmin.from('omni_content_targets').update({
            metricool_post_id: null,
            metricool_status: null,
            sync_error: null,
            last_synced_at: null,
          }).eq('id', target.id);
        } catch (e) {
          failures.push(`${target.network}: ${e instanceof Error ? e.message.slice(0, 150) : 'failed'}`);
        }
      }
      if (failures.length > 0) {
        return jsonResponse({ error: `Some scheduled posts could not be removed from Metricool: ${failures.join('; ')}` }, 502);
      }
      await supabaseAdmin.from('omni_content_posts').update({
        status: 'pending_approval',
        approved_by: null,
        approved_at: null,
      }).eq('id', postId);
      return jsonResponse({ success: true, post_status: 'pending_approval', disarmed: armed.length });
    }

    // -- metricool-sync: refresh armed targets from Metricool -----
    if (action === 'metricool-sync') {
      const conn = await getConnection(supabaseAdmin);
      if (!conn) return jsonResponse({ error: 'Metricool is not connected' }, 400);
      const postId = typeof body.post_id === 'string' && UUID_RE.test(body.post_id) ? body.post_id : undefined;
      const synced = await syncArmedTargets(supabaseAdmin, conn, postId);
      return jsonResponse({ success: true, synced });
    }

    // -- archive-post / unarchive-post -----
    if (action === 'archive-post' || action === 'unarchive-post') {
      const post = await getPost(body.post_id);
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      const postId = post.id as string;
      if (action === 'archive-post') {
        const { error } = await supabaseAdmin.from('omni_content_posts').update({ status: 'archived' }).eq('id', postId);
        if (error) return jsonResponse({ error: 'Failed to archive the post' }, 500);
        return jsonResponse({ success: true, post_status: 'archived' });
      }
      await supabaseAdmin.from('omni_content_posts').update({ status: 'draft' }).eq('id', postId);
      const status = await recomputePostStatus(supabaseAdmin, postId);
      return jsonResponse({ success: true, post_status: status });
    }

    // -- delete-post (storage sweep + cascade) -----
    if (action === 'delete-post') {
      const post = await getPost(body.post_id);
      if (!post) return jsonResponse({ error: 'Post not found' }, 404);
      const postId = post.id as string;
      const { data: media } = await supabaseAdmin
        .from('omni_content_media')
        .select('storage_path')
        .eq('post_id', postId);
      const paths = ((media ?? []) as { storage_path: string }[]).map((m) => m.storage_path);
      if (paths.length > 0) {
        const { error: rmErr } = await supabaseAdmin.storage.from(BUCKET).remove(paths);
        if (rmErr) console.error('omni-content: storage sweep error:', rmErr.message);
      }
      const { error } = await supabaseAdmin.from('omni_content_posts').delete().eq('id', postId);
      if (error) return jsonResponse({ error: 'Failed to delete the post' }, 500);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Invalid action' }, 400);
  } catch (e) {
    console.error('omni-content: unhandled error:', e instanceof Error ? e.message : String(e));
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});
