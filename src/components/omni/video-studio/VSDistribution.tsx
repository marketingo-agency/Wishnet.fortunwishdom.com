"use client";

/**
 * Video Studio stage 7: distribution variants (Plan 2 Phase 7, D-V6).
 * Per-network presets fan the 16:9 master out via video-utility: trim for
 * length caps first, then LTX-2.3 reframe for aspect ($0.10/s) — snapped to
 * the model's supported set with an honest note (2:3 → 9:16). A 16:9 preset
 * the master already fits ships as-is, free. GEN-01: failed variants retry.
 */

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Play, RefreshCw, Share2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { callOmniVideo } from '@/lib/omniApi';
import { pollVideoAssets } from '@/hooks/omni/useVideoScenes';
import { usePolledAsset } from '@/hooks/omni/useVideoAudio';
import {
  OMNI_VIDEO_NETWORKS, type OmniVideoNetwork, type OmniVideoPreset,
} from '../omniVideoNetworkPresets';
import type { OmniVideoVariantRef } from '@/hooks/omni';

import { REFRAME_PRICE_PER_S, snapReframeAspect } from './vsReframe';

interface VSDistributionProps {
  runId: string;
  assemblyAssetId?: string;
  timelineSeconds: number;
  variants: Record<string, OmniVideoVariantRef>;
  onVariantSaved: (presetId: string, ref: OmniVideoVariantRef) => void;
  onNext: () => void;
}

const POLL_MS = 3500;
const CHAIN_TIMEOUT_MS = 8 * 60_000;

/** Poll one utility asset row until terminal; returns its signed URL. */
async function waitForAsset(assetId: string, cancelled: () => boolean): Promise<{ id: string; url: string }> {
  const deadline = Date.now() + CHAIN_TIMEOUT_MS;
  for (;;) {
    if (cancelled()) throw new Error('Cancelled');
    if (Date.now() > deadline) throw new Error('The processing step timed out — retry the variant.');
    const [r] = await pollVideoAssets([assetId]);
    if (r?.status === 'done' && r.url) return { id: assetId, url: r.url };
    if (r?.status === 'failed') throw new Error(r.error ?? 'The processing step failed');
    await new Promise((res) => setTimeout(res, POLL_MS));
  }
}

function VariantRow({
  runId, assemblyAssetId, timelineSeconds, network, preset, variant, onVariantSaved,
}: {
  runId: string;
  assemblyAssetId: string;
  timelineSeconds: number;
  network: OmniVideoNetwork;
  preset: OmniVideoPreset;
  variant?: OmniVideoVariantRef;
  onVariantSaved: (presetId: string, ref: OmniVideoVariantRef) => void;
}) {
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  // Leaving the stage stops the chain's polling; the utility rows keep
  // completing server-side and restore via the persisted variant ref.
  useEffect(() => () => { cancelledRef.current = true; }, []);
  const polled = usePolledAsset(variant?.asset_id);

  const targetAspect = snapReframeAspect(preset.ratio);
  const needsTrim = timelineSeconds > preset.maxSeconds;
  const needsReframe = targetAspect !== '16:9';
  const snapped = targetAspect !== preset.ratio;
  const effectiveSeconds = Math.min(timelineSeconds, preset.maxSeconds);
  const cost = needsReframe ? REFRAME_PRICE_PER_S * effectiveSeconds : 0;

  const planLabel = [
    needsTrim ? `trim to ${preset.maxSeconds}s` : null,
    needsReframe ? `reframe to ${targetAspect}${snapped ? ` (${preset.ratio} snapped)` : ''}` : null,
  ].filter(Boolean).join(' + ') || 'master as-is';

  const run = async () => {
    setRunning(true);
    setRunError(null);
    cancelledRef.current = false;
    const cancelled = () => cancelledRef.current;
    try {
      const [master] = await pollVideoAssets([assemblyAssetId]);
      if (master?.status !== 'done' || !master.url) throw new Error('The assembled film is not ready yet.');
      let current = { id: assemblyAssetId, url: master.url };

      if (needsTrim) {
        const res = await callOmniVideo<{ asset_id: string }>('video-utility', {
          run_id: runId,
          op: 'fal-ai/workflow-utilities/trim-video',
          input: { video_url: current.url, start_time: 0, duration: preset.maxSeconds },
        });
        if (!needsReframe) {
          // Trim is the final step - persist the ref the moment the job exists.
          onVariantSaved(preset.id, { asset_id: res.asset_id, network: network.id, preset_id: preset.id });
        }
        current = await waitForAsset(res.asset_id, cancelled);
      }
      if (needsReframe) {
        const res = await callOmniVideo<{ asset_id: string }>('video-utility', {
          run_id: runId,
          op: 'fal-ai/ltx-2.3/reframe',
          input: { video_url: current.url, aspect_ratio: targetAspect, resolution: '1080p' },
        });
        // Persist the ref the moment the paid job exists (project rule).
        onVariantSaved(preset.id, {
          asset_id: res.asset_id,
          network: network.id,
          preset_id: preset.id,
          ...(snapped ? { note: `${preset.ratio} snapped to ${targetAspect}` } : {}),
        });
        await waitForAsset(res.asset_id, cancelled);
        return;
      }
      if (!needsTrim) {
        onVariantSaved(preset.id, { asset_id: current.id, network: network.id, preset_id: preset.id });
      }
    } catch (e) {
      if (!cancelledRef.current) setRunError(e instanceof Error ? e.message : 'Variant failed');
    } finally {
      setRunning(false);
    }
  };

  const busy = running || polled.status === 'generating' || polled.status === 'persisting';
  const ready = !running && polled.status === 'done';
  const failed = runError ?? (polled.status === 'failed' ? polled.error ?? 'Variant failed' : null);

  return (
    <div className={cn(
      'rounded-lg border p-3 transition-colors duration-200',
      ready ? 'border-emerald-500/50 bg-card' : 'border-border bg-card',
    )}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold">
            <network.icon className={cn('mr-1.5 inline h-3.5 w-3.5', network.accent)} aria-hidden />
            {network.label} · {preset.label} ({preset.width}×{preset.height}, ≤{preset.maxSeconds}s)
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {planLabel} · {cost > 0 ? `~$${cost.toFixed(2)}` : 'free'}
          </p>
        </div>
        <Button
          variant={ready ? 'outline' : 'default'}
          size="sm"
          onClick={() => void run()}
          disabled={busy}
          className={cn(
            'h-8 shrink-0 cursor-pointer gap-1.5 text-xs',
            !ready && 'bg-gradient-to-r from-violet-500 to-purple-600 text-white transition-all duration-300 hover:opacity-90',
          )}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : ready ? <RefreshCw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {busy ? 'Processing…' : ready ? 'Redo' : failed ? 'Retry' : 'Create variant'}
        </Button>
      </div>
      {failed && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive" role="alert">
          <XCircle className="mt-px h-3.5 w-3.5 shrink-0" /> {failed}
        </p>
      )}
      {variant?.note && !failed && (
        <p className="mt-2 text-[11px] text-amber-700 [[data-omni-theme=dark]_&]:text-amber-400">{variant.note}</p>
      )}
      {ready && polled.url && (
        <video src={polled.url} controls preload="metadata" className="mt-2 max-h-56 w-full rounded-md border border-border object-contain" aria-label={`${network.label} ${preset.label} variant`} />
      )}
    </div>
  );
}

export function VSDistribution({
  runId, assemblyAssetId, timelineSeconds, variants, onVariantSaved, onNext,
}: VSDistributionProps) {
  const [openNetworks, setOpenNetworks] = useState<Set<string>>(
    () => new Set(Object.values(variants).map((v) => v.network)),
  );

  if (!assemblyAssetId) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">Assemble the film first — distribution fans out the final cut.</p>
      </div>
    );
  }

  const toggleNetwork = (id: string) => {
    setOpenNetworks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const variantCount = Object.keys(variants).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold">Distribution targets</h2>
        <p className="text-[11px] text-muted-foreground">master is 16:9 · ≈{timelineSeconds}s</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Networks">
        {OMNI_VIDEO_NETWORKS.map((n) => (
          <button
            key={n.id}
            onClick={() => toggleNetwork(n.id)}
            aria-pressed={openNetworks.has(n.id)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              openNetworks.has(n.id) ? 'border-violet-500/60 bg-violet-500/10 font-medium' : 'border-border hover:border-violet-500/40',
            )}
          >
            <n.icon className={cn('h-3.5 w-3.5', n.accent)} aria-hidden />
            {n.label}
            {openNetworks.has(n.id) && <Check className="h-3 w-3" />}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {OMNI_VIDEO_NETWORKS.filter((n) => openNetworks.has(n.id)).flatMap((n) =>
          n.presets.map((p) => (
            <VariantRow
              key={p.id}
              runId={runId}
              assemblyAssetId={assemblyAssetId}
              timelineSeconds={timelineSeconds}
              network={n}
              preset={p}
              variant={variants[p.id]}
              onVariantSaved={onVariantSaved}
            />
          )),
        )}
        {openNetworks.size === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Pick at least one network to plan its variants.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <p className="text-[11px] text-muted-foreground" aria-live="polite">
          {variantCount === 0 ? 'Create at least one variant to continue.' : `${variantCount} variant${variantCount === 1 ? '' : 's'} in the plan.`}
        </p>
        <Button
          size="sm"
          onClick={onNext}
          disabled={variantCount === 0}
          className="h-8 cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
        >
          Continue to Finalize
        </Button>
      </div>
    </div>
  );
}
