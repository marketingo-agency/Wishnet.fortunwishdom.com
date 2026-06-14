"use client";

/**
 * Steps 5-6: live progressive generation plus per-image actions.
 * One model generates at a time; tiles fill in as each variant completes.
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  useDiscardAsset, useGenerationRunner, useOmniAssets, useSaveAssetToFiles,
  getAssetSignedUrl, type OmniModelSelection, type OmniVariantSpec, type VariantView,
} from '@/hooks/omni';
import { VariantTile } from './VariantTile';

interface StepGenerationProps {
  runId: string;
  lockedPrompt: string;
  selections: OmniModelSelection[];
  initialSelected: string[];
  /** Per-model, per-variant technical specs (size/ratio/quality) from step 4. */
  modelSpecs?: Record<string, OmniVariantSpec[]>;
  /** Transform mode: the i2i/upscale source image driving every job. */
  sourceAssetId?: string;
  /** Wishpedia reference image IDs for canon-accurate recreation (edit model). */
  referenceImageIds?: string[];
  onNext: (generatedIds: string[], selectedIds: string[]) => void;
}

export function StepGeneration({ runId, lockedPrompt, selections, initialSelected, modelSpecs, sourceAssetId, referenceImageIds, onNext }: StepGenerationProps) {
  const runner = useGenerationRunner(runId);
  const existingAssets = useOmniAssets(runId);
  const discardAsset = useDiscardAsset();
  const saveToFiles = useSaveAssetToFiles();
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [regenTarget, setRegenTarget] = useState<VariantView | null>(null);
  const [regenNotes, setRegenNotes] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const startedRef = useRef(false);

  // DB-driven start: restore any variant records the run already has (resume,
  // reload, StrictMode replays), then submit only what the plan still misses.
  useEffect(() => {
    if (startedRef.current || !existingAssets.data) return;
    startedRef.current = true;
    // Exclude repurposed outputs and transform-mode source images (uploads /
    // library references) from the variant grid.
    const priorVariants = existingAssets.data.filter((a) => !a.metadata?.repurposed && !a.metadata?.source);

    const countByModel = new Map<string, number>();
    for (const a of priorVariants) {
      if (a.model_id && !a.parent_asset_id) {
        countByModel.set(a.model_id, (countByModel.get(a.model_id) ?? 0) + 1);
      }
    }
    const remaining = selections
      .map((s) => ({ ...s, variants: s.variants - (countByModel.get(s.model_id) ?? 0) }))
      .filter((s) => s.variants > 0);

    void (async () => {
      if (priorVariants.length > 0) {
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
      }
      if (remaining.length > 0) {
        await runner.runPlan(remaining, lockedPrompt, sourceAssetId, referenceImageIds, modelSpecs);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start exactly once when asset data arrives
  }, [existingAssets.data]);

  const toggleSelect = (assetId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  const handleDiscard = (variant: VariantView) => {
    discardAsset.mutate(variant.assetId);
    runner.patchVariant(variant.assetId, { status: 'discarded' });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(variant.assetId);
      return next;
    });
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
        regenTarget, regenNotes, lockedPrompt, sourceAssetId, referenceImageIds,
        modelSpecs?.[regenTarget.modelId]?.[0],
      );
      setRegenTarget(null);
      setRegenNotes('');
    }
  };

  const visible = runner.variants.filter((v) => v.status !== 'discarded');
  const doneCount = visible.filter((v) => v.status === 'done').length;
  const activeModelName = selections.find((s) => s.model_id === runner.activeModel)?.name;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
        <p className="text-sm text-muted-foreground">
          {runner.isRunning && activeModelName ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              Generating with {activeModelName}...
            </span>
          ) : (
            `${doneCount} image${doneCount === 1 ? '' : 's'} ready`
          )}
        </p>
        <p className="text-xs text-muted-foreground">{selected.size} selected</p>
      </div>

      {visible.length === 0 && !runner.isRunning ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nothing generated yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visible.map((variant) => (
            <VariantTile
              key={variant.assetId}
              variant={variant}
              isSelected={selected.has(variant.assetId)}
              onToggleSelect={() => toggleSelect(variant.assetId)}
              onRegenerate={() => setRegenTarget(variant)}
              onDiscard={() => handleDiscard(variant)}
              onSaveToFiles={() => handleSaveToFiles(variant)}
              isSaving={savingId === variant.assetId}
            />
          ))}
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
              ({regenTarget?.modelName ?? 'its original model'}).
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
