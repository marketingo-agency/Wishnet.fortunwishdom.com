"use client";

/**
 * OmniImagesWizard: the 12-step Omni Images workflow orchestrator.
 * Every step transition persists current_step + step_state to omni_runs
 * (the workflow engine), which is what makes History retake and
 * resume-at-any-step possible.
 */

import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateOmniRun, useOmniAssets, useOmniRun, useUpdateOmniRun,
  type OmniImagesState, type OmniRepurposedRef,
} from '@/hooks/omni';
import type { OmniNetworkId } from '../omniNetworkPresets';
import { TRANSFORM_BOUNDARY_STEP, normalizeV1Step, v1BackTarget, v1NextStep } from '../stepRegistry';
import { WizardChrome } from './WizardChrome';
import { StepObjective } from './StepObjective';
import { StepLockPrompt } from './StepLockPrompt';
import { StepModels } from './StepModels';
import { StepSpecs } from './StepSpecs';
import { StepRecap } from './StepRecap';
import { StepGeneration } from './StepGeneration';
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

  const rawStep = localStep ?? run.data?.current_step ?? 1;
  // Registry-normalized: maps the legacy step-12 relic onto Finalize (render
  // only, never heals the DB).
  const step = normalizeV1Step(rawStep);
  const state: OmniImagesState = useMemo(
    () => localState ?? ((run.data?.step_state ?? {}) as OmniImagesState),
    [localState, run.data],
  );

  const persist = async (nextStep: number, patch: Partial<OmniImagesState>) => {
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
    } catch (e) {
      toast.error(`Could not save your progress: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  };

  // Paid step-10 outputs reach step_state as soon as each job completes, not
  // only on Continue: an exit or refresh mid-step then restores them instead
  // of re-billing every job.
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
  // steps 1-5 of THIS wizard (their early steps live elsewhere or nowhere), so
  // backing below 7 would drop them into foreign text-to-image semantics.
  // surprise_me and locked brainstorming runs DO own them: they start at
  // step 1 with a prefilled objective and walk the full sequence.
  const runMode = run.data?.mode;
  const ownsEarlySteps = runMode == null || runMode === 'omni_images' || runMode === 'surprise_me' || runMode === 'brainstorming';
  const backTarget = step === TRANSFORM_BOUNDARY_STEP && !ownsEarlySteps ? undefined : v1BackTarget(step);

  const goBack = () => {
    if (backTarget) {
      setLocalStep(backTarget);
      if (runId) void updateRun.mutateAsync({ runId, current_step: backTarget });
    }
  };

  if (runId && run.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  const selectedAssets = (assets.data ?? []).filter((a) => (state.selected_asset_ids ?? []).includes(a.id));

  return (
    <AnimatePresence mode="wait">
      <WizardChrome key="chrome" step={step} onBack={backTarget ? goBack : undefined} onExit={onExit}>
        {step === 1 && (
          <StepObjective
            initialValue={state.objective ?? ''}
            initialReferences={state.reference_image_refs ?? []}
            onNext={(objective, references) => void persist(v1NextStep(step), { objective, reference_image_refs: references })}
          />
        )}
        {step === 2 && (
          <StepLockPrompt
            objective={state.objective ?? ''}
            initialOptimized={state.optimized_prompt ?? ''}
            onLock={(optimized, locked) => void persist(v1NextStep(step), { optimized_prompt: optimized, locked_prompt: locked })}
          />
        )}
        {step === 3 && (
          <StepModels
            initialSelections={state.model_selections ?? []}
            hasReferences={(state.reference_image_refs?.length ?? 0) > 0}
            referenceCount={state.reference_image_refs?.length ?? 0}
            onNext={(selections) => void persist(v1NextStep(step), { model_selections: selections })}
          />
        )}
        {step === 4 && (
          <StepSpecs
            selections={state.model_selections ?? []}
            initialSpecs={state.model_specs ?? {}}
            onNext={(specs) => void persist(v1NextStep(step), { model_specs: specs })}
          />
        )}
        {step === 5 && (
          <StepRecap
            lockedPrompt={state.locked_prompt ?? ''}
            selections={state.model_selections ?? []}
            modelSpecs={state.model_specs ?? {}}
            onGenerate={() => void persist(v1NextStep(step), {})}
          />
        )}
        {step === 6 && (
          // Generation is a real step for runs that own the early steps
          // (omni_images / surprise_me / brainstorming). A transform or
          // repurposing run can only sit here transiently during the handoff
          // to step 7, so render a loader for those instead of the generator.
          runId && ownsEarlySteps ? (
            <StepGeneration
              runId={runId}
              lockedPrompt={state.locked_prompt ?? ''}
              selections={state.model_selections ?? []}
              modelSpecs={state.model_specs ?? {}}
              initialSelected={state.selected_asset_ids ?? []}
              referenceImageIds={(state.reference_image_refs ?? []).map((r) => r.wishpediaImageId)}
              onNext={(generatedIds, selectedIds) =>
                void persist(v1NextStep(step), { generated_asset_ids: generatedIds, selected_asset_ids: selectedIds })
              }
            />
          ) : (
            <div className="flex justify-center py-12" aria-label="Loading run state">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
          )
        )}
        {step === 7 && (
          <StepNetworks
            initialNetworks={state.networks ?? []}
            onNext={(networks) => void persist(v1NextStep(step), { networks })}
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
              void persist(v1NextStep(step), { caption_options: options, chosen_captions: chosen, description_locked: true })
            }
          />
        )}
        {step === 9 && (
          <StepDimensions
            networks={(state.networks ?? []) as OmniNetworkId[]}
            initialSelections={state.preset_selections ?? {}}
            onNext={(selections) => void persist(v1NextStep(step), { preset_selections: selections })}
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
                void persist(v1NextStep(step), { repurposed, approved_asset_ids: approved })
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
