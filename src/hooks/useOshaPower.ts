/**
 * Osha Power Hooks
 * Deep Research, Web Search functionality
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders, edgeFunctionUrl } from '@/lib/apiHelpers';
import { toast } from 'sonner';

// Re-export save-to-brain for backward compatibility
export { useSaveToBrain as useOshaSaveToBrain } from './useSaveToBrain';

// ─── Deep Research Clarify ────────────────────────────────────────────────────

interface DeepResearchClarifyParams {
  message: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
}

interface DeepResearchClarifyResult {
  questions: string;
}

export function useOshaDeepResearchClarify() {
  return useMutation({
    mutationFn: async (params: DeepResearchClarifyParams): Promise<DeepResearchClarifyResult> => {
      const headers = await getAuthHeaders();
      const res = await fetch(edgeFunctionUrl('osha-chat'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'deep-research-clarify',
          message: params.message,
          conversationHistory: params.conversationHistory || [],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to get clarifying questions' }));
        throw new Error(err.error || 'Failed to get clarifying questions');
      }

      return res.json();
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    },
  });
}

// ─── Deep Research Execute ────────────────────────────────────────────────────

interface DeepResearchParams {
  message: string;
  clarificationAnswers?: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  signal?: AbortSignal;
  onResolvedTopic?: (topic: string) => void;
}

interface DeepResearchResult {
  content: string;
  resolvedTopic?: string;
}

export function useOshaDeepResearch() {
  return useMutation({
    mutationFn: async (params: DeepResearchParams): Promise<DeepResearchResult> => {
      const headers = await getAuthHeaders();
      const url = edgeFunctionUrl('osha-chat');

      // Step 1: Start research
      const actionName = params.clarificationAnswers ? 'deep-research-execute' : 'deep-research';
      const startRes = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: actionName,
          message: params.message,
          content: params.clarificationAnswers || undefined,
          conversationHistory: params.conversationHistory || [],
        }),
        signal: params.signal,
      });

      if (!startRes.ok) {
        const err = await startRes.json().catch(() => ({ error: 'Failed to start research' }));
        throw new Error(err.error || 'Failed to start research');
      }

      const startData = await startRes.json();

      if (startData.resolvedTopic && params.onResolvedTopic) {
        params.onResolvedTopic(startData.resolvedTopic);
      }

      if (startData.status === 'completed') {
        return { content: startData.content, resolvedTopic: startData.resolvedTopic };
      }

      if (!startData.responseId) {
        throw new Error('No response ID returned');
      }

      // Step 2: Poll for completion — refresh token before each poll
      const maxPolls = 120;
      for (let i = 0; i < maxPolls; i++) {
        if (params.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        await new Promise(r => setTimeout(r, 5000));
        if (params.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

        let pollHeaders: Record<string, string>;
        try {
          pollHeaders = await getAuthHeaders();
        } catch {
          console.warn('[DeepResearch] No session during poll, retrying...');
          continue;
        }

        const pollRes = await fetch(url, {
          method: 'POST',
          headers: pollHeaders,
          body: JSON.stringify({ action: 'poll-research', responseId: startData.responseId }),
          signal: params.signal,
        });

        if (!pollRes.ok) {
          const errText = await pollRes.text().catch(() => 'unknown error');
          console.warn(`[DeepResearch] Poll ${i + 1} failed (${pollRes.status}): ${errText}`);
          continue;
        }

        const pollData = await pollRes.json();

        if (pollData.status === 'completed') {
          return { content: pollData.content, resolvedTopic: startData.resolvedTopic };
        }

        if (pollData.status === 'failed' || pollData.status === 'cancelled') {
          throw new Error(pollData.error || 'Research failed');
        }
      }

      throw new Error('Research timed out after 10 minutes');
    },
    onError: (error) => {
      if (error.name === 'AbortError') return;
      toast.error('Research error: ' + error.message);
    },
  });
}

// ─── Web Search ───────────────────────────────────────────────────────────────

interface WebSearchParams {
  message: string;
}

interface WebSearchResult {
  content: string;
}

export function useOshaWebSearch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: WebSearchParams): Promise<WebSearchResult> => {
      const headers = await getAuthHeaders();
      const res = await fetch(edgeFunctionUrl('osha-chat'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'web-search',
          message: params.message,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Web search failed' }));
        throw new Error(err.error || 'Web search failed');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['osha-messages', user?.id] });
    },
    onError: (error) => {
      toast.error('Web search error: ' + error.message);
    },
  });
}
