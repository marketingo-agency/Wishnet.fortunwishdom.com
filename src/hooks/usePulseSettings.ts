/**
 * usePulseSettings Hook
 *
 * TanStack Query hooks for the pulse-api edge function.
 * All upload-post.com API calls are proxied through the edge function
 * so the API key never reaches the browser.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PULSE_API_ENDPOINT } from '@/config/api';
import { getAuthHeaders } from '@/lib/apiHelpers';
import { toast } from 'sonner';

async function callPulseApi<T = unknown>(action: string, body?: Record<string, unknown>): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(PULSE_API_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...body }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

// ─── Connection Test ──────────────────────────────────

export interface PulseConnectionStatus {
  connected: boolean;
  email?: string | null;
  plan?: string | null;
  subscriptionStatus?: string | null;
  error?: string;
}

export function usePulseTestConnection() {
  return useMutation({
    mutationFn: () => callPulseApi<PulseConnectionStatus>('test-connection'),
    onError: (error) => {
      toast.error('Connection test failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

// ─── Connected Accounts ───────────────────────────────

export interface PulseAccount {
  username: string;
  platforms?: string[];
}

export function usePulseAccounts(enabled: boolean) {
  return useQuery({
    queryKey: ['pulse-accounts'],
    queryFn: () => callPulseApi<PulseAccount[]>('list-accounts'),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

// ─── Queue Settings ───────────────────────────────────

export interface PulseQueueSettings {
  slots?: number[];
  days?: number[];
  timezone?: string;
}

export function usePulseQueueSettings(enabled: boolean) {
  return useQuery({
    queryKey: ['pulse-queue-settings'],
    queryFn: () => callPulseApi<PulseQueueSettings>('get-queue-settings'),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useUpdatePulseQueueSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: { slots?: number; days?: number[]; timezone?: string }) =>
      callPulseApi('update-queue-settings', settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-queue-settings'] });
      toast.success('Queue settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update queue settings', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

// ─── Platform Pages ───────────────────────────────────

export interface PulsePlatformPages {
  facebook?: { pages?: Array<{ page_id: string; page_name: string; profile?: string }> };
  linkedin?: { orgs?: Array<{ urn: string; name: string; vanity_url?: string }> };
  pinterest?: { boards?: Array<{ board_id: string; name: string; account?: string }> };
}

export function usePulsePlatforms(enabled: boolean) {
  return useQuery({
    queryKey: ['pulse-platforms'],
    queryFn: () => callPulseApi<PulsePlatformPages>('get-platforms'),
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
