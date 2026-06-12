/**
 * Generic fal.ai invocation runner for Omni.
 *
 * One transport for ANY catalog model through the fal queue REST API:
 *   submit:  POST https://queue.fal.run/{modelId}            (full path incl. subpath)
 *   status:  GET  https://queue.fal.run/{appId}/requests/{requestId}/status
 *   result:  GET  https://queue.fal.run/{appId}/requests/{requestId}
 * where appId is the first two segments of the model id (queue routes drop subpaths).
 * URLs are reconstructed server-side from validated ids (never taken from the
 * client) so the edge function cannot be steered to arbitrary hosts.
 *
 * Errors are normalized into FalUserError messages that are safe to surface;
 * an unsupported input schema fails loudly with the model's validation detail,
 * never as a silent empty success.
 */

const QUEUE_BASE = 'https://queue.fal.run';
const FETCH_TIMEOUT_MS = 30_000;

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

/**
 * Queue request URLs (status/result) live under the BASE app id (owner/alias);
 * model subpaths are dropped. Verified empirically 2026-06-12: for the model
 * fal-ai/flux/schnell, GET queue.fal.run/fal-ai/flux/requests/{id}/status is
 * routed (401 with a bogus key) while the full nested path returns 405.
 * Submission keeps the full model path.
 */
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
      // Internal detail stays in logs; the caller surfaces a generic error.
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
  if (typeof data.request_id !== 'string') {
    throw new Error('fal submit returned no request_id');
  }
  return {
    requestId: data.request_id,
    queuePosition: typeof data.queue_position === 'number' ? data.queue_position : null,
  };
}

export type FalJobStatus = 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED';

export interface FalStatusResult {
  status: FalJobStatus;
  queuePosition: number | null;
}

export async function falStatus(
  falKey: string,
  modelId: string,
  requestId: string,
): Promise<FalStatusResult> {
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
  return {
    status,
    queuePosition: typeof data.queue_position === 'number' ? data.queue_position : null,
  };
}

export interface NormalizedFalImage {
  url: string;
  width: number | null;
  height: number | null;
  contentType: string | null;
}

export interface NormalizedFalResult {
  images: NormalizedFalImage[];
  seed: number | null;
  raw: unknown;
}

interface RawFalFile {
  url?: string;
  width?: number;
  height?: number;
  content_type?: string;
}

/**
 * Normalize a completed job's output into image records.
 * Covers the two shapes fal image models use: `images: File[]` and `image: File`.
 * A completed job with no recognizable image output fails loudly: that means
 * the model's output schema is not image-based (acceptance criterion: never a
 * silent empty success).
 */
export function normalizeFalOutput(raw: unknown): NormalizedFalResult {
  const out = (raw ?? {}) as Record<string, unknown>;
  const collected: NormalizedFalImage[] = [];

  const push = (f: RawFalFile | null | undefined) => {
    if (f && typeof f.url === 'string' && f.url.length > 0) {
      collected.push({
        url: f.url,
        width: typeof f.width === 'number' ? f.width : null,
        height: typeof f.height === 'number' ? f.height : null,
        contentType: typeof f.content_type === 'string' ? f.content_type : null,
      });
    }
  };

  if (Array.isArray(out.images)) (out.images as RawFalFile[]).forEach(push);
  push(out.image as RawFalFile | undefined);

  if (collected.length === 0) {
    throw new FalUserError(
      'The model completed but returned no image output. Its output schema may not be image-based; pick an image model from the catalog.',
    );
  }

  return {
    images: collected,
    seed: typeof out.seed === 'number' ? out.seed : null,
    raw,
  };
}

export async function falResult(
  falKey: string,
  modelId: string,
  requestId: string,
): Promise<NormalizedFalResult> {
  assertValidModelId(modelId);
  assertValidRequestId(requestId);

  const res = await fetch(`${QUEUE_BASE}/${queueAppId(modelId)}/requests/${requestId}`, {
    headers: { Authorization: `Key ${falKey}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) throw await mapFalError(res, modelId);

  const data = await res.json();
  return normalizeFalOutput(data);
}
