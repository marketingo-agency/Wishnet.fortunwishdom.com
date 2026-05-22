"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Radio, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { useWhisperShows, useDeleteWhisperShow } from '@/hooks/useWhisperShows';
import { WhisperShowDialog } from './WhisperShowDialog';
import type { WhisperShow } from '@/types/whisper';

export function WhisperShowsTab() {
  const { data: shows, isLoading } = useWhisperShows();
  const remove = useDeleteWhisperShow();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WhisperShow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WhisperShow | null>(null);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (s: WhisperShow) => { setEditing(s); setDialogOpen(true); };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Shows</h2>
        <Button size="sm" onClick={openCreate} className="h-9 gap-1.5"><Plus className="h-4 w-4" /> New show</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : shows && shows.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((s) => {
            const castCount = Object.keys(s.default_cast).length;
            return (
              <div key={s.id} className="flex flex-col gap-2 rounded-xl border bg-card p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold"><Radio className="h-4 w-4 text-indigo-500" />{s.name}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">{s.language}</Badge>
                </div>
                {s.description && <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>}
                <div className="mt-auto flex items-center justify-between border-t pt-2">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Users className="h-3 w-3" />{castCount} {castCount === 1 ? 'voice' : 'voices'} cast</span>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)} aria-label="Edit show"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(s)} aria-label="Delete show"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted"><Radio className="h-6 w-6 text-muted-foreground" /></div>
          <p className="text-sm font-medium">No shows yet</p>
          <p className="text-xs text-muted-foreground">Create a show to give episodes a consistent cast.</p>
          <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> New show</Button>
        </div>
      )}

      <WhisperShowDialog show={editing} open={dialogOpen} onOpenChange={setDialogOpen} />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this show?</AlertDialogTitle>
            <AlertDialogDescription>Episodes in this show are kept, but they&apos;ll no longer be grouped under it.</AlertDialogDescription>
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
