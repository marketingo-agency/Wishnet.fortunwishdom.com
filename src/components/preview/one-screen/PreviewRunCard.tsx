"use client";

/**
 * Run-card state for wizard-type history entries in the One-Screen Preview:
 * a snapshot mock of a paused/finished Omni run (step rail, output thumbs)
 * with a REAL "Resume in Omni" link to the live agent.
 */
import Link from 'next/link';
import { Check, History, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RUN_THUMB_GRADIENTS, metaForRun, type PreviewRun } from './previewMockData';
import { PT } from './previewTokens';

// Omni's badge convention: bordered tint, light text-700 base, dark via the
// [[data-omni-theme=dark]_&]: variant (see OmniEntryTiles AVAILABILITY_BADGE).
const STATUS_META: Record<PreviewRun['status'], { label: string; className: string }> = {
  completed: {
    label: 'Completed',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 [[data-omni-theme=dark]_&]:text-emerald-400',
  },
  in_progress: {
    label: 'In progress',
    className: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-400',
  },
  draft: {
    label: 'Draft',
    className: 'border-border bg-muted/60 text-muted-foreground',
  },
};

export const PreviewRunCard = ({ run }: { run: PreviewRun }) => {
  const meta = metaForRun(run);
  const status = STATUS_META[run.status];
  const steps = run.progress?.steps ?? [];
  const done = run.progress?.done ?? 0;

  return (
    <section aria-label={`${run.title} run snapshot`} className={cn('rounded-2xl p-5 sm:p-6', PT.panel)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-medium', meta.badgeClass)}>
          {meta.label}
        </span>
        <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-medium', status.className)}>
          {status.label}
        </span>
        <span className={cn('ml-auto text-xs', PT.faint)}>{run.time}</span>
      </div>

      <h2 className="[font-family:var(--font-poppins)] mt-3 text-lg font-bold sm:text-xl">{run.title}</h2>

      <ol className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2" aria-label="Run steps">
        {steps.map((step, i) => {
          const isDone = i < done;
          const isCurrent = i === done && run.status !== 'completed';
          return (
            <li key={step} className="flex items-center gap-1.5 text-xs">
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold',
                  isDone && 'border-transparent bg-gradient-to-br from-cyan-500 to-violet-600 text-white',
                  isCurrent && 'border-cyan-500 text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-400',
                  !isDone && !isCurrent && cn('border-border', PT.faint),
                )}
              >
                {isDone ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className={cn(isDone || isCurrent ? PT.muted : PT.faint)}>
                {step}
                {isCurrent ? ' (current)' : ''}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {RUN_THUMB_GRADIENTS.map((gradient, i) => (
          <div
            key={gradient}
            className={cn('relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br', gradient)}
            role="img"
            aria-label={`Mock output ${i + 1}`}
          >
            <ImageIcon className="h-6 w-6 text-white/70" aria-hidden="true" />
            <span className="absolute bottom-1.5 left-2 text-[10px] font-medium text-white/80">Mock output</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link
          href="/ai-agents/omni"
          className={cn(
            'inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200 motion-reduce:transition-none',
            PT.accentBtn,
            PT.focusRing,
          )}
        >
          Resume in Omni
        </Link>
        <button
          type="button"
          title="Available in the real build"
          className={cn(
            'inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none',
            PT.border,
            PT.row,
            PT.focusRing,
          )}
        >
          <History className="h-4 w-4" aria-hidden="true" />
          Timeline (preview)
        </button>
      </div>

      <p className={cn('mt-4 text-[11px] leading-relaxed', PT.faint)}>
        This card is a mock snapshot. In the real one-screen build, selecting a history entry
        reopens the actual wizard exactly where it left off.
      </p>
    </section>
  );
};
