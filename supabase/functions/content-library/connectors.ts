/**
 * Network publishing connectors for the Content Library dispatch.
 *
 * One interface per platform behind a registry. Credentials live in the
 * shared pulse_connections table (admin-only RLS): facebook/instagram read
 * the existing `meta` row; `x` and `tiktok` use their own provider rows.
 *
 * Honesty contract: a connector that is not configured (or not yet
 * implemented end-to-end) NEVER fakes success. It throws NotConnectedError
 * with a clear message and the dispatcher parks the post as `queued`.
 */

export class NotConnectedError extends Error {}

export interface ConnectionRow {
  provider: string;
  api_key: string | null;
  meta_app_id: string | null;
  meta_app_secret: string | null;
  meta_page_tokens: Record<string, string>;
  config: Record<string, unknown>;
  status: string;
}

export type ConnectionsMap = Map<string, ConnectionRow>;

export interface PublishInput {
  caption: string;
  /** Short-lived signed URL to the image asset (platforms fetch it). */
  imageUrl: string;
}

export interface Connector {
  network: string;
  /** True when credentials exist to even attempt a publish. */
  isConfigured(connections: ConnectionsMap): boolean;
  /** Human-readable connection state for the UI. */
  statusDetail(connections: ConnectionsMap): string;
  publish(input: PublishInput, connections: ConnectionsMap): Promise<{ externalId: string }>;
}

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

function metaPage(connections: ConnectionsMap): { pageId: string; token: string } | null {
  const meta = connections.get('meta');
  const tokens = meta?.meta_page_tokens ?? {};
  const entries = Object.entries(tokens).filter(([, t]) => typeof t === 'string' && t.length > 0);
  if (entries.length === 0) return null;
  const preferred = typeof meta?.config?.default_page_id === 'string' ? (meta.config.default_page_id as string) : null;
  const chosen = preferred && tokens[preferred] ? [preferred, tokens[preferred]] as const : entries[0];
  return { pageId: chosen[0], token: chosen[1] };
}

const facebookConnector: Connector = {
  network: 'facebook',
  isConfigured: (c) => metaPage(c) !== null,
  statusDetail: (c) =>
    metaPage(c) ? 'Connected via Meta page token' : 'Not connected: add the Meta app and page OAuth in Pulse Settings.',
  async publish(input, connections) {
    const page = metaPage(connections);
    if (!page) throw new NotConnectedError('Facebook is not connected: Meta page credentials are missing.');
    const params = new URLSearchParams({ url: input.imageUrl, message: input.caption });
    const res = await fetch(`${GRAPH_BASE}/${page.pageId}/photos?${params.toString()}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${page.token}` },
      signal: AbortSignal.timeout(30_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data as { error?: { message?: string } }).error?.message ?? `Graph API error (${res.status})`;
      throw new Error(`Facebook publish failed: ${msg}`);
    }
    const id = (data as { post_id?: string; id?: string }).post_id ?? (data as { id?: string }).id;
    if (!id) throw new Error('Facebook publish returned no post id');
    return { externalId: id };
  },
};

const instagramConnector: Connector = {
  network: 'instagram',
  isConfigured: (c) => {
    const meta = c.get('meta');
    return metaPage(c) !== null && typeof meta?.config?.ig_user_id === 'string';
  },
  statusDetail: (c) =>
    instagramConnector.isConfigured(c)
      ? 'Connected via Meta (IG business account)'
      : 'Not connected: link the Instagram business account through the Meta app.',
  async publish(input, connections) {
    const page = metaPage(connections);
    const igUserId = connections.get('meta')?.config?.ig_user_id;
    if (!page || typeof igUserId !== 'string') {
      throw new NotConnectedError('Instagram is not connected: Meta credentials with an IG business account are missing.');
    }
    const containerParams = new URLSearchParams({ image_url: input.imageUrl, caption: input.caption });
    const containerRes = await fetch(`${GRAPH_BASE}/${igUserId}/media?${containerParams.toString()}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${page.token}` },
      signal: AbortSignal.timeout(30_000),
    });
    const container = await containerRes.json().catch(() => ({}));
    if (!containerRes.ok || !(container as { id?: string }).id) {
      const msg = (container as { error?: { message?: string } }).error?.message ?? `Graph API error (${containerRes.status})`;
      throw new Error(`Instagram container failed: ${msg}`);
    }
    const publishParams = new URLSearchParams({ creation_id: (container as { id: string }).id });
    const publishRes = await fetch(`${GRAPH_BASE}/${igUserId}/media_publish?${publishParams.toString()}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${page.token}` },
      signal: AbortSignal.timeout(30_000),
    });
    const published = await publishRes.json().catch(() => ({}));
    if (!publishRes.ok || !(published as { id?: string }).id) {
      const msg = (published as { error?: { message?: string } }).error?.message ?? `Graph API error (${publishRes.status})`;
      throw new Error(`Instagram publish failed: ${msg}`);
    }
    return { externalId: (published as { id: string }).id };
  },
};

const xConnector: Connector = {
  network: 'x',
  isConfigured: (c) => Boolean(c.get('x')?.api_key),
  statusDetail: (c) =>
    c.get('x')?.api_key
      ? 'Credentials stored; publishing ships once the X API integration is approved.'
      : 'Not connected: X API credentials are required (paid developer tier).',
  publish() {
    return Promise.reject(new NotConnectedError(
      'X publishing is credential-gated: the X API requires OAuth app credentials and review before posts can be sent.',
    ));
  },
};

const tiktokConnector: Connector = {
  network: 'tiktok',
  isConfigured: (c) => Boolean(c.get('tiktok')?.api_key),
  statusDetail: (c) =>
    c.get('tiktok')?.api_key
      ? 'Credentials stored; publishing ships once the TikTok Content Posting API is approved.'
      : 'Not connected: TikTok Content Posting API approval and credentials are required.',
  publish() {
    return Promise.reject(new NotConnectedError(
      'TikTok publishing is credential-gated: the Content Posting API requires an approved app before posts can be sent.',
    ));
  },
};

export const CONNECTORS: Record<string, Connector> = {
  facebook: facebookConnector,
  instagram: instagramConnector,
  x: xConnector,
  tiktok: tiktokConnector,
};
