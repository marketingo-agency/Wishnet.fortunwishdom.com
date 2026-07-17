"use client";

/**
 * PVGenerate (stage 3): build the audiogram (compose: cover + audio → MP4)
 * and cut highlight clips from it (trim-video per window). Both ride the
 * LIVE omni-video utility surface; outputs are pollable video assets.
 */

import { useState } from 'react';
import { Check, Film, Loader2, Plus, Scissors, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { callOmniVideo } from '@/lib/omniApi';
import { usePolledAsset } from '@/hooks/omni/useVideoAudio';
import { usePodcastEpisodes } from '@/hooks/omni/usePodcastEpisodes';
import type { OmniImagesState } from '@/hooks/omni';

interface PVGenerateProps {
  state: OmniImagesState;
  runId: string;
  persist: (ordinal: number, patch: Partial<OmniImagesState> | ((prev: OmniImagesState) => Partial<OmniImagesState>)) => Promise<void>;
  onNext: () => void;
}

interface ClipWindow {
  start: number;
  end: number;
}

function ClipRow({ assetId, index }: { assetId: string; index: number }) {
  const clip = usePolledAsset(assetId);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-xs font-medium">Clip {index + 1}</p>
      {clip.status === 'done' && clip.url ? (
        <video src={clip.url} controls preload="metadata" className="h-20 rounded-md" aria-label={`Highlight clip ${index + 1}`} />
      ) : clip.status === 'failed' ? (
        <span className="flex items-center gap-1 text-[11px] text-destructive"><XCircle className="h-3.5 w-3.5" />{clip.error}</span>
      ) : (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Cutting…</span>
      )}
    </div>
  );
}

export function PVGenerate({ state, runId, persist, onNext }: PVGenerateProps) {
  const { data: episodes = [] } = usePodcastEpisodes();
  const episode = episodes.find((e) => e.id === state.podcast_episode_id) ?? null;
  const audiogram = usePolledAsset(state.pv_audiogram_asset_id);
  const [building, setBuilding] = useState(false);
  const [cutting, setCutting] = useState(false);
  const [windows, setWindows] = useState<ClipWindow[]>([{ start: 0, end: 30 }]);
  const clipIds = state.pv_clip_asset_ids ?? [];

  const signOwn = async (path: string): Promise<string> => {
    const { data, error } = await supabase.storage.from('omni-audio').createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Could not sign the file');
    return data.signedUrl;
  };

  const buildAudiogram = async () => {
    if (!episode?.audio_path) {
      toast.error('The episode has no audio file.');
      return;
    }
    if (!episode.cover_path) {
      toast.error('The episode has no cover art. Generate one in Podcast Studio stage 4.');
      return;
    }
    setBuilding(true);
    try {
      const [audioUrl, coverUrl] = await Promise.all([signOwn(episode.audio_path), signOwn(episode.cover_path)]);
      const durationMs = Math.max(1000, Math.round((episode.duration_s ?? 60) * 1000));
      const res = await callOmniVideo<{ asset_id: string }>('video-utility', {
        run_id: runId,
        op: 'fal-ai/ffmpeg-api/compose',
        input: {
          tracks: [
            { id: 'art', type: 'video', keyframes: [{ url: coverUrl, timestamp: 0, duration: durationMs }] },
            { id: 'voice', type: 'audio', keyframes: [{ url: audioUrl, timestamp: 0, duration: durationMs }] },
          ],
        },
      });
      await persist(3, { pv_audiogram_asset_id: res.asset_id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Audiogram could not be started');
    } finally {
      setBuilding(false);
    }
  };

  const cutClips = async () => {
    if (audiogram.status !== 'done' || !audiogram.url) return;
    const valid = windows.filter((w) => w.end > w.start && w.start >= 0);
    if (valid.length === 0) {
      toast.error('Add at least one valid time window.');
      return;
    }
    setCutting(true);
    try {
      for (const w of valid) {
        const res = await callOmniVideo<{ asset_id: string }>('video-utility', {
          run_id: runId,
          op: 'fal-ai/workflow-utilities/trim-video',
          input: { video_url: audiogram.url, start_time: w.start, end_time: w.end },
        });
        await persist(3, (prev) => ({ pv_clip_asset_ids: [...(prev.pv_clip_asset_ids ?? []), res.asset_id] }));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Clip cutting could not be started');
    } finally {
      setCutting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Film className="h-4 w-4 text-pink-400" />
              Audiogram
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {episode ? episode.title : 'Episode not found — go back to stage 1.'}
            </p>
          </div>
          {!state.pv_audiogram_asset_id && (
            <Button
              onClick={() => void buildAudiogram()}
              disabled={building || !episode}
              className="cursor-pointer gap-1.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
            >
              {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
              Build
            </Button>
          )}
          {state.pv_audiogram_asset_id && audiogram.status !== 'done' && audiogram.status !== 'failed' && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" />
              Composing…
            </span>
          )}
          {audiogram.status === 'done' && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 [[data-omni-theme=dark]_&]:text-emerald-400">
              <Check className="h-4 w-4" />
              Ready
            </span>
          )}
          {audiogram.status === 'failed' && (
            <Button variant="outline" size="sm" onClick={() => void buildAudiogram()} className="cursor-pointer gap-1 text-xs">
              <XCircle className="h-3.5 w-3.5 text-destructive" />
              Retry
            </Button>
          )}
        </div>
        {audiogram.status === 'failed' && audiogram.error && (
          <p className="mt-2 text-[11px] text-destructive">{audiogram.error}</p>
        )}
        {audiogram.status === 'done' && audiogram.url && (
          <video src={audiogram.url} controls preload="metadata" className="mt-3 max-h-64 w-full rounded-lg" aria-label="Episode audiogram" />
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Scissors className="h-4 w-4 text-rose-400" />
          Highlight clips
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Seconds from the start of the episode. Clips cut from the finished audiogram.
        </p>
        <div className="mt-3 space-y-2">
          {windows.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={w.start}
                onChange={(e) => setWindows((prev) => prev.map((x, j) => (j === i ? { ...x, start: Math.max(0, Number(e.target.value) || 0) } : x)))}
                className="w-24"
                aria-label={`Clip ${i + 1} start (seconds)`}
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="number"
                min={1}
                value={w.end}
                onChange={(e) => setWindows((prev) => prev.map((x, j) => (j === i ? { ...x, end: Math.max(1, Number(e.target.value) || 0) } : x)))}
                className="w-24"
                aria-label={`Clip ${i + 1} end (seconds)`}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setWindows((prev) => prev.filter((_, j) => j !== i))}
                disabled={windows.length <= 1}
                aria-label={`Remove clip window ${i + 1}`}
                className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWindows((prev) => [...prev, { start: 0, end: 30 }])}
              disabled={windows.length >= 6}
              className="cursor-pointer gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add window
            </Button>
            <Button
              size="sm"
              onClick={() => void cutClips()}
              disabled={cutting || audiogram.status !== 'done'}
              className="cursor-pointer gap-1.5 bg-gradient-to-r from-pink-500 to-rose-600 text-xs text-white transition-all duration-300 hover:opacity-90"
            >
              {cutting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />}
              Cut clips
            </Button>
          </div>
          {audiogram.status !== 'done' && (
            <p className="text-[11px] italic text-muted-foreground/70">Build the audiogram first.</p>
          )}
        </div>
        {clipIds.length > 0 && (
          <div className="mt-3 space-y-2">
            {clipIds.map((id, i) => (
              <ClipRow key={id} assetId={id} index={i} />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={audiogram.status !== 'done'}
          className="cursor-pointer bg-gradient-to-r from-pink-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Formats &amp; finalize
        </Button>
      </div>
    </div>
  );
}
