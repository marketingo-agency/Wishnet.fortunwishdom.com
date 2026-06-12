"use client";

/**
 * Step 11: approval screen for the repurposed selection.
 * Everything is approved by default; uncheck to exclude.
 */

import { useEffect, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getNetwork, getPreset, type OmniNetworkId } from '../omniNetworkPresets';
import { getAssetSignedUrl, type OmniRepurposedRef } from '@/hooks/omni';
import { supabase } from '@/integrations/supabase/client';

interface StepApprovalProps {
  repurposed: OmniRepurposedRef[];
  initialApproved: string[];
  onNext: (approvedAssetIds: string[]) => void;
}

export function StepApproval({ repurposed, initialApproved, onNext }: StepApprovalProps) {
  // Drop stale ids from earlier passes (a regenerated set has all-new asset
  // ids); phantom approvals would otherwise dead-end finalize with 0 posts.
  const [approved, setApproved] = useState<Set<string>>(() => {
    const current = new Set(repurposed.map((r) => r.asset_id));
    const valid = initialApproved.filter((id) => current.has(id));
    return new Set(valid.length > 0 ? valid : current);
  });
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    void (async () => {
      const ids = repurposed.map((r) => r.asset_id);
      const { data } = await supabase
        .from('omni_assets')
        .select('id, storage_path')
        .in('id', ids);
      const entries = await Promise.all(
        ((data ?? []) as { id: string; storage_path: string | null }[]).map(async (a) => {
          const url = a.storage_path ? await getAssetSignedUrl(a.storage_path) : null;
          return [a.id, url] as const;
        }),
      );
      if (active) setUrls(Object.fromEntries(entries.filter(([, u]) => u) as [string, string][]));
    })();
    return () => {
      active = false;
    };
  }, [repurposed]);

  const toggle = (assetId: string) => {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review the repurposed set. Approved items are saved to the Pulse Content Library in the final step.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {repurposed.map((ref) => {
          const preset = getPreset(ref.network as OmniNetworkId, ref.preset_id);
          const network = getNetwork(ref.network as OmniNetworkId);
          const isOn = approved.has(ref.asset_id);
          return (
            <button
              key={ref.asset_id}
              onClick={() => toggle(ref.asset_id)}
              aria-pressed={isOn}
              aria-label={`${isOn ? 'Exclude' : 'Approve'} ${network.label} ${preset?.label ?? ''}`}
              className={cn(
                'group cursor-pointer overflow-hidden rounded-xl border bg-card text-left transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isOn ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10' : 'border-border opacity-60',
              )}
            >
              <div className="relative flex aspect-square items-center justify-center bg-muted/40">
                {urls[ref.asset_id] ? (
                  <img src={urls[ref.asset_id]} alt="" className="h-full w-full object-contain" />
                ) : (
                  <div className="h-full w-full animate-pulse bg-muted" />
                )}
                <span
                  className={cn(
                    'absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-200',
                    isOn ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-white/50 bg-black/40 text-white/60',
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="border-t border-border p-2">
                <p className="truncate text-[11px] font-medium">
                  {network.label} · {preset?.label}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {preset ? `${preset.width}×${preset.height}` : ''} · {ref.mode === 'ai' ? 'AI extended' : 'Smart crop'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{approved.size} of {repurposed.length} approved</p>
        <Button
          onClick={() => onNext([...approved])}
          disabled={approved.size === 0}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
