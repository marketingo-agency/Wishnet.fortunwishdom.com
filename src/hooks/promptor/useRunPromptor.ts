import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callPromptor } from './usePromptorSettings';
import type { OutputType, PromptorOutput } from './types';

export function useRunPromptor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      action: 'create' | 'optimize';
      output_type: OutputType;
      blueprint: string;
      raw_request: string;
      existing_prompt?: string;
    }): Promise<PromptorOutput> => {
      return callPromptor(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promptor-runs'] });
    },
  });
}
