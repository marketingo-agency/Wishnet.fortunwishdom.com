/**
 * Sectors (Folders) Hooks
 * Folder/sector management operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Sector } from './types';

export function useSectors() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sectors', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Sector[];
    },
    enabled: !!user,
  });
}

export function useCreateSector() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sectors')
        .insert({
          user_id: user.id,
          name,
          color,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      toast.success('Sector created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create sector: ' + error.message);
    },
  });
}

export function useUpdateSector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<{ name: string; color: string }>;
    }) => {
      const { data, error } = await supabase
        .from('sectors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      toast.success('Folder updated');
    },
    onError: (error) => {
      toast.error('Failed to update folder: ' + error.message);
    },
  });
}

export function useDeleteSector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, unassign all files from this folder
      await supabase
        .from('files')
        .update({ sector_id: null })
        .eq('sector_id', id);

      // Then delete the folder
      const { error } = await supabase.from('sectors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Folder deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete folder: ' + error.message);
    },
  });
}
