/**
 * Shared client for the pulse-api edge function.
 * Keeps every Pulse hook calling the proxy the same way (auth header + action body).
 */

import { PULSE_API_ENDPOINT } from '@/config/api';
import { getAuthHeaders } from '@/lib/apiHelpers';

export async function callPulseApi<T = unknown>(
  action: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(PULSE_API_ENDPOINT, {
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
