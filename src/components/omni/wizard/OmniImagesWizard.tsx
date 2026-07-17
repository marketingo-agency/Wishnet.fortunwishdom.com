"use client";

/**
 * OmniImagesWizard: the Studio workflow orchestrator.
 * Every step transition persists current_step + step_state to omni_runs
 * (the workflow engine), which is what makes History retake and
 * resume-at-any-step possible.
 *
 * Phase 6 (Plan 1): the early flow renders as three merged STAGES mapped onto
 * the v1 ordinals — Brief (steps 1-2), Models & quality (3-4), Generate &
 * select (5-6) — while the old tail (7-11) renders unchanged and every run
 * stays completable end-to-end. The registry flip to v2 ordinals happens at
 * the end of Phase 7.
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
import type { OmniNetworkId } from '../omniNetworkPresets';
import {
  TRANSFORM_BOUNDARY_STEP, V1_BRIEF_ENTRY_STEP, V1_ENGINE_ENTRY_STEP, V1_GENERATE_ENTRY_STEP,
  normalizeV1Step, v1BackTarget,
} from '../stepRegistry';
import { WizardChrome } from './WizardChrome';
import { StageBrief } from './StageBrief';
import { StageEngine } from './StageEngine';
import { StageGenerate } from './StageGenerate';
import { StepDescriptions } from './StepDescriptions';
import { StepNetworks } from './StepNetworks';
import { StepDimensions } from './StepDimensions';
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
  // UX-15: Back while paid jobs are in flight needs a second, informed click.
  const [genRunning, setGenRunning] = useState(false);
  const backArmedAt = useRef(0);

  const rawStep = localStep ?? run.data?.current_step ?? 1;
  // Registry-normalized: maps the legacy step-12 relic onto Finalize (render
  // only, never heals the DB).
  const step = normalizeV1Step(rawStep);
  const state: OmniImagesState = useMemo(
    () => localState ?? ((run.data?.step_state ?? {}) as OmniImagesState),
    [localState, run.data],
  );

  const writePersist = async (nextStep: number, nextState: OmniImagesState) => {
    if (!runId) {
      const created = await createRun.mutateAsync({
        mode: 'omni_images',
        title: nextState.objective?.slice(0, 80),
        step_state: nextState,
      });
      await updateRun.mutateAsync({ runId: created.id, current_step: nextStep, step_state: nextState });
      onRunCreated(created.id);
    } else {
      await updateRun.mutateAsync({ runId, current_step: nextStep, step_state: nextState });
    }
  };

  const persist = async (nextStep: number, patch: Partial<OmniImagesState>) => {
    const prevStep = localStep;
    const prevState = localState;
    const nextState: OmniImagesState = {
      ...state,
      ...patch,
      max_step_reached: Math.max(state.max_step_reached ?? 0, nextStep, step),
    };
    setLocalState(nextState);
    setLocalStep(nextStep);
    // Steps after generation read asset records (dims, storage paths); the
    // cached snapshot predates generation, so refresh it on advance.
    if (runId && nextStep >= TRANSFORM_BOUNDARY_STEP) {
      void queryClient.invalidateQueries({ queryKey: ['omni-assets', runId] });
    }
    try {
      await writePersist(nextStep, nextState);
      setPendingPersist(null);
    } catch (e) {
      // Roll the optimistic advance back (UX-03); the banner offers Retry.
      setLocalStep(prevStep);
      setLocalState(prevState);
      setPendingPersist({ step: nextStep, state: nextState });
      toast.error(`Could not save your progress: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  };

  const retryPersist = async () => {
    if (!pendingPersist) return;
    const { step: nextStep, state: nextState } = pendingPersist;
    setLocalState(nextState);
    setLocalStep(nextStep);
    try {
      await writePersist(nextStep, nextState);
      setPendingPersist(null);
    } catch (e) {
      setLocalStep(null);
      setLocalState(null);
      toast.error(`Still could not save: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  };

  // Paid adapt-stage outputs reach step_state as soon as each job completes,
  // not only on Continue: an exit or refresh mid-step then restores them
  // instead of re-billing every job.
  const persistRepurposedProgress = async (repurposed: OmniRepurposedRef[]) => {
    if (!runId) return;
    const nextState: OmniImagesState = { ...state, repurposed };
    setLocalState(nextState);
    try {
      await updateRun.mutateAsync({ runId, step_state: nextState });
    } catch {
      // Non-fatal: the next completed job or the Continue persist retries.
    }
  };

  // Step 7 is the handoff boundary: transform and repurposing runs do not own
  // the early stages of THIS wizard (their early steps live elsewhere or
  // nowhere), so backing below 7 would drop them into foreign semantics.
  // surprise_me and locked brainstorming runs DO own them.
  const runMode = run.data?.mode;
  const ownsEarlySteps = runMode == null || runMode === 'omni_images' || runMode === 'surprise_me' || runMode === 'brainstorming';
  const backTarget = step === TRANSFORM_BOUNDARY_STEP && !ownsEarlySteps ? undefined : v1BackTarget(step);

  const goBack = () => {
    if (!backTarget) return;
    // UX-15: submitted jobs keep running and bill regardless — make leaving
    // mid-generation a deliberate, second click.
    if (genRunning && Date.now() - backArmedAt.current > 5000) {
      backArmedAt.current = Date.now();
      toast.warning('Generation in progress: submitted jobs keep running and bill regardless. Click Back again to leave.');
      return;
    }
    setLocalStep(backTarget);
    if (runId) void updateRun.mutateAsync({ runId, current_step: backTarget });
  };

  /** Summary-bar edit-links (UX-07): jump straight to an earlier stage. */
  const jumpTo = (target: number) => {
    setLocalStep(target);
    if (runId) void updateRun.mutateAsync({ runId, current_step: target });
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
      <WizardChrome key="chrome" step={step} onBack={backTarget ? goBack : undefined} onExit={onExit}>
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

        {(step === 1 || step === 2) && (
          <StageBrief
            runId={runId}
            initialObjective={state.objective ?? ''}
            initialOptimized={state.optimized_prompt ?? ''}
            initialReferences={state.reference_image_refs ?? []}
            onNext={(patch) => void persist(V1_ENGINE_ENTRY_STEP, patch)}
          />
        )}

        {(step === 3 || step === 4) && (
          <StageEngine
            initialSelections={state.model_selections ?? []}
            initialSpecs={state.model_specs ?? {}}
            hasReferences={(state.reference_image_refs?.length ?? 0) > 0}
            referenceCount={state.reference_image_refs?.length ?? 0}
            onNext={(selections, specs) =>
              void persist(V1_GENERATE_ENTRY_STEP, { model_selections: selections, model_specs: specs })
            }
          />
        )}

        {(step === 5 || step === 6) && (
          // Generation is a real stage for runs that own the early steps
          // (omni_images / surprise_me / brainstorming). A transform or
          // repurposing run can only sit here transiently during the handoff,
          // so render a loader for those instead of the generator.
          runId && ownsEarlySteps ? (
            <StageGenerate
              runId={runId}
              lockedPrompt={state.locked_prompt ?? ''}
              promptProvenance={state.prompt_provenance}
              selections={state.model_selections ?? []}
              initialSelected={state.selected_asset_ids ?? []}
              modelSpecs={state.model_specs}
              referenceImageIds={(state.reference_image_refs ?? []).map((r) => r.wishpediaImageId)}
              onEditBrief={() => jumpTo(V1_BRIEF_ENTRY_STEP)}
              onEditModels={() => jumpTo(V1_ENGINE_ENTRY_STEP)}
              onRunningChange={setGenRunning}
              onNext={(generatedIds, selectedIds) =>
                void persist(TRANSFORM_BOUNDARY_STEP, { generated_asset_ids: generatedIds, selected_asset_ids: selectedIds })
              }
            />
          ) : loader
        )}

        {step === 7 && (
          <StepNetworks
            initialNetworks={state.networks ?? []}
            onNext={(networks) => void persist(8, { networks })}
          />
        )}
        {step === 8 && runId && (
          <StepDescriptions
            runId={runId}
            objective={state.objective ?? ''}
            lockedPrompt={state.locked_prompt ?? ''}
            networks={state.networks ?? []}
            selectedAssetIds={state.selected_asset_ids ?? []}
            initialOptions={state.caption_options ?? {}}
            initialChosen={state.chosen_captions ?? {}}
            onLock={(options, chosen) =>
              void persist(9, { caption_options: options, chosen_captions: chosen, description_locked: true })
            }
          />
        )}
        {step === 9 && (
          <StepDimensions
            networks={(state.networks ?? []) as OmniNetworkId[]}
            initialSelections={state.preset_selections ?? {}}
            onNext={(selections) => void persist(10, { preset_selections: selections })}
          />
        )}
        {step === 10 && runId && (
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
              onProgress={(repurposed: OmniRepurposedRef[]) => void persistRepurposedProgress(repurposed)}
              onNext={(repurposed: OmniRepurposedRef[], approved: string[]) =>
                void persist(11, { repurposed, approved_asset_ids: approved })
              }
            />
          )
        )}
        {step === 11 && runId && (
          <StepFinalize
            runId={runId}
            defaultTitle={state.title ?? state.objective?.slice(0, 60) ?? 'Omni content set'}
            chosenDescription={state.chosen_description ?? ''}
            chosenCaptions={state.chosen_captions ?? {}}
            networks={state.networks ?? []}
            repurposed={state.repurposed ?? []}
            approvedAssetIds={state.approved_asset_ids ?? []}
            onDone={onExit}
          />
        )}
      </WizardChrome>
    </AnimatePresence>
  );
}
