/**
 * useProviderKeyActions Hook
 *
 * Mutations for the settings-keys edge function: update-key and reset-key.
 * The key value is passed through once and never stored in any cache — the
 * result is a { success: true } that triggers re-fetch of provider-key-status.
 *
 * Used by the ApiKeyEditor component in Settings > LLM.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SETTINGS_KEYS_ENDPOINT } from '@/config/api';
import { getAuthHeaders } from '@/lib/apiHelpers';
import { PROVIDER_KEY_STATUS_QUERY_KEY } from './useProviderKeyStatus';
import type { KeySource } from './useProviderKeyStatus';

export type ProviderKeyProvider = 'openai' | 'gemini' | 'fal' | 'pulse';

export interface UpdateProviderKeyPayload {
  provider: ProviderKeyProvider;
  key: string;
}

export interface ResetProviderKeyPayload {
  provider: ProviderKeyProvider;
}

async function callSettingsKeys(payload: Record<string, unknown>): Promise<{ success: true }> {
  const headers = await getAuthHeaders();
  const response = await fetch(SETTINGS_KEYS_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.json();
}

export function useUpdateProviderKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ provider, key }: UpdateProviderKeyPayload) => {
      if (!key || !key.trim()) {
        throw new Error('key must be a non-empty string');
      }
      return callSettingsKeys({ action: 'update-key', provider, key: key.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDER_KEY_STATUS_QUERY_KEY });
    },
  });
}

export function useResetProviderKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ provider }: ResetProviderKeyPayload) => {
      return callSettingsKeys({ action: 'reset-key', provider });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDER_KEY_STATUS_QUERY_KEY });
    },
  });
}

export type { KeySource };
