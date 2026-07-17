/**
 * Video Studio engine registry (Plan 2 D-V3, rebuilt in the 2026-07-17 rehab).
 *
 * Every generation-capable model in VIDEO_MODEL_CONSTRAINTS becomes a pickable
 * engine (labels + honest prices derived here, capabilities from the
 * constraints twin — the client can never offer a model the edge rejects).
 * DRAFT_ENGINES stays the small suggested trio; ALL_DRAFT_ENGINES is the full
 * curated list; catalog picks outside the registry become GENERIC engines
 * (prompt-only input, honest hint) via engineFromCatalogModel.
 */

import { estimateSecondsCost, getFalPrice } from '@/config/falPricing';
import { VIDEO_MODEL_CONSTRAINTS } from '@/config/falVideoSpecs';
import type { DraftEngine } from '@/hooks/omni/useVideoScenes';
import type { OmniScenarioScene } from '@/hooks/omni';

export interface DraftEngineOption extends DraftEngine {
  id: string;
  label: string;
  blurb: string;
  /** Rendered price line; calibrate-priced engines say "verify". */
  priceLabel: string;
  /** The engine renders audio with the video (from the constraints twin). */
  nativeAudio: boolean;
  /** Catalog pick outside the curated registry: generic prompt-only input. */
  generic?: boolean;
}

/** Persistable shape for catalog picks (step_state.video_engine_custom). */
export interface CustomEngineRef {
  modelId: string;
  i2v: boolean;
  label: string;
}

function price(modelId: string): string {
  const p = getFalPrice(modelId);
  if (p.unitPrice == null || p.calibrate) return '≈ verify';
  if (p.unit === 'second') return `$${p.unitPrice}/s`;
  return `$${p.unitPrice}`;
}

function fromConstraints(
  id: string,
  modelId: string,
  label: string,
  blurb: string,
  extra?: Partial<DraftEngineOption>,
): DraftEngineOption {
  const c = VIDEO_MODEL_CONSTRAINTS[modelId];
  const nativeAudio = c?.nativeAudio ?? false;
  return {
    id,
    modelId,
    i2v: false,
    // Native-audio engines default audio ON (Phase 3: audio ships WITH the
    // video); always-on engines need no flag; silent engines send nothing.
    generateAudio: nativeAudio && !c?.audioAlwaysOn ? true : undefined,
    label,
    blurb,
    priceLabel: price(modelId),
    nativeAudio,
    ...extra,
  };
}

/** The full curated engine list (every constraints model a scene can run on). */
export const ALL_DRAFT_ENGINES: DraftEngineOption[] = [
  // text-to-video
  fromConstraints('ltx_fast', 'fal-ai/ltx-2.3/text-to-video/fast', 'LTX fast (audio)',
    'Short-form draft with native audio. 6-10s scenes, up to 2160p, 16:9 or 9:16.'),
  fromConstraints('ltx_pro', 'fal-ai/ltx-2.3/text-to-video', 'LTX pro (audio)',
    'Higher-quality LTX tier: native audio, up to 2160p and 50fps.'),
  fromConstraints('pixverse', 'fal-ai/pixverse/v6/text-to-video', 'PixVerse V6 (cheapest)',
    'The budget engine: 1-15s, 8 aspect ratios, audio included. Great for volume.'),
  fromConstraints('kling_26', 'fal-ai/kling-video/v2.6/pro/text-to-video', 'Kling 2.6 Pro (audio)',
    'Cinematic mid-tier with native audio at half the v3 price. 5s or 10s.'),
  fromConstraints('kling_v3', 'fal-ai/kling-video/v3/pro/text-to-video', 'Kling v3 Pro (audio)',
    'The all-round flagship: 3-15s, native speech + audio, 16:9/9:16/1:1.'),
  fromConstraints('wan_27', 'fal-ai/wan/v2.7/text-to-video', 'Wan 2.7 (always audio)',
    'Always-audible output (auto music) and it can take a voiceover as INPUT.'),
  fromConstraints('seedance_t2v', 'bytedance/seedance-2.0/text-to-video', 'Seedance 2.0 (audio)',
    'Cinematic workhorse: 21:9 to 9:16, up to 4k, lip-synced speech at no extra cost.'),
  fromConstraints('veo_fast', 'fal-ai/veo3.1/fast', 'Veo 3.1 Fast (audio)',
    'Google DeepMind quality at the value tier. 4/6/8s, native audio.'),
  fromConstraints('veo', 'fal-ai/veo3.1', 'Veo 3.1 (premium audio)',
    'The premium cinematic tier: top fidelity + native audio. 4/6/8s, up to 4k.'),
  fromConstraints('longcat', 'fal-ai/longcat-video/text-to-video/720p', 'LongCat 720p (silent)',
    'The long-form draft engine: any scene length, no audio, open-model quality.'),
  // image-to-video (keyframe-anchored)
  fromConstraints('seedance_i2v', 'bytedance/seedance-2.0/image-to-video', 'Seedance i2v (keyframe-anchored)',
    'Animates each scene FROM its storyboard keyframe (strongest continuity).',
    { i2v: true, resolution: '480p', generateAudio: undefined }),
  fromConstraints('kling_v3_i2v', 'fal-ai/kling-video/v3/pro/image-to-video', 'Kling v3 Pro i2v (audio)',
    'Keyframe-anchored with start/end frame control and native audio.', { i2v: true }),
  fromConstraints('ltx_i2v', 'fal-ai/ltx-2.3/image-to-video', 'LTX i2v (audio)',
    'Keyframe-anchored LTX: start/end frames, native audio, up to 2160p.', { i2v: true }),
  fromConstraints('veo_i2v', 'fal-ai/veo3.1/image-to-video', 'Veo 3.1 i2v (premium audio)',
    'Premium keyframe animation with native audio (16:9/9:16).', { i2v: true }),
];

/** The suggested trio (auto-suggest heuristic operates on these). */
export const DRAFT_ENGINES: DraftEngineOption[] = [
  ALL_DRAFT_ENGINES.find((e) => e.id === 'ltx_fast')!,
  ALL_DRAFT_ENGINES.find((e) => e.id === 'longcat')!,
  ALL_DRAFT_ENGINES.find((e) => e.id === 'seedance_i2v')!,
];

export function engineById(id: string | undefined): DraftEngineOption | null {
  if (!id) return null;
  return ALL_DRAFT_ENGINES.find((e) => e.id === id) ?? null;
}

/** Wrap a live-catalog model as a generic engine (prompt-only server input). */
export function engineFromCatalogModel(model: { id: string; name: string; category: string }): DraftEngineOption {
  return {
    id: `catalog:${model.id}`,
    modelId: model.id,
    i2v: model.category === 'image-to-video',
    label: model.name,
    blurb: 'Catalog model — generic settings (prompt only; duration/aspect/audio knobs are not available for uncurated models).',
    priceLabel: 'catalog · price varies',
    nativeAudio: false,
    generic: true,
  };
}

/** Rehydrate a persisted catalog pick. */
export function engineFromCustomRef(ref: CustomEngineRef): DraftEngineOption {
  return engineFromCatalogModel({ id: ref.modelId, name: ref.label, category: ref.i2v ? 'image-to-video' : 'text-to-video' });
}

/** Hero re-render engine pairs (t2v + i2v twin when the scene has a
 *  keyframe; i2v null = the engine renders keyframe scenes as t2v). */
export interface HeroEngineOption {
  id: string;
  label: string;
  t2v: string;
  i2v: string | null;
  /** $/s, or null for calibrate-priced engines ("≈ verify"). */
  pricePerS: number | null;
}

export const HERO_ENGINES: HeroEngineOption[] = [
  { id: 'kling_v3', label: 'Kling v3 Pro (audio)', t2v: 'fal-ai/kling-video/v3/pro/text-to-video', i2v: 'fal-ai/kling-video/v3/pro/image-to-video', pricePerS: 0.14 },
  { id: 'veo', label: 'Veo 3.1 (premium audio)', t2v: 'fal-ai/veo3.1', i2v: 'fal-ai/veo3.1/image-to-video', pricePerS: 0.4 },
  { id: 'veo_fast', label: 'Veo 3.1 Fast (audio)', t2v: 'fal-ai/veo3.1/fast', i2v: null, pricePerS: 0.15 },
  { id: 'seedance', label: 'Seedance 2.0 (audio)', t2v: 'bytedance/seedance-2.0/text-to-video', i2v: 'bytedance/seedance-2.0/image-to-video', pricePerS: null },
  { id: 'ltx_pro', label: 'LTX pro (audio)', t2v: 'fal-ai/ltx-2.3/text-to-video', i2v: 'fal-ai/ltx-2.3/image-to-video', pricePerS: 0.08 },
];

export function heroEngineById(id: string | undefined): HeroEngineOption {
  return HERO_ENGINES.find((e) => e.id === id) ?? HERO_ENGINES[0];
}

/** Q5 default: long scenes/totals suggest LongCat, short ones LTX-fast;
 *  scenes with keyframes suggest the i2v engine. */
export function suggestDraftEngine(scenes: OmniScenarioScene[]): DraftEngineOption {
  const withKeyframes = scenes.filter((s) => s.keyframe_asset_id).length;
  if (withKeyframes >= Math.ceil(scenes.length / 2)) return DRAFT_ENGINES[2];
  const total = scenes.reduce((sum, s) => sum + (s.duration_s || 0), 0);
  const maxScene = Math.max(0, ...scenes.map((s) => s.duration_s || 0));
  if (total > 60 || maxScene > 10) return DRAFT_ENGINES[1];
  return DRAFT_ENGINES[0];
}

export interface DraftCost {
  /** Total draft cost, or null when the engine is calibrate-priced. */
  total: number | null;
  perSceneLabel: string;
}

export function estimateDraftCost(engine: DraftEngineOption, scenes: OmniScenarioScene[]): DraftCost {
  const priceInfo = getFalPrice(engine.modelId);
  if (priceInfo.unitPrice == null || priceInfo.calibrate) {
    return { total: null, perSceneLabel: engine.priceLabel };
  }
  const total = scenes.reduce((sum, s) => sum + (estimateSecondsCost(engine.modelId, s.duration_s || 0) ?? 0), 0);
  return { total, perSceneLabel: engine.priceLabel };
}
