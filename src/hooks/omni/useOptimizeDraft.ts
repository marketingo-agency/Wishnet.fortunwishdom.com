import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callOmni } from '@/lib/omniApi';

/**
 * Omni's own "optimize" wand: one-shot Heart+Brain-grounded rewrite of a draft
 * brief/prompt via the omni edge (`optimize-draft`). Self-contained - no
 * dependency on the removed Promptor agent. Resolves to the rewritten text;
 * the result lands directly in the caller's input state (no invalidation).
 */
export function useOptimizeDraft() {
  const mutation = useMutation({
    mutationFn: async (draftText: string): Promise<string> => {
      const data = await callOmni<{ rewrite?: string }>('optimize-draft', { raw_request: draftText });
      const rewritten = data.rewrite;
      if (typeof rewritten !== 'string' || !rewritten.trim()) {
        throw new Error('The optimizer returned an empty rewrite');
      }
      return rewritten.trim();
    },
    onError: () => {
      toast.error('Could not optimize the draft. Please try again.');
    },
  });

  return {
    optimizeDraft: mutation.mutateAsync,
    isOptimizing: mutation.isPending,
  };
}
