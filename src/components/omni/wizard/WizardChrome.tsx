"use client";

/**
 * WizardChrome: shared shell for every Omni Images wizard step.
 * Slim progress rail (12 spec steps), step title, back/exit controls.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { V1_WIZARD_SEQUENCE, V1_WIZARD_STEP_TITLES } from '../stepRegistry';

// Step knowledge lives in the registry (D-REG); re-exported for back-compat.
export const WIZARD_STEP_TITLES = V1_WIZARD_STEP_TITLES;

const STEP_SEQUENCE = V1_WIZARD_SEQUENCE;

interface WizardChromeProps {
  step: number;
  onBack?: () => void;
  onExit: () => void;
  children: React.ReactNode;
}

export function WizardChrome({ step, onBack, onExit, children }: WizardChromeProps) {
  const position = STEP_SEQUENCE.indexOf(step);
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
              aria-label="Previous step"
              className="h-8 w-8 shrink-0 cursor-pointer transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Omni Images · Step {position >= 0 ? position + 1 : step} of {STEP_SEQUENCE.length}
            </p>
            <h1 className="truncate text-sm font-semibold sm:text-base">{WIZARD_STEP_TITLES[step] ?? ''}</h1>
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

      <div className="flex shrink-0 gap-1 px-4 pt-3 sm:px-6" aria-hidden="true">
        {STEP_SEQUENCE.map((s, i) => (
          <div
            key={s}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              i < position ? 'bg-cyan-500/70' : i === position ? 'bg-gradient-to-r from-cyan-500 to-violet-600' : 'bg-muted',
            )}
          />
        ))}
      </div>

      <motion.div
        key={step}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </motion.div>
    </div>
  );
}
