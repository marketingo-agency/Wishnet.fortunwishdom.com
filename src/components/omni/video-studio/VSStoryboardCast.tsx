"use client";

/**
 * Video Studio stage 2: storyboard review + draft-engine pick (D-V3 tiering).
 * Shows every scene with its keyframe (when the scenario carried one), the
 * engine options with honest pricing (calibrate-priced engines say "verify"),
 * and the total draft estimate before any paid submit.
 */

import { useEffect, useState } from 'react';
import { ArrowRight, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatUsd } from '@/config/falPricing';
import { pollKeyframes } from '@/hooks/omni/useScenario';
import { DRAFT_ENGINES, estimateDraftCost, suggestDraftEngine, type DraftEngineOption } from './vsEngines';
import type { OmniVideoScenario } from '@/hooks/omni';

interface VSStoryboardCastProps {
  scenario: OmniVideoScenario;
  initialEngineId?: string;
  onNext: (engine: DraftEngineOption) => void;
}

export function VSStoryboardCast({ scenario, initialEngineId, onNext }: VSStoryboardCastProps) {
  const suggested = suggestDraftEngine(scenario.scenes);
  const [engineId, setEngineId] = useState(initialEngineId ?? suggested.id);
  const engine = DRAFT_ENGINES.find((e) => e.id === engineId) ?? suggested;
  const cost = estimateDraftCost(engine, scenario.scenes);
  const totalSeconds = scenario.scenes.reduce((sum, s) => sum + (s.duration_s || 0), 0);

  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  useEffect(() => {
    const ids = scenario.scenes.map((s) => s.keyframe_asset_id).filter((x): x is string => !!x);
    if (ids.length === 0) return;
    void pollKeyframes(ids).then((results) => {
      const next: Record<number, string> = {};
      for (const scene of scenario.scenes) {
        const r = results.find((x) => x.id === scene.keyframe_asset_id);
        if (r?.status === 'done' && r.url) next[scene.idx] = r.url;
      }
      setThumbs(next);
    }).catch(() => { /* keyframe thumbs are cosmetic here */ });
  }, [scenario.scenes]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {scenario.scenes.map((scene) => (
          <div key={scene.idx} className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex aspect-video items-center justify-center bg-muted/40">
              {thumbs[scene.idx] ? (
                <img src={thumbs[scene.idx]} alt={`Scene ${scene.idx} keyframe`} className="h-full w-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <ImageOff className="h-4 w-4 text-muted-foreground/50" />
              )}
            </div>
            <p className="truncate px-2 py-1 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">S{scene.idx}</span> · {scene.duration_s}s · {scene.visual_prompt}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-2" role="group" aria-label="Draft engine">
        <p className="text-sm font-medium">Draft engine <span className="font-normal text-muted-foreground">(hero re-render comes after review)</span></p>
        {DRAFT_ENGINES.map((option) => {
          const active = option.id === engine.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => setEngineId(option.id)}
              className={cn(
                'flex w-full cursor-pointer items-start justify-between gap-3 rounded-xl border p-3 text-left transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'border-violet-500/60 bg-violet-500/10' : 'border-border hover:border-violet-500/30',
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {option.label}
                  {option.id === suggested.id && (
                    <span className="ml-2 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700 [[data-omni-theme=dark]_&]:text-violet-300">Suggested</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{option.blurb}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">{option.priceLabel}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          {scenario.scenes.length} scenes · ≈{totalSeconds}s ·{' '}
          {cost.total != null ? `draft estimate ${formatUsd(cost.total)}` : 'draft estimate ≈ verify after calibration'}
        </p>
        <Button
          onClick={() => onNext(engine)}
          className="cursor-pointer gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white transition-all duration-300 hover:opacity-90"
        >
          <ArrowRight className="h-4 w-4" />
          Continue to scenes
        </Button>
      </div>
    </div>
  );
}
