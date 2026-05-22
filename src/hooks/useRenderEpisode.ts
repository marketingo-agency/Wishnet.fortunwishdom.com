/**
 * useRenderEpisode — synthesize + stitch an episode's audio via whisper-api,
 * plus a helper to sign whisper-audio paths for playback.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { callWhisperApi } from '@/lib/whisperApi';

export function useRenderEpisode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (episodeId: string) => callWhisperApi<{ status: string }>('render-episode', { episodeId }),
    onSuccess: (_res, episodeId) => {
      queryClient.invalidateQueries({ queryKey: ['whisper-episode', episodeId] });
      queryClient.invalidateQueries({ queryKey: ['whisper-episodes'] });
      toast.success('Rendering started', { description: 'The audio will appear here when it’s ready.' });
    },
    onError: (e) => toast.error('Render failed', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}

/** Sign a whisper-audio storage path for playback (admin can sign via RLS). */
export function useWhisperAudioUrl(path: string | null) {
  return useQuery({
    queryKey: ['whisper-audio-url', path],
    queryFn: async (): Promise<string | null> => {
      if (!path) return null;
      const { data, error } = await supabase.storage.from('whisper-audio').createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
    enabled: !!path,
    staleTime: 50 * 60_000,
  });
}
