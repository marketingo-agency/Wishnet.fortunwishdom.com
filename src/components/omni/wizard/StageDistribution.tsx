"use client";

/**
 * Stage 4 "Distribution" (Plan 1 Phase 7): merges the old networks and
 * dimension-preset screens — "where, in what shape" is ONE decision (CONS-01).
 *
 * - Network cards with their format checklists INLINE; a network is selected
 *   exactly when it has at least one format picked (the persisted state keeps
 *   the legacy `networks` + `preset_selections` shapes, D-REG contract).
 * - Footer: formats × images = N outputs with the tier-aware cost range
 *   (DIM-01/REP-C — the multiplier is visible BEFORE it fires).
 * - Pulse connection badges per network (FIN-01): "publishes from Pulse" vs
 *   "saved to library only". Degrades silently for non-admins (the status
 *   action is admin-gated).
 */

import { useMemo, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OMNI_NETWORKS, type OmniNetworkId } from '../omniNetworkPresets';
import { useLibraryConnections } from '@/components/pulse/library/useContentLibrary';
import { getFalPrice } from '@/config/falPricing';
import { DEFAULT_FAL_EDIT_MODEL } from '@/config/llmModels';
import { formatUsd } from '@/config/falPricing';

interface StageDistributionProps {
  initialNetworks: string[];
  initialSelections: Record<string, string[]>;
  /** Approved base images that will be adapted into every selected format. */
  imageCount: number;
  onNext: (networks: OmniNetworkId[], selections: Record<string, string[]>) => void;
}

export function StageDistribution({ initialNetworks, initialSelections, imageCount, onNext }: StageDistributionProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>(initialSelections);
  const connections = useLibraryConnections();

  const toggle = (networkId: string, presetId: string) => {
    setSelections((prev) => {
      const current = prev[networkId] ?? [];
      const next = current.includes(presetId) ? current.filter((p) => p !== presetId) : [...current, presetId];
      return { ...prev, [networkId]: next };
    });
  };

  const activeNetworks = useMemo(
    () => OMNI_NETWORKS.filter((n) => (selections[n.id]?.length ?? 0) > 0).map((n) => n.id),
    [selections],
  );
  const totalFormats = activeNetworks.reduce((sum, n) => sum + (selections[n]?.length ?? 0), 0);
  const totalOutputs = totalFormats * Math.max(imageCount, 1);
  // Tier-aware ceiling: AI redesign is the priciest adapt path; crop is free.
  const redesignUnit = getFalPrice(DEFAULT_FAL_EDIT_MODEL).unitPrice ?? 0.15;
  const maxCost = totalOutputs * redesignUnit;

  // Order networks so previously-picked ones keep their original order.
  const orderedInitial = initialNetworks.filter((n) => OMNI_NETWORKS.some((o) => o.id === n));

  return (
    <div className="space-y-4 pb-14">
      <p className="text-sm text-muted-foreground">
        Pick where this content publishes and in which formats. Each format becomes one adapted
        output per approved image in the next stage.
      </p>

      <div className="space-y-4">
        {OMNI_NETWORKS.map((network) => {
          const Icon = network.icon;
          const picked = selections[network.id] ?? [];
          const isOn = picked.length > 0;
          const conn = connections.data?.[network.id];
          return (
            <section
              key={network.id}
              aria-label={`${network.label} formats`}
              className={cn(
                'rounded-xl border bg-card p-3 transition-all duration-200',
                isOn ? 'border-cyan-500/50 shadow-md shadow-cyan-500/10' : 'border-border',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className={cn('h-4 w-4', network.accent)} />
                  {network.label}
                  {isOn && (
                    <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300">
                      {picked.length} format{picked.length === 1 ? '' : 's'}
                    </span>
                  )}
                </h2>
                {/* FIN-01: honest publishing state, before the user invests. */}
                {conn && (
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                      conn.connected
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 [[data-omni-theme=dark]_&]:text-emerald-400'
                        : 'border-border bg-muted/50 text-muted-foreground',
                    )}
                    title={conn.detail}
                  >
                    {conn.connected ? 'Publishes from Pulse' : 'Saved to library only'}
                  </span>
                )}
              </div>
              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {network.presets.map((preset) => {
                  const on = picked.includes(preset.id);
                  const max = 26;
                  const scale = max / Math.max(preset.width, preset.height);
                  return (
                    <button
                      key={preset.id}
                      onClick={() => toggle(network.id, preset.id)}
                      aria-pressed={on}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border bg-background/40 px-3 py-2 text-left transition-all duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        on ? 'border-cyan-500/60 shadow-sm shadow-cyan-500/10' : 'border-border hover:border-cyan-500/30',
                      )}
                    >
                      <span
                        className="inline-block shrink-0 rounded-none border border-cyan-500/50 bg-cyan-500/10"
                        style={{ width: Math.max(6, Math.round(preset.width * scale)), height: Math.max(6, Math.round(preset.height * scale)) }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{preset.label}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {preset.width}×{preset.height} · {preset.ratio}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                          on ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-border',
                        )}
                      >
                        {on && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* DIM-01: the multiplier, spelled out before it fires. */}
      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/95 p-3 backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {totalFormats} format{totalFormats === 1 ? '' : 's'} × {imageCount} image{imageCount === 1 ? '' : 's'} ={' '}
          <span className="font-semibold text-foreground">{totalOutputs} output{totalOutputs === 1 ? '' : 's'}</span>
          {totalOutputs > 0 && (
            <span className="ml-1.5">
              · free with crop, up to ≈{formatUsd(maxCost)} with AI redesign
            </span>
          )}
        </p>
        <Button
          onClick={() => {
            const ordered = [
              ...orderedInitial.filter((n) => activeNetworks.includes(n as OmniNetworkId)),
              ...activeNetworks.filter((n) => !orderedInitial.includes(n)),
            ] as OmniNetworkId[];
            onNext(ordered, selections);
          }}
          disabled={totalFormats === 0}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
