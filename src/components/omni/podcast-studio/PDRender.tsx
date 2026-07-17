"use client";

/**
 * PDRender (stage 3): the chunked long-form render (D-A3.3). Chapters become
 * chunk rows server-side; the runner paces one render per invocation and the
 * finisher takes over when the tab closes (render_stage 'chunks' is the
 * signal). Intro/outro jingles generate here too (lyria2, ~$0.10 each).
 */

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Music, Play, RefreshCcw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { callOmniPodcast } from '@/lib/omniApi';
import { usePersonas } from '@/hooks/omni/usePersonas';
import { usePodcastRenderRunner, pollAudioAsset } from '@/hooks/omni/usePodcastRender';
import type { OmniImagesState } from '@/hooks/omni';

interface PDRenderProps {
  state: OmniImagesState;
  runId: string;
  persist: (ordinal: number, patch: Partial<OmniImagesState> | ((prev: OmniImagesState) => Partial<OmniImagesState>)) => Promise<void>;
  onNext: () => void;
}

function JingleControl({ kind, label, assetId, runId, onGenerated }: {
  kind: 'intro' | 'outro';
  label: string;
  assetId: string | undefined;
  runId: string;
  onGenerated: (assetId: string) => void;
}) {
  const [prompt, setPrompt] = useState('');
  // A restored id starts at 'generating'; the first poll promotes it (no
  // false green flash for a still-rendering jingle).
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'failed'>(assetId ? 'generating' : 'idle');
  const [url, setUrl] = useState<string | null>(null);

  // Poll an in-flight or restored jingle to its terminal state; bail after
  // 15 minutes instead of spinning forever on a stalled fal queue.
  useEffect(() => {
    if (!assetId || status === 'failed') return;
    let cancelled = false;
    const startedAt = Date.now();
    const check = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt > 15 * 60_000) {
        setStatus('failed');
        toast.error(`The ${kind} jingle is taking unusually long. Regenerate it, or come back later.`);
        return;
      }
      try {
        const entry = await pollAudioAsset(assetId);
        if (cancelled) return;
        if (entry.status === 'done') {
          setStatus('done');
          setUrl(entry.url ?? null);
        } else if (entry.status === 'failed') {
          setStatus('failed');
          toast.error(entry.error || `The ${kind} jingle failed`);
        } else {
          setStatus('generating');
          setTimeout(() => { if (!cancelled) void check(); }, 5000);
        }
      } catch {
        setTimeout(() => { if (!cancelled) void check(); }, 10_000);
      }
    };
    void check();
    return () => { cancelled = true; };
  }, [assetId, kind, status]);

  const generate = async () => {
    setStatus('generating');
    try {
      const res = await callOmniPodcast<{ asset_id: string }>('podcast-jingle', {
        run_id: runId,
        kind,
        prompt: prompt.trim() || undefined,
      });
      onGenerated(res.asset_id);
    } catch (e) {
      setStatus('idle');
      toast.error(e instanceof Error ? e.message : 'Jingle generation failed');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Music className="h-3.5 w-3.5 text-rose-400" />
          <span className="text-xs font-semibold">{label}</span>
          {status === 'done' && <Check className="h-3.5 w-3.5 text-emerald-500" />}
          {status === 'generating' && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {status === 'failed' && <XCircle className="h-3.5 w-3.5 text-destructive" />}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void generate()}
          disabled={status === 'generating'}
          className="h-7 cursor-pointer text-xs"
        >
          {status === 'done' || status === 'failed' ? 'Regenerate' : 'Generate'}
        </Button>
      </div>
      <Input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Optional style, e.g. warm lo-fi keys, upbeat"
        className="mt-2 h-8 text-xs"
        aria-label={`${label} style prompt`}
      />
      {url && (
        <audio controls src={url} className="mt-2 h-9 w-full" aria-label={`${label} preview`} />
      )}
    </div>
  );
}

export function PDRender({ state, runId, persist, onNext }: PDRenderProps) {
  const { data: personas = [] } = usePersonas();
  const runner = usePodcastRenderRunner(runId);
  const [starting, setStarting] = useState(false);

  const outline = state.podcast_outline!;

  const chaptersPayload = useMemo(() => {
    const script = state.podcast_script ?? {};
    const cast = state.podcast_cast ?? {};
    return outline.chapters.map((ch) => ({
      idx: ch.idx,
      lines: (script[String(ch.idx)] ?? []).map((seg) => ({
        text: seg.text,
        voice_id: personas.find((p) => p.id === cast[seg.speaker])?.voice_id ?? '',
      })).filter((l) => l.voice_id && l.text.trim()),
    }));
  }, [outline.chapters, state.podcast_script, state.podcast_cast, personas]);

  const started = runner.chunks.length > 0;
  const doneCount = runner.chunks.filter((c) => c.status === 'done').length;
  const failed = runner.chunks.filter((c) => c.status === 'failed');
  const allDone = started && doneCount === runner.chunks.length;

  // A reload mid-render resumes polling automatically.
  useEffect(() => {
    if (started && !allDone && !runner.active) runner.resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, allDone]);

  const startRender = async () => {
    if (chaptersPayload.some((c) => c.lines.length === 0)) {
      toast.error('Some chapters have no voiced lines. Check the cast mapping.');
      return;
    }
    setStarting(true);
    try {
      await persist(3, { render_stage: 'chunks' });
      await runner.start(chaptersPayload);
    } catch {
      // toasted by the runner
    } finally {
      setStarting(false);
    }
  };

  const statusChip = (status: string) => {
    switch (status) {
      case 'done': return <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 [[data-omni-theme=dark]_&]:text-emerald-400"><Check className="h-3.5 w-3.5" />Done</span>;
      case 'failed': return <span className="flex items-center gap-1 text-[11px] font-medium text-destructive"><XCircle className="h-3.5 w-3.5" />Failed</span>;
      case 'generating': return <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Rendering</span>;
      default: return <span className="text-[11px] text-muted-foreground">Queued</span>;
    }
  };

  return (
    <div className="space-y-5">
      {!started && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Render the episode voices</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {outline.chapters.length} chapters render one at a time; you can close the tab — the server finishes the rest.
          </p>
          <Button
            onClick={() => void startRender()}
            disabled={starting || personas.length === 0}
            className="mt-3 cursor-pointer gap-1.5 bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
          >
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start render
          </Button>
        </div>
      )}

      {started && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {doneCount} of {runner.chunks.length} chapters rendered{runner.active ? ' — rendering…' : ''}
          </p>
          {runner.chunks.map((chunk) => {
            const idx = chunk.metadata?.chapter_idx ?? 0;
            const chapter = outline.chapters.find((c) => c.idx === idx);
            return (
              <div key={chunk.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                <p className="min-w-0 truncate text-xs font-medium">
                  {idx}. {chapter?.title ?? 'Chapter'}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  {statusChip(chunk.status)}
                  {chunk.status === 'failed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void runner.retryChapter(chunk.id)}
                      className="h-6 cursor-pointer gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCcw className="h-3 w-3" />
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {failed.length > 0 && (
            <p className="text-[11px] text-destructive">{failed[0].error}</p>
          )}
        </div>
      )}

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jingles (optional)</h2>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <JingleControl
            kind="intro"
            label="Intro jingle"
            assetId={state.intro_jingle_asset_id}
            runId={runId}
            onGenerated={(id) => void persist(3, { intro_jingle_asset_id: id })}
          />
          <JingleControl
            kind="outro"
            label="Outro jingle"
            assetId={state.outro_jingle_asset_id}
            runId={runId}
            onGenerated={(id) => void persist(3, { outro_jingle_asset_id: id })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!allDone}
          className="cursor-pointer bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Package the episode
        </Button>
      </div>
    </div>
  );
}
