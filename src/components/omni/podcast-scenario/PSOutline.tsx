"use client";

/**
 * PSOutline (stage 2): the editable chapter plan — title, per-chapter
 * summary/minutes, add/remove/reorder. Text edits live in a local draft and
 * commit on blur (QA W5: keystroke-level persists flooded the write queue);
 * structural ops (add/remove/reorder) commit immediately. Chapter idx values
 * are renumbered on every change so the script stage's keys stay contiguous.
 */

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { OmniPodcastChapter, OmniPodcastOutline } from '@/hooks/omni';

interface PSOutlineProps {
  outline: OmniPodcastOutline;
  onChange: (outline: OmniPodcastOutline) => void;
  onNext: () => void;
}

function renumber(chapters: OmniPodcastChapter[]): OmniPodcastChapter[] {
  return chapters.map((c, i) => ({ ...c, idx: i + 1 }));
}

export function PSOutline({ outline, onChange, onNext }: PSOutlineProps) {
  const [draft, setDraft] = useState(outline);
  // Resync when the committed outline changes (stage revisit, regenerate).
  useEffect(() => { setDraft(outline); }, [outline]);

  const totalMinutes = draft.chapters.reduce((n, c) => n + (c.minutes || 0), 0);

  /** Text edits: draft only; the blur handler commits. */
  const editChapter = (index: number, patch: Partial<OmniPodcastChapter>) => {
    setDraft((prev) => ({
      ...prev,
      chapters: prev.chapters.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  };

  const commit = (next?: OmniPodcastOutline) => onChange(next ?? draft);

  /** Structural ops mutate the draft AND commit immediately. */
  const commitStructural = (chapters: OmniPodcastChapter[]) => {
    const next = { ...draft, chapters: renumber(chapters) };
    setDraft(next);
    onChange(next);
  };

  const move = (index: number, delta: -1 | 1) => {
    const next = [...draft.chapters];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    commitStructural(next);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="ps-title">Episode title</Label>
        <Input
          id="ps-title"
          value={draft.title}
          onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
          onBlur={() => commit()}
        />
      </div>

      <div className="space-y-3">
        {draft.chapters.map((chapter, index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-700 [[data-omni-theme=dark]_&]:text-orange-400">
                {chapter.idx}
              </span>
              <Input
                value={chapter.title}
                onChange={(e) => editChapter(index, { title: e.target.value })}
                onBlur={() => commit()}
                className="min-w-0 flex-1"
                aria-label={`Chapter ${chapter.idx} title`}
              />
              <Input
                type="number"
                min={2}
                max={15}
                value={chapter.minutes}
                onChange={(e) => editChapter(index, { minutes: Number(e.target.value) })}
                onBlur={() => {
                  // Clamp on blur, not per keystroke (typing "12" no longer
                  // snaps to 2 mid-entry).
                  const clamped = Math.min(15, Math.max(2, Math.round(Number(chapter.minutes) || 6)));
                  const next = {
                    ...draft,
                    chapters: draft.chapters.map((c, i) => (i === index ? { ...c, minutes: clamped } : c)),
                  };
                  setDraft(next);
                  onChange(next);
                }}
                className="w-16"
                aria-label={`Chapter ${chapter.idx} minutes`}
              />
              <div className="flex shrink-0">
                <Button variant="ghost" size="icon" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move chapter up" className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground">
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => move(index, 1)} disabled={index === draft.chapters.length - 1} aria-label="Move chapter down" className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground">
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => commitStructural(draft.chapters.filter((_, i) => i !== index))} disabled={draft.chapters.length <= 1} aria-label={`Remove chapter ${chapter.idx}`} className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <Textarea
              value={chapter.summary}
              onChange={(e) => editChapter(index, { summary: e.target.value })}
              onBlur={() => commit()}
              rows={2}
              placeholder="What exactly does this chapter cover?"
              className="mt-2 text-xs"
              aria-label={`Chapter ${chapter.idx} summary`}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => commitStructural([
            ...draft.chapters,
            { idx: draft.chapters.length + 1, title: `Chapter ${draft.chapters.length + 1}`, summary: '', minutes: 6 },
          ])}
          disabled={draft.chapters.length >= 12}
          className="cursor-pointer gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add chapter
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">≈ {totalMinutes} min total</span>
          <Button
            onClick={() => { commit(); onNext(); }}
            disabled={draft.chapters.length === 0 || !draft.title.trim()}
            className="cursor-pointer bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
          >
            Write the script
          </Button>
        </div>
      </div>
    </div>
  );
}
