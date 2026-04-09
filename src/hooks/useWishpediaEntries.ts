/**
 * useWishpediaEntries Hook (New Schema)
 * CRUD for wishpedia entries linked to categories
 * Includes automatic RAG indexing via embeddings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { escapePostgrestSearch } from '@/lib/utils';
import { useProcessWishpediaEntryEmbedding, useDeleteEmbedding } from '@/hooks/useKnowledgeEmbeddings';
import type { WishpediaEntry } from '@/types/wishpedia';

interface UseEntriesOptions {
  search?: string;
  categoryId?: string | 'all';
  includeArchived?: boolean;
}

function generateSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useWishpediaEntries(options: UseEntriesOptions = {}) {
  const { search = '', categoryId = 'all', includeArchived = false } = options;

  return useQuery({
    queryKey: ['wishpedia-entries', search, categoryId, includeArchived],
    queryFn: async () => {
      let query = supabase
        .from('wishpedia_entries')
        .select('*');

      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }
      if (categoryId !== 'all') {
        query = query.eq('category_id', categoryId);
      }
      if (search) {
        const safe = escapePostgrestSearch(search);
        query = query.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as WishpediaEntry[];
    },
  });
}

export function useWishpediaEntry(id: string | undefined) {
  return useQuery({
    queryKey: ['wishpedia-entry', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('wishpedia_entries')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as WishpediaEntry | null;
    },
    enabled: !!id,
  });
}

export function useWishpediaEntryBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['wishpedia-entry-slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      const isUuid = UUID_RE.test(slug);
      const { data, error } = await supabase
        .from('wishpedia_entries')
        .select('*')
        .eq(isUuid ? 'id' : 'slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as WishpediaEntry | null;
    },
    enabled: !!slug,
  });
}

export function useWishpediaEntryCount() {
  return useQuery({
    queryKey: ['wishpedia-entry-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('wishpedia_entries')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false);
      if (error) throw error;
      return count || 0;
    },
  });
}

export function useCreateWishpediaEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const processEmbedding = useProcessWishpediaEntryEmbedding();

  return useMutation({
    mutationFn: async (entry: { name: string; description?: string; category_id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const slug = generateSlug(entry.name);
      const { data, error } = await supabase
        .from('wishpedia_entries')
        .insert({ ...entry, slug, created_by: userData.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WishpediaEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wishpedia-entries'] });
      queryClient.invalidateQueries({ queryKey: ['wishpedia-entry-count'] });
      toast({ title: 'Entry created' });
      // Auto-index in background (only if there's a description to index)
      if (data.description) {
        processEmbedding.mutate(data.id);
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteWishpediaEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteEmbedding = useDeleteEmbedding();

  return useMutation({
    mutationFn: async (entryId: string) => {
      // 1. Delete embeddings first
      try {
        await deleteEmbedding.mutateAsync({ sourceType: 'wishpedia_entry', sourceId: entryId });
      } catch (e) {
        console.warn('Failed to delete embeddings (continuing):', e);
      }

      // 2. Fetch all images for this entry
      const { data: images } = await supabase
        .from('wishpedia_entry_images')
        .select('id, storage_path')
        .eq('entry_id', entryId);

      if (images && images.length > 0) {
        const paths = images.map((img) => img.storage_path);
        await supabase.storage.from('wishpedia-media').remove(paths);

        await supabase
          .from('wishpedia_entry_images')
          .delete()
          .eq('entry_id', entryId);
      }

      const { error } = await supabase
        .from('wishpedia_entries')
        .delete()
        .eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishpedia-entries'] });
      queryClient.invalidateQueries({ queryKey: ['wishpedia-entry-count'] });
      queryClient.invalidateQueries({ queryKey: ['wishpedia-images'] });
      toast({ title: 'Entry deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateWishpediaEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const processEmbedding = useProcessWishpediaEntryEmbedding();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WishpediaEntry> }) => {
      const updatesWithSlug = updates.name
        ? { ...updates, slug: generateSlug(updates.name) }
        : updates;

      const { data, error } = await supabase
        .from('wishpedia_entries')
        .update(updatesWithSlug)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WishpediaEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wishpedia-entries'] });
      queryClient.invalidateQueries({ queryKey: ['wishpedia-entry', data.id] });
      queryClient.invalidateQueries({ queryKey: ['wishpedia-entry-slug'] });
      queryClient.invalidateQueries({ queryKey: ['wishpedia-entry-count'] });
      toast({ title: 'Entry updated' });
      // Re-index with updated content
      processEmbedding.mutate(data.id);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}