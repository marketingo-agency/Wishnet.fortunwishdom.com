/**
 * stepRegistry: the SINGLE source of truth for Omni wizard step knowledge
 * (Plan 1 §3 D-REG). Sequences, boundaries, floors, titles, back-targets,
 * the v1→v2 stage migration, and History jump validation all live here —
 * WizardChrome, OmniImagesWizard, TransformWizard/Chrome, historyRouting,
 * the retake seeder and HistoryRunCard consume it and hold no step literals
 * of their own.
 *
 * Two layers:
 *  - The v1 layer drives the CURRENT 11-step wizard (identity behavior —
 *    introduced as a pure refactor in Phase 3).
 *  - The v2 stage layer (7 stages) is defined and fully tested now, but is
 *    rendered only from Phase 6/7; ACTIVE_SCHEMA_VERSION flips to 2 at the
 *    end of Phase 7 together with the wizard restage.
 */

import type { OmniImagesState, OmniMode, OmniRun } from '@/hooks/omni';

// ── v2 stages ─────────────────────────────────────────────────────────────────

export type StageId =
  | 'brief'
  | 'engine'
  | 'generate'
  | 'distribution'
  | 'adapt'
  | 'captions'
  | 'finalize';

export interface StageDef {
  id: StageId;
  /** 1-based position; persisted as omni_runs.current_step under schema v2. */
  ordinal: number;
  title: string;
}

export const STAGES: StageDef[] = [
  { id: 'brief', ordinal: 1, title: 'Brief' },
  { id: 'engine', ordinal: 2, title: 'Models & quality' },
  { id: 'generate', ordinal: 3, title: 'Generate & select' },
  { id: 'distribution', ordinal: 4, title: 'Distribution' },
  { id: 'adapt', ordinal: 5, title: 'Adapt & approve' },
  { id: 'captions', ordinal: 6, title: 'Captions' },
  { id: 'finalize', ordinal: 7, title: 'Finalize' },
];

const STAGE_BY_ID = new Map<StageId, StageDef>(STAGES.map((s) => [s.id, s]));

export function stageOrdinal(id: StageId): number {
  return STAGE_BY_ID.get(id)!.ordinal;
}

export function stageForOrdinal(ordinal: number): StageDef {
  const clamped = Math.min(Math.max(Math.trunc(ordinal), 1), STAGES.length);
  return STAGES[clamped - 1];
}

/**
 * The schema version new persists stamp into step_state. FLIPPED to 2 at the
 * end of Phase 7: current_step now holds a STAGE ordinal (1-7) for stamped
 * runs; legacy v1 rows migrate on read through migrateStepState and convert
 * to v2 on their first persist.
 */
export const ACTIVE_SCHEMA_VERSION: 1 | 2 = 2;

/** The stage where transform/repurposing runs enter the images wizard (v2). */
export const V2_HANDOFF_STAGE: StageId = 'distribution';

/** Repurposing runs never sit below their handoff stage/step. */
export function repurposingFloorFor(state: OmniImagesState): number {
  return isV2State(state) ? stageOrdinal(V2_HANDOFF_STAGE) : REPURPOSING_FLOOR_STEP;
}

/**
 * Whether a transform run has crossed into the images wizard. v2 stamps only
 * exist post-handoff (TransformWizard never stamps its own 6 steps), so the
 * stamp itself is the boundary signal; legacy runs keep the step-7 check.
 */
export function isPastTransformBoundary(state: OmniImagesState, step: number): boolean {
  return isV2State(state) || step >= TRANSFORM_BOUNDARY_STEP;
}

// ── v1 flow knowledge (current behavior — the identity layer) ─────────────────

export const V1_WIZARD_SEQUENCE: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const V1_TRANSFORM_SEQUENCE: readonly number[] = [1, 2, 3, 4, 5, 6];
/** The images-wizard tail a transform run walks after its handoff. */
export const V1_HANDOFF_SEQUENCE: readonly number[] = [7, 8, 9, 10, 11];

/** First v1 step owned by the Omni Images wizard for transform runs. */
export const TRANSFORM_BOUNDARY_STEP = 7;
/** A persisted repurposing run never sits below this v1 step. */
export const REPURPOSING_FLOOR_STEP = 7;
export const V1_FINALIZE_STEP = 11;
/** Runs created before the approval/finalize merge persisted step 12. */
export const V1_LEGACY_FINALIZE_RELIC = 12;
/** Transform retake reseeds at the analysis step (source already referenced). */
export const V1_TRANSFORM_RESEED_STEP = 2;

/**
 * v1 entry ordinals of the merged Phase-6 stage groups (Brief owns v1 steps
 * 1-2, Engine 3-4, Generate 5-6). The stage components persist to the NEXT
 * group's entry until the Phase-7 flip replaces these with stage ordinals.
 */
export const V1_BRIEF_ENTRY_STEP = 1;
export const V1_ENGINE_ENTRY_STEP = 3;
export const V1_GENERATE_ENTRY_STEP = 5;

// Steps 1-6 render as the three merged Phase-6 stages (pairs share a title
// until the Phase-7 flip collapses the ordinals); the tail keeps v1 titles.
export const V1_WIZARD_STEP_TITLES: Record<number, string> = {
  1: 'Brief',
  2: 'Brief',
  3: 'Models & quality',
  4: 'Models & quality',
  5: 'Generate & select',
  6: 'Generate & select',
  7: 'Target networks',
  8: 'Social descriptions',
  9: 'Dimension presets',
  10: 'Repurpose & approve',
  11: 'Finalize',
};

export const V1_TRANSFORM_STEP_TITLES: Record<number, string> = {
  1: 'Pick the source image',
  2: 'Analysis',
  3: 'Describe the transformation',
  4: 'Pick your models',
  5: 'Live generation',
  6: 'Save or continue',
};

/** Render-time normalization of legacy relics (12 → 11). Never heals the DB. */
export function normalizeV1Step(raw: number): number {
  return raw === V1_LEGACY_FINALIZE_RELIC ? V1_FINALIZE_STEP : raw;
}

function nextIn(sequence: readonly number[], step: number): number {
  const idx = sequence.indexOf(step);
  return idx >= 0 && idx < sequence.length - 1 ? sequence[idx + 1] : step;
}

function backIn(sequence: readonly number[], step: number): number | undefined {
  const idx = sequence.indexOf(step);
  return idx > 0 ? sequence[idx - 1] : undefined;
}

export function v1NextStep(step: number): number {
  return nextIn(V1_WIZARD_SEQUENCE, normalizeV1Step(step));
}

export function v1BackTarget(step: number): number | undefined {
  return backIn(V1_WIZARD_SEQUENCE, normalizeV1Step(step));
}

export function v1TransformNextStep(step: number): number {
  return nextIn(V1_TRANSFORM_SEQUENCE, step);
}

export function v1TransformBackTarget(step: number): number | undefined {
  return backIn(V1_TRANSFORM_SEQUENCE, step);
}

// ── surface resolution (mode + step → rendering surface) ──────────────────────

export type WizardSurface = 'omni_images' | 'transform_upscale' | 'repurposing' | 'brainstorming';

export function surfaceForStep(mode: OmniMode, step: number): WizardSurface {
  if (mode === 'transform_upscale') {
    return step < TRANSFORM_BOUNDARY_STEP ? 'transform_upscale' : 'omni_images';
  }
  // Repurposing runs are persisted at/after their floor and render in the
  // images wizard; every other mode lives there outright.
  return 'omni_images';
}

// ── v1 → v2 migration (pure; rendered behavior flips at Phase 7) ──────────────

/**
 * Ordinal-faithful v1→v2 map (D-REG): 1,2→brief · 3,4→engine · 5,6→generate ·
 * 7,9→distribution · 10→adapt · 8→captions · 11,12→finalize.
 */
export const V1_STEP_TO_STAGE: Record<number, StageId> = {
  1: 'brief',
  2: 'brief',
  3: 'engine',
  4: 'engine',
  5: 'generate',
  6: 'generate',
  7: 'distribution',
  8: 'captions',
  9: 'distribution',
  10: 'adapt',
  11: 'finalize',
  12: 'finalize',
};

function stageComplete(id: StageId, state: OmniImagesState): boolean {
  switch (id) {
    case 'brief':
      return Boolean(state.objective && state.locked_prompt);
    case 'engine':
      return (state.model_selections?.length ?? 0) > 0;
    case 'generate':
      return (state.selected_asset_ids?.length ?? 0) > 0;
    case 'distribution':
      return (state.networks?.length ?? 0) > 0
        && Object.values(state.preset_selections ?? {}).some((presets) => presets.length > 0);
    case 'adapt':
      return (state.approved_asset_ids?.length ?? 0) > 0;
    case 'captions':
      return state.description_locked === true
        || Object.keys(state.chosen_captions ?? {}).length > 0;
    case 'finalize':
      return true;
  }
}

/** The earliest stage whose prerequisites are not yet satisfied. */
export function firstIncompleteStage(state: OmniImagesState): StageId {
  for (const stage of STAGES) {
    if (stage.id === 'finalize') break;
    if (!stageComplete(stage.id, state)) return stage.id;
  }
  return 'finalize';
}

/**
 * Prerequisite-AWARE stage for a legacy v1 step (D-REG):
 * mappedStage = min(ordinalMap[oldStep], firstIncompleteStage(state)).
 * A legacy run parked at old step 8 (captions) that never chose dimension
 * presets resumes at distribution, never at a dead-ended captions stage.
 */
export function stageForLegacyStep(rawStep: number, state: OmniImagesState): StageId {
  const mapped = V1_STEP_TO_STAGE[normalizeV1Step(rawStep)] ?? 'brief';
  const clamp = firstIncompleteStage(state);
  return stageOrdinal(mapped) <= stageOrdinal(clamp) ? mapped : clamp;
}

export function isV2State(state: OmniImagesState): boolean {
  return state.schema_version === 2;
}

export interface MigratedRunPosition {
  stage: StageId;
  /** The stage's 1-based ordinal (what v2 persists write to current_step). */
  ordinal: number;
  /** High-water mark mapped into stage ordinals. */
  maxStageOrdinal: number;
  /** The state object, untouched — every legacy key survives (D-REG contract). */
  state: OmniImagesState;
}

/**
 * Resolve a run's position in the v2 stage flow from persisted data of EITHER
 * schema. v2-stamped state passes through; v1 state maps through the
 * prerequisite-aware table. State keys are never rewritten here.
 */
export function migrateStepState(state: OmniImagesState, rawStep: number): MigratedRunPosition {
  if (isV2State(state)) {
    const stage = stageForOrdinal(rawStep);
    const maxOrdinal = Math.min(
      Math.max(state.max_step_reached ?? stage.ordinal, stage.ordinal),
      STAGES.length,
    );
    return { stage: stage.id, ordinal: stage.ordinal, maxStageOrdinal: maxOrdinal, state };
  }

  const stageId = stageForLegacyStep(rawStep, state);
  const ordinal = stageOrdinal(stageId);
  // Map the v1 high-water mark through the same table (max of mapped values).
  const v1Reached = Math.max(state.max_step_reached ?? 0, normalizeV1Step(rawStep));
  let maxStageOrdinal = ordinal;
  for (const [v1Step, stage] of Object.entries(V1_STEP_TO_STAGE)) {
    if (Number(v1Step) <= v1Reached) {
      maxStageOrdinal = Math.max(maxStageOrdinal, stageOrdinal(stage));
    }
  }
  return { stage: stageId, ordinal, maxStageOrdinal, state };
}

// ── History jump validation ───────────────────────────────────────────────────

/**
 * Validate + translate a History jump target before it is written to
 * current_step. Returns the normalized step to persist, or null when the
 * target is not a legitimately resumable step for this run (beyond the
 * high-water mark, off-sequence, or below a mode floor).
 *
 * v2-stamped runs jump between STAGE ordinals. A post-handoff (v2) transform
 * run only jumps within stages 4-7: its ints are stage ordinals now, so its
 * transform-chrome steps 1-6 are no longer addressable (Retake covers redoing
 * the transform itself).
 */
export function validateJumpTarget(run: OmniRun, targetStep: number): number | null {
  const state = (run.step_state ?? {}) as OmniImagesState;

  if (isV2State(state)) {
    const floor = run.mode === 'transform_upscale' || run.mode === 'repurposing'
      ? stageOrdinal(V2_HANDOFF_STAGE)
      : 1;
    const step = Math.trunc(targetStep);
    if (step < floor || step > STAGES.length) return null;
    const highWater = Math.max(run.current_step, state.max_step_reached ?? 0, floor);
    return step <= highWater ? step : null;
  }

  const step = normalizeV1Step(targetStep);
  let sequence: readonly number[];
  if (run.mode === 'transform_upscale') {
    sequence = [...V1_TRANSFORM_SEQUENCE, ...V1_HANDOFF_SEQUENCE];
  } else if (run.mode === 'repurposing') {
    sequence = V1_HANDOFF_SEQUENCE;
  } else {
    sequence = V1_WIZARD_SEQUENCE;
  }
  if (!sequence.includes(step)) return null;

  const highWater = Math.max(
    normalizeV1Step(run.current_step),
    state.max_step_reached ?? 0,
    run.mode === 'repurposing' ? REPURPOSING_FLOOR_STEP : 0,
  );
  return step <= highWater ? step : null;
}
