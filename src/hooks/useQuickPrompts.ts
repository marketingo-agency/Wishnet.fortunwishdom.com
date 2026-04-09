import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface QuickPrompt {
  id: string;
  label: string;
  prompt: string;
  mode: 'text' | 'image' | 'research';
  icon: string;
  is_default: boolean;
  sort_order: number;
}

export function useQuickPrompts() {
  return useQuery({
    queryKey: ['quick-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quick_prompts')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as QuickPrompt[];
    },
  });
}

export function useUpdateQuickPrompt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<QuickPrompt> }) => {
      const { error } = await supabase
        .from('quick_prompts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-prompts'] });
    },
  });
}

export function useCreateQuickPrompt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (prompt: Omit<QuickPrompt, 'id' | 'is_default' | 'sort_order'> & { sort_order?: number }) => {
      const { error } = await supabase
        .from('quick_prompts')
        .insert({
          label: prompt.label,
          prompt: prompt.prompt,
          mode: prompt.mode,
          icon: prompt.icon,
          is_default: false,
          sort_order: prompt.sort_order ?? 100,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-prompts'] });
    },
  });
}

export function useDeleteQuickPrompt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quick_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-prompts'] });
    },
  });
}
