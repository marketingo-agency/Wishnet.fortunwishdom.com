import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders, edgeFunctionUrl } from '@/lib/apiHelpers';
import { toast } from 'sonner';
import { DEFAULT_OSHA_SETTINGS, type OshaSettings } from './types';

const OSHA_URL = edgeFunctionUrl('osha-chat');

export function useOshaSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['osha-settings', user?.id],
    queryFn: async (): Promise<OshaSettings> => {
      if (!user) return DEFAULT_OSHA_SETTINGS;
      let headers: Record<string, string>;
      try { headers = await getAuthHeaders(); } catch { return DEFAULT_OSHA_SETTINGS; }

      let res: Response;
      try {
        res = await fetch(OSHA_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'get-settings' }),
        });
      } catch {
        return DEFAULT_OSHA_SETTINGS; // network/extension failure — degrade, don't crash
      }
      if (!res.ok) return DEFAULT_OSHA_SETTINGS;
      const data = await res.json();
      return data.settings ? { ...DEFAULT_OSHA_SETTINGS, ...data.settings } : DEFAULT_OSHA_SETTINGS;
    },
    enabled: !!user,
  });
}

export function useUpsertOshaSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<OshaSettings>) => {
      const headers = await getAuthHeaders();
      const res = await fetch(OSHA_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'save-settings', settings }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      return (await res.json()).settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['osha-settings', user?.id] });
      toast.success('Osha settings saved');
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });
}
