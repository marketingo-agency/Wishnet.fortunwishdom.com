/**
 * useWhisperShows — CRUD for whisper_shows (typed client, admin-only RLS).
 * A show bundles a default cast + language so its episodes inherit consistent branding.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { WhisperShow } from '@/types/whisper';

function mapRow(r: {
  id: string; name: string; description: string | null; default_cast: unknown;
  intro_audio_path: string | null; outro_audio_path: string | null; cover_style: string | null;
  language: string; created_at: string; updated_at: string;
}): WhisperShow {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    default_cast: r.default_cast && typeof r.default_cast === 'object' && !Array.isArray(r.default_cast) ? (r.default_cast as Record<string, string>) : {},
    intro_audio_path: r.intro_audio_path,
    outro_audio_path: r.outro_audio_path,
    cover_style: r.cover_style,
    language: r.language,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function useWhisperShows() {
  return useQuery({
    queryKey: ['whisper-shows'],
    queryFn: async (): Promise<WhisperShow[]> => {
      const { data, error } = await supabase.from('whisper_shows').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    staleTime: 30_000,
  });
}

export interface ShowInput {
  name: string;
  description?: string | null;
  language?: string;
  default_cast?: Record<string, string>;
}

export function useCreateWhisperShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ShowInput) => {
      const { error } = await supabase.from('whisper_shows').insert({
        name: input.name,
        description: input.description ?? null,
        language: input.language ?? 'en',
        default_cast: (input.default_cast ?? {}) as never,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['whisper-shows'] }); toast.success('Show saved'); },
    onError: (e) => toast.error('Failed to save show', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}

export function useUpdateWhisperShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ShowInput & { id: string }) => {
      const { error } = await supabase.from('whisper_shows').update({
        name: input.name,
        description: input.description ?? null,
        language: input.language ?? 'en',
        default_cast: (input.default_cast ?? {}) as never,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['whisper-shows'] }); toast.success('Show updated'); },
    onError: (e) => toast.error('Failed to update show', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}

export function useDeleteWhisperShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('whisper_shows').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['whisper-shows'] }); toast.success('Show deleted'); },
    onError: (e) => toast.error('Failed to delete show', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}
