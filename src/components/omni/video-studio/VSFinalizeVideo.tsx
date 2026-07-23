"use client";

/**
 * Video Studio stage 8: finalize (Plan 2 Phase 7, D-V10 + FIN-01).
 * Recap grouped by network → video-finalize on omni-video writes
 * media_type-'video' Content Library items/posts (SRT/thumbnail sidecars ride
 * the item metadata server-side via assembly_asset_id). HONESTY RULE: auto
 * connectors are image-only, so every network is badged "publishes manually
 * via Pulse" instead of a false green success.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Info, Loader2, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { callOmniVideo } from '@/lib/omniApi';
import { usePolledAsset } from '@/hooks/omni/useVideoAudio';
import { OMNI_VIDEO_NETWORKS, getVideoPreset, type OmniVideoNetworkId } from '../omniVideoNetworkPresets';
import type { OmniVideoVariantRef } from '@/hooks/omni';
import { SendToDeskButton } from '@/components/omni/content/SendToDeskButton';

interface VSFinalizeVideoProps {
  runId: string;
  runTitle: string;
  runStatus: string;
  assemblyAssetId?: string;
  srtPath?: string;
  variants: Record<string, OmniVideoVariantRef>;
  captions: Record<string, string>;
  onCaptionChange: (presetId: string, caption: string) => void;
}

function VariantRecap({
  variant, caption, onCaptionChange, disabled, onReadiness,
}: {
  variant: OmniVideoVariantRef;
  caption: string;
  onCaptionChange: (caption: string) => void;
  disabled: boolean;
  onReadiness: (presetId: string, ready: boolean) => void;
}) {
  const polled = usePolledAsset(variant.asset_id);
  useEffect(() => {
    onReadiness(variant.preset_id, polled.status === 'done');
  }, [polled.status, variant.preset_id, onReadiness]);
  const preset = getVideoPreset(variant.network as OmniVideoNetworkId, variant.preset_id);
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[11px] font-medium text-muted-foreground">
        {preset ? `${preset.label} · ${preset.width}×${preset.height}` : variant.preset_id}
        {variant.note ? ` · ${variant.note}` : ''}
        {polled.status !== 'done' && polled.status !== 'idle' && ` · ${polled.status === 'failed' ? 'variant failed — Redo it in Distribution before finalizing' : 'still processing'}`}
      </p>
      {polled.status === 'done' && polled.url && (
        <video src={polled.url} poster={polled.thumbUrl} controls preload="metadata" className="mt-2 max-h-48 w-full rounded-md border border-border object-contain" aria-label="Variant preview" />
      )}
      <Textarea
        value={caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        disabled={disabled}
        rows={2}
        placeholder="Caption for this post"
        className="mt-2 min-h-[52px] resize-y text-sm"
        aria-label="Post caption"
      />
    </div>
  );
}

export function VSFinalizeVideo({
  runId, runTitle, runStatus, assemblyAssetId, srtPath, variants, captions, onCaptionChange,
}: VSFinalizeVideoProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(runTitle);
  const [description, setDescription] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [done, setDone] = useState(runStatus === 'completed');
  const [readiness, setReadiness] = useState<Record<string, boolean>>({});
  const handleReadiness = useCallback((presetId: string, ready: boolean) => {
    setReadiness((prev) => (prev[presetId] === ready ? prev : { ...prev, [presetId]: ready }));
  }, []);
  const allReady = Object.values(variants).every((v) => readiness[v.preset_id]);

  const byNetwork = useMemo(() => {
    const groups = new Map<OmniVideoNetworkId, OmniVideoVariantRef[]>();
    for (const v of Object.values(variants)) {
      const key = v.network as OmniVideoNetworkId;
      groups.set(key, [...(groups.get(key) ?? []), v]);
    }
    return groups;
  }, [variants]);

  const finalize = async () => {
    const posts = Object.values(variants).map((v) => ({
      network: v.network,
      asset_id: v.asset_id,
      caption: (captions[v.preset_id] ?? description).slice(0, 4000),
    }));
    if (!title.trim() || posts.length === 0) {
      toast.error('A title and at least one variant are required.');
      return;
    }
    setFinalizing(true);
    try {
      const res = await callOmniVideo<{ item_id: string; posts_created: number; already_finalized?: boolean }>(
        'video-finalize',
        {
          run_id: runId,
          title: title.trim(),
          description,
          networks: [...byNetwork.keys()],
          posts,
          ...(assemblyAssetId ? { assembly_asset_id: assemblyAssetId } : {}),
        },
      );
      setDone(true);
      await queryClient.invalidateQueries({ queryKey: ['omni-run', runId] });
      toast.success(res.already_finalized
        ? 'This run was already finalized — the existing library entry stands.'
        : `Saved to the Content Library with ${res.posts_created} post${res.posts_created === 1 ? '' : 's'}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Finalize failed');
    } finally {
      setFinalizing(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-8 text-center">
        <PartyPopper className="h-6 w-6 text-emerald-500" />
        <p className="text-sm font-semibold">Your film is in the Content Library.</p>
        <p className="max-w-md text-xs text-muted-foreground">
          Plan and publish it from the Content hub's Publishing Desk.
          {srtPath ? ' The caption SRT rides along with the entry.' : ''}
        </p>
        <Button asChild size="sm" className="h-8 cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90">
          <Link href="/ai-agents/omni?track=content&mode=content_library">Open the Content Library</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div>
          <label htmlFor="vs-fin-title" className="mb-1 block text-[11px] font-medium text-muted-foreground">Library title</label>
          <Input id="vs-fin-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={finalizing} maxLength={200} className="h-9 text-sm" />
        </div>
        <div>
          <label htmlFor="vs-fin-desc" className="mb-1 block text-[11px] font-medium text-muted-foreground">Description (default caption)</label>
          <Textarea id="vs-fin-desc" value={description} onChange={(e) => setDescription(e.target.value)} disabled={finalizing} rows={2} className="min-h-[52px] resize-y text-sm" />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 p-3" role="note">
        <p className="flex items-start gap-1.5 text-[11px] text-fuchsia-700 [[data-omni-theme=dark]_&]:text-fuchsia-300">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          Want this video scheduled and auto-published? Plan it in the Publishing Desk (Content hub) - approval, captions, and Metricool auto-publish live there.
        </p>
        <SendToDeskButton
          assetIds={[...new Set([assemblyAssetId, ...Object.values(variants).map((v) => v.asset_id)].filter((x): x is string => Boolean(x)))]}
          title={title}
          size="xs"
        />
      </div>

      {[...byNetwork.entries()].map(([networkId, refs]) => {
        const network = OMNI_VIDEO_NETWORKS.find((n) => n.id === networkId);
        if (!network) return null;
        return (
          <section key={networkId} className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold">
              <network.icon className={cn('h-4 w-4', network.accent)} aria-hidden />
              {network.label} ({refs.length})
              <span className="font-normal text-muted-foreground">· saves to library, publishes via Pulse</span>
            </h3>
            <div className="space-y-2">
              {refs.map((v) => (
                <VariantRecap
                  key={v.preset_id}
                  variant={v}
                  caption={captions[v.preset_id] ?? ''}
                  onCaptionChange={(c) => onCaptionChange(v.preset_id, c)}
                  disabled={finalizing}
                  onReadiness={handleReadiness}
                />
              ))}
            </div>
          </section>
        );
      })}

      <div className="flex items-center justify-end gap-3">
        {!allReady && Object.keys(variants).length > 0 && (
          <p className="text-[11px] text-muted-foreground" aria-live="polite">
            Waiting for every variant to finish (failed ones need a Redo in Distribution).
          </p>
        )}
        <Button
          size="sm"
          onClick={() => void finalize()}
          disabled={finalizing || Object.keys(variants).length === 0 || !allReady}
          className="h-9 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
        >
          {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Finalize to the Content Library
        </Button>
      </div>
    </div>
  );
}
