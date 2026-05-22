/**
 * useGenerateShowNotes — AI title/description/chapters/tags for an episode (whisper-api).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callWhisperApi } from '@/lib/whisperApi';
import type { WhisperShowNotes } from '@/types/whisper';

export function useGenerateShowNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (episodeId: string) => callWhisperApi<WhisperShowNotes>('generate-shownotes', { episodeId }),
    onSuccess: (_res, episodeId) => {
      queryClient.invalidateQueries({ queryKey: ['whisper-episode', episodeId] });
      queryClient.invalidateQueries({ queryKey: ['whisper-episodes'] });
      toast.success('Show notes generated');
    },
    onError: (e) => toast.error('Could not generate show notes', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}
