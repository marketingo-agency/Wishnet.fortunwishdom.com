/**
 * AGENT-007: System prompt management.
 * Fetches active prompts from the system_prompts DB table.
 * Falls back to hardcoded defaults if the table is empty or query fails.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';

interface SystemPrompt {
  agent_id: string;
  prompt_key: string;
  content: string;
  version: number;
}

/**
 * Fetch the active system prompt for an agent + key.
 * Returns the highest-version active prompt, or the fallback if none found.
 */
export async function getSystemPrompt(
  supabaseAdmin: ReturnType<typeof createClient>,
  agentId: string,
  promptKey: string,
  fallback: string,
): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_prompts')
      .select('content')
      .eq('agent_id', agentId)
      .eq('prompt_key', promptKey)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.content) return fallback;
    return data.content;
  } catch {
    return fallback;
  }
}

/**
 * Fetch all active prompts for an agent (e.g., all mode instructions).
 * Returns a Record<promptKey, content>.
 */
export async function getAgentPrompts(
  supabaseAdmin: ReturnType<typeof createClient>,
  agentId: string,
  fallbacks: Record<string, string>,
): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_prompts')
      .select('prompt_key, content, version')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .order('version', { ascending: false });

    if (error || !data || data.length === 0) return fallbacks;

    // Deduplicate: keep highest version per key
    const result: Record<string, string> = { ...fallbacks };
    const seen = new Set<string>();
    for (const row of data) {
      if (!seen.has(row.prompt_key)) {
        result[row.prompt_key] = row.content;
        seen.add(row.prompt_key);
      }
    }
    return result;
  } catch {
    return fallbacks;
  }
}
