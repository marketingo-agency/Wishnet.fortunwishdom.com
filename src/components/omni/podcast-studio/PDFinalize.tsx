"use client";

/**
 * PDFinalize (stage 5): the finished episode — player, download, and the
 * DRAFT podcast_episodes row (the feed generator reads that table, never
 * step_state). Duration here is the word-count estimate; publish (Phase 9)
 * probes the real value before the RSS enclosure is written.
 */

import { useEffect, useMemo, useState } from 'react';
import { Check, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { downloadFromUrl } from '@/lib/downloadFromUrl';
import { pollAudioAsset } from '@/hooks/omni/usePodcastRender';
import { usePodcastChunks } from '@/hooks/omni/usePodcastRender';
import type { OmniImagesState } from '@/hooks/omni';

interface PDFinalizeProps {
  state: OmniImagesState;
  runId: string;
  persist: (ordinal: number, patch: Partial<OmniImagesState> | ((prev: OmniImagesState) => Partial<OmniImagesState>)) => Promise<void>;
  onFinish: () => void;
}

export function PDFinalize({ state, runId, persist, onFinish }: PDFinalizeProps) {
  const outline = state.podcast_outline!;
  const notes = state.podcast_shownotes ?? { title: outline.title, description: '', tags: [] };
  const { data: chunks = [] } = usePodcastChunks(runId);
  const [episodeUrl, setEpisodeUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const durationEstimateS = useMemo(
    () => chunks.reduce((n, c) => n + (c.metadata?.duration_s ?? 0), 0),
    [chunks],
  );

  useEffect(() => {
    if (!state.episode_asset_id) return;
    let cancelled = false;
    void pollAudioAsset(state.episode_asset_id).then((entry) => {
      if (!cancelled && entry.status === 'done') setEpisodeUrl(entry.url ?? null);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [state.episode_asset_id]);

  const download = async () => {
    if (!episodeUrl) return;
    try {
      await downloadFromUrl(episodeUrl, `${(notes.title || 'episode').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'episode'}.mp3`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed');
    }
  };

  const createDraftEpisode = async () => {
    if (!state.podcast_show_id) {
      toast.error('This run has no show. Set one in stage 1.');
      return;
    }
    if (!state.episode_asset_id) return;
    setCreating(true);
    try {
      const { data: asset, error: assetError } = await supabase
        .from('omni_assets')
        .select('storage_path, metadata')
        .eq('id', state.episode_asset_id)
        .single();
      if (assetError) throw assetError;
      const assetRow = asset as { storage_path: string | null; metadata: { byte_size?: number } | null };
      if (!assetRow.storage_path) throw new Error('The episode file is not persisted yet');
      const { data: episode, error } = await supabase
        .from('podcast_episodes')
        .insert({
          show_id: state.podcast_show_id,
          run_id: runId,
          title: notes.title || outline.title,
          description: notes.description || null,
          audio_path: assetRow.storage_path,
          cover_path: state.podcast_cover_path ?? null,
          duration_s: durationEstimateS || null,
          bytes: assetRow.metadata?.byte_size ?? null,
          chapters: outline.chapters as unknown as never,
          status: 'draft',
        })
        .select('id')
        .single();
      if (error) throw error;
      await persist(5, { podcast_episode_id: (episode as { id: string }).id });
      toast.success('Draft episode created.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the episode');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">{notes.title || outline.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {outline.chapters.length} chapters · ≈{Math.max(1, Math.round(durationEstimateS / 60))} min (estimate — publish probes the real duration)
        </p>
        {notes.description && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{notes.description}</p>
        )}
        {episodeUrl ? (
          <audio controls src={episodeUrl} className="mt-3 w-full" aria-label="Final episode" />
        ) : (
          <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
            <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
            Fetching the episode file…
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void download()} disabled={!episodeUrl} className="cursor-pointer gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Download MP3
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Episode record</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              A draft row in the show&apos;s episode list — Publish &amp; Feed (Phase 9) takes it live on the RSS feed.
            </p>
          </div>
          {state.podcast_episode_id ? (
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600 [[data-omni-theme=dark]_&]:text-emerald-400">
              <Check className="h-4 w-4" />
              Draft created
            </span>
          ) : (
            <Button
              size="sm"
              onClick={() => void createDraftEpisode()}
              disabled={creating || !state.episode_asset_id}
              className="cursor-pointer gap-1.5 bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
            >
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create draft episode
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => { setFinishing(true); onFinish(); }}
          disabled={finishing}
          className="cursor-pointer gap-1.5 bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
        >
          {finishing && <Loader2 className="h-4 w-4 animate-spin" />}
          Finish
        </Button>
      </div>
    </div>
  );
}
