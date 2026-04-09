/**
 * useProviderKeyStatus Hook
 * Checks which LLM providers have API keys configured as environment secrets.
 * Keys are no longer stored in the database for security.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AI_CHAT_ENDPOINT } from '@/config/api';

export interface ProviderKeyStatus {
  openai: boolean;
  gemini: boolean;
}

export function useProviderKeyStatus() {
  return useQuery({
    queryKey: ['provider-key-status'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(AI_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
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
