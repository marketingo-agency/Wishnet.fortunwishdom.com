import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PromptorRun } from './types';

export function usePromptorRuns() {
  return useQuery({
    queryKey: ['promptor-runs'],
    queryFn: async (): Promise<PromptorRun[]> => {
      const { data, error } = await supabase
        .from('promptor_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        variants: Array.isArray(r.variants) ? r.variants : [],
        qa_checklist: Array.isArray(r.qa_checklist) ? r.qa_checklist : [],
      }));
    },
  });
}

export function useDeletePromptorRuns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('promptor_runs')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promptor-runs'] });
    },
  });
}

export function useClearPromptorRuns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('promptor_runs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promptor-runs'] });
    },
  });
}
