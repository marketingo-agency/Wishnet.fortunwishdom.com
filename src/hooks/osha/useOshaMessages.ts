import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders, edgeFunctionUrl } from '@/lib/apiHelpers';
import { toast } from 'sonner';
import type { OshaMessage } from './types';

const OSHA_URL = edgeFunctionUrl('osha-chat');

export function useOshaMessages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['osha-messages', user?.id],
    queryFn: async (): Promise<OshaMessage[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('osha_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as OshaMessage[];
    },
    enabled: !!user,
  });
}

export function useClearOshaHistory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeaders();
      let res: Response;
      try {
        res = await fetch(OSHA_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'clear-history' }),
        });
      } catch {
        // fetch threw before reaching the server — a dropped connection or a
        // browser extension intercepting window.fetch (e.g. Similarweb)
        throw new Error('Request was blocked before reaching the server — check your connection or disable browser extensions for this site, then try again.');
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to clear history (${res.status})`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['osha-messages', user?.id] });
      toast.success('Chat history cleared');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to clear history'),
  });
}

export function useDeleteOshaMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('osha_messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['osha-messages', user?.id] });
    },
    onError: () => toast.error('Failed to delete message'),
  });
}
