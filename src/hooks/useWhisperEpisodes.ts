/**
 * useWhisperEpisodes — CRUD for whisper_episodes (typed client, admin-only RLS).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type {
  WhisperEpisode,
  WhisperEpisodeStatus,
  WhisperFormat,
  WhisperScriptSegment,
  WhisperSourceRef,
  WhisperShowNotes,
} from '@/types/whisper';

type Row = Database['public']['Tables']['whisper_episodes']['Row'];

function mapRow(r: Row): WhisperEpisode {
  return {
    ...r,
    status: r.status as WhisperEpisodeStatus,
    format: r.format as WhisperFormat,
    source_refs: Array.isArray(r.source_refs) ? (r.source_refs as unknown as WhisperSourceRef[]) : [],
    script: Array.isArray(r.script) ? (r.script as unknown as WhisperScriptSegment[]) : [],
    show_notes: r.show_notes && typeof r.show_notes === 'object' && !Array.isArray(r.show_notes) ? (r.show_notes as unknown as WhisperShowNotes) : {},
  };
}

export function useWhisperEpisodes(filters: { status?: WhisperEpisodeStatus | 'all'; showId?: string } = {}) {
  return useQuery({
    queryKey: ['whisper-episodes', filters],
    queryFn: async () => {
      let query = supabase.from('whisper_episodes').select('*').order('created_at', { ascending: false });
      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters.showId) query = query.eq('show_id', filters.showId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    staleTime: 15_000,
  });
}

export function useWhisperEpisode(id: string | null, enabled = true) {
  return useQuery({
    queryKey: ['whisper-episode', id],
    queryFn: async (): Promise<WhisperEpisode | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from('whisper_episodes').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? mapRow(data) : null;
    },
    enabled: enabled && !!id,
    staleTime: 10_000,
    // Poll while a background render is in progress so the player appears automatically.
    refetchInterval: (query) => (query.state.data?.status === 'rendering' ? 4000 : false),
  });
}

export interface CreateEpisodeInput {
  title?: string | null;
  show_id?: string | null;
  status?: WhisperEpisodeStatus;
  format?: WhisperFormat;
  language?: string;
  source_refs?: WhisperSourceRef[];
  script?: WhisperScriptSegment[];
  generated_by?: string | null;
}

export function useCreateWhisperEpisode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEpisodeInput) => {
      const { data, error } = await supabase
        .from('whisper_episodes')
        .insert({
          ...input,
          source_refs: (input.source_refs ?? []) as never,
          script: (input.script ?? []) as never,
        })
        .select('*')
        .single();
      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whisper-episodes'] });
      toast.success('Episode saved');
    },
    onError: (e) => toast.error('Failed to save episode', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}

export interface UpdateEpisodeInput {
  id: string;
  title?: string | null;
  status?: WhisperEpisodeStatus;
  format?: WhisperFormat;
  language?: string;
  script?: WhisperScriptSegment[];
  source_refs?: WhisperSourceRef[];
  show_notes?: WhisperShowNotes;
  // audio_path / duration / cover_path are written only by the edge function (render/cover),
  // never accepted from the client (SEC: prevents tampering with the storage path).
}

export function useUpdateWhisperEpisode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, script, source_refs, show_notes, ...patch }: UpdateEpisodeInput) => {
      const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
      if (script) payload.script = script as never;
      if (source_refs) payload.source_refs = source_refs as never;
      if (show_notes) payload.show_notes = show_notes as never;
      const { error } = await supabase.from('whisper_episodes').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whisper-episodes'] });
    },
    onError: (e) => toast.error('Failed to update episode', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}

export function useDeleteWhisperEpisode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('whisper_episodes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whisper-episodes'] });
      toast.success('Episode deleted');
    },
    onError: (e) => toast.error('Failed to delete episode', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}
