/**
 * useGenerateCover — generate episode cover art via whisper-api (OpenAI images).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callWhisperApi } from '@/lib/whisperApi';

export function useGenerateCover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (episodeId: string) => callWhisperApi<{ cover_path: string }>('generate-cover', { episodeId }),
    onSuccess: (_res, episodeId) => {
      queryClient.invalidateQueries({ queryKey: ['whisper-episode', episodeId] });
      queryClient.invalidateQueries({ queryKey: ['whisper-episodes'] });
      toast.success('Cover art generated');
    },
    onError: (e) => toast.error('Could not generate cover', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}
