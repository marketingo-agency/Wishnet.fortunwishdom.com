/**
 * File URL Utilities
 * Helper functions for generating file URLs
 */

import { supabase } from '@/integrations/supabase/client';

export function getFileUrl(storagePath: string) {
  const { data } = supabase.storage.from('files').getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Generate a secure URL for opening files in a new window via the serve-file Edge Function.
 * This ensures authentication and ownership checks before serving the file.
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

// Brain documents bucket URL helper
export function getBrainDocumentUrl(storagePath: string) {
  const { data } = supabase.storage.from('brain-documents').getPublicUrl(storagePath);
  return data.publicUrl;
}
