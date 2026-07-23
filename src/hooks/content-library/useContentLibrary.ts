"use client";

/**
 * Content Library data layer (colocated with the Pulse library tab).
 * Items and posts read directly through admin RLS; everything that signs
 * storage URLs, publishes, or stores credentials goes through the
 * content-library edge function.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { callContentLibrary } from '@/lib/contentLibraryApi';
import type { LibraryNetwork, LibraryPostStatus } from './libraryStatus';

export interface ContentLibraryPost {
  id: string;
  item_id: string;
  network: LibraryNetwork;
  asset_id: string | null;
  caption: string | null;
  scheduled_at: string | null;
  status: LibraryPostStatus;
  error: string | null;
  posted_at: string | null;
  external_post_id: string | null;
  media_type: 'image' | 'video' | 'audio';
  created_at: string;
  updated_at: string;
}

export interface ContentLibraryItem {
  id: string;
  title: string;
  description: string | null;
  source_run_id: string | null;
  networks: string[];
  status: 'ready' | 'archived';
  media_type: 'image' | 'video' | 'audio';
  metadata: { asset_ids?: string[]; srt_path?: string; thumb_path?: string; duration_s?: number } & Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  content_library_posts: ContentLibraryPost[];
}

/** Cover asset for an item: first post with an asset, else the saved item-only refs. */
export function itemCoverAssetId(item: ContentLibraryItem): string | null {
  const fromPost = item.content_library_posts.find((p) => p.asset_id)?.asset_id;
  if (fromPost) return fromPost;
  return item.metadata.asset_ids?.[0] ?? null;
}

export function useLibraryItems() {
  return useQuery<ContentLibraryItem[]>({
    queryKey: ['content-library-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_library_items')
        .select('*, content_library_posts(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ContentLibraryItem[];
    },
  });
}

export interface LibraryAssetUrls {
  urls: Record<string, string>;
  /** extract-frame thumbnails for VIDEO assets (Plan 2 sidecars). */
  thumbs: Record<string, string>;
}

/** Signed URLs for library assets (service-role signed, cross-user, 24h). */
export function useLibraryAssetUrls(assetIds: string[]) {
  const key = [...assetIds].sort().join(',');
  return useQuery<LibraryAssetUrls>({
    queryKey: ['library-asset-urls', key],
    enabled: assetIds.length > 0,
    staleTime: 20 * 60 * 1000,
    queryFn: async () => {
      const { urls, thumbs } = await callContentLibrary<{ urls: Record<string, string>; thumbs?: Record<string, string> }>(
        'library-asset-urls',
        { asset_ids: assetIds.slice(0, 60) },
      );
      return { urls, thumbs: thumbs ?? {} };
    },
  });
}

export interface NetworkConnectionStatus {
  connected: boolean;
  detail: string;
}

export function useLibraryConnections() {
  return useQuery<Record<string, NetworkConnectionStatus>>({
    queryKey: ['library-connections'],
    queryFn: async () => {
      const { networks } = await callContentLibrary<{ networks: Record<string, NetworkConnectionStatus> }>(
        'connections-status',
      );
      return networks;
    },
  });
}

function useInvalidateLibrary() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['content-library-items'] });
    queryClient.invalidateQueries({ queryKey: ['library-connections'] });
  };
}

/** Record a MANUAL Pulse (upload-post) publish so the row reflects reality. */
export function useMarkPosted() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (postId: string) =>
      callContentLibrary<{ success: boolean }>('mark-posted', { post_id: postId }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(`Published, but recording it failed: ${e.message}`),
  });
}

export function usePostNow() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (postId: string) =>
      callContentLibrary<{ success: boolean; outcome: string }>('post-now', { post_id: postId }),
    onSuccess: (res) => {
      invalidate();
      if (res.outcome === 'posted') toast.success('Post published');
      else if (res.outcome === 'queued') toast.info('Network not connected yet: the post is queued and will go out once credentials are added.');
      else toast.error('Publish failed: check the post for the error detail.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSchedulePost() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (params: { postId: string; scheduledAt: string }) =>
      callContentLibrary('schedule-post', { post_id: params.postId, scheduled_at: params.scheduledAt }),
    onSuccess: () => {
      invalidate();
      toast.success('Post scheduled');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUnschedulePost() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (postId: string) => callContentLibrary('unschedule-post', { post_id: postId }),
    onSuccess: () => {
      invalidate();
      toast.success('Schedule removed: the post is back to draft.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRunDispatch() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: () =>
      callContentLibrary<{ posted: number; queued: number; failed: number; skipped?: boolean }>('dispatch-due'),
    onSuccess: (res) => {
      invalidate();
      if (res.skipped) {
        toast.info('Another dispatch ran within the last minute; skipped to avoid double-posting.');
      } else {
        toast.success(`Dispatch finished: ${res.posted} posted, ${res.queued} queued, ${res.failed} failed.`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSetConnection() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (params: { provider: 'x' | 'tiktok'; apiKey: string }) =>
      callContentLibrary('set-connection', { provider: params.provider, api_key: params.apiKey }),
    onSuccess: () => {
      invalidate();
      toast.success('Connection saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Delete a library entry (its per-network posts cascade-delete server-side).
 *  Non-destructive to the source Omni run/assets (FK links are SET NULL). */
export function useDeleteLibraryItem() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (itemId: string) => callContentLibrary('delete-item', { item_id: itemId }),
    onSuccess: () => {
      invalidate();
      toast.success('Library entry deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
