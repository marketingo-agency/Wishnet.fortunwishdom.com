/**
 * Tags Hooks
 * File tag management operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FileTag } from './types';

export function useFileTags(fileId: string) {
  return useQuery({
    queryKey: ['file-tags', fileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_tags')
        .select('*')
        .eq('file_id', fileId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as FileTag[];
    },
    enabled: !!fileId,
  });
}

export function useAddTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      name,
      color,
    }: {
      fileId: string;
      name: string;
      color: string;
    }) => {
      const { data, error } = await supabase
        .from('file_tags')
        .insert({
          file_id: fileId,
          name,
          color,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['file-tags', variables.fileId] });
    },
    onError: (error) => {
      toast.error('Failed to add tag: ' + error.message);
    },
  });
}

export function useRemoveTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tagId, fileId }: { tagId: string; fileId: string }) => {
      const { error } = await supabase.from('file_tags').delete().eq('id', tagId);
      if (error) throw error;
      return fileId;
    },
    onSuccess: (fileId) => {
      queryClient.invalidateQueries({ queryKey: ['file-tags', fileId] });
    },
    onError: (error) => {
      toast.error('Failed to remove tag: ' + error.message);
    },
  });
}
