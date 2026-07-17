/**
 * useWhisperSettings — Whisper workspace settings (whisper_settings, single row).
 * Non-secret prefs (script/tts model, default format/language) — read/written via the
 * typed client (admin-only RLS).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { WhisperFormat } from '@/types/whisper';

export interface WhisperSettingsData {
  script_provider: string;
  script_model: string;
  tts_model: string;
  default_format: WhisperFormat;
  default_language: string;
  default_cast: Record<string, string>;
}

const DEFAULTS: WhisperSettingsData = {
  script_provider: 'openai',
  script_model: 'gpt-4.1',
  tts_model: 'eleven_multilingual_v2',
  default_format: 'two_host',
  default_language: 'en',
  default_cast: {},
};

export function useWhisperSettings() {
  return useQuery({
    queryKey: ['whisper-settings'],
    queryFn: async (): Promise<WhisperSettingsData> => {
      const { data, error } = await supabase.from('whisper_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULTS;
      return {
        script_provider: data.script_provider ?? DEFAULTS.script_provider,
        script_model: data.script_model ?? DEFAULTS.script_model,
        tts_model: data.tts_model ?? DEFAULTS.tts_model,
        default_format: (data.default_format as WhisperFormat) ?? DEFAULTS.default_format,
        default_language: data.default_language ?? DEFAULTS.default_language,
        default_cast: (data.default_cast as Record<string, string>) ?? {},
      };
    },
    staleTime: 60_000,
  });
}

export function useUpdateWhisperSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<WhisperSettingsData>) => {
      const { data: existing } = await supabase.from('whisper_settings').select('id').limit(1).maybeSingle();
      const payload = { ...patch, updated_at: new Date().toISOString() };
      if (existing) {
        const { error } = await supabase.from('whisper_settings').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('whisper_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whisper-settings'] });
      toast.success('Settings saved');
    },
    onError: (e) => toast.error('Failed to save settings', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}
