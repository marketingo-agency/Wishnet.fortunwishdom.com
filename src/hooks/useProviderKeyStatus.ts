/**
 * useProviderKeyStatus Hook
 * Checks which LLM providers have API keys configured as environment secrets.
 * Keys are no longer stored in the database for security.
 */

import { useQuery } from '@tanstack/react-query';
import { AI_CHAT_ENDPOINT } from '@/config/api';
import { getAuthHeaders } from '@/lib/apiHelpers';

export interface ProviderKeyStatus {
  openai: boolean;
  gemini: boolean;
}

export function useProviderKeyStatus() {
  return useQuery({
    queryKey: ['provider-key-status'],
    queryFn: async () => {
      const headers = await getAuthHeaders();

      const response = await fetch(AI_CHAT_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'check-keys' }),
      });

      if (!response.ok) {
        throw new Error('Failed to check provider key status');
      }

      return response.json() as Promise<ProviderKeyStatus>;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}
