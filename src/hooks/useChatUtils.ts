/**
 * Shared Chat Utilities
 * Common primitives used across Osha, Pixel, and Nexus chat controllers.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { toast } from 'sonner';

/**
 * Auto-scroll a container to the bottom when dependencies change.
 */
export function useScrollToBottom<T extends HTMLElement>(deps: unknown[]) {
  const scrollRef = useRef<T>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return scrollRef;
}

/**
 * Copy-to-clipboard with a temporary "copied" indicator.
 */
export function useCopyToClipboard(resetMs = 2000) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = useCallback(
    async (content: string, id: string) => {
      try {
        await navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), resetMs);
      } catch {
        toast.error('Failed to copy');
      }
    },
    [resetMs],
  );

  return { copiedId, handleCopy };
}

/**
 * Auto-resize a <textarea> as the user types (up to maxHeight px).
 */
export function useAutoResizeTextarea(maxHeight = 160) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>, setter: (v: string) => void) => {
      setter(e.target.value);
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    },
    [maxHeight],
  );

  const resetHeight = useCallback(() => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, []);

  return { textareaRef, handleInput, resetHeight };
}

/**
 * Send on Enter (not Shift+Enter).
 */
export function useEnterToSend(onSend: () => void) {
  return useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    },
    [onSend],
  );
}
