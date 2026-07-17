/**
 * Shared fal.ai helper — the SINGLE image/video engine for every agent.
 *
 * Derived from Omni's proven transport (omni/fal-runner.ts + omni/storage.ts), promoted to
 * _shared so osha-chat / pixel-chat / wishpedia-generate / whisper-api all route generation
 * through one code path instead of hand-rolling OpenAI/Gemini image calls. Omni keeps its own
 * copy (it is the reference, left untouched to avoid regressing the live pipeline).
 *
 * Transport uses the fal QUEUE REST API:
 *   submit:  POST https://queue.fal.run/{modelId}            (full path incl. subpath)
 *   status:  GET  https://queue.fal.run/{appId}/requests/{requestId}/status
 *   result:  GET  https://queue.fal.run/{appId}/requests/{requestId}
 * where appId is the first two segments of the model id (queue routes drop subpaths).
 * URLs are reconstructed server-side from validated ids (never taken from the client).
 *
 * High-level helpers (generateImageViaFal / generateVideoViaFal) submit + poll-to-completion
 * inside the request and return normalized output. persistFalMedia stores the result in a
 * PRIVATE bucket served via signed URLs (the bucket 403s on public URLs).
 */

import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';

type AdminClient = ReturnType<typeof createClient>;

const QUEUE_BASE = 'https://queue.fal.run';
const FETCH_TIMEOUT_MS = 30_000;
const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

/** The edit-capable model used to recreate a subject from reference image(s) (image-to-image). */
export const DEFAULT_FAL_EDIT_MODEL = 'fal-ai/nano-banana-pro/edit';

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  // Audios track (Plan 3 D-A8): without these, audio persisted as .png.
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
};

/** Errors whose message is safe to show to the end user. */
export class FalUserError extends Error {}

const MODEL_ID_RE = /^[a-z0-9][a-z0-9_.-]*(\/[a-z0-9][a-z0-9_.-]*)+$/i;
const REQUEST_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;

export function assertValidModelId(modelId: unknown): asserts modelId is string {
  if (typeof modelId !== 'string' || modelId.length > 200 || !MODEL_ID_RE.test(modelId)) {
    throw new FalUserError('Invalid fal model id.');
  }
}

export function assertValidRequestId(requestId: unknown): asserts requestId is string {
  if (typeof requestId !== 'string' || !REQUEST_ID_RE.test(requestId)) {
    throw new FalUserError('Invalid fal request id.');
  }
}

/** Queue status/result URLs live under the BASE app id (first two segments); subpaths are dropped. */
function queueAppId(modelId: string): string {
  return modelId.split('/').slice(0, 2).join('/');
}

interface FalValidationIssue {
  loc?: (string | number)[];
  msg?: string;
}

async function mapFalError(res: Response, modelId: string): Promise<FalUserError | Error> {
  const bodyText = await res.text().catch(() => '');
  let detail = '';
  try {
    const body = JSON.parse(bodyText);
    if (Array.isArray(body.detail)) {
      detail = (body.detail as FalValidationIssue[])
        .map((d) => `${(d.loc ?? []).filter((p) => p !== 'body').join('.')}: ${d.msg ?? 'invalid'}`)
        .join('; ');
    } else if (typeof body.detail === 'string') {
      detail = body.detail;
    } else if (typeof body.message === 'string') {
      detail = body.message;
    }
  } catch {
    // non-JSON error body; keep status-based message
  }

  switch (res.status) {
    case 401:
    case 403:
      return new FalUserError('fal.ai rejected the configured API key. Check the fal.ai key in Settings > LLM Providers.');
    case 404:
      return new FalUserError(`Model "${modelId}" was not found on fal.ai.`);
    case 422:
      return new FalUserError(
        `This model rejected the input${detail ? `: ${detail}` : '. Its input schema differs from the request that was sent.'}`,
      );
    case 429:
      return new FalUserError('fal.ai rate limit reached. Please try again in a moment.');
    default:
      return new Error(`fal request failed (${res.status}): ${bodyText.slice(0, 300)}`);
  }
}

export interface FalSubmission {
  requestId: string;
  queuePosition: number | null;
}

export async function falSubmit(
  falKey: string,
  modelId: string,
  input: Record<string, unknown>,
): Promise<FalSubmission> {
  assertValidModelId(modelId);
  const res = await fetch(`${QUEUE_BASE}/${modelId}`, {
    method: 'POST',
    headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw await mapFalError(res, modelId);
  const data = await res.json();
  if (typeof data.request_id !== 'string') throw new Error('fal submit returned no request_id');
  return {
    requestId: data.request_id,
    queuePosition: typeof data.queue_position === 'number' ? data.queue_position : null,
  };
}

export type FalJobStatus = 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED';

export async function falStatus(falKey: string, modelId: string, requestId: string): Promise<FalJobStatus> {
  assertValidModelId(modelId);
  assertValidRequestId(requestId);
  const res = await fetch(`${QUEUE_BASE}/${queueAppId(modelId)}/requests/${requestId}/status`, {
    headers: { Authorization: `Key ${falKey}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw await mapFalError(res, modelId);
  const data = await res.json();
  const status = data.status as FalJobStatus;
  if (status !== 'IN_QUEUE' && status !== 'IN_PROGRESS' && status !== 'COMPLETED') {
    throw new Error(`Unexpected fal status: ${String(data.status)}`);
  }
  return status;
}

/** Raw completed-job payload (caller normalizes per media type). */
export async function falResultRaw(falKey: string, modelId: string, requestId: string): Promise<unknown> {
  assertValidModelId(modelId);
  assertValidRequestId(requestId);
  const res = await fetch(`${QUEUE_BASE}/${queueAppId(modelId)}/requests/${requestId}`, {
    headers: { Authorization: `Key ${falKey}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw await mapFalError(res, modelId);
  return res.json();
}

export interface NormalizedFalMedia {
  url: string;
  width: number | null;
  height: number | null;
  contentType: string | null;
}

interface RawFalFile {
  url?: string;
  width?: number;
  height?: number;
  content_type?: string;
}

function toMedia(f: RawFalFile | null | undefined): NormalizedFalMedia | null {
  if (f && typeof f.url === 'string' && f.url.length > 0) {
    return {
      url: f.url,
      width: typeof f.width === 'number' ? f.width : null,
      height: typeof f.height === 'number' ? f.height : null,
      contentType: typeof f.content_type === 'string' ? f.content_type : null,
    };
  }
  return null;
}

/** Covers the two fal image shapes: `images: File[]` and `image: File`. Fails loudly on neither. */
export function normalizeFalImageOutput(raw: unknown): NormalizedFalMedia {
  const out = (raw ?? {}) as Record<string, unknown>;
  const collected: NormalizedFalMedia[] = [];
  if (Array.isArray(out.images)) (out.images as RawFalFile[]).forEach((f) => { const m = toMedia(f); if (m) collected.push(m); });
  const single = toMedia(out.image as RawFalFile | undefined);
  if (single) collected.push(single);
  if (collected.length === 0) {
    throw new FalUserError('The model completed but returned no image output. Pick an image model from the catalog.');
  }
  return collected[0];
}

/** Covers the fal video shapes: `video: File` and `videos: File[]`. */
export function normalizeFalVideoOutput(raw: unknown): NormalizedFalMedia {
  const out = (raw ?? {}) as Record<string, unknown>;
  const single = toMedia(out.video as RawFalFile | undefined);
  if (single) return single;
  if (Array.isArray(out.videos)) {
    for (const f of out.videos as RawFalFile[]) { const m = toMedia(f); if (m) return m; }
  }
  throw new FalUserError('The model completed but returned no video output. Pick a video model from the catalog.');
}

/** Poll status until COMPLETED, then return the raw result. Throws on timeout. */
async function pollUntilComplete(
  falKey: string,
  modelId: string,
  requestId: string,
  maxAttempts: number,
  intervalMs: number,
): Promise<unknown> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const status = await falStatus(falKey, modelId, requestId);
    if (status === 'COMPLETED') return falResultRaw(falKey, modelId, requestId);
  }
  throw new FalUserError('fal.ai generation timed out. The model may be under heavy load — please try again.');
}

/** Resolve the fal.ai key: DB column first, env secret fallback (Batch Task 6 pattern). */
export async function resolveFalKey(supabaseAdmin: AdminClient): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from('llm_settings').select('fal_api_key').single();
  if (error) console.error('fal: llm_settings read error:', error.message);
  const key = ((data?.fal_api_key as string | null) || Deno.env.get('FAL_KEY') || '').trim();
  return key.length > 0 ? key : null;
}

export interface GenerateImageOptions {
  falKey: string;
  modelId: string;
  prompt: string;
  /** Image-to-image / recreation sources (already URLs fal can fetch). */
  imageUrls?: string[];
  aspectRatio?: string;
  numImages?: number;
  maxWaitMs?: number;
}

/**
 * Submit an image job and poll to completion. Applies the i2i shaping rule
 * (upscalers take image_url singular + drop num_images; edit families take image_urls array).
 */
export async function generateImageViaFal(opts: GenerateImageOptions): Promise<NormalizedFalMedia> {
  const { falKey, modelId, prompt, imageUrls, aspectRatio, numImages, maxWaitMs = 120_000 } = opts;
  assertValidModelId(modelId);

  const input: Record<string, unknown> = { num_images: numImages ?? 1, prompt };
  if (imageUrls && imageUrls.length > 0) {
    const isUpscaler = /(\/|-)upscal/i.test(modelId);
    if (isUpscaler) {
      input.image_url = imageUrls[0];
      delete input.num_images;
    } else {
      input.image_urls = imageUrls;
    }
    if (aspectRatio && /^\d{1,2}:\d{1,2}$/.test(aspectRatio)) input.aspect_ratio = aspectRatio;
  }

  const submission = await falSubmit(falKey, modelId, input);
  const raw = await pollUntilComplete(falKey, modelId, submission.requestId, Math.ceil(maxWaitMs / 2000), 2000);
  return normalizeFalImageOutput(raw);
}

export interface GenerateVideoOptions {
  falKey: string;
  modelId: string;
  prompt: string;
  imageUrls?: string[];
  aspectRatio?: string;
  maxWaitMs?: number;
}

/** Submit a video job and poll to completion. */
export async function generateVideoViaFal(opts: GenerateVideoOptions): Promise<NormalizedFalMedia> {
  const { falKey, modelId, prompt, imageUrls, aspectRatio, maxWaitMs = 300_000 } = opts;
  assertValidModelId(modelId);

  const input: Record<string, unknown> = { prompt };
  if (imageUrls && imageUrls.length > 0) input.image_urls = imageUrls;
  if (aspectRatio && /^\d{1,2}:\d{1,2}$/.test(aspectRatio)) input.aspect_ratio = aspectRatio;

  const submission = await falSubmit(falKey, modelId, input);
  const raw = await pollUntilComplete(falKey, modelId, submission.requestId, Math.ceil(maxWaitMs / 5000), 5000);
  return normalizeFalVideoOutput(raw);
}

export interface PersistedMedia {
  storagePath: string;
  mimeType: string;
  byteSize: number;
}

/**
 * Download a fal CDN file (host-validated, size-capped) into a PRIVATE bucket.
 * `basePath` is the storage path WITHOUT extension; the extension is derived from the mime type.
 */
export async function persistFalMedia(
  supabaseAdmin: AdminClient,
  opts: { bucket?: string; basePath: string; falUrl: string; contentType: string | null; maxBytes?: number },
): Promise<PersistedMedia> {
  const { bucket = 'files', basePath, falUrl, contentType, maxBytes = MAX_DOWNLOAD_BYTES } = opts;
  const host = new URL(falUrl).hostname;
  if (host !== 'fal.media' && !host.endsWith('.fal.media')) {
    throw new Error(`Unexpected fal media host: ${host}`);
  }

  const res = await fetch(falUrl, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`fal media download failed (${res.status})`);

  const declaredLength = Number(res.headers.get('content-length') || '0');
  if (declaredLength > maxBytes) throw new Error('Generated media exceeds the size cap');

  const buf = await res.arrayBuffer();
  if (buf.byteLength > maxBytes) throw new Error('Generated media exceeds the size cap');

  const mimeType = contentType || res.headers.get('content-type') || 'image/png';
  const ext = EXT_BY_MIME[mimeType] ?? 'png';
  const storagePath = `${basePath}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, buf, { contentType: mimeType, upsert: true });
  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  return { storagePath, mimeType, byteSize: buf.byteLength };
}

/** Mint a signed URL for a private-bucket path. Never getPublicUrl. */
export async function signStoragePath(
  supabaseAdmin: AdminClient,
  storagePath: string,
  bucket = 'files',
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(storagePath, ttlSeconds);
  if (error) {
    console.error('fal: signed URL error:', error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Turn raw image bytes (a user attachment or a retrieved Brain image) into a URL fal can fetch,
 * for image-to-image. Uploads to a short-lived temp path in the private bucket and signs it.
 * (Signed URLs are time-limited public links, so fal.ai can fetch them.)
 */
export async function uploadTempImageForFal(
  supabaseAdmin: AdminClient,
  userId: string,
  bytes: Uint8Array,
  mimeType: string,
  tag: string,
): Promise<string | null> {
  if (bytes.byteLength > MAX_DOWNLOAD_BYTES) throw new Error('Reference image exceeds the size cap');
  const ext = EXT_BY_MIME[mimeType] ?? 'png';
  // Deterministic-ish unique path from tag (callers pass an id/index — no Math.random in edge runtime).
  const safeTag = tag.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'ref';
  const storagePath = `${userId}/fal-temp/${safeTag}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from('files')
    .upload(storagePath, bytes, { contentType: mimeType, upsert: true });
  if (error) {
    console.error('fal: temp image upload error:', error.message);
    return null;
  }
  return signStoragePath(supabaseAdmin, storagePath, 'files', 60 * 60);
}
