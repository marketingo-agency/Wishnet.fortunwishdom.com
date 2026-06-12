/**
 * Shared client for the content-library edge function.
 * Same calling convention as callOmni: bearer auth header + action body.
 */

import { CONTENT_LIBRARY_ENDPOINT } from '@/config/api';
import { getAuthHeaders } from '@/lib/apiHelpers';

export async function callContentLibrary<T = unknown>(
  action: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(CONTENT_LIBRARY_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...body }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((data as { error?: string }).error || `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}
