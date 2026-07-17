/**
 * History routing: which wizard surface renders a run at a given step.
 * omni_runs.mode is immutable, but transform runs hand off to the Omni
 * Images wizard at step 7 and repurposing runs live there from step 7 on,
 * so the surface must be resolved per target step, never from mode alone.
 */

import {
  STAGES,
  TRANSFORM_BOUNDARY_STEP,
  V1_HANDOFF_SEQUENCE,
  V1_TRANSFORM_SEQUENCE,
  V1_TRANSFORM_STEP_TITLES,
  V1_WIZARD_SEQUENCE,
  V1_WIZARD_STEP_TITLES,
  isV2State,
  repurposingFloorFor,
  stageForOrdinal,
  stageOrdinal,
  surfaceForStep,
} from '../stepRegistry';
import type { WizardSurface } from '../stepRegistry';
import type { OmniImagesState, OmniMode, OmniRun } from '@/hooks/omni';

export type { WizardSurface } from '../stepRegistry';

const OMNI_IMAGES_SEQUENCE = V1_WIZARD_SEQUENCE;
const TRANSFORM_SEQUENCE = V1_TRANSFORM_SEQUENCE;
const HANDOFF_SEQUENCE = V1_HANDOFF_SEQUENCE;

/** All seven v2 stage ordinals. */
const V2_SEQUENCE = STAGES.map((s) => s.ordinal);
/** The v2 tail a transform/repurposing run walks (distribution → finalize). */
const V2_HANDOFF_ORDINALS = V2_SEQUENCE.filter((o) => o >= stageOrdinal('distribution'));

const runState = (run: OmniRun): OmniImagesState => (run.step_state ?? {}) as OmniImagesState;

/** Registry-backed surface resolution (kept as the module's public name). */
export const resolveSurfaceForStep = surfaceForStep;

/**
 * Run-aware resolver: a brainstorming run lives in the chat surface until its
 * idea is locked (or it has advanced past step 1), then in the wizard.
 * A v2 stamp on a transform run only exists post-handoff, so it routes to the
 * images wizard outright.
 */
export function resolveSurfaceForRun(run: OmniRun): WizardSurface {
  if (run.mode === 'brainstorming') {
    const locked = runState(run).idea_locked === true;
    return locked || run.current_step > 1 ? 'omni_images' : 'brainstorming';
  }
  if (isV2State(runState(run))) return 'omni_images';
  return resolveSurfaceForStep(run.mode, run.current_step);
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
  const state = runState(run);
  const highWater = state.max_step_reached ?? 0;
  const reached = Math.max(run.current_step, highWater);
  return run.mode === 'repurposing' ? Math.max(reached, repurposingFloorFor(state)) : reached;
}

/** Every step of the run's effective sequence up to where it has reached. */
export function resumableStepsForRun(run: OmniRun): ResumableStep[] {
  const reached = stepReached(run);

  // v2-stamped runs live on stage ordinals; transform/repurposing v2 stamps
  // only exist post-handoff, so their resumable range is the wizard tail.
  if (isV2State(runState(run))) {
    const floor = run.mode === 'transform_upscale' || run.mode === 'repurposing'
      ? stageOrdinal('distribution')
      : 1;
    return V2_SEQUENCE
      .filter((o) => o >= floor && o <= reached)
      .map((o) => ({ step: o, label: stageForOrdinal(o).title }));
  }

  let sequence: number[];
  let titles: (step: number) => string;

  if (run.mode === 'transform_upscale') {
    sequence = reached >= TRANSFORM_BOUNDARY_STEP ? [...TRANSFORM_SEQUENCE, ...HANDOFF_SEQUENCE] : [...TRANSFORM_SEQUENCE];
    titles = (s) => (s < TRANSFORM_BOUNDARY_STEP ? V1_TRANSFORM_STEP_TITLES[s] : V1_WIZARD_STEP_TITLES[s]) ?? `Step ${s}`;
  } else if (run.mode === 'repurposing') {
    sequence = [...HANDOFF_SEQUENCE];
    titles = (s) => V1_WIZARD_STEP_TITLES[s] ?? `Step ${s}`;
  } else {
    sequence = [...OMNI_IMAGES_SEQUENCE];
    titles = (s) => V1_WIZARD_STEP_TITLES[s] ?? `Step ${s}`;
  }

  return sequence
    .filter((s) => s <= reached)
    .map((step) => ({ step, label: titles(step) }));
}

/** Display position of the run's current step within its sequence, e.g. 4 of 7. */
export function runProgress(run: OmniRun): { position: number; total: number } {
  if (isV2State(runState(run))) {
    if (run.mode === 'transform_upscale') {
      // Post-handoff: the transform's own 6 steps precede the wizard tail.
      const tailIdx = V2_HANDOFF_ORDINALS.indexOf(run.current_step);
      const total = V1_TRANSFORM_SEQUENCE.length + V2_HANDOFF_ORDINALS.length;
      return { position: tailIdx >= 0 ? V1_TRANSFORM_SEQUENCE.length + tailIdx + 1 : total, total };
    }
    if (run.mode === 'repurposing') {
      const idx = V2_HANDOFF_ORDINALS.indexOf(run.current_step);
      return { position: idx >= 0 ? idx + 1 : V2_HANDOFF_ORDINALS.length, total: V2_HANDOFF_ORDINALS.length };
    }
    const ordinal = Math.min(Math.max(run.current_step, 1), V2_SEQUENCE.length);
    return { position: ordinal, total: V2_SEQUENCE.length };
  }

  const reached = stepReached(run);
  const all =
    run.mode === 'transform_upscale'
      ? reached >= TRANSFORM_BOUNDARY_STEP ? [...TRANSFORM_SEQUENCE, ...HANDOFF_SEQUENCE] : TRANSFORM_SEQUENCE
      : run.mode === 'repurposing'
        ? HANDOFF_SEQUENCE
        : OMNI_IMAGES_SEQUENCE;
  const idx = all.indexOf(run.current_step);
  return { position: idx >= 0 ? idx + 1 : all.length, total: all.length };
}

export const RUN_MODE_META: Record<OmniMode, { label: string; badge: string }> = {
  omni_images: { label: 'Studio', badge: 'bg-cyan-500/15 text-cyan-600 [[data-omni-theme=dark]_&]:text-cyan-300' },
  transform_upscale: { label: 'Transform and Upscale', badge: 'bg-blue-500/15 text-blue-600 [[data-omni-theme=dark]_&]:text-blue-300' },
  repurposing: { label: 'Images Repurposing', badge: 'bg-emerald-500/15 text-emerald-600 [[data-omni-theme=dark]_&]:text-emerald-300' },
  surprise_me: { label: 'Surprise Me', badge: 'bg-fuchsia-500/15 text-fuchsia-600 [[data-omni-theme=dark]_&]:text-fuchsia-300' },
  brainstorming: { label: 'Brainstorming', badge: 'bg-amber-500/15 text-amber-600 [[data-omni-theme=dark]_&]:text-amber-300' },
  // Videos track (Plan 2) — runs appear once the hub ships (Phase 3).
  video_scenario: { label: 'Scenario Studio', badge: 'bg-violet-500/15 text-violet-600 [[data-omni-theme=dark]_&]:text-violet-300' },
  omni_videos: { label: 'Video Studio', badge: 'bg-purple-500/15 text-purple-600 [[data-omni-theme=dark]_&]:text-purple-300' },
  video_clips: { label: 'Clips', badge: 'bg-rose-500/15 text-rose-600 [[data-omni-theme=dark]_&]:text-rose-300' },
  video_animate: { label: 'Animate', badge: 'bg-indigo-500/15 text-indigo-600 [[data-omni-theme=dark]_&]:text-indigo-300' },
  video_repurpose: { label: 'Repurpose & Enhance', badge: 'bg-teal-500/15 text-teal-600 [[data-omni-theme=dark]_&]:text-teal-300' },
};

export const RUN_STATUS_META: Record<string, { label: string; badge: string }> = {
  active: { label: 'In progress', badge: 'bg-sky-100 text-sky-700 [[data-omni-theme=dark]_&]:bg-sky-900/40 [[data-omni-theme=dark]_&]:text-sky-300' },
  completed: { label: 'Completed', badge: 'bg-emerald-100 text-emerald-700 [[data-omni-theme=dark]_&]:bg-emerald-900/40 [[data-omni-theme=dark]_&]:text-emerald-300' },
  failed: { label: 'Failed', badge: 'bg-red-100 text-red-700 [[data-omni-theme=dark]_&]:bg-red-900/40 [[data-omni-theme=dark]_&]:text-red-300' },
  archived: { label: 'Archived', badge: 'bg-muted text-muted-foreground' },
};

/** Whether a finalized run (completed/archived) backs a Content Library item —
 *  deleting such a run also removes that linked item (see useOmniHistory). */
export function isRunFinalized(run: OmniRun): boolean {
  return run.status === 'completed' || run.status === 'archived';
}
