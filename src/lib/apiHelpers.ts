/**
 * Shared API Helpers
 * Centralized auth header construction and edge function URL building.
 */

import { supabase } from '@/integrations/supabase/client';
import { EDGE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/config/api';

/**
 * Get auth headers for edge function calls.
 * Returns Content-Type, Authorization (bearer token), and apikey headers.
 * Throws if not authenticated.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    apikey: SUPABASE_ANON_KEY,
  };
}

/**
 * Build a full edge function URL from a function name.
 */
export function edgeFunctionUrl(functionName: string): string {
  return `${EDGE_FUNCTIONS_URL}/${functionName}`;
}
