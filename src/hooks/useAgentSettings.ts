import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AgentSettingsRow {
  id: string;
  agent_id: string;
  is_active: boolean;
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string | null;
  updated_at: string;
}

export interface UpsertAgentSettings {
  agent_id: string;
  is_active?: boolean;
  provider?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string | null;
}

/** Fetch settings for a single agent by its ID */
export function useAgentSettings(agentId: string | null) {
  return useQuery({
    queryKey: ['agent-settings', agentId],
    enabled: !!agentId,
    queryFn: async () => {
      if (!agentId) return null;
      const { data, error } = await supabase
        .from('agent_settings')
        .select('*')
        .eq('agent_id', agentId)
        .maybeSingle();
      if (error) throw error;
      return data as AgentSettingsRow | null;
    },
  });
}

/** Fetch settings for ALL agents at once (for grid/card status display) */
export function useAllAgentSettings() {
  return useQuery({
    queryKey: ['agent-settings-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_settings')
        .select('agent_id, is_active, model, provider');
      if (error) throw error;
      return (data ?? []) as Pick<AgentSettingsRow, 'agent_id' | 'is_active' | 'model' | 'provider'>[];
    },
  });
}

/** Upsert (insert or update) agent settings */
export function useUpsertAgentSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: UpsertAgentSettings) => {
      const { data, error } = await supabase
        .from('agent_settings')
        .upsert(settings, { onConflict: 'agent_id' })
        .select()
        .single();
      if (error) throw error;
      return data as AgentSettingsRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-settings', data.agent_id] });
      queryClient.invalidateQueries({ queryKey: ['agent-settings-all'] });
    },
  });
}
