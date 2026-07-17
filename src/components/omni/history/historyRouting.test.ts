/**
 * Regression net for the History resume matrix (Plan 1 Phase 2).
 * These tests pin the CURRENT v1 behavior (11-step wizard, transform handoff
 * at step 7, repurposing floor 7, brainstorm lock routing, legacy step-12
 * relics) so the Phase 3 registry refactor and the Phase 7 v2 flip cannot
 * silently misroute historic runs.
 */
import { describe, expect, it } from 'vitest';
import {
  isRunFinalized,
  resolveSurfaceForRun,
  resolveSurfaceForStep,
  resumableStepsForRun,
  runProgress,
  stepReached,
} from './historyRouting';
import type { OmniMode, OmniRun } from '@/hooks/omni';

function makeRun(overrides: Partial<OmniRun> & { mode: OmniMode }): OmniRun {
  return {
    id: 'run-1',
    user_id: 'user-1',
    title: null,
    current_step: 1,
    step_state: {},
    status: 'active',
    created_at: '2026-07-16T00:00:00Z',
    updated_at: '2026-07-16T00:00:00Z',
    ...overrides,
  };
}

describe('resolveSurfaceForStep', () => {
  it('routes transform runs to their own chrome through step 6', () => {
    for (let s = 1; s <= 6; s++) {
      expect(resolveSurfaceForStep('transform_upscale', s)).toBe('transform_upscale');
    }
  });

  it('hands transform runs to the images wizard from step 7', () => {
    for (let s = 7; s <= 11; s++) {
      expect(resolveSurfaceForStep('transform_upscale', s)).toBe('omni_images');
    }
  });

  it('routes every other mode to the images wizard at any step', () => {
    const modes: OmniMode[] = ['omni_images', 'repurposing', 'surprise_me'];
    for (const mode of modes) {
      for (const s of [1, 5, 7, 11]) {
        expect(resolveSurfaceForStep(mode, s)).toBe('omni_images');
      }
    }
  });
});

describe('resolveSurfaceForRun (brainstorm routing)', () => {
  it('keeps an unlocked brainstorm run at step 1 in the chat surface', () => {
    const run = makeRun({ mode: 'brainstorming', current_step: 1, step_state: {} });
    expect(resolveSurfaceForRun(run)).toBe('brainstorming');
  });

  it('moves a locked brainstorm run into the wizard', () => {
    const run = makeRun({ mode: 'brainstorming', current_step: 1, step_state: { idea_locked: true } });
    expect(resolveSurfaceForRun(run)).toBe('omni_images');
  });

  it('moves a brainstorm run past step 1 into the wizard even without the lock flag', () => {
    const run = makeRun({ mode: 'brainstorming', current_step: 3, step_state: {} });
    expect(resolveSurfaceForRun(run)).toBe('omni_images');
  });

  it('delegates non-brainstorm runs to the step resolver', () => {
    const run = makeRun({ mode: 'transform_upscale', current_step: 8 });
    expect(resolveSurfaceForRun(run)).toBe('omni_images');
  });
});

describe('stepReached', () => {
  it('takes the max of current_step and the high-water mark', () => {
    const run = makeRun({ mode: 'omni_images', current_step: 3, step_state: { max_step_reached: 9 } });
    expect(stepReached(run)).toBe(9);
  });

  it('uses current_step when it is ahead of the high-water mark', () => {
    const run = makeRun({ mode: 'omni_images', current_step: 6, step_state: { max_step_reached: 2 } });
    expect(stepReached(run)).toBe(6);
  });

  it('clamps repurposing runs to their step-7 floor', () => {
    const run = makeRun({ mode: 'repurposing', current_step: 1, step_state: {} });
    expect(stepReached(run)).toBe(7);
  });
});

describe('resumableStepsForRun (the resume matrix)', () => {
  it('omni_images: every step up to the one reached', () => {
    const run = makeRun({ mode: 'omni_images', current_step: 5 });
    expect(resumableStepsForRun(run).map((s) => s.step)).toEqual([1, 2, 3, 4, 5]);
  });

  it('omni_images legacy step-12 relic: the full 11-step sequence stays resumable', () => {
    const run = makeRun({ mode: 'omni_images', current_step: 12 });
    expect(resumableStepsForRun(run).map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('transform before the handoff: only its own 6 steps', () => {
    const run = makeRun({ mode: 'transform_upscale', current_step: 4 });
    expect(resumableStepsForRun(run).map((s) => s.step)).toEqual([1, 2, 3, 4]);
  });

  it('transform past the handoff: full combined sequence up to reached', () => {
    const run = makeRun({ mode: 'transform_upscale', current_step: 8 });
    expect(resumableStepsForRun(run).map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('repurposing: handoff steps only, floored at 7', () => {
    const run = makeRun({ mode: 'repurposing', current_step: 9 });
    expect(resumableStepsForRun(run).map((s) => s.step)).toEqual([7, 8, 9]);
  });

  it('repurposing at its floor exposes exactly step 7', () => {
    const run = makeRun({ mode: 'repurposing', current_step: 7 });
    expect(resumableStepsForRun(run).map((s) => s.step)).toEqual([7]);
  });

  it('brainstorm run advanced into the wizard resumes like an images run', () => {
    const run = makeRun({ mode: 'brainstorming', current_step: 6, step_state: { idea_locked: true } });
    expect(resumableStepsForRun(run).map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('every resumable step carries a non-empty label', () => {
    const run = makeRun({ mode: 'transform_upscale', current_step: 9 });
    for (const s of resumableStepsForRun(run)) {
      expect(s.label.length).toBeGreaterThan(0);
    }
  });
});

describe('runProgress', () => {
  it('reports position within the mode sequence', () => {
    const run = makeRun({ mode: 'omni_images', current_step: 7 });
    expect(runProgress(run)).toEqual({ position: 7, total: 11 });
  });

  it('repurposing positions are relative to the handoff sequence', () => {
    const run = makeRun({ mode: 'repurposing', current_step: 8 });
    expect(runProgress(run)).toEqual({ position: 2, total: 5 });
  });

  it('legacy step-12 (out of sequence) clamps to the end', () => {
    const run = makeRun({ mode: 'omni_images', current_step: 12 });
    expect(runProgress(run)).toEqual({ position: 11, total: 11 });
  });

  it('transform run at the handoff counts the combined sequence', () => {
    const run = makeRun({ mode: 'transform_upscale', current_step: 7 });
    expect(runProgress(run)).toEqual({ position: 7, total: 11 });
  });
});

describe('v2-stamped runs (post-flip)', () => {
  it('routes every v2 run to the images wizard', () => {
    expect(resolveSurfaceForRun(makeRun({ mode: 'omni_images', current_step: 3, step_state: { schema_version: 2 } }))).toBe('omni_images');
    expect(resolveSurfaceForRun(makeRun({ mode: 'transform_upscale', current_step: 4, step_state: { schema_version: 2 } }))).toBe('omni_images');
    expect(resolveSurfaceForRun(makeRun({ mode: 'repurposing', current_step: 4, step_state: { schema_version: 2 } }))).toBe('omni_images');
  });

  it('resumable steps are stage ordinals with stage titles', () => {
    const run = makeRun({ mode: 'omni_images', current_step: 3, step_state: { schema_version: 2, max_step_reached: 5 } });
    const steps = resumableStepsForRun(run);
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3, 4, 5]);
    expect(steps[0].label).toBe('Brief');
    expect(steps[4].label).toBe('Adapt & approve');
  });

  it('v2 transform/repurposing runs resume only in the wizard tail (stages 4+)', () => {
    const transform = makeRun({ mode: 'transform_upscale', current_step: 6, step_state: { schema_version: 2, max_step_reached: 6 } });
    expect(resumableStepsForRun(transform).map((s) => s.step)).toEqual([4, 5, 6]);
    const repurpose = makeRun({ mode: 'repurposing', current_step: 4, step_state: { schema_version: 2 } });
    expect(resumableStepsForRun(repurpose).map((s) => s.step)).toEqual([4]);
  });

  it('progress totals reflect the seven-stage flow', () => {
    expect(runProgress(makeRun({ mode: 'omni_images', current_step: 4, step_state: { schema_version: 2 } })))
      .toEqual({ position: 4, total: 7 });
    // Transform: 6 own steps + the 4-stage tail.
    expect(runProgress(makeRun({ mode: 'transform_upscale', current_step: 4, step_state: { schema_version: 2 } })))
      .toEqual({ position: 7, total: 10 });
    expect(runProgress(makeRun({ mode: 'repurposing', current_step: 5, step_state: { schema_version: 2 } })))
      .toEqual({ position: 2, total: 4 });
  });

  it('v2 repurposing floor is the distribution stage', () => {
    const run = makeRun({ mode: 'repurposing', current_step: 1, step_state: { schema_version: 2 } });
    expect(stepReached(run)).toBe(4);
  });

  it('legacy v1 runs keep their v1 sequences untouched', () => {
    const run = makeRun({ mode: 'repurposing', current_step: 9 });
    expect(resumableStepsForRun(run).map((s) => s.step)).toEqual([7, 8, 9]);
  });
});

describe('isRunFinalized', () => {
  it('flags completed and archived runs', () => {
    expect(isRunFinalized(makeRun({ mode: 'omni_images', status: 'completed' }))).toBe(true);
    expect(isRunFinalized(makeRun({ mode: 'omni_images', status: 'archived' }))).toBe(true);
  });

  it('does not flag active or failed runs', () => {
    expect(isRunFinalized(makeRun({ mode: 'omni_images', status: 'active' }))).toBe(false);
    expect(isRunFinalized(makeRun({ mode: 'omni_images', status: 'failed' }))).toBe(false);
  });
});
