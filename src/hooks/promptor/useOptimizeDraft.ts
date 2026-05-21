import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callPromptor } from './usePromptorSettings';

/**
 * Shared hook for the Osha + Pixel chat input "optimize with Promptor" wand button.
 * Fires a one-shot call to the Promptor edge function's `optimize-draft` action and
 * resolves to the rewritten prompt text. No query invalidation — the result lands
 * directly in the caller's input state.
 */
export function useOptimizeDraft() {
  const mutation = useMutation({
    mutationFn: async (draftText: string): Promise<string> => {
      const data = await callPromptor({
        action: 'optimize-draft',
        raw_request: draftText,
      });
      const rewritten = (data as unknown as { final_prompt_full?: string }).final_prompt_full;
      if (typeof rewritten !== 'string' || !rewritten.trim()) {
        throw new Error('Promptor returned an empty rewrite');
      }
      return rewritten.trim();
    },
    onError: () => {
      toast.error('Promptor could not optimize the prompt. Please try again.');
    },
  });

  return {
    optimizeDraft: mutation.mutateAsync,
    isOptimizing: mutation.isPending,
  };
}
