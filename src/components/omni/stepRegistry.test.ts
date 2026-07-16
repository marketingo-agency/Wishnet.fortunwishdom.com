/**
 * Specs for the step registry (Plan 1 §3 D-REG), written BEFORE the module
 * exists (Phase 2 TDD). Every spec is `it.todo` so this phase's gates stay
 * green; Phase 3 creates `stepRegistry.ts` and activates them one by one.
 *
 * v1→v2 ordinal map (D-REG):
 *   1,2 → 1 (brief) · 3,4 → 2 (engine) · 5,6 → 3 (generate) ·
 *   7,9 → 4 (distribution) · 10 → 5 (adapt) · 8 → 6 (captions) · 11,12 → 7 (finalize)
 * The map is prerequisite-AWARE: mappedStage = min(ordinalMap[oldStep],
 * firstIncompleteStage(state)).
 */
import { describe, it } from 'vitest';

describe('stepRegistry: stage definitions', () => {
  it.todo('exposes the seven v2 stage ids in order: brief, engine, generate, distribution, adapt, captions, finalize');
  it.todo('every stage carries a title and an ordinal consumed by WizardChrome');
  it.todo('the transform handoff boundary resolves to the distribution stage');
  it.todo('the repurposing floor resolves to the distribution stage');
});

describe('stepRegistry.migrateStepState: v1→v2 ordinal map', () => {
  it.todo('maps v1 steps 1 and 2 to the brief stage');
  it.todo('maps v1 steps 3 and 4 to the engine stage');
  it.todo('maps v1 steps 5 and 6 to the generate stage');
  it.todo('maps v1 steps 7 and 9 to the distribution stage');
  it.todo('maps v1 step 10 to the adapt stage');
  it.todo('maps v1 step 8 to the captions stage');
  it.todo('maps v1 steps 11 and 12 (legacy relic) to the finalize stage');
  it.todo('treats a missing schema_version as v1');
  it.todo('passes v2-stamped state through unchanged');
});

describe('stepRegistry.migrateStepState: prerequisite-aware clamping', () => {
  it.todo('a legacy run at old step 8 (captions) WITHOUT preset_selections resumes at distribution, not captions');
  it.todo('a legacy run at old step 8 WITH presets and approvals resumes at captions with caption_options preserved');
  it.todo('a transform run handed off at old step 7 resumes at distribution');
  it.todo('a repurposing run at old step 10 resumes at adapt');
  it.todo('a step-12 relic resumes at finalize');
  it.todo('an unlocked brainstorm run keeps routing to the chat surface');
  it.todo('a locked brainstorm run maps through the same ordinal table');
  it.todo('max_step_reached maps through the ordinal table taking the max of mapped values');
});

describe('stepRegistry: state-key contracts (D-REG)', () => {
  it.todo('preserves preset_selections through migration');
  it.todo('preserves caption_options and chosen_captions keyed [assetId][networkId]');
  it.todo('preserves approved_asset_ids, generated_asset_ids, selected_asset_ids');
  it.todo('preserves networks, model_selections and model_specs');
});

describe('stepRegistry: jump validation', () => {
  it.todo('rejects a jump to a stage beyond max reached');
  it.todo('translates legacy History jump integers before writing current_step');
});
