/**
 * Content Library status and network metadata shared by the library surfaces.
 * Post statuses come from content_library_posts.status; networks are the four
 * Omni repurposing targets dispatched by the content-library edge function.
 */

export type LibraryPostStatus = 'draft' | 'queued' | 'scheduled' | 'posted' | 'failed';
export type LibraryNetwork = 'facebook' | 'instagram' | 'x' | 'tiktok';

export const POST_STATUS_META: Record<LibraryPostStatus, { label: string; badge: string }> = {
  draft: { label: 'Draft', badge: 'bg-muted text-muted-foreground' },
  queued: { label: 'Queued', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  scheduled: { label: 'Scheduled', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  posted: { label: 'Posted', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  failed: { label: 'Failed', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

export const LIBRARY_NETWORKS: LibraryNetwork[] = ['facebook', 'instagram', 'x', 'tiktok'];

export const NETWORK_META: Record<LibraryNetwork, { label: string; pill: string }> = {
  facebook: { label: 'Facebook', pill: 'bg-blue-600' },
  instagram: { label: 'Instagram', pill: 'bg-gradient-to-r from-pink-500 to-purple-500' },
  x: { label: 'X', pill: 'bg-zinc-800' },
  tiktok: { label: 'TikTok', pill: 'bg-black' },
};

export function isLibraryNetwork(value: string): value is LibraryNetwork {
  return (LIBRARY_NETWORKS as string[]).includes(value);
}
