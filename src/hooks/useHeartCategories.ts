import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HeartCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateHeartCategoryInput {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
}

export interface UpdateHeartCategoryInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
}

export function useHeartCategories() {
  return useQuery({
    queryKey: ['heart-categories'],
    queryFn: async (): Promise<HeartCategory[]> => {
      const { data, error } = await supabase
        .from('heart_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateHeartCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateHeartCategoryInput) => {
      // Get max sort_order
      const { data: existing } = await supabase
        .from('heart_categories')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

      const { data, error } = await supabase
        .from('heart_categories')
        .insert({
          id: input.id,
          name: input.name,
          description: input.description || null,
          icon: input.icon,
          color: input.color,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heart-categories'] });
      toast.success('Heart category created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
}

export function useUpdateHeartCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateHeartCategoryInput }) => {
      const { data, error } = await supabase
        .from('heart_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heart-categories'] });
      toast.success('Heart category updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });
}

export function useDeleteHeartCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('heart_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heart-categories'] });
      toast.success('Heart category deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });
}
