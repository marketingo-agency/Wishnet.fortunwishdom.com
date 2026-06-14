"use client";

/**
 * Step 5: recap of everything about to be generated, with an estimated cost and
 * the live fal.ai credit balance.
 */

import { AlertTriangle, Layers, Sparkles, Wallet, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFalCredits, type OmniModelSelection, type OmniVariantSpec } from '@/hooks/omni';
import { estimatePlanCost, formatUsd } from '@/config/falPricing';
import { cn } from '@/lib/utils';

interface StepRecapProps {
  lockedPrompt: string;
  selections: OmniModelSelection[];
  modelSpecs?: Record<string, OmniVariantSpec[]>;
  onGenerate: () => void;
}

export function StepRecap({ lockedPrompt, selections, modelSpecs, onGenerate }: StepRecapProps) {
  const totalImages = selections.reduce((sum, s) => sum + s.variants, 0);
  const cost = estimatePlanCost(selections, modelSpecs);
  const credits = useFalCredits();
  const balance = credits.data?.available ? credits.data.balance : null;
  const projectedRemaining = balance != null ? balance - cost.total : null;
  const insufficient = projectedRemaining != null && projectedRemaining < 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          Locked prompt
        </p>
        <p className="mt-2 whitespace-pre-wrap font-mono text-sm">{lockedPrompt}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Layers className="h-3.5 w-3.5 text-violet-400" />
          Generation plan
        </p>
        <ul className="mt-2 space-y-1.5">
          {selections.map((s) => (
            <li key={s.model_id} className="flex items-center justify-between text-sm">
              <span className="truncate">{s.name}</span>
              <span className="shrink-0 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                {s.variants} variant{s.variants === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-border pt-2 text-sm font-medium">
          {totalImages} image{totalImages === 1 ? '' : 's'} across {selections.length} model{selections.length === 1 ? '' : 's'}, generated one model at a time
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Wallet className="h-3.5 w-3.5 text-emerald-400" />
          Estimated cost
        </p>
        <ul className="mt-2 space-y-1.5">
          {cost.lines.map((l) => (
            <li key={l.modelId} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                {l.name} <span className="text-xs text-muted-foreground">× {l.variants} · {l.unitLabel}</span>
              </span>
              <span className="shrink-0 font-medium">{l.estimated != null ? formatUsd(l.estimated) : 'varies'}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-border pt-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Estimated total{cost.hasUnknown ? '*' : ''}</span>
            <span className="font-semibold">{formatUsd(cost.total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Available fal credits</span>
            <span className="font-medium">
              {credits.isLoading ? '…' : balance != null ? formatUsd(balance) : 'Unavailable'}
            </span>
          </div>
          {projectedRemaining != null && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Remaining after run</span>
              <span
                className={cn(
                  'font-semibold',
                  insufficient
                    ? 'text-red-600 [[data-omni-theme=dark]_&]:text-red-400'
                    : 'text-emerald-600 [[data-omni-theme=dark]_&]:text-emerald-400',
                )}
              >
                {formatUsd(projectedRemaining)}
              </span>
            </div>
          )}
        </div>
        {insufficient && (
          <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/5 px-2.5 py-1.5 text-xs text-red-600 [[data-omni-theme=dark]_&]:text-red-400">
            This run may exceed your available fal credits. Top up before generating.
          </p>
        )}
        {cost.hasUnknown && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            * GPT-Image is billed per usage by fal, so its cost is not included in the total.
          </p>
        )}
        {balance == null && !credits.isLoading && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Live credit balance is unavailable right now; the estimate above still applies.
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onGenerate}
          className={cn(
            'cursor-pointer gap-2 text-white transition-all duration-300 hover:opacity-90',
            insufficient ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-cyan-500 to-violet-600',
          )}
        >
          {insufficient ? <AlertTriangle className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
          {insufficient ? 'Generate anyway' : 'Generate'}
        </Button>
      </div>
    </div>
  );
}
