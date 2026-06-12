"use client";

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { callOmni } from '@/lib/omniApi';
import type { FalCapability, FalCatalogPage, FalTestResult } from './types';

interface FalCatalogParams {
  capability?: FalCapability;
  q?: string;
  cursor?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Load a page of the fal.ai model catalog.
 * Errors THROW into the query error state so the UI can render a real error
 * surface (catalog problems must be visible, not silently defaulted).
 */
export function useFalCatalog({ capability, q, cursor, limit = 100, enabled = true }: FalCatalogParams = {}) {
  return useQuery<FalCatalogPage>({
    queryKey: ['omni-fal-models', capability ?? 'all', q ?? '', cursor ?? '', limit],
    staleTime: 10 * 60 * 1000,
    enabled,
    queryFn: () => callOmni<FalCatalogPage>('list-fal-models', { capability, q, cursor, limit }),
  });
}

/** Admin-only one-shot health check: generates a test image through the queue. */
export function useFalTestGenerate() {
  return useMutation({
    mutationFn: async () => {
      return callOmni<FalTestResult>('fal-test-generate');
    },
    onError: (error: Error) => {
      toast.error(`fal.ai test failed: ${error.message}`);
    },
  });
}
