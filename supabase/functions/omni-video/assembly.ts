/**
 * Timeline assembly (Plan 2 Phase 6b, D-V4) - runs as ONE background job
 * against a polled omni_assets row (the whisper long-job pattern).
 *
 * Chain, shaped by the Phase-0 probe verdicts:
 *  1. merge-videos with EXPLICIT resolution + fps (landmine #3: it defaults
 *     to min-dimensions; scenes are normalized here, not by compose).
 *  2. Audio: VO and/or music. compose does NOT clip media to keyframe
 *     duration (probe verdict), so a music bed longer than the timeline is
 *     PRE-TRIMMED (or dropped, honestly noted) before mixing.
 *  3. Persist + best-effort thumbnail via extract-frame. (fal loudnorm is
 *     audio-only - probe-verified - so no loudness master is applied v1.)
 */

import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { FalUserError, falStatus, falSubmit } from '../omni/fal-runner.ts';
import { persistFalVideo } from './persist.ts';

type AdminClient = ReturnType<typeof createClient>;

const QUEUE_BASE = 'https://queue.fal.run';
const STEP_TIMEOUT_MS = 180_000;

/** Poll one fal utility job to completion and return its raw result JSON. */
async function runFalStep(falKey: string, modelId: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const submission = await falSubmit(falKey, modelId, input);
  const deadline = Date.now() + STEP_TIMEOUT_MS;
  for (;;) {
    if (Date.now() > deadline) throw new Error(`${modelId} timed out`);
    await new Promise((r) => setTimeout(r, 1500));
    const s = await falStatus(falKey, modelId, submission.requestId);
    if (s.status === 'COMPLETED') break;
  }
  const appId = modelId.split('/').slice(0, 2).join('/');
  const res = await fetch(`${QUEUE_BASE}/${appId}/requests/${submission.requestId}`, {
    headers: { Authorization: `Key ${falKey}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${modelId} result failed (${res.status})`);
  return await res.json() as Record<string, unknown>;
}

/** Media URL from any fal utility result shape (video_url | video{} | audio{} | media{}). */
export function mediaUrlFrom(result: Record<string, unknown>): string | null {
  if (typeof result.video_url === 'string') return result.video_url;
  if (typeof result.audio_url === 'string') return result.audio_url;
  for (const key of ['video', 'audio', 'media']) {
    const f = result[key] as { url?: string } | undefined;
    if (f && typeof f.url === 'string') return f.url;
  }
  const videos = result.videos as Array<{ url?: string }> | undefined;
  if (Array.isArray(videos) && typeof videos[0]?.url === 'string') return videos[0].url;
  return null;
}

export interface AssembleParams {
  supabaseAdmin: AdminClient;
  falKey: string;
  ownerId: string;
  runId: string;
  /** The polled output row (kind video, metadata.kind 'assembly'). */
  assetId: string;
  /** Ordered, signed scene clip URLs. */
  sceneUrls: string[];
  timelineSeconds: number;
  voiceoverUrl?: string;
  musicUrl?: string;
  resolution: string;
  fps: number;
}

export async function assembleRun(p: AssembleParams): Promise<void> {
  const { supabaseAdmin, falKey, assetId } = p;
  const notes: string[] = [];
  try {
    // 1. Normalize + concat the scenes.
    const merged = await runFalStep(p.falKey, 'fal-ai/ffmpeg-api/merge-videos', {
      video_urls: p.sceneUrls,
      resolution: p.resolution,
      target_fps: p.fps,
    });
    let currentUrl = mediaUrlFrom(merged);
    if (!currentUrl) throw new Error('merge-videos returned no output');

    // 2. Audio.
    let musicUrl = p.musicUrl;
    if (musicUrl) {
      const meta = await runFalStep(falKey, 'fal-ai/ffmpeg-api/metadata', { media_url: musicUrl, extract_frames: false })
        .catch(() => null);
      const musicSeconds = Number((meta?.media as { duration?: number } | undefined)?.duration ?? 0);
      if (musicSeconds > p.timelineSeconds + 2) {
        // Pre-trim the bed - compose would extend the output past the video.
        try {
          const trimmed = await runFalStep(falKey, 'fal-ai/workflow-utilities/trim-video', {
            video_url: musicUrl,
            start_time: 0,
            duration: p.timelineSeconds,
          });
          musicUrl = mediaUrlFrom(trimmed) ?? undefined;
          if (!musicUrl) notes.push('music dropped (trim returned no output)');
        } catch {
          musicUrl = undefined;
          notes.push('music dropped (bed longer than the timeline and not trimmable)');
        }
      }
    }

    if (p.voiceoverUrl && musicUrl) {
      const totalMs = Math.round(p.timelineSeconds * 1000);
      const composed = await runFalStep(falKey, 'fal-ai/ffmpeg-api/compose', {
        tracks: [
          { id: 'video', type: 'video', keyframes: [{ timestamp: 0, duration: totalMs, url: currentUrl }] },
          { id: 'voiceover', type: 'audio', keyframes: [{ timestamp: 0, duration: totalMs, url: p.voiceoverUrl }] },
          { id: 'music', type: 'audio', keyframes: [{ timestamp: 0, duration: totalMs, url: musicUrl }] },
        ],
      });
      currentUrl = mediaUrlFrom(composed);
      if (!currentUrl) throw new Error('compose returned no output');
    } else if (p.voiceoverUrl || musicUrl) {
      const mixed = await runFalStep(falKey, 'fal-ai/ffmpeg-api/merge-audio-video', {
        video_url: currentUrl,
        audio_url: p.voiceoverUrl ?? musicUrl,
        start_offset: 0,
      });
      currentUrl = mediaUrlFrom(mixed);
      if (!currentUrl) throw new Error('merge-audio-video returned no output');
    }

    // Loudness normalization is NOT applied: fal's loudnorm is audio-only
    // (probe-verified 2026-07-17 - a video input can only come back as audio),
    // so the old step always fell into its silent-skip catch. Scene engines
    // render at consistent levels; a video-capable master is a VPS-ffmpeg
    // future item.
    notes.push('loudness normalization not applied (no video-capable loudnorm on fal)');

    // 3. Persist the final + best-effort thumbnail.
    const persisted = await persistFalVideo(supabaseAdmin, p.ownerId, p.runId, assetId, currentUrl, 'video/mp4');
    let thumbPath: string | null = null;
    try {
      const frame = await runFalStep(falKey, 'fal-ai/ffmpeg-api/extract-frame', { video_url: currentUrl, frame_type: 'first' });
      const images = frame.images as Array<{ url?: string }> | undefined;
      const frameUrl = typeof frame.image_url === 'string' ? frame.image_url : images?.[0]?.url;
      if (frameUrl) {
        const imgRes = await fetch(frameUrl, { signal: AbortSignal.timeout(30_000) });
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          if (buf.byteLength <= 10 * 1024 * 1024) {
            thumbPath = `${p.ownerId}/omni-videos/${p.runId}/${assetId}.jpg`;
            const { error } = await supabaseAdmin.storage.from('omni-video')
              .upload(thumbPath, buf, { contentType: 'image/jpeg', upsert: true });
            if (error) thumbPath = null;
          }
        }
      }
    } catch { /* thumbnail is best-effort */ }

    const { data: row } = await supabaseAdmin.from('omni_assets').select('metadata').eq('id', assetId).maybeSingle();
    const meta = ((row as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    await supabaseAdmin
      .from('omni_assets')
      .update({
        status: 'done',
        storage_path: persisted.storagePath,
        mime_type: persisted.mimeType,
        metadata: {
          ...meta,
          byte_size: persisted.byteSize,
          duration_s: p.timelineSeconds,
          thumb_path: thumbPath,
          assembly_notes: notes,
        },
      })
      .eq('id', assetId);
  } catch (e) {
    const message = e instanceof FalUserError || e instanceof Error ? e.message : 'Assembly failed';
    console.error('omni-video: assembly error:', message);
    await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', assetId);
  }
}
