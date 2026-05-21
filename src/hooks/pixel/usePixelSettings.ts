import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders, edgeFunctionUrl } from '@/lib/apiHelpers';
import { toast } from 'sonner';
import { DEFAULT_PIXEL_SETTINGS, type PixelSettings } from './types';

const PIXEL_URL = edgeFunctionUrl('pixel-chat');

export function usePixelSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pixel-settings', user?.id],
    queryFn: async (): Promise<PixelSettings> => {
      if (!user) return DEFAULT_PIXEL_SETTINGS;
      let headers: Record<string, string>;
      try { headers = await getAuthHeaders(); } catch { return DEFAULT_PIXEL_SETTINGS; }

      let res: Response;
      try {
        res = await fetch(PIXEL_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'get-settings' }),
        });
      } catch {
        return DEFAULT_PIXEL_SETTINGS; // network/extension failure — degrade, don't crash
      }
      if (!res.ok) return DEFAULT_PIXEL_SETTINGS;
      const data = await res.json();
      return data.settings ? { ...DEFAULT_PIXEL_SETTINGS, ...data.settings } : DEFAULT_PIXEL_SETTINGS;
    },
    enabled: !!user,
  });
}

export function useUpsertPixelSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<PixelSettings>) => {
      const headers = await getAuthHeaders();
      const res = await fetch(PIXEL_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'save-settings', settings }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      return (await res.json()).settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pixel-settings', user?.id] });
      toast.success('Pixel settings saved');
    },
    onError: (error: Error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });
}
