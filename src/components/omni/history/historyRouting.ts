/**
 * History routing: which wizard surface renders a run at a given step.
 * omni_runs.mode is immutable, but transform runs hand off to the Omni
 * Images wizard at step 7 and repurposing runs live there from step 7 on,
 * so the surface must be resolved per target step, never from mode alone.
 */

import { TRANSFORM_STEP_TITLES } from '../transform/TransformChrome';
import { WIZARD_STEP_TITLES } from '../wizard/WizardChrome';
import type { OmniImagesState, OmniMode, OmniRun } from '@/hooks/omni';

export type WizardSurface = 'omni_images' | 'transform_upscale' | 'repurposing';

const OMNI_IMAGES_SEQUENCE = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12];
const TRANSFORM_SEQUENCE = [1, 2, 3, 4, 5, 6];
const HANDOFF_SEQUENCE = [7, 8, 9, 10, 11, 12];

export function resolveSurfaceForStep(mode: OmniMode, step: number): WizardSurface {
  if (mode === 'transform_upscale') return step <= 6 ? 'transform_upscale' : 'omni_images';
  // A persisted repurposing run always starts at step 7 (the gathering screen
  // is pre-persist), so it is rendered by the Omni Images wizard.
  return 'omni_images';
}

export interface ResumableStep {
  step: number;
  label: string;
}

/**
 * The furthest step the run ever reached. current_step can move backwards
 * (in-wizard back, History step-jump), so the high-water mark in step_state
 * keeps later steps resumable; repurposing runs are clamped to their floor.
 */
export function stepReached(run: OmniRun): number {
  const highWater = (run.step_state as OmniImagesState)?.max_step_reached ?? 0;
  const reached = Math.max(run.current_step, highWater);
  return run.mode === 'repurposing' ? Math.max(reached, 7) : reached;
}

/** Every step of the run's effective sequence up to where it has reached. */
export function resumableStepsForRun(run: OmniRun): ResumableStep[] {
  const reached = stepReached(run);
  let sequence: number[];
  let titles: (step: number) => string;

  if (run.mode === 'transform_upscale') {
    sequence = reached >= 7 ? [...TRANSFORM_SEQUENCE, ...HANDOFF_SEQUENCE] : TRANSFORM_SEQUENCE;
    titles = (s) => (s <= 6 ? TRANSFORM_STEP_TITLES[s] : WIZARD_STEP_TITLES[s]) ?? `Step ${s}`;
  } else if (run.mode === 'repurposing') {
    sequence = HANDOFF_SEQUENCE;
    titles = (s) => WIZARD_STEP_TITLES[s] ?? `Step ${s}`;
  } else {
    sequence = OMNI_IMAGES_SEQUENCE;
    titles = (s) => WIZARD_STEP_TITLES[s] ?? `Step ${s}`;
  }

  return sequence
    .filter((s) => s <= reached)
    .map((step) => ({ step, label: titles(step) }));
}

/** Display position of the run's current step within its sequence, e.g. 7 of 11. */
export function runProgress(run: OmniRun): { position: number; total: number } {
  const reached = stepReached(run);
  const all =
    run.mode === 'transform_upscale'
      ? reached >= 7 ? [...TRANSFORM_SEQUENCE, ...HANDOFF_SEQUENCE] : TRANSFORM_SEQUENCE
      : run.mode === 'repurposing'
        ? HANDOFF_SEQUENCE
        : OMNI_IMAGES_SEQUENCE;
  const idx = all.indexOf(run.current_step);
  return { position: idx >= 0 ? idx + 1 : all.length, total: all.length };
}

export const RUN_MODE_META: Record<OmniMode, { label: string; badge: string }> = {
  omni_images: { label: 'Omni Images', badge: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300' },
  transform_upscale: { label: 'Transform and Upscale', badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-300' },
  repurposing: { label: 'Images Repurposing', badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' },
  surprise_me: { label: 'Surprise Me', badge: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300' },
  brainstorming: { label: 'Brainstorming', badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' },
};

export const RUN_STATUS_META: Record<string, { label: string; badge: string }> = {
  active: { label: 'In progress', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  completed: { label: 'Completed', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  failed: { label: 'Failed', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  archived: { label: 'Archived', badge: 'bg-muted text-muted-foreground' },
};

/**
 * Completed runs back Content Library items (finalize is the only path to
 * 'completed'), and archived runs were completed before archiving, so both
 * are protected from hard delete to keep library images intact.
 */
export function isRunDeletable(run: OmniRun): boolean {
  return run.status === 'active' || run.status === 'failed';
}
