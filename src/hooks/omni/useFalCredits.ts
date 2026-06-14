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
}

export function useFalCredits(enabled = true) {
  return useQuery<FalCredits>({
    queryKey: ['omni-fal-credits'],
    queryFn: async () => {
      try {
        const res = await callOmni<{ balance: number | null; currency?: string; configured?: boolean }>('fal-credits', {});
        return {
          balance: typeof res.balance === 'number' ? res.balance : null,
          currency: res.currency ?? 'USD',
          available: typeof res.balance === 'number',
        };
      } catch {
        return { balance: null, currency: 'USD', available: false };
      }
    },
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}
