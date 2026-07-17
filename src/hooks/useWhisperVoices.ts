/**
 * useWhisperVoices — TTS voice list (fal presets via whisper-api) + saved casting
 * presets (whisper_voices, typed client / admin RLS).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { callWhisperApi } from '@/lib/whisperApi';
import type { ElevenLabsVoice, WhisperVoicePreset, WhisperVoiceSettings } from '@/types/whisper';

export function useElevenLabsVoices(enabled = true) {
  return useQuery({
    queryKey: ['elevenlabs-voices'],
    queryFn: () => callWhisperApi<{ voices: ElevenLabsVoice[] }>('list-voices').then((r) => r.voices),
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useWhisperVoicePresets() {
  return useQuery({
    queryKey: ['whisper-voices'],
    queryFn: async (): Promise<WhisperVoicePreset[]> => {
      const { data, error } = await supabase.from('whisper_voices').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        elevenlabs_voice_id: r.elevenlabs_voice_id,
        settings: (r.settings as WhisperVoiceSettings) ?? {},
        preview_url: r.preview_url,
      }));
    },
    staleTime: 30_000,
  });
}

export function useSaveWhisperVoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; elevenlabs_voice_id: string; settings?: WhisperVoiceSettings; preview_url?: string | null }) => {
      const { error } = await supabase.from('whisper_voices').insert({
        name: input.name,
        elevenlabs_voice_id: input.elevenlabs_voice_id,
        settings: (input.settings ?? {}) as never,
        preview_url: input.preview_url ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whisper-voices'] });
      toast.success('Voice preset saved');
    },
    onError: (e) => toast.error('Failed to save preset', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}

export function useDeleteWhisperVoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('whisper_voices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whisper-voices'] });
      toast.success('Preset removed');
    },
    onError: (e) => toast.error('Failed to remove preset', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}
