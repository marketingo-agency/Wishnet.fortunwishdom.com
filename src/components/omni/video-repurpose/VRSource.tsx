"use client";

/**
 * Repurpose & Enhance stage 1: pick a finished Omni video (Plan 2 Phase 10).
 * Own done video assets, newest first, signed + thumbed via video-poll.
 * Files-upload and Content-Library sources land in the polish pass.
 *
 * 2026-07-17 rehab: TOP-1 — when a run already exists the picker highlights
 * the current working source and a re-pick REPLACES it on the same run
 * (the wizard decides; this component never fabricates a duration — unknown
 * lengths surface as null so the wizard can probe the real value, TOP-6).
 */

import { useEffect, useState } from 'react';
import { Film, Loader2, Recycle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { pollVideoAssets, type VideoPollEntry } from '@/hooks/omni/useVideoScenes';

interface SourceVideo {
  id: string;
  prompt: string | null;
  created_at: string;
  url?: string;
  thumbUrl?: string;
  durationS?: number | null;
}

interface VRSourceProps {
  creating: boolean;
  /** The run's current working source (null before the run exists). */
  currentSourceId: string | null;
  /** durationS is null when the asset carries no measured duration — the
   *  wizard probes the real value instead of trusting a guess. */
  onPicked: (assetId: string, durationS: number | null, label: string) => void;
}

export function VRSource({ creating, currentSourceId, onPicked }: VRSourceProps) {
  const [videos, setVideos] = useState<SourceVideo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(currentSourceId);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error: qErr } = await supabase
        .from('omni_assets')
        .select('id, prompt, created_at, metadata')
        .eq('kind', 'video')
        .eq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(24);
      if (cancelled) return;
      if (qErr) {
        setError(qErr.message);
        return;
      }
      const rows = ((data ?? []) as { id: string; prompt: string | null; created_at: string; metadata: Record<string, unknown> | null }[]);
      const base: SourceVideo[] = rows.map((r) => ({
        id: r.id,
        prompt: r.prompt,
        created_at: r.created_at,
        durationS: typeof r.metadata?.duration_s === 'number' ? (r.metadata.duration_s as number) : null,
      }));
      setVideos(base);
      // Sign in chunks of 12 (the video-poll batch cap).
      for (let i = 0; i < base.length; i += 12) {
        const chunk = base.slice(i, i + 12).map((v) => v.id);
        try {
          const results: VideoPollEntry[] = await pollVideoAssets(chunk);
          if (cancelled) return;
          setVideos((prev) => (prev ?? []).map((v) => {
            const r = results.find((x) => x.id === v.id);
            return r?.status === 'done'
              ? { ...v, url: r.url ?? undefined, thumbUrl: (r as { thumb_url?: string | null }).thumb_url ?? undefined, durationS: r.duration_s ?? v.durationS }
              : v;
          }));
        } catch { /* thumbnails are best-effort; the pick still works */ }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const chosen = (videos ?? []).find((v) => v.id === selectedId);
  const isCurrent = chosen != null && chosen.id === currentSourceId;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Pick a finished video to fan out and enhance. 16:9 masters repurpose best; Files-upload and Library sources land in the polish pass.
        {currentSourceId && ' Re-picking stays on this run — choosing a different video replaces the working source.'}
      </p>
      {error && <p className="text-xs text-destructive" role="alert">Could not load your videos: {error}</p>}
      {videos === null ? (
        <div className="flex justify-center py-10" aria-live="polite"><Loader2 className="h-5 w-5 animate-spin text-violet-500" /></div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center">
          <Film className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">No finished videos yet — make one in Video Studio or Clips first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {videos.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              aria-pressed={selectedId === v.id}
              className={cn(
                'group cursor-pointer overflow-hidden rounded-xl border text-left transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selectedId === v.id ? 'border-violet-500 ring-2 ring-violet-500/40' : 'border-border hover:border-violet-500/50',
              )}
            >
              <div className="flex aspect-video items-center justify-center bg-muted/40">
                {v.thumbUrl ? (
                  <img src={v.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : v.url ? (
                  <video src={v.url} preload="metadata" muted className="h-full w-full object-cover" />
                ) : (
                  <Film className="h-5 w-5 text-muted-foreground" aria-hidden />
                )}
              </div>
              <p className="line-clamp-2 p-2 text-[11px] text-muted-foreground">
                {v.id === currentSourceId && <span className="font-semibold text-violet-500">Current source · </span>}
                {v.durationS ? `${v.durationS}s · ` : ''}{v.prompt ?? 'Processed output'}
              </p>
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => chosen && onPicked(chosen.id, chosen.durationS ?? null, (chosen.prompt ?? 'video').slice(0, 60))}
          disabled={creating || !chosen}
          className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
        >
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Recycle className="h-3.5 w-3.5" />}
          {isCurrent ? 'Continue with this video' : currentSourceId ? 'Replace the source with this video' : 'Repurpose this video'}
        </Button>
      </div>
    </div>
  );
}
