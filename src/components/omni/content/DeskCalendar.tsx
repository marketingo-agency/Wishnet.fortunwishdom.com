"use client";

/**
 * Publishing Desk - Calendar: a month grid of scheduled posts. Drag a chip to
 * another day to reschedule (the time of day is preserved); drop it on the
 * Unscheduled rail to clear the schedule. Fully-published and archived posts
 * are locked in place. Click a chip to open the post.
 */

import { useMemo, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { AlertCircle, CalendarX2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useUpdateDeskPost, type DeskPost } from '@/hooks/omni/useContentDesk';
import { POST_STATUS_META } from './contentConstants';

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const isLocked = (p: DeskPost) => p.status === 'published' || p.status === 'archived';

function PostChip({ post, onOpen }: { post: DeskPost; onOpen: (p: DeskPost) => void }) {
  const locked = isLocked(post);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: post.id,
    disabled: locked,
  });
  const meta = POST_STATUS_META[post.status] ?? POST_STATUS_META.draft;
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => onOpen(post)}
      title={locked ? `${post.title || 'Untitled'} (locked: ${meta.label.toLowerCase()})` : post.title || 'Untitled'}
      aria-label={`Open post ${post.title || 'Untitled'}`}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn(
        'block w-full cursor-pointer truncate rounded-md border px-1.5 py-0.5 text-left text-[10px] font-medium transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        meta.className,
        isDragging && 'z-50 opacity-80 shadow-lg',
        !locked && 'touch-none',
      )}
    >
      {post.scheduled_at
        ? `${new Date(post.scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · `
        : ''}
      {post.title || 'Untitled'}
    </button>
  );
}

function DayCell({ date, inMonth, isToday, posts, onOpen }: {
  date: Date; inMonth: boolean; isToday: boolean; posts: DeskPost[]; onOpen: (p: DeskPost) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${dayKey(date)}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[84px] space-y-1 rounded-lg border p-1.5 transition-colors duration-200',
        inMonth ? 'border-border bg-card' : 'border-border/50 bg-muted/20 opacity-60',
        isOver && 'border-fuchsia-500/60 bg-fuchsia-500/5',
      )}
    >
      <p className={cn(
        'text-right text-[10px] font-medium',
        isToday
          ? 'font-bold text-fuchsia-600 [[data-omni-theme=dark]_&]:text-fuchsia-400'
          : 'text-muted-foreground',
      )}>
        {date.getDate()}
      </p>
      {posts.map((p) => <PostChip key={p.id} post={p} onOpen={onOpen} />)}
    </div>
  );
}

interface DeskCalendarProps {
  query: UseQueryResult<DeskPost[]>;
  onOpenPost: (post: DeskPost) => void;
}

export function DeskCalendar({ query, onOpenPost }: DeskCalendarProps) {
  const [monthStart, setMonthStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const updatePost = useUpdateDeskPost();
  // distance: 6 keeps plain clicks opening the post; a real drag starts after 6px.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { setNodeRef: railRef, isOver: railOver } = useDroppable({ id: 'unscheduled' });

  const days = useMemo(() => {
    const firstDow = (monthStart.getDay() + 6) % 7; // Monday-first grid
    const start = new Date(monthStart);
    start.setDate(start.getDate() - firstDow);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [monthStart]);

  const posts = useMemo(() => query.data ?? [], [query.data]);
  const byDay = useMemo(() => {
    const map = new Map<string, DeskPost[]>();
    for (const p of posts) {
      if (!p.scheduled_at || p.status === 'archived') continue;
      const key = dayKey(new Date(p.scheduled_at));
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''));
    }
    return map;
  }, [posts]);
  const unscheduled = posts.filter((p) => !p.scheduled_at && p.status !== 'archived');

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    const post = posts.find((p) => p.id === event.active.id);
    if (!overId || !post || isLocked(post)) return;
    if (overId === 'unscheduled') {
      if (post.scheduled_at) updatePost.mutate({ post_id: post.id, scheduled_at: null });
      return;
    }
    const key = String(overId).replace(/^day:/, '');
    const [y, m, d] = key.split('-').map(Number);
    if (!y || !m || !d) return;
    const prev = post.scheduled_at ? new Date(post.scheduled_at) : null;
    const next = new Date(y, m - 1, d, prev?.getHours() ?? 9, prev?.getMinutes() ?? 0);
    if (post.scheduled_at && dayKey(new Date(post.scheduled_at)) === key) return;
    updatePost.mutate({ post_id: post.id, scheduled_at: next.toISOString() });
  };

  if (query.isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-5xl grid-cols-7 gap-1.5">
        {Array.from({ length: 21 }).map((_, i) => <Skeleton key={i} className="min-h-[84px] rounded-lg" />)}
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-destructive">Could not load the calendar.</p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()} className="h-8 cursor-pointer text-xs">Try again</Button>
      </div>
    );
  }

  const today = dayKey(new Date());
  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonthStart((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="h-8 w-8 cursor-pointer">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="min-w-[150px] text-center text-sm font-semibold">
              {monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
            <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setMonthStart((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="h-8 w-8 cursor-pointer">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {updatePost.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Saving the new schedule" />}
            <Button variant="outline" size="sm" onClick={() => { const n = new Date(); setMonthStart(new Date(n.getFullYear(), n.getMonth(), 1)); }} className="h-8 cursor-pointer text-xs">
              Today
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 gap-1.5 pb-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <p key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d}</p>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d) => (
                <DayCell
                  key={dayKey(d)}
                  date={d}
                  inMonth={d.getMonth() === monthStart.getMonth()}
                  isToday={dayKey(d) === today}
                  posts={byDay.get(dayKey(d)) ?? []}
                  onOpen={onOpenPost}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          ref={railRef}
          className={cn(
            'space-y-1.5 rounded-xl border border-dashed p-3 transition-colors duration-200',
            railOver ? 'border-fuchsia-500/60 bg-fuchsia-500/5' : 'border-border bg-muted/20',
          )}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <CalendarX2 className="h-3.5 w-3.5" /> Unscheduled (drop here to clear a date)
          </p>
          {unscheduled.length === 0 ? (
            <p className="text-xs text-muted-foreground">Everything has a date. Nice.</p>
          ) : (
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {unscheduled.map((p) => <PostChip key={p.id} post={p} onOpen={onOpenPost} />)}
            </div>
          )}
        </div>
      </div>
    </DndContext>
  );
}
