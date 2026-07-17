"use client";

/**
 * History (Mode 6): the registry of every image-mode run.
 * Cursor-paginated infinite scroll, search (title, objective, prompt), mode /
 * status filters, sort select, select-all with bulk Archive and Delete,
 * per-run resume / retake-with-edits / archive / delete. Deleting a run also
 * removes any linked Content Library items (batched edge call).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Archive, History, Loader2, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { OmniImagesState, OmniRun } from '@/hooks/omni';
import { modeFamily, type ModeFamily } from '../stepRegistry';
import { RUN_MODE_META, RUN_STATUS_META, isRunFinalized } from './historyRouting';
import { HISTORY_SORTS, useBulkArchive, useDeleteRuns, useOmniRunsInfinite, useRetakeRun, useRunThumbs, type HistorySort } from './useOmniHistory';
import { HistoryRunCard } from './HistoryRunCard';
import { RetakeRunDialog } from './RetakeRunDialog';

interface HistoryViewProps {
  onOpenRun: (run: OmniRun) => void;
  onExit: () => void;
  /** Which track's runs this registry shows (Plan 2 D-V1): the images hub
   *  must never leak video runs and vice versa. */
  family?: ModeFamily;
}

type DeleteTarget = { kind: 'one'; run: OmniRun } | { kind: 'selected' } | { kind: 'all' };

export function HistoryView({ onOpenRun, onExit, family = 'images' }: HistoryViewProps) {
  // ui-rules: entrance/hover animations respect prefers-reduced-motion.
  const reduceMotion = useReducedMotion();
  const [sort, setSort] = useState<HistorySort>('updated_desc');
  const runsQuery = useOmniRunsInfinite(sort);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [retakeTarget, setRetakeTarget] = useState<OmniRun | null>(null);
  const deleteRuns = useDeleteRuns();
  const bulkArchive = useBulkArchive();
  const retake = useRetakeRun();

  // Flatten + dedupe pages (a strict time cursor can, in rare tie cases,
  // resend a boundary row — dedupe keeps the list clean either way).
  const loadedRuns = useMemo(() => {
    const seen = new Set<string>();
    const out: OmniRun[] = [];
    for (const page of runsQuery.data?.pages ?? []) {
      for (const run of page.runs) {
        if (seen.has(run.id)) continue;
        if (modeFamily(run.mode) !== family) continue;
        seen.add(run.id);
        out.push(run);
      }
    }
    return out;
  }, [runsQuery.data, family]);

  const titleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const run of loadedRuns) map.set(run.id, run.title || 'Untitled run');
    return map;
  }, [loadedRuns]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matchesTerm = (run: OmniRun) => {
      if (!term) return true;
      const state = (run.step_state ?? {}) as OmniImagesState;
      return [run.title, state.objective, state.locked_prompt]
        .some((f) => (f ?? '').toLowerCase().includes(term));
    };
    const list = loadedRuns.filter((run) => {
      if (!matchesTerm(run)) return false;
      if (modeFilter !== 'all' && run.mode !== modeFilter) return false;
      if (statusFilter !== 'all' && run.status !== statusFilter) return false;
      return true;
    });
    // Title sort is client-side over the loaded pages (nullable/duplicated
    // titles break a naive server keyset — see useOmniRunsInfinite).
    if (sort === 'title') {
      return [...list].sort((a, b) => (a.title || 'Untitled run').localeCompare(b.title || 'Untitled run'));
    }
    return list;
  }, [loadedRuns, search, modeFilter, statusFilter, sort]);

  // Thumbs are keyed on the loaded list so search/filter changes never
  // refetch or flash; filtering only changes which cards look them up.
  const { data: thumbs } = useRunThumbs(loadedRuns.map((r) => r.id));

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

  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
  const toggleSelectAll = () =>
    setSelectedIds(allVisibleSelected ? new Set() : new Set(filtered.map((r) => r.id)));

  // Infinite scroll: load the next page when the sentinel becomes visible.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = runsQuery;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
    }, { rootMargin: '400px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const runsToDelete: OmniRun[] = useMemo(() => {
    if (!deleteTarget) return [];
    if (deleteTarget.kind === 'one') return [deleteTarget.run];
    if (deleteTarget.kind === 'selected') return filtered.filter((r) => selectedIds.has(r.id));
    return loadedRuns;
  }, [deleteTarget, filtered, loadedRuns, selectedIds]);

  const deleteCount = runsToDelete.length;
  const finalizedCount = runsToDelete.filter(isRunFinalized).length;
  const anyBusy = deleteRuns.isPending || bulkArchive.isPending || retake.isPending;

  const confirmDelete = () => {
    // 'all' resolves server-side in the mutation and loops until the table is
    // empty: the on-screen list only holds the loaded pages.
    deleteRuns.mutate(deleteTarget?.kind === 'all' ? 'all' : runsToDelete, {
      onSuccess: () => {
        setSelectedIds(new Set());
        setDeleteTarget(null);
      },
    });
  };

  const confirmRetake = (run: OmniRun, overrides: Parameters<typeof retake.mutate>[0]['overrides']) => {
    retake.mutate({ source: run, overrides }, {
      onSuccess: ({ run: clone }) => {
        setRetakeTarget(null);
        onOpenRun(clone);
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
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative max-w-xs flex-1 basis-52">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, objective, prompt" className="h-9 pl-8 text-sm" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="cursor-pointer h-9 w-[170px] text-sm" aria-label="Filter by mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">All modes</SelectItem>
                  {Object.entries(RUN_MODE_META)
                    .filter(([id]) => modeFamily(id as OmniRun['mode']) === family)
                    .map(([id, meta]) => (
                      <SelectItem key={id} value={id} className="text-sm">{meta.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="cursor-pointer h-9 w-[140px] text-sm" aria-label="Filter by status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">All statuses</SelectItem>
                  {Object.entries(RUN_STATUS_META).map(([id, meta]) => (
                    <SelectItem key={id} value={id} className="text-sm">{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as HistorySort)}>
                <SelectTrigger className="cursor-pointer h-9 w-[160px] text-sm" aria-label="Sort runs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HISTORY_SORTS.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-sm">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {filtered.length > 0 && (
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label={allVisibleSelected ? 'Deselect all visible runs' : 'Select all visible runs'}
                  className="cursor-pointer"
                />
              )}
              <p className="text-xs text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
                {hasNextPage && ' (more available)'}
                {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 cursor-pointer gap-1.5 text-xs"
                    disabled={anyBusy}
                    onClick={() => bulkArchive.mutate([...selectedIds], { onSuccess: () => setSelectedIds(new Set()) })}
                  >
                    {bulkArchive.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                    Archive ({selectedIds.size})
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 cursor-pointer gap-1.5 text-xs text-destructive" disabled={anyBusy} onClick={() => setDeleteTarget({ kind: 'selected' })}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete ({selectedIds.size})
                  </Button>
                </>
              )}
              {loadedRuns.length > 0 && (
                <Button size="sm" variant="ghost" className="h-8 cursor-pointer gap-1.5 text-xs text-muted-foreground hover:text-destructive" disabled={anyBusy} onClick={() => setDeleteTarget({ kind: 'all' })}>
                  <Trash2 className="h-3.5 w-3.5" /> Clear history
                </Button>
              )}
            </div>
          </div>

          {runsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : runsQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-destructive">Could not load the history.</p>
              <Button variant="outline" size="sm" className="h-8 cursor-pointer text-xs" onClick={() => void runsQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <History className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{loadedRuns.length > 0 ? 'No runs match the filters' : 'No runs yet'}</p>
                <p className="text-xs text-muted-foreground">
                  {loadedRuns.length > 0 ? 'Adjust the search or filters.' : 'Every Images run will appear here, resumable at any step.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((run) => {
                const retakeOf = ((run.step_state ?? {}) as OmniImagesState).retake_of;
                return (
                  <HistoryRunCard
                    key={run.id}
                    run={run}
                    thumbs={thumbs?.[run.id]}
                    clonedFromTitle={retakeOf ? titleById.get(retakeOf) ?? null : null}
                    selected={selectedIds.has(run.id)}
                    busy={anyBusy}
                    onToggleSelect={() => toggleSelect(run.id)}
                    onOpen={onOpenRun}
                    onRequestRetake={setRetakeTarget}
                    onRequestDelete={(r) => setDeleteTarget({ kind: 'one', run: r })}
                  />
                );
              })}
              {/* Infinite-scroll sentinel + manual fallback. */}
              <div ref={sentinelRef} aria-hidden="true" />
              {hasNextPage && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 cursor-pointer gap-1.5 text-xs"
                    disabled={isFetchingNextPage}
                    onClick={() => void fetchNextPage()}
                  >
                    {isFetchingNextPage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <RetakeRunDialog
        run={retakeTarget}
        busy={retake.isPending}
        onConfirm={confirmRetake}
        onClose={() => setRetakeTarget(null)}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.kind === 'all' ? 'Clear the whole history?' : deleteTarget?.kind === 'selected' ? `Delete ${runsToDelete.length} selected entries?` : 'Delete this run?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCount > 0
                ? `This permanently removes ${deleteCount} ${deleteCount === 1 ? 'run' : 'runs'} with all generated images from storage. This cannot be undone.`
                : 'There is nothing to delete.'}
              {deleteTarget?.kind === 'all' && ' This clears the entire history, including any runs not shown above.'}
              {finalizedCount > 0 && ` ${finalizedCount} ${finalizedCount === 1 ? 'run is' : 'runs are'} saved to the Content Library and will also be removed from it, including any scheduled posts.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteRuns.isPending || deleteCount === 0}
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRuns.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
