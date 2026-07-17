"use client";

/**
 * Video Studio stage 3: per-scene draft generation, review, approval.
 * Sequential submits + batched polling (useVideoScenes); failed scenes get
 * Retry and never count as fulfilled (GEN-01); the finisher completes rows
 * for closed tabs and resume restores them. Continues to stage 4 (Audio).
 */

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, Clapperboard, Loader2, Play, RefreshCw, Square, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVideoScenes } from '@/hooks/omni/useVideoScenes';
import { DRAFT_ENGINES, type DraftEngineOption } from './vsEngines';
import type { OmniVideoScenario } from '@/hooks/omni';

interface VSScenesProps {
  runId: string;
  scenario: OmniVideoScenario;
  engine: DraftEngineOption;
  approvedIds: string[];
  onClipCreated: (sceneIdx: number, assetId: string) => void;
  onApprovedChange: (assetIds: string[]) => void;
  onContinue: () => void;
}

export function VSScenes({ runId, scenario, engine: engineProp, approvedIds, onClipCreated, onApprovedChange, onContinue }: VSScenesProps) {
  const engine = DRAFT_ENGINES.find((e) => e.id === engineProp.id) ?? engineProp;
  const runner = useVideoScenes(runId);
  const approved = new Set(approvedIds);

  // Resume: restore persisted clips once (the finisher may have completed
  // them while the tab was closed).
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    void runner.restore(scenario.scenes);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once
  }, []);

  const [startedIdxs, setStartedIdxs] = useState<Set<number>>(new Set());

  const nextKeyframeOf = (sceneIdx: number): string | undefined => {
    const next = scenario.scenes.find((s) => s.idx === sceneIdx + 1);
    return next?.keyframe_asset_id;
  };

  const missing = scenario.scenes.filter((s) => {
    const clip = runner.clips[s.idx];
    return !clip || clip.status === 'none' || clip.status === 'failed';
  });

  const run = (scenes: typeof scenario.scenes) => {
    setStartedIdxs((prev) => new Set([...prev, ...scenes.map((s) => s.idx)]));
    void runner.runScenes(scenes, engine, onClipCreated, engine.i2v ? nextKeyframeOf : undefined);
  };

  const toggleApprove = (assetId: string) => {
    const next = new Set(approved);
    if (next.has(assetId)) next.delete(assetId);
    else next.add(assetId);
    onApprovedChange([...next]);
  };

  const doneScenes = scenario.scenes.filter((s) => runner.clips[s.idx]?.status === 'done');
  const busyCount = scenario.scenes.filter((s) => ['generating', 'persisting'].includes(runner.clips[s.idx]?.status ?? '')).length;

  return (
    <div className="space-y-4">
      {runner.lostContact && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 [[data-omni-theme=dark]_&]:text-amber-400" role="status">
          Lost contact while watching the renders — they keep completing server-side.
          Leave and reopen this run (or re-run the remaining scenes) to pick the results up.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {doneScenes.length}/{scenario.scenes.length} scenes done
          {busyCount > 0 && ` · ${busyCount} rendering (closing the tab is safe — rendering continues server-side)`}
        </p>
        <div className="flex items-center gap-2">
          {runner.isRunning && (
            <Button variant="outline" size="sm" onClick={runner.stop} className="h-8 cursor-pointer gap-1.5 text-xs">
              <Square className="h-3 w-3" /> Stop submitting
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => run(missing)}
            disabled={runner.isRunning || missing.length === 0}
            className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
          >
            {runner.isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {runner.isRunning ? 'Generating…' : `Generate ${missing.length === scenario.scenes.length ? 'all scenes' : `remaining (${missing.length})`}`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {scenario.scenes.map((scene) => {
          const clip = runner.clips[scene.idx] ?? { status: 'none' as const };
          const isApproved = !!clip.assetId && approved.has(clip.assetId);
          return (
            <div
              key={scene.idx}
              className={cn(
                'overflow-hidden rounded-xl border bg-card transition-all duration-300',
                clip.status === 'done' && isApproved ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10' : 'border-border',
              )}
            >
              <div className="flex aspect-video items-center justify-center bg-muted/40">
                {clip.status === 'done' && clip.url ? (
                  <video src={clip.url} controls preload="metadata" className="h-full w-full object-contain" aria-label={`Scene ${scene.idx} draft clip`} />
                ) : clip.status === 'generating' || clip.status === 'persisting' ? (
                  <div className="flex flex-col items-center gap-1.5" aria-live="polite">
                    <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                    <p className="text-[11px] text-muted-foreground">{clip.status === 'persisting' ? 'Saving…' : 'Rendering…'}</p>
                  </div>
                ) : clip.status === 'failed' ? (
                  <div className="flex flex-col items-center gap-1.5 p-3 text-center">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <p className="line-clamp-2 text-[11px] text-muted-foreground">{clip.error}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">{startedIdxs.has(scene.idx) ? 'Queued' : 'Not generated yet'}</p>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border p-2">
                <p className="min-w-0 truncate text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Scene {scene.idx}</span> · {scene.duration_s}s · {scene.visual_prompt}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  {clip.status === 'done' && clip.assetId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleApprove(clip.assetId!)}
                      aria-pressed={isApproved}
                      aria-label={isApproved ? `Unapprove scene ${scene.idx}` : `Approve scene ${scene.idx}`}
                      className={cn('h-8 w-8 cursor-pointer', isApproved ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground')}
                    >
                      {isApproved ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </Button>
                  )}
                  {(clip.status === 'failed' || clip.status === 'done') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => run([scene])}
                      disabled={runner.isRunning}
                      aria-label={`Re-generate scene ${scene.idx}`}
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

      {doneScenes.length > 0 && !runner.isRunning && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center">
          <Clapperboard className="h-5 w-5 text-violet-400" />
          <p className="text-sm font-medium">Your scenes are saved{approved.size > 0 ? ` (${approved.size} approved)` : ''}.</p>
          <p className="max-w-md text-xs text-muted-foreground">
            {approved.size === 0
              ? 'Approve the scenes you want in the cut, then continue to voiceover and music.'
              : 'Next: voiceover, music, and timeline assembly.'}
          </p>
          <Button
            size="sm"
            onClick={onContinue}
            disabled={approved.size === 0}
            className="h-8 cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
          >
            Continue to Audio
          </Button>
        </div>
      )}
    </div>
  );
}
