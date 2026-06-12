"use client";

/**
 * Social-description generation for wizard step 7.
 * Reuses Promptor's optimize-draft action through the existing
 * useOptimizeDraft hook in a client-side variation loop, exactly like
 * Pulse's bulk generator: full Heart + Brain compliance, zero Promptor
 * changes, no new edge LLM call. Cancelable between iterations.
 */

import { useCallback, useRef, useState } from 'react';
import { useOptimizeDraft } from '@/hooks/promptor';

export function useOmniDescriptions() {
  const { optimizeDraft } = useOptimizeDraft();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef(false);

  const generate = useCallback(
    async (brief: string, count: number, changeNotes?: string): Promise<string[]> => {
      setIsGenerating(true);
      setProgress(0);
      cancelRef.current = false;
      const results: string[] = [];
      try {
        for (let i = 0; i < count; i++) {
          if (cancelRef.current) break;
          const notes = changeNotes?.trim() ? ` Apply these change notes: ${changeNotes.trim()}.` : '';
          try {
            const text = await optimizeDraft(
              `${brief.trim()}\n\n(Write a distinct, ready-to-post social media caption for this visual - variation ${i + 1} of ${count}, with a fresh angle and hook.${notes} Output only the caption.)`,
            );
            if (text?.trim()) results.push(text.trim());
          } catch {
            // Per-variation failure: skip and continue (hook toasts already).
          }
          setProgress(i + 1);
        }
        return results;
      } finally {
        setIsGenerating(false);
      }
    },
    [optimizeDraft],
  );

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return { generate, cancel, isGenerating, progress };
}
