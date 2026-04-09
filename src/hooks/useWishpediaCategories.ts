/**
 * useWishpediaCategories Hook
 * CRUD operations for admin-managed wishpedia categories
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WishpediaCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  has_angle_views: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useWishpediaCategories() {
  return useQuery({
    queryKey: ['wishpedia-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wishpedia_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as WishpediaCategory[];
    },
  });
}

export function useCreateWishpediaCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (category: { name: string; description?: string; icon: string; color: string; has_angle_views: boolean }) => {
      const { data, error } = await supabase
        .from('wishpedia_categories')
        .insert(category)
        .select()
        .single();
      if (error) throw error;
      return data as WishpediaCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishpedia-categories'] });
      toast({ title: 'Category created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateWishpediaCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<WishpediaCategory, 'id' | 'created_at' | 'updated_at'>> }) => {
      const { data, error } = await supabase
        .from('wishpedia_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as WishpediaCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishpedia-categories'] });
      toast({ title: 'Category updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteWishpediaCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wishpedia_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishpedia-categories'] });
      toast({ title: 'Category deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
