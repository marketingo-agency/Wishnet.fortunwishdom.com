/**
 * Metricool API client for the Publishing Desk auto-publish lane.
 *
 * Contract locked from the live swagger (OpenAPI 3.0.1, 2026-07-18):
 * - Base https://app.metricool.com/api; auth = X-Mc-Auth header + userId/blogId
 *   query params; responses wrap payloads as { data }.
 * - POST /v2/scheduler/posts creates ONE scheduled post; providers[] are
 *   OBJECTS ({network}); publicationDate = {dateTime (local ISO, NO offset),
 *   timezone (IANA)}; media = URLs ALREADY normalized onto Metricool storage.
 * - ProviderStatus.status: PUBLISHED|PUBLISHING|PENDING|AWAITING_CONFIRMATION|
 *   ERROR|DRAFT (+ publicUrl, detailedStatus).
 *
 * Design: one Metricool post PER TARGET (captions differ per network); media
 * normalized once per file and shared across targets. The token NEVER leaves
 * the server.
 */

const MC_BASE = 'https://app.metricool.com/api';

export interface MetricoolAuth {
  token: string;
  userId: string;
  blogId?: string | null;
}

export interface MetricoolBrand {
  id: number;
  label: string;
  timezone: string | null;
  picture: string | null;
  /** Our network id -> connected handle/name (absent = not connected). */
  networks: Record<string, string>;
}

/** Our Desk network ids -> Metricool provider network strings (the client's
 *  chosen six; Metricool supports more, deliberately not offered). */
export const NETWORK_TO_PROVIDER: Record<string, string> = {
  facebook: 'facebook',
  instagram: 'instagram',
  x: 'twitter',
  tiktok: 'tiktok',
  youtube: 'youtube',
  pinterest: 'pinterest',
};

async function mcFetch(
  auth: MetricoolAuth,
  path: string,
  opts: { method?: string; body?: unknown; query?: Record<string, string> } = {},
): Promise<unknown> {
  const url = new URL(`${MC_BASE}${path}`);
  url.searchParams.set('userId', auth.userId);
  if (auth.blogId) url.searchParams.set('blogId', auth.blogId);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    method: opts.method ?? 'GET',
    headers: {
      'X-Mc-Auth': auth.token,
      'Content-Type': 'application/json',
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) {
    // Never echo the token; surface a compact, honest upstream error.
    const snippet = text.slice(0, 300).replace(/\s+/g, ' ');
    throw new Error(`Metricool ${res.status}${snippet ? `: ${snippet}` : ''}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Map a Metricool PublicBlog row to our sanitized brand shape. */
function toBrand(blog: Record<string, unknown>): MetricoolBrand {
  const handle = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null;
  const networks: Record<string, string> = {};
  const fb = handle(blog.facebook) ?? handle(blog.facebookPageId);
  if (fb) networks.facebook = fb;
  const ig = handle(blog.instagram);
  if (ig) networks.instagram = ig;
  const tw = handle(blog.twitter);
  if (tw) networks.x = tw;
  const tt = handle(blog.tiktok);
  if (tt) networks.tiktok = tt;
  const yt = handle(blog.youtubeChannelName) ?? handle(blog.youtube);
  if (yt) networks.youtube = yt;
  const pin = handle(blog.pinterest);
  if (pin) networks.pinterest = pin;
  return {
    id: Number(blog.id),
    label: (handle(blog.label) ?? handle(blog.title) ?? `Brand ${blog.id}`) as string,
    timezone: handle(blog.timezone),
    picture: handle(blog.picture),
    networks,
  };
}

/** GET /admin/simpleProfiles -> sanitized brand list (never the raw blog). */
export async function fetchBrands(auth: MetricoolAuth): Promise<MetricoolBrand[]> {
  const res = await mcFetch({ ...auth, blogId: null }, '/admin/simpleProfiles');
  const rows = Array.isArray(res) ? res : (res as { data?: unknown[] })?.data ?? [];
  return (rows as Record<string, unknown>[])
    .filter((b) => b && b.id != null && !b.deleted)
    .map(toBrand);
}

/** GET /v2/scheduler/boards/pinterest -> [{id, name}] (defensive parse). */
export async function fetchPinterestBoards(auth: MetricoolAuth): Promise<{ id: string; name: string }[]> {
  try {
    const res = await mcFetch(auth, '/v2/scheduler/boards/pinterest', {
      query: auth.blogId ? { brandId: auth.blogId } : {},
    });
    const rows = ((res as { data?: unknown[] })?.data ?? []) as Record<string, unknown>[];
    return rows
      .map((b) => ({ id: String(b.id ?? b.boardId ?? ''), name: String(b.name ?? b.title ?? 'Board') }))
      .filter((b) => b.id);
  } catch {
    return []; // boards are an enhancement; their absence must not block a connection
  }
}

/**
 * Normalize one of OUR signed media URLs onto Metricool's storage.
 * Returns the Metricool-hosted URL to place in media[].
 */
export async function normalizeMedia(auth: MetricoolAuth, publicUrl: string): Promise<string> {
  const res = await mcFetch(auth, '/actions/normalize/image/url', { query: { url: publicUrl } });
  const hosted = typeof res === 'string'
    ? res.trim().replace(/^"|"$/g, '')
    : String((res as Record<string, unknown>)?.url ?? (res as Record<string, unknown>)?.data ?? '');
  let host = '';
  try {
    host = new URL(hosted).hostname;
  } catch {
    throw new Error('Metricool media normalize returned an unusable URL');
  }
  // Only ever reference Metricool-hosted copies in the scheduled post.
  if (!/(^|\.)metricool\.com$/i.test(host)) {
    throw new Error('Metricool media normalize returned an unexpected host');
  }
  return hosted;
}

export interface TargetPushInput {
  targetId: string;
  network: string;
  postType: string;
  caption: string;
  postTitle: string;
  scheduledAtIso: string;
  mediaUrls: string[];
  /** True when media[] carries non-Metricool URLs (our signed video URLs):
   *  saveExternalMediaFiles tells Metricool to copy them to its storage.
   *  (Only images have a normalize endpoint; videos have no equivalent.) */
  hasExternalMedia: boolean;
  pinterestBoards: { id: string; name: string }[];
}

/** UTC trick: dateTime = the UTC wall time, timezone = 'UTC'. No tz math. */
function toPublicationDate(iso: string): { dateTime: string; timezone: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateTime = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
  return { dateTime, timezone: 'UTC' };
}

/** Build the per-network *Data object from our post type (locked mapping). */
function perNetworkData(input: TargetPushInput): Record<string, unknown> {
  const t = input.postType.toLowerCase();
  switch (input.network) {
    case 'instagram':
      return {
        instagramData: {
          autoPublish: true,
          type: t.includes('reel') ? 'REEL' : t.includes('story') ? 'STORY' : 'POST',
          ...(t.includes('reel') ? { showReelOnFeed: true } : {}),
        },
      };
    case 'facebook':
      return { facebookData: { type: t.includes('reel') ? 'REEL' : t.includes('story') ? 'STORY' : 'POST' } };
    case 'youtube':
      return {
        youtubeData: {
          title: (input.postTitle || 'Untitled').slice(0, 100),
          privacy: 'PUBLIC',
          madeForKids: false,
          // 'SHORT' follows the IG/FB uppercase-type convention; a wrong value
          // surfaces honestly per-target via status sync. Plain videos omit type.
          ...(t.includes('short') ? { type: 'SHORT' } : {}),
        },
      };
    case 'pinterest': {
      const board = input.pinterestBoards[0];
      return {
        pinterestData: {
          ...(board ? { boardId: board.id } : {}),
          pinTitle: (input.postTitle || '').slice(0, 100),
        },
      };
    }
    default:
      return {};
  }
}

/** Create ONE scheduled Metricool post for ONE Desk target. Returns its id. */
export async function createScheduledPost(auth: MetricoolAuth, input: TargetPushInput): Promise<string> {
  const provider = NETWORK_TO_PROVIDER[input.network];
  if (!provider) throw new Error(`Network ${input.network} cannot auto-publish`);
  const body: Record<string, unknown> = {
    publicationDate: toPublicationDate(input.scheduledAtIso),
    text: input.caption,
    providers: [{ network: provider }],
    media: input.mediaUrls,
    autoPublish: true,
    draft: false,
    saveExternalMediaFiles: input.hasExternalMedia,
    shortener: false,
    // Traceability: our target id rides along as the Metricool post uuid.
    uuid: input.targetId,
    ...perNetworkData(input),
  };
  const res = await mcFetch(auth, '/v2/scheduler/posts', { method: 'POST', body });
  const created = (res as { data?: { id?: number | string } })?.data;
  if (!created?.id) throw new Error('Metricool did not return a post id');
  return String(created.id);
}

export interface MetricoolPostStatus {
  status: string;
  detailedStatus: string | null;
  publicUrl: string | null;
}

/** Read one Metricool post -> its (single) provider status. */
export async function getScheduledPostStatus(auth: MetricoolAuth, metricoolPostId: string): Promise<MetricoolPostStatus | null> {
  const res = await mcFetch(auth, `/v2/scheduler/posts/${encodeURIComponent(metricoolPostId)}`);
  const post = (res as { data?: { providers?: Record<string, unknown>[] } })?.data;
  if (!post) return null;
  const p = (post.providers ?? [])[0];
  if (!p) return null;
  return {
    status: typeof p.status === 'string' ? p.status : 'PENDING',
    detailedStatus: typeof p.detailedStatus === 'string' ? p.detailedStatus : null,
    publicUrl: typeof p.publicUrl === 'string' && /^https?:\/\//i.test(p.publicUrl) ? p.publicUrl : null,
  };
}

/** Delete a Metricool post (used when an armed approval is reverted). */
export async function deleteScheduledPost(auth: MetricoolAuth, metricoolPostId: string): Promise<void> {
  await mcFetch(auth, `/v2/scheduler/posts/${encodeURIComponent(metricoolPostId)}`, { method: 'DELETE' });
}
