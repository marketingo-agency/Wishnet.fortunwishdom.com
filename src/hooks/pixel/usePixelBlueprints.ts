import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders, edgeFunctionUrl } from '@/lib/apiHelpers';
import { toast } from 'sonner';
import type { PixelBlueprint } from './types';

const PIXEL_URL = edgeFunctionUrl('pixel-chat');

export function usePixelBlueprints() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pixel-blueprints', user?.id],
    queryFn: async (): Promise<PixelBlueprint[]> => {
      if (!user) return [];
      let headers: Record<string, string>;
      try { headers = await getAuthHeaders(); } catch { return []; }

      let res: Response;
      try {
        res = await fetch(PIXEL_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'get-blueprints' }),
        });
      } catch {
        return []; // network/extension failure — degrade, don't crash
      }
      if (!res.ok) return [];
      const data = await res.json();
      return data.blueprints || [];
    },
    enabled: !!user,
  });
}

export function useSavePixelBlueprint() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (blueprint: Partial<PixelBlueprint>) => {
      const headers = await getAuthHeaders();
      const res = await fetch(PIXEL_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'save-blueprint', blueprint }),
      });
      if (!res.ok) throw new Error('Failed to save blueprint');
      return (await res.json()).blueprint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pixel-blueprints', user?.id] });
      toast.success('Blueprint saved');
    },
    onError: (error: Error) => {
      toast.error('Failed to save blueprint: ' + error.message);
    },
  });
}

export function useDeletePixelBlueprint() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (blueprintId: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch(PIXEL_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'delete-blueprint', blueprintId }),
      });
      if (!res.ok) throw new Error('Failed to delete blueprint');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pixel-blueprints', user?.id] });
      toast.success('Blueprint deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete blueprint: ' + error.message);
    },
  });
}

export function useGenerateBlueprintWithAI() {
  return useMutation({
    mutationFn: async (): Promise<Partial<PixelBlueprint>> => {
      const headers = await getAuthHeaders();
      const res = await fetch(PIXEL_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'generate-blueprint' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Generation failed' }));
        throw new Error(err.error || 'Failed to generate blueprint');
      }
      const data = await res.json();
      return data.blueprint;
    },
    onError: (error: Error) => {
      toast.error('AI generation failed: ' + error.message);
    },
  });
}
