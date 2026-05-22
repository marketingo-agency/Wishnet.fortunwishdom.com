/**
 * usePulseDrafts — CRUD for the pulse_drafts content spine.
 * pulse_drafts has authenticated-CRUD RLS (no secrets), so we query the typed
 * browser client directly — no edge round-trip.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { PulseDraft, PulseDraftStatus, PulseMediaRef, PulsePostType } from '@/types/pulse';

type DraftRow = Database['public']['Tables']['pulse_drafts']['Row'];

function mapRow(row: DraftRow): PulseDraft {
  return {
    ...row,
    post_type: row.post_type as PulsePostType,
    status: row.status as PulseDraftStatus,
    media_refs: Array.isArray(row.media_refs) ? (row.media_refs as unknown as PulseMediaRef[]) : [],
    external_post_ids:
      row.external_post_ids && typeof row.external_post_ids === 'object' && !Array.isArray(row.external_post_ids)
        ? (row.external_post_ids as Record<string, string>)
        : {},
  };
}

export interface PulseDraftFilters {
  status?: PulseDraftStatus | 'all';
  platform?: string | 'all';
  search?: string;
}

export function usePulseDrafts(filters: PulseDraftFilters = {}) {
  return useQuery({
    queryKey: ['pulse-drafts', filters],
    queryFn: async () => {
      let query = supabase.from('pulse_drafts').select('*').order('created_at', { ascending: false });
      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters.platform && filters.platform !== 'all') query = query.contains('platforms', [filters.platform]);
      if (filters.search) query = query.ilike('caption', `%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    staleTime: 15_000,
  });
}

export interface CreateDraftInput {
  profile_username?: string | null;
  platforms?: string[];
  post_type?: PulsePostType;
  title?: string | null;
  caption?: string | null;
  media_refs?: PulseMediaRef[];
  status?: PulseDraftStatus;
  scheduled_date?: string | null;
  timezone?: string | null;
  generated_by?: string | null;
  campaign_id?: string | null;
}

export function useCreatePulseDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDraftInput) => {
      const { data, error } = await supabase
        .from('pulse_drafts')
        .insert({ ...input, media_refs: (input.media_refs ?? []) as unknown as DraftRow['media_refs'] })
        .select('*')
        .single();
      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-drafts'] });
      toast.success('Draft saved');
    },
    onError: (error) => {
      toast.error('Failed to save draft', { description: error instanceof Error ? error.message : 'Unknown error' });
    },
  });
}

export interface UpdateDraftInput extends CreateDraftInput {
  id: string;
}

export function useUpdatePulseDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, media_refs, ...patch }: UpdateDraftInput) => {
      const payload: Database['public']['Tables']['pulse_drafts']['Update'] = {
        ...patch,
        updated_at: new Date().toISOString(),
        ...(media_refs ? { media_refs: media_refs as unknown as DraftRow['media_refs'] } : {}),
      };
      const { data, error } = await supabase.from('pulse_drafts').update(payload).eq('id', id).select('*').single();
      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-drafts'] });
      toast.success('Draft updated');
    },
    onError: (error) => {
      toast.error('Failed to update draft', { description: error instanceof Error ? error.message : 'Unknown error' });
    },
  });
}

export function useDeletePulseDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pulse_drafts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-drafts'] });
      toast.success('Draft deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete draft', { description: error instanceof Error ? error.message : 'Unknown error' });
    },
  });
}
