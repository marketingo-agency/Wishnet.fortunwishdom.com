"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, CalendarClock, FileText, Image as ImageIcon, Video, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePulseDrafts, useDeletePulseDraft, type PulseDraftFilters } from '@/hooks/usePulseDrafts';
import { platformLabel, platformColor, formatDate } from '@/components/settings/pulsePlatforms';
import { DRAFT_STATUS_META, PULSE_PLATFORMS } from '@/components/pulse/pulseStatus';
import { PulseDraftEditor } from './PulseDraftEditor';
import type { PulseDraft, PulseDraftStatus, PulsePostType } from '@/types/pulse';

const TYPE_ICON: Record<PulsePostType, typeof FileText> = { text: FileText, photo: ImageIcon, video: Video };
const STATUSES: Array<PulseDraftStatus | 'all'> = ['all', 'draft', 'pending_approval', 'scheduled', 'published', 'failed'];

export function PulsePostsTab() {
  const [filters, setFilters] = useState<PulseDraftFilters>({ status: 'all', platform: 'all', search: '' });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PulseDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PulseDraft | null>(null);

  const { data: drafts, isLoading } = usePulseDrafts(filters);
  const remove = useDeletePulseDraft();

  const openCreate = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (d: PulseDraft) => { setEditing(d); setEditorOpen(true); };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search captions…"
            className="h-9 pl-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v as PulseDraftStatus | 'all' }))}>
            <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-sm">{s === 'all' ? 'All statuses' : DRAFT_STATUS_META[s as PulseDraftStatus].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.platform} onValueChange={(v) => setFilters((f) => ({ ...f, platform: v }))}>
            <SelectTrigger className="h-9 w-[130px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-sm">All platforms</SelectItem>
              {PULSE_PLATFORMS.map((p) => (
                <SelectItem key={p} value={p} className="text-sm">{platformLabel(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} size="sm" className="h-9 gap-1.5"><Plus className="h-4 w-4" /> New post</Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : drafts && drafts.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {drafts.map((draft) => {
            const TypeIcon = TYPE_ICON[draft.post_type];
            const statusMeta = DRAFT_STATUS_META[draft.status];
            return (
              <div key={draft.id} className="flex flex-col gap-2 rounded-xl border bg-card p-3.5 transition-shadow hover:shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <TypeIcon className="h-3.5 w-3.5" />
                    <span className="text-[11px] capitalize">{draft.post_type}</span>
                  </div>
                  <Badge className={cn('border-0 px-2 py-0.5 text-[10px] font-semibold', statusMeta.badge)}>{statusMeta.label}</Badge>
                </div>

                <p className="line-clamp-3 min-h-[3.5rem] text-sm text-foreground">
                  {draft.caption || draft.title || <span className="text-muted-foreground">No caption</span>}
                </p>

                {draft.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {draft.platforms.map((p) => (
                      <span key={p} className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white', platformColor(p))}>
                        {platformLabel(p)}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between border-t pt-2">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {draft.scheduled_date ? (<><CalendarClock className="h-3 w-3" />{formatDate(draft.scheduled_date)}</>) : `Updated ${formatDate(draft.updated_at)}`}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(draft)} aria-label="Edit post">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(draft)} aria-label="Delete post">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <LayoutGrid className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No posts yet</p>
            <p className="text-xs text-muted-foreground">Create your first draft to start planning.</p>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New post</Button>
        </div>
      )}

      <PulseDraftEditor open={editorOpen} onOpenChange={setEditorOpen} draft={editing} />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the draft. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTarget) remove.mutate(deleteTarget.id); setDeleteTarget(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
