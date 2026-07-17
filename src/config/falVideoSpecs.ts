/**
 * fal.ai VIDEO model constraints (Plan 2 D-V6/§1.1 — live-verified 2026-07-16,
 * Seedance re-verified 2026-07-17). The video twin of falSpecs' image tables;
 * a lockstep edge copy ships with omni deploy #1 (Plan 2 Phase 2).
 *
 * Landmine #2: per-model video enums are as strict as image ones — Veo takes
 * ONLY 4|6|8s, LTX aspect is 16:9|9:16 ONLY, Kling v3 has NO resolution param.
 * Snap, never format-validate.
 */

export interface VideoModelConstraints {
  /** Accepted duration values in seconds; null = free-form (LongCat num_frames). */
  durations: number[] | null;
  /** 'auto' duration supported (Seedance). */
  autoDuration?: boolean;
  /** Whether durations are sent as strings (Seedance) or integers. */
  durationAsString?: boolean;
  /** Accepted aspect_ratio enum; null = model has no aspect param. */
  aspects: string[] | null;
  /** Accepted resolution enum; null = model has no resolution param. */
  resolutions: string[] | null;
  /** Native audio support (generate_audio or always-on). */
  nativeAudio: boolean;
  /** fps enum when the model exposes one. */
  fps?: number[];
}

export const VIDEO_MODEL_CONSTRAINTS: Record<string, VideoModelConstraints> = {
  // Hero T2V
  'fal-ai/kling-video/v3/pro/text-to-video': {
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    aspects: ['16:9', '9:16', '1:1'],
    resolutions: null,
    nativeAudio: true,
  },
  'fal-ai/veo3.1': {
    durations: [4, 6, 8],
    aspects: ['16:9', '9:16'],
    resolutions: ['720p', '1080p', '4k'],
    nativeAudio: true,
  },
  'fal-ai/veo3.1/fast': {
    durations: [4, 6, 8],
    aspects: ['16:9', '9:16'],
    resolutions: ['720p', '1080p', '4k'],
    nativeAudio: true,
  },
  'bytedance/seedance-2.0/text-to-video': {
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    autoDuration: true,
    durationAsString: true,
    aspects: ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    resolutions: ['480p', '720p', '1080p', '4k'],
    nativeAudio: true,
  },
  // Draft T2V
  'fal-ai/ltx-2.3/text-to-video': {
    durations: [6, 8, 10],
    aspects: ['16:9', '9:16'],
    resolutions: ['1080p', '1440p', '2160p'],
    nativeAudio: true,
    fps: [24, 25, 48, 50],
  },
  'fal-ai/ltx-2.3/text-to-video/fast': {
    durations: [6, 8, 10],
    aspects: ['16:9', '9:16'],
    resolutions: ['1080p', '1440p', '2160p'],
    nativeAudio: true,
    fps: [24, 25, 48, 50],
  },
  // Long-form draft (the ONLY >60s single-shot generator; num_frames-driven)
  'fal-ai/longcat-video/text-to-video/720p': {
    durations: null,
    aspects: null,
    resolutions: null,
    nativeAudio: false,
  },
  // I2V
  'bytedance/seedance-2.0/image-to-video': {
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    autoDuration: true,
    durationAsString: true,
    aspects: null,
    resolutions: ['480p', '720p', '1080p', '4k'],
    nativeAudio: true,
  },
  'fal-ai/kling-video/v3/pro/image-to-video': {
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    aspects: null,
    resolutions: null,
    nativeAudio: true,
  },
};

/** Snap a requested duration to the model's enum (nearest accepted value). */
export function snapVideoDuration(modelId: string, seconds: number): number {
  const c = VIDEO_MODEL_CONSTRAINTS[modelId];
  if (!c?.durations || c.durations.length === 0) return Math.max(1, Math.round(seconds));
  let best = c.durations[0];
  for (const d of c.durations) {
    if (Math.abs(d - seconds) < Math.abs(best - seconds)) best = d;
  }
  return best;
}

/** Snap an aspect to the video model's enum; null when the model has no aspect param. */
export function snapVideoAspect(modelId: string, ratio: string): string | null {
  const c = VIDEO_MODEL_CONSTRAINTS[modelId];
  if (!c || c.aspects === null) return null;
  if (c.aspects.includes(ratio)) return ratio;
  const value = (r: string): number | null => {
    const m = /^([1-9]\d?):([1-9]\d?)$/.exec(r);
    return m ? Number(m[1]) / Number(m[2]) : null;
  };
  const target = value(ratio);
  if (target == null) return c.aspects.includes('auto') ? 'auto' : c.aspects[0];
  let best: string | null = null;
  let bestDiff = Infinity;
  for (const cand of c.aspects) {
    const v = value(cand);
    if (v == null) continue;
    const diff = Math.abs(v - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = cand;
    }
  }
  return best ?? (c.aspects.includes('auto') ? 'auto' : c.aspects[0]);
}
