/**
 * settings-keys Edge Function
 *
 * Secure write path for provider API keys stored on llm_settings.
 * Reuses the same pattern that will be extended to fal.ai (Task 10) and pulse (Task 9).
 *
 * Actions:
 *   - update-key  { provider, key }   → writes the key to the admin-only llm_settings row
 *   - reset-key   { provider }        → NULLs the column, reverting to the Deno.env secret
 *   - check-keys  { }                 → returns { openai, gemini, fal } as 'db' | 'env' | 'none'
 *
 * Security properties:
 *   1. Caller must pass a valid Bearer token (verified via auth.getUser).
 *   2. Caller must be an admin (public.is_admin RPC, same pattern as update-bucket-settings).
 *   3. Writes use the service-role client — bypasses RLS but the admin gate already enforced access.
 *   4. Responses NEVER contain the key value. update-key returns { success: true }; check-keys returns
 *      source classifications only ('db' | 'env' | 'none'), never plaintext.
 *   5. Rate-limited to 15 req/min per user to prevent abuse of the write path.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rate-limit.ts';

const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 15 });

let corsHeaders: Record<string, string> = getCorsHeaders(null);

type Provider = 'openai' | 'gemini' | 'fal' | 'pulse';
type KeySource = 'db' | 'env' | 'none';

const PROVIDER_COLUMN: Record<Provider, string> = {
  openai: 'openai_api_key',
  gemini: 'gemini_api_key',
  fal:    'fal_api_key',
  pulse:  'upload_post_api_key',
};

const PROVIDER_ENV_VAR: Record<Provider, string> = {
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  fal:    'FAL_KEY',
  pulse:  'UPLOAD_POST_API_KEY',
};

function isValidProvider(p: unknown): p is Provider {
  return p === 'openai' || p === 'gemini' || p === 'fal' || p === 'pulse';
}

function classifyKey(dbValue: string | null | undefined, envVarName: string): KeySource {
  if (typeof dbValue === 'string' && dbValue.trim().length > 0) return 'db';
  if ((Deno.env.get(envVarName) ?? '').length > 0) return 'env';
  return 'none';
}

Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // ── Auth ───────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = user.id;

    // ── Rate limit ─────────────────────────────────────────────────────────
    if (rateLimiter.check(userId)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }

    // ── Admin gate (service-role client used for both the RPC and the write) ─
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: isAdmin, error: adminErr } = await supabaseAdmin.rpc('is_admin', { _user_id: userId });
    if (adminErr || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action, provider, key } = body as { action?: string; provider?: unknown; key?: unknown };

    // ── check-keys (enriched source classification) ───────────────────────
    if (action === 'check-keys') {
      const { data: settings, error: readErr } = await supabaseAdmin
        .from('llm_settings')
        .select('openai_api_key, gemini_api_key, fal_api_key, upload_post_api_key')
        .single();

      if (readErr) {
        console.error('settings-keys check-keys read error:', readErr);
        return new Response(
          JSON.stringify({ error: 'Failed to read key status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          openai: classifyKey(settings?.openai_api_key, PROVIDER_ENV_VAR.openai),
          gemini: classifyKey(settings?.gemini_api_key, PROVIDER_ENV_VAR.gemini),
          fal:    classifyKey(settings?.fal_api_key,    PROVIDER_ENV_VAR.fal),
          pulse:  classifyKey(settings?.upload_post_api_key, PROVIDER_ENV_VAR.pulse),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── update-key / reset-key: shared provider validation ───────────────
    if (!isValidProvider(provider)) {
      return new Response(
        JSON.stringify({ error: 'Invalid provider. Must be openai, gemini, fal, or pulse.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const column = PROVIDER_COLUMN[provider];

    if (action === 'update-key') {
      if (typeof key !== 'string' || key.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'key must be a non-empty string' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Basic sanity check — reject obviously wrong tokens without logging the value.
      if (key.length > 4096) {
        return new Response(
          JSON.stringify({ error: 'key value is too long' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateErr } = await supabaseAdmin
        .from('llm_settings')
        .update({ [column]: key.trim(), updated_at: new Date().toISOString() })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // match every row (single-row table)

      if (updateErr) {
        console.error(`settings-keys update-key error (provider=${provider}):`, updateErr);
        return new Response(
          JSON.stringify({ error: 'Failed to save key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reset-key') {
      const { error: updateErr } = await supabaseAdmin
        .from('llm_settings')
        .update({ [column]: null, updated_at: new Date().toISOString() })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (updateErr) {
        console.error(`settings-keys reset-key error (provider=${provider}):`, updateErr);
        return new Response(
          JSON.stringify({ error: 'Failed to reset key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('settings-keys error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
