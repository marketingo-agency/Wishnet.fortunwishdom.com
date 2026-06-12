"use client";

/**
 * Images Repurposing (Mode 3) source layer.
 * A pending source is an image queued for the run: a fresh upload, a Files
 * media-library row, or an existing Content Library asset. On continue the
 * wizard materializes each one as an omni_assets row owned by the current
 * user (uploads store bytes; picks reference the existing storage path).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { callContentLibrary } from '@/lib/contentLibraryApi';
import type { LibraryImage } from '@/hooks/omni';

export interface LibraryAssetRef {
  id: string;
  storage_path: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
}

export type PendingSource =
  | { key: string; kind: 'upload'; label: string; file: File; previewUrl: string }
  | { key: string; kind: 'files'; label: string; row: LibraryImage; previewUrl: string | null }
  | { key: string; kind: 'content_library'; label: string; asset: LibraryAssetRef; previewUrl: string | null };

export interface ContentLibraryPickerItem {
  id: string;
  title: string;
  assets: LibraryAssetRef[];
}

/**
 * Content Library items with their resolvable image assets.
 * Admin-only RLS: non-admins simply get an empty list.
 */
export function useContentLibraryPickerItems(enabled: boolean) {
  return useQuery<ContentLibraryPickerItem[]>({
    queryKey: ['omni-repurpose-library-items'],
    enabled,
    queryFn: async () => {
      const { data: items, error } = await supabase
        .from('content_library_items')
        .select('id, title, metadata, content_library_posts(asset_id)')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;

      const rows = (items ?? []) as unknown as Array<{
        id: string;
        title: string;
        metadata: { asset_ids?: string[] } | null;
        content_library_posts: Array<{ asset_id: string | null }>;
      }>;

      const idsPerItem = rows.map((row) => {
        const ids = new Set<string>();
        for (const post of row.content_library_posts) {
          if (post.asset_id) ids.add(post.asset_id);
        }
        for (const id of row.metadata?.asset_ids ?? []) ids.add(id);
        return { id: row.id, title: row.title, assetIds: [...ids] };
      });

      const allAssetIds = [...new Set(idsPerItem.flatMap((i) => i.assetIds))].slice(0, 60);
      if (allAssetIds.length === 0) return idsPerItem.map((i) => ({ id: i.id, title: i.title, assets: [] }));

      const { data: assets, error: assetsError } = await supabase
        .from('omni_assets')
        .select('id, storage_path, mime_type, width, height')
        .in('id', allAssetIds)
        .eq('status', 'done')
        .not('storage_path', 'is', null);
      if (assetsError) throw assetsError;

      const byId = new Map(
        ((assets ?? []) as unknown as LibraryAssetRef[]).map((a) => [a.id, a]),
      );
      return idsPerItem.map((item) => ({
        id: item.id,
        title: item.title,
        assets: item.assetIds.map((id) => byId.get(id)).filter((a): a is LibraryAssetRef => !!a),
      }));
    },
  });
}

/** Signed previews for the Content Library picker (service-role signed via the edge). */
export function useLibraryPickerUrls(assetIds: string[]) {
  const key = [...assetIds].sort().join(',');
  return useQuery<Record<string, string>>({
    queryKey: ['omni-repurpose-asset-urls', key],
    enabled: assetIds.length > 0,
    staleTime: 20 * 60 * 1000,
    queryFn: async () => {
      const { urls } = await callContentLibrary<{ urls: Record<string, string> }>(
        'library-asset-urls',
        { asset_ids: assetIds.slice(0, 60) },
      );
      return urls;
    },
  });
}

/** Reference a Content Library asset as a source in the new repurposing run. */
export async function referenceContentLibraryAsset(
  runId: string,
  asset: LibraryAssetRef,
  itemTitle: string,
): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not authenticated');

  const { data: created, error } = await supabase
    .from('omni_assets')
    .insert({
      user_id: userData.user.id,
      run_id: runId,
      kind: 'image',
      status: 'done',
      storage_path: asset.storage_path,
      mime_type: asset.mime_type,
      width: asset.width,
      height: asset.height,
      metadata: { source: 'content_library', source_asset_id: asset.id, item_title: itemTitle } as never,
    })
    .select('id')
    .single();
  if (error || !created) throw new Error(error?.message ?? 'Asset record failed');
  return (created as { id: string }).id;
}
