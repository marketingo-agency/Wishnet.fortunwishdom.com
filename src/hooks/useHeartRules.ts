import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { HeartRule } from '@/types/brain';

export function useHeartRules(category?: string) {
  return useQuery({
    queryKey: ['heart-rules', category],
    queryFn: async () => {
      let query = supabase
        .from('heart_rules')
        .select('*')
        .order('sort_order', { ascending: true });
      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as HeartRule[];
    },
  });
}

export function useActiveRulesCount() {
  return useQuery({
    queryKey: ['heart-rules-active-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('heart_rules')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (error) throw error;
      return count || 0;
    },
  });
}

export function useCreateHeartRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      ruleContent,
      category,
      priority,
      isGlobal,
      assignedAgents,
    }: {
      name: string;
      description?: string;
      ruleContent: string;
      category: string;
      priority: string;
      isGlobal: boolean;
      assignedAgents?: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('heart_rules')
        .insert({
          name,
          description,
          rule_content: ruleContent,
          category,
          priority,
          is_global: isGlobal,
          assigned_agents: !isGlobal && assignedAgents ? assignedAgents : null,
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heart-rules'] });
      queryClient.invalidateQueries({ queryKey: ['heart-rules-active-count'] });
      toast.success('Rule created successfully');
      // Note: Indexing is now manual per manual-indexing-policy
    },
    onError: (error) => {
      toast.error('Failed to create rule: ' + error.message);
    },
  });
}

export function useUpdateHeartRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<HeartRule, 'name' | 'description' | 'rule_content' | 'category' | 'priority' | 'is_global' | 'assigned_agents' | 'is_active'>>;
    }) => {
      const { data, error } = await supabase
        .from('heart_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heart-rules'] });
      queryClient.invalidateQueries({ queryKey: ['heart-rules-active-count'] });
      toast.success('Rule updated');
      // Note: Re-indexing after edit is manual per manual-indexing-policy
    },
    onError: (error) => {
      toast.error('Failed to update rule: ' + error.message);
    },
  });
}

export function useDeleteHeartRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // CODE-023: await embedding cleanup so vector store stays consistent
      try {
        const { processEmbedding } = await import('@/hooks/useKnowledgeEmbeddings');
        await processEmbedding({
          action: 'delete',
          source_type: 'heart_rule',
          source_id: id,
        });
        queryClient.invalidateQueries({ queryKey: ['vector-store'] });
      } catch {
        toast.error('Failed to clean up embeddings — vector store may need manual cleanup');
      }

      const { error } = await supabase
        .from('heart_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heart-rules'] });
      queryClient.invalidateQueries({ queryKey: ['heart-rules-active-count'] });
      toast.success('Rule deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete rule: ' + error.message);
    },
  });
}

export function useToggleHeartRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('heart_rules')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['heart-rules'] });
      queryClient.invalidateQueries({ queryKey: ['heart-rules-active-count'] });
      toast.success(variables.isActive ? 'Rule enabled' : 'Rule disabled');
    },
    onError: (error) => {
      toast.error('Failed to toggle rule: ' + error.message);
    },
  });
}

/**
 * Reorder heart rules by updating their sort_order values
 */
export function useReorderHeartRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      // Batch update all sort orders
      const promises = updates.map(({ id, sort_order }) =>
        supabase
          .from('heart_rules')
          .update({ sort_order })
          .eq('id', id)
      );
      const results = await Promise.all(promises);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error?.message || 'Failed to reorder rules');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heart-rules'] });
      queryClient.invalidateQueries({ queryKey: ['heart-rules-active-count'] });
      toast.success('Rules reordered');
    },
    onError: (error) => {
      toast.error('Failed to reorder rules: ' + error.message);
    },
  });
}
