"use client";

/**
 * WizardChrome: shared shell for every Studio stage.
 * Seven labeled rail segments (the v2 stage flow); stages at or below the
 * run's high-water mark are clickable (UX-16/07). Back/exit controls.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { STAGES } from '../stepRegistry';

interface WizardChromeProps {
  /** 1-based ordinal of the stage being rendered. */
  stageOrdinal: number;
  /** Furthest stage this run has reached (clickability boundary). */
  maxStageOrdinal: number;
  /** Stages below this ordinal are outside the run's flow (handoff modes). */
  minStageOrdinal?: number;
  title: string;
  onJumpStage?: (ordinal: number) => void;
  onBack?: () => void;
  onExit: () => void;
  children: React.ReactNode;
}

export function WizardChrome({
  stageOrdinal, maxStageOrdinal, minStageOrdinal = 1, title, onJumpStage, onBack, onExit, children,
}: WizardChromeProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label="Previous stage"
              className="h-8 w-8 shrink-0 cursor-pointer transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Studio · Stage {stageOrdinal} of {STAGES.length}
            </p>
            <h1 className="truncate text-sm font-semibold sm:text-base">{title}</h1>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onExit}
          aria-label="Exit wizard"
          className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex shrink-0 gap-1 px-4 pt-3 sm:px-6" aria-label="Stages">
        {STAGES.map((s) => {
          const inFlow = s.ordinal >= minStageOrdinal;
          const clickable = inFlow && s.ordinal <= maxStageOrdinal && s.ordinal !== stageOrdinal && !!onJumpStage;
          const state = s.ordinal === stageOrdinal ? 'current' : s.ordinal < stageOrdinal ? 'done' : 'todo';
          return (
            <button
              key={s.id}
              type="button"
              onClick={clickable ? () => onJumpStage?.(s.ordinal) : undefined}
              disabled={!clickable}
              aria-label={`Stage ${s.ordinal}: ${s.title}${clickable ? '' : s.ordinal === stageOrdinal ? ' (current)' : ' (not reached)'}`}
              aria-current={s.ordinal === stageOrdinal ? 'step' : undefined}
              className={cn(
                'group flex-1 rounded-sm pb-1 pt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                clickable ? 'cursor-pointer' : 'cursor-default',
                !inFlow && 'opacity-40',
              )}
            >
              <span
                className={cn(
                  'block h-1 w-full rounded-full transition-colors duration-300',
                  state === 'done' ? 'bg-cyan-500/70'
                    : state === 'current' ? 'bg-gradient-to-r from-cyan-500 to-violet-600'
                    : 'bg-muted',
                  clickable && 'group-hover:bg-cyan-400/80',
                )}
              />
              <span
                className={cn(
                  'mt-1 hidden truncate text-[10px] leading-tight sm:block',
                  state === 'current' ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  clickable && 'group-hover:text-foreground',
                )}
              >
                {s.title}
              </span>
            </button>
          );
        })}
      </nav>

      <motion.div
        key={stageOrdinal}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </motion.div>
    </div>
  );
}
