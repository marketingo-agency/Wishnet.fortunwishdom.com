"use client";

/**
 * Scenario Studio stage 2: the structure editor. Every scene is editable
 * (visual prompt, narration, duration, camera preset), reorderable, and
 * removable; scenes can be added; the whole scenario can be regenerated
 * from the brief.
 */

import { ArrowDown, ArrowRight, ArrowUp, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useGenerateScenario } from '@/hooks/omni/useScenario';
import type { OmniScenarioScene, OmniVideoScenario } from '@/hooks/omni';

const CAMERA_PRESETS = ['static wide', 'slow push-in', 'slow pull-back', 'pan left', 'pan right', 'tracking', 'handheld', 'aerial'];

interface ScenarioStructureProps {
  brief: string;
  scenario: OmniVideoScenario;
  onChange: (scenario: OmniVideoScenario) => void;
  onNext: () => void;
}

export function ScenarioStructure({ brief, scenario, onChange, onNext }: ScenarioStructureProps) {
  const regenerate = useGenerateScenario();

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
    onChange({
      ...scenario,
      scenes: reindex([
        ...scenario.scenes,
        { idx: 0, visual_prompt: '', narration: '', duration_s: 8, camera: 'static wide' },
      ]),
    });
  };

  const totalSeconds = scenario.scenes.reduce((sum, s) => sum + (s.duration_s || 0), 0);
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
            {scenario.scenes.length} scenes · ≈{totalSeconds}s total
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={regenerate.isPending || !brief}
          onClick={() => regenerate.mutate(
            { brief, target_scenes: scenario.scenes.length || 6, seconds_per_scene: 8 },
            { onSuccess: (r) => onChange(r.scenario) },
          )}
          className="h-8 cursor-pointer gap-1.5 text-xs"
        >
          {regenerate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Regenerate all
        </Button>
      </div>

      <div className="space-y-3">
        {scenario.scenes.map((scene, i) => (
          <div key={scene.idx} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scene {scene.idx}</p>
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
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Textarea
                value={scene.visual_prompt}
                onChange={(e) => patchScene(scene.idx, { visual_prompt: e.target.value })}
                placeholder="Visual prompt: subject, setting, style, motion…"
                aria-label={`Scene ${scene.idx} visual prompt`}
                rows={3}
                className="resize-none text-sm"
              />
              <Textarea
                value={scene.narration}
                onChange={(e) => patchScene(scene.idx, { narration: e.target.value })}
                placeholder="Narration (voiceover) — empty for visual-only"
                aria-label={`Scene ${scene.idx} narration`}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label htmlFor={`scene-${scene.idx}-duration`} className="text-xs text-muted-foreground">Seconds</label>
                <Input
                  id={`scene-${scene.idx}-duration`}
                  type="number"
                  min={3}
                  max={15}
                  value={scene.duration_s}
                  onChange={(e) => patchScene(scene.idx, { duration_s: Math.min(Math.max(Number(e.target.value) || 8, 3), 15) })}
                  className="h-8 w-20 text-sm"
                />
              </div>
              <Select value={scene.camera ?? 'static wide'} onValueChange={(v) => patchScene(scene.idx, { camera: v })}>
                <SelectTrigger className="h-8 w-[150px] cursor-pointer text-xs" aria-label={`Scene ${scene.idx} camera`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_PRESETS.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <Button variant="outline" size="sm" onClick={addScene} className="h-8 cursor-pointer gap-1.5 text-xs">
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
