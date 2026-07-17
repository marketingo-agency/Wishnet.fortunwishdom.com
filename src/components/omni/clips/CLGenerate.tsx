"use client";

/**
 * Clips screen 2: generate 1-2 takes on the chosen native-audio engine and
 * pick ONE (Plan 2 Phase 8). Reuses the Studio scene runner verbatim
 * (sequential video-submit + batched poll, GEN-01 retries, tab-close safe).
 */

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, Loader2, Play, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVideoScenes } from '@/hooks/omni/useVideoScenes';
import type { OmniVideoScenario } from '@/hooks/omni';
import type { ClipEngineOption } from './clipsTemplates';

interface CLGenerateProps {
  runId: string;
  scenario: OmniVideoScenario;
  engine: ClipEngineOption;
  chosenClipId?: string;
  onClipCreated: (sceneIdx: number, assetId: string) => void;
  onChosen: (assetId: string) => void;
  onNext: () => void;
}

export function CLGenerate({ runId, scenario, engine, chosenClipId, onClipCreated, onChosen, onNext }: CLGenerateProps) {
  const runner = useVideoScenes(runId);
  const [started, setStarted] = useState(false);

  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    void runner.restore(scenario.scenes);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once
  }, []);

  const missing = scenario.scenes.filter((s) => {
    const clip = runner.clips[s.idx];
    return !clip || clip.status === 'none' || clip.status === 'failed';
  });
  const doneCount = scenario.scenes.filter((s) => runner.clips[s.idx]?.status === 'done').length;
  // Clips are 9:16 by design (the mode's whole point).
  const run = (scenes: typeof scenario.scenes) => {
    setStarted(true);
    void runner.runScenes(
      scenes.map((s) => ({ ...s })),
      { ...engine, resolution: engine.resolution },
      onClipCreated,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {doneCount}/{scenario.scenes.length} takes done
          {runner.isRunning && ' · rendering (closing the tab is safe — rendering continues server-side)'}
        </p>
        <Button
          size="sm"
          onClick={() => run(missing)}
          disabled={runner.isRunning || missing.length === 0}
          className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
        >
          {runner.isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {runner.isRunning ? 'Generating…' : missing.length === scenario.scenes.length && !started ? 'Generate' : `Retry missing (${missing.length})`}
        </Button>
      </div>

      <div className={cn('grid gap-3', scenario.scenes.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
        {scenario.scenes.map((scene) => {
          const clip = runner.clips[scene.idx] ?? { status: 'none' as const };
          const isChosen = !!clip.assetId && clip.assetId === chosenClipId;
          return (
            <div
              key={scene.idx}
              className={cn(
                'overflow-hidden rounded-xl border bg-card transition-all duration-300',
                isChosen ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10' : 'border-border',
              )}
            >
              <div className="flex aspect-[9/16] max-h-[420px] w-full items-center justify-center bg-muted/40">
                {clip.status === 'done' && clip.url ? (
                  <video src={clip.url} controls preload="metadata" className="h-full w-full object-contain" aria-label={`Take ${scene.idx}`} />
                ) : clip.status === 'generating' || clip.status === 'persisting' ? (
                  <div className="flex flex-col items-center gap-1.5" aria-live="polite">
                    <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                    <p className="text-[11px] text-muted-foreground">{clip.status === 'persisting' ? 'Saving…' : 'Rendering…'}</p>
                  </div>
                ) : clip.status === 'failed' ? (
                  <div className="flex flex-col items-center gap-1.5 p-3 text-center">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <p className="line-clamp-3 text-[11px] text-muted-foreground">{clip.error}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">{started ? 'Queued' : 'Not generated yet'}</p>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border p-2">
                <p className="text-[11px] font-semibold">Take {scene.idx} · {scene.duration_s}s</p>
                <div className="flex shrink-0 items-center gap-1">
                  {clip.status === 'done' && clip.assetId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onChosen(clip.assetId!)}
                      aria-pressed={isChosen}
                      aria-label={isChosen ? `Take ${scene.idx} is the chosen clip` : `Choose take ${scene.idx}`}
                      className={cn('h-8 w-8 cursor-pointer', isChosen ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground')}
                    >
                      {isChosen ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </Button>
                  )}
                  {(clip.status === 'failed' || clip.status === 'done') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => run([scene])}
                      disabled={runner.isRunning}
                      aria-label={`Re-generate take ${scene.idx}`}
                      className="h-8 w-8 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3">
        <p className="text-[11px] text-muted-foreground">
          {chosenClipId ? 'Take chosen.' : doneCount > 0 ? 'Pick the take you want to publish.' : 'Generate at least one take.'}
        </p>
        <Button
          size="sm"
          onClick={onNext}
          disabled={!chosenClipId}
          className="h-8 cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
        >
          Continue to Captions
        </Button>
      </div>
    </div>
  );
}
