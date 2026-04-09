/**
 * Save to Brain Hook
 * Extracted from Osha domain — this is a brain/knowledge concern.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthHeaders, edgeFunctionUrl } from '@/lib/apiHelpers';

interface SaveToBrainParams {
  content: string;
  title: string;
  category?: string;
}

export function useSaveToBrain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveToBrainParams) => {
      const headers = await getAuthHeaders();
      const res = await fetch(edgeFunctionUrl('osha-chat'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'save-to-brain',
          title: params.title,
          content: params.content,
          category: params.category,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to save' }));
        throw new Error(err.error || 'Failed to save to Brain');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-documents'] });
    },
  });
}
