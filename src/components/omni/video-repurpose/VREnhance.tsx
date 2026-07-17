"use client";

/**
 * Repurpose & Enhance stage 3: enhancement ops (Plan 2 Phase 10).
 * Topaz upscale ($0.01/s, 60fps interpolation) becomes the YouTube long-form
 * hero variant; mmaudio ($0.001/s) adds an SFX pass for silent drafts and can
 * replace the working source; extract-frame pulls thumbnails (sync, free-ish).
 * All three ride the ALREADY-DEPLOYED video-utility allowlist.
 */

import { useState } from 'react';
import { AudioLines, Camera, Loader2, Sparkles, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { callOmniVideo } from '@/lib/omniApi';
import { pollVideoAssets } from '@/hooks/omni/useVideoScenes';
import { usePolledAsset } from '@/hooks/omni/useVideoAudio';
import type { OmniVideoVariantRef } from '@/hooks/omni';

interface VREnhanceProps {
  runId: string;
  sourceAssetId: string;
  durationS: number;
  /** TOP-6: false means durationS is an unverified estimate — cost lines label it. */
  durationVerified: boolean;
  /** TOP-8: the persisted SFX asset id (step_state), so a resumed run restores
   *  the paid mmaudio output instead of showing an empty pass that invites re-pay. */
  sfxAssetId: string | null;
  /** Persist the SFX asset id the moment submit returns (TOP-8). */
  onSfxSubmitted: (assetId: string) => void;
  upscaleVariant?: OmniVideoVariantRef;
  onUpscaleSaved: (ref: OmniVideoVariantRef) => void;
  onSourceReplaced: (assetId: string) => void;
  onNext: () => void;
}

export function VREnhance({ runId, sourceAssetId, durationS, durationVerified, sfxAssetId: persistedSfxId, onSfxSubmitted, upscaleVariant, onUpscaleSaved, onSourceReplaced, onNext }: VREnhanceProps) {
  const [busyOp, setBusyOp] = useState<string | null>(null);
  const [sfxPrompt, setSfxPrompt] = useState('natural ambient sound effects matching the scene');
  // A just-submitted id takes precedence; otherwise the persisted id restores
  // the SFX result on resume (TOP-8).
  const [localSfxId, setLocalSfxId] = useState<string | null>(null);
  const activeSfxId = localSfxId ?? persistedSfxId;
  const [thumbs, setThumbs] = useState<string[]>([]);
  const upscale = usePolledAsset(upscaleVariant?.asset_id);
  const sfx = usePolledAsset(activeSfxId ?? undefined);
  const est = durationVerified ? '' : ' (est.)';

  const sourceUrl = async (): Promise<string> => {
    const [r] = await pollVideoAssets([sourceAssetId]);
    if (r?.status !== 'done' || !r.url) throw new Error('The source video is not ready.');
    return r.url;
  };

  const runUpscale = async () => {
    setBusyOp('upscale');
    try {
      const url = await sourceUrl();
      const res = await callOmniVideo<{ asset_id: string }>('video-utility', {
        run_id: runId,
        op: 'fal-ai/topaz/upscale/video',
        input: { video_url: url, upscale_factor: 2, target_fps: 60 },
      });
      onUpscaleSaved({ asset_id: res.asset_id, network: 'youtube', preset_id: 'yt_longform', note: 'Topaz 2x upscale, 60fps' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upscale could not be started');
    } finally {
      setBusyOp(null);
    }
  };

  const runSfx = async () => {
    setBusyOp('sfx');
    try {
      const url = await sourceUrl();
      const res = await callOmniVideo<{ asset_id: string }>('video-utility', {
        run_id: runId,
        op: 'fal-ai/mmaudio-v2',
        input: { video_url: url, prompt: sfxPrompt.trim() || 'natural ambient sound effects', duration: Math.min(durationS, 30) },
      });
      setLocalSfxId(res.asset_id);
      onSfxSubmitted(res.asset_id); // TOP-8: persist immediately so a closed tab never orphans it
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'The SFX pass could not be started');
    } finally {
      setBusyOp(null);
    }
  };

  const runThumbs = async () => {
    setBusyOp('thumbs');
    try {
      const url = await sourceUrl();
      const collected: string[] = [];
      for (const frameType of ['first', 'middle', 'last']) {
        const res = await callOmniVideo<{ status: string; result: Record<string, unknown> }>('video-utility', {
          run_id: runId,
          op: 'fal-ai/ffmpeg-api/extract-frame',
          input: { video_url: url, frame_type: frameType },
        });
        const images = res.result?.images as Array<{ url?: string }> | undefined;
        const frameUrl = typeof res.result?.image_url === 'string' ? res.result.image_url as string : images?.[0]?.url;
        if (frameUrl) collected.push(frameUrl);
      }
      if (collected.length === 0) throw new Error('No frames came back.');
      setThumbs(collected);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Thumbnail extraction failed');
    } finally {
      setBusyOp(null);
    }
  };

  const upscaleBusy = busyOp === 'upscale' || upscale.status === 'generating' || upscale.status === 'persisting';
  const sfxBusy = busyOp === 'sfx' || sfx.status === 'generating' || sfx.status === 'persisting';

  return (
    <div className="space-y-4">
      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold"><Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-violet-400" aria-hidden />YouTube hero upscale</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Topaz 2x + 60fps interpolation · ~${(0.01 * durationS).toFixed(2)}{est} · becomes the YouTube long-form variant</p>
          </div>
          <Button size="sm" onClick={() => void runUpscale()} disabled={upscaleBusy} className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90">
            {upscaleBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {upscaleBusy ? 'Upscaling…' : upscale.status === 'done' ? 'Redo upscale' : 'Upscale'}
          </Button>
        </div>
        {upscale.status === 'failed' && (
          <p className="flex items-start gap-1.5 text-[11px] text-destructive" role="alert"><XCircle className="mt-px h-3.5 w-3.5 shrink-0" /> {upscale.error}</p>
        )}
        {upscale.status === 'done' && upscale.url && (
          <video src={upscale.url} controls preload="metadata" className="max-h-56 w-full rounded-md border border-border object-contain" aria-label="Upscaled video" />
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold"><AudioLines className="mr-1.5 inline h-3.5 w-3.5 text-violet-400" aria-hidden />SFX pass (silent drafts)</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">mmaudio synced sound · ~${(0.001 * Math.min(durationS, 30)).toFixed(3)}{est} · caps at 30s</p>
          </div>
          <Button size="sm" onClick={() => void runSfx()} disabled={sfxBusy} className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90">
            {sfxBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AudioLines className="h-3.5 w-3.5" />}
            {sfxBusy ? 'Scoring…' : 'Add SFX'}
          </Button>
        </div>
        <Textarea value={sfxPrompt} onChange={(e) => setSfxPrompt(e.target.value)} rows={1} className="min-h-[36px] resize-y text-sm" aria-label="SFX prompt" />
        {sfx.status === 'failed' && (
          <p className="flex items-start gap-1.5 text-[11px] text-destructive" role="alert"><XCircle className="mt-px h-3.5 w-3.5 shrink-0" /> {sfx.error}</p>
        )}
        {sfx.status === 'done' && sfx.url && activeSfxId && (
          <div className="space-y-2">
            <video src={sfx.url} controls preload="metadata" className="max-h-56 w-full rounded-md border border-border object-contain" aria-label="Video with SFX" />
            <Button variant="outline" size="sm" onClick={() => onSourceReplaced(activeSfxId)} className="h-7 cursor-pointer text-xs">
              Use as the working source (targets re-fan from this)
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold"><Camera className="mr-1.5 inline h-3.5 w-3.5 text-violet-400" aria-hidden />Thumbnails</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">First / middle / last frame via extract-frame — open to save.</p>
          </div>
          <Button size="sm" onClick={() => void runThumbs()} disabled={busyOp === 'thumbs'} className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90">
            {busyOp === 'thumbs' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            Extract
          </Button>
        </div>
        {thumbs.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {thumbs.map((t, i) => (
              <a key={t} href={t} target="_blank" rel="noreferrer" className="cursor-pointer overflow-hidden rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <img src={t} alt={`Thumbnail ${i + 1}`} loading="lazy" className="aspect-video w-full object-cover transition-transform duration-200 hover:scale-105" />
              </a>
            ))}
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <Button size="sm" onClick={onNext} className="h-8 cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90">
          Continue to Finalize
        </Button>
      </div>
    </div>
  );
}
