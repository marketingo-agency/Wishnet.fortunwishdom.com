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
import type { OmniScenarioScene, OmniVideoScenario, VariantPollResult } from './types';

export const KEYFRAME_MODEL = 'fal-ai/flux/schnell';
/** Canon scenes render keyframes on the proven edit model with the character's
 *  Wishpedia reference art attached (Phase 4 — the Wishu fix). */
export const CANON_KEYFRAME_MODEL = 'fal-ai/nano-banana-pro/edit';
const MAX_KEYFRAME_REFS = 8;

/** Canon reference image ids for a scene (its characters' Wishpedia art). */
export function canonRefsForScene(scenario: OmniVideoScenario, scene: OmniScenarioScene): string[] {
  if (!scene.characters?.length || !scenario.cast?.length) return [];
  const refs: string[] = [];
  for (const name of scene.characters) {
    const member = scenario.cast.find((c) => c.name === name);
    if (member) refs.push(...member.image_ids);
  }
  return [...new Set(refs)].slice(0, MAX_KEYFRAME_REFS);
}

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

/** Submit one keyframe generation for a scene (16:9). Scenes WITH canon
 *  characters run on the edit model with their Wishpedia reference images
 *  attached (server-resolved ids, canon-anchor auto-injected by the omni
 *  edge); cast-less scenes stay on the cheap draft model. */
export async function submitKeyframe(
  runId: string,
  visualPrompt: string,
  camera?: string,
  canonRefIds: string[] = [],
): Promise<string> {
  const prompt = `${visualPrompt}${camera ? `, ${camera} camera` : ''}, cinematic still frame, high detail`;
  const hasRefs = canonRefIds.length > 0;
  const res = await callOmni<{ asset_id: string }>('variant-submit', {
    run_id: runId,
    model_id: hasRefs ? CANON_KEYFRAME_MODEL : KEYFRAME_MODEL,
    prompt,
    prompt_provenance: 'raw',
    ...(hasRefs
      ? { reference_image_ids: canonRefIds.slice(0, MAX_KEYFRAME_REFS), spec: { aspectRatio: '16:9' } }
      : { spec: { imageSize: 'landscape_16_9' } }),
  });
  return res.asset_id;
}

/** Poll a batch of keyframe assets once (callers loop on 'generating'). */
export async function pollKeyframes(assetIds: string[]): Promise<VariantPollResult[]> {
  if (assetIds.length === 0) return [];
  const res = await callOmni<{ results: VariantPollResult[] }>('variants-poll', { asset_ids: assetIds });
  return res.results;
}
