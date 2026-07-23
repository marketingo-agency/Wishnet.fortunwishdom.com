/**
 * useProviderKeyStatus Hook
 *
 * Checks which LLM providers have API keys configured, and classifies each as
 * 'db' (stored in llm_settings via the settings-keys edge function),
 * 'env' (falling back to the Supabase Edge Function secret), or 'none'.
 *
 * Routed through the settings-keys edge function which enforces the admin gate
 * and never returns key values — only source classifications. The response shape
 * also drives which Reset button state renders in ApiKeyEditor.
 */

import { useQuery } from '@tanstack/react-query';
import { SETTINGS_KEYS_ENDPOINT } from '@/config/api';
import { getAuthHeaders } from '@/lib/apiHelpers';

export type KeySource = 'db' | 'env' | 'none';

export interface ProviderKeyStatus {
  openai: KeySource;
  gemini: KeySource;
  fal: KeySource;
  claude: KeySource;
}

export const PROVIDER_KEY_STATUS_QUERY_KEY = ['provider-key-status'] as const;

/**
 * Boolean helper for callers that only care "is this provider usable?".
 * Use this instead of `!!keyStatus?.openai` — the enriched source strings
 * are all truthy, so the naive coercion would return true for 'none'.
 */
export function hasProviderKey(source: KeySource | undefined): boolean {
  return source === 'db' || source === 'env';
}

export function useProviderKeyStatus() {
  return useQuery({
    queryKey: PROVIDER_KEY_STATUS_QUERY_KEY,
    queryFn: async (): Promise<ProviderKeyStatus> => {
      // CODE-03: degrade to a safe default on any failure (thrown fetch or !ok)
      // rather than bubbling to an error boundary on load.
      const fallback: ProviderKeyStatus = { openai: 'none', gemini: 'none', fal: 'none', claude: 'none' };
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(SETTINGS_KEYS_ENDPOINT, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'check-keys' }),
        });
        if (!response.ok) return fallback;
        return (await response.json()) as ProviderKeyStatus;
      } catch {
        return fallback;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}
