"use client";

/**
 * Content hub - Content Library: the stable archive view of everything the
 * Desk has shipped. Browse and search published (and archived) posts, see
 * where each one went with its live links, and jump back into the Desk.
 * Pure own-data - no external API involved.
 */

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, ArrowLeft, ArrowUpRight, Clapperboard, ExternalLink, ImageIcon, Library, Maximize2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useDeskPosts, type DeskPost } from '@/hooks/omni/useContentDesk';
import { DESK_NETWORKS, POST_STATUS_META, getDeskNetwork, toLightboxItems, type LightboxItem } from './contentConstants';
import { DeskLightbox } from './DeskLightbox';

const SHOWN_STATUSES = new Set(['published', 'partially_published', 'archived']);

interface ContentLibraryModeProps {
  onBack: () => void;
  onOpenDesk: () => void;
}

export function ContentLibraryMode({ onBack, onOpenDesk }: ContentLibraryModeProps) {
  const reduceMotion = useReducedMotion();
  const query = useDeskPosts(true);
  const [search, setSearch] = useState('');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [scope, setScope] = useState<'shipped' | 'all'>('shipped');
  const [lightbox, setLightbox] = useState<{ items: LightboxItem[]; index: number } | null>(null);

  const posts = useMemo(() => {
    const all = query.data ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((p) => {
      if (scope === 'shipped' && !SHOWN_STATUSES.has(p.status)) return false;
      if (networkFilter !== 'all' && !p.targets.some((t) => t.network === networkFilter)) return false;
      if (q && !`${p.title} ${p.notes ?? ''} ${p.targets.map((t) => t.caption).join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query.data, search, networkFilter, scope]);

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-6 sm:px-8">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto w-full max-w-5xl"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4 -ml-2 cursor-pointer gap-1.5 text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Content hub
        </Button>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              <span className="bg-gradient-to-r from-fuchsia-600 to-pink-600 bg-clip-text text-transparent [[data-omni-theme=dark]_&]:from-fuchsia-400 [[data-omni-theme=dark]_&]:to-pink-500">Content Library</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Everything the Desk has shipped, browsable and reusable.</p>
          </div>
          <Button
            size="sm"
            onClick={onOpenDesk}
            className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-fuchsia-500 to-pink-600 text-xs text-white transition-all duration-300 hover:opacity-90"
          >
            Open the Desk <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search titles, notes, captions…"
              aria-label="Search the library"
              className="h-8 w-[220px] pl-8 text-xs"
            />
          </div>
          <Select value={networkFilter} onValueChange={setNetworkFilter}>
            <SelectTrigger className="h-8 w-[150px] cursor-pointer text-xs" aria-label="Filter by network">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All networks</SelectItem>
              {DESK_NETWORKS.map((n) => (
                <SelectItem key={n.id} value={n.id} className="text-xs">{n.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={scope} onValueChange={(v) => setScope(v as 'shipped' | 'all')}>
            <SelectTrigger className="h-8 w-[170px] cursor-pointer text-xs" aria-label="Library scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shipped" className="text-xs">Published &amp; archived</SelectItem>
              <SelectItem value="all" className="text-xs">Everything</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          {query.isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
                  <Skeleton className="aspect-video w-full rounded-none" />
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : query.isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm text-destructive">Could not load the library.</p>
              <Button variant="outline" size="sm" onClick={() => void query.refetch()} className="h-8 cursor-pointer text-xs">Try again</Button>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
              <Library className="h-7 w-7 text-muted-foreground/60" />
              <div>
                <p className="text-sm font-medium">
                  {(query.data ?? []).length === 0 ? 'Nothing in the library yet' : 'Nothing matches'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(query.data ?? []).length === 0
                    ? 'Posts land here once the Desk publishes them.'
                    : 'Loosen the search or filters to see more.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <LibraryCard
                  key={post.id}
                  post={post}
                  onPreview={(index) => setLightbox({ items: toLightboxItems(post.media), index })}
                />
              ))}
            </div>
          )}
        </div>

        <DeskLightbox
          items={lightbox?.items ?? []}
          index={lightbox?.index ?? null}
          onIndexChange={(i) => setLightbox((prev) => (i === null || !prev ? null : { ...prev, index: i }))}
        />
      </motion.div>
    </div>
  );
}

function LibraryCard({ post, onPreview }: { post: DeskPost; onPreview: (index: number) => void }) {
  const cover = post.media[0];
  const statusMeta = POST_STATUS_META[post.status] ?? POST_STATUS_META.draft;
  const publishedTargets = post.targets.filter((t) => t.status === 'published');
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-fuchsia-500/40 hover:shadow-lg hover:shadow-fuchsia-500/10">
      <div className="group relative flex aspect-video items-center justify-center overflow-hidden bg-muted/40">
        {cover?.url ? (
          cover.kind === 'video' ? (
            <video src={cover.url} controls muted playsInline preload="metadata" className="h-full w-full object-cover" />
          ) : (
            <button
              type="button"
              onClick={() => onPreview(0)}
              aria-label="View the media fullscreen"
              className="h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img src={cover.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/25 group-hover:opacity-100">
                <Maximize2 className="h-4 w-4 text-white" />
              </span>
            </button>
          )
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
        )}
        {cover?.kind === 'video' && (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            <Clapperboard className="h-2.5 w-2.5" /> Video
          </span>
        )}
        {post.media.length > 1 && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            +{post.media.length - 1}
          </span>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold">{post.title || 'Untitled post'}</p>
          <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium', statusMeta.className)}>
            {statusMeta.label}
          </span>
        </div>
        {post.targets.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {post.targets.map((t) => {
              const net = getDeskNetwork(t.network);
              const Icon = net.icon;
              const label = t.network === 'other' ? (t.network_label || 'Other') : net.label;
              const chip = (
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium transition-colors duration-200',
                  t.status === 'published'
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 [[data-omni-theme=dark]_&]:text-emerald-300'
                    : 'border-border bg-muted/40 text-muted-foreground',
                  t.published_url && 'hover:border-emerald-500/60',
                )}>
                  <Icon className={cn('h-3 w-3', net.accent)} />
                  {label}
                  {t.published_url && <ExternalLink className="h-2.5 w-2.5" />}
                </span>
              );
              return t.published_url ? (
                <a
                  key={t.id}
                  href={t.published_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open the live ${label} post`}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {chip}
                </a>
              ) : (
                <span key={t.id}>{chip}</span>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {publishedTargets.length > 0
            ? `Published on ${publishedTargets.length} of ${post.targets.length} destination${post.targets.length === 1 ? '' : 's'}`
            : 'Not published yet'}
          {post.scheduled_at ? ` · ${new Date(post.scheduled_at).toLocaleDateString()}` : ''}
        </p>
      </div>
    </div>
  );
}
