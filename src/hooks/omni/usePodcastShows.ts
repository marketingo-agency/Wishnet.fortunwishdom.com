/**
 * Podcast shows data layer (Plan 3, D-A1). Shows carry the per-show default
 * cast (speaker label -> persona id) used by the scenario/studio wizards.
 * Show deletion is deliberately absent here: a show owns published episodes
 * and its feed URL is permanent — teardown belongs to Publish & Feed (Phase 9).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface PodcastShow {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  language: string;
  category: string | null;
  artwork_path: string | null;
  feed_config: Json;
  default_cast: Json;
  created_at: string;
  updated_at: string;
}

/** default_cast shape: speaker label (e.g. "HOST") -> persona id. */
export type DefaultCast = Record<string, string>;

export function castFromJson(value: Json): DefaultCast {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: DefaultCast = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'show';
}

export function usePodcastShows() {
  return useQuery({
    queryKey: ['podcast-shows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('podcast_shows')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PodcastShow[];
    },
  });
}

function useInvalidateShows() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['podcast-shows'] });
}

export function useCreateShow() {
  const invalidate = useInvalidateShows();
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not authenticated');
      // The slug is unique across the table (it becomes the feed URL, which is
      // permanent) — suffix on collision instead of failing the create.
      const base = slugify(name);
      for (let attempt = 0; attempt < 5; attempt++) {
        const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
        const { data, error } = await supabase
          .from('podcast_shows')
          .insert({ name: name.trim(), slug, user_id: userData.user.id })
          .select()
          .single();
        if (!error) return data as unknown as PodcastShow;
        if (error.code !== '23505') throw error;
      }
      throw new Error('Could not find a free slug for this show name');
    },
    onSuccess: (show) => {
      invalidate();
      toast.success(`Show "${show.name}" created`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateShow() {
  const invalidate = useInvalidateShows();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<Pick<PodcastShow, 'name' | 'description' | 'language' | 'category'>> & { default_cast?: DefaultCast }) => {
      const { error } = await supabase
        .from('podcast_shows')
        .update(input as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Show saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
