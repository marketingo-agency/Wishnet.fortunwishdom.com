"use client";

/**
 * omni_runs CRUD. Owner-scoped RLS lets the wizard read and persist step
 * state directly from the client (Promptor-history precedent); everything
 * touching the fal key or storage goes through the edge function instead.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OmniImagesState, OmniMode, OmniRun } from './types';

export function useOmniRun(runId: string | null) {
  return useQuery<OmniRun | null>({
    queryKey: ['omni-run', runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omni_runs')
        .select('*')
        .eq('id', runId!)
        .maybeSingle();
      if (error) throw error;
      return data as OmniRun | null;
    },
  });
}

export function useCreateOmniRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { mode: OmniMode; title?: string; step_state?: OmniImagesState }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('omni_runs')
        .insert({
          user_id: userData.user.id,
          mode: params.mode,
          title: params.title ?? null,
          current_step: 1,
          step_state: (params.step_state ?? {}) as never,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as OmniRun;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(['omni-run', run.id], run);
      queryClient.invalidateQueries({ queryKey: ['omni-runs'] });
    },
  });
}

export function useUpdateOmniRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { runId: string; current_step?: number; step_state?: OmniImagesState; title?: string; status?: string }) => {
      const patch: Record<string, unknown> = {};
      if (params.current_step !== undefined) patch.current_step = params.current_step;
      if (params.step_state !== undefined) patch.step_state = params.step_state;
      if (params.title !== undefined) patch.title = params.title;
      if (params.status !== undefined) patch.status = params.status;
      const { data, error } = await supabase
        .from('omni_runs')
        .update(patch)
        .eq('id', params.runId)
        .select('*')
        .single();
      if (error) throw error;
      return data as OmniRun;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(['omni-run', run.id], run);
    },
  });
}
