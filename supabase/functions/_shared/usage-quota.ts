/**
 * Per-user usage quota enforcement for LLM edge functions.
 * AGENT-012/AGENT-014: prevents cost explosion from unmetered usage.
 *
 * Quotas are per-user per-day. The edge function should call
 * checkQuota() before making the LLM call, and logUsage() after.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** Daily usage limits per action type */
const DAILY_LIMITS: Record<string, number> = {
  'chat': 200,             // ~200 text chats per day
  'generate-image': 30,    // ~$1.20/day at gpt-image-1 standard
  'generate-video': 10,    // ~$5/day at sora-2
  'start-research': 5,     // ~$50/day at o3-deep-research
  'pixel-chat': 50,        // image generation via Pixel
  'pixel-blueprint': 20,   // blueprint generation
  'osha-chat': 100,        // governed chat
  'promptor-generate': 50, // prompt generation
};

interface QuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
}

/**
 * Check if a user has remaining quota for an action.
 * Uses a service-role client to query the user_usage table.
 */
export async function checkQuota(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  action: string,
): Promise<QuotaResult> {
  const limit = DAILY_LIMITS[action] ?? 100; // default 100/day for unknown actions
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabaseAdmin
    .from('user_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', dayStart.toISOString());

  if (error) {
    console.error('Usage quota check error:', error);
    // Fail open — don't block on quota check errors
    return { allowed: true, remaining: limit, limit, used: 0 };
  }

  const used = count ?? 0;
  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit,
    used,
  };
}

/**
 * Log a usage event after a successful LLM call.
 */
export async function logUsage(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  action: string,
  provider: string,
  model?: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('user_usage')
    .insert({ user_id: userId, action, provider, model });

  if (error) {
    console.error('Usage logging error:', error);
    // Don't throw — logging failure shouldn't break the response
  }
}
