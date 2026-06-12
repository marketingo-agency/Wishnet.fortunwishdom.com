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
import { WizardChrome } from './WizardChrome';
import { StepObjective } from './StepObjective';
import { StepLockPrompt } from './StepLockPrompt';
import { StepModels } from './StepModels';
import { StepRecap } from './StepRecap';
import { StepGeneration } from './StepGeneration';
import { StepDescriptions } from './StepDescriptions';
import { StepNetworks } from './StepNetworks';
import { StepDimensions } from './StepDimensions';
import { StepRepurpose } from './StepRepurpose';
import { StepApproval } from './StepApproval';
import { StepFinalize } from './StepFinalize';

const BACK_TARGET: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 7: 5, 8: 7, 9: 8, 10: 9, 11: 10, 12: 11 };

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

  const step = localStep ?? run.data?.current_step ?? 1;
  const state: OmniImagesState = useMemo(
    () => localState ?? ((run.data?.step_state ?? {}) as OmniImagesState),
    [localState, run.data],
  );

  const persist = async (nextStep: number, patch: Partial<OmniImagesState>) => {
    const nextState = { ...state, ...patch };
    setLocalState(nextState);
    setLocalStep(nextStep);
    // Steps after generation read asset records (dims, storage paths); the
    // cached snapshot predates generation, so refresh it on advance.
    if (runId && nextStep >= 7) {
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

  const goBack = () => {
    const target = BACK_TARGET[step];
    if (target) {
      setLocalStep(target);
      if (runId) void updateRun.mutateAsync({ runId, current_step: target });
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
      <WizardChrome key="chrome" step={step} onBack={BACK_TARGET[step] ? goBack : undefined} onExit={onExit}>
        {step === 1 && (
          <StepObjective
            initialValue={state.objective ?? ''}
            onNext={(objective) => void persist(2, { objective })}
          />
        )}
        {step === 2 && (
          <StepLockPrompt
            objective={state.objective ?? ''}
            initialOptimized={state.optimized_prompt ?? ''}
            onLock={(optimized, locked) => void persist(3, { optimized_prompt: optimized, locked_prompt: locked })}
          />
        )}
        {step === 3 && (
          <StepModels
            initialSelections={state.model_selections ?? []}
            onNext={(selections) => void persist(4, { model_selections: selections })}
          />
        )}
        {step === 4 && (
          <StepRecap
            lockedPrompt={state.locked_prompt ?? ''}
            selections={state.model_selections ?? []}
            onGenerate={() => void persist(5, {})}
          />
        )}
        {step === 5 && runId && (
          <StepGeneration
            runId={runId}
            lockedPrompt={state.locked_prompt ?? ''}
            selections={state.model_selections ?? []}
            initialSelected={state.selected_asset_ids ?? []}
            onNext={(generatedIds, selectedIds) =>
              void persist(7, { generated_asset_ids: generatedIds, selected_asset_ids: selectedIds })
            }
          />
        )}
        {step === 7 && (
          <StepDescriptions
            objective={state.objective ?? ''}
            lockedPrompt={state.locked_prompt ?? ''}
            initialDescriptions={state.descriptions ?? []}
            initialChosen={state.chosen_description ?? ''}
            onLock={(descriptions, chosen) =>
              void persist(8, { descriptions, chosen_description: chosen, description_locked: true })
            }
          />
        )}
        {step === 8 && (
          <StepNetworks
            initialNetworks={state.networks ?? []}
            onNext={(networks) => void persist(9, { networks })}
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
          assets.isLoading ? (
            <div className="flex justify-center py-12" aria-label="Loading run assets">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
          ) : (
            <StepRepurpose
              runId={runId}
              selectedAssets={selectedAssets}
              presetSelections={state.preset_selections ?? {}}
              onNext={(repurposed: OmniRepurposedRef[]) => void persist(11, { repurposed })}
            />
          )
        )}
        {step === 11 && (
          <StepApproval
            repurposed={state.repurposed ?? []}
            initialApproved={state.approved_asset_ids ?? []}
            onNext={(approvedIds) => void persist(12, { approved_asset_ids: approvedIds })}
          />
        )}
        {step === 12 && runId && (
          <StepFinalize
            runId={runId}
            defaultTitle={state.title ?? state.objective?.slice(0, 60) ?? 'Omni content set'}
            chosenDescription={state.chosen_description ?? ''}
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
