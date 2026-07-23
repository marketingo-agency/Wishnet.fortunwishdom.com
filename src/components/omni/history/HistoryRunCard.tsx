"use client";

/**
 * One run in the History registry: thumbnail strip, title, mode and status
 * badges, meta line (images · models · networks · est. cost), progress with
 * the reached-stage hint, and the Resume / step-jump / Retake / Archive /
 * Delete controls.
 */

import { useState } from 'react';
import { Archive, ArchiveRestore, ChevronDown, ImageOff, ListOrdered, Play, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatDate';
import { formatUsd } from '@/config/falPricing';
import { useUpdateOmniRun, type OmniImagesState, type OmniRun } from '@/hooks/omni';
import { validateJumpTarget } from '../stepRegistry';
import { RUN_MODE_META, RUN_STATUS_META, isRunFinalized, resumableStepsForRun, runProgress, stepReached } from './historyRouting';
import { useArchiveRun, type RunThumbs } from './useOmniHistory';
import { SendToDeskButton } from '@/components/omni/content/SendToDeskButton';

interface HistoryRunCardProps {
  run: OmniRun;
  thumbs: RunThumbs | undefined;
  /** Title of the run this one was retaken from, when it is still loaded. */
  clonedFromTitle: string | null;
  selected: boolean;
  busy: boolean;
  onToggleSelect: () => void;
  onOpen: (run: OmniRun) => void;
  onRequestRetake: (run: OmniRun) => void;
  onRequestDelete: (run: OmniRun) => void;
}

export function HistoryRunCard({ run, thumbs, clonedFromTitle, selected, busy: externalBusy, onToggleSelect, onOpen, onRequestRetake, onRequestDelete }: HistoryRunCardProps) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const updateRun = useUpdateOmniRun();
  const archive = useArchiveRun();

  const state = (run.step_state ?? {}) as OmniImagesState;
  const progress = runProgress(run);
  const steps = resumableStepsForRun(run);
  const modeMeta = RUN_MODE_META[run.mode];
  const statusMeta = RUN_STATUS_META[run.status] ?? RUN_STATUS_META.active;
  const busy = externalBusy || updateRun.isPending || archive.isPending;
  // Step-jump rewrites current_step; a completed run would be demoted (and a
  // re-walk to Finalize would duplicate its library item), so finished runs
  // get Open at their final step plus Retake instead.
  const canJump = run.status === 'active' || run.status === 'failed';
  const isRetake = typeof state.retake_of === 'string';

  // HIST-10/14: current_step can sit behind the high-water mark (back-nav,
  // step jump) — surface how far the run actually got.
  const reached = stepReached(run);
  const reachedLabel = reached > run.current_step
    ? steps.find((s) => s.step === reached)?.label ?? null
    : null;

  const networkCount = state.preset_selections
    ? Object.keys(state.preset_selections).length
    : state.networks?.length ?? 0;
  const metaParts: string[] = [];
  if (thumbs && thumbs.imageCount > 0) metaParts.push(`${thumbs.imageCount} ${thumbs.imageCount === 1 ? 'image' : 'images'}`);
  if (thumbs && thumbs.modelCount > 0) metaParts.push(`${thumbs.modelCount} ${thumbs.modelCount === 1 ? 'model' : 'models'}`);
  if (networkCount > 0) metaParts.push(`${networkCount} ${networkCount === 1 ? 'network' : 'networks'}`);

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
          className="shrink-0 cursor-pointer"
        />

        {/* Thumbnail strip: up to 4 outputs (the data was always fetched — it
            used to be collapsed to one cover). */}
        <div className="flex shrink-0 -space-x-2">
          {(thumbs?.urls.length ?? 0) > 0 ? (
            thumbs!.urls.map((url, i) => (
              <div
                key={i}
                className="h-14 w-14 overflow-hidden rounded-lg border-2 border-card bg-muted"
                style={{ zIndex: thumbs!.urls.length - i }}
              >
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            ))
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
              <ImageOff className="h-4 w-4 text-muted-foreground/50" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 basis-44">
          <p className="truncate text-sm font-medium">{run.title || 'Untitled run'}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge className={cn('border-0 px-1.5 py-0 text-[10px] font-semibold', modeMeta.badge)}>{modeMeta.label}</Badge>
            {state.origin === 'character_studio' && (
              <Badge className="border-0 bg-fuchsia-500/15 px-1.5 py-0 text-[10px] font-semibold text-fuchsia-600 [[data-omni-theme=dark]_&]:text-fuchsia-300">
                Character Studio
              </Badge>
            )}
            <Badge className={cn('border-0 px-1.5 py-0 text-[10px] font-semibold', statusMeta.badge)}>{statusMeta.label}</Badge>
            {isRetake && (
              <Badge
                className="border-0 bg-violet-500/15 px-1.5 py-0 text-[10px] font-semibold text-violet-600 [[data-omni-theme=dark]_&]:text-violet-300"
                title={clonedFromTitle ? `Cloned from "${clonedFromTitle}"` : 'Cloned from a deleted run'}
                aria-label={clonedFromTitle ? `Retake cloned from ${clonedFromTitle}` : 'Retake cloned from a deleted run'}
              >
                Retake{clonedFromTitle ? ` of ${clonedFromTitle}` : ''}
              </Badge>
            )}
            {thumbs?.estCost != null && (
              <Badge
                className="border-0 bg-amber-500/15 px-1.5 py-0 text-[10px] font-semibold text-amber-700 [[data-omni-theme=dark]_&]:text-amber-300"
                title="Estimated fal.ai spend for this run's generated images"
                aria-label={`Estimated fal.ai spend ${formatUsd(thumbs.estCost)}`}
              >
                ~{formatUsd(thumbs.estCost)}{thumbs.hasUnknownCost ? '+' : ''}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">
              Step {progress.position} of {progress.total}
              {reachedLabel && ` · reached ${reachedLabel}`}
              {' · '}{formatDate(run.updated_at)}
            </span>
          </div>
          {metaParts.length > 0 && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">{metaParts.join(' · ')}</p>
          )}
        </div>

        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1">
          {(thumbs?.outputAssetIds.length ?? 0) > 0 && (
            <SendToDeskButton
              assetIds={thumbs!.outputAssetIds}
              title={run.title ?? undefined}
              size="xs"
              variant="ghost"
            />
          )}
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
            onClick={() => onRequestRetake(run)}
            disabled={busy}
            aria-label="Retake as a new run"
            className="h-8 w-8 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
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
                    ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-600 [[data-omni-theme=dark]_&]:text-cyan-300'
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
