"use client";

/**
 * useGenerateCaptions: the Phase-5 `generate-captions` edge action.
 * ONE call per image returns captions for ALL of that image's networks
 * (structured JSON), under OMNI's Heart scope — replacing the legacy
 * per-cell Promptor detour (useOmniDescriptions), which stays untouched
 * until the Phase-7 Captions stage consumes this hook and deletes it.
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callOmni } from '@/lib/omniApi';

export interface GenerateCaptionsInput {
  runId: string;
  /** The image's generation prompt (grounds the caption in what is shown). */
  imagePrompt: string;
  objective: string;
  networks: string[];
  /** 1-3 caption options per network (default 1). */
  optionsPerNetwork?: number;
}

/** {[networkId]: caption options} for the one image the call covers. */
export type GeneratedCaptions = Record<string, string[]>;

export function useGenerateCaptions() {
  return useMutation<GeneratedCaptions, Error, GenerateCaptionsInput>({
    mutationFn: async (input) => {
      const res = await callOmni<{ captions: GeneratedCaptions }>('generate-captions', {
        run_id: input.runId,
        image_prompt: input.imagePrompt,
        objective: input.objective,
        networks: input.networks,
        options_per_network: input.optionsPerNetwork ?? 1,
      });
      return res.captions;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
