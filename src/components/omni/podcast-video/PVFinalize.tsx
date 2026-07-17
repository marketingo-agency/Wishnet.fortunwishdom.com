"use client";

/**
 * PVFinalize (stage 4): the produced set — audiogram + clips — with
 * downloads, the video-track Content Library save (media_type 'video'),
 * and honest routes onward (YouTube via Pulse upload-post; vertical
 * reframes via Repurpose & Enhance).
 */

import { useState } from 'react';
import { Check, Download, LibraryBig, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { callOmniVideo } from '@/lib/omniApi';
import { downloadFromUrl } from '@/lib/downloadFromUrl';
import { usePolledAsset } from '@/hooks/omni/useVideoAudio';
import { usePodcastEpisodes } from '@/hooks/omni/usePodcastEpisodes';
import type { OmniImagesState } from '@/hooks/omni';

interface PVFinalizeProps {
  state: OmniImagesState;
  runId: string;
  onFinish: () => void;
}

function AssetCard({ assetId, label }: { assetId: string; label: string }) {
  const asset = usePolledAsset(assetId);
  const download = async () => {
    if (!asset.url) return;
    try {
      await downloadFromUrl(asset.url, `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.mp4`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed');
    }
  };
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{label}</p>
        <Button variant="outline" size="sm" onClick={() => void download()} disabled={!asset.url} className="h-7 cursor-pointer gap-1 text-xs">
          <Download className="h-3.5 w-3.5" />
          MP4
        </Button>
      </div>
      {asset.status === 'done' && asset.url ? (
        <video src={asset.url} controls preload="metadata" className="mt-2 max-h-56 w-full rounded-lg" aria-label={label} />
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground" aria-live="polite">
          {asset.status === 'failed' ? asset.error : 'Loading…'}
        </p>
      )}
    </div>
  );
}

export function PVFinalize({ state, runId, onFinish }: PVFinalizeProps) {
  const { data: episodes = [] } = usePodcastEpisodes();
  const episode = episodes.find((e) => e.id === state.podcast_episode_id) ?? null;
  const [saving, setSaving] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const assetIds = [state.pv_audiogram_asset_id, ...(state.pv_clip_asset_ids ?? [])].filter(
    (x): x is string => typeof x === 'string',
  );

  const saveToLibrary = async () => {
    if (assetIds.length === 0) return;
    setSaving(true);
    try {
      const res = await callOmniVideo<{ item_id: string; already_finalized?: boolean }>('video-finalize', {
        run_id: runId,
        title: `${episode?.title ?? 'Podcast video'} — video set`.slice(0, 200),
        description: episode?.description ?? '',
        save_mode: 'item_only',
        asset_ids: assetIds,
      });
      setSavedItemId(res.item_id);
      toast.success(res.already_finalized ? 'Already in the Content Library.' : 'Saved to the Content Library.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save to the Content Library');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {state.pv_audiogram_asset_id && <AssetCard assetId={state.pv_audiogram_asset_id} label="Episode audiogram" />}
      {(state.pv_clip_asset_ids ?? []).map((id, i) => (
        <AssetCard key={id} assetId={id} label={`Highlight clip ${i + 1}`} />
      ))}
      {assetIds.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
          Nothing generated yet — go back to stage 3.
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Publish the audiogram to YouTube through Pulse (upload-post). Vertical reframes and captions
        for the clips live in the Videos track&apos;s Repurpose &amp; Enhance.
      </p>

      <div className="flex flex-col justify-end gap-2 border-t border-border pt-4 sm:flex-row">
        {savedItemId ? (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 [[data-omni-theme=dark]_&]:text-emerald-400">
            <Check className="h-4 w-4" />
            In the Content Library
          </span>
        ) : (
          <Button
            variant="outline"
            onClick={() => void saveToLibrary()}
            disabled={saving || assetIds.length === 0}
            className="cursor-pointer gap-1.5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LibraryBig className="h-4 w-4" />}
            Save set to Content Library
          </Button>
        )}
        <Button
          onClick={() => { setFinishing(true); onFinish(); }}
          disabled={finishing}
          className="cursor-pointer gap-1.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
        >
          {finishing && <Loader2 className="h-4 w-4 animate-spin" />}
          Finish
        </Button>
      </div>
    </div>
  );
}
