"use client";

/**
 * Transform and Upscale (Mode 2) hooks:
 * - useAnalyzeImage: edge `analyze-image` (vision + RAG + universe relation)
 * - uploadSourceAsset: user upload -> own files-bucket folder + asset record
 * - referenceLibraryImage: Files-library pick -> asset record referencing the
 *   existing storage path (read-only reference, storage is never moved)
 * - useLibraryImages: image rows from the Files system
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { callOmni } from '@/lib/omniApi';
import type { OmniAnalysis } from './types';

export function useAnalyzeImage() {
  return useMutation({
    mutationFn: async (assetId: string) => {
      return callOmni<OmniAnalysis>('analyze-image', { asset_id: assetId });
    },
    onError: (error: Error) => {
      toast.error(`Analysis failed: ${error.message}`);
    },
  });
}

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** Upload a user image into the run and return the created asset id. */
export async function uploadSourceAsset(runId: string, file: File): Promise<string> {
  if (!IMAGE_MIMES.has(file.type)) throw new Error('Only PNG, JPEG, and WebP images are supported');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Image exceeds the 20MB limit');

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not authenticated');
  const userId = userData.user.id;

  const dims = await readImageDims(file);

  const { data: asset, error: assetError } = await supabase
    .from('omni_assets')
    .insert({
      user_id: userId,
      run_id: runId,
      kind: 'image',
      status: 'generating',
      width: dims?.width ?? null,
      height: dims?.height ?? null,
      mime_type: file.type,
      metadata: { source: 'upload', original_name: file.name, byte_size: file.size } as never,
    })
    .select('id')
    .single();
  if (assetError || !asset) throw new Error(assetError?.message ?? 'Asset record failed');
  const assetId = (asset as { id: string }).id;

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png';
  const storagePath = `${userId}/omni-images/${runId}/${assetId}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('files')
    .upload(storagePath, file, { contentType: file.type, upsert: true });
  if (uploadError) {
    await supabase.from('omni_assets').update({ status: 'failed', error: uploadError.message }).eq('id', assetId);
    throw new Error(uploadError.message);
  }

  const { error: doneError } = await supabase
    .from('omni_assets')
    .update({ status: 'done', storage_path: storagePath })
    .eq('id', assetId);
  if (doneError) throw new Error(doneError.message);
  return assetId;
}

/** Reference an existing Files-library image as a run source asset. */
export async function referenceLibraryImage(runId: string, fileRow: LibraryImage): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not authenticated');

  const { data: asset, error } = await supabase
    .from('omni_assets')
    .insert({
      user_id: userData.user.id,
      run_id: runId,
      kind: 'image',
      status: 'done',
      storage_path: fileRow.storage_path,
      mime_type: fileRow.mime_type,
      metadata: { source: 'files_library', file_id: fileRow.id, original_name: fileRow.name } as never,
    })
    .select('id')
    .single();
  if (error || !asset) throw new Error(error?.message ?? 'Asset record failed');
  return (asset as { id: string }).id;
}

export interface LibraryImage {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  created_at: string;
}

export function useLibraryImages(enabled: boolean) {
  return useQuery<LibraryImage[]>({
    queryKey: ['omni-library-images'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('id, name, storage_path, mime_type, created_at')
        .like('mime_type', 'image/%')
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as LibraryImage[];
    },
  });
}

function readImageDims(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
