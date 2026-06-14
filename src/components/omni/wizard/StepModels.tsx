"use client";

/**
 * Step 3: model selection from the live fal catalog.
 * Multi-select with a per-model variant count (1-10); search + pagination.
 */

import { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Loader2, Minus, Plus, RefreshCw, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useFalCatalog, type FalCapability, type FalModel, type OmniModelSelection } from '@/hooks/omni';
import { FAL_EDIT_MODELS } from '@/config/llmModels';

interface StepModelsProps {
  initialSelections: OmniModelSelection[];
  onNext: (selections: OmniModelSelection[]) => void;
  /** Catalog capability to browse; the wizard uses text-to-image, Transform uses i2i/upscale. */
  capability?: FalCapability;
  /** Show the Edit models / Upscalers filter chips (Transform mode). */
  showUpscaleToggle?: boolean;
  /** Reference images are attached: offer edit-capable models (they can use refs). */
  hasReferences?: boolean;
  /** How many reference images are attached (drives per-model cap warnings). */
  referenceCount?: number;
}

export function StepModels({ initialSelections, onNext, capability = 'text-to-image', showUpscaleToggle = false, hasReferences = false, referenceCount = 0 }: StepModelsProps) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [extraModels, setExtraModels] = useState<FalModel[]>([]);
  const [selections, setSelections] = useState<OmniModelSelection[]>(() => {
    // Text-to-image models ignore reference images, so when references are
    // attached we offer edit-capable models. Seed from any resumed edit picks,
    // else pre-select the proven default (first FAL_EDIT_MODELS entry).
    if (hasReferences) {
      const editIds = new Set(FAL_EDIT_MODELS.map((m) => m.value));
      const priorEdits = initialSelections.filter((s) => editIds.has(s.model_id));
      if (priorEdits.length > 0) return priorEdits;
      const def = FAL_EDIT_MODELS[0];
      return [{ model_id: def.value, name: def.label, variants: initialSelections[0]?.variants ?? 2 }];
    }
    return initialSelections;
  });
  const [activeCapability, setActiveCapability] = useState<FalCapability>(capability);

  const catalog = useFalCatalog({ capability: activeCapability, q: query || undefined, cursor, limit: 30 });

  const models = useMemo(() => {
    const page = catalog.data?.models ?? [];
    const seen = new Set<string>();
    return [...extraModels, ...page].filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  }, [catalog.data, extraModels]);

  const selectionFor = (id: string) => selections.find((s) => s.model_id === id);

  const toggleSelection = (id: string, name: string) => {
    setSelections((prev) =>
      prev.some((s) => s.model_id === id)
        ? prev.filter((s) => s.model_id !== id)
        : [...prev, { model_id: id, name, variants: 2 }],
    );
  };

  const toggle = (model: FalModel) => toggleSelection(model.id, model.name);

  const setVariants = (modelId: string, delta: number) => {
    setSelections((prev) =>
      prev.map((s) =>
        s.model_id === modelId ? { ...s, variants: Math.min(10, Math.max(1, s.variants + delta)) } : s,
      ),
    );
  };

  const runSearch = () => {
    setExtraModels([]);
    setCursor(undefined);
    setQuery(search.trim());
  };

  const loadMore = () => {
    if (catalog.data?.nextCursor) {
      setExtraModels(models);
      setCursor(catalog.data.nextCursor);
    }
  };

  const totalImages = selections.reduce((sum, s) => sum + s.variants, 0);

  const switchCapability = (next: FalCapability) => {
    if (next === activeCapability) return;
    setActiveCapability(next);
    setExtraModels([]);
    setCursor(undefined);
  };

  // References attached: offer the curated edit-capable models (a text-to-image
  // pick would silently ignore the refs). A fixed, vetted list — no catalog
  // browser — each annotated with the reference count it will use.
  if (hasReferences) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <p className="text-xs text-muted-foreground">
            Reference images are attached, so pick one or more{' '}
            <span className="font-medium text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300">edit models</span>{' '}
            — these recreate the canon character from your {referenceCount} reference{referenceCount === 1 ? '' : 's'}. Text-to-image models cannot use references.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FAL_EDIT_MODELS.map((model) => {
            const sel = selectionFor(model.value);
            const overCap = referenceCount > model.maxRefs;
            return (
              <div
                key={model.value}
                className={cn(
                  'rounded-xl border bg-card p-3 transition-all duration-200',
                  sel ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'border-border hover:border-cyan-500/25',
                )}
              >
                <button
                  onClick={() => toggleSelection(model.value, model.label)}
                  aria-pressed={!!sel}
                  aria-label={`${sel ? 'Deselect' : 'Select'} ${model.label}`}
                  className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold">{model.label}</h3>
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                          sel ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-border',
                        )}
                      >
                        {sel && <Check className="h-3 w-3" />}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{model.description}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Uses up to {model.maxRefs} reference images</p>
                  </div>
                </button>
                {sel && overCap && (
                  <p className="mt-1.5 text-[11px] text-amber-700 [[data-omni-theme=dark]_&]:text-amber-400">
                    Will use the first {model.maxRefs} of your {referenceCount} references.
                  </p>
                )}
                {sel && (
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    <span className="text-xs text-muted-foreground">Variants</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => setVariants(model.value, -1)} disabled={sel.variants <= 1} aria-label="Fewer variants" className="h-7 w-7 cursor-pointer">
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{sel.variants}</span>
                      <Button variant="outline" size="icon" onClick={() => setVariants(model.value, 1)} disabled={sel.variants >= 10} aria-label="More variants" className="h-7 w-7 cursor-pointer">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 -mx-1 flex items-center justify-between rounded-xl border border-border bg-card/95 p-3 backdrop-blur">
          <p className="text-sm text-muted-foreground">
            {selections.length} model{selections.length === 1 ? '' : 's'} · {totalImages} image{totalImages === 1 ? '' : 's'} total
          </p>
          <Button
            onClick={() => onNext(selections)}
            disabled={selections.length === 0}
            className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showUpscaleToggle && (
        <div className="flex gap-2" role="radiogroup" aria-label="Model family">
          {([['image-to-image', 'Edit models'], ['upscale', 'Upscalers']] as [FalCapability, string][]).map(([cap, label]) => (
            <button
              key={cap}
              role="radio"
              aria-checked={activeCapability === cap}
              onClick={() => switchCapability(cap)}
              className={cn(
                'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                activeCapability === cap
                  ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="Search the fal catalog..."
            className="pl-9 focus-visible:ring-cyan-500/50"
            aria-label="Search models"
          />
        </div>
        <Button variant="outline" onClick={runSearch} className="cursor-pointer transition-colors duration-200">
          Search
        </Button>
      </div>

      {catalog.isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p>Could not load the model catalog: {catalog.error instanceof Error ? catalog.error.message : 'unknown error'}</p>
          <Button variant="outline" size="sm" onClick={() => catalog.refetch()} className="mt-2 cursor-pointer gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      ) : catalog.isLoading && models.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : models.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No models match this search.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {models.map((model) => {
            const sel = selectionFor(model.id);
            return (
              <div
                key={model.id}
                className={cn(
                  'rounded-xl border bg-card p-3 transition-all duration-200',
                  sel ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'border-border hover:border-cyan-500/25',
                )}
              >
                <button
                  onClick={() => toggle(model)}
                  aria-pressed={!!sel}
                  aria-label={`${sel ? 'Deselect' : 'Select'} ${model.name}`}
                  className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {model.thumbnailUrl ? (
                    // Plain img: fal thumbnails come from many CDN hosts.
                    <img src={model.thumbnailUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover" />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded-lg border border-border bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold">{model.name}</h3>
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                          sel ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-border',
                        )}
                      >
                        {sel && <Check className="h-3 w-3" />}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{model.description}</p>
                  </div>
                </button>
                {sel && (
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    <span className="text-xs text-muted-foreground">Variants</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => setVariants(model.id, -1)} disabled={sel.variants <= 1} aria-label="Fewer variants" className="h-7 w-7 cursor-pointer">
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{sel.variants}</span>
                      <Button variant="outline" size="icon" onClick={() => setVariants(model.id, 1)} disabled={sel.variants >= 10} aria-label="More variants" className="h-7 w-7 cursor-pointer">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {catalog.data?.hasMore && !catalog.isLoading && (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={loadMore} className="cursor-pointer gap-1.5 text-muted-foreground">
            <ChevronDown className="h-4 w-4" />
            Load more models
          </Button>
        </div>
      )}
      {catalog.isLoading && models.length > 0 && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="sticky bottom-0 -mx-1 flex items-center justify-between rounded-xl border border-border bg-card/95 p-3 backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {selections.length} model{selections.length === 1 ? '' : 's'} · {totalImages} image{totalImages === 1 ? '' : 's'} total
        </p>
        <Button
          onClick={() => onNext(selections)}
          disabled={selections.length === 0}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
