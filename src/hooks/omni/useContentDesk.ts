"use client";

/**
 * Publishing Desk data layer: the omni-content edge function client.
 * One query owns the whole board (posts + media + targets + signed URLs);
 * every mutation invalidates it. Media uploads go client-direct to the
 * private omni-content bucket (storage RLS confines writes to the caller's
 * own uid folder), then register-media re-validates server-side.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { callOmniContent } from '@/lib/omniApi';
import { DESK_UPLOAD_MAX_BYTES, DESK_UPLOAD_MIMES } from '@/components/omni/content/contentConstants';

export interface DeskMedia {
  id: string;
  post_id: string;
  kind: 'image' | 'video';
  storage_path: string;
  mime_type: string;
  sort: number;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  url: string | null;
  download_url: string | null;
}

export interface DeskTarget {
  id: string;
  post_id: string;
  network: string;
  network_label: string | null;
  post_type: string;
  caption: string;
  status: 'scheduled' | 'published';
  publish_mode: 'auto' | 'manual';
  metricool_post_id: string | null;
  metricool_status: string | null;
  sync_error: string | null;
  last_synced_at: string | null;
  published_at: string | null;
  published_by: string | null;
  published_url: string | null;
}

export interface DeskPost {
  id: string;
  created_by: string;
  title: string;
  notes: string | null;
  status: 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'partially_published' | 'published' | 'archived';
  scheduled_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
  media: DeskMedia[];
  targets: DeskTarget[];
}

export interface DeskTargetInput {
  network: string;
  network_label?: string | null;
  post_type: string;
  caption: string;
  publish_mode?: 'auto' | 'manual';
}

/** A target pushed to Metricool and not yet published = armed (locked). */
export const isArmedTarget = (t: DeskTarget): boolean =>
  Boolean(t.metricool_post_id) && t.status !== 'published';

export interface MetricoolStatus {
  configured: boolean;
  brand_selected?: boolean;
  brand_label?: string | null;
  brand_timezone?: string | null;
  networks?: Record<string, string>;
  pinterest_boards?: number;
  last_checked_at?: string | null;
}

export interface MetricoolBrand {
  id: number;
  label: string;
  timezone: string | null;
  picture: string | null;
  networks: Record<string, string>;
}

export const DESK_QUERY_KEY = ['omni-content-posts'];

export function useDeskPosts(includeArchived = false) {
  return useQuery<DeskPost[]>({
    queryKey: [...DESK_QUERY_KEY, includeArchived],
    staleTime: 30_000,
    queryFn: async () => {
      const res = await callOmniContent<{ posts: DeskPost[] }>('list-posts', { include_archived: includeArchived });
      return res.posts;
    },
  });
}

function useDeskInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: DESK_QUERY_KEY });
}

export function useCreateDeskPost() {
  const invalidate = useDeskInvalidate();
  return useMutation({
    mutationFn: async (input: { title: string; notes?: string; scheduled_at?: string | null; targets: DeskTargetInput[] }) => {
      const res = await callOmniContent<{ post: DeskPost }>('create-post', { ...input });
      return res.post;
    },
    onSuccess: () => void invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateDeskPost() {
  const invalidate = useDeskInvalidate();
  return useMutation({
    mutationFn: async (input: {
      post_id: string;
      title?: string;
      notes?: string | null;
      scheduled_at?: string | null;
      targets?: DeskTargetInput[];
    }) => callOmniContent<{ success: boolean; status: string }>('update-post', { ...input }),
    onSuccess: () => void invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMarkPublished() {
  const invalidate = useDeskInvalidate();
  return useMutation({
    mutationFn: async (input: { target_id: string; published_url?: string }) =>
      callOmniContent<{ success: boolean; post_status: string }>('mark-published', { ...input }),
    onSuccess: () => void invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUnpublishTarget() {
  const invalidate = useDeskInvalidate();
  return useMutation({
    mutationFn: async (targetId: string) =>
      callOmniContent<{ success: boolean; post_status: string }>('unpublish-target', { target_id: targetId }),
    onSuccess: () => void invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useArchiveDeskPost() {
  const invalidate = useDeskInvalidate();
  return useMutation({
    mutationFn: async (input: { post_id: string; unarchive?: boolean }) =>
      callOmniContent<{ success: boolean }>(input.unarchive ? 'unarchive-post' : 'archive-post', { post_id: input.post_id }),
    onSuccess: () => void invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDeskPost() {
  const invalidate = useDeskInvalidate();
  return useMutation({
    mutationFn: async (postId: string) => callOmniContent<{ success: boolean }>('delete-post', { post_id: postId }),
    onSuccess: () => void invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDeskMedia() {
  const invalidate = useDeskInvalidate();
  return useMutation({
    mutationFn: async (mediaId: string) => callOmniContent<{ success: boolean }>('delete-media', { media_id: mediaId }),
    onSuccess: () => void invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useGenerateDeskCaptions() {
  return useMutation({
    mutationFn: async (input: {
      title: string;
      notes?: string;
      media_summary?: string;
      targets: { network: string; network_label?: string | null; post_type: string }[];
    }) => callOmniContent<{ captions: string[]; retrieval: { brain_chunks: number; heart_rules: number } }>(
      'generate-captions',
      { ...input },
    ),
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---- Metricool connection + approval layer ----

export const METRICOOL_STATUS_KEY = ['metricool-status'];

export function useMetricoolStatus() {
  return useQuery<MetricoolStatus>({
    queryKey: METRICOOL_STATUS_KEY,
    staleTime: 60_000,
    queryFn: () => callOmniContent<MetricoolStatus>('metricool-status'),
  });
}

export function useSaveMetricoolToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { token: string; metricool_user_id: string }) =>
      callOmniContent<{ success: boolean; brands: MetricoolBrand[] }>('metricool-save-token', { ...input }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: METRICOOL_STATUS_KEY }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMetricoolBrands(enabled: boolean) {
  return useQuery<{ brands: MetricoolBrand[] }>({
    queryKey: ['metricool-brands'],
    enabled,
    staleTime: 60_000,
    retry: false,
    queryFn: () => callOmniContent<{ brands: MetricoolBrand[] }>('metricool-brands'),
  });
}

export function useSaveMetricoolBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (blogId: string) =>
      callOmniContent<{ success: boolean }>('metricool-save-brand', { blog_id: blogId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: METRICOOL_STATUS_KEY });
      toast.success('Brand saved. Auto-publish is ready.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDisconnectMetricool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => callOmniContent<{ success: boolean }>('metricool-disconnect'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: METRICOOL_STATUS_KEY });
      toast.success('Metricool disconnected.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSubmitForApproval() {
  const invalidate = useDeskInvalidate();
  return useMutation({
    mutationFn: async (postId: string) =>
      callOmniContent<{ success: boolean }>('submit-for-approval', { post_id: postId }),
    onSuccess: () => void invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });
}

export interface ApproveResult {
  success: boolean;
  post_status: string;
  pushed: number;
  demoted: number;
  failures: { network: string; error: string }[];
}

export function useApprovePost() {
  const invalidate = useDeskInvalidate();
  return useMutation({
    mutationFn: async (postId: string) => callOmniContent<ApproveResult>('approve-post', { post_id: postId }),
    onSuccess: () => void invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRejectPost() {
  const invalidate = useDeskInvalidate();
  return useMutation({
    mutationFn: async (input: { post_id: string; reason?: string }) =>
      callOmniContent<{ success: boolean }>('reject-post', { ...input }),
    onSuccess: () => void invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRevertApproval() {
  const invalidate = useDeskInvalidate();
  return useMutation({
    mutationFn: async (postId: string) =>
      callOmniContent<{ success: boolean; disarmed: number }>('revert-approval', { post_id: postId }),
    onSuccess: (res) => {
      void invalidate();
      toast.success(`Approval reverted${res.disarmed > 0 ? ` (${res.disarmed} scheduled post${res.disarmed === 1 ? '' : 's'} removed from Metricool)` : ''}.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMetricoolSync() {
  const invalidate = useDeskInvalidate();
  return useMutation({
    mutationFn: async (postId?: string) =>
      callOmniContent<{ success: boolean; synced: number }>('metricool-sync', postId ? { post_id: postId } : {}),
    onSuccess: () => void invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });
}

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

/** Read intrinsic dimensions for a nicer card layout (best-effort). */
async function probeDimensions(file: File): Promise<{ width?: number; height?: number }> {
  if (!file.type.startsWith('image/')) return {};
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    img.src = url;
  });
}

/**
 * Upload one file client-direct to the omni-content bucket under
 * `${uid}/${postId}/${uuid}.${ext}`, then register it server-side (the edge
 * re-validates existence, MIME, and the path binding).
 */
export async function uploadDeskMedia(postId: string, file: File): Promise<DeskMedia> {
  if (!DESK_UPLOAD_MIMES.includes(file.type)) {
    throw new Error(`${file.name}: unsupported type (images or MP4/WebM video only)`);
  }
  if (file.size > DESK_UPLOAD_MAX_BYTES) {
    throw new Error(`${file.name} is over the 500MB limit`);
  }
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error('Your session expired. Sign in again.');

  const ext = EXT_BY_MIME[file.type] ?? 'bin';
  const path = `${uid}/${postId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('omni-content')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

  const dims = await probeDimensions(file);
  const res = await callOmniContent<{ media: DeskMedia }>('register-media', {
    post_id: postId,
    storage_path: path,
    ...dims,
  });
  return res.media;
}
