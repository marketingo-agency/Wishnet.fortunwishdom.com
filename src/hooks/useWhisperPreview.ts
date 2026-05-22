/**
 * useWhisperPreview — synthesize one line via whisper-api for voice-casting previews.
 * Returns an audio data URL the caller plays with `new Audio(...)`.
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callWhisperApi } from '@/lib/whisperApi';

export function usePreviewLine() {
  return useMutation({
    mutationFn: (input: { voiceId: string; text: string }) =>
      callWhisperApi<{ audio: string }>('preview-line', { ...input }),
    onError: (e) => toast.error('Preview failed', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}
