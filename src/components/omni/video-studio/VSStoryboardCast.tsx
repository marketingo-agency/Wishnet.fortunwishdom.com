"use client";

/**
 * Video Studio stage 2: storyboard review + engine pick (D-V3 tiering,
 * rebuilt in the 2026-07-17 rehab). The suggested trio renders as cards,
 * the full curated registry sits in a select, and a browse-all expander
 * opens the LIVE fal catalog (t2v/i2v) — catalog picks run with generic
 * prompt-only settings and say so honestly.
 */

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, ImageOff, Loader2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatUsd } from '@/config/falPricing';
import { pollKeyframes } from '@/hooks/omni/useScenario';
import { useFalCatalog } from '@/hooks/omni';
import {
  ALL_DRAFT_ENGINES, DRAFT_ENGINES, engineById, engineFromCatalogModel, engineFromCustomRef,
  estimateDraftCost, suggestDraftEngine, type CustomEngineRef, type DraftEngineOption,
} from './vsEngines';
import type { OmniVideoScenario } from '@/hooks/omni';

interface VSStoryboardCastProps {
  scenario: OmniVideoScenario;
  initialEngineId?: string;
  initialCustomEngine?: CustomEngineRef | null;
  onNext: (engine: DraftEngineOption) => void;
}

export function VSStoryboardCast({ scenario, initialEngineId, initialCustomEngine, onNext }: VSStoryboardCastProps) {
  const suggested = suggestDraftEngine(scenario.scenes);
  const [engine, setEngine] = useState<DraftEngineOption>(() => {
    if (initialEngineId?.startsWith('catalog:') && initialCustomEngine) return engineFromCustomRef(initialCustomEngine);
    return engineById(initialEngineId) ?? suggested;
  });
  const cost = estimateDraftCost(engine, scenario.scenes);
  const totalSeconds = scenario.scenes.reduce((sum, s) => sum + (s.duration_s || 0), 0);

  const [browseAll, setBrowseAll] = useState(false);
  const [filter, setFilter] = useState('');
  const [wantI2v, setWantI2v] = useState(false);
  const catalog = useFalCatalog({
    capability: wantI2v ? 'image-to-video' : 'text-to-video',
    q: filter.trim() || undefined,
    limit: 30,
    enabled: browseAll,
  });
  const curatedIds = useMemo(() => new Set(ALL_DRAFT_ENGINES.map((e) => e.modelId)), []);

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

  const audioBadge = (option: DraftEngineOption) => option.generic ? null : (
    <span className={cn(
      'ml-2 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
      option.nativeAudio
        ? 'bg-emerald-500/15 text-emerald-700 [[data-omni-theme=dark]_&]:text-emerald-300'
        : 'bg-zinc-500/15 text-zinc-600 [[data-omni-theme=dark]_&]:text-zinc-300',
    )}>
      {option.nativeAudio ? <Volume2 className="h-2.5 w-2.5" /> : <VolumeX className="h-2.5 w-2.5" />}
      {option.nativeAudio ? 'audio' : 'silent'}
    </span>
  );

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
        <p className="text-sm font-medium">Engine <span className="font-normal text-muted-foreground">(hero re-render comes after review)</span></p>
        {DRAFT_ENGINES.map((option) => {
          const active = option.id === engine.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => setEngine(option)}
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
                  {audioBadge(option)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{option.blurb}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">{option.priceLabel}</span>
            </button>
          );
        })}

        {/* Full curated registry */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={engine.generic ? '' : engine.id}
            onValueChange={(id) => { const next = engineById(id); if (next) setEngine(next); }}
          >
            <SelectTrigger className="w-full cursor-pointer sm:w-[340px]" aria-label="All curated engines">
              <SelectValue placeholder="All curated engines…" />
            </SelectTrigger>
            <SelectContent>
              {ALL_DRAFT_ENGINES.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label} · {o.priceLabel}{o.i2v ? ' · i2v' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => setBrowseAll((v) => !v)}
            aria-expanded={browseAll}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:border-violet-500/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', browseAll && 'rotate-180')} />
            Browse the full fal catalog
          </button>
        </div>

        {browseAll && (
          <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter catalog models…"
                className="h-8 w-full text-xs sm:w-56"
                aria-label="Filter catalog models"
              />
              <div className="flex gap-1" role="group" aria-label="Catalog category">
                {([['t2v', false], ['i2v', true]] as const).map(([label, i2v]) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={wantI2v === i2v}
                    onClick={() => setWantI2v(i2v)}
                    className={cn(
                      'cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold transition-colors duration-200',
                      wantI2v === i2v ? 'bg-violet-500/15 text-violet-700 [[data-omni-theme=dark]_&]:text-violet-300' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {label === 't2v' ? 'Text to video' : 'Image to video'}
                  </button>
                ))}
              </div>
            </div>
            {catalog.isLoading ? (
              <p className="flex items-center gap-2 py-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the live catalog…</p>
            ) : catalog.isError ? (
              <p className="py-2 text-xs text-destructive" role="alert">The catalog could not be loaded. Try again.</p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {(catalog.data?.models ?? [])
                  .filter((m) => !curatedIds.has(m.id))
                  // Defense-in-depth: the live omni edge ignores unknown
                  // capabilities until its fal-catalog rider deploys, so the
                  // category is re-filtered client-side either way.
                  .filter((m) => m.category === (wantI2v ? 'image-to-video' : 'text-to-video'))
                  .map((m) => {
                  const active = engine.modelId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setEngine(engineFromCatalogModel(m))}
                      className={cn(
                        'flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors duration-150',
                        active ? 'border-violet-500/60 bg-violet-500/10' : 'border-transparent hover:border-violet-500/30',
                      )}
                    >
                      <span className="min-w-0 truncate">{m.name} <span className="text-muted-foreground">· {m.id}</span></span>
                    </button>
                  );
                })}
                {(catalog.data?.models ?? []).length === 0 && (
                  <p className="py-2 text-xs text-muted-foreground">No catalog models match.</p>
                )}
              </div>
            )}
            {engine.generic && (
              <p className="text-[11px] text-amber-700 [[data-omni-theme=dark]_&]:text-amber-400">
                {engine.label}: {engine.blurb}
              </p>
            )}
          </div>
        )}
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
