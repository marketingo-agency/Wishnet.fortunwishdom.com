"use client";

/**
 * Stage 2 "Models & quality" (Plan 1 Phase 6): merges the old model picker and
 * the old step-4 specs screen into one decision.
 *
 * - Curated default view: the vetted house models with PER-IMAGE PRICES and the
 *   house default pre-selected (UX-04) — no more raw 30/page catalog first.
 * - "Browse all models" expander reveals the live fal catalog for power users.
 * - Live type-to-filter (UX-14), running cost + selection summary in the
 *   sticky footer (UX-08/09), default variant count from omni_settings (UX-11).
 * - Per-model "Generation quality" accordion inline (absorbs step 4, ORD-02);
 *   unknown catalog models get the generic schema + an honest hint (UX-18).
 * - References attached → the curated set is the edit-model registry (refs
 *   route to edit-capable models; text-to-image would silently ignore them).
 */

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronUp, Loader2, Minus, Plus, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useFalCatalog, useOmniSettings, type OmniModelSelection, type OmniVariantSpec } from '@/hooks/omni';
import { FAL_EDIT_MODELS, FAL_IMAGE_MODELS } from '@/config/llmModels';
import { FAL_SPEC_SCHEMAS, defaultSpecForModel, getFalSpecSchema } from '@/config/falSpecs';
import { estimatePlanCost, formatUsd, getFalPrice } from '@/config/falPricing';
import { SpecControls } from './SpecControls';
import { reconcileSpecs, specsAllEqual } from './specHelpers';

interface CuratedEntry {
  id: string;
  name: string;
  description: string;
  maxRefs?: number;
  logoUrl?: string;
}

interface StageEngineProps {
  initialSelections: OmniModelSelection[];
  initialSpecs: Record<string, OmniVariantSpec[]>;
  hasReferences: boolean;
  referenceCount: number;
  onNext: (selections: OmniModelSelection[], specs: Record<string, OmniVariantSpec[]>) => void;
}

function priceLabel(modelId: string): string {
  const price = getFalPrice(modelId);
  if (price.unitPrice == null) return 'billed by fal';
  return `$${price.unitPrice.toFixed(price.unitPrice < 0.01 ? 3 : 2)}/${price.unit === 'megapixel' ? 'MP' : 'image'}`;
}

export function StageEngine({ initialSelections, initialSpecs, hasReferences, referenceCount, onNext }: StageEngineProps) {
  const settings = useOmniSettings();
  const defaultVariants = settings.data?.default_variants ?? 2;

  const curated: CuratedEntry[] = useMemo(
    () =>
      hasReferences
        ? FAL_EDIT_MODELS.map((m) => ({ id: m.value, name: m.label, description: m.description ?? '', maxRefs: m.maxRefs, logoUrl: m.logoUrl }))
        : FAL_IMAGE_MODELS.map((m) => ({ id: m.value, name: m.label, description: m.description ?? '' })),
    [hasReferences],
  );

  const [selections, setSelections] = useState<OmniModelSelection[]>(() => {
    if (initialSelections.length > 0) {
      if (!hasReferences) return initialSelections;
      // Refs attached: keep only edit-capable resumed picks; else fall to default.
      const editIds = new Set(FAL_EDIT_MODELS.map((m) => m.value));
      const priorEdits = initialSelections.filter((s) => editIds.has(s.model_id));
      if (priorEdits.length > 0) return priorEdits;
    }
    // House default pre-selected: the fast path is Brief → (skip) → Generate.
    const def = curated[0];
    return def ? [{ model_id: def.id, name: def.name, variants: defaultVariants }] : [];
  });
  const [specs, setSpecs] = useState<Record<string, OmniVariantSpec[]>>(() =>
    reconcileSpecs(
      initialSelections.length > 0 ? initialSelections : (curated[0] ? [{ model_id: curated[0].id, name: curated[0].name, variants: defaultVariants }] : []),
      initialSpecs,
    ),
  );
  const [uniform, setUniform] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(Object.entries(specs).map(([id, arr]) => [id, specsAllEqual(arr)])),
  );
  const [openSpecs, setOpenSpecs] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');
  const [browseAll, setBrowseAll] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  // QA UI-W4: a pagination cursor from one result set must never be sent
  // with a different search — new filter, first page.
  useEffect(() => {
    setCursor(undefined);
  }, [filter]);

  const catalog = useFalCatalog(
    browseAll ? { capability: hasReferences ? 'image-to-image' : 'text-to-image', q: filter.trim() || undefined, cursor, limit: 30 } : { capability: 'text-to-image', limit: 1 },
  );

  const needle = filter.trim().toLowerCase();
  const curatedVisible = curated.filter((m) => !needle || `${m.id} ${m.name} ${m.description}`.toLowerCase().includes(needle));
  const curatedIds = new Set(curated.map((m) => m.id));
  const catalogVisible = browseAll
    ? (catalog.data?.models ?? []).filter((m) => !curatedIds.has(m.id))
    : [];

  const selectionFor = (id: string) => selections.find((s) => s.model_id === id);

  const toggleSelection = (id: string, name: string) => {
    setSelections((prev) => {
      if (prev.some((s) => s.model_id === id)) return prev.filter((s) => s.model_id !== id);
      return [...prev, { model_id: id, name, variants: defaultVariants }];
    });
    setSpecs((prev) => {
      if (prev[id]) return prev;
      return { ...prev, [id]: Array.from({ length: defaultVariants }, () => defaultSpecForModel(id)) };
    });
    setUniform((prev) => (id in prev ? prev : { ...prev, [id]: true }));
  };

  const setVariants = (modelId: string, delta: number) => {
    setSelections((prev) =>
      prev.map((s) => (s.model_id === modelId ? { ...s, variants: Math.min(10, Math.max(1, s.variants + delta)) } : s)),
    );
    setSpecs((prev) => {
      const sel = selections.find((s) => s.model_id === modelId);
      if (!sel) return prev;
      const nextCount = Math.min(10, Math.max(1, sel.variants + delta));
      const arr = prev[modelId] ?? [];
      const next = Array.from({ length: nextCount }, (_, i) => arr[i] ?? { ...(arr[0] ?? defaultSpecForModel(modelId)) });
      return { ...prev, [modelId]: next };
    });
  };

  const updateUniform = (modelId: string, patch: Partial<OmniVariantSpec>) => {
    setSpecs((prev) => {
      const arr = prev[modelId] ?? [];
      const base = { ...(arr[0] ?? defaultSpecForModel(modelId)), ...patch };
      return { ...prev, [modelId]: arr.map(() => ({ ...base })) };
    });
  };

  const updateVariant = (modelId: string, index: number, patch: Partial<OmniVariantSpec>) => {
    setSpecs((prev) => {
      const arr = [...(prev[modelId] ?? [])];
      arr[index] = { ...arr[index], ...patch };
      return { ...prev, [modelId]: arr };
    });
  };

  const toggleUniform = (modelId: string, checked: boolean) => {
    setUniform((prev) => ({ ...prev, [modelId]: checked }));
    if (checked) {
      setSpecs((prev) => {
        const arr = prev[modelId] ?? [];
        const base = arr[0] ?? defaultSpecForModel(modelId);
        return { ...prev, [modelId]: arr.map(() => ({ ...base })) };
      });
    }
  };

  // Running cost (UX-09): per-MP models priced from their current specs.
  const activeSpecs = useMemo(() => {
    const out: Record<string, OmniVariantSpec[]> = {};
    for (const sel of selections) {
      out[sel.model_id] = Array.from({ length: sel.variants }, (_, i) => specs[sel.model_id]?.[i] ?? defaultSpecForModel(sel.model_id));
    }
    return out;
  }, [selections, specs]);
  const cost = estimatePlanCost(selections, activeSpecs);
  const totalImages = selections.reduce((sum, s) => sum + s.variants, 0);

  const renderCard = (entry: CuratedEntry, fromCatalog: boolean) => {
    const sel = selectionFor(entry.id);
    const overCap = hasReferences && entry.maxRefs != null && referenceCount > entry.maxRefs;
    const schemaKnown = !!FAL_SPEC_SCHEMAS[entry.id];
    const specArr = specs[entry.id] ?? [];
    const isUniform = uniform[entry.id] ?? true;
    const specsOpen = openSpecs[entry.id] ?? false;
    return (
      <div
        key={entry.id}
        className={cn(
          'rounded-xl border bg-card p-3 transition-all duration-200',
          sel ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'border-border hover:border-cyan-500/25',
        )}
      >
        <button
          onClick={() => toggleSelection(entry.id, entry.name)}
          aria-pressed={!!sel}
          aria-label={`${sel ? 'Deselect' : 'Select'} ${entry.name}`}
          className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {entry.logoUrl ? (
            <img src={entry.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover" />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-semibold">{entry.name}</h3>
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                  sel ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-border',
                )}
              >
                {sel && <Check className="h-3 w-3" />}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{entry.description}</p>
            <p className="mt-1 text-[11px] font-medium text-emerald-700 [[data-omni-theme=dark]_&]:text-emerald-400">
              {priceLabel(entry.id)}
              {hasReferences && entry.maxRefs != null && (
                <span className="ml-2 font-normal text-muted-foreground">up to {entry.maxRefs} refs</span>
              )}
            </p>
          </div>
        </button>

        {sel && overCap && (
          <p className="mt-1.5 text-[11px] text-amber-700 [[data-omni-theme=dark]_&]:text-amber-400">
            Will use the first {entry.maxRefs} of your {referenceCount} references.
          </p>
        )}

        {sel && (
          <div className="mt-2 space-y-2 border-t border-border pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Variants</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setVariants(entry.id, -1)} disabled={sel.variants <= 1} aria-label="Fewer variants" className="h-8 w-8 cursor-pointer">
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center text-sm font-semibold">{sel.variants}</span>
                <Button variant="outline" size="icon" onClick={() => setVariants(entry.id, 1)} disabled={sel.variants >= 10} aria-label="More variants" className="h-8 w-8 cursor-pointer">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <button
              onClick={() => setOpenSpecs((prev) => ({ ...prev, [entry.id]: !specsOpen }))}
              aria-expanded={specsOpen}
              className="flex w-full cursor-pointer items-center justify-between rounded-md px-1 py-1 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Generation quality
              </span>
              {specsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {specsOpen && (
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                {!schemaKnown && fromCatalog && (
                  <p className="text-[11px] text-muted-foreground">
                    Live-catalog model: generic size controls are offered — this model may support
                    different parameters than shown.
                  </p>
                )}
                {sel.variants > 1 && (
                  <div className="flex items-center gap-2">
                    <Switch id={`uniform-${entry.id}`} checked={isUniform} onCheckedChange={(c) => toggleUniform(entry.id, c)} />
                    <Label htmlFor={`uniform-${entry.id}`} className="cursor-pointer text-xs text-muted-foreground">
                      Same quality for all {sel.variants} variants
                    </Label>
                  </div>
                )}
                {isUniform ? (
                  <SpecControls
                    schema={getFalSpecSchema(entry.id)}
                    spec={specArr[0] ?? defaultSpecForModel(entry.id)}
                    onChange={(patch) => updateUniform(entry.id, patch)}
                    idPrefix={`${entry.id}-u`}
                  />
                ) : (
                  specArr.map((spec, i) => (
                    <div key={i} className="rounded-lg border border-border/60 bg-muted/20 p-2">
                      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Variant {i + 1}</p>
                      <SpecControls
                        schema={getFalSpecSchema(entry.id)}
                        spec={spec}
                        onChange={(patch) => updateVariant(entry.id, i, patch)}
                        idPrefix={`${entry.id}-${i}`}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-16">
      {hasReferences && (
        <div className="flex items-start gap-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <p className="text-xs text-muted-foreground">
            Reference images are attached, so these{' '}
            <span className="font-medium text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300">edit models</span>{' '}
            recreate the canon character from your {referenceCount} reference{referenceCount === 1 ? '' : 's'}.
          </p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={browseAll ? 'Filter models (curated + catalog)...' : 'Filter models...'}
          className="pl-9 focus-visible:ring-cyan-500/50"
          aria-label="Filter models"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {curatedVisible.map((entry) => renderCard(entry, false))}
      </div>
      {curatedVisible.length === 0 && !browseAll && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No curated model matches — browse the full catalog below.
        </p>
      )}

      {!browseAll ? (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => setBrowseAll(true)}
            className="cursor-pointer gap-1.5 text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            <ChevronDown className="h-4 w-4" />
            Browse all models
          </Button>
        </div>
      ) : (
        <section aria-label="Full fal catalog" className="space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Full fal catalog
          </p>
          {catalog.isLoading && catalogVisible.length === 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : catalog.isError ? (
            <p className="text-sm text-destructive">
              Could not load the catalog: {catalog.error instanceof Error ? catalog.error.message : 'unknown error'}
            </p>
          ) : catalogVisible.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">No additional catalog models match.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {catalogVisible.map((m) => renderCard({ id: m.id, name: m.name, description: m.description }, true))}
            </div>
          )}
          {catalog.data?.hasMore && !catalog.isLoading && (
            <div className="flex justify-center">
              <Button variant="ghost" onClick={() => setCursor(catalog.data?.nextCursor ?? undefined)} className="cursor-pointer gap-1.5 text-muted-foreground">
                <ChevronDown className="h-4 w-4" />
                Next page
              </Button>
            </div>
          )}
          {catalog.isLoading && catalogVisible.length > 0 && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </section>
      )}

      {/* Sticky footer: selection chips + running cost (UX-08/09). */}
      <div className="sticky bottom-0 -mx-1 rounded-xl border border-border bg-card/95 p-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {selections.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pick at least one model.</p>
            ) : (
              selections.map((s) => (
                <span key={s.model_id} className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300">
                  {s.name} ×{s.variants}
                </span>
              ))
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <p className="text-xs text-muted-foreground">
              {totalImages} image{totalImages === 1 ? '' : 's'} ·{' '}
              <span className="font-semibold text-foreground">≈{formatUsd(cost.total)}{cost.hasUnknown ? '+' : ''}</span>
            </p>
            <Button
              onClick={() => onNext(selections, activeSpecs)}
              disabled={selections.length === 0}
              className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
