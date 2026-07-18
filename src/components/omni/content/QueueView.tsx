"use client";

/**
 * Publishing Desk - Publish Queue: the handoff worklist. Due and upcoming
 * destinations grouped per post: download the asset(s), copy the caption,
 * post it manually on the network, then Mark published (with an optional live
 * URL). Recently published targets can be undone.
 */

import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { AlertCircle, Check, CheckCircle2, Clapperboard, Copy, Download, ImageIcon, Loader2, Maximize2, PartyPopper, RefreshCw, Undo2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  isArmedTarget, useMarkPublished, useMetricoolSync, useUnpublishTarget,
  type DeskPost, type DeskTarget,
} from '@/hooks/omni/useContentDesk';
import { METRICOOL_STATUS_META, formatScheduled, getDeskNetwork, toLightboxItems, type LightboxItem } from './contentConstants';
import { DeskLightbox } from './DeskLightbox';

/** The post's media as a full-height column beside the content: it stretches
 *  to match the right panel (no dead space below a tiny square), fills as a
 *  cover image, and opens fullscreen on click. Mobile gets a wide banner. */
function PostMediaRail({ post, onPreview }: { post: DeskPost; onPreview: (index: number) => void }) {
  const cover = post.media[0];
  if (!cover) return null;
  return (
    <button
      type="button"
      onClick={() => onPreview(0)}
      aria-label="Preview the media fullscreen"
      className={cn(
        'group relative shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-border bg-muted/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        // Mobile: full-width banner. sm+: a column that STRETCHES with the card.
        'aspect-video w-full sm:aspect-auto sm:min-h-[200px] sm:w-48 sm:self-stretch md:w-56',
      )}
    >
      {cover.url ? (
        cover.kind === 'video' ? (
          <video src={cover.url} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <img src={cover.url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
        )
      ) : (
        <span className="absolute inset-0 flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground/50" /></span>
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/30 group-hover:opacity-100 group-focus-visible:bg-black/30 group-focus-visible:opacity-100">
        <Maximize2 className="h-5 w-5 text-white" />
      </span>
      {cover.kind === 'video' && (
        <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          <Clapperboard className="h-2.5 w-2.5" /> Video
        </span>
      )}
      {post.media.length > 1 && (
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          +{post.media.length - 1}
        </span>
      )}
    </button>
  );
}

function TargetRow({ post, target }: { post: DeskPost; target: DeskTarget }) {
  const [confirming, setConfirming] = useState(false);
  const [liveUrl, setLiveUrl] = useState('');
  const markPublished = useMarkPublished();
  const net = getDeskNetwork(target.network);
  const Icon = net.icon;
  const armed = isArmedTarget(target);
  const mcMeta = target.metricool_status ? METRICOOL_STATUS_META[target.metricool_status] : undefined;

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(target.caption);
      toast.success('Caption copied.');
    } catch {
      toast.error('Could not copy the caption.');
    }
  };

  const confirm = () => {
    markPublished.mutate(
      { target_id: target.id, ...(liveUrl.trim() ? { published_url: liveUrl.trim() } : {}) },
      { onSuccess: () => { setConfirming(false); setLiveUrl(''); toast.success(`${net.label} marked published.`); } },
    );
  };

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background/60 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <Icon className={cn('h-3.5 w-3.5', net.accent)} />
          {target.network === 'other' ? (target.network_label || 'Other') : net.label}
          {target.post_type && <span className="font-normal text-muted-foreground">· {target.post_type}</span>}
        </span>
        <div className="flex items-center gap-1.5">
          {target.caption && (
            <Button variant="ghost" size="sm" onClick={() => void copyCaption()} className="h-7 cursor-pointer gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground">
              <Copy className="h-3 w-3" /> Caption
            </Button>
          )}
          {armed ? (
            <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', mcMeta?.className ?? 'text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300')}>
              <Zap className="h-3 w-3" />
              {mcMeta?.label ?? 'Scheduled in Metricool'}
            </span>
          ) : !confirming ? (
            <Button
              size="sm"
              onClick={() => setConfirming(true)}
              className="h-7 cursor-pointer gap-1 bg-gradient-to-r from-emerald-500 to-teal-600 px-2.5 text-[11px] text-white transition-all duration-300 hover:opacity-90"
            >
              <CheckCircle2 className="h-3 w-3" /> Mark published
            </Button>
          ) : (
            <span className="flex items-center gap-1.5">
              <Input
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                placeholder="Live URL (optional)"
                aria-label="Live post URL"
                className="h-7 w-[170px] text-[11px]"
              />
              <Button size="sm" onClick={confirm} disabled={markPublished.isPending} className="h-7 cursor-pointer gap-1 bg-emerald-600 px-2 text-[11px] text-white hover:bg-emerald-700">
                <Check className="h-3 w-3" /> Done
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} className="h-7 cursor-pointer px-2 text-[11px] text-muted-foreground">
                Cancel
              </Button>
            </span>
          )}
        </div>
      </div>
      {armed && target.sync_error && (
        <p className="text-[11px] text-rose-700 [[data-omni-theme=dark]_&]:text-rose-400">{target.sync_error}</p>
      )}
      {target.caption ? (
        <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-xs leading-relaxed">{target.caption}</p>
      ) : (
        <p className="text-[11px] italic text-muted-foreground">No caption for this destination.</p>
      )}
      {!armed && post.media.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.media.map((m, i) => (
            <a
              key={m.id}
              href={m.download_url ?? undefined}
              download
              aria-disabled={!m.download_url}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium transition-colors duration-200',
                'hover:border-fuchsia-500/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !m.download_url && 'pointer-events-none opacity-50',
              )}
            >
              <Download className="h-3 w-3" />
              {m.kind === 'video' ? 'Video' : 'Image'} {i + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

interface QueueViewProps {
  query: UseQueryResult<DeskPost[]>;
  onOpenPost: (post: DeskPost) => void;
}

export function QueueView({ query, onOpenPost }: QueueViewProps) {
  const { user } = useAuth();
  const unpublish = useUnpublishTarget();
  const sync = useMetricoolSync();
  const [lightbox, setLightbox] = useState<{ items: LightboxItem[]; index: number } | null>(null);

  if (query.isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-destructive">Could not load the queue.</p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()} className="h-8 cursor-pointer text-xs">Try again</Button>
      </div>
    );
  }

  const posts = (query.data ?? []).filter((p) => p.status !== 'archived');
  const now = Date.now();
  // The queue works APPROVED posts (plus legacy pre-approval-layer 'scheduled'
  // ones). Drafts and posts still under review live on the Board.
  const QUEUE_STATUSES = new Set(['approved', 'scheduled', 'partially_published']);
  const withWork = posts
    .filter((p) => QUEUE_STATUSES.has(p.status) && p.targets.some((t) => t.status === 'scheduled'))
    .sort((a, b) => (a.scheduled_at ?? '9999').localeCompare(b.scheduled_at ?? '9999'));
  const due = withWork.filter((p) => p.scheduled_at && Date.parse(p.scheduled_at) <= now);
  const upcoming = withWork.filter((p) => !p.scheduled_at || Date.parse(p.scheduled_at) > now);
  const armedCount = posts.reduce((n, p) => n + p.targets.filter(isArmedTarget).length, 0);
  const awaitingApproval = posts.filter((p) => p.status === 'pending_approval').length;
  const published = posts
    .flatMap((p) => p.targets.filter((t) => t.status === 'published').map((t) => ({ post: p, target: t })))
    .sort((a, b) => (b.target.published_at ?? '').localeCompare(a.target.published_at ?? ''))
    .slice(0, 10);

  const renderGroup = (label: string, group: DeskPost[], accent: string) => group.length > 0 && (
    <section className="space-y-2.5" aria-label={label}>
      <p className={cn('text-[11px] font-semibold uppercase tracking-wider', accent)}>{label}</p>
      {group.map((post) => (
        <div key={post.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row">
          <PostMediaRail
            post={post}
            onPreview={(index) => setLightbox({ items: toLightboxItems(post.media), index })}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <button
              type="button"
              onClick={() => onOpenPost(post)}
              className="cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Open post ${post.title || 'Untitled'}`}
            >
              <p className="text-sm font-semibold hover:underline">{post.title || 'Untitled post'}</p>
              <p className="text-[11px] text-muted-foreground">{formatScheduled(post.scheduled_at)}</p>
            </button>
            {post.targets.filter((t) => t.status === 'scheduled').map((t) => (
              <TargetRow key={t.id} post={post} target={t} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {armedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300">
            <Zap className="h-3.5 w-3.5" />
            {armedCount} destination{armedCount === 1 ? '' : 's'} armed - Metricool publishes them on schedule.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sync.mutate(undefined)}
            disabled={sync.isPending}
            className="h-7 cursor-pointer gap-1.5 text-[11px]"
          >
            {sync.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Sync status
          </Button>
        </div>
      )}
      {withWork.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <PartyPopper className="h-7 w-7 text-muted-foreground/60" />
          <div>
            <p className="text-sm font-medium">Queue clear</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {awaitingApproval > 0
                ? `${awaitingApproval} post${awaitingApproval === 1 ? '' : 's'} awaiting approval on the Board - the queue picks them up once approved.`
                : 'Nothing is waiting to be published. Stage a post on the Board.'}
            </p>
          </div>
        </div>
      )}
      {renderGroup('Due now', due, 'text-amber-700 [[data-omni-theme=dark]_&]:text-amber-400')}
      {renderGroup('Upcoming', upcoming, 'text-muted-foreground')}

      {published.length > 0 && (
        <section className="space-y-2" aria-label="Recently published">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 [[data-omni-theme=dark]_&]:text-emerald-400">
            Recently published
          </p>
          {published.map(({ post, target }) => {
            const net = getDeskNetwork(target.network);
            const Icon = net.icon;
            return (
              <div key={target.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <span className="flex min-w-0 items-center gap-1.5 text-xs">
                  <Icon className={cn('h-3.5 w-3.5 shrink-0', net.accent)} />
                  <span className="truncate font-medium">{post.title || 'Untitled'}</span>
                  <span className="shrink-0 text-muted-foreground">
                    · {target.published_by === user?.id ? 'by you' : 'by a teammate'}
                    {target.published_at ? ` · ${new Date(target.published_at).toLocaleDateString()}` : ''}
                  </span>
                  {target.published_url && (
                    <a href={target.published_url} target="_blank" rel="noreferrer" className="shrink-0 cursor-pointer text-fuchsia-600 underline-offset-2 hover:underline [[data-omni-theme=dark]_&]:text-fuchsia-400">
                      view live
                    </a>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => unpublish.mutate(target.id)}
                  disabled={unpublish.isPending}
                  className="h-7 cursor-pointer gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <Undo2 className="h-3 w-3" /> Undo
                </Button>
              </div>
            );
          })}
        </section>
      )}

      <DeskLightbox
        items={lightbox?.items ?? []}
        index={lightbox?.index ?? null}
        onIndexChange={(i) => setLightbox((prev) => (i === null || !prev ? null : { ...prev, index: i }))}
      />
    </div>
  );
}
