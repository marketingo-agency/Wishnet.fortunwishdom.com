"use client";

/**
 * Stage 3 "Generate & select" (Plan 1 Phase 6): the old recap screen collapses
 * into a summary bar (prompt · models · count · est. cost · live credits with
 * the precise unavailability reason, UX-10) with edit-links back to Brief and
 * Models (UX-07); the grid fills in below the Generate CTA.
 *
 * - GEN-01: failed tiles get Retry; resume never counts failed rows as
 *   fulfilled (they are re-submittable, not silently satisfied).
 * - GEN-02: "k of N" progress, a Stop button, a 3-strike poll-failure cap
 *   with a connection-lost banner + resume.
 * - GEN-03: the regenerate dialog states the price of the extra image.
 * - SEL-01: completed variants auto-select; the user prunes (opt-out).
 * - UX-15: Back during in-flight jobs warns that submitted jobs keep billing.
 * - GAP-7: per-MP models price from their specs (defaults when unset), so the
 *   estimate is honest before the multiplier fires.
 */

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Loader2, Pencil, RefreshCw, Square, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useDiscardAsset, useFalCredits, useGenerationRunner, useOmniAssets, useSaveAssetToFiles,
  getAssetSignedUrl, type OmniModelSelection, type OmniVariantSpec, type VariantView,
} from '@/hooks/omni';
import { defaultSpecForModel } from '@/config/falSpecs';
import { estimatePlanCost, formatUsd, getFalPrice } from '@/config/falPricing';
import { VariantTile } from './VariantTile';

interface StageGenerateProps {
  runId: string;
  lockedPrompt: string;
  promptProvenance?: string;
  selections: OmniModelSelection[];
  initialSelected: string[];
  modelSpecs?: Record<string, OmniVariantSpec[]>;
  referenceImageIds?: string[];
  /** Edit-links on the summary bar (UX-07): jump straight back to a stage. */
  onEditBrief: () => void;
  onEditModels: () => void;
  /** Reports in-flight generation so the wizard can guard Back (UX-15). */
  onRunningChange?: (running: boolean) => void;
  onNext: (generatedIds: string[], selectedIds: string[]) => void;
}

const CREDIT_HINTS: Record<string, string> = {
  no_key: 'no fal key configured',
  http_401: 'fal key lacks billing scope',
  http_403: 'fal key lacks billing scope',
  unparsed: 'unexpected billing format',
  fetch_error: 'billing unreachable',
  request_failed: 'billing unreachable',
  not_admin: 'admin only',
};

/** Fill unset specs with each model's defaults so per-MP pricing is honest (GAP-7). */
function effectiveSpecs(
  selections: OmniModelSelection[],
  specs?: Record<string, OmniVariantSpec[]>,
): Record<string, OmniVariantSpec[]> {
  const out: Record<string, OmniVariantSpec[]> = {};
  for (const sel of selections) {
    out[sel.model_id] = Array.from({ length: sel.variants }, (_, i) => specs?.[sel.model_id]?.[i] ?? defaultSpecForModel(sel.model_id));
  }
  return out;
}

export function StageGenerate({
  runId, lockedPrompt, promptProvenance, selections, initialSelected, modelSpecs, referenceImageIds,
  onEditBrief, onEditModels, onRunningChange, onNext,
}: StageGenerateProps) {
  const runner = useGenerationRunner(runId);
  const existingAssets = useOmniAssets(runId);
  const discardAsset = useDiscardAsset();
  const saveToFiles = useSaveAssetToFiles();
  const credits = useFalCredits();
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  // SEL-01 opt-out memory: tiles the user explicitly deselected never re-auto-select.
  const [userDeselected, setUserDeselected] = useState<Set<string>>(new Set());
  const [regenTarget, setRegenTarget] = useState<VariantView | null>(null);
  const [regenNotes, setRegenNotes] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    onRunningChange?.(runner.isRunning);
  }, [runner.isRunning, onRunningChange]);

  const specsForPlan = effectiveSpecs(selections, modelSpecs);
  const cost = estimatePlanCost(selections, specsForPlan);
  const totalImages = selections.reduce((sum, s) => sum + s.variants, 0);
  const balance = credits.data?.available ? credits.data.balance : null;
  const projectedRemaining = balance != null ? balance - cost.total : null;
  const insufficient = projectedRemaining != null && projectedRemaining < 0;
  const creditHint = credits.data?.reason ? CREDIT_HINTS[credits.data.reason] ?? 'unavailable' : 'unavailable';

  // DB-driven restore: runs that already generated (resume, reload) restore
  // their tiles immediately; the plan's REMAINING work only submits on the
  // explicit Generate click. Failed/discarded rows do NOT count as fulfilled
  // (GEN-01) — they stay visible with Retry instead of silently satisfying
  // the plan.
  useEffect(() => {
    if (startedRef.current || !existingAssets.data) return;
    startedRef.current = true;
    const priorVariants = existingAssets.data.filter((a) => !a.metadata?.repurposed && !a.metadata?.source);
    if (priorVariants.length === 0) return;
    setStarted(true);
    void (async () => {
      const restored: VariantView[] = await Promise.all(
        priorVariants.map(async (a) => ({
          assetId: a.id,
          modelId: a.model_id ?? '',
          modelName: selections.find((s) => s.model_id === a.model_id)?.name ?? a.model_id ?? 'Model',
          status: (a.status === 'pending' ? 'generating' : a.status) as VariantView['status'],
          url: a.storage_path ? await getAssetSignedUrl(a.storage_path) : undefined,
          width: a.width,
          height: a.height,
          error: a.error ?? undefined,
          isRegeneration: !!a.parent_asset_id,
        })),
      );
      runner.restoreVariants(restored);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore exactly once when asset data arrives
  }, [existingAssets.data]);

  const handleGenerate = () => {
    // QA UI-C2: never count fulfilment before the prior-assets restore
    // resolves — an early click on a resumed run would see zero variants and
    // re-submit (re-bill) the entire plan.
    if (existingAssets.isLoading || existingAssets.isFetching) return;
    setStarted(true);
    // Submit only what the plan still misses; failed rows are NOT fulfilled (GEN-01).
    const countByModel = new Map<string, number>();
    for (const v of runner.variants) {
      if (!v.isRegeneration && v.status !== 'failed' && v.status !== 'discarded') {
        countByModel.set(v.modelId, (countByModel.get(v.modelId) ?? 0) + 1);
      }
    }
    const remaining = selections
      .map((s) => ({ ...s, variants: s.variants - (countByModel.get(s.model_id) ?? 0) }))
      .filter((s) => s.variants > 0);
    if (remaining.length === 0) return;
    void runner.runPlan(remaining, lockedPrompt, undefined, referenceImageIds, specsForPlan, promptProvenance);
  };

  // SEL-01: auto-select variants as they complete (unless the user pruned them).
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const v of runner.variants) {
        if (v.status === 'done' && !next.has(v.assetId) && !userDeselected.has(v.assetId)) {
          next.add(v.assetId);
          changed = true;
        }
        if ((v.status === 'discarded' || v.status === 'failed') && next.has(v.assetId)) {
          next.delete(v.assetId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [runner.variants, userDeselected]);

  const toggleSelect = (assetId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
        setUserDeselected((d) => new Set(d).add(assetId));
      } else {
        next.add(assetId);
        setUserDeselected((d) => {
          const nd = new Set(d);
          nd.delete(assetId);
          return nd;
        });
      }
      return next;
    });
  };

  const handleDiscard = (variant: VariantView) => {
    discardAsset.mutate(variant.assetId);
    runner.patchVariant(variant.assetId, { status: 'discarded' });
  };

  const handleSaveToFiles = async (variant: VariantView) => {
    setSavingId(variant.assetId);
    try {
      await saveToFiles.mutateAsync(variant.assetId);
    } finally {
      setSavingId(null);
    }
  };

  const submitRegen = () => {
    if (regenTarget && regenNotes.trim()) {
      void runner.regenerateVariation(
        regenTarget, regenNotes, lockedPrompt, undefined, referenceImageIds,
        modelSpecs?.[regenTarget.modelId]?.[0], promptProvenance,
      );
      setRegenTarget(null);
      setRegenNotes('');
    }
  };

  const visible = runner.variants.filter((v) => v.status !== 'discarded');
  const doneCount = visible.filter((v) => v.status === 'done').length;
  const failedCount = visible.filter((v) => v.status === 'failed').length;
  const generatingIds = visible.filter((v) => v.status === 'generating').map((v) => v.assetId);
  const activeModelName = selections.find((s) => s.model_id === runner.activeModel)?.name;
  const regenPrice = regenTarget ? getFalPrice(regenTarget.modelId) : null;

  return (
    <div className="space-y-4">
      {/* Summary bar (UX-07/09/10): what fires, what it costs, edit-links back. */}
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs text-muted-foreground" title={lockedPrompt}>
              {lockedPrompt}
            </p>
            <p className="mt-1.5 text-sm">
              <span className="font-medium">{selections.map((s) => `${s.name} ×${s.variants}`).join(' · ')}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={onEditBrief} className="h-8 cursor-pointer gap-1 px-2 text-xs text-muted-foreground hover:text-foreground">
              <Pencil className="h-3 w-3" /> Brief
            </Button>
            <Button variant="ghost" size="sm" onClick={onEditModels} className="h-8 cursor-pointer gap-1 px-2 text-xs text-muted-foreground hover:text-foreground">
              <Pencil className="h-3 w-3" /> Models
            </Button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
          <span>{totalImages} image{totalImages === 1 ? '' : 's'}</span>
          <span>
            Est. <span className="font-semibold text-foreground">{formatUsd(cost.total)}{cost.hasUnknown ? '+' : ''}</span>
          </span>
          <span>
            Credits:{' '}
            {credits.isLoading ? '…' : balance != null ? (
              <span className={cn('font-semibold', insufficient ? 'text-red-600 [[data-omni-theme=dark]_&]:text-red-400' : 'text-emerald-700 [[data-omni-theme=dark]_&]:text-emerald-400')}>
                {formatUsd(balance)}
              </span>
            ) : (
              <span title={creditHint}>n/a ({creditHint})</span>
            )}
          </span>
          {projectedRemaining != null && (
            <span>
              After run:{' '}
              <span className={cn('font-semibold', insufficient ? 'text-red-600 [[data-omni-theme=dark]_&]:text-red-400' : 'text-foreground')}>
                {formatUsd(projectedRemaining)}
              </span>
            </span>
          )}
        </div>
      </div>

      {insufficient && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-2.5 py-1.5 text-xs text-red-600 [[data-omni-theme=dark]_&]:text-red-400">
          This run may exceed your available fal credits. Top up before generating.
        </p>
      )}

      {/* Progress / control row. */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {runner.isRunning && activeModelName ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-600 [[data-omni-theme=dark]_&]:text-cyan-400" />
              Generating with {activeModelName}... {doneCount} of {totalImages} done
            </span>
          ) : started ? (
            `${doneCount} of ${totalImages} image${totalImages === 1 ? '' : 's'} ready${failedCount > 0 ? ` · ${failedCount} failed` : ''}`
          ) : (
            'Ready to generate.'
          )}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{selected.size} selected</p>
          {runner.isRunning && (
            <Button variant="outline" size="sm" onClick={runner.stop} className="h-8 cursor-pointer gap-1.5 text-xs">
              <Square className="h-3 w-3" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {runner.isRunning && (
        <p className="text-[11px] text-muted-foreground">
          Leaving this stage does not cancel submitted jobs — they keep running and bill regardless;
          resume restores them.
        </p>
      )}

      {runner.connectionLost && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2">
          <p className="text-xs text-amber-700 [[data-omni-theme=dark]_&]:text-amber-400">
            Connection lost while polling — your jobs are still running server-side.
          </p>
          <Button variant="outline" size="sm" onClick={() => runner.resumePolling(generatingIds)} className="h-8 cursor-pointer gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" />
            Reconnect
          </Button>
        </div>
      )}

      {!started || (visible.length === 0 && !runner.isRunning) ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <Button
            onClick={handleGenerate}
            disabled={selections.length === 0 || runner.isRunning || existingAssets.isLoading || existingAssets.isFetching}
            className={cn(
              'cursor-pointer gap-2 text-white transition-all duration-300 hover:opacity-90',
              insufficient ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-cyan-500 to-violet-600',
            )}
          >
            {insufficient ? <AlertTriangle className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            {insufficient ? 'Generate anyway' : 'Generate'}
          </Button>
          <p className="text-xs text-muted-foreground">One model at a time; images appear as they finish.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visible.map((variant) => (
            <div key={variant.assetId} className="space-y-1.5">
              <VariantTile
                variant={variant}
                isSelected={selected.has(variant.assetId)}
                onToggleSelect={() => toggleSelect(variant.assetId)}
                onRegenerate={() => setRegenTarget(variant)}
                onDiscard={() => handleDiscard(variant)}
                onSaveToFiles={() => handleSaveToFiles(variant)}
                isSaving={savingId === variant.assetId}
              />
              {variant.status === 'failed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void runner.retryVariant(variant, { prompt: lockedPrompt, referenceImageIds, promptProvenance })}
                  className="h-7 w-full cursor-pointer gap-1.5 text-xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {started && visible.length > 0 && !runner.isRunning && doneCount < totalImages && failedCount === 0 && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={handleGenerate} className="cursor-pointer gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" />
            Generate the remaining {totalImages - doneCount}
          </Button>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={() => onNext(visible.map((v) => v.assetId), [...selected])}
          disabled={selected.size === 0 || runner.isRunning}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Continue with {selected.size || 'selected'} image{selected.size === 1 ? '' : 's'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={!!regenTarget} onOpenChange={(open) => !open && setRegenTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate a variation</DialogTitle>
            <DialogDescription>
              What should change? The variation is generated live with this image&apos;s original model
              ({regenTarget?.modelName ?? 'its original model'})
              {regenPrice?.unitPrice != null && (
                <> — about {formatUsd(regenPrice.unitPrice)} per {regenPrice.unit === 'megapixel' ? 'megapixel' : 'image'}</>
              )}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={regenNotes}
            onChange={(e) => setRegenNotes(e.target.value)}
            placeholder="Example: warmer light, remove the text, closer crop on the subject..."
            className="min-h-[100px] focus-visible:ring-cyan-500/50"
            aria-label="Requested changes"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenTarget(null)} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              onClick={submitRegen}
              disabled={!regenNotes.trim()}
              className="cursor-pointer bg-gradient-to-r from-cyan-500 to-violet-600 text-white"
            >
              Generate variation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
