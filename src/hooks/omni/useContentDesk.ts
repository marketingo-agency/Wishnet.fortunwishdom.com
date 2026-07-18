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
  published_at: string | null;
  published_by: string | null;
  published_url: string | null;
}

export interface DeskPost {
  id: string;
  created_by: string;
  title: string;
  notes: string | null;
  status: 'draft' | 'scheduled' | 'partially_published' | 'published' | 'archived';
  scheduled_at: string | null;
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
