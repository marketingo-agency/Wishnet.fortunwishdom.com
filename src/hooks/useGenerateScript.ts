/**
 * useGenerateScript — generate a podcast script via whisper-api (script model + Heart rules).
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callWhisperApi } from '@/lib/whisperApi';
import type { WhisperFormat } from '@/types/whisper';

export interface GenerateScriptInput {
  topic?: string;
  sourceText?: string;
  sourceUrl?: string;
  format: WhisperFormat;
  language: string;
  tone?: string;
  length?: 'short' | 'medium' | 'long';
}

export interface GeneratedScript {
  title: string;
  segments: Array<{ speaker: string; text: string }>;
}

export function useGenerateScript() {
  return useMutation({
    mutationFn: (input: GenerateScriptInput) => callWhisperApi<GeneratedScript>('generate-script', { ...input }),
    onError: (e) => toast.error('Script generation failed', { description: e instanceof Error ? e.message : 'Unknown error' }),
  });
}
