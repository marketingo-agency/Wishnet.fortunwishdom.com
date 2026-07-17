"use client";

/**
 * PDPackage (stage 4): assemble the chunks (+jingles) into ONE episode MP3
 * via merge-audios, then the listing package — show notes and cover art.
 * No episode-level loudnorm (Phase 0 verdict: it emits uncompressed WAV);
 * TTS-native consistency is the v1 mastering.
 */

import { useEffect, useRef, useState } from 'react';
import { Check, Image as ImageIcon, Loader2, Merge, Sparkles, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { callOmniPodcast } from '@/lib/omniApi';
import { pollAudioAsset } from '@/hooks/omni/usePodcastRender';
import type { OmniImagesState } from '@/hooks/omni';

/** The assembly poll gives up after this long (the fal job itself continues;
 *  the finisher persists it and a revisit picks it up). */
const ASSEMBLY_POLL_MAX_MS = 20 * 60_000;

interface PDPackageProps {
  state: OmniImagesState;
  runId: string;
  persist: (ordinal: number, patch: Partial<OmniImagesState> | ((prev: OmniImagesState) => Partial<OmniImagesState>)) => Promise<void>;
  onNext: () => void;
}

export function PDPackage({ state, runId, persist, onNext }: PDPackageProps) {
  const outline = state.podcast_outline!;
  const [assembling, setAssembling] = useState(false);
  const [episodeStatus, setEpisodeStatus] = useState<'idle' | 'assembling' | 'done' | 'failed' | 'stalled'>(
    state.episode_asset_id ? 'assembling' : 'idle',
  );
  const [episodeUrl, setEpisodeUrl] = useState<string | null>(null);
  const [pollToken, setPollToken] = useState(0);
  const [notesBusy, setNotesBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const notes = state.podcast_shownotes ?? { title: outline.title, description: '', tags: [] };
  // Notes edits buffer locally and persist on blur (QA W5).
  const [notesDraft, setNotesDraft] = useState(notes);
  const notesKey = `${notes.title}|${notes.description}|${notes.tags.join(',')}`;
  useEffect(() => {
    setNotesDraft(state.podcast_shownotes ?? { title: outline.title, description: '', tags: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesKey]);
  const commitNotes = () => void persist(4, { podcast_shownotes: notesDraft });

  // Resume discovery (QA Critical): the finisher may have assembled while the
  // tab was closed WITHOUT touching step_state - adopt its episode row so a
  // second (paid) Assemble is never offered for an already-assembling run.
  const adopted = useRef(false);
  useEffect(() => {
    if (state.episode_asset_id || adopted.current) return;
    adopted.current = true;
    void (async () => {
      const { data } = await supabase
        .from('omni_assets')
        .select('id, status, metadata')
        .eq('run_id', runId)
        .eq('kind', 'audio')
        .neq('status', 'failed');
      const episode = ((data ?? []) as { id: string; metadata: { kind?: string } | null }[])
        .find((a) => a.metadata?.kind === 'podcast_episode');
      if (episode) {
        setEpisodeStatus('assembling');
        await persist(4, { episode_asset_id: episode.id, render_stage: 'assembling' });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.episode_asset_id, runId]);

  // Poll the assembling episode to its terminal state (survives reloads; the
  // finisher persists it if the tab closed). Bails after 20 minutes with an
  // honest note instead of spinning forever on a stalled fal queue.
  useEffect(() => {
    if (!state.episode_asset_id || episodeStatus === 'failed') return;
    let cancelled = false;
    const startedAt = Date.now();
    const check = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt > ASSEMBLY_POLL_MAX_MS) {
        setEpisodeStatus('stalled');
        return;
      }
      try {
        const entry = await pollAudioAsset(state.episode_asset_id!);
        if (cancelled) return;
        if (entry.status === 'done') {
          setEpisodeStatus('done');
          setEpisodeUrl(entry.url ?? null);
          if (state.render_stage !== 'done') await persist(4, { render_stage: 'done' });
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
  }, [state.episode_asset_id, pollToken]);

  const assemble = async () => {
    setAssembling(true);
    try {
      const res = await callOmniPodcast<{ asset_id: string; already_assembling?: boolean }>('podcast-assemble', {
        run_id: runId,
        intro_jingle_asset_id: state.intro_jingle_asset_id,
        outro_jingle_asset_id: state.outro_jingle_asset_id,
      });
      setEpisodeStatus('assembling');
      await persist(4, { episode_asset_id: res.asset_id, render_stage: 'assembling' });
      if (res.already_assembling) toast.info('An assembly was already running - tracking it.');
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
          {episodeStatus === 'stalled' && (
            <Button variant="outline" size="sm" onClick={() => setPollToken((t) => t + 1)} className="cursor-pointer gap-1.5 text-xs">
              <Loader2 className="h-3.5 w-3.5" />
              Check again
            </Button>
          )}
          {episodeStatus === 'done' && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 [[data-omni-theme=dark]_&]:text-emerald-400">
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
        {episodeStatus === 'stalled' && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            The merge is taking unusually long. It continues on the server - check again in a bit, or come back later.
          </p>
        )}
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
              value={notesDraft.title}
              onChange={(e) => setNotesDraft((prev) => ({ ...prev, title: e.target.value }))}
              onBlur={commitNotes}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pd-notes-desc">Description</Label>
            <Textarea
              id="pd-notes-desc"
              value={notesDraft.description}
              onChange={(e) => setNotesDraft((prev) => ({ ...prev, description: e.target.value }))}
              onBlur={commitNotes}
              rows={4}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pd-notes-tags">Tags (comma-separated)</Label>
            <Input
              id="pd-notes-tags"
              value={notesDraft.tags.join(', ')}
              onChange={(e) => setNotesDraft((prev) => ({ ...prev, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }))}
              onBlur={commitNotes}
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
