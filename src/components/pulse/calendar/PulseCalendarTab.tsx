"use client";

import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePulseDrafts, useUpdatePulseDraft } from '@/hooks/usePulseDrafts';
import { DRAFT_STATUS_META } from '@/components/pulse/pulseStatus';
import { PulseDraftEditor } from '@/components/pulse/posts/PulseDraftEditor';
import type { PulseDraft } from '@/types/pulse';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOT: Record<string, string> = {
  draft: 'bg-muted-foreground',
  pending_approval: 'bg-amber-500',
  scheduled: 'bg-sky-500',
  published: 'bg-emerald-500',
  failed: 'bg-red-500',
};

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function buildGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay()); // back to Sunday
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function PostChip({ draft, onOpen }: { draft: PulseDraft; onOpen: (d: PulseDraft) => void }) {
  const locked = draft.status === 'published' || draft.status === 'failed';
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: draft.id, disabled: locked });
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(draft)}
      className={cn(
        'flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[10px] transition-colors',
        'bg-muted/60 hover:bg-muted',
        locked ? 'cursor-pointer opacity-90' : 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
      title={draft.caption ?? draft.title ?? 'Post'}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT[draft.status])} aria-hidden="true" />
      <span className="truncate">{draft.caption || draft.title || 'Untitled'}</span>
    </button>
  );
}

function DayCell({ day, inMonth, posts, isToday, onOpen }: {
  day: Date; inMonth: boolean; posts: PulseDraft[]; isToday: boolean; onOpen: (d: PulseDraft) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateKey(day) });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[84px] flex-col gap-0.5 border-b border-r p-1 transition-colors',
        !inMonth && 'bg-muted/30',
        isOver && 'bg-pink-500/10 ring-1 ring-inset ring-pink-500/40',
      )}
    >
      <span className={cn(
        'mb-0.5 flex h-5 w-5 items-center justify-center self-end rounded-full text-[10px]',
        isToday ? 'bg-pink-500 font-semibold text-white' : inMonth ? 'text-muted-foreground' : 'text-muted-foreground/40',
      )}>
        {day.getDate()}
      </span>
      {posts.slice(0, 3).map((p) => <PostChip key={p.id} draft={p} onOpen={onOpen} />)}
      {posts.length > 3 && <span className="px-1 text-[9px] text-muted-foreground">+{posts.length - 3} more</span>}
    </div>
  );
}

export function PulseCalendarTab() {
  const [cursor, setCursor] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [editing, setEditing] = useState<PulseDraft | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const { data: drafts } = usePulseDrafts({});
  const update = useUpdatePulseDraft();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const grid = useMemo(() => buildGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  const { byDay, unscheduled } = useMemo(() => {
    const map = new Map<string, PulseDraft[]>();
    const un: PulseDraft[] = [];
    for (const d of drafts ?? []) {
      if (d.scheduled_date) {
        const k = dateKey(new Date(d.scheduled_date));
        map.set(k, [...(map.get(k) ?? []), d]);
      } else if (d.status !== 'published') {
        un.push(d);
      }
    }
    return { byDay: map, unscheduled: un };
  }, [drafts]);

  const openEditor = (d: PulseDraft) => { setEditing(d); setEditorOpen(true); };

  const onDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id);
    const over = e.over?.id ? String(e.over.id) : undefined;
    if (!over) return;
    const draft = (drafts ?? []).find((d) => d.id === id);
    if (!draft || draft.status === 'published' || draft.status === 'failed') return;

    if (over === 'unscheduled') {
      if (draft.scheduled_date) update.mutate({ id, scheduled_date: null, status: 'draft' });
      return;
    }
    const [y, m, dd] = over.split('-').map(Number);
    if (!y || !m || !dd) return;
    const base = draft.scheduled_date ? new Date(draft.scheduled_date) : null;
    const next = new Date(y, m - 1, dd, base?.getHours() ?? 9, base?.getMinutes() ?? 0);
    update.mutate({ id, scheduled_date: next.toISOString(), status: draft.status === 'draft' ? 'scheduled' : draft.status });
  };

  const todayKey = dateKey(new Date());
  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const goToday = () => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); };
  const shift = (delta: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <div className="space-y-3 p-4 sm:p-6">
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={goToday} className="h-8 text-xs">Today</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Unscheduled rail */}
        <UnscheduledRail posts={unscheduled} onOpen={openEditor} />

        {/* Month grid */}
        <div className="overflow-hidden rounded-xl border-l border-t">
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((w) => (
              <div key={w} className="border-b border-r bg-muted/40 px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((day) => (
              <DayCell
                key={dateKey(day)}
                day={day}
                inMonth={day.getMonth() === cursor.getMonth()}
                isToday={dateKey(day) === todayKey}
                posts={byDay.get(dateKey(day)) ?? []}
                onOpen={openEditor}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {(Object.keys(DRAFT_STATUS_META) as Array<keyof typeof DRAFT_STATUS_META>).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={cn('h-2 w-2 rounded-full', DOT[s])} /> {DRAFT_STATUS_META[s].label}
            </span>
          ))}
        </div>
      </DndContext>

      <PulseDraftEditor open={editorOpen} onOpenChange={setEditorOpen} draft={editing} />
    </div>
  );
}

function UnscheduledRail({ posts, onOpen }: { posts: PulseDraft[]; onOpen: (d: PulseDraft) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unscheduled' });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-2 overflow-x-auto rounded-xl border border-dashed p-2 transition-colors',
        isOver && 'border-pink-500/50 bg-pink-500/5',
      )}
    >
      <span className="flex shrink-0 items-center gap-1 px-1 text-[11px] text-muted-foreground"><Inbox className="h-3.5 w-3.5" /> Unscheduled</span>
      {posts.length === 0 ? (
        <span className="text-[11px] text-muted-foreground/70">Drag posts here to unschedule</span>
      ) : (
        posts.map((p) => <div key={p.id} className="w-40 shrink-0"><PostChip draft={p} onOpen={onOpen} /></div>)
      )}
    </div>
  );
}
