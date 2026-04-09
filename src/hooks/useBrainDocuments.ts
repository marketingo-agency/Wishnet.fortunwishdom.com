import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeFileName } from '@/lib/utils';
import type { BrainDocument, BrainCategory } from '@/types/brain';

export function useBrainDocuments(sectionId?: string, category?: BrainCategory) {
  return useQuery({
    queryKey: ['brain-documents', sectionId, category],
    queryFn: async () => {
      let query = supabase
        .from('brain_documents')
        .select('*')
        .order('sort_order', { ascending: true });

      if (sectionId) {
        query = query.eq('section_id', sectionId);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BrainDocument[];
    },
  });
}

export function useBrainDocumentCounts() {
  return useQuery({
    queryKey: ['brain-document-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brain_documents')
        .select('section_id');

      if (error) throw error;

      // Count documents per section
      const counts: Record<string, number> = {};
      data.forEach((doc) => {
        counts[doc.section_id] = (counts[doc.section_id] || 0) + 1;
      });

      return counts;
    },
  });
}

export function useTotalDocumentCount() {
  return useQuery({
    queryKey: ['brain-total-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('brain_documents')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
  });
}

export function useUploadBrainDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      file,
      sectionId,
      category,
      name,
      description,
      restrictedAgents,
    }: {
      file: File;
      sectionId: string;
      category: BrainCategory;
      name?: string;
      description?: string;
      restrictedAgents?: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      const timestamp = Date.now();
      const sanitizedName = sanitizeFileName(file.name);
      const storagePath = `${sectionId}/${timestamp}_${sanitizedName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('brain-documents')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from('brain_documents')
        .insert({
          section_id: sectionId,
          name: name || file.name,
          original_name: file.name,
          storage_path: storagePath,
          mime_type: file.type || 'application/octet-stream',
          size: file.size,
          category,
          description,
          restricted_agents: restrictedAgents && restrictedAgents.length > 0 ? restrictedAgents : null,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-documents'] });
      queryClient.invalidateQueries({ queryKey: ['brain-documents-agent'] });
      queryClient.invalidateQueries({ queryKey: ['brain-document-counts'] });
      queryClient.invalidateQueries({ queryKey: ['brain-total-count'] });
      queryClient.invalidateQueries({ queryKey: ['brain-documents-as-files'] });
      toast.success('Document uploaded successfully. Click "Index" to add to knowledge base.');
    },
    onError: (error) => {
      toast.error('Failed to upload document: ' + error.message);
    },
  });
}

export function useUpdateBrainDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<BrainDocument, 'name' | 'description' | 'category' | 'restricted_agents' | 'is_pinned'>>;
    }) => {
      const { data, error } = await supabase
        .from('brain_documents')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Document not found or update failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-documents'] });
      queryClient.invalidateQueries({ queryKey: ['brain-documents-as-files'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Document updated');
    },
    onError: (error) => {
      toast.error('Failed to update document: ' + error.message);
    },
  });
}

export function useDeleteBrainDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      // Delete embeddings first (fire and forget - don't block on this)
      import('@/hooks/useKnowledgeEmbeddings').then(({ processEmbedding }) => {
        processEmbedding({
          action: 'delete',
          source_type: 'brain_document',
          source_id: id,
        }).catch(console.error);
      });

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('brain-documents')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete document record
      const { error } = await supabase
        .from('brain_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Delete any linked file records in the files table
      // Match by storage_path since that's the common identifier
      await supabase
        .from('files')
        .delete()
        .eq('storage_path', storagePath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-documents'] });
      queryClient.invalidateQueries({ queryKey: ['brain-documents-agent'] });
      queryClient.invalidateQueries({ queryKey: ['brain-document-counts'] });
      queryClient.invalidateQueries({ queryKey: ['brain-total-count'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Document deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete document: ' + error.message);
    },
  });
}

export function getBrainDocumentUrl(storagePath: string) {
  const { data } = supabase.storage.from('brain-documents').getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Get all documents visible to a specific agent:
 * - Documents in the agent's dedicated section
 * - Documents from General Knowledge where restricted_agents includes this agent
 */
export function useBrainDocumentsForAgent(agentId: string | null, category?: BrainCategory) {
  return useQuery({
    queryKey: ['brain-documents-agent', agentId, category],
    queryFn: async () => {
      if (!agentId) return [];

      // For general section, just get general docs
      if (agentId === 'general') {
        const { data: generalSection } = await supabase
          .from('brain_sections')
          .select('id')
          .eq('type', 'general')
          .single();
        
        if (!generalSection) return [];
        
        let query = supabase
          .from('brain_documents')
          .select('*')
          .eq('section_id', generalSection.id)
          .order('sort_order', { ascending: true });
        
        if (category) {
          query = query.eq('category', category);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data as BrainDocument[];
      }

      // For agent-specific pages, get:
      // 1. Documents in the agent's dedicated section
      // 2. Documents from General with restricted_agents containing this agent
      
      const { data: sections } = await supabase
        .from('brain_sections')
        .select('id, type, agent_id');
      
      const agentSection = sections?.find(s => s.agent_id === agentId);
      const generalSection = sections?.find(s => s.type === 'general');
      
      const sectionIds = [agentSection?.id, generalSection?.id].filter(Boolean) as string[];
      
      if (sectionIds.length === 0) return [];
      
      // Get all docs from both sections
      let query = supabase
        .from('brain_documents')
        .select('*')
        .in('section_id', sectionIds)
        .order('sort_order', { ascending: true });
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data: allDocs, error } = await query;
      
      if (error) throw error;
      
      // Filter: include if from agent section OR if restricted to this agent
      return (allDocs || []).filter(doc => {
        if (doc.section_id === agentSection?.id) return true;
        // From general section: include if agent is in restricted list
        if (doc.section_id === generalSection?.id) {
          if (!doc.restricted_agents) return false; // General docs without restriction don't show on agent pages
          return doc.restricted_agents.includes(agentId);
        }
        return false;
      }) as BrainDocument[];
    },
    enabled: !!agentId,
  });
}

/**
 * Reorder brain documents by updating their sort_order values
 */
export function useReorderBrainDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      // Batch update all sort orders
      const promises = updates.map(({ id, sort_order }) =>
        supabase
          .from('brain_documents')
          .update({ sort_order })
          .eq('id', id)
      );
      const results = await Promise.all(promises);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error?.message || 'Failed to reorder documents');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-documents'] });
      queryClient.invalidateQueries({ queryKey: ['brain-documents-agent'] });
      toast.success('Documents reordered');
    },
    onError: (error) => {
      toast.error('Failed to reorder documents: ' + error.message);
    },
  });
}
