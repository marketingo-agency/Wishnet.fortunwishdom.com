/**
 * Brain Bridge Hooks
 * Integration between Brain documents and Files Manager
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Sector, FileRecord } from './types';

/**
 * Get or create the "Brain Knowledge" folder for organizing brain documents
 * in the Files Manager
 */
export function useGetOrCreateBrainFolder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<Sector> => {
      if (!user) throw new Error('Not authenticated');

      // Check if Brain Knowledge folder exists
      const { data: existing } = await supabase
        .from('sectors')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', 'Brain Knowledge')
        .maybeSingle();

      if (existing) return existing as Sector;

      // Create it
      const { data, error } = await supabase
        .from('sectors')
        .insert({
          user_id: user.id,
          name: 'Brain Knowledge',
          color: '#6366F1', // Indigo
        })
        .select()
        .single();

      if (error) throw error;
      return data as Sector;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
    },
  });
}

/**
 * Create a linked file record in Files Manager for a brain document
 */
export function useCreateLinkedFile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      originalName,
      storagePath,
      mimeType,
      size,
      sectorId,
      description,
    }: {
      name: string;
      originalName: string;
      storagePath: string;
      mimeType: string;
      size: number;
      sectorId: string;
      description?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          name,
          original_name: originalName,
          storage_path: storagePath,
          mime_type: mimeType,
          size,
          sector_id: sectorId,
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage-usage'] });
    },
  });
}

// Query brain documents and map to FileRecord format
export function useBrainDocumentsAsFiles() {
  return useQuery({
    queryKey: ['brain-documents-as-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brain_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map brain documents to FileRecord format
      return (data || []).map((doc): FileRecord => ({
        id: doc.id,
        user_id: doc.uploaded_by || '',
        name: doc.name,
        original_name: doc.original_name,
        storage_path: doc.storage_path,
        mime_type: doc.mime_type,
        size: doc.size,
        description: doc.description,
        is_pinned: (doc as { is_pinned?: boolean }).is_pinned ?? false,
        is_trashed: false,
        trashed_at: null,
        sector_id: 'brain-knowledge', // Virtual sector ID
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      }));
    },
  });
}

/**
 * Get the Brain Knowledge sector ID for the current user
 * Used to detect if a file belongs to the brain-documents bucket
 */
export function useBrainKnowledgeSector() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['brain-knowledge-sector', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('sectors')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', 'Brain Knowledge')
        .maybeSingle();

      if (error) throw error;
      return data?.id || null;
    },
    enabled: !!user,
  });
}
