/**
 * Omni edge function: backend for the Omni Multimodal Creation AI.
 *
 * Phase 0 skeleton: auth + rate limit + action dispatch with settings actions.
 * Later phases add: fal catalog + runner, wizard run engine, vision analysis,
 * social descriptions, repurposing, surprise-me, brainstorming.
 *
 * Security baseline (per OMNI_SPEC.md):
 * - Bearer auth + getUser validation on every request
 * - Per-user rate limit 30/min (client polling in later phases needs headroom)
 * - Service-role client for DB work, scoped manually by user_id
 * - sanitizeForPrompt on all retrieved content before prompt interpolation
 * - Signed URLs only for private-bucket outputs, never getPublicUrl
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { sanitizeForPrompt } from '../_shared/sanitize.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rate-limit.ts';

const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });

let corsHeaders: Record<string, string> = getCorsHeaders(null);

// ── Settings ─────────────────────────────────────────────────────────────────

interface OmniSettingsInput {
  analysis_provider?: string;
  analysis_model?: string | null;
  default_variants?: number;
  defaults?: Record<string, unknown>;
}

const ANALYSIS_PROVIDERS = new Set(['openai', 'gemini']);

/**
 * Whitelist + validate the incoming settings payload. Unlike the legacy
 * spread-anything pattern, unknown fields are dropped and values are checked.
 */
function sanitizeSettingsInput(raw: unknown): OmniSettingsInput {
  const input = (raw ?? {}) as Record<string, unknown>;
  const out: OmniSettingsInput = {};

  if (typeof input.analysis_provider === 'string' && ANALYSIS_PROVIDERS.has(input.analysis_provider)) {
    out.analysis_provider = input.analysis_provider;
  }
  if (input.analysis_model === null) {
    out.analysis_model = null;
  } else if (typeof input.analysis_model === 'string' && input.analysis_model.length <= 200) {
    out.analysis_model = input.analysis_model;
  }
  if (typeof input.default_variants === 'number' && Number.isInteger(input.default_variants)
    && input.default_variants >= 1 && input.default_variants <= 10) {
    out.default_variants = input.default_variants;
  }
  if (input.defaults && typeof input.defaults === 'object' && !Array.isArray(input.defaults)) {
    out.defaults = input.defaults as Record<string, unknown>;
  }

  return out;
}

// ── Heart rules (AGENT key "omni") ───────────────────────────────────────────

export interface HeartRule {
  name: string;
  content: string;
  priority: string;
}

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Fetch ALL active Heart rules that are global or assigned to "omni".
 * Errors are surfaced to the caller, never silently degraded to zero rules:
 * a fetch failure blocks generation rather than producing non-compliant output.
 * Rules are sorted high priority first so the most important rules are injected
 * first and are never the ones dropped by any downstream truncation.
 * `priority` is a text column, so ordering happens in code via a rank map.
 */
export async function fetchHeartRules(
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<HeartRule[]> {
  const { data, error } = await supabaseAdmin
    .from('heart_rules')
    .select('name, rule_content, priority, sort_order, is_global, assigned_agents, is_active')
    .eq('is_active', true)
    .or('is_global.eq.true,assigned_agents.cs.{"omni"}');

  if (error) {
    console.error('Omni: Heart rules fetch error:', error.message);
    throw new Error('Heart rules could not be loaded. Generation is blocked to guarantee brand compliance. Please try again.');
  }

  const rank = (p: string) => PRIORITY_RANK[p.toLowerCase()] ?? 2;

  return (data || [])
    .map((r: { name?: string; rule_content?: string; priority?: string; sort_order?: number }) => ({
      name: sanitizeForPrompt(r.name ?? ''),
      content: sanitizeForPrompt(r.rule_content ?? ''),
      priority: r.priority ?? 'medium',
      sortOrder: r.sort_order ?? 0,
    }))
    .sort((a, b) => rank(a.priority) - rank(b.priority) || a.sortOrder - b.sortOrder)
    .map(({ name, content, priority }) => ({ name, content, priority }));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// ── Server ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const userId = user.id;

    if (rateLimiter.check(userId)) {
      return jsonResponse(
        { error: 'Rate limit exceeded. Please wait a moment and try again.' },
        429,
        { 'Retry-After': '60' },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = typeof body?.action === 'string' ? body.action : '';

    // ── get-settings ─────────────────────────────────────────────────────────
    if (action === 'get-settings') {
      const { data: settings, error } = await supabaseAdmin
        .from('omni_settings')
        .select('analysis_provider, analysis_model, default_variants, defaults')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Omni: get-settings error:', error.message);
        return jsonResponse({ error: 'Failed to load settings' }, 500);
      }
      return jsonResponse({ settings: settings ?? null });
    }

    // ── save-settings ────────────────────────────────────────────────────────
    if (action === 'save-settings') {
      const clean = sanitizeSettingsInput(body.settings);

      const { data: existing, error: selectError } = await supabaseAdmin
        .from('omni_settings')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (selectError) {
        console.error('Omni: save-settings select error:', selectError.message);
        return jsonResponse({ error: 'Failed to save settings' }, 500);
      }

      const writeError = existing
        ? (await supabaseAdmin
            .from('omni_settings')
            .update({ ...clean, updated_at: new Date().toISOString() })
            .eq('id', existing.id)).error
        : (await supabaseAdmin
            .from('omni_settings')
            .insert({ ...clean, user_id: userId })).error;

      if (writeError) {
        console.error('Omni: save-settings write error:', writeError.message);
        return jsonResponse({ error: 'Failed to save settings' }, 500);
      }
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Invalid action' }, 400);
  } catch (e) {
    console.error('Omni: unhandled error:', e instanceof Error ? e.message : String(e));
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});
