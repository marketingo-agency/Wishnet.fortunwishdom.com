/**
 * Video model constraints + input builders (edge twin of src/config/falVideoSpecs.ts
 * - keep the two lockstep). Live-verified 2026-07-16/17.
 *
 * Landmine #2 (Plan 2): per-model video enums are strict - Veo takes ONLY
 * 4|6|8s, LTX aspect is 16:9|9:16 ONLY, Kling v3 has NO resolution param,
 * Seedance sends durations as STRINGS. Snap, never format-validate.
 */

export interface VideoModelConstraints {
  durations: number[] | null;
  autoDuration?: boolean;
  durationAsString?: boolean;
  aspects: string[] | null;
  resolutions: string[] | null;
  nativeAudio: boolean;
  fps?: number[];
  /** Input key that carries the start image for i2v models. */
  startImageKey?: string;
  /** Input key that carries the end image for i2v models. */
  endImageKey?: string;
  /** Input key that carries multiple reference images (Seedance r2v). */
  refImagesKey?: string;
  /** Input key that carries the driving audio (avatar/lipsync models). */
  audioKey?: string;
}

export const VIDEO_MODEL_CONSTRAINTS: Record<string, VideoModelConstraints> = {
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
  'fal-ai/longcat-video/text-to-video/720p': {
    durations: null,
    aspects: null,
    resolutions: null,
    nativeAudio: false,
  },
  'bytedance/seedance-2.0/image-to-video': {
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    autoDuration: true,
    durationAsString: true,
    aspects: null,
    resolutions: ['480p', '720p', '1080p', '4k'],
    nativeAudio: true,
    startImageKey: 'image_url',
    endImageKey: 'end_image_url',
  },
  'fal-ai/kling-video/v3/pro/image-to-video': {
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    aspects: null,
    resolutions: null,
    nativeAudio: true,
    startImageKey: 'start_image_url',
    endImageKey: 'end_image_url',
  },
  'bytedance/seedance-2.0/reference-to-video': {
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    autoDuration: true,
    durationAsString: true,
    aspects: ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    resolutions: ['480p', '720p', '1080p', '4k'],
    nativeAudio: true,
    // Up to 9 reference images, addressed in the prompt as @Image1..N.
    refImagesKey: 'image_urls',
  },
  'fal-ai/kling-video/ai-avatar/v2/pro': {
    // Schema-verified 2026-07-17: image_url + audio_url (+ optional prompt);
    // no duration/aspect/resolution knobs - the audio drives the length.
    durations: null,
    aspects: null,
    resolutions: null,
    nativeAudio: true,
    startImageKey: 'image_url',
    audioKey: 'audio_url',
  },
};

/** Generation models this function will submit to (allowlist - the catalog
 *  check alone would admit any live fal endpoint). */
export function isAllowedVideoModel(modelId: string): boolean {
  return Object.prototype.hasOwnProperty.call(VIDEO_MODEL_CONSTRAINTS, modelId);
}

export function snapVideoDuration(modelId: string, seconds: number): number {
  const c = VIDEO_MODEL_CONSTRAINTS[modelId];
  if (!c?.durations || c.durations.length === 0) return Math.max(1, Math.round(seconds));
  let best = c.durations[0];
  for (const d of c.durations) {
    if (Math.abs(d - seconds) < Math.abs(best - seconds)) best = d;
  }
  return best;
}

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

export interface VideoSubmitParams {
  duration?: number;
  aspect?: string;
  resolution?: string;
  fps?: number;
  generateAudio?: boolean;
  /** LongCat only: free-form seconds converted to num_frames (30fps). */
  seconds?: number;
}

/**
 * Build the model-correct fal input for a generation submit. Server-side
 * translation only - the client never supplies raw fal params (the Plan-1
 * fal-submit governance lesson).
 */
export function buildVideoInput(
  modelId: string,
  prompt: string,
  params: VideoSubmitParams,
  images: { startUrl?: string; endUrl?: string; refUrls?: string[]; audioUrl?: string },
): Record<string, unknown> {
  const c = VIDEO_MODEL_CONSTRAINTS[modelId];
  const input: Record<string, unknown> = {};
  if (prompt) input.prompt = prompt;

  if (modelId === 'fal-ai/longcat-video/text-to-video/720p') {
    // The only >60s single-shot generator: num_frames at 30fps, silent output.
    const seconds = Math.min(Math.max(Math.round(params.seconds ?? params.duration ?? 10), 2), 240);
    input.num_frames = seconds * 30;
    return input;
  }

  if (c?.durations) {
    const snapped = snapVideoDuration(modelId, params.duration ?? c.durations[0]);
    input.duration = c.durationAsString ? String(snapped) : snapped;
  }
  if (params.aspect && c?.aspects) {
    const aspect = snapVideoAspect(modelId, params.aspect);
    if (aspect) input.aspect_ratio = aspect;
  }
  if (params.resolution && c?.resolutions?.includes(params.resolution)) {
    input.resolution = params.resolution;
  }
  if (params.fps && c?.fps?.includes(params.fps)) {
    input.fps = params.fps;
  }
  if (c?.nativeAudio && params.generateAudio !== undefined) {
    input.generate_audio = params.generateAudio;
  }
  if (images.startUrl && c?.startImageKey) input[c.startImageKey] = images.startUrl;
  if (images.endUrl && c?.endImageKey) input[c.endImageKey] = images.endUrl;
  if (images.refUrls && images.refUrls.length > 0 && c?.refImagesKey) {
    input[c.refImagesKey] = images.refUrls.slice(0, 9);
  }
  if (images.audioUrl && c?.audioKey) input[c.audioKey] = images.audioUrl;
  return input;
}

// -- video-utility allowlist (Plan 2 Phase 2b) -----

/** The exact fal utility endpoints video-utility may call, with the input
 *  keys each accepts. Anything else is rejected - never raw passthrough. */
export const UTILITY_ALLOWLIST: Record<string, string[]> = {
  'fal-ai/workflow-utilities/trim-video': ['video_url', 'start_time', 'end_time', 'duration'],
  'fal-ai/ffmpeg-api/merge-videos': ['video_urls', 'resolution', 'target_fps'],
  'fal-ai/ffmpeg-api/merge-audio-video': ['video_url', 'audio_url', 'start_offset'],
  'fal-ai/ffmpeg-api/merge-audios': ['audio_urls'],
  'fal-ai/ffmpeg-api/compose': ['tracks'],
  // AUDIO-only endpoint; probe-verified 2026-07-17: input is audio_url
  // (media_url 422s) and the output is uncompressed WAV (no format knob).
  'fal-ai/ffmpeg-api/loudnorm': ['audio_url'],
  'fal-ai/ffmpeg-api/extract-frame': ['video_url', 'frame_type'],
  'fal-ai/ffmpeg-api/metadata': ['media_url', 'extract_frames'],
  'fal-ai/ltx-2.3/reframe': ['video_url', 'aspect_ratio', 'resolution'],
  'fal-ai/latentsync': ['video_url', 'audio_url', 'loop_mode', 'guidance_scale'],
  'fal-ai/sync-lipsync/v3': ['video_url', 'audio_url', 'sync_mode'],
  'fal-ai/topaz/upscale/video': ['video_url', 'model', 'upscale_factor', 'target_fps'],
  'fal-ai/mmaudio-v2': ['video_url', 'prompt', 'duration'],
};
