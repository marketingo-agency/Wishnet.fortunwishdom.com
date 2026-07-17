"use client";

/**
 * OmniImagesWizard: the Studio workflow orchestrator (v2 stage flow).
 *
 * THE FLIP (Plan 1 Phase 7): current_step now persists STAGE ordinals (1-7)
 * with step_state stamped schema_version 2. Legacy v1 rows (11-step ints,
 * schema absent) migrate on read through the registry's prerequisite-aware
 * migrateStepState and convert to v2 on their first persist. State keys are
 * never rewritten (D-REG contract), so legacy runs keep everything.
 */

import { useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  useCreateOmniRun, useOmniAssets, useOmniRun, useUpdateOmniRun,
  type OmniImagesState, type OmniRepurposedRef,
} from '@/hooks/omni';
import {
  V2_HANDOFF_STAGE, migrateStepState, stageForOrdinal, stageOrdinal, type StageId,
} from '../stepRegistry';
import { WizardChrome } from './WizardChrome';
import { StageBrief } from './StageBrief';
import { StageEngine } from './StageEngine';
import { StageGenerate } from './StageGenerate';
import { StageDistribution } from './StageDistribution';
import { StageCaptions } from './StageCaptions';
import { StepRepurpose } from './StepRepurpose';
import { StepFinalize } from './StepFinalize';

interface OmniImagesWizardProps {
  runId: string | null;
  onRunCreated: (runId: string) => void;
  onExit: () => void;
}

export function OmniImagesWizard({ runId, onRunCreated, onExit }: OmniImagesWizardProps) {
  const queryClient = useQueryClient();
  const run = useOmniRun(runId);
  const createRun = useCreateOmniRun();
  const updateRun = useUpdateOmniRun();
  const assets = useOmniAssets(runId);

  // Local mirrors seeded from the loaded run; the run row stays the source of
  // truth for resume, the mirrors keep the UI snappy between persists.
  const [localStep, setLocalStep] = useState<number | null>(null);
  const [localState, setLocalState] = useState<OmniImagesState | null>(null);
  // UX-03: a failed persist reverts the optimistic advance and renders a
  // blocking banner with Retry instead of letting the UI march ahead of the DB.
  const [pendingPersist, setPendingPersist] = useState<{ step: number; state: OmniImagesState } | null>(null);
  // UX-15: leaving mid-generation needs a second, informed click.
  const [genRunning, setGenRunning] = useState(false);
  const leaveArmedAt = useRef(0);

  const rawStep = localStep ?? run.data?.current_step ?? 1;
  const state: OmniImagesState = useMemo(
    () => localState ?? ((run.data?.step_state ?? {}) as OmniImagesState),
    [localState, run.data],
  );

  // Schema-agnostic position: v2 rows pass through, v1 rows map through the
  // prerequisite-aware table. All rendering keys off the stage id.
  const migrated = useMemo(() => migrateStepState(state, rawStep), [state, rawStep]);
  const stage = migrated.stage;
  const maxStageOrdinal = Math.max(migrated.maxStageOrdinal, migrated.ordinal);

  const writeRun = async (nextOrdinal: number, nextState: OmniImagesState) => {
    if (!runId) {
      const created = await createRun.mutateAsync({
        mode: 'omni_images',
        title: nextState.objective?.slice(0, 80),
        step_state: nextState,
      });
      await updateRun.mutateAsync({ runId: created.id, current_step: nextOrdinal, step_state: nextState });
      onRunCreated(created.id);
    } else {
      await updateRun.mutateAsync({ runId, current_step: nextOrdinal, step_state: nextState });
    }
  };

  /** Advance/jump persist: stamps v2 and writes the stage ordinal. */
  const persist = async (nextStage: StageId, patch: Partial<OmniImagesState>) => {
    const nextOrdinal = stageOrdinal(nextStage);
    const prevStep = localStep;
    const prevState = localState;
    const nextState: OmniImagesState = {
      ...state,
      ...patch,
      schema_version: 2,
      max_step_reached: Math.max(maxStageOrdinal, nextOrdinal),
    };
    setLocalState(nextState);
    setLocalStep(nextOrdinal);
    // Stages after generation read asset records (dims, storage paths); the
    // cached snapshot predates generation, so refresh it on advance.
    if (runId && nextOrdinal >= stageOrdinal(V2_HANDOFF_STAGE)) {
      void queryClient.invalidateQueries({ queryKey: ['omni-assets', runId] });
    }
    try {
      await writeRun(nextOrdinal, nextState);
      setPendingPersist(null);
    } catch (e) {
      // Roll the optimistic advance back (UX-03); the banner offers Retry.
      setLocalStep(prevStep);
      setLocalState(prevState);
      setPendingPersist({ step: nextOrdinal, state: nextState });
      toast.error(`Could not save your progress: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  };

  const retryPersist = async () => {
    if (!pendingPersist) return;
    const { step: nextOrdinal, state: nextState } = pendingPersist;
    setLocalState(nextState);
    setLocalStep(nextOrdinal);
    try {
      await writeRun(nextOrdinal, nextState);
      setPendingPersist(null);
    } catch (e) {
      setLocalStep(null);
      setLocalState(null);
      toast.error(`Still could not save: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  };

  /** Position-only write (Back / rail jump): converts legacy rows to v2 too —
   *  a stage ordinal is only coherent alongside the schema stamp. */
  const writePosition = (ordinal: number) => {
    const nextState: OmniImagesState = {
      ...state,
      schema_version: 2,
      max_step_reached: maxStageOrdinal,
    };
    setLocalState(nextState);
    setLocalStep(ordinal);
    if (runId) void updateRun.mutateAsync({ runId, current_step: ordinal, step_state: nextState });
  };

  // Paid adapt-stage outputs reach step_state as soon as each job completes,
  // not only on Continue: an exit or refresh mid-stage then restores them
  // instead of re-billing every job. Schema is preserved as-is (a state-only
  // write must never flip a v1 row whose current_step is still a v1 int).
  const persistSilently = async (patch: Partial<OmniImagesState>) => {
    if (!runId) return;
    const nextState: OmniImagesState = { ...state, ...patch };
    setLocalState(nextState);
    try {
      await updateRun.mutateAsync({ runId, step_state: nextState });
    } catch {
      // Non-fatal: the next completed job or the Continue persist retries.
    }
  };

  // The handoff boundary: transform and repurposing runs do not own the early
  // stages (their early steps live elsewhere or nowhere), so their floor is
  // the distribution stage. surprise_me and locked brainstorming runs own the
  // full flow.
  const runMode = run.data?.mode;
  const ownsEarlySteps = runMode == null || runMode === 'omni_images' || runMode === 'surprise_me' || runMode === 'brainstorming';
  const minStageOrdinal = ownsEarlySteps ? 1 : stageOrdinal(V2_HANDOFF_STAGE);
  const backOrdinal = migrated.ordinal > minStageOrdinal ? migrated.ordinal - 1 : undefined;

  /** UX-15 guard: leaving the generate stage mid-run is a two-click decision. */
  const guardedLeave = (go: () => void) => {
    if (genRunning && Date.now() - leaveArmedAt.current > 5000) {
      leaveArmedAt.current = Date.now();
      toast.warning('Generation in progress: submitted jobs keep running and bill regardless. Click again to leave.');
      return;
    }
    go();
  };

  const goBack = () => {
    if (backOrdinal) guardedLeave(() => writePosition(backOrdinal));
  };

  const jumpTo = (ordinal: number) => {
    if (ordinal < minStageOrdinal || ordinal > maxStageOrdinal) return;
    guardedLeave(() => writePosition(ordinal));
  };

  if (runId && run.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  const selectedAssets = (assets.data ?? []).filter((a) => (state.selected_asset_ids ?? []).includes(a.id));

  const loader = (
    <div className="flex justify-center py-12" aria-label="Loading run state">
      <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
    </div>
  );

  return (
    <AnimatePresence mode="wait">
      <WizardChrome
        key="chrome"
        stageOrdinal={migrated.ordinal}
        maxStageOrdinal={maxStageOrdinal}
        minStageOrdinal={minStageOrdinal}
        title={stageForOrdinal(migrated.ordinal).title}
        onJumpStage={jumpTo}
        onBack={backOrdinal ? goBack : undefined}
        onExit={onExit}
      >
        {pendingPersist && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2">
            <p className="flex items-center gap-1.5 text-xs text-red-600 [[data-omni-theme=dark]_&]:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Your progress was not saved — retry before continuing.
            </p>
            <Button variant="outline" size="sm" onClick={() => void retryPersist()} className="h-7 cursor-pointer gap-1.5 text-xs">
              <RefreshCw className="h-3 w-3" />
              Retry save
            </Button>
          </div>
        )}

        {stage === 'brief' && (
          <StageBrief
            runId={runId}
            initialObjective={state.objective ?? ''}
            initialOptimized={state.optimized_prompt ?? ''}
            initialReferences={state.reference_image_refs ?? []}
            onNext={(patch) => void persist('engine', patch)}
          />
        )}

        {stage === 'engine' && (
          <StageEngine
            initialSelections={state.model_selections ?? []}
            initialSpecs={state.model_specs ?? {}}
            hasReferences={(state.reference_image_refs?.length ?? 0) > 0}
            referenceCount={state.reference_image_refs?.length ?? 0}
            onNext={(selections, specs) =>
              void persist('generate', { model_selections: selections, model_specs: specs })
            }
          />
        )}

        {stage === 'generate' && (
          // Generation is a real stage for runs that own the early flow. A
          // transform or repurposing run can only sit here transiently, so
          // render a loader for those instead of the generator.
          runId && ownsEarlySteps ? (
            <StageGenerate
              runId={runId}
              lockedPrompt={state.locked_prompt ?? ''}
              promptProvenance={state.prompt_provenance}
              selections={state.model_selections ?? []}
              initialSelected={state.selected_asset_ids ?? []}
              modelSpecs={state.model_specs}
              referenceImageIds={(state.reference_image_refs ?? []).map((r) => r.wishpediaImageId)}
              onEditBrief={() => jumpTo(stageOrdinal('brief'))}
              onEditModels={() => jumpTo(stageOrdinal('engine'))}
              onRunningChange={setGenRunning}
              onNext={(generatedIds, selectedIds) =>
                void persist('distribution', { generated_asset_ids: generatedIds, selected_asset_ids: selectedIds })
              }
            />
          ) : loader
        )}

        {stage === 'distribution' && (
          <StageDistribution
            initialNetworks={state.networks ?? []}
            initialSelections={state.preset_selections ?? {}}
            imageCount={(state.selected_asset_ids ?? []).length}
            onNext={(networks, selections) =>
              void persist('adapt', { networks, preset_selections: selections })
            }
          />
        )}

        {stage === 'adapt' && runId && (
          // isFetching too: after an invalidation a STALE cached snapshot has
          // isLoading false while the refetch is in flight; building the job
          // matrix from it would miss restored outputs and re-bill them.
          assets.isLoading || assets.isFetching ? (
            <div className="flex justify-center py-12" aria-label="Loading run assets">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
          ) : (
            <StepRepurpose
              runId={runId}
              selectedAssets={selectedAssets}
              runAssets={assets.data ?? []}
              initialRepurposed={state.repurposed ?? []}
              initialApproved={state.approved_asset_ids ?? []}
              presetSelections={state.preset_selections ?? {}}
              onProgress={(repurposed: OmniRepurposedRef[]) => void persistSilently({ repurposed })}
              onNext={(repurposed: OmniRepurposedRef[], approved: string[]) =>
                void persist('captions', { repurposed, approved_asset_ids: approved })
              }
            />
          )
        )}

        {stage === 'captions' && runId && (
          <StageCaptions
            runId={runId}
            objective={state.objective ?? ''}
            lockedPrompt={state.locked_prompt ?? ''}
            repurposed={state.repurposed ?? []}
            approvedAssetIds={state.approved_asset_ids ?? []}
            initialOptions={state.caption_options ?? {}}
            initialChosen={state.chosen_captions ?? {}}
            onNext={(options, chosen) =>
              void persist('finalize', { caption_options: options, chosen_captions: chosen, description_locked: true })
            }
          />
        )}

        {stage === 'finalize' && runId && (
          <StepFinalize
            runId={runId}
            defaultTitle={state.title ?? state.objective?.slice(0, 60) ?? 'Omni content set'}
            chosenDescription={state.chosen_description ?? ''}
            chosenCaptions={state.chosen_captions ?? {}}
            networks={state.networks ?? []}
            repurposed={state.repurposed ?? []}
            approvedAssetIds={state.approved_asset_ids ?? []}
            onCaptionsEdited={(chosen) => void persistSilently({ chosen_captions: chosen })}
            onDone={onExit}
          />
        )}
      </WizardChrome>
    </AnimatePresence>
  );
}
