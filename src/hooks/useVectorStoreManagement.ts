/**
 * Vector Store Management Hook
 * 
 * Provides utilities for viewing and managing the knowledge embeddings
 * in the vector store.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { processEmbedding } from './useKnowledgeEmbeddings';
import { toast } from 'sonner';
import * as Sentry from '@sentry/nextjs';

export interface IndexedItem {
  source_id: string;
  source_type: 'brain_document' | 'heart_rule' | 'wishpedia_entry';
  chunk_count: number;
  source_name: string;
  source_category: string;
  indexed_at: string;
  agent_id: string | null;
  restricted_agents: string[] | null;
  is_global: boolean;
  mime_type: string | null;
}

export interface VectorStoreStats {
  total_chunks: number;
  document_count: number;
  rule_count: number;
  entry_count: number;
  document_chunks: number;
  rule_chunks: number;
  entry_chunks: number;
}

/**
 * Fetch all indexed items from the vector store
 */
export function useIndexedItems() {
  return useQuery({
    queryKey: ['vector-store', 'indexed-items'],
    queryFn: async () => {
      // Fetch embeddings, brain sections, brain documents, AND wishpedia entries in parallel
      const [embeddingsResult, sectionsResult, documentsResult, entriesResult] = await Promise.all([
        supabase
          .from('knowledge_embeddings')
          .select('source_id, source_type, metadata, created_at')
          .range(0, 9999),
        supabase
          .from('brain_sections')
          .select('id, agent_id, type'),
        supabase
          .from('brain_documents')
          .select('id, mime_type, name'),
        supabase
          .from('wishpedia_entries')
          .select('id, name'),
      ]);
      
      if (embeddingsResult.error) throw embeddingsResult.error;
      if (sectionsResult.error) throw sectionsResult.error;
      if (documentsResult.error) throw documentsResult.error;
      if (entriesResult.error) throw entriesResult.error;
      
      // Build entry_id -> name map for fallback
      const entryNameMap = new Map<string, string>();
      for (const entry of entriesResult.data || []) {
        entryNameMap.set(entry.id, entry.name);
      }
      
      // Build section_id -> agent_id map
      const sectionAgentMap = new Map<string, string | null>();
      for (const section of sectionsResult.data || []) {
        sectionAgentMap.set(section.id, section.agent_id);
      }
      
      // Build document_id -> {mime_type, name} map for fallback
      const documentInfoMap = new Map<string, { mime_type: string; name: string }>();
      for (const doc of documentsResult.data || []) {
        documentInfoMap.set(doc.id, { 
          mime_type: doc.mime_type, 
          name: doc.name 
        });
      }
      
      // Group by source_id and aggregate
      const grouped = new Map<string, IndexedItem>();
      
      for (const row of embeddingsResult.data || []) {
        const key = `${row.source_type}-${row.source_id}`;
        const existing = grouped.get(key);
        const metadata = row.metadata as Record<string, unknown> | null;
        
        if (existing) {
          existing.chunk_count++;
          // Keep the latest indexed_at
          if (new Date(row.created_at || new Date().toISOString()) > new Date(existing.indexed_at)) {
            existing.indexed_at = row.created_at ?? '';
          }
        } else {
          // Determine agent association
          let agentId: string | null = null;
          let restrictedAgents: string[] | null = null;
          let isGlobal = false;
          
          if (row.source_type === 'brain_document') {
            // Check section_id for agent association
            const sectionId = metadata?.section_id as string | undefined;
            if (sectionId) {
              agentId = sectionAgentMap.get(sectionId) || null;
            }
            // Check restricted_agents for documents in General Knowledge
            restrictedAgents = (metadata?.restricted_agents as string[]) || null;
          } else if (row.source_type === 'heart_rule') {
            // Heart rules use assigned_agents and is_global
            const assignedAgents = (metadata?.assigned_agents as string[]) || null;
            isGlobal = (metadata?.is_global as boolean) || false;
            if (assignedAgents && assignedAgents.length > 0 && !isGlobal) {
              agentId = assignedAgents[0];
              restrictedAgents = assignedAgents;
            }
          } else if (row.source_type === 'wishpedia_entry') {
            // Wishpedia entries are global by default (all agents can access)
            isGlobal = true;
          }
          
          // Get the correct source name
          const sourceName = (metadata?.entry_name as string)
            || (metadata?.document_name as string) 
            || (metadata?.name as string)
            || (row.source_type === 'wishpedia_entry' ? entryNameMap.get(row.source_id) : undefined)
            || 'Unknown';
          
          grouped.set(key, {
            source_id: row.source_id,
            source_type: row.source_type as 'brain_document' | 'heart_rule' | 'wishpedia_entry',
            chunk_count: 1,
            source_name: sourceName,
            source_category: (metadata?.category_name as string) || (metadata?.category as string) || 'Uncategorized',
            indexed_at: row.created_at ?? '',
            agent_id: agentId,
            restricted_agents: restrictedAgents,
            is_global: isGlobal,
            mime_type: (metadata?.mime_type as string) 
              || (row.source_type === 'brain_document' ? documentInfoMap.get(row.source_id)?.mime_type : null) 
              || null,
          });
        }
      }
      
      // Convert to array and sort by indexed_at desc
      return Array.from(grouped.values()).sort(
        (a, b) => new Date(b.indexed_at).getTime() - new Date(a.indexed_at).getTime()
      );
    },
  });
}

/**
 * Fetch vector store statistics
 */
export function useVectorStoreStats() {
  return useQuery({
    queryKey: ['vector-store', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_embeddings')
        .select('source_id, source_type')
        .range(0, 9999);
      
      if (error) throw error;
      
      const stats: VectorStoreStats = {
        total_chunks: data?.length || 0,
        document_count: 0,
        rule_count: 0,
        entry_count: 0,
        document_chunks: 0,
        rule_chunks: 0,
        entry_chunks: 0,
      };
      
      const documentIds = new Set<string>();
      const ruleIds = new Set<string>();
      const entryIds = new Set<string>();
      
      for (const row of data || []) {
        if (row.source_type === 'brain_document') {
          stats.document_chunks++;
          documentIds.add(row.source_id);
        } else if (row.source_type === 'heart_rule') {
          stats.rule_chunks++;
          ruleIds.add(row.source_id);
        } else if (row.source_type === 'wishpedia_entry') {
          stats.entry_chunks++;
          entryIds.add(row.source_id);
        }
      }
      
      stats.document_count = documentIds.size;
      stats.rule_count = ruleIds.size;
      stats.entry_count = entryIds.size;
      
      return stats;
    },
  });
}

/**
 * Delete embeddings for a specific source
 */
export function useDeleteFromVectorStore() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sourceId }: { sourceId: string }) => {
      const { error } = await supabase
        .from('knowledge_embeddings')
        .delete()
        .eq('source_id', sourceId);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vector-store'] });
      toast.success('Removed from vector store');
    },
    onError: (error) => {
      Sentry.captureException(error instanceof Error ? error : new Error('Failed to delete from vector store'), { extra: { context: 'Failed to delete from vector store' } });
      toast.error('Failed to remove from vector store');
    },
  });
}

/**
 * Reindex a specific source (delete existing + re-process)
 */
export function useReindexItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sourceId, 
      sourceType 
    }: { 
      sourceId: string; 
      sourceType: 'brain_document' | 'heart_rule' | 'wishpedia_entry';
    }) => {
      // First delete existing embeddings
      const { error: deleteError } = await supabase
        .from('knowledge_embeddings')
        .delete()
        .eq('source_id', sourceId);
      
      if (deleteError) throw deleteError;
      
      // Determine action based on source type
      const actionMap = {
        brain_document: 'process_document',
        heart_rule: 'process_rule',
        wishpedia_entry: 'process_entry',
      } as const;
      
      // Then trigger re-processing
      const result = await processEmbedding({
        action: actionMap[sourceType],
        source_type: sourceType,
        source_id: sourceId,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to reindex');
      }
      
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vector-store'] });
      toast.success(`Reindexed: ${data.chunks || 0} chunks created`);
    },
    onError: (error) => {
      Sentry.captureException(error instanceof Error ? error : new Error('Failed to reindex'), { extra: { context: 'Failed to reindex' } });
      toast.error('Failed to reindex item');
    },
  });
}

/**
 * Bulk delete multiple items from vector store
 */
export function useBulkDeleteFromVectorStore() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sourceIds }: { sourceIds: string[] }) => {
      const { error } = await supabase
        .from('knowledge_embeddings')
        .delete()
        .in('source_id', sourceIds);
      
      if (error) throw error;
      return { count: sourceIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vector-store'] });
      toast.success(`Removed ${data.count} items from vector store`);
    },
    onError: (error) => {
      Sentry.captureException(error instanceof Error ? error : new Error('Failed to bulk delete'), { extra: { context: 'Failed to bulk delete' } });
      toast.error('Failed to remove items from vector store');
    },
  });
}
