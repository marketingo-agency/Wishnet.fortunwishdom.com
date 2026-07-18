"use client";

/**
 * Scenario Studio stage 2: the structure editor. Each scene shows its time
 * window (from X to Y seconds), ONE visual-prompt box with a Promptor wand to
 * optimize it, and an editable length. Scenes reorder, remove, and add; the
 * whole scenario can be regenerated from the brief.
 */

import { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Loader2, Plus, RefreshCw, Trash2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useGenerateScenario } from '@/hooks/omni/useScenario';
import { useOptimizeDraft } from '@/hooks/promptor';
import { stripKnowledgeMarkers } from '@/lib/omni/stripKnowledgeMarkers';
import type { OmniScenarioScene, OmniVideoScenario } from '@/hooks/omni';

const MAX_SCENES = 20;
const fmtSeconds = (n: number) => (Number.isInteger(n) ? `${n}s` : `${n.toFixed(1)}s`);

interface ScenarioStructureProps {
  brief: string;
  scenario: OmniVideoScenario;
  onChange: (scenario: OmniVideoScenario) => void;
  onNext: () => void;
}

export function ScenarioStructure({ brief, scenario, onChange, onNext }: ScenarioStructureProps) {
  const regenerate = useGenerateScenario();
  const { optimizeDraft } = useOptimizeDraft();
  const [optimizingIdx, setOptimizingIdx] = useState<number | null>(null);

  const patchScene = (idx: number, patch: Partial<OmniScenarioScene>) => {
    onChange({
      ...scenario,
      scenes: scenario.scenes.map((s) => (s.idx === idx ? { ...s, ...patch } : s)),
    });
  };

  const reindex = (scenes: OmniScenarioScene[]): OmniScenarioScene[] =>
    scenes.map((s, i) => ({ ...s, idx: i + 1 }));

  const move = (idx: number, dir: -1 | 1) => {
    const i = scenario.scenes.findIndex((s) => s.idx === idx);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= scenario.scenes.length) return;
    const scenes = [...scenario.scenes];
    [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
    onChange({ ...scenario, scenes: reindex(scenes) });
  };

  const remove = (idx: number) => {
    onChange({ ...scenario, scenes: reindex(scenario.scenes.filter((s) => s.idx !== idx)) });
  };

  const addScene = () => {
    if (scenario.scenes.length >= MAX_SCENES) return;
    onChange({
      ...scenario,
      scenes: reindex([
        ...scenario.scenes,
        { idx: 0, visual_prompt: '', narration: '', duration_s: 8 },
      ]),
    });
  };

  const optimizeScene = async (idx: number, current: string) => {
    if (!current.trim() || optimizingIdx !== null) return;
    setOptimizingIdx(idx);
    try {
      const improved = await optimizeDraft(
        `${current.trim()}\n\n(Rewrite this as a single, vivid, cinematic shot description for ONE video scene: subject, setting, style, lighting, and motion. Output only the description.)`,
      );
      if (improved) patchScene(idx, { visual_prompt: stripKnowledgeMarkers(improved) });
    } catch {
      // useOptimizeDraft already toasts.
    } finally {
      setOptimizingIdx(null);
    }
  };

  // Cumulative time windows: scene N runs from the sum of prior durations to
  // that plus its own length.
  let running = 0;
  const ranges = scenario.scenes.map((s) => {
    const start = running;
    running += s.duration_s || 0;
    return { start, end: running };
  });
  const totalSeconds = running;
  const canContinue = scenario.scenes.length > 0 && scenario.scenes.every((s) => s.visual_prompt.trim().length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <Input
            value={scenario.title}
            onChange={(e) => onChange({ ...scenario, title: e.target.value })}
            aria-label="Scenario title"
            className="h-9 max-w-sm font-semibold"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {scenario.scenes.length} scene{scenario.scenes.length === 1 ? '' : 's'} · {fmtSeconds(totalSeconds)} total
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={regenerate.isPending || !brief}
          onClick={() => regenerate.mutate(
            { brief, target_scenes: Math.min(scenario.scenes.length || 6, MAX_SCENES), seconds_per_scene: 8 },
            { onSuccess: (r) => onChange(r.scenario) },
          )}
          className="h-8 cursor-pointer gap-1.5 text-xs"
        >
          {regenerate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Regenerate all
        </Button>
      </div>

      <div className="space-y-2.5">
        {scenario.scenes.map((scene, i) => (
          <div key={scene.idx} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scene {scene.idx}</span>
                <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700 [[data-omni-theme=dark]_&]:text-violet-300">
                  {fmtSeconds(ranges[i].start)} → {fmtSeconds(ranges[i].end)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => move(scene.idx, -1)} disabled={i === 0} aria-label={`Move scene ${scene.idx} up`} className="h-8 w-8 cursor-pointer">
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => move(scene.idx, 1)} disabled={i === scenario.scenes.length - 1} aria-label={`Move scene ${scene.idx} down`} className="h-8 w-8 cursor-pointer">
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(scene.idx)} aria-label={`Remove scene ${scene.idx}`} className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* ONE prompt box, with a bottom-right Promptor wand. */}
            <div className="relative mt-2">
              <Textarea
                value={scene.visual_prompt}
                onChange={(e) => patchScene(scene.idx, { visual_prompt: e.target.value })}
                placeholder="Visual prompt: subject, setting, style, lighting, motion…"
                aria-label={`Scene ${scene.idx} visual prompt`}
                rows={3}
                className="resize-none pr-11 text-sm"
                disabled={optimizingIdx === scene.idx}
              />
              <Button
                type="button"
                size="icon"
                onClick={() => void optimizeScene(scene.idx, scene.visual_prompt)}
                disabled={!scene.visual_prompt.trim() || optimizingIdx !== null}
                aria-label={`Optimize scene ${scene.idx} prompt with Promptor`}
                title="Optimize cinematically with Promptor"
                className="absolute bottom-2 right-2 h-7 w-7 cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm transition-all duration-300 hover:opacity-90"
              >
                {optimizingIdx === scene.idx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              </Button>
            </div>

            <div className="mt-2 flex items-center gap-1.5">
              <label htmlFor={`scene-${scene.idx}-duration`} className="text-xs text-muted-foreground">Length</label>
              <Input
                id={`scene-${scene.idx}-duration`}
                type="number"
                min={3}
                max={15}
                value={scene.duration_s}
                onChange={(e) => patchScene(scene.idx, { duration_s: Math.min(Math.max(Number(e.target.value) || 8, 3), 15) })}
                className="h-8 w-20 text-sm"
                aria-label={`Scene ${scene.idx} length in seconds`}
              />
              <span className="text-xs text-muted-foreground">seconds</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <Button variant="outline" size="sm" onClick={addScene} disabled={scenario.scenes.length >= MAX_SCENES} className="h-8 cursor-pointer gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Add scene
        </Button>
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="cursor-pointer gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white transition-all duration-300 hover:opacity-90"
        >
          <ArrowRight className="h-4 w-4" />
          Continue to storyboard
        </Button>
      </div>
    </div>
  );
}
