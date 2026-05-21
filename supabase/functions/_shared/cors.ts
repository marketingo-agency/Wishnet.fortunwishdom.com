/**
 * Shared CORS configuration for edge functions.
 * SEC-003: tightened from wildcard `*` to specific allowed origins.
 *
 * Set ALLOWED_ORIGINS env var to a comma-separated list of origins.
 * Defaults to localhost for dev + the production domain.
 */

const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8000', // LOCKED_PORT for this project (see CLAUDE.md Runtime Config)
  'http://localhost:8080',
  'https://wishnet.fortunwishdom.com',
];

function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim()).filter(Boolean);
  }
  return DEFAULT_ORIGINS;
}

/**
 * Build CORS headers for a given request origin.
 * Returns the origin if it's in the allowlist, otherwise returns the
 * first allowed origin (prevents open redirect but still works).
 */
export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const allowed = getAllowedOrigins();
  const origin = requestOrigin && allowed.includes(requestOrigin)
    ? requestOrigin
    : allowed[0];

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}
