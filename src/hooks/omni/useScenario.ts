"use client";

/**
 * Scenario Studio data layer (Plan 2 Phase 4).
 * scenario-generate runs on the omni-video function; storyboard keyframes
 * reuse the EXISTING image pipeline (omni variant-submit + variants-poll)
 * with a caller-chosen image model.
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callOmni, callOmniVideo } from '@/lib/omniApi';
import { stripKnowledgeMarkers } from '@/lib/omni/stripKnowledgeMarkers';
import type { OmniScenarioScene, OmniVideoScenario, VariantPollResult } from './types';

/** Default keyframe model when no reference images are involved. */
export const KEYFRAME_MODEL = 'fal-ai/flux/schnell';
/** Default when references ARE involved: the proven edit model that consumes
 *  Wishpedia reference art (Phase 4 — the Wishu fix). */
export const CANON_KEYFRAME_MODEL = 'fal-ai/nano-banana-pro/edit';
const MAX_KEYFRAME_REFS = 8;

/** Curated storyboard image models (the picker in stage 3; "browse all" adds
 *  the live fal catalog on top). Edit models consume reference images. */
export interface KeyframeModelOption {
  id: string;
  label: string;
  edit: boolean;
}
export const KEYFRAME_MODEL_OPTIONS: KeyframeModelOption[] = [
  { id: 'fal-ai/flux/schnell', label: 'FLUX schnell — fast & cheap', edit: false },
  { id: 'fal-ai/flux/dev', label: 'FLUX dev — higher quality', edit: false },
  { id: 'fal-ai/flux-pro/v1.1-ultra', label: 'FLUX1.1 Pro Ultra', edit: false },
  { id: 'fal-ai/nano-banana-2', label: 'Nano Banana 2', edit: false },
  { id: 'fal-ai/ideogram/v3', label: 'Ideogram V3 — strong typography', edit: false },
  { id: 'fal-ai/recraft/v4/text-to-image', label: 'Recraft V4 — design-grade', edit: false },
  { id: 'fal-ai/nano-banana-pro/edit', label: 'Nano Banana Pro — edit / references', edit: true },
  { id: 'fal-ai/nano-banana-2/edit', label: 'Nano Banana 2 — edit / references', edit: true },
  { id: 'fal-ai/gemini-25-flash-image/edit', label: 'Gemini 2.5 Flash Image — edit', edit: true },
  { id: 'fal-ai/bytedance/seedream/v4/edit', label: 'Seedream V4 — edit', edit: true },
  { id: 'fal-ai/flux-pro/kontext/max/multi', label: 'FLUX Kontext Max — edit', edit: true },
];

/** Canon reference image ids for a scene (its characters' Wishpedia art). */
export function canonRefsForScene(scenario: OmniVideoScenario, scene: OmniScenarioScene): string[] {
  if (!scene.characters?.length || !scenario.cast?.length) return [];
  const refs: string[] = [];
  for (const name of scene.characters) {
    const member = scenario.cast.find((c) => c.name === name);
    if (member) refs.push(...member.image_ids);
  }
  return [...new Set(refs)];
}

/** Strip citation markers ([W#]/[B#]/[n]) leaked into scenario text at the
 *  source, so structure + storyboard render clean prompts. */
function sanitizeScenario(scenario: OmniVideoScenario): OmniVideoScenario {
  return {
    ...scenario,
    title: stripKnowledgeMarkers(scenario.title),
    scenes: scenario.scenes.map((s) => ({
      ...s,
      visual_prompt: stripKnowledgeMarkers(s.visual_prompt),
      narration: stripKnowledgeMarkers(s.narration ?? ''),
    })),
  };
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
    mutationFn: async (input) => {
      const result = await callOmniVideo<ScenarioGenerateResult>('scenario-generate', { ...input });
      return { ...result, scenario: sanitizeScenario(result.scenario) };
    },
    onError: (e) => toast.error(e.message),
  });
}

export interface KeyframeSubmitOptions {
  /** The fal image model chosen in the storyboard step. */
  modelId: string;
  /** Whether modelId is edit-capable (consumes reference images). */
  modelIsEdit: boolean;
  /** Combined Wishpedia reference image ids (step-1 refs + this scene's canon). */
  referenceImageIds?: string[];
  camera?: string;
}

/**
 * Submit one keyframe generation for a scene (16:9). When the scene has
 * reference images, they route to an edit model (the chosen one if edit-capable,
 * else the proven canon edit model) with the ids attached; otherwise the chosen
 * model runs text-to-image. The spec carries both an aspect ratio and a size
 * preset so the edge picks whichever the model's convention needs.
 */
export async function submitKeyframe(
  runId: string,
  visualPrompt: string,
  opts: KeyframeSubmitOptions,
): Promise<string> {
  const { modelId, modelIsEdit, referenceImageIds = [], camera } = opts;
  const prompt = `${visualPrompt}${camera ? `, ${camera} camera` : ''}, cinematic still frame, high detail`;
  const refs = referenceImageIds.slice(0, MAX_KEYFRAME_REFS);
  const hasRefs = refs.length > 0;
  // Match the model to the scene: references demand an edit model (honor the
  // choice if edit-capable, else the proven canon edit model); a scene with NO
  // references must NOT run an edit model (edit models require an image input),
  // so an edit choice downgrades to the default text-to-image model here.
  const effectiveModel = hasRefs
    ? (modelIsEdit ? modelId : CANON_KEYFRAME_MODEL)
    : (modelIsEdit ? KEYFRAME_MODEL : modelId);
  const res = await callOmni<{ asset_id: string }>('variant-submit', {
    run_id: runId,
    model_id: effectiveModel,
    prompt,
    prompt_provenance: 'raw',
    spec: { aspectRatio: '16:9', imageSize: 'landscape_16_9' },
    ...(hasRefs ? { reference_image_ids: refs } : {}),
  });
  return res.asset_id;
}

/** Poll a batch of keyframe assets once (callers loop on 'generating'). */
export async function pollKeyframes(assetIds: string[]): Promise<VariantPollResult[]> {
  if (assetIds.length === 0) return [];
  const res = await callOmni<{ results: VariantPollResult[] }>('variants-poll', { asset_ids: assetIds });
  return res.results;
}
