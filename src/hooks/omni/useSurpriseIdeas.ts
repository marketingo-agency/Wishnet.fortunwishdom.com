"use client";

/**
 * useSurpriseIdeas: edge `surprise-ideas` (knowledge mining + Heart-grounded
 * idea batch). A mutation, not a query: every invocation is a fresh mine.
 * Consumed by the wizard's "Inspire me" action (the folded Surprise Me);
 * picking an idea fills the objective field, so no separate run mode is
 * created anymore — 'surprise_me' survives only as a legacy History value.
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callOmni } from '@/lib/omniApi';
import type { SurpriseResult } from './types';

export function useSurpriseIdeas() {
  return useMutation<SurpriseResult, Error, void>({
    mutationFn: () => callOmni<SurpriseResult>('surprise-ideas'),
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
