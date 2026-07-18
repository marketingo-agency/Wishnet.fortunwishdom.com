"use client";

/**
 * ScenarioWizard: the Scenario Studio orchestrator (Plan 2 Phase 4).
 * Four stages on the video registry's own ordinals (video_schema_version 1):
 * 1 Brief → 2 Structure → 3 Storyboard → 4 Export & handoff. Persists after
 * every stage advance with a max_step_reached high-water; resumes clamp to
 * the registry's builtThrough (interim-terminal rule).
 */

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  VIDEO_MODES, VIDEO_SCHEMA_VERSION, resolveVideoPosition,
} from '../stepRegistry';
import { useCreateOmniRun, useOmniRun, useUpdateOmniRun } from '@/hooks/omni';
import type { OmniImagesState, OmniVideoScenario, OmniWishReferenceRef } from '@/hooks/omni';
import { StageRail } from '../wizard/StageRail';
import { ScenarioBrief } from './ScenarioBrief';
import { ScenarioStructure } from './ScenarioStructure';
import { ScenarioStoryboard } from './ScenarioStoryboard';
import { ScenarioExport } from './ScenarioExport';

const MODE = 'video_scenario' as const;

interface ScenarioWizardProps {
  runId: string | null;
  onRunCreated: (runId: string) => void;
  onExit: () => void;
  /** Activated in Phase 5: seeds a Video Studio run from this scenario. */
  onHandoffToStudio?: (studioRunId: string) => void;
}

export function ScenarioWizard({ runId, onRunCreated, onExit, onHandoffToStudio }: ScenarioWizardProps) {
  const reduceMotion = useReducedMotion();
  const run = useOmniRun(runId);
  const createRun = useCreateOmniRun();
  const updateRun = useUpdateOmniRun();
  const [localState, setLocalState] = useState<OmniImagesState | null>(null);
  const [finishing, setFinishing] = useState(false);

  const state: OmniImagesState = useMemo(
    () => localState ?? ((run.data?.step_state ?? {}) as OmniImagesState),
    [localState, run.data],
  );
  const rawStep = run.data?.current_step ?? 1;
  const position = resolveVideoPosition(MODE, state, runId ? rawStep : 1);
  const stages = VIDEO_MODES[MODE].stages;

  const persist = async (nextOrdinal: number, patch: Partial<OmniImagesState>) => {
    const nextState: OmniImagesState = {
      ...state,
      ...patch,
      video_schema_version: VIDEO_SCHEMA_VERSION,
      max_step_reached: Math.max(position.maxStageOrdinal, nextOrdinal),
    };
    setLocalState(nextState);
    if (!runId) return;
    try {
      await updateRun.mutateAsync({ runId, current_step: nextOrdinal, step_state: nextState });
    } catch (e) {
      toast.error(`Progress could not be saved: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  };

  const handleGenerated = async (brief: string, scenario: OmniVideoScenario, references: OmniWishReferenceRef[]) => {
    if (!runId) {
      try {
        const created = await createRun.mutateAsync({
          mode: MODE,
          title: scenario.title.slice(0, 80),
          current_step: 2,
          step_state: {
            objective: brief,
            scenario,
            reference_image_refs: references,
            video_schema_version: VIDEO_SCHEMA_VERSION,
            max_step_reached: 2,
          },
        });
        setLocalState((created.step_state ?? {}) as OmniImagesState);
        onRunCreated(created.id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not create the scenario run');
      }
      return;
    }
    await persist(2, { objective: brief, scenario, title: scenario.title, reference_image_refs: references });
  };

  const handleSendToStudio = async () => {
    if (!runId || !state.scenario || finishing) return;
    setFinishing(true);
    try {
      const created = await createRun.mutateAsync({
        mode: 'omni_videos',
        title: state.scenario.title.slice(0, 80),
        current_step: 2,
        step_state: {
          objective: state.objective,
          scenario: state.scenario,
          scenario_source_run_id: runId,
          video_schema_version: VIDEO_SCHEMA_VERSION,
          max_step_reached: 2,
        },
      });
      // The scenario itself stays a finished artifact.
      await updateRun.mutateAsync({
        runId,
        status: 'completed',
        step_state: { ...state, video_schema_version: VIDEO_SCHEMA_VERSION, max_step_reached: stages.length },
        current_step: stages.length,
      });
      toast.success('Sent to Video Studio.');
      onHandoffToStudio?.(created.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not hand off to Video Studio');
    } finally {
      setFinishing(false);
    }
  };

  const handleFinish = async () => {
    if (!runId || finishing) return;
    setFinishing(true);
    try {
      await updateRun.mutateAsync({
        runId,
        status: 'completed',
        title: state.scenario?.title,
        step_state: { ...state, video_schema_version: VIDEO_SCHEMA_VERSION, max_step_reached: stages.length },
        current_step: stages.length,
      });
      toast.success('Scenario saved. Retake or reopen it anytime from History.');
      onExit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the scenario');
    } finally {
      setFinishing(false);
    }
  };

  if (runId && run.isLoading) {
    return (
      <div className="flex h-full items-center justify-center" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    );
  }
  if (runId && run.isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-destructive">Could not load this scenario run.</p>
        <Button variant="outline" size="sm" onClick={onExit} className="h-8 cursor-pointer text-xs">Back to the Videos hub</Button>
      </div>
    );
  }

  const ordinal = position.ordinal;
  const scenario = state.scenario;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Scenario Studio · Stage {ordinal} of {stages.length}
          </p>
          <h1 className="truncate text-sm font-semibold sm:text-base">{stages[ordinal - 1].title}</h1>
        </div>
        <div className="flex items-center gap-1">
          {ordinal > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void persist(ordinal - 1, {})}
              aria-label="Back one stage"
              className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onExit}
            aria-label="Exit Scenario Studio"
            className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stage rail: reached stages are clickable (high-water). */}
      <StageRail
        stages={stages.map((s) => ({ ordinal: s.ordinal, title: s.title }))}
        current={ordinal}
        isReachable={(o) => o <= position.maxStageOrdinal}
        onJump={(o) => void persist(o, {})}
        accent="violet"
      />

      <motion.div
        key={ordinal}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl">
          {ordinal === 1 && (
            <ScenarioBrief
              initialBrief={state.objective ?? ''}
              initialReferences={state.reference_image_refs ?? []}
              onGenerated={(b, sc, refs) => void handleGenerated(b, sc, refs)}
            />
          )}
          {ordinal === 2 && scenario && (
            <ScenarioStructure
              brief={state.objective ?? ''}
              scenario={scenario}
              onChange={(sc) => setLocalState({ ...state, scenario: sc })}
              onNext={() => void persist(3, {})}
            />
          )}
          {ordinal === 3 && scenario && runId && (
            <ScenarioStoryboard
              runId={runId}
              scenario={scenario}
              references={state.reference_image_refs ?? []}
              onChange={(sc) => void persist(3, { scenario: sc })}
              onNext={() => void persist(4, {})}
            />
          )}
          {ordinal === 4 && scenario && (
            <ScenarioExport
              scenario={scenario}
              onFinish={() => void handleFinish()}
              onSendToStudio={onHandoffToStudio ? () => void handleSendToStudio() : undefined}
              finishing={finishing}
            />
          )}
          {ordinal > 1 && !scenario && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">This run has no scenario yet.</p>
              <Button variant="outline" size="sm" onClick={() => void persist(1, {})} className="h-8 cursor-pointer text-xs">
                Back to the brief
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
