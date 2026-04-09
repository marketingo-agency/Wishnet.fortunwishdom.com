/**
 * Core Files Hooks
 * Main file CRUD operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeFileName, escapePostgrestSearch } from '@/lib/utils';
import type { FileType, FileView, FileRecord } from './types';
import { getMimeTypeFilter } from './types';

export function useFiles(
  view: FileView = 'all',
  type: FileType = 'all',
  sectorId?: string | null,
  searchQuery?: string
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['files', view, type, sectorId, searchQuery, user?.id],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply view filter
      if (view === 'trash') {
        query = query.eq('is_trashed', true);
      } else {
        query = query.eq('is_trashed', false);
        if (view === 'pinned') {
          query = query.eq('is_pinned', true);
        }
      }

      // Apply sector filter
      if (sectorId) {
        query = query.eq('sector_id', sectorId);
      }

      // Apply search filter
      if (searchQuery) {
        const safe = escapePostgrestSearch(searchQuery);
        query = query.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Apply type filter in memory (for mime type prefix matching)
      let files = data as FileRecord[];
      if (type !== 'all') {
        const mimeFilters = getMimeTypeFilter(type);
        files = files.filter(file =>
          mimeFilters.some(filter => file.mime_type.startsWith(filter))
        );
      }

      return files;
    },
    enabled: !!user,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ file, sectorId }: { file: File; sectorId?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const timestamp = Date.now();
      const sanitizedName = sanitizeFileName(file.name);
      const storagePath = `${user.id}/${timestamp}_${sanitizedName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Create file record
      const { data, error } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          name: file.name,
          original_name: file.name,
          storage_path: storagePath,
          mime_type: file.type || 'application/octet-stream',
          size: file.size,
          sector_id: sectorId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial version
      await supabase.from('file_versions').insert({
        file_id: data.id,
        version_number: 1,
        storage_path: storagePath,
        size: file.size,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage-usage'] });
      toast.success('File uploaded successfully');
    },
    onError: (error) => {
      toast.error('Failed to upload file: ' + error.message);
    },
  });
}

export function useUpdateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<FileRecord, 'name' | 'description' | 'is_pinned' | 'is_trashed' | 'sector_id'>>;
    }) => {
      const updateData: Record<string, unknown> = { ...updates };
      
      if (updates.is_trashed === true) {
        updateData.trashed_at = new Date().toISOString();
      } else if (updates.is_trashed === false) {
        updateData.trashed_at = null;
      }

      const { data, error } = await supabase
        .from('files')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
    onError: (error) => {
      toast.error('Failed to update file: ' + error.message);
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      // Check if this file is a Brain document and delete its embeddings
      const { data: brainDoc } = await supabase
        .from('brain_documents')
        .select('id')
        .eq('storage_path', storagePath)
        .maybeSingle();

      if (brainDoc) {
        // Delete embeddings for this brain document
        const { processEmbedding } = await import('@/hooks/useKnowledgeEmbeddings');
        await processEmbedding({
          action: 'delete',
          source_type: 'brain_document',
          source_id: brainDoc.id,
        });
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete file record (cascades to tags and versions)
      const { error } = await supabase.from('files').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage-usage'] });
      queryClient.invalidateQueries({ queryKey: ['vector-store'] });
      toast.success('File deleted permanently');
    },
    onError: (error) => {
      toast.error('Failed to delete file: ' + error.message);
    },
  });
}
