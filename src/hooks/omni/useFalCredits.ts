"use client";

/**
 * Live fal.ai account credit balance for the Recap cost card.
 * Degrades gracefully: if the edge action is unavailable (not yet deployed) or
 * fal has no key/balance, returns { available: false } instead of throwing, so
 * the cost card still shows the estimate.
 */

import { useQuery } from '@tanstack/react-query';
import { callOmni } from '@/lib/omniApi';

export interface FalCredits {
  balance: number | null;
  currency: string;
  available: boolean;
  /** True once the edge confirmed a fal key is set + caller is admin (even if the
   *  live balance couldn't be read). Lets the UI tell "no access/key" apart from
   *  a transient "balance unavailable". */
  configured: boolean;
  /** Why the balance is null, when it is: no_key | http_401 | http_403 | unparsed |
   *  fetch_error | request_failed. Drives a precise UI hint. */
  reason?: string;
}

export function useFalCredits(enabled = true) {
  return useQuery<FalCredits>({
    queryKey: ['omni-fal-credits'],
    queryFn: async () => {
      try {
        const res = await callOmni<{ balance: number | null; currency?: string; configured?: boolean; reason?: string }>('fal-credits', {});
        return {
          balance: typeof res.balance === 'number' ? res.balance : null,
          currency: res.currency ?? 'USD',
          available: typeof res.balance === 'number',
          configured: res.configured ?? false,
          reason: res.reason,
        };
      } catch {
        return { balance: null, currency: 'USD', available: false, configured: false, reason: 'request_failed' };
      }
    },
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}
