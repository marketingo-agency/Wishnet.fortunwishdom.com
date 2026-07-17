/**
 * Cast & Personas data layer (Plan 3 Phase 4, D-A1/D-A4).
 * Personas are owner-scoped rows; voices come from the omni-podcast edge
 * (honest not-connected state when no ElevenLabs key exists).
 */

import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { callOmniPodcast } from '@/lib/omniApi';
import type { Json } from '@/integrations/supabase/types';

export interface OmniPersona {
  id: string;
  user_id: string;
  name: string;
  role: string | null;
  personality: string | null;
  speaking_style: string | null;
  voice_id: string | null;
  voice_settings: Json;
  portrait_url: string | null;
  wishpedia_entry_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonaInput {
  name: string;
  role?: string | null;
  personality?: string | null;
  speaking_style?: string | null;
  voice_id?: string | null;
  portrait_url?: string | null;
  wishpedia_entry_id?: string | null;
}

export function usePersonas() {
  return useQuery({
    queryKey: ['omni-personas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omni_personas')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as OmniPersona[];
    },
  });
}

function useInvalidatePersonas() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['omni-personas'] });
}

export function useCreatePersona() {
  const invalidate = useInvalidatePersonas();
  return useMutation({
    mutationFn: async (input: PersonaInput) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('omni_personas')
        .insert({ ...input, user_id: userData.user.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as OmniPersona;
    },
    onSuccess: (p) => {
      invalidate();
      toast.success(`Persona "${p.name}" created`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePersona() {
  const invalidate = useInvalidatePersonas();
  return useMutation({
    mutationFn: async ({ id, ...input }: PersonaInput & { id: string }) => {
      const { error } = await supabase.from('omni_personas').update(input).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Persona saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePersona() {
  const invalidate = useInvalidatePersonas();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('omni_personas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Persona deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── ElevenLabs voices (via the omni-podcast edge) ────────────────────────────

export interface PodcastVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
}

export const ELEVEN_NOT_CONNECTED_SNIPPET = 'Text-to-speech is not connected';

export function usePodcastVoices() {
  const query = useQuery({
    queryKey: ['podcast-voices'],
    queryFn: async () => {
      const res = await callOmniPodcast<{ voices: PodcastVoice[] }>('podcast-voices');
      return res.voices;
    },
    staleTime: 10 * 60_000,
    retry: false,
  });
  const notConnected = !!query.error && query.error.message.includes(ELEVEN_NOT_CONNECTED_SNIPPET);
  return { ...query, notConnected };
}

/** Preview a voice line: fetch the data-URL MP3 and play it, stopping any
 *  earlier preview first (one player per surface). */
export function useVoicePreview() {
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const mutation = useMutation({
    mutationFn: async ({ voiceId, text }: { voiceId: string; text?: string }) => {
      const res = await callOmniPodcast<{ audio: string }>('podcast-preview-line', {
        voice_id: voiceId,
        text: text || 'Welcome to the show. This is how this voice sounds.',
      });
      return res.audio;
    },
    onSuccess: (dataUrl) => {
      playerRef.current?.pause();
      const audio = new Audio(dataUrl);
      playerRef.current = audio;
      void audio.play().catch(() => toast.error('Playback was blocked by the browser'));
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return { ...mutation, stop: () => playerRef.current?.pause() };
}
