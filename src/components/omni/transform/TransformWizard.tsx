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

const BACK_TARGET: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };

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

  // A run at step 7+ already lives in the Omni Images wizard. Stale URLs
  // (bookmarks, the handoff race window) used to land here on a blank shell;
  // route them forward instead. Gated on SERVER truth (run.data), not the
  // optimistic local step, so it can never fire before the persist lands.
  const serverStep = run.data?.current_step ?? 0;
  useEffect(() => {
    if (serverStep >= 7) onHandoffToRepurposing();
  }, [serverStep, onHandoffToRepurposing]);

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
    const target = BACK_TARGET[step];
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
    // Hand the run to the Omni Images wizard at step 7 (descriptions) with the
    // locked transform results as the selected images. Non-optimistic: the
    // surface only swaps after the write is confirmed (the cache then already
    // holds step 7), so a failed save leaves the user here with the toast
    // instead of stranding them on a blank foreign wizard.
    if (!runId) return;
    const nextState: OmniImagesState = {
      ...state,
      objective: state.analysis?.description ?? state.transform_prompt ?? 'Transformed image',
      locked_prompt: state.transform_prompt || (state.analysis?.description ?? ''),
      max_step_reached: Math.max(state.max_step_reached ?? 0, 7),
    };
    setLocalState(nextState);
    try {
      await updateRun.mutateAsync({ runId, current_step: 7, step_state: nextState });
      onHandoffToRepurposing();
    } catch (e) {
      toast.error(`Could not save your progress: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <TransformChrome key="chrome" step={step} onBack={BACK_TARGET[step] ? goBack : undefined} onExit={onExit}>
        {step === 1 && (
          <TStepSource
            createRunIfNeeded={createRunIfNeeded}
            onSourceReady={(id, assetId) => void persist(2, { source_asset_id: assetId }, id)}
          />
        )}
        {step === 2 && state.source_asset_id && (
          <TStepAnalysis
            sourceAssetId={state.source_asset_id}
            initialAnalysis={state.analysis ?? null}
            onNext={(analysis: OmniAnalysis, prefillBrief: string) =>
              void persist(3, { analysis, transform_prompt: prefillBrief || state.transform_prompt })
            }
          />
        )}
        {step === 3 && (
          <TStepBrief
            initialValue={state.transform_prompt ?? ''}
            onNext={(brief) => void persist(4, { transform_prompt: brief })}
          />
        )}
        {step === 4 && (
          <StepModels
            initialSelections={state.model_selections ?? []}
            capability="image-to-image"
            showUpscaleToggle
            onNext={(selections) => void persist(5, { model_selections: selections })}
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
              void persist(6, { generated_asset_ids: generatedIds, selected_asset_ids: selectedIds })
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
