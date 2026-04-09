import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders, edgeFunctionUrl } from '@/lib/apiHelpers';
import { toast } from 'sonner';
import type { PixelMessage } from './types';

const PIXEL_URL = edgeFunctionUrl('pixel-chat');

export function usePixelMessages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pixel-messages', user?.id],
    queryFn: async (): Promise<PixelMessage[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('pixel_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as PixelMessage[];
    },
    enabled: !!user,
  });
}

export function useClearPixelHistory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(PIXEL_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'clear-history' }),
      });
      if (!res.ok) throw new Error('Failed to clear history');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pixel-messages', user?.id] });
      toast.success('Studio session cleared');
    },
    onError: () => toast.error('Failed to clear history'),
  });
}

export function useDeletePixelMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('pixel_messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pixel-messages', user?.id] });
    },
    onError: () => toast.error('Failed to delete message'),
  });
}
