/**
 * AGENT-007: System prompt management hooks.
 * Fetches and manages system prompts stored in the DB.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SystemPrompt {
  id: string;
  agent_id: string;
  prompt_key: string;
  content: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useSystemPrompts(agentId?: string) {
  return useQuery({
    queryKey: ['system-prompts', agentId],
    queryFn: async () => {
      let query = supabase
        .from('system_prompts')
        .select('*')
        .order('agent_id')
        .order('prompt_key')
        .order('version', { ascending: false });

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as SystemPrompt[];
    },
  });
}

export function useCreateSystemPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prompt: {
      agent_id: string;
      prompt_key: string;
      content: string;
    }) => {
      // Get the latest version for this agent+key
      const { data: existing } = await supabase
        .from('system_prompts')
        .select('version')
        .eq('agent_id', prompt.agent_id)
        .eq('prompt_key', prompt.prompt_key)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (existing?.version ?? 0) + 1;

      // Deactivate previous versions
      await supabase
        .from('system_prompts')
        .update({ is_active: false })
        .eq('agent_id', prompt.agent_id)
        .eq('prompt_key', prompt.prompt_key);

      // Insert new version
      const { data, error } = await supabase
        .from('system_prompts')
        .insert({
          ...prompt,
          version: nextVersion,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SystemPrompt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-prompts'] });
    },
  });
}

export function useRollbackSystemPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ agentId, promptKey, targetVersion }: {
      agentId: string;
      promptKey: string;
      targetVersion: number;
    }) => {
      // Deactivate all versions
      await supabase
        .from('system_prompts')
        .update({ is_active: false })
        .eq('agent_id', agentId)
        .eq('prompt_key', promptKey);

      // Activate the target version
      const { error } = await supabase
        .from('system_prompts')
        .update({ is_active: true })
        .eq('agent_id', agentId)
        .eq('prompt_key', promptKey)
        .eq('version', targetVersion);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-prompts'] });
    },
  });
}
