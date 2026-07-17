"use client";

/**
 * ShowFeedPanel: one show's feed manager — RSS metadata editor (with the
 * default-ON AI disclosure), feed URL + regenerate, and the episode
 * publish/unpublish list. All actions are admin-gated server-side.
 */

import { useState } from 'react';
import { Copy, ExternalLink, Globe, Loader2, RefreshCcw, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { callOmniPodcast } from '@/lib/omniApi';
import { useUpdateShow, type PodcastShow } from '@/hooks/omni/usePodcastShows';
import { usePodcastEpisodes } from '@/hooks/omni/usePodcastEpisodes';
import { useQueryClient } from '@tanstack/react-query';
import { DEFAULT_DISCLOSURE } from './publishFeedConstants';

interface ShowFeedPanelProps {
  show: PodcastShow;
}

export function ShowFeedPanel({ show }: ShowFeedPanelProps) {
  const config = (show.feed_config ?? {}) as Record<string, unknown>;
  const updateShow = useUpdateShow();
  const queryClient = useQueryClient();
  const { data: episodes = [] } = usePodcastEpisodes();
  const episodesForShow = episodes.filter((e) => e.show_id === show.id);

  const [category, setCategory] = useState(typeof config.category === 'string' ? config.category : show.category ?? '');
  const [ownerEmail, setOwnerEmail] = useState(typeof config.owner_email === 'string' ? config.owner_email : '');
  const [artworkUrl, setArtworkUrl] = useState(typeof config.artwork_url === 'string' ? config.artwork_url : '');
  const [explicit, setExplicit] = useState(config.explicit === true);
  const [disclosure, setDisclosure] = useState(
    typeof config.disclosure_text === 'string' && config.disclosure_text.trim() ? config.disclosure_text : DEFAULT_DISCLOSURE,
  );
  const [busyEpisode, setBusyEpisode] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [feedUrl, setFeedUrl] = useState<string | null>(null);

  const publicBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/podcast-public`;
  const canonicalFeedUrl = feedUrl ?? `${publicBase}/shows/${show.slug}/feed.xml`;

  const saveConfig = () => {
    updateShow.mutate({
      id: show.id,
      feed_config: {
        ...config,
        category: category.trim(),
        owner_email: ownerEmail.trim(),
        artwork_url: artworkUrl.trim(),
        explicit,
        // Default-ON (D-A6): an emptied field falls back server-side too.
        disclosure_text: disclosure.trim() || DEFAULT_DISCLOSURE,
      },
    });
  };

  const refreshEpisodes = () => void queryClient.invalidateQueries({ queryKey: ['podcast-episodes'] });

  const publish = async (episodeId: string, unpublish: boolean) => {
    setBusyEpisode(episodeId);
    try {
      const res = await callOmniPodcast<{ feed_url: string; duration_probed?: boolean }>(
        unpublish ? 'unpublish-episode' : 'publish-episode',
        { episode_id: episodeId },
      );
      setFeedUrl(res.feed_url);
      refreshEpisodes();
      toast.success(unpublish
        ? 'Episode removed from the feed.'
        : `Episode published${res.duration_probed === false ? ' (duration kept as estimate — fal probe unavailable)' : ''}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Publish action failed');
    } finally {
      setBusyEpisode(null);
    }
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const res = await callOmniPodcast<{ feed_url: string }>('feed-regenerate', { show_id: show.id });
      setFeedUrl(res.feed_url);
      toast.success('Feed regenerated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Feed regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  const copyFeed = async () => {
    await navigator.clipboard.writeText(canonicalFeedUrl);
    toast.success('Feed URL copied.');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Globe className="h-4 w-4 text-orange-400" />
          Feed metadata
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`cat-${show.id}`}>iTunes category</Label>
            <Input id={`cat-${show.id}`} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Society & Culture" />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`email-${show.id}`}>Owner email (Spotify verification)</Label>
            <Input id={`email-${show.id}`} type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="owner@example.com" />
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <Label htmlFor={`art-${show.id}`}>Artwork URL (square, 1400–3000px, public)</Label>
          <Input id={`art-${show.id}`} value={artworkUrl} onChange={(e) => setArtworkUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Switch id={`explicit-${show.id}`} checked={explicit} onCheckedChange={setExplicit} />
          <Label htmlFor={`explicit-${show.id}`}>Explicit content</Label>
        </div>
        <div className="mt-3 space-y-1">
          <Label htmlFor={`disc-${show.id}`}>AI disclosure (required by Apple; always in the feed)</Label>
          <Textarea id={`disc-${show.id}`} value={disclosure} onChange={(e) => setDisclosure(e.target.value)} rows={2} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={saveConfig} disabled={updateShow.isPending} className="cursor-pointer">
            {updateShow.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save metadata
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Feed</h3>
        <p className="mt-1 break-all rounded-lg bg-muted/40 px-2.5 py-1.5 font-mono text-[11px]">{canonicalFeedUrl}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void copyFeed()} className="h-7 cursor-pointer gap-1 text-xs">
            <Copy className="h-3.5 w-3.5" />
            Copy URL
          </Button>
          <Button variant="outline" size="sm" onClick={() => void regenerate()} disabled={regenerating} className="h-7 cursor-pointer gap-1 text-xs">
            {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            Regenerate
          </Button>
          <Button variant="outline" size="sm" asChild className="h-7 cursor-pointer gap-1 text-xs">
            <a href={`https://www.castfeedvalidator.com/?url=${encodeURIComponent(canonicalFeedUrl)}`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Validate
            </a>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Episodes</h3>
        {episodesForShow.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">No episodes yet — produce one in Podcast Studio.</p>
        )}
        <div className="mt-2 space-y-2">
          {episodesForShow.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{e.title}</p>
                <p className="text-[10px] text-muted-foreground">{e.status}{e.duration_s ? ` · ≈${Math.max(1, Math.round(e.duration_s / 60))} min` : ''}</p>
              </div>
              {e.status === 'published' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void publish(e.id, true)}
                  disabled={busyEpisode !== null}
                  className="h-7 shrink-0 cursor-pointer gap-1 text-xs"
                >
                  {busyEpisode === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Unpublish
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => void publish(e.id, false)}
                  disabled={busyEpisode !== null || !e.audio_path}
                  className="h-7 shrink-0 cursor-pointer gap-1 bg-gradient-to-r from-orange-500 to-rose-600 text-xs text-white transition-all duration-300 hover:opacity-90"
                >
                  {busyEpisode === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Publish
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
