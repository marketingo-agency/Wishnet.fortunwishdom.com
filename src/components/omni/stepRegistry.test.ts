/**
 * Specs for the step registry (Plan 1 §3 D-REG). Written as it.todo in
 * Phase 2, activated in Phase 3 against the registry's PURE functions.
 * Note: the wizard still RENDERS v1 ordinals until the Phase 7 flip
 * (ACTIVE_SCHEMA_VERSION === 1); the migration layer is fully testable
 * regardless because it is pure.
 *
 * v1→v2 ordinal map (D-REG):
 *   1,2 → 1 (brief) · 3,4 → 2 (engine) · 5,6 → 3 (generate) ·
 *   7,9 → 4 (distribution) · 10 → 5 (adapt) · 8 → 6 (captions) · 11,12 → 7 (finalize)
 * The map is prerequisite-AWARE: mappedStage = min(ordinalMap[oldStep],
 * firstIncompleteStage(state)).
 */
import { describe, expect, it } from 'vitest';
import {
  ACTIVE_SCHEMA_VERSION,
  REPURPOSING_FLOOR_STEP,
  STAGES,
  TRANSFORM_BOUNDARY_STEP,
  V1_STEP_TO_STAGE,
  firstIncompleteStage,
  migrateStepState,
  normalizeV1Step,
  stageForLegacyStep,
  stageOrdinal,
  surfaceForStep,
  v1BackTarget,
  v1NextStep,
  v1TransformBackTarget,
  v1TransformNextStep,
  validateJumpTarget,
} from './stepRegistry';
import type { OmniImagesState, OmniMode, OmniRun } from '@/hooks/omni';

/** A state with EVERY stage prerequisite satisfied (no clamping in play). */
const COMPLETE_STATE: OmniImagesState = {
  objective: 'obj',
  locked_prompt: 'prompt',
  model_selections: [{ model_id: 'fal-ai/flux/schnell', name: 'Schnell', variants: 1 }],
  selected_asset_ids: ['a1'],
  networks: ['instagram'],
  preset_selections: { instagram: ['feed_square'] },
  approved_asset_ids: ['a1'],
  description_locked: true,
  chosen_captions: { a1: { instagram: 'caption' } },
};

function makeRun(overrides: Partial<OmniRun> & { mode: OmniMode }): OmniRun {
  return {
    id: 'run-1',
    user_id: 'user-1',
    title: null,
    current_step: 1,
    step_state: {},
    status: 'active',
    created_at: '2026-07-17T00:00:00Z',
    updated_at: '2026-07-17T00:00:00Z',
    ...overrides,
  };
}

describe('stepRegistry: stage definitions', () => {
  it('exposes the seven v2 stage ids in order', () => {
    expect(STAGES.map((s) => s.id)).toEqual([
      'brief', 'engine', 'generate', 'distribution', 'adapt', 'captions', 'finalize',
    ]);
  });

  it('every stage carries a title and a 1-based ordinal', () => {
    STAGES.forEach((s, i) => {
      expect(s.ordinal).toBe(i + 1);
      expect(s.title.length).toBeGreaterThan(0);
    });
  });

  it('the transform handoff boundary maps to the distribution stage', () => {
    expect(V1_STEP_TO_STAGE[TRANSFORM_BOUNDARY_STEP]).toBe('distribution');
  });

  it('the repurposing floor maps to the distribution stage', () => {
    expect(V1_STEP_TO_STAGE[REPURPOSING_FLOOR_STEP]).toBe('distribution');
  });

  it('the flip has not happened yet (Phase 7 exit criterion)', () => {
    expect(ACTIVE_SCHEMA_VERSION).toBe(1);
  });
});

describe('stepRegistry: v1 identity layer', () => {
  it('walks the 11-step wizard forward and back', () => {
    expect(v1NextStep(1)).toBe(2);
    expect(v1NextStep(10)).toBe(11);
    expect(v1NextStep(11)).toBe(11);
    expect(v1BackTarget(2)).toBe(1);
    expect(v1BackTarget(11)).toBe(10);
    expect(v1BackTarget(1)).toBeUndefined();
  });

  it('walks the 6-step transform flow forward and back', () => {
    expect(v1TransformNextStep(1)).toBe(2);
    expect(v1TransformNextStep(5)).toBe(6);
    expect(v1TransformBackTarget(1)).toBeUndefined();
    expect(v1TransformBackTarget(6)).toBe(5);
  });

  it('normalizes the legacy step-12 relic to Finalize', () => {
    expect(normalizeV1Step(12)).toBe(11);
    expect(normalizeV1Step(7)).toBe(7);
  });

  it('resolves surfaces identically to the pre-registry behavior', () => {
    expect(surfaceForStep('transform_upscale', 6)).toBe('transform_upscale');
    expect(surfaceForStep('transform_upscale', 7)).toBe('omni_images');
    expect(surfaceForStep('repurposing', 7)).toBe('omni_images');
    expect(surfaceForStep('omni_images', 1)).toBe('omni_images');
  });
});

describe('stepRegistry.migrateStepState: v1→v2 ordinal map', () => {
  const cases: Array<[number, string]> = [
    [1, 'brief'], [2, 'brief'],
    [3, 'engine'], [4, 'engine'],
    [5, 'generate'], [6, 'generate'],
    [7, 'distribution'], [9, 'distribution'],
    [10, 'adapt'],
    [8, 'captions'],
    [11, 'finalize'], [12, 'finalize'],
  ];
  for (const [v1Step, stage] of cases) {
    it(`maps v1 step ${v1Step} to the ${stage} stage (prereqs satisfied)`, () => {
      expect(migrateStepState(COMPLETE_STATE, v1Step).stage).toBe(stage);
    });
  }

  it('treats a missing schema_version as v1', () => {
    const migrated = migrateStepState({ ...COMPLETE_STATE }, 9);
    expect(migrated.stage).toBe('distribution');
  });

  it('passes v2-stamped state through unchanged', () => {
    const v2: OmniImagesState = { schema_version: 2, objective: 'x' };
    const migrated = migrateStepState(v2, 6);
    expect(migrated.stage).toBe('captions');
    expect(migrated.ordinal).toBe(6);
    expect(migrated.state).toBe(v2);
  });

  it('clamps out-of-range v2 ordinals instead of crashing', () => {
    expect(migrateStepState({ schema_version: 2 }, 99).stage).toBe('finalize');
    expect(migrateStepState({ schema_version: 2 }, 0).stage).toBe('brief');
  });
});

describe('stepRegistry.migrateStepState: prerequisite-aware clamping', () => {
  it('a legacy run at old step 8 WITHOUT preset_selections resumes at distribution, not captions', () => {
    const state: OmniImagesState = {
      ...COMPLETE_STATE,
      preset_selections: {},
      description_locked: undefined,
      chosen_captions: undefined,
      approved_asset_ids: undefined,
      caption_options: { a1: { instagram: ['draft option'] } },
    };
    const migrated = migrateStepState(state, 8);
    expect(migrated.stage).toBe('distribution');
    // Existing caption drafts survive migration for later (D-REG contract).
    expect(migrated.state.caption_options).toEqual({ a1: { instagram: ['draft option'] } });
  });

  it('a legacy run at old step 8 WITH presets and approvals resumes at captions', () => {
    const state: OmniImagesState = {
      ...COMPLETE_STATE,
      description_locked: undefined,
      chosen_captions: undefined,
      caption_options: { a1: { instagram: ['opt'] } },
    };
    const migrated = migrateStepState(state, 8);
    expect(migrated.stage).toBe('captions');
    expect(migrated.state.caption_options).toEqual({ a1: { instagram: ['opt'] } });
  });

  it('a transform run handed off at old step 7 resumes at distribution', () => {
    const state: OmniImagesState = {
      objective: 'transformed',
      locked_prompt: 'transformed',
      model_selections: COMPLETE_STATE.model_selections,
      selected_asset_ids: ['t1'],
    };
    expect(migrateStepState(state, 7).stage).toBe('distribution');
  });

  it('a repurposing run at old step 10 resumes at adapt when prereqs hold', () => {
    const state: OmniImagesState = { ...COMPLETE_STATE, approved_asset_ids: undefined };
    expect(migrateStepState(state, 10).stage).toBe('adapt');
  });

  it('a step-12 relic resumes at finalize when everything is complete', () => {
    expect(migrateStepState(COMPLETE_STATE, 12).stage).toBe('finalize');
  });

  it('a step-11 run missing approvals clamps back to adapt', () => {
    const state: OmniImagesState = { ...COMPLETE_STATE, approved_asset_ids: [] };
    expect(migrateStepState(state, 11).stage).toBe('adapt');
  });

  it('an empty-state run always lands on brief', () => {
    expect(migrateStepState({}, 9).stage).toBe('brief');
  });

  it('max_step_reached maps through the ordinal table taking the max of mapped values', () => {
    // Reached old step 9; the v1 walk passed step 8 (captions, stage 6), so the
    // mapped high-water is captions — the MAX of mapped values, not the mapping
    // of 9 itself (distribution).
    const state: OmniImagesState = { ...COMPLETE_STATE, max_step_reached: 9 };
    const migrated = migrateStepState(state, 3);
    expect(migrated.stage).toBe('engine');
    expect(migrated.maxStageOrdinal).toBe(stageOrdinal('captions'));

    // A run that never passed old step 8 maps its high-water to distribution.
    const early: OmniImagesState = { ...COMPLETE_STATE, max_step_reached: 7 };
    expect(migrateStepState(early, 3).maxStageOrdinal).toBe(stageOrdinal('distribution'));
  });
});

describe('stepRegistry: firstIncompleteStage', () => {
  it('walks the prerequisites in stage order', () => {
    expect(firstIncompleteStage({})).toBe('brief');
    expect(firstIncompleteStage({ objective: 'o', locked_prompt: 'p' })).toBe('engine');
    expect(firstIncompleteStage({
      objective: 'o', locked_prompt: 'p',
      model_selections: COMPLETE_STATE.model_selections,
    })).toBe('generate');
    expect(firstIncompleteStage(COMPLETE_STATE)).toBe('finalize');
  });

  it('distribution needs BOTH networks and at least one non-empty preset list', () => {
    const base: OmniImagesState = {
      ...COMPLETE_STATE, approved_asset_ids: undefined, description_locked: undefined, chosen_captions: undefined,
    };
    expect(firstIncompleteStage({ ...base, preset_selections: {} })).toBe('distribution');
    expect(firstIncompleteStage({ ...base, preset_selections: { instagram: [] } })).toBe('distribution');
    expect(firstIncompleteStage({ ...base, networks: [] })).toBe('distribution');
    expect(firstIncompleteStage(base)).toBe('adapt');
  });

  it('stageForLegacyStep never maps ahead of the first incomplete stage', () => {
    expect(stageForLegacyStep(11, {})).toBe('brief');
    expect(stageForLegacyStep(1, COMPLETE_STATE)).toBe('brief');
  });
});

describe('stepRegistry: state-key contracts (D-REG)', () => {
  it('migration never rewrites state keys', () => {
    const state: OmniImagesState = { ...COMPLETE_STATE, max_step_reached: 9 };
    const migrated = migrateStepState(state, 9);
    expect(migrated.state).toBe(state);
    expect(migrated.state.preset_selections).toEqual({ instagram: ['feed_square'] });
    expect(migrated.state.chosen_captions).toEqual({ a1: { instagram: 'caption' } });
    expect(migrated.state.approved_asset_ids).toEqual(['a1']);
    expect(migrated.state.model_selections).toEqual(COMPLETE_STATE.model_selections);
    expect(migrated.state.networks).toEqual(['instagram']);
  });
});

describe('stepRegistry: jump validation', () => {
  it('rejects a jump beyond the high-water mark', () => {
    const run = makeRun({ mode: 'omni_images', current_step: 3, step_state: { max_step_reached: 5 } });
    expect(validateJumpTarget(run, 6)).toBeNull();
    expect(validateJumpTarget(run, 5)).toBe(5);
  });

  it('translates the legacy step-12 relic before writing current_step', () => {
    const run = makeRun({ mode: 'omni_images', current_step: 12 });
    expect(validateJumpTarget(run, 12)).toBe(11);
  });

  it('rejects off-sequence steps for the mode', () => {
    const repurposing = makeRun({ mode: 'repurposing', current_step: 9 });
    expect(validateJumpTarget(repurposing, 3)).toBeNull();
    expect(validateJumpTarget(repurposing, 8)).toBe(8);
  });

  it('honors the repurposing floor even when current_step is corrupt', () => {
    const run = makeRun({ mode: 'repurposing', current_step: 1 });
    expect(validateJumpTarget(run, 7)).toBe(7);
  });

  it('allows the transform combined sequence after the handoff', () => {
    const run = makeRun({ mode: 'transform_upscale', current_step: 8, step_state: { max_step_reached: 8 } });
    expect(validateJumpTarget(run, 3)).toBe(3);
    expect(validateJumpTarget(run, 8)).toBe(8);
    expect(validateJumpTarget(run, 9)).toBeNull();
  });
});
