"use client";

/**
 * PSOutline (stage 2): the editable chapter plan — title, per-chapter
 * summary/minutes, add/remove/reorder. Chapter idx values are renumbered on
 * every change so the script stage's keys stay contiguous.
 */

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
  const totalMinutes = outline.chapters.reduce((n, c) => n + (c.minutes || 0), 0);

  const setChapter = (index: number, patch: Partial<OmniPodcastChapter>) => {
    onChange({
      ...outline,
      chapters: outline.chapters.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    });
  };

  const move = (index: number, delta: -1 | 1) => {
    const next = [...outline.chapters];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...outline, chapters: renumber(next) });
  };

  const remove = (index: number) => {
    onChange({ ...outline, chapters: renumber(outline.chapters.filter((_, i) => i !== index)) });
  };

  const add = () => {
    onChange({
      ...outline,
      chapters: renumber([
        ...outline.chapters,
        { idx: outline.chapters.length + 1, title: `Chapter ${outline.chapters.length + 1}`, summary: '', minutes: 6 },
      ]),
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="ps-title">Episode title</Label>
        <Input id="ps-title" value={outline.title} onChange={(e) => onChange({ ...outline, title: e.target.value })} />
      </div>

      <div className="space-y-3">
        {outline.chapters.map((chapter, index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-600 [[data-omni-theme=dark]_&]:text-orange-400">
                {chapter.idx}
              </span>
              <Input
                value={chapter.title}
                onChange={(e) => setChapter(index, { title: e.target.value })}
                className="flex-1"
                aria-label={`Chapter ${chapter.idx} title`}
              />
              <Input
                type="number"
                min={2}
                max={15}
                value={chapter.minutes}
                onChange={(e) => setChapter(index, { minutes: Math.min(15, Math.max(2, Math.round(Number(e.target.value) || 6))) })}
                className="w-16"
                aria-label={`Chapter ${chapter.idx} minutes`}
              />
              <div className="flex shrink-0">
                <Button variant="ghost" size="icon" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move chapter up" className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground">
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => move(index, 1)} disabled={index === outline.chapters.length - 1} aria-label="Move chapter down" className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground">
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(index)} disabled={outline.chapters.length <= 1} aria-label={`Remove chapter ${chapter.idx}`} className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <Textarea
              value={chapter.summary}
              onChange={(e) => setChapter(index, { summary: e.target.value })}
              rows={2}
              placeholder="What exactly does this chapter cover?"
              className="mt-2 text-xs"
              aria-label={`Chapter ${chapter.idx} summary`}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={add} disabled={outline.chapters.length >= 12} className="cursor-pointer gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add chapter
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">≈ {totalMinutes} min total</span>
          <Button
            onClick={onNext}
            disabled={outline.chapters.length === 0 || !outline.title.trim()}
            className="cursor-pointer bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
          >
            Write the script
          </Button>
        </div>
      </div>
    </div>
  );
}
