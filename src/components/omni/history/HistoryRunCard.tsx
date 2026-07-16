"use client";

/**
 * One run in the History registry: cover, title, mode and status badges,
 * progress, and the Resume / step-jump / Retake / Archive / Delete controls.
 */

import { useState } from 'react';
import { Archive, ArchiveRestore, ChevronDown, ImageOff, ListOrdered, Loader2, Play, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatDate } from '@/components/settings/pulsePlatforms';
import { useUpdateOmniRun, type OmniRun } from '@/hooks/omni';
import { validateJumpTarget } from '../stepRegistry';
import { RUN_MODE_META, RUN_STATUS_META, isRunFinalized, resumableStepsForRun, runProgress } from './historyRouting';
import { useArchiveRun, useRetakeRun } from './useOmniHistory';

interface HistoryRunCardProps {
  run: OmniRun;
  coverUrl: string | undefined;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: (run: OmniRun) => void;
  onRequestDelete: (run: OmniRun) => void;
}

export function HistoryRunCard({ run, coverUrl, selected, onToggleSelect, onOpen, onRequestDelete }: HistoryRunCardProps) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const updateRun = useUpdateOmniRun();
  const archive = useArchiveRun();
  const retake = useRetakeRun();

  const progress = runProgress(run);
  const steps = resumableStepsForRun(run);
  const modeMeta = RUN_MODE_META[run.mode];
  const statusMeta = RUN_STATUS_META[run.status] ?? RUN_STATUS_META.active;
  const busy = updateRun.isPending || archive.isPending || retake.isPending;
  // Step-jump rewrites current_step; a completed run would be demoted (and a
  // re-walk to Finalize would duplicate its library item), so finished runs
  // get Open at their final step plus Retake instead.
  const canJump = run.status === 'active' || run.status === 'failed';

  const jumpToStep = async (step: number) => {
    if (busy) return;
    // Registry-validated: only legitimately resumable steps are ever written
    // to current_step (translates legacy relics, enforces floors/high-water).
    const target = validateJumpTarget(run, step);
    if (target == null) {
      toast.error('That step is not resumable for this run.');
      return;
    }
    try {
      const updated = await updateRun.mutateAsync({ runId: run.id, current_step: target });
      onOpen(updated);
    } catch (e) {
      // HIST-11: a failed jump used to be silent — the click just did nothing.
      toast.error(`Could not jump to that step: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  };

  const handleRetake = () => {
    retake.mutate(run, { onSuccess: ({ run: clone }) => onOpen(clone) });
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-card transition-all duration-200 hover:shadow-md',
        selected && 'border-cyan-500/60 ring-1 ring-cyan-500/40',
      )}
    >
      {/* Wraps on narrow screens: the action cluster drops to its own row
          instead of crushing the title column. */}
      <div className="flex flex-wrap items-center gap-3 p-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          aria-label={`Select ${run.title ?? 'untitled run'}`}
          className="shrink-0"
        />

        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff className="h-4 w-4 text-muted-foreground/50" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 basis-44">
          <p className="truncate text-sm font-medium">{run.title || 'Untitled run'}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge className={cn('border-0 px-1.5 py-0 text-[10px] font-semibold', modeMeta.badge)}>{modeMeta.label}</Badge>
            <Badge className={cn('border-0 px-1.5 py-0 text-[10px] font-semibold', statusMeta.badge)}>{statusMeta.label}</Badge>
            <span className="text-[10px] text-muted-foreground">
              Step {progress.position} of {progress.total} · {formatDate(run.updated_at)}
            </span>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1">
          <Button
            size="sm"
            onClick={() => onOpen(run)}
            disabled={busy}
            className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
          >
            <Play className="h-3.5 w-3.5" />
            {run.status === 'completed' || run.status === 'archived' ? 'Open' : 'Resume'}
          </Button>
          {canJump && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStepsOpen((o) => !o)}
              aria-label="Jump to a step"
              aria-expanded={stepsOpen}
              className="h-8 w-8 cursor-pointer"
            >
              {stepsOpen ? <ChevronDown className="h-4 w-4" /> : <ListOrdered className="h-4 w-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRetake}
            disabled={busy}
            aria-label="Retake as a new run"
            className="h-8 w-8 cursor-pointer"
          >
            {retake.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          </Button>
          {/* Finalized runs keep Archive (hide without deleting) alongside Delete. */}
          {isRunFinalized(run) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => archive.mutate({ runId: run.id, status: run.status === 'archived' ? 'completed' : 'archived' })}
              disabled={busy}
              aria-label={run.status === 'archived' ? 'Restore from archive' : 'Archive this run'}
              className="h-8 w-8 cursor-pointer"
            >
              {run.status === 'archived' ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRequestDelete(run)}
            disabled={busy}
            aria-label="Delete this run"
            className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {stepsOpen && canJump && (
        <div className="border-t px-3 py-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Resume at any step
          </p>
          <div className="flex flex-wrap gap-1.5">
            {steps.map(({ step, label }) => (
              <button
                key={step}
                onClick={() => void jumpToStep(step)}
                disabled={busy}
                className={cn(
                  'cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                  step === run.current_step
                    ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {step}. {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
