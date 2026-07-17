"use client";

/**
 * PVSource (stage 1): pick the finished episode this video run works from.
 * Episodes come from podcast_episodes (created at Podcast Studio finalize).
 */

import { Loader2, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { useCreateOmniRun } from '@/hooks/omni';
import { usePodcastEpisodes, type EpisodeRow } from '@/hooks/omni/usePodcastEpisodes';
import { VIDEO_SCHEMA_VERSION } from '../stepRegistry';
import type { OmniImagesState } from '@/hooks/omni';

interface PVSourceProps {
  state: OmniImagesState;
  runId: string | null;
  onRunCreated: (runId: string, seeded: OmniImagesState) => void;
  onPicked: (episodeId: string) => void;
}

export function PVSource({ state, runId, onRunCreated, onPicked }: PVSourceProps) {
  const { data: episodes = [], isLoading } = usePodcastEpisodes();
  const createRun = useCreateOmniRun();
  const [working, setWorking] = useState(false);

  const pick = async (episode: EpisodeRow) => {
    if (!episode.audio_path) {
      toast.error('That episode has no audio file yet.');
      return;
    }
    setWorking(true);
    try {
      if (!runId) {
        const created = await createRun.mutateAsync({
          mode: 'podcast_video',
          title: `${episode.title} — video`.slice(0, 80),
          current_step: 2,
          step_state: {
            podcast_episode_id: episode.id,
            video_schema_version: VIDEO_SCHEMA_VERSION,
            max_step_reached: 2,
          },
        });
        onRunCreated(created.id, (created.step_state ?? {}) as OmniImagesState);
        return;
      }
      onPicked(episode.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start the run');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pick a finished episode. Episodes are created at Podcast Studio&apos;s finalize stage.
      </p>
      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-border py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {!isLoading && episodes.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
          No episodes yet. Produce one in Podcast Studio first.
        </p>
      )}
      {episodes.map((episode) => (
        <button
          key={episode.id}
          type="button"
          disabled={working}
          onClick={() => void pick(episode)}
          aria-pressed={state.podcast_episode_id === episode.id}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors duration-200 hover:border-pink-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
            <Radio className="h-4 w-4 text-pink-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{episode.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {episode.duration_s ? `≈${Math.max(1, Math.round(episode.duration_s / 60))} min · ` : ''}
              {episode.status}
              {!episode.cover_path && ' · no cover art (the audiogram needs one)'}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
