"use client";

/**
 * Surprise Me (Mode 5) hooks:
 * - useSurpriseIdeas: edge `surprise-ideas` (knowledge mining + Heart-grounded
 *   idea batch). A mutation, not a query: every invocation is a fresh mine.
 * - startRunFromIdea: creates a mode 'surprise_me' run with the idea's
 *   objective prefilled so the Omni Images wizard opens ready at step 1.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { callOmni } from '@/lib/omniApi';
import type { OmniRun, SurpriseIdea, SurpriseResult } from './types';

export function useSurpriseIdeas() {
  return useMutation<SurpriseResult, Error, void>({
    mutationFn: () => callOmni<SurpriseResult>('surprise-ideas'),
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useStartRunFromIdea() {
  const queryClient = useQueryClient();
  return useMutation<OmniRun, Error, SurpriseIdea>({
    mutationFn: async (idea) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('omni_runs')
        .insert({
          user_id: userData.user.id,
          mode: 'surprise_me',
          title: idea.title.slice(0, 80),
          current_step: 1,
          step_state: { objective: idea.objective } as never,
        })
        .select('*')
        .single();
      if (error || !data) throw new Error(error?.message ?? 'Could not start the run');
      return data as OmniRun;
    },
    onSuccess: (run) => {
      queryClient.setQueryData(['omni-run', run.id], run);
      queryClient.invalidateQueries({ queryKey: ['omni-runs'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
