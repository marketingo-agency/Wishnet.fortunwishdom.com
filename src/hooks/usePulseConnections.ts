/**
 * usePulseConnections — provider credentials for Meta, ElevenLabs, Canva.
 * All reads/writes go through the pulse-api edge function (admin-gated, service-role);
 * secrets never reach the browser — status endpoints return booleans only.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callPulseApi } from '@/lib/pulseApi';
import type { PulseConnectionProvider } from '@/types/pulse';

export interface PulseConnectionStatusEntry {
  configured: boolean;
  status: string;
}

export type PulseConnectionsStatus = Record<string, PulseConnectionStatusEntry>;

export function usePulseConnectionsStatus(enabled = true) {
  return useQuery({
    queryKey: ['pulse-connections-status'],
    queryFn: () => callPulseApi<PulseConnectionsStatus>('get-connections-status'),
    enabled,
    staleTime: 30_000,
  });
}

interface UpdateConnectionInput {
  provider: PulseConnectionProvider;
  apiKey?: string;
  metaAppId?: string;
  metaAppSecret?: string;
}

export function useUpdatePulseConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateConnectionInput) => callPulseApi('update-connection', { ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-connections-status'] });
      toast.success('Connection saved');
    },
    onError: (error) => {
      toast.error('Failed to save connection', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useResetPulseConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: PulseConnectionProvider) => callPulseApi('reset-connection', { provider }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-connections-status'] });
      toast.success('Connection cleared');
    },
    onError: (error) => {
      toast.error('Failed to clear connection', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export interface PulseProviderTestResult {
  connected: boolean;
  configured?: boolean;
  note?: string;
  error?: string;
}

export function useTestPulseConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: PulseConnectionProvider) =>
      callPulseApi<PulseProviderTestResult>('test-connection-provider', { provider }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-connections-status'] });
    },
    onError: (error) => {
      toast.error('Connection test failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}
