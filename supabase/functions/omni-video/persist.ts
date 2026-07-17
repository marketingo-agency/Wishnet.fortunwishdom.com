/**
 * Video persistence for the omni-video function (Plan 2 D-V8).
 *
 * Mirrors the discipline of _shared/fal.ts persistFalMedia + omni's pixel
 * template WITHOUT importing them (bundle-size policy, see EXECUTION_LOG
 * decision): fal.media host re-validation, magic-byte sanity check, size
 * caps, private `omni-video` bucket, signed URLs only, and the D-V7
 * compare-and-set 'persisting' claim shared with the finisher.
 */

import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';

type AdminClient = ReturnType<typeof createClient>;

export const VIDEO_BUCKET = 'omni-video';
/** Persist synchronously in-request up to this size (D-V8 probe verdict). */
export const IN_REQUEST_MAX_BYTES = 50 * 1024 * 1024;
/** Hard user-facing cap - beyond this the render must be split. */
export const HARD_MAX_BYTES = 200 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

const EXT_BY_MIME: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  // compose emits MOV containers named .mp4 (Phase-0 probe verdict).
  'video/mov': 'mp4',
  'video/quicktime': 'mp4',
  // audio outputs (voiceover mp3, lyria2 WAV beds) share the bucket.
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
};

export function videoExtForMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? 'mp4';
}

export function isFalMediaHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'fal.media' || host.endsWith('.fal.media');
  } catch {
    return false;
  }
}

/** MP4/MOV (ftyp at offset 4), webm/mkv (EBML), WAV (RIFF), MP3 (ID3/frame sync). */
function looksLikeMedia(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const ftyp = bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
  const ebml = bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  const riff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const mp3 = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  return ftyp || ebml || riff || id3 || mp3;
}

export interface PersistedVideo {
  storagePath: string;
  mimeType: string;
  byteSize: number;
}

/** Download a fal video (host-validated, capped, magic-byte-checked) into the
 *  private omni-video bucket under the OWNER's namespace. */
export async function persistFalVideo(
  supabaseAdmin: AdminClient,
  ownerId: string,
  runId: string,
  assetId: string,
  falUrl: string,
  contentType: string | null,
  maxBytes: number = HARD_MAX_BYTES,
): Promise<PersistedVideo> {
  if (!isFalMediaHost(falUrl)) throw new Error('Unexpected video host');

  const res = await fetch(falUrl, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Video download failed (${res.status})`);

  const declared = Number(res.headers.get('content-length') || '0');
  if (declared > maxBytes) {
    throw new Error('The rendered video exceeds the size cap. Split the timeline into shorter parts and re-assemble.');
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > maxBytes) {
    throw new Error('The rendered video exceeds the size cap. Split the timeline into shorter parts and re-assemble.');
  }
  const bytes = new Uint8Array(buf);
  if (!looksLikeMedia(bytes)) throw new Error('The downloaded file is not a recognized media container');

  const mimeType = contentType || res.headers.get('content-type') || 'video/mp4';
  const storagePath = `${ownerId}/omni-videos/${runId}/${assetId}.${videoExtForMime(mimeType)}`;

  const { error } = await supabaseAdmin.storage
    .from(VIDEO_BUCKET)
    .upload(storagePath, buf, { contentType: mimeType === 'video/mov' ? 'video/quicktime' : mimeType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  return { storagePath, mimeType, byteSize: buf.byteLength };
}

/** Signed URL for an omni-video path, confined to the owner's namespace
 *  (the Plan-1 signStoragePath lesson applies verbatim). */
export async function signVideoPath(
  supabaseAdmin: AdminClient,
  storagePath: string,
  ownerId: string,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  if (!storagePath.startsWith(`${ownerId}/`)) {
    console.error('omni-video: refused to sign a path outside the caller namespace');
    return null;
  }
  const { data, error } = await supabaseAdmin.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds);
  if (error) {
    console.error('omni-video: signed URL error:', error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * D-V7 claim: exactly ONE of client-poll / finisher persists an asset.
 * Returns true when THIS caller won the compare-and-set (row moved from a
 * pending/generating state to 'persisting'); stale 'persisting' rows
 * (>10 min) are reclaimable by passing reclaimStale.
 */
export async function claimForPersist(
  supabaseAdmin: AdminClient,
  assetId: string,
  reclaimStale = false,
): Promise<boolean> {
  let query = supabaseAdmin
    .from('omni_assets')
    .update({ status: 'persisting' })
    .eq('id', assetId);
  if (reclaimStale) {
    const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
    query = query.or(`status.in.(pending,generating),and(status.eq.persisting,updated_at.lt.${cutoff})`);
  } else {
    query = query.in('status', ['pending', 'generating']);
  }
  const { data, error } = await query.select('id');
  if (error) {
    console.error('omni-video: persist claim error:', error.message);
    return false;
  }
  return ((data ?? []) as { id: string }[]).length > 0;
}
