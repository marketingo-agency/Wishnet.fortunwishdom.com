/**
 * File URL Utilities
 * Helper functions for generating file URLs
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * @deprecated SEC-019: The files bucket is now private. Public URLs will return 403.
 * Use getSignedFileUrl() for async contexts or getSecureFileUrl() for edge-function-based access.
 * Kept temporarily for backward compatibility during migration.
 */
export function getFileUrl(storagePath: string) {
  const { data } = supabase.storage.from('files').getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * SEC-019: Get a time-limited signed URL for a private file in the files bucket.
 * Valid for 1 hour by default. Use this for image previews, thumbnails, etc.
 */
export async function getSignedFileUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('files')
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) {
    console.error('Failed to create signed URL:', error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Generate a secure URL for opening files in a new window via the serve-file Edge Function.
 * Uses query-string token as fallback for window.open / iframe contexts where
 * Authorization headers cannot be sent. Prefer fetchSecureFile() for fetch-based access.
 */
export function getSecureFileUrl(
  bucket: string,
  storagePath: string,
  fileName: string,
  token: string
): string {
  const baseUrl = 'https://zlmideilxfnokemzkavm.supabase.co/functions/v1/serve-file';
  const params = new URLSearchParams({
    bucket,
    path: storagePath,
    filename: fileName,
    token,
  });
  return `${baseUrl}?${params.toString()}`;
}

/**
 * SEC-011: Fetch a file from the serve-file Edge Function using the Authorization header
 * instead of a query-string token. Prevents token leakage in server logs and referrers.
 * Use this for programmatic access (downloads, previews via blob URLs).
 */
export async function fetchSecureFile(
  bucket: string,
  storagePath: string,
  fileName: string,
  token: string
): Promise<Blob> {
  const baseUrl = 'https://zlmideilxfnokemzkavm.supabase.co/functions/v1/serve-file';
  const params = new URLSearchParams({
    bucket,
    path: storagePath,
    filename: fileName,
  });
  const res = await fetch(`${baseUrl}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || `Failed to fetch file (${res.status})`);
  }
  return res.blob();
}

// Brain documents bucket URL helper
export function getBrainDocumentUrl(storagePath: string) {
  const { data } = supabase.storage.from('brain-documents').getPublicUrl(storagePath);
  return data.publicUrl;
}
