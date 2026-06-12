"use client";

/**
 * History (Mode 6): the registry of every image-mode run.
 * Search and filters, resume and retake per entry, selective delete and
 * clear-all with confirmation. Completed and archived runs are protected
 * from deletion because their images back Content Library items.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { History, Loader2, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OmniRun } from '@/hooks/omni';
import { RUN_MODE_META, RUN_STATUS_META, isRunDeletable } from './historyRouting';
import { useDeleteRuns, useOmniRunsList, useRunCovers } from './useOmniHistory';
import { HistoryRunCard } from './HistoryRunCard';

interface HistoryViewProps {
  onOpenRun: (run: OmniRun) => void;
  onExit: () => void;
}

type DeleteTarget = { kind: 'one'; run: OmniRun } | { kind: 'selected' } | { kind: 'all' };

export function HistoryView({ onOpenRun, onExit }: HistoryViewProps) {
  const runs = useOmniRunsList();
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const deleteRuns = useDeleteRuns();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (runs.data ?? []).filter((run) => {
      if (term && !(run.title ?? '').toLowerCase().includes(term)) return false;
      if (modeFilter !== 'all' && run.mode !== modeFilter) return false;
      if (statusFilter !== 'all' && run.status !== statusFilter) return false;
      return true;
    });
  }, [runs.data, search, modeFilter, statusFilter]);

  // Covers are keyed on the full list so search/filter changes never refetch
  // or flash; filtering only changes which covers are looked up.
  const { data: covers } = useRunCovers((runs.data ?? []).map((r) => r.id));

  // A selection must never outlive its visibility: hidden rows getting
  // deleted by 'Delete selected' would be a destructive surprise.
  const filteredIds = useMemo(() => new Set(filtered.map((r) => r.id)), [filtered]);
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => filteredIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredIds]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runsToDelete: OmniRun[] = useMemo(() => {
    if (!deleteTarget) return [];
    if (deleteTarget.kind === 'one') return [deleteTarget.run];
    if (deleteTarget.kind === 'selected') return filtered.filter((r) => selectedIds.has(r.id));
    return runs.data ?? [];
  }, [deleteTarget, filtered, runs.data, selectedIds]);

  const deletableCount = runsToDelete.filter(isRunDeletable).length;
  const protectedCount = runsToDelete.length - deletableCount;

  const confirmDelete = () => {
    // 'all' resolves server-side in the mutation: the on-screen list is
    // capped at 200, but clearing the whole history must mean all of it.
    deleteRuns.mutate(deleteTarget?.kind === 'all' ? 'all' : runsToDelete, {
      onSuccess: () => {
        setSelectedIds(new Set());
        setDeleteTarget(null);
      },
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">History</p>
          <h1 className="truncate text-sm font-semibold sm:text-base">Every run, every mode</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={onExit} aria-label="Back to the Images hub" className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search runs" className="h-9 pl-8 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="h-9 w-[170px] text-sm" aria-label="Filter by mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">All modes</SelectItem>
                  {Object.entries(RUN_MODE_META).map(([id, meta]) => (
                    <SelectItem key={id} value={id} className="text-sm">{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[140px] text-sm" aria-label="Filter by status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">All statuses</SelectItem>
                  {Object.entries(RUN_STATUS_META).map(([id, meta]) => (
                    <SelectItem key={id} value={id} className="text-sm">{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
              {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
            </p>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-destructive" onClick={() => setDeleteTarget({ kind: 'selected' })}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete selected ({selectedIds.size})
                </Button>
              )}
              {(runs.data?.length ?? 0) > 0 && (
                <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget({ kind: 'all' })}>
                  <Trash2 className="h-3.5 w-3.5" /> Clear history
                </Button>
              )}
            </div>
          </div>

          {runs.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : runs.isError ? (
            <p className="py-12 text-center text-sm text-destructive">Could not load the history.</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <History className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{(runs.data?.length ?? 0) > 0 ? 'No runs match the filters' : 'No runs yet'}</p>
                <p className="text-xs text-muted-foreground">
                  {(runs.data?.length ?? 0) > 0 ? 'Adjust the search or filters.' : 'Every Images run will appear here, resumable at any step.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((run) => (
                <HistoryRunCard
                  key={run.id}
                  run={run}
                  coverUrl={covers?.[run.id]}
                  selected={selectedIds.has(run.id)}
                  onToggleSelect={() => toggleSelect(run.id)}
                  onOpen={onOpenRun}
                  onRequestDelete={(r) => setDeleteTarget({ kind: 'one', run: r })}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.kind === 'all' ? 'Clear the whole history?' : deleteTarget?.kind === 'selected' ? `Delete ${runsToDelete.length} selected entries?` : 'Delete this run?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletableCount > 0
                ? `This permanently removes ${deletableCount} ${deletableCount === 1 ? 'run' : 'runs'} with all generated images from storage. This cannot be undone.`
                : 'Nothing here can be deleted.'}
              {protectedCount > 0 && ` ${protectedCount} ${protectedCount === 1 ? 'run is' : 'runs are'} protected because their images are saved to the Content Library; they will be skipped (archive them to hide them instead).`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteRuns.isPending || deletableCount === 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRuns.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
