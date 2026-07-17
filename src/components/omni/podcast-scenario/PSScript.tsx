"use client";

/**
 * PSScript (stage 3): chapter-by-chapter script generation (D-A3) — each
 * chapter is one LLM call carrying the full outline + the previous chapter's
 * tail for continuity. Sequential and client-paced; every finished chapter
 * persists immediately (a closed tab loses at most the chapter in flight).
 */

import { useRef, useState } from 'react';
import { Loader2, Pencil, RefreshCcw, Sparkles, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { callOmniPodcast } from '@/lib/omniApi';
import type { OmniImagesState, OmniPodcastSegment } from '@/hooks/omni';

interface PSScriptProps {
  state: OmniImagesState;
  onScriptChange: (chapterIdx: number, segments: OmniPodcastSegment[]) => void;
  onNext: () => void;
}

/** The continuity tail passed to the next chapter's prompt. */
function tailOf(segments: OmniPodcastSegment[]): string {
  return segments.slice(-2).map((s) => `${s.speaker}: ${s.text}`).join('\n').slice(-2000);
}

export function PSScript({ state, onScriptChange, onNext }: PSScriptProps) {
  const outline = state.podcast_outline!;
  const script = state.podcast_script ?? {};
  const cast = state.podcast_cast ?? {};
  const personas = Object.entries(cast).map(([label, persona_id]) => ({ label, persona_id }));

  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const stopRef = useRef(false);
  const [editing, setEditing] = useState<{ chapter: number; segment: number } | null>(null);

  const doneCount = outline.chapters.filter((c) => (script[String(c.idx)] ?? []).length > 0).length;
  const allDone = doneCount === outline.chapters.length;

  const generateChapter = async (chapterIdx: number, priorTail: string): Promise<OmniPodcastSegment[]> => {
    const res = await callOmniPodcast<{ segments: OmniPodcastSegment[] }>('podcast-script', {
      mode: 'chapter',
      outline: outline.chapters,
      chapter_idx: chapterIdx,
      episode_title: outline.title,
      prior_tail: priorTail,
      personas,
    });
    if (!res.segments?.length) throw new Error(`Chapter ${chapterIdx} came back empty`);
    return res.segments;
  };

  const runOne = async (chapterIdx: number) => {
    setGeneratingIdx(chapterIdx);
    try {
      const prev = script[String(chapterIdx - 1)] ?? [];
      const segments = await generateChapter(chapterIdx, tailOf(prev));
      onScriptChange(chapterIdx, segments);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chapter generation failed');
    } finally {
      setGeneratingIdx(null);
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    stopRef.current = false;
    let priorTail = '';
    try {
      for (const chapter of outline.chapters) {
        if (stopRef.current) break;
        const existing = script[String(chapter.idx)] ?? [];
        if (existing.length > 0) {
          priorTail = tailOf(existing);
          continue;
        }
        setGeneratingIdx(chapter.idx);
        const segments = await generateChapter(chapter.idx, priorTail);
        onScriptChange(chapter.idx, segments);
        priorTail = tailOf(segments);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Script generation stopped on an error');
    } finally {
      setGeneratingIdx(null);
      setRunningAll(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {doneCount} of {outline.chapters.length} chapters written
        </p>
        <div className="flex gap-2">
          {runningAll ? (
            <Button variant="outline" size="sm" onClick={() => { stopRef.current = true; }} className="cursor-pointer gap-1.5">
              <Square className="h-3.5 w-3.5" />
              Stop after this chapter
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => void runAll()}
              disabled={allDone || generatingIdx !== null}
              className="cursor-pointer gap-1.5 bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {doneCount > 0 ? 'Write remaining chapters' : 'Write all chapters'}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {outline.chapters.map((chapter) => {
          const segments = script[String(chapter.idx)] ?? [];
          const isGenerating = generatingIdx === chapter.idx;
          return (
            <div key={chapter.idx} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="min-w-0 truncate text-sm font-semibold">
                  {chapter.idx}. {chapter.title}
                  <span className="ml-2 text-[11px] font-normal text-muted-foreground">{chapter.minutes} min</span>
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void runOne(chapter.idx)}
                  disabled={generatingIdx !== null || runningAll}
                  aria-label={segments.length > 0 ? `Regenerate chapter ${chapter.idx}` : `Write chapter ${chapter.idx}`}
                  className="h-7 shrink-0 cursor-pointer gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                  {segments.length > 0 ? 'Regenerate' : 'Write'}
                </Button>
              </div>

              {isGenerating && segments.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">Writing this chapter…</p>
              )}
              {!isGenerating && segments.length === 0 && (
                <p className="mt-2 text-xs italic text-muted-foreground/70">Not written yet.</p>
              )}

              {segments.length > 0 && (
                <div className="mt-2.5 space-y-2">
                  {segments.map((segment, si) => {
                    const isEditing = editing?.chapter === chapter.idx && editing.segment === si;
                    return (
                      <div key={si} className="group rounded-lg bg-muted/40 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-600 [[data-omni-theme=dark]_&]:text-orange-400">
                            {segment.speaker}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditing(isEditing ? null : { chapter: chapter.idx, segment: si })}
                            aria-label={`Edit line ${si + 1} of chapter ${chapter.idx}`}
                            className="h-6 w-6 cursor-pointer text-muted-foreground opacity-0 transition-opacity duration-200 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                        {isEditing ? (
                          <Textarea
                            value={segment.text}
                            onChange={(e) => {
                              const next = segments.map((s, i) => (i === si ? { ...s, text: e.target.value } : s));
                              onScriptChange(chapter.idx, next);
                            }}
                            onBlur={() => setEditing(null)}
                            rows={3}
                            autoFocus
                            className="mt-1 text-xs"
                            aria-label={`Line ${si + 1} text`}
                          />
                        ) : (
                          <p className="mt-0.5 text-xs leading-relaxed">{segment.text}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!allDone}
          className="cursor-pointer bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Review cast &amp; finish
        </Button>
      </div>
    </div>
  );
}
