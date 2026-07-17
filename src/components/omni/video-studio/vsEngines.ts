/**
 * Video Studio draft engines (Plan 2 D-V3 / Q5). Hero re-render (Kling 3 Pro
 * default) lands with Phase 6's assembly; stage 2 picks the DRAFT engine.
 */

import { estimateSecondsCost, getFalPrice } from '@/config/falPricing';
import type { DraftEngine } from '@/hooks/omni/useVideoScenes';
import type { OmniScenarioScene } from '@/hooks/omni';

export interface DraftEngineOption extends DraftEngine {
  id: string;
  label: string;
  blurb: string;
  /** Rendered price line; null = calibrate ("≈, verify"). */
  priceLabel: string;
}

export const DRAFT_ENGINES: DraftEngineOption[] = [
  {
    id: 'ltx_fast',
    modelId: 'fal-ai/ltx-2.3/text-to-video/fast',
    i2v: false,
    resolution: '1080p',
    generateAudio: true,
    label: 'LTX fast (audio)',
    blurb: 'Short-form draft with native audio. 6-10s scenes, 16:9 or 9:16.',
    priceLabel: '$0.06/s',
  },
  {
    id: 'longcat',
    modelId: 'fal-ai/longcat-video/text-to-video/720p',
    i2v: false,
    generateAudio: false,
    label: 'LongCat 720p (silent)',
    blurb: 'The long-form draft engine: any scene length, no audio, open-model quality.',
    priceLabel: '$0.04/s',
  },
  {
    id: 'seedance_i2v',
    modelId: 'bytedance/seedance-2.0/image-to-video',
    i2v: true,
    resolution: '480p',
    generateAudio: false,
    label: 'Seedance i2v 480p (keyframe-anchored)',
    blurb: 'Animates each scene FROM its storyboard keyframe (strongest continuity). Unit-priced.',
    priceLabel: '≈$0.014/unit — verify',
  },
];

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
  const price = getFalPrice(engine.modelId);
  if (price.unitPrice == null || price.calibrate) {
    return { total: null, perSceneLabel: engine.priceLabel };
  }
  const total = scenes.reduce((sum, s) => sum + (estimateSecondsCost(engine.modelId, s.duration_s || 0) ?? 0), 0);
  return { total, perSceneLabel: engine.priceLabel };
}
