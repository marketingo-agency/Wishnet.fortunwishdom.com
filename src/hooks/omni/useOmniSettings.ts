"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callOmni } from '@/lib/omniApi';
import { DEFAULT_OMNI_SETTINGS, type OmniSettings } from './types';

/**
 * Load the caller's Omni settings.
 * Read-on-load query: degrades to defaults on any failure (CODE-01 pattern)
 * so a network/extension hiccup never crashes the workspace.
 */
export function useOmniSettings() {
  return useQuery<OmniSettings>({
    queryKey: ['omni-settings'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const result = await callOmni<{ settings: OmniSettings | null }>('get-settings');
        return result.settings ?? DEFAULT_OMNI_SETTINGS;
      } catch {
        // Network/extension failure: degrade to defaults, don't crash.
        return DEFAULT_OMNI_SETTINGS;
      }
    },
  });
}

export function useUpsertOmniSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<OmniSettings>) => {
      return callOmni<{ success: boolean }>('save-settings', { settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omni-settings'] });
      toast.success('Omni settings saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save Omni settings: ${error.message}`);
    },
  });
}
