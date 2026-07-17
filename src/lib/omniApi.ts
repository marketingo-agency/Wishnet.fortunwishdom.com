/**
 * Shared client for the omni edge function.
 * Keeps every Omni hook calling the backend the same way (auth header + action body).
 */

import { OMNI_API_ENDPOINT, OMNI_VIDEO_API_ENDPOINT } from '@/config/api';
import { getAuthHeaders } from '@/lib/apiHelpers';

export async function callOmni<T = unknown>(
  action: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(OMNI_API_ENDPOINT, {
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

/** Same contract against the omni-video function (Videos track, Plan 2). */
export async function callOmniVideo<T = unknown>(
  action: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(OMNI_VIDEO_API_ENDPOINT, {
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
