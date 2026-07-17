/**
 * Clips mode hook-first templates (Plan 2 Phase 8, §2 Mode 3).
 * Each template shapes ONE 9:16 native-audio clip prompt around the idea;
 * engine ceilings bound clip length (Kling/Seedance ≤15s, LTX-fast ≤10s).
 */

import { ALL_DRAFT_ENGINES, type DraftEngineOption } from '../video-studio/vsEngines';
import { VIDEO_MODEL_CONSTRAINTS } from '@/config/falVideoSpecs';
import { getFalPrice } from '@/config/falPricing';

export interface ClipTemplate {
  id: string;
  label: string;
  blurb: string;
  compose: (idea: string) => string;
}

const VERTICAL_NOTE = 'Vertical 9:16 framing, subject centered for mobile, energetic pacing, native sound design.';

export const CLIP_TEMPLATES: ClipTemplate[] = [
  {
    id: 'problem_hook',
    label: 'Problem hook',
    blurb: 'Open on the pain point, hook in the first second.',
    compose: (idea) => `Open on the biggest pain point of: ${idea}. Hook the viewer in the first second, then reveal the payoff with fast cuts and bold energy. ${VERTICAL_NOTE}`,
  },
  {
    id: 'pov',
    label: 'POV',
    blurb: 'First-person immersion.',
    compose: (idea) => `POV first-person shot: ${idea}. The camera IS the viewer, hands visible where natural, immersive and personal. ${VERTICAL_NOTE}`,
  },
  {
    id: 'listicle',
    label: 'Listicle',
    blurb: 'Rapid countdown of punchy moments.',
    compose: (idea) => `Rapid listicle countdown about: ${idea}. Each beat is a distinct punchy visual moment, quick rhythm, satisfying finish. ${VERTICAL_NOTE}`,
  },
  {
    id: 'before_after',
    label: 'Before / after',
    blurb: 'Dramatic transformation reveal.',
    compose: (idea) => `Dramatic before-and-after transformation of: ${idea}. Start with the underwhelming before, hard cut to the stunning after. ${VERTICAL_NOTE}`,
  },
];

export interface ClipEngineOption extends DraftEngineOption {
  maxSeconds: number;
}

/** Wrap a registry engine as a 9:16 clip engine; maxSeconds derives from the
 *  constraints twin so the length picker can never exceed what the model takes. */
function clipEngine(registryId: string, id: string, label: string, blurb: string): ClipEngineOption {
  const base = ALL_DRAFT_ENGINES.find((e) => e.id === registryId)!;
  const c = VIDEO_MODEL_CONSTRAINTS[base.modelId];
  return {
    ...base,
    id,
    label,
    blurb,
    aspect: '9:16',
    maxSeconds: c?.durations?.length ? Math.max(...c.durations) : 15,
  };
}

/** Native-audio engines for Clips (2026-07-17 rehab lineup: hero, budget,
 *  value, draft + the mid-tier options). All render sound with the video. */
export const CLIP_ENGINES: ClipEngineOption[] = [
  clipEngine('kling_v3', 'kling_hero', 'Kling v3 Pro (hero)', 'Native audio, strongest short-form quality. 3-15s.'),
  clipEngine('pixverse', 'pixverse_budget', 'PixVerse V6 (cheapest)', 'The budget clip engine with audio. 1-15s.'),
  clipEngine('seedance_t2v', 'seedance_value', 'Seedance 2.0 (value)', 'Native audio at no extra cost, unit-priced. 4-15s.'),
  clipEngine('ltx_fast', 'ltx_draft', 'LTX fast (draft)', 'Cheap native-audio draft. 6-10s.'),
  clipEngine('kling_26', 'kling_26_mid', 'Kling 2.6 Pro (mid)', 'Cinematic audio clips at half the v3 price. 5s or 10s.'),
  clipEngine('wan_27', 'wan_always', 'Wan 2.7 (always audio)', 'Always-audible output with auto music. 2-15s.'),
];

/** Up-front cost line: price × seconds × takes, or the honest calibrate label. */
export function estimateClipCost(engine: ClipEngineOption, seconds: number, takes: number): string {
  const price = getFalPrice(engine.modelId);
  if (price.unitPrice == null || price.calibrate || price.unit !== 'second') {
    return `${engine.priceLabel} × ${takes} take${takes === 1 ? '' : 's'}`;
  }
  return `~$${(price.unitPrice * seconds * takes).toFixed(2)} (${takes} take${takes === 1 ? '' : 's'} × ${seconds}s)`;
}

/** The 9:16 preset of each network a vertical clip fits as-is. */
export const CLIP_NETWORK_PRESETS: Array<{ network: string; presetId: string }> = [
  { network: 'tiktok', presetId: 'tiktok_vertical' },
  { network: 'instagram', presetId: 'ig_reel' },
  { network: 'youtube', presetId: 'yt_short' },
  { network: 'facebook', presetId: 'fb_reel' },
  { network: 'pinterest', presetId: 'pin_vertical' },
];
