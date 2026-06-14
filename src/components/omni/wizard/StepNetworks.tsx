"use client";

/**
 * Step 7: choose one or more target social networks (before captions, so each
 * caption can be tailored per network).
 */

import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OMNI_NETWORKS, type OmniNetworkId } from '../omniNetworkPresets';
import { useState } from 'react';

interface StepNetworksProps {
  initialNetworks: string[];
  onNext: (networks: OmniNetworkId[]) => void;
}

export function StepNetworks({ initialNetworks, onNext }: StepNetworksProps) {
  const [selected, setSelected] = useState<Set<OmniNetworkId>>(new Set(initialNetworks as OmniNetworkId[]));

  const toggle = (id: OmniNetworkId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Where will this content be published?</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OMNI_NETWORKS.map((network) => {
          const Icon = network.icon;
          const isOn = selected.has(network.id);
          return (
            <button
              key={network.id}
              onClick={() => toggle(network.id)}
              aria-pressed={isOn}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isOn ? 'border-cyan-500/60 shadow-lg shadow-cyan-500/10' : 'border-border hover:border-cyan-500/30',
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                <Icon className={cn('h-5 w-5', network.accent)} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">{network.label}</h3>
                <p className="text-xs text-muted-foreground">{network.presets.length} formats</p>
              </div>
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-200',
                  isOn ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-border',
                )}
              >
                {isOn && <Check className="h-3.5 w-3.5" />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() => onNext([...selected])}
          disabled={selected.size === 0}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
