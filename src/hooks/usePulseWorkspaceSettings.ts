/**
 * usePulseWorkspaceSettings — reply model + automation settings (pulse_settings row).
 * Non-secret; read/written through the pulse-api edge function (admin-gated).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callPulseApi } from '@/lib/pulseApi';
import type { PulseReplyMode } from '@/types/pulse';

export interface PulseWorkspaceSettingsData {
  reply_provider: string;
  reply_model: string;
  reply_temperature: number;
  reply_mode: PulseReplyMode;
  reply_mode_overrides: Record<string, PulseReplyMode>;
  reply_persona: string | null;
  daily_dm_cap: number;
}

const DEFAULTS: PulseWorkspaceSettingsData = {
  reply_provider: 'openai',
  reply_model: 'gpt-4.1',
  reply_temperature: 0.7,
  reply_mode: 'manual',
  reply_mode_overrides: {},
  reply_persona: null,
  daily_dm_cap: 50,
};

export function usePulseWorkspaceSettings(enabled = true) {
  return useQuery({
    queryKey: ['pulse-workspace-settings'],
    queryFn: async () => {
      const data = await callPulseApi<Partial<PulseWorkspaceSettingsData>>('get-workspace-settings');
      return { ...DEFAULTS, ...data } as PulseWorkspaceSettingsData;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdatePulseWorkspaceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<PulseWorkspaceSettingsData>) =>
      callPulseApi('update-workspace-settings', { ...patch }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-workspace-settings'] });
      toast.success('Settings saved');
    },
    onError: (error) => {
      toast.error('Failed to save settings', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}
