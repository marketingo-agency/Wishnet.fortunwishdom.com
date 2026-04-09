/**
 * useBulkWishpediaIndex Hook
 * 
 * Shared hook for bulk-indexing all un-indexed Wishpedia entries.
 * Sequential processing to avoid OpenAI rate limits.
 */

import { useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { processEmbedding } from '@/hooks/useKnowledgeEmbeddings';
import { toast } from 'sonner';

interface BulkIndexState {
  isRunning: boolean;
  progress: number;
  total: number;
  currentName: string;
}

export function useUnindexedEntryCount() {
  return useQuery({
    queryKey: ['wishpedia-unindexed-count'],
    queryFn: async () => {
      const { data: entries } = await supabase
        .from('wishpedia_entries')
        .select('id')
        .eq('is_archived', false);
      if (!entries) return 0;

      const { data: indexed } = await supabase
        .from('knowledge_embeddings')
        .select('source_id')
        .eq('source_type', 'wishpedia_entry');

      const indexedSet = new Set((indexed || []).map((e) => e.source_id));
      return entries.filter((e) => !indexedSet.has(e.id)).length;
    },
  });
}

export function useBulkWishpediaIndex() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<BulkIndexState>({
    isRunning: false,
    progress: 0,
    total: 0,
    currentName: '',
  });
  const cancelRef = useRef(false);

  const fetchUnindexedEntries = useCallback(async () => {
    const { data: entries, error: entriesErr } = await supabase
      .from('wishpedia_entries')
      .select('id, name')
      .eq('is_archived', false);
    if (entriesErr) throw entriesErr;
    if (!entries || entries.length === 0) return [];

    const { data: indexed, error: indexErr } = await supabase
      .from('knowledge_embeddings')
      .select('source_id')
      .eq('source_type', 'wishpedia_entry');
    if (indexErr) throw indexErr;

    const indexedSet = new Set((indexed || []).map((e) => e.source_id));
    return entries.filter((e) => !indexedSet.has(e.id));
  }, []);

  const start = useCallback(async () => {
    cancelRef.current = false;
    try {
      const unindexed = await fetchUnindexedEntries();
      if (unindexed.length === 0) {
        toast.info('All entries are already indexed');
        return;
      }

      setState({ isRunning: true, progress: 0, total: unindexed.length, currentName: '' });

      let successCount = 0;
      for (let i = 0; i < unindexed.length; i++) {
        if (cancelRef.current) break;
        const entry = unindexed[i];
        setState((s) => ({ ...s, progress: i + 1, currentName: entry.name }));

        const result = await processEmbedding({
          action: 'process_entry',
          source_type: 'wishpedia_entry',
          source_id: entry.id,
        });
        if (result.success) successCount++;
        if (i < unindexed.length - 1) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }

      setState((s) => ({ ...s, isRunning: false, currentName: '' }));
      queryClient.invalidateQueries({ queryKey: ['vector-store'] });
      queryClient.invalidateQueries({ queryKey: ['entry-index-status'] });
      queryClient.invalidateQueries({ queryKey: ['wishpedia-unindexed-count'] });

      if (cancelRef.current) {
        toast.info(`Indexing cancelled. ${successCount} entries indexed.`);
      } else {
        toast.success(`${successCount} Wishpedia entries indexed successfully`);
      }
    } catch (err) {
      console.error('Bulk index error:', err);
      toast.error('Bulk indexing failed');
      setState((s) => ({ ...s, isRunning: false }));
    }
  }, [fetchUnindexedEntries, queryClient]);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return { ...state, start, cancel };
}
