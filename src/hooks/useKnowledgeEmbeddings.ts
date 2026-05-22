/**
 * Knowledge Embeddings Hook
 * 
 * Provides utilities for triggering embedding processing
 * for Brain documents and Heart rules.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EDGE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/config/api';
import { getAuthHeaders } from '@/lib/apiHelpers';
import { toast } from 'sonner';
import * as Sentry from '@sentry/nextjs';

// Helper to invalidate vector store queries after embedding changes
function invalidateVectorStoreQueries(queryClient: ReturnType<typeof useQueryClient>) {
  // Use the root ['vector-store'] key to invalidate all vector store queries
  // (matches VectorStorePanel's ['vector-store', 'indexed-items'] and ['vector-store', 'stats'])
  queryClient.invalidateQueries({ queryKey: ['vector-store'] });
}

interface ProcessEmbeddingParams {
  action: 'process_document' | 'process_rule' | 'process_entry' | 'delete';
  source_type: 'brain_document' | 'heart_rule' | 'wishpedia_entry';
  source_id: string;
}

interface SearchKnowledgeParams {
  query: string;
  source_types?: ('brain_document' | 'heart_rule' | 'wishpedia_entry')[];
  agent_id?: string;
  limit?: number;
  threshold?: number;
}

interface SearchResult {
  id: string;
  source_type: string;
  source_id: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
  source: {
    name: string;
    category: string;
    description?: string;
    type: 'document' | 'rule';
  };
}

/**
 * Trigger embedding processing for a document or rule
 */
export async function processEmbedding(params: ProcessEmbeddingParams): Promise<{ success: boolean; chunks?: number; truncated?: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/process-embeddings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    
    // Handle non-OK responses gracefully (including 546 WORKER_LIMIT)
    if (!response.ok) {
      // Try to parse error response, but don't assume JSON
      let errorMessage = `Server error (${response.status})`;
      try {
        const data = await response.json();
        errorMessage = data.error || data.message || errorMessage;
      } catch {
        // Response wasn't JSON - use status text
        errorMessage = response.statusText || errorMessage;
      }
      Sentry.captureMessage('Embedding processing failed', { extra: { status: response.status, errorMessage } });
      return { success: false, error: errorMessage };
    }
    
    const data = await response.json();
    return { success: true, chunks: data.chunks, truncated: data.truncated };
  } catch (error) {
    Sentry.captureException(error instanceof Error ? error : new Error('Error processing embedding'), { extra: { context: 'Error processing embedding' } });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Search the knowledge base
 */
export async function searchKnowledge(params: SearchKnowledgeParams): Promise<{ results: SearchResult[]; error?: string }> {
  try {
    // CODE-002: use getUser() for validation. Search still works without
    // auth (anon key), so we don't throw on failure — just omit the
    // Authorization header.
    let authHeaders: Record<string, string>;
    try {
      authHeaders = await getAuthHeaders();
    } catch {
      authHeaders = {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      };
    }

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/search-knowledge`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || `Failed to search knowledge (${response.status})`);
    }

    const data = await response.json();

    return { results: data.results || [] };
  } catch (error) {
    Sentry.captureException(error instanceof Error ? error : new Error('Error searching knowledge'), { extra: { context: 'Error searching knowledge' } });
    return { 
      results: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Hook for processing brain document embeddings
 */
export function useProcessBrainDocumentEmbedding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (documentId: string) => {
      const result = await processEmbedding({
        action: 'process_document',
        source_type: 'brain_document',
        source_id: documentId,
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result;
    },
    onSuccess: (data) => {
      if (data.chunks && data.chunks > 0) {
        toast.success(`Document indexed: ${data.chunks} chunks created`);
      }
      // Invalidate vector store queries to refresh stats
      invalidateVectorStoreQueries(queryClient);
      // Invalidate document index status for automatic badge updates
      queryClient.invalidateQueries({ queryKey: ['document-index-status'] });
    },
    onError: (error) => {
      Sentry.captureException(error instanceof Error ? error : new Error('Failed to process document embedding'), { extra: { context: 'Failed to process document embedding' } });
      // Don't show error toast - embedding is a background process
    },
  });
}

/**
 * Hook for processing heart rule embeddings
 */
export function useProcessHeartRuleEmbedding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ruleId: string) => {
      const result = await processEmbedding({
        action: 'process_rule',
        source_type: 'heart_rule',
        source_id: ruleId,
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result;
    },
    onSuccess: (data) => {
      if (data.chunks && data.chunks > 0) {
        toast.success(`Rule indexed for AI knowledge base`);
      }
      // Invalidate vector store queries to refresh stats
      invalidateVectorStoreQueries(queryClient);
    },
    onError: (error) => {
      Sentry.captureException(error instanceof Error ? error : new Error('Failed to process rule embedding'), { extra: { context: 'Failed to process rule embedding' } });
      // Don't show error toast - embedding is a background process
    },
  });
}

/**
 * Hook for processing Wishpedia entry embeddings
 */
export function useProcessWishpediaEntryEmbedding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entryId: string) => {
      const result = await processEmbedding({
        action: 'process_entry',
        source_type: 'wishpedia_entry',
        source_id: entryId,
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result;
    },
    onSuccess: (data) => {
      if (data.chunks && data.chunks > 0) {
        toast.success(`Wishpedia entry indexed: ${data.chunks} chunks created`);
      }
      invalidateVectorStoreQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['entry-index-status'] });
    },
    onError: (error) => {
      Sentry.captureException(error instanceof Error ? error : new Error('Failed to process Wishpedia entry embedding'), { extra: { context: 'Failed to process Wishpedia entry embedding' } });
    },
  });
}
export function useDeleteEmbedding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sourceType, sourceId }: { sourceType: 'brain_document' | 'heart_rule' | 'wishpedia_entry'; sourceId: string }) => {
      const result = await processEmbedding({
        action: 'delete',
        source_type: sourceType,
        source_id: sourceId,
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result;
    },
    onSuccess: () => {
      // Invalidate vector store queries to refresh stats
      invalidateVectorStoreQueries(queryClient);
    },
  });
}

/**
 * Hook for searching the knowledge base
 */
export function useSearchKnowledge() {
  return useMutation({
    mutationFn: async (params: SearchKnowledgeParams) => {
      const result = await searchKnowledge(params);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return result.results;
    },
  });
}

/**
 * Get embedding stats from the database.
 * CODE-004: this is a read-only query, so it must use useQuery (not
 * useMutation) so the result is cached + invalidated by the rest of
 * the vector-store invalidation flow.
 */
export function useEmbeddingStats() {
  return useQuery({
    queryKey: ['vector-store', 'embedding-stats'],
    queryFn: async () => {
      // DATA-01: use exact COUNT (head: true) per type instead of fetching rows
      // and calling data.length — the row fetch was silently capped at PostgREST's
      // default 1000-row limit, undercounting once the corpus exceeded 1000 chunks.
      const [total, docs, rules] = await Promise.all([
        supabase.from('knowledge_embeddings').select('id', { count: 'exact', head: true }),
        supabase.from('knowledge_embeddings').select('id', { count: 'exact', head: true }).eq('source_type', 'brain_document'),
        supabase.from('knowledge_embeddings').select('id', { count: 'exact', head: true }).eq('source_type', 'heart_rule'),
      ]);

      if (total.error) throw total.error;

      return {
        totalChunks: total.count ?? 0,
        documentChunks: docs.count ?? 0,
        ruleChunks: rules.count ?? 0,
      };
    },
    staleTime: 30_000,
  });
}
