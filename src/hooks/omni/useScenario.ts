"use client";

/**
 * Scenario Studio data layer (Plan 2 Phase 4).
 * scenario-generate runs on the omni-video function; storyboard keyframes
 * reuse the EXISTING image pipeline (omni variant-submit + variants-poll)
 * with a cheap draft model.
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callOmni, callOmniVideo } from '@/lib/omniApi';
import type { OmniVideoScenario, VariantPollResult } from './types';

export const KEYFRAME_MODEL = 'fal-ai/flux/schnell';

export interface ScenarioGenerateInput {
  brief?: string;
  pasted_text?: string;
  source_url?: string;
  target_scenes?: number;
  seconds_per_scene?: number;
}

export interface ScenarioGenerateResult {
  scenario: OmniVideoScenario;
  retrieval: { brain_chunks: number; heart_rules: number };
}

export function useGenerateScenario() {
  return useMutation<ScenarioGenerateResult, Error, ScenarioGenerateInput>({
    mutationFn: (input) => callOmniVideo<ScenarioGenerateResult>('scenario-generate', { ...input }),
    onError: (e) => toast.error(e.message),
  });
}

/** Submit one keyframe generation for a scene (cheap image model, 16:9). */
export async function submitKeyframe(runId: string, visualPrompt: string, camera?: string): Promise<string> {
  const prompt = `${visualPrompt}${camera ? `, ${camera} camera` : ''}, cinematic still frame, high detail`;
  const res = await callOmni<{ asset_id: string }>('variant-submit', {
    run_id: runId,
    model_id: KEYFRAME_MODEL,
    prompt,
    prompt_provenance: 'raw',
    spec: { imageSize: 'landscape_16_9' },
  });
  return res.asset_id;
}

/** Poll a batch of keyframe assets once (callers loop on 'generating'). */
export async function pollKeyframes(assetIds: string[]): Promise<VariantPollResult[]> {
  if (assetIds.length === 0) return [];
  const res = await callOmni<{ results: VariantPollResult[] }>('variants-poll', { asset_ids: assetIds });
  return res.results;
}
