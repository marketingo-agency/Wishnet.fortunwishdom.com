/**
 * useWishpediaImages Hook
 * Upload, CRUD, and manage images for wishpedia entries
 * Re-indexes embeddings when image inventory changes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProcessWishpediaEntryEmbedding } from '@/hooks/useKnowledgeEmbeddings';
import type { WishpediaEntryImage } from '@/types/wishpedia';

export function useWishpediaImages(entryId: string | undefined) {
  return useQuery({
    queryKey: ['wishpedia-images', entryId],
    queryFn: async () => {
      if (!entryId) return [];
      const { data, error } = await supabase
        .from('wishpedia_entry_images')
        .select('*')
        .eq('entry_id', entryId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as WishpediaEntryImage[];
    },
    enabled: !!entryId,
  });
}

export function useUploadWishpediaImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const processEmbedding = useProcessWishpediaEntryEmbedding();

  return useMutation({
    mutationFn: async ({ entryId, file, angle }: {
      entryId: string;
      file: File;
      angle?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      const sanitized = file.name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_');
      const storagePath = `${entryId}/${Date.now()}_${sanitized}`;

      const { error: uploadError } = await supabase.storage
        .from('wishpedia-media')
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      // If this is an angle upload, remove existing image for that angle
      if (angle) {
        const { data: existing } = await supabase
          .from('wishpedia_entry_images')
          .select('id, storage_path')
          .eq('entry_id', entryId)
          .eq('angle', angle);
        
        if (existing && existing.length > 0) {
          for (const old of existing) {
            await supabase.storage.from('wishpedia-media').remove([old.storage_path]);
            await supabase.from('wishpedia_entry_images').delete().eq('id', old.id);
          }
        }
      }

      const { data, error } = await supabase
        .from('wishpedia_entry_images')
        .insert({
          entry_id: entryId,
          storage_path: storagePath,
          original_name: file.name,
          mime_type: file.type,
          size: file.size,
          angle: angle || null,
          is_primary: angle === 'front',
          uploaded_by: userData.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WishpediaEntryImage;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['wishpedia-images', vars.entryId] });
      toast({ title: 'Image uploaded' });
      // Re-index entry since image inventory changed
      processEmbedding.mutate(vars.entryId);
    },
    onError: (error: Error) => {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteWishpediaImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const processEmbedding = useProcessWishpediaEntryEmbedding();

  return useMutation({
    mutationFn: async ({ image }: { image: WishpediaEntryImage }) => {
      await supabase.storage.from('wishpedia-media').remove([image.storage_path]);
      const { error } = await supabase
        .from('wishpedia_entry_images')
        .delete()
        .eq('id', image.id);
      if (error) throw error;
      return image.entry_id;
    },
    onSuccess: (entryId) => {
      queryClient.invalidateQueries({ queryKey: ['wishpedia-images'] });
      toast({ title: 'Image deleted' });
      // Re-index entry since image inventory changed
      processEmbedding.mutate(entryId);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSetPrimaryImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ imageId, entryId }: { imageId: string; entryId: string }) => {
      await supabase
        .from('wishpedia_entry_images')
        .update({ is_primary: false })
        .eq('entry_id', entryId);
      const { error } = await supabase
        .from('wishpedia_entry_images')
        .update({ is_primary: true })
        .eq('id', imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishpedia-images'] });
      toast({ title: 'Primary image set' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function getWishpediaImageUrl(storagePath: string): string {
  const { data } = supabase.storage.from('wishpedia-media').getPublicUrl(storagePath);
  return data.publicUrl;
}