"use client";

/**
 * PDPackage (stage 4): assemble the chunks (+jingles) into ONE episode MP3
 * via merge-audios, then the listing package — show notes and cover art.
 * No episode-level loudnorm (Phase 0 verdict: it emits uncompressed WAV);
 * ElevenLabs-native consistency is the v1 mastering.
 */

import { useEffect, useState } from 'react';
import { Check, Image as ImageIcon, Loader2, Merge, Sparkles, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { callOmniPodcast } from '@/lib/omniApi';
import { pollAudioAsset } from '@/hooks/omni/usePodcastRender';
import type { OmniImagesState } from '@/hooks/omni';

interface PDPackageProps {
  state: OmniImagesState;
  runId: string;
  persist: (ordinal: number, patch: Partial<OmniImagesState> | ((prev: OmniImagesState) => Partial<OmniImagesState>)) => Promise<void>;
  onNext: () => void;
}

export function PDPackage({ state, runId, persist, onNext }: PDPackageProps) {
  const outline = state.podcast_outline!;
  const [assembling, setAssembling] = useState(false);
  const [episodeStatus, setEpisodeStatus] = useState<'idle' | 'assembling' | 'done' | 'failed'>(
    state.render_stage === 'done' ? 'done' : state.episode_asset_id ? 'assembling' : 'idle',
  );
  const [episodeUrl, setEpisodeUrl] = useState<string | null>(null);
  const [notesBusy, setNotesBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const notes = state.podcast_shownotes ?? { title: outline.title, description: '', tags: [] };

  // Poll the assembling episode to its terminal state (survives reloads;
  // the finisher persists it if the tab closed).
  useEffect(() => {
    if (!state.episode_asset_id || episodeStatus === 'done' || episodeStatus === 'failed') return;
    let cancelled = false;
    const check = async () => {
      try {
        const entry = await pollAudioAsset(state.episode_asset_id!);
        if (cancelled) return;
        if (entry.status === 'done') {
          setEpisodeStatus('done');
          setEpisodeUrl(entry.url ?? null);
          await persist(4, { render_stage: 'done' });
        } else if (entry.status === 'failed') {
          setEpisodeStatus('failed');
          toast.error(entry.error || 'Episode assembly failed');
        } else {
          setEpisodeStatus('assembling');
          setTimeout(() => { if (!cancelled) void check(); }, 6000);
        }
      } catch {
        setTimeout(() => { if (!cancelled) void check(); }, 10_000);
      }
    };
    void check();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.episode_asset_id]);

  const assemble = async () => {
    setAssembling(true);
    try {
      const res = await callOmniPodcast<{ asset_id: string }>('podcast-assemble', {
        run_id: runId,
        intro_jingle_asset_id: state.intro_jingle_asset_id,
        outro_jingle_asset_id: state.outro_jingle_asset_id,
      });
      setEpisodeStatus('assembling');
      await persist(4, { episode_asset_id: res.asset_id, render_stage: 'assembling' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Assembly could not be submitted');
    } finally {
      setAssembling(false);
    }
  };

  const generateNotes = async () => {
    setNotesBusy(true);
    try {
      const sample = Object.values(state.podcast_script ?? {}).flat().slice(0, 12)
        .map((s) => `${s.speaker}: ${s.text}`).join('\n');
      const res = await callOmniPodcast<{ title: string; description: string; tags: string[] }>('podcast-shownotes', {
        outline: outline.chapters,
        episode_title: outline.title,
        script_sample: sample,
      });
      await persist(4, { podcast_shownotes: { title: res.title || outline.title, description: res.description, tags: res.tags } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Show notes generation failed');
    } finally {
      setNotesBusy(false);
    }
  };

  const generateCover = async () => {
    setCoverBusy(true);
    try {
      const res = await callOmniPodcast<{ cover_path: string; url: string | null }>('podcast-cover', {
        run_id: runId,
        prompt: `${outline.title}. ${notes.description.slice(0, 300)}`,
      });
      setCoverUrl(res.url);
      await persist(4, { podcast_cover_path: res.cover_path });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cover generation failed');
    } finally {
      setCoverBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Assemble the episode</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Chapters{state.intro_jingle_asset_id ? ' + intro' : ''}{state.outro_jingle_asset_id ? ' + outro' : ''} merge into one MP3.
            </p>
          </div>
          {episodeStatus === 'idle' && (
            <Button onClick={() => void assemble()} disabled={assembling} className="cursor-pointer gap-1.5 bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90">
              {assembling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Merge className="h-4 w-4" />}
              Assemble
            </Button>
          )}
          {episodeStatus === 'assembling' && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" />
              Merging…
            </span>
          )}
          {episodeStatus === 'done' && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 [[data-omni-theme=dark]_&]:text-emerald-400">
              <Check className="h-4 w-4" />
              Ready
            </span>
          )}
          {episodeStatus === 'failed' && (
            <Button variant="outline" size="sm" onClick={() => void assemble()} className="cursor-pointer gap-1.5 text-xs">
              <XCircle className="h-3.5 w-3.5 text-destructive" />
              Retry
            </Button>
          )}
        </div>
        {episodeUrl && (
          <audio controls src={episodeUrl} className="mt-3 w-full" aria-label="Assembled episode preview" />
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Show notes</h2>
          <Button variant="outline" size="sm" onClick={() => void generateNotes()} disabled={notesBusy} className="h-7 cursor-pointer gap-1 text-xs">
            {notesBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="pd-notes-title">Listing title</Label>
            <Input
              id="pd-notes-title"
              value={notes.title}
              onChange={(e) => void persist(4, { podcast_shownotes: { ...notes, title: e.target.value } })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pd-notes-desc">Description</Label>
            <Textarea
              id="pd-notes-desc"
              value={notes.description}
              onChange={(e) => void persist(4, { podcast_shownotes: { ...notes, description: e.target.value } })}
              rows={4}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pd-notes-tags">Tags (comma-separated)</Label>
            <Input
              id="pd-notes-tags"
              value={notes.tags.join(', ')}
              onChange={(e) => void persist(4, { podcast_shownotes: { ...notes, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) } })}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Cover art</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Square episode art from the title and description.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void generateCover()} disabled={coverBusy} className="h-7 cursor-pointer gap-1 text-xs">
            {coverBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
            {state.podcast_cover_path ? 'Regenerate' : 'Generate'}
          </Button>
        </div>
        {coverUrl ? (
          <img src={coverUrl} alt="Episode cover art" className="mt-3 h-40 w-40 rounded-xl border border-border object-cover" />
        ) : state.podcast_cover_path ? (
          <p className="mt-2 text-[11px] text-muted-foreground">Cover saved{coverBusy ? '' : ' (preview appears after regeneration)'}.</p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={episodeStatus !== 'done'}
          className="cursor-pointer bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Finalize
        </Button>
      </div>
    </div>
  );
}
