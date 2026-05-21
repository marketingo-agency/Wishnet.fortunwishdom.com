/**
 * pulse-api Edge Function
 *
 * Secure server-side proxy for upload-post.com API calls.
 * The raw API key never leaves this function — it's read from the DB
 * (upload_post_api_key column on llm_settings) or from the env var
 * UPLOAD_POST_API_KEY as fallback.
 *
 * Actions:
 *   - test-connection   → GET /uploadposts/me (validates key, returns plan info)
 *   - list-accounts     → GET /uploadposts/users (connected social profiles)
 *   - get-usage         → GET /uploadposts/me (plan + quota from /me response)
 *   - get-queue-settings → GET /uploadposts/queue/settings
 *   - update-queue-settings → POST /uploadposts/queue/settings
 *   - get-platforms     → GET platform-specific pages (facebook, linkedin, pinterest)
 *
 * Security:
 *   - Auth via Bearer token → getUser
 *   - Admin gate via is_admin RPC
 *   - Rate limited: 30 req/min per user
 *   - Key never in responses or logs
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rate-limit.ts';

const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });
const UPLOAD_POST_BASE = 'https://api.upload-post.com/api';

let corsHeaders: Record<string, string> = getCorsHeaders(null);

async function getApiKey(supabaseAdmin: ReturnType<typeof createClient>): Promise<string | null> {
  // Try DB first
  const { data } = await supabaseAdmin
    .from('llm_settings')
    .select('upload_post_api_key')
    .single();

  const dbKey = data?.upload_post_api_key;
  if (typeof dbKey === 'string' && dbKey.trim().length > 0) return dbKey.trim();

  // Fallback to env
  const envKey = Deno.env.get('UPLOAD_POST_API_KEY') ?? '';
  return envKey.length > 0 ? envKey : null;
}

async function callUploadPost(
  apiKey: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  const url = `${UPLOAD_POST_BASE}${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Apikey ${apiKey}`,
    'Accept': 'application/json',
  };
  const init: RequestInit = { method, headers };

  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  return fetch(url, init);
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}

Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // ── Auth ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401);
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return errorResponse('Unauthorized', 401);

    // ── Rate limit ────────────────────────────────────────────────────
    if (rateLimiter.check(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } },
      );
    }

    // ── Admin gate ────────────────────────────────────────────────────
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: isAdmin, error: adminErr } = await supabaseAdmin.rpc('is_admin', { _user_id: user.id });
    if (adminErr || !isAdmin) return errorResponse('Admin access required', 403);

    // ── Resolve API key ───────────────────────────────────────────────
    const apiKey = await getApiKey(supabaseAdmin);

    const body = await req.json().catch(() => ({}));
    const { action } = body as { action?: string };

    // ── test-connection ───────────────────────────────────────────────
    if (action === 'test-connection') {
      if (!apiKey) return jsonResponse({ connected: false, error: 'API key not configured' });

      const resp = await callUploadPost(apiKey, 'GET', '/uploadposts/me');
      if (!resp.ok) {
        return jsonResponse({ connected: false, error: `API returned ${resp.status}` });
      }
      const data = await resp.json();
      return jsonResponse({
        connected: true,
        email: data.email ?? null,
        plan: data.plan ?? null,
        subscriptionStatus: data.subscription_status ?? null,
      });
    }

    // All remaining actions require a configured key
    if (!apiKey) return errorResponse('Pulse API key not configured', 400);

    // ── list-accounts ─────────────────────────────────────────────────
    if (action === 'list-accounts') {
      const resp = await callUploadPost(apiKey, 'GET', '/uploadposts/users');
      if (!resp.ok) return errorResponse(`Failed to fetch accounts (${resp.status})`, 502);
      const data = await resp.json();
      return jsonResponse(data);
    }

    // ── get-queue-settings ────────────────────────────────────────────
    if (action === 'get-queue-settings') {
      const resp = await callUploadPost(apiKey, 'GET', '/uploadposts/queue/settings');
      if (!resp.ok) return errorResponse(`Failed to fetch queue settings (${resp.status})`, 502);
      const data = await resp.json();
      return jsonResponse(data);
    }

    // ── update-queue-settings ─────────────────────────────────────────
    if (action === 'update-queue-settings') {
      const { slots, days, timezone } = body as { slots?: number; days?: number[]; timezone?: string };
      const resp = await callUploadPost(apiKey, 'POST', '/uploadposts/queue/settings', { slots, days, timezone });
      if (!resp.ok) return errorResponse(`Failed to update queue settings (${resp.status})`, 502);
      const data = await resp.json();
      return jsonResponse(data);
    }

    // ── get-platforms (facebook pages, linkedin orgs, pinterest boards) ─
    if (action === 'get-platforms') {
      const results: Record<string, unknown> = {};
      const endpoints = [
        { key: 'facebook', path: '/uploadposts/facebook/pages' },
        { key: 'linkedin', path: '/uploadposts/linkedin/pages' },
        { key: 'pinterest', path: '/uploadposts/pinterest/boards' },
      ];
      for (const ep of endpoints) {
        try {
          const resp = await callUploadPost(apiKey, 'GET', ep.path);
          if (resp.ok) results[ep.key] = await resp.json();
        } catch {
          // Skip failed platform fetches
        }
      }
      return jsonResponse(results);
    }

    // ── set-webhook ───────────────────────────────────────────────────
    if (action === 'set-webhook') {
      const { webhook_url } = body as { webhook_url?: string };
      if (!webhook_url) return errorResponse('webhook_url is required', 400);
      const resp = await callUploadPost(apiKey, 'POST', '/uploadposts/users/notifications', { webhook_url });
      if (!resp.ok) return errorResponse(`Failed to set webhook (${resp.status})`, 502);
      const data = await resp.json();
      return jsonResponse(data);
    }

    return errorResponse('Invalid action', 400);
  } catch (error) {
    console.error('pulse-api error:', error);
    return errorResponse('Internal error', 500);
  }
});
