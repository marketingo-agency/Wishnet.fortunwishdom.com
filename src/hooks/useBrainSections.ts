import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BrainSection } from '@/types/brain';

export function useBrainSections() {
  return useQuery({
    queryKey: ['brain-sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brain_sections')
        .select('*')
        .order('type', { ascending: false }) // 'general' comes first
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as BrainSection[];
    },
  });
}

export function useBrainSection(sectionId: string) {
  return useQuery({
    queryKey: ['brain-section', sectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brain_sections')
        .select('*')
        .eq('id', sectionId)
        .single();

      if (error) throw error;
      return data as BrainSection;
    },
    enabled: !!sectionId,
  });
}

export function useBrainSectionByAgent(agentId: string | null) {
  return useQuery({
    queryKey: ['brain-section-agent', agentId],
    queryFn: async () => {
      if (agentId === 'general') {
        const { data, error } = await supabase
          .from('brain_sections')
          .select('*')
          .eq('type', 'general')
          .single();

        if (error) throw error;
        return data as BrainSection;
      }

      const { data, error } = await supabase
        .from('brain_sections')
        .select('*')
        .eq('agent_id', agentId || '')
        .single();

      if (error) throw error;
      return data as BrainSection;
    },
    enabled: !!agentId,
  });
}

export function useGeneralSection() {
  return useQuery({
    queryKey: ['brain-section-general'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brain_sections')
        .select('*')
        .eq('type', 'general')
        .single();

      if (error) throw error;
      return data as BrainSection;
    },
  });
}
