import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders, edgeFunctionUrl } from '@/lib/apiHelpers';
import { toast } from 'sonner';
import type { SendMessageParams, SendMessageResult } from './types';

const OSHA_URL = edgeFunctionUrl('osha-chat');

export function useSendOshaMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: SendMessageParams): Promise<SendMessageResult> => {
      const headers = await getAuthHeaders();
      const res = await fetch(OSHA_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'chat',
          message: params.message,
          mode: params.mode,
          conversationHistory: params.conversationHistory,
          attachments: params.attachments || [],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to send message');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['osha-messages', user?.id] });
    },
    onError: (error) => {
      toast.error('Osha error: ' + error.message);
    },
  });
}
