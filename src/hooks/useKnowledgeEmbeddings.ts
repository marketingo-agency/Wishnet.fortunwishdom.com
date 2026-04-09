/**
 * Knowledge Embeddings Hook
 * 
 * Provides utilities for triggering embedding processing
 * for Brain documents and Heart rules.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EDGE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/config/api';
import { toast } from 'sonner';
import { useCallback } from 'react';

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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'Not authenticated' };

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/process-embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
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
      console.error('Embedding processing failed:', response.status, errorMessage);
      return { success: false, error: errorMessage };
    }
    
    const data = await response.json();
    return { success: true, chunks: data.chunks, truncated: data.truncated };
  } catch (error) {
    console.error('Error processing embedding:', error);
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
    const { data: { session } } = await supabase.auth.getSession();
    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    };
    if (session) {
      authHeaders.Authorization = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/search-knowledge`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(params),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to search knowledge');
    }
    
    return { results: data.results || [] };
  } catch (error) {
    console.error('Error searching knowledge:', error);
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
      console.error('Failed to process document embedding:', error);
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
      console.error('Failed to process rule embedding:', error);
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
      console.error('Failed to process Wishpedia entry embedding:', error);
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
 * Get embedding stats from the database
 */
export function useEmbeddingStats() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_embeddings')
        .select('source_type, id', { count: 'exact' });
      
      if (error) throw error;
      
      const documentCount = data?.filter(e => e.source_type === 'brain_document').length || 0;
      const ruleCount = data?.filter(e => e.source_type === 'heart_rule').length || 0;
      
      return {
        totalChunks: data?.length || 0,
        documentChunks: documentCount,
        ruleChunks: ruleCount,
      };
    },
  });
}
