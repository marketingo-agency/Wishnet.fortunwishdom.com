/**
 * Podcast Studio render runner (Plan 3 D-A3.3): chunk rows live in
 * omni_assets; the edge renders ONE pending chunk per invocation under
 * waitUntil, so the client paces the chain — poll the rows, kick the next
 * render when nothing is in flight, stop when all chunks are done. The
 * omni-finisher's TTS sweep takes over when the tab closes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { callOmniPodcast } from '@/lib/omniApi';

export interface PodcastChunkRow {
  id: string;
  status: string;
  error: string | null;
  metadata: { kind?: string; chapter_idx?: number; duration_s?: number; fal_request_id?: string } | null;
}

const POLL_MS = 6000;
/** Client-side bail (the Plan 2 lesson): the edge stale-fails a silent chunk
 *  at 15 min; the client stops polling shortly after. */
const MAX_POLL_MS = 20 * 60_000;

export function usePodcastChunks(runId: string | null) {
  return useQuery({
    queryKey: ['podcast-chunks', runId],
    queryFn: async () => {
      if (!runId) return [];
      const { data, error } = await supabase
        .from('omni_assets')
        .select('id, status, error, metadata')
        .eq('run_id', runId)
        .eq('kind', 'audio')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as PodcastChunkRow[])
        .filter((r) => r.metadata?.kind === 'podcast_chunk')
        .sort((a, b) => (a.metadata?.chapter_idx ?? 0) - (b.metadata?.chapter_idx ?? 0));
    },
    enabled: !!runId,
  });
}

interface RenderChapterPayload {
  idx: number;
  lines: { text: string; voice_id: string }[];
}

export function usePodcastRenderRunner(runId: string | null) {
  const queryClient = useQueryClient();
  const chunksQuery = usePodcastChunks(runId);
  const chunks = chunksQuery.data ?? [];
  const [active, setActive] = useState(false);
  const startedAt = useRef(0);
  const busy = useRef(false);

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['podcast-chunks', runId] }),
    [queryClient, runId],
  );

  const start = useCallback(async (chapters: RenderChapterPayload[]) => {
    if (!runId) return;
    try {
      await callOmniPodcast('podcast-render', { run_id: runId, chapters });
      startedAt.current = Date.now();
      setActive(true);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Render could not start');
      throw e;
    }
  }, [runId, refresh]);

  /** Resume polling an in-flight render (page reload mid-render). */
  const resume = useCallback(() => {
    startedAt.current = Date.now();
    setActive(true);
  }, []);

  const retryChapter = useCallback(async (chunkId: string) => {
    // Failed rows flip back to pending (owner RLS allows the write), then the
    // next kick claims them.
    const { error } = await supabase
      .from('omni_assets')
      .update({ status: 'pending', error: null })
      .eq('id', chunkId)
      .eq('status', 'failed');
    if (error) {
      toast.error(error.message);
      return;
    }
    startedAt.current = Date.now();
    setActive(true);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (!active || !runId) return;
    const tick = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const { data } = await supabase
          .from('omni_assets')
          .select('id, status, metadata')
          .eq('run_id', runId)
          .eq('kind', 'audio');
        const rows = ((data ?? []) as unknown as PodcastChunkRow[]).filter((r) => r.metadata?.kind === 'podcast_chunk');
        const generating = rows.filter((r) => r.status === 'generating');
        const pending = rows.filter((r) => r.status === 'pending');
        if (generating.length > 0) {
          // podcast-poll also stale-fails silent workers server-side.
          await callOmniPodcast('podcast-poll', { asset_ids: generating.map((r) => r.id) }).catch(() => undefined);
        } else if (pending.length > 0) {
          await callOmniPodcast('podcast-render', { run_id: runId }).catch(() => undefined);
        } else {
          setActive(false);
        }
        await refresh();
        if (Date.now() - startedAt.current > MAX_POLL_MS) {
          setActive(false);
          toast.error('The render is taking unusually long. It continues in the background; check back or retry failed chapters.');
        }
      } finally {
        busy.current = false;
      }
    };
    void tick();
    const interval = setInterval(() => void tick(), POLL_MS);
    return () => clearInterval(interval);
  }, [active, runId, refresh]);

  return { chunks, isLoading: chunksQuery.isLoading, active, start, resume, retryChapter, refresh };
}

/** Poll a single fal-backed audio asset (jingle / assembled episode) until a
 *  terminal state; returns the latest poll entry. */
export interface AudioPollEntry {
  id: string;
  status: string;
  url?: string | null;
  error?: string | null;
  duration_s?: number | null;
}

export function pollAudioAsset(assetId: string): Promise<AudioPollEntry> {
  return callOmniPodcast<{ results: AudioPollEntry[] }>('podcast-poll', { asset_ids: [assetId] })
    .then((res) => {
      const entry = res.results.find((r) => r.id === assetId);
      if (!entry) throw new Error('The asset was not found');
      return entry;
    });
}
