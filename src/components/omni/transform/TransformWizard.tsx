"use client";

/**
 * TransformWizard: the Transform and Upscale workflow (Mode 2).
 * Source pick, RAG-grounded analysis, transformation brief, i2i/upscale model
 * selection, live generation (Phase 2 machinery reused with a source image),
 * then direct save or handoff into the Omni Images repurposing steps (7-12)
 * on the SAME run.
 */

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateOmniRun, useOmniRun, useUpdateOmniRun,
  type OmniAnalysis, type OmniImagesState,
} from '@/hooks/omni';
import { TransformChrome } from './TransformChrome';
import { TStepSource } from './TStepSource';
import { TStepAnalysis } from './TStepAnalysis';
import { TStepBrief } from './TStepBrief';
import { TStepFinalize } from './TStepFinalize';
import { StepModels } from '../wizard/StepModels';
import { StepGeneration } from '../wizard/StepGeneration';
import { V2_HANDOFF_STAGE, isPastTransformBoundary, stageOrdinal, v1TransformBackTarget, v1TransformNextStep } from '../stepRegistry';

interface TransformWizardProps {
  runId: string | null;
  onRunCreated: (runId: string) => void;
  onExit: () => void;
  onHandoffToRepurposing: () => void;
}

export function TransformWizard({ runId, onRunCreated, onExit, onHandoffToRepurposing }: TransformWizardProps) {
  const run = useOmniRun(runId);
  const createRun = useCreateOmniRun();
  const updateRun = useUpdateOmniRun();

  const [localStep, setLocalStep] = useState<number | null>(null);
  const [localState, setLocalState] = useState<OmniImagesState | null>(null);

  const step = localStep ?? run.data?.current_step ?? 1;
  const state: OmniImagesState = useMemo(
    () => localState ?? ((run.data?.step_state ?? {}) as OmniImagesState),
    [localState, run.data],
  );

  // A handed-off run already lives in the Omni Images wizard (v2 stamp, or
  // the legacy step-7+ ints). Stale URLs (bookmarks, the handoff race window)
  // used to land here on a blank shell; route them forward instead. Gated on
  // SERVER truth (run.data), not the optimistic local step, so it can never
  // fire before the persist lands.
  const serverStep = run.data?.current_step ?? 0;
  const serverState = (run.data?.step_state ?? {}) as OmniImagesState;
  const handedOff = run.data ? isPastTransformBoundary(serverState, serverStep) : false;
  useEffect(() => {
    if (handedOff) onHandoffToRepurposing();
  }, [handedOff, onHandoffToRepurposing]);

  const persist = async (nextStep: number, patch: Partial<OmniImagesState>, targetRunId?: string) => {
    const nextState: OmniImagesState = {
      ...state,
      ...patch,
      max_step_reached: Math.max(state.max_step_reached ?? 0, nextStep, step),
    };
    setLocalState(nextState);
    setLocalStep(nextStep);
    const id = targetRunId ?? runId;
    if (!id) return;
    try {
      await updateRun.mutateAsync({ runId: id, current_step: nextStep, step_state: nextState });
    } catch (e) {
      toast.error(`Could not save your progress: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  };

  const createRunIfNeeded = async (): Promise<string> => {
    if (runId) return runId;
    const created = await createRun.mutateAsync({ mode: 'transform_upscale', step_state: {} });
    onRunCreated(created.id);
    return created.id;
  };

  const goBack = () => {
    const target = v1TransformBackTarget(step);
    if (target) {
      setLocalStep(target);
      if (runId) void updateRun.mutateAsync({ runId, current_step: target });
    }
  };

  if (runId && run.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
      </div>
    );
  }

  const handleHandoff = async () => {
    // Hand the run to the Omni Images wizard at the DISTRIBUTION stage with
    // the locked transform results as the selected images. The run is stamped
    // schema_version 2 here — the stamp itself is the handoff-boundary signal
    // (TransformWizard never stamps its own six steps). Non-optimistic: the
    // surface only swaps after the write is confirmed, so a failed save
    // leaves the user here with the toast instead of stranding them on a
    // blank foreign wizard.
    if (!runId) return;
    const handoffOrdinal = stageOrdinal(V2_HANDOFF_STAGE);
    const nextState: OmniImagesState = {
      ...state,
      objective: state.analysis?.description ?? state.transform_prompt ?? 'Transformed image',
      locked_prompt: state.transform_prompt || (state.analysis?.description ?? ''),
      schema_version: 2,
      max_step_reached: handoffOrdinal,
    };
    setLocalState(nextState);
    try {
      await updateRun.mutateAsync({ runId, current_step: handoffOrdinal, step_state: nextState });
      onHandoffToRepurposing();
    } catch (e) {
      toast.error(`Could not save your progress: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <TransformChrome key="chrome" step={step} onBack={v1TransformBackTarget(step) ? goBack : undefined} onExit={onExit}>
        {step === 1 && (
          <TStepSource
            createRunIfNeeded={createRunIfNeeded}
            onSourceReady={(id, assetId) => void persist(v1TransformNextStep(step), { source_asset_id: assetId }, id)}
          />
        )}
        {step === 2 && state.source_asset_id && (
          <TStepAnalysis
            sourceAssetId={state.source_asset_id}
            initialAnalysis={state.analysis ?? null}
            onNext={(analysis: OmniAnalysis, prefillBrief: string) =>
              void persist(v1TransformNextStep(step), { analysis, transform_prompt: prefillBrief || state.transform_prompt })
            }
          />
        )}
        {step === 3 && (
          <TStepBrief
            initialValue={state.transform_prompt ?? ''}
            onNext={(brief) => void persist(v1TransformNextStep(step), { transform_prompt: brief })}
          />
        )}
        {step === 4 && (
          <StepModels
            initialSelections={state.model_selections ?? []}
            capability="image-to-image"
            showUpscaleToggle
            onNext={(selections) => void persist(v1TransformNextStep(step), { model_selections: selections })}
          />
        )}
        {step === 5 && runId && state.source_asset_id && (
          <StepGeneration
            runId={runId}
            lockedPrompt={state.transform_prompt ?? ''}
            selections={state.model_selections ?? []}
            initialSelected={state.selected_asset_ids ?? []}
            sourceAssetId={state.source_asset_id}
            onNext={(generatedIds, selectedIds) =>
              void persist(v1TransformNextStep(step), { generated_asset_ids: generatedIds, selected_asset_ids: selectedIds })
            }
          />
        )}
        {step === 6 && runId && (
          <TStepFinalize
            runId={runId}
            defaultTitle={(state.analysis?.description ?? 'Transformed set').slice(0, 60)}
            description={state.analysis?.description ?? ''}
            selectedAssetIds={state.selected_asset_ids ?? []}
            onSaved={onExit}
            onContinueToRepurposing={() => void handleHandoff()}
          />
        )}
      </TransformChrome>
    </AnimatePresence>
  );
}
