/**
 * Omni storage persistence: download generated media from fal and keep it in
 * the PRIVATE `files` bucket, served exclusively through signed URLs
 * (the bucket 403s on public URLs; see the Pixel BUGFIX precedent).
 * Files-Manager registration mirrors Pixel's "Pixel AI" sector pattern
 * with an "Omni AI" sector.
 */

import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';

type AdminClient = ReturnType<typeof createClient>;

const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export interface PersistedImage {
  storagePath: string;
  mimeType: string;
  byteSize: number;
}

/** Download a fal CDN image (host-validated, size-capped) into the files bucket. */
export async function persistFalImage(
  supabaseAdmin: AdminClient,
  userId: string,
  runId: string,
  assetId: string,
  falUrl: string,
  contentType: string | null,
): Promise<PersistedImage> {
  const host = new URL(falUrl).hostname;
  if (host !== 'fal.media' && !host.endsWith('.fal.media')) {
    throw new Error(`Unexpected fal image host: ${host}`);
  }

  const res = await fetch(falUrl, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`fal image download failed (${res.status})`);

  const declaredLength = Number(res.headers.get('content-length') || '0');
  if (declaredLength > MAX_DOWNLOAD_BYTES) throw new Error('Generated image exceeds the 20MB cap');

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_DOWNLOAD_BYTES) throw new Error('Generated image exceeds the 20MB cap');

  const mimeType = contentType || res.headers.get('content-type') || 'image/png';
  const ext = EXT_BY_MIME[mimeType] ?? 'png';
  const storagePath = `${userId}/omni-images/${runId}/${assetId}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('files')
    .upload(storagePath, buf, { contentType: mimeType, upsert: true });
  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  return { storagePath, mimeType, byteSize: buf.byteLength };
}

/** Upload a client-produced blob (repurposed variant) into the files bucket. */
export async function persistUploadedImage(
  supabaseAdmin: AdminClient,
  userId: string,
  runId: string,
  assetId: string,
  bytes: Uint8Array,
  mimeType: string,
): Promise<PersistedImage> {
  if (bytes.byteLength > MAX_DOWNLOAD_BYTES) throw new Error('Image exceeds the 20MB cap');
  const ext = EXT_BY_MIME[mimeType] ?? 'png';
  const storagePath = `${userId}/omni-images/${runId}/${assetId}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('files')
    .upload(storagePath, bytes, { contentType: mimeType, upsert: true });
  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  return { storagePath, mimeType, byteSize: bytes.byteLength };
}

/**
 * Mint a signed URL for a private files-bucket path. Never getPublicUrl.
 *
 * ownerId is REQUIRED (security-auditor M1): the service-role client bypasses
 * the bucket's owner-scoped RLS, and omni_assets RLS validates only user_id -
 * a caller could bind a self-owned asset row to ANOTHER user's private path.
 * Signing is therefore confined to the caller's own `${ownerId}/` namespace;
 * cross-user admin signing lives exclusively in content-library's admin-gated
 * library-asset-urls action.
 */
export async function signStoragePath(
  supabaseAdmin: AdminClient,
  storagePath: string,
  ownerId: string,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  if (!storagePath.startsWith(`${ownerId}/`)) {
    console.error('Omni: refused to sign a storage path outside the caller namespace');
    return null;
  }
  const { data, error } = await supabaseAdmin.storage
    .from('files')
    .createSignedUrl(storagePath, ttlSeconds);
  if (error) {
    console.error('Omni: signed URL error:', error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

/** Get or create the caller's "Omni AI" sector (Pixel AI pattern, cyan accent). */
export async function ensureOmniSector(supabaseAdmin: AdminClient, userId: string): Promise<string | null> {
  const { data: sectors } = await supabaseAdmin
    .from('sectors')
    .select('id, name')
    .eq('user_id', userId);
  const existing = (sectors as { id: string; name: string }[] | null)?.find((s) => s.name === 'Omni AI');
  if (existing) return existing.id;

  const { data: created, error } = await supabaseAdmin
    .from('sectors')
    .insert({ user_id: userId, name: 'Omni AI', color: '#06B6D4' })
    .select()
    .single();
  if (error) {
    console.error('Omni: sector create error:', error.message);
    return null;
  }
  return (created as { id: string } | null)?.id ?? null;
}

/** Register a persisted asset in the Files Manager under the Omni AI sector. */
export async function registerInFilesManager(
  supabaseAdmin: AdminClient,
  userId: string,
  fileName: string,
  persisted: PersistedImage,
): Promise<boolean> {
  const sectorId = await ensureOmniSector(supabaseAdmin, userId);
  const { error } = await supabaseAdmin.from('files').insert({
    user_id: userId,
    name: fileName,
    original_name: fileName,
    storage_path: persisted.storagePath,
    mime_type: persisted.mimeType,
    size: persisted.byteSize,
    sector_id: sectorId,
  });
  if (error) {
    console.error('Omni: files row insert error:', error.message);
    return false;
  }
  return true;
}
