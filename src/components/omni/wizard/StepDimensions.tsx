"use client";

/**
 * Step 9: per selected network, choose the dimension presets to produce.
 */

import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OMNI_NETWORKS, type OmniNetworkId } from '../omniNetworkPresets';

interface StepDimensionsProps {
  networks: OmniNetworkId[];
  initialSelections: Record<string, string[]>;
  onNext: (selections: Record<string, string[]>) => void;
}

const RatioPreview = ({ width, height }: { width: number; height: number }) => {
  const max = 26;
  const scale = max / Math.max(width, height);
  return (
    <span
      className="inline-block rounded-none border border-cyan-500/50 bg-cyan-500/10"
      style={{ width: Math.max(6, Math.round(width * scale)), height: Math.max(6, Math.round(height * scale)) }}
      aria-hidden="true"
    />
  );
};

export function StepDimensions({ networks, initialSelections, onNext }: StepDimensionsProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>(initialSelections);

  const toggle = (networkId: string, presetId: string) => {
    setSelections((prev) => {
      const current = prev[networkId] ?? [];
      const next = current.includes(presetId) ? current.filter((p) => p !== presetId) : [...current, presetId];
      return { ...prev, [networkId]: next };
    });
  };

  const totalSelected = networks.reduce((sum, n) => sum + (selections[n]?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      {networks.map((networkId) => {
        const network = OMNI_NETWORKS.find((n) => n.id === networkId)!;
        const Icon = network.icon;
        return (
          <section key={networkId} aria-label={`${network.label} formats`}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Icon className={cn('h-4 w-4', network.accent)} />
              {network.label}
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {network.presets.map((preset) => {
                const isOn = (selections[networkId] ?? []).includes(preset.id);
                return (
                  <button
                    key={preset.id}
                    onClick={() => toggle(networkId, preset.id)}
                    aria-pressed={isOn}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isOn ? 'border-cyan-500/60 shadow-md shadow-cyan-500/10' : 'border-border hover:border-cyan-500/30',
                    )}
                  >
                    <RatioPreview width={preset.width} height={preset.height} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{preset.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {preset.width}×{preset.height} · {preset.ratio}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                        isOn ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-border',
                      )}
                    >
                      {isOn && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{totalSelected} format{totalSelected === 1 ? '' : 's'} selected</p>
        <Button
          onClick={() => onNext(selections)}
          disabled={totalSelected === 0}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
