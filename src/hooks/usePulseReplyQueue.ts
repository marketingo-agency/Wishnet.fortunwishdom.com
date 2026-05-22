/**
 * usePulseReplyQueue — incoming comments/DMs + AI reply drafts.
 * Reads pulse_reply_queue via the typed client (authenticated-CRUD RLS);
 * AI generation, Meta send, and sync go through the pulse-api edge function.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { callPulseApi } from '@/lib/pulseApi';
import type { Database } from '@/integrations/supabase/types';
import type {
  PulseReplyItem,
  PulseReplySource,
  PulseReplyStatus,
  PulseSentiment,
  PulseReplyMode,
} from '@/types/pulse';

type Row = Database['public']['Tables']['pulse_reply_queue']['Row'];

function mapRow(r: Row): PulseReplyItem {
  return {
    ...r,
    source: r.source as PulseReplySource,
    platform: r.platform as 'facebook' | 'instagram',
    status: r.status as PulseReplyStatus,
    sentiment: (r.sentiment as PulseSentiment | null) ?? null,
    reply_mode: (r.reply_mode as PulseReplyMode | null) ?? null,
  };
}

export function usePulseReplyQueue(source: PulseReplySource) {
  return useQuery({
    queryKey: ['pulse-reply-queue', source],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pulse_reply_queue')
        .select('*')
        .eq('source', source)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    staleTime: 15_000,
  });
}

export function useGenerateReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queueId: string) => callPulseApi<{ ai_draft: string }>('generate-reply', { queueId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pulse-reply-queue'] }),
    onError: (e) => toast.error('Could not generate reply', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}

export function useSendReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { queueId: string; replyText: string }) => callPulseApi('send-reply', { ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-reply-queue'] });
      toast.success('Reply sent');
    },
    onError: (e) => toast.error('Could not send reply', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}

export function useUpdateReplyStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PulseReplyStatus }) => {
      const { error } = await supabase
        .from('pulse_reply_queue')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pulse-reply-queue'] }),
    onError: (e) => toast.error('Could not update', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}

export function useSyncEngagement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => callPulseApi<{ synced: number; note?: string }>('sync-engagement'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['pulse-reply-queue'] });
      toast.success(res.note ?? `Synced ${res.synced} item${res.synced === 1 ? '' : 's'}`);
    },
    onError: (e) => toast.error('Sync failed', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}
