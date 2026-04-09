import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders, edgeFunctionUrl } from '@/lib/apiHelpers';
import { toast } from 'sonner';
import type { SendPixelMessageParams, SendPixelMessageResult } from './types';

const PIXEL_URL = edgeFunctionUrl('pixel-chat');

export function useSendPixelMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: SendPixelMessageParams): Promise<SendPixelMessageResult> => {
      const headers = await getAuthHeaders();
      const res = await fetch(PIXEL_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'chat',
          message: params.message,
          mode: params.mode,
          conversationHistory: params.conversationHistory,
          attachments: params.attachments || [],
          blueprint: params.blueprint,
          styleLock: params.styleLock,
          lastBlueprintSummary: params.lastBlueprintSummary,
          selectedPostType: params.selectedPostType || undefined,
          selectedSize: params.selectedSize || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to send message');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pixel-messages', user?.id] });
    },
    onError: (error: Error) => {
      toast.error('Pixel error: ' + error.message);
    },
  });
}
