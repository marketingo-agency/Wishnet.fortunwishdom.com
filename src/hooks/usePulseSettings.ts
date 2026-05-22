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

export interface PulseSocialAccount {
  platform: string;
  displayName: string;
  image: string;
  handle: string;
}

export interface PulseAccount {
  username: string;
  createdAt?: string | null;
  accounts?: PulseSocialAccount[];
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

// ─── Per-profile Analytics ────────────────────────────────

export interface PulsePlatformAnalytics {
  followers?: number;
  reach?: number;
  views?: number;
  impressions?: number;
  profileViews?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  metric_type?: string;
  reach_timeseries?: Array<{ date: string; value: number }>;
}

/** Keyed by platform name (e.g. instagram, youtube). */
export type PulseProfileAnalytics = Record<string, PulsePlatformAnalytics>;

export function usePulseProfileAnalytics(
  username: string | null,
  platforms: string[],
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['pulse-profile-analytics', username, platforms],
    queryFn: () =>
      callPulseApi<PulseProfileAnalytics>('get-profile-analytics', { username, platforms }),
    enabled: enabled && !!username && platforms.length > 0,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

// ─── Queue Settings ───────────────────────────────────

export interface PulseTimeSlot {
  hour: number;
  minute: number;
}

export interface PulseQueueSettings {
  slots?: PulseTimeSlot[];
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
    mutationFn: (settings: PulseQueueSettings) =>
      callPulseApi('update-queue-settings', { ...settings }),
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

export interface PulsePlatformItem {
  id: string;
  name: string;
}

export interface PulsePlatformPages {
  facebook?: PulsePlatformItem[];
  linkedin?: PulsePlatformItem[];
  pinterest?: PulsePlatformItem[];
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
