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
  'https://fortunwishnet.vercel.app', // Vercel production domain
];

function getAllowedOrigins(): string[] {
  // Union, not override: the ALLOWED_ORIGINS secret ADDS origins on top of
  // the defaults. The old override semantics silently dropped any default
  // missing from the secret (the port-8000 outage was exactly that footgun).
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  const fromEnv = envOrigins ? envOrigins.split(',').map(o => o.trim()).filter(Boolean) : [];
  return [...new Set([...fromEnv, ...DEFAULT_ORIGINS])];
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
    // Superset of headers the supabase-js client may send (SEC-01: covers the
    // functions previously using a wildcard with extended Allow-Headers).
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-request-id',
    'Vary': 'Origin',
  };
}
