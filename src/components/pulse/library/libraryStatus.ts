/**
 * Content Library status and network metadata shared by the library surfaces.
 * Post statuses come from content_library_posts.status; networks are the six
 * targets the Omni images + videos tracks finalize to (DB CHECK widened in
 * migration 20260614120000).
 */

export type LibraryPostStatus = 'draft' | 'queued' | 'scheduled' | 'posted' | 'failed';
export type LibraryNetwork = 'facebook' | 'instagram' | 'x' | 'tiktok' | 'youtube' | 'pinterest';

export const POST_STATUS_META: Record<LibraryPostStatus, { label: string; badge: string }> = {
  draft: { label: 'Draft', badge: 'bg-muted text-muted-foreground' },
  queued: { label: 'Queued', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  scheduled: { label: 'Scheduled', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  posted: { label: 'Posted', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  failed: { label: 'Failed', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

export const LIBRARY_NETWORKS: LibraryNetwork[] = ['facebook', 'instagram', 'x', 'tiktok', 'youtube', 'pinterest'];

export const NETWORK_META: Record<LibraryNetwork, { label: string; pill: string }> = {
  facebook: { label: 'Facebook', pill: 'bg-blue-600' },
  instagram: { label: 'Instagram', pill: 'bg-gradient-to-r from-pink-500 to-purple-500' },
  x: { label: 'X', pill: 'bg-zinc-800' },
  tiktok: { label: 'TikTok', pill: 'bg-black' },
  youtube: { label: 'YouTube', pill: 'bg-red-600' },
  pinterest: { label: 'Pinterest', pill: 'bg-red-700' },
};

/** Defensive fallback: an unknown network renders a neutral pill instead of
 *  crashing the Sheet (the C1 lesson - types can mask DB reality). */
export function networkMeta(network: string): { label: string; pill: string } {
  return NETWORK_META[network as LibraryNetwork] ?? { label: network, pill: 'bg-zinc-600' };
}

export function isLibraryNetwork(value: string): value is LibraryNetwork {
  return (LIBRARY_NETWORKS as string[]).includes(value);
}
