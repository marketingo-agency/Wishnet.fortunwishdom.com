"use client";

import { useState } from 'react';
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
import { Library, Trash2, Clock, AudioLines, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWhisperEpisodes, useDeleteWhisperEpisode } from '@/hooks/useWhisperEpisodes';
import { EPISODE_STATUS_META, formatDuration } from '@/components/whisper/whisperStatus';
import { WhisperEpisodeView } from './WhisperEpisodeView';
import type { WhisperEpisode, WhisperEpisodeStatus } from '@/types/whisper';

const STATUSES: Array<WhisperEpisodeStatus | 'all'> = ['all', 'draft', 'scripted', 'rendering', 'rendered', 'published', 'failed'];

export function WhisperEpisodesTab() {
  const [status, setStatus] = useState<WhisperEpisodeStatus | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WhisperEpisode | null>(null);

  const { data: episodes, isLoading } = useWhisperEpisodes({ status });
  const remove = useDeleteWhisperEpisode();

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Episodes</h2>
        <Select value={status} onValueChange={(v) => setStatus(v as WhisperEpisodeStatus | 'all')}>
          <SelectTrigger className="h-9 w-[150px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-sm">{s === 'all' ? 'All statuses' : EPISODE_STATUS_META[s as WhisperEpisodeStatus].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : episodes && episodes.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {episodes.map((ep) => {
            const meta = EPISODE_STATUS_META[ep.status];
            return (
              <button
                key={ep.id}
                type="button"
                onClick={() => setOpenId(ep.id)}
                className="flex flex-col gap-2 rounded-xl border bg-card p-3.5 text-left transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] capitalize text-muted-foreground"><Mic className="h-3.5 w-3.5" />{ep.format.replace('_', '-')}</span>
                  <Badge className={cn('border-0 px-2 py-0.5 text-[10px] font-semibold', meta.badge)}>{meta.label}</Badge>
                </div>
                <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium">{ep.title || 'Untitled episode'}</p>
                <div className="mt-auto flex items-center justify-between border-t pt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-2">
                    {ep.audio_path && <AudioLines className="h-3 w-3 text-emerald-500" />}
                    {ep.duration ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(ep.duration)}</span> : null}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(ep); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setDeleteTarget(ep); } }}
                    aria-label="Delete episode"
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted"><Library className="h-6 w-6 text-muted-foreground" /></div>
          <p className="text-sm font-medium">No episodes yet</p>
          <p className="text-xs text-muted-foreground">Create one in the Studio.</p>
        </div>
      )}

      <WhisperEpisodeView episodeId={openId} open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)} />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this episode?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the episode and its script. The audio file is left in storage.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) remove.mutate(deleteTarget.id); setDeleteTarget(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
