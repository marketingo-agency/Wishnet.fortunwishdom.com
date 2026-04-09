import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthHeaders, edgeFunctionUrl } from '@/lib/apiHelpers';
import { DEFAULT_SETTINGS, type PrompterSettings, type PromptorOutput } from './types';

const PROMPTOR_URL = edgeFunctionUrl('promptor');

async function callPromptor(payload: Record<string, unknown>): Promise<PromptorOutput> {
  const headers = await getAuthHeaders();
  const res = await fetch(PROMPTOR_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Promptor request failed');
  return data as PromptorOutput;
}

export { callPromptor };

export function usePromptorSettings() {
  return useQuery({
    queryKey: ['promptor-settings'],
    queryFn: async (): Promise<PrompterSettings> => {
      const data = await callPromptor({ action: 'get-settings' });
      const result = data as unknown as { settings: PrompterSettings | null };
      return result.settings || DEFAULT_SETTINGS;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpsertPromptorSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<PrompterSettings>) => {
      await callPromptor({ action: 'save-settings', settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promptor-settings'] });
    },
  });
}
