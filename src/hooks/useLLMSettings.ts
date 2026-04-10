/**
 * useLLMSettings Hook
 * Handles LLM settings data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AI_CHAT_ENDPOINT } from '@/config/api';
import { getAuthHeaders } from '@/lib/apiHelpers';
import type { LLMSettings, ChatRequest, DeepResearchRequest } from '@/types/llm';

// Re-export model definitions from config for backwards compatibility
export {
  OPENAI_TEXT_MODELS,
  OPENAI_DEEP_RESEARCH_MODELS,
  OPENAI_IMAGE_MODELS,
  OPENAI_VIDEO_MODELS,
  GEMINI_TEXT_MODELS,
  GEMINI_IMAGE_MODELS,
  GEMINI_VIDEO_MODELS,
} from '@/config/llmModels';

// Re-export types
export type { LLMSettings, ChatMessage } from '@/types/llm';

export function useLLMSettings() {
  return useQuery({
    queryKey: ['llm-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('llm_settings')
        .select('*')
        .single();

      if (error) throw error;
      return data as LLMSettings;
    },
  });
}

export function useUpdateLLMSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<LLMSettings>) => {
      const { data, error } = await supabase
        .from('llm_settings')
        .update(updates)
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llm-settings'] });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    onError: () => {}, // suppress React Query's internal console.error
    mutationFn: async ({ provider, apiKey }: { provider: 'openai' | 'gemini'; apiKey: string }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(AI_CHAT_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'test-connection',
          provider,
          apiKey,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Connection test failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch { /* ignore parse errors */ }
        throw new Error(errorMessage);
      }

      return response.json();
    },
  });
}

export function useAIChat() {
  return useMutation({
    // Suppress React Query's internal console.error logging for mutation failures.
    // Prevents error trackers from flagging expected API errors (e.g. Gemini 503
    // high-demand) as runtime errors with a blank screen.
    // Callers use try/catch on mutateAsync and handle errors themselves.
    onError: () => {},
    mutationFn: async ({
      message,
      provider,
      model,
      mode,
      temperature,
      systemPrompt,
      isDeepResearch,
      conversationHistory,
    }: ChatRequest & { isDeepResearch?: boolean }) => {
      // Determine the action based on mode
      let action: string;
      if (mode === 'image') {
        action = 'generate-image';
      } else if (mode === 'video') {
        action = 'generate-video';
      } else {
        action = 'chat';
      }

      const headers = await getAuthHeaders();
      const response = await fetch(AI_CHAT_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action,
          provider,
          model,
          message,
          temperature,
          systemPrompt,
          isDeepResearch,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        // Parse error body safely — a malformed body should not mask the real status
        let errorMessage = `Request failed (${response.status})`;
        let hint: string | undefined;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          hint = errorData.hint;
        } catch {
          // body was not JSON — keep the generic message
        }
        const err = new Error(errorMessage);
        (err as Error & { hint?: string; status?: number }).hint = hint;
        (err as Error & { hint?: string; status?: number }).status = response.status;
        throw err;
      }

      // Some graceful errors are returned as HTTP 200 with success:false to avoid
      // triggering platform-level RUNTIME_ERROR monitoring on non-2xx responses.
      const responseData = await response.json();
      if (responseData.success === false && responseData.error) {
        const err = new Error(responseData.error);
        (err as Error & { hint?: string; status?: number }).hint = responseData.hint;
        (err as Error & { hint?: string; status?: number }).status = 503;
        throw err;
      }

      return responseData;
    },
  });
}

/**
 * AGENT-005: Streaming chat via SSE. Returns a callback that streams
 * text chunks via onChunk and calls onDone when finished.
 * Only works for text chat with OpenAI provider.
 */
export function useStreamingChat() {
  return {
    streamChat: async ({
      message,
      provider,
      model,
      temperature,
      systemPrompt,
      conversationHistory,
      onChunk,
      onDone,
      onError,
    }: ChatRequest & {
      onChunk: (text: string) => void;
      onDone: (fullText: string) => void;
      onError: (error: Error) => void;
    }) => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(AI_CHAT_ENDPOINT, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'chat',
            provider,
            model,
            message,
            temperature,
            systemPrompt,
            conversationHistory,
            stream: true,
          }),
        });

        if (!response.ok) {
          let errorMessage = `Request failed (${response.status})`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch { /* not JSON */ }
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const payload = trimmed.slice(6);
            if (payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.content) {
                fullText += parsed.content;
                onChunk(parsed.content);
              }
              if (parsed.error) throw new Error(parsed.error);
            } catch (e) {
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e;
            }
          }
        }

        onDone(fullText);
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
}

// Deep Research with polling support for long-running requests
export function useDeepResearch() {
  return useMutation({
    mutationFn: async ({
      message,
      model,
      onProgress,
    }: DeepResearchRequest) => {
      const headers = await getAuthHeaders();
      const token = headers.Authorization?.replace('Bearer ', '');

      // Step 1: Start the research
      onProgress?.('Starting deep research...');
      const startResponse = await fetch(AI_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'start-research',
          provider: 'openai',
          model,
          message,
        }),
      });

      if (!startResponse.ok) {
        const error = await startResponse.json();
        throw new Error(error.error || 'Failed to start deep research');
      }

      const { responseId, status: initialStatus } = await startResponse.json();
      
      if (!responseId) {
        throw new Error('No response ID returned from start-research');
      }

      // If already completed (unlikely but possible)
      if (initialStatus === 'completed') {
        return { content: 'Research completed immediately' };
      }

      // Step 2: Poll for completion (every 5 seconds, max 10 minutes)
      const maxAttempts = 120; // 10 minutes with 5-second intervals
      const pollInterval = 5000;

      for (let i = 0; i < maxAttempts; i++) {
        onProgress?.(`Searching the web... (${Math.floor((i * 5) / 60)}m ${(i * 5) % 60}s)`);
        
        await new Promise(r => setTimeout(r, pollInterval));

        const pollResponse = await fetch(AI_CHAT_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'poll-research',
            provider: 'openai',
            responseId,
          }),
        });

        if (!pollResponse.ok) {
          const error = await pollResponse.json();
          throw new Error(error.error || 'Failed to poll research status');
        }

        const result = await pollResponse.json();

        if (result.status === 'completed') {
          onProgress?.('Research complete!');
          return { content: result.content };
        }

        if (result.status === 'failed' || result.status === 'cancelled') {
          throw new Error(result.error || 'Research failed or was cancelled');
        }

        // Continue polling for 'queued' or 'in_progress'
      }

      throw new Error('Deep research timed out after 10 minutes');
    },
  });
}
