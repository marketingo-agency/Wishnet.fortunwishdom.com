"use client";

/**
 * Generation hooks for the Omni Images wizard:
 * - useVariantSubmit: one fal queue job per variant (edge `variant-submit`)
 * - useVariantsPoll: batched status polling (edge `variants-poll`)
 * - useOmniAssets: direct RLS read of a run's asset records
 * - useDiscardAsset / useSaveAssetToFiles: per-image actions
 * - uploadRepurposedAsset: client canvas output -> own files-bucket folder
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { callOmni } from '@/lib/omniApi';
import type { OmniAsset, VariantPollResult } from './types';

export function useOmniAssets(runId: string | null) {
  return useQuery<OmniAsset[]>({
    queryKey: ['omni-assets', runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omni_assets')
        .select('*')
        .eq('run_id', runId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as OmniAsset[];
    },
  });
}

interface VariantSubmitParams {
  runId: string;
  modelId: string;
  prompt: string;
  parentAssetId?: string;
  sourceAssetId?: string;
}

export function useVariantSubmit() {
  return useMutation({
    mutationFn: async (params: VariantSubmitParams) => {
      return callOmni<{ asset_id: string; request_id: string; queue_position: number | null }>('variant-submit', {
        run_id: params.runId,
        model_id: params.modelId,
        prompt: params.prompt,
        parent_asset_id: params.parentAssetId,
        source_asset_id: params.sourceAssetId,
      });
    },
  });
}

export function useVariantsPoll() {
  return useMutation({
    mutationFn: async (assetIds: string[]) => {
      const res = await callOmni<{ results: VariantPollResult[] }>('variants-poll', { asset_ids: assetIds });
      return res.results;
    },
  });
}

export function useDiscardAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase
        .from('omni_assets')
        .update({ status: 'discarded' })
        .eq('id', assetId);
      if (error) throw error;
      return assetId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omni-assets'] });
    },
    onError: (error: Error) => {
      toast.error(`Could not discard the image: ${error.message}`);
    },
  });
}

export function useSaveAssetToFiles() {
  return useMutation({
    mutationFn: async (assetId: string) => {
      return callOmni<{ success: boolean }>('save-asset-to-files', { asset_id: assetId });
    },
    onSuccess: () => {
      toast.success('Saved to the Files library (Omni AI sector)');
    },
    onError: (error: Error) => {
      toast.error(`Could not save to the library: ${error.message}`);
    },
  });
}

export function useFinalizeRun() {
  return useMutation({
    mutationFn: async (params: {
      runId: string;
      title: string;
      description: string;
      networks: string[];
      posts: { network: string; asset_id: string; caption?: string }[];
    }) => {
      return callOmni<{ item_id: string; posts_created: number }>('finalize-run', {
        run_id: params.runId,
        title: params.title,
        description: params.description,
        networks: params.networks,
        posts: params.posts,
      });
    },
    onError: (error: Error) => {
      toast.error(`Finalize failed: ${error.message}`);
    },
  });
}

/**
 * Upload a client-produced (canvas) repurposed image into the caller's own
 * files-bucket folder and record it as an omni_assets row.
 * Storage RLS scopes writes to the caller's folder; the asset row is
 * owner-scoped. Returns the created asset id.
 */
export async function uploadRepurposedAsset(params: {
  runId: string;
  sourceAssetId: string;
  blob: Blob;
  width: number;
  height: number;
  network: string;
  presetId: string;
}): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not authenticated');
  const userId = userData.user.id;

  const { data: asset, error: assetError } = await supabase
    .from('omni_assets')
    .insert({
      user_id: userId,
      run_id: params.runId,
      parent_asset_id: params.sourceAssetId,
      kind: 'image',
      model_id: null,
      prompt: null,
      status: 'generating',
      width: params.width,
      height: params.height,
      metadata: {
        repurposed: true,
        network: params.network,
        preset_id: params.presetId,
        engine: 'canvas-crop',
        byte_size: params.blob.size,
      } as never,
    })
    .select('id')
    .single();
  if (assetError || !asset) throw new Error(assetError?.message ?? 'Asset record failed');
  const assetId = (asset as { id: string }).id;

  const storagePath = `${userId}/omni-images/${params.runId}/${assetId}.png`;
  const { error: uploadError } = await supabase.storage
    .from('files')
    .upload(storagePath, params.blob, { contentType: 'image/png', upsert: true });
  if (uploadError) {
    await supabase.from('omni_assets').update({ status: 'failed', error: uploadError.message }).eq('id', assetId);
    throw new Error(uploadError.message);
  }

  const { error: doneError } = await supabase
    .from('omni_assets')
    .update({ status: 'done', storage_path: storagePath, mime_type: 'image/png' })
    .eq('id', assetId);
  if (doneError) throw new Error(doneError.message);

  return assetId;
}

/** Mint a fresh signed URL for an owned asset (private bucket, 24h). */
export async function getAssetSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('files')
    .createSignedUrl(storagePath, 60 * 60 * 24);
  if (error) return null;
  return data?.signedUrl ?? null;
}
