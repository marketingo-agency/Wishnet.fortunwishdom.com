/**
 * Episode rows for the Podcast to Video wizard (Plan 3 Phase 8).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EpisodeRow {
  id: string;
  show_id: string;
  title: string;
  description: string | null;
  audio_path: string | null;
  cover_path: string | null;
  duration_s: number | null;
  status: string;
}

export function usePodcastEpisodes() {
  return useQuery({
    queryKey: ['podcast-episodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('podcast_episodes')
        .select('id, show_id, title, description, audio_path, cover_path, duration_s, status')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as EpisodeRow[];
    },
  });
}
