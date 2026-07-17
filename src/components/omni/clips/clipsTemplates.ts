/**
 * Clips mode hook-first templates (Plan 2 Phase 8, §2 Mode 3).
 * Each template shapes ONE 9:16 native-audio clip prompt around the idea;
 * engine ceilings bound clip length (Kling/Seedance ≤15s, LTX-fast ≤10s).
 */

import { DRAFT_ENGINES, type DraftEngineOption } from '../video-studio/vsEngines';

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

/** Native-audio engines for Clips (Q: hero default) + the draft toggle. */
export const CLIP_ENGINES: ClipEngineOption[] = [
  {
    id: 'kling_hero',
    modelId: 'fal-ai/kling-video/v3/pro/text-to-video',
    i2v: false,
    aspect: '9:16',
    generateAudio: true,
    label: 'Kling v3 Pro (hero)',
    blurb: 'Native audio, strongest short-form quality. 3-15s.',
    priceLabel: '$0.14/s',
    maxSeconds: 15,
  },
  {
    id: 'seedance_value',
    modelId: 'bytedance/seedance-2.0/text-to-video',
    i2v: false,
    aspect: '9:16',
    resolution: '1080p',
    generateAudio: true,
    label: 'Seedance 2.0 (value)',
    blurb: 'Native audio at no extra cost, unit-priced. 4-15s.',
    priceLabel: '≈$0.014/unit — verify',
    maxSeconds: 15,
  },
  {
    ...DRAFT_ENGINES[0],
    id: 'ltx_draft',
    aspect: '9:16',
    label: 'LTX fast (draft)',
    blurb: 'Cheap native-audio draft. 6-10s.',
    maxSeconds: 10,
  },
];

/** Up-front cost line: price × seconds × takes, or the honest calibrate label. */
export function estimateClipCost(engine: ClipEngineOption, seconds: number, takes: number): string {
  if (engine.id === 'seedance_value') return `${engine.priceLabel} × ${takes} take${takes === 1 ? '' : 's'}`;
  const perSecond = engine.id === 'kling_hero' ? 0.14 : 0.06;
  return `~$${(perSecond * seconds * takes).toFixed(2)} (${takes} take${takes === 1 ? '' : 's'} × ${seconds}s)`;
}

/** The 9:16 preset of each network a vertical clip fits as-is. */
export const CLIP_NETWORK_PRESETS: Array<{ network: string; presetId: string }> = [
  { network: 'tiktok', presetId: 'tiktok_vertical' },
  { network: 'instagram', presetId: 'ig_reel' },
  { network: 'youtube', presetId: 'yt_short' },
  { network: 'facebook', presetId: 'fb_reel' },
  { network: 'pinterest', presetId: 'pin_vertical' },
];
