"use client";

/**
 * Publishing Desk - Board: every staged post as a card (thumbnail, status,
 * network chips with per-target publish dots, schedule, author), with status
 * and network filters. Clicking a card opens it in the compose sheet.
 */

import { useMemo, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { AlertCircle, Clapperboard, ImageIcon, Inbox, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { DeskPost } from '@/hooks/omni/useContentDesk';
import { DESK_NETWORKS, POST_STATUS_META, formatScheduled, getDeskNetwork } from './contentConstants';

interface BoardViewProps {
  query: UseQueryResult<DeskPost[]>;
  includeArchived: boolean;
  onToggleArchived: (v: boolean) => void;
  onOpenPost: (post: DeskPost) => void;
  onNewPost: () => void;
}

const STATUS_FILTERS = ['all', 'draft', 'scheduled', 'partially_published', 'published', 'archived'] as const;

export function BoardView({ query, includeArchived, onToggleArchived, onOpenPost, onNewPost }: BoardViewProps) {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [networkFilter, setNetworkFilter] = useState<string>('all');

  const posts = useMemo(() => {
    const all = query.data ?? [];
    return all.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (networkFilter !== 'all' && !p.targets.some((t) => t.network === networkFilter)) return false;
      return true;
    });
  }, [query.data, statusFilter, networkFilter]);

  if (query.isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-destructive">{query.error instanceof Error ? query.error.message : 'Could not load the board'}</p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()} className="h-8 cursor-pointer text-xs">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as (typeof STATUS_FILTERS)[number])}>
          <SelectTrigger className="h-8 w-[180px] cursor-pointer text-xs" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s === 'all' ? 'All statuses' : POST_STATUS_META[s]?.label ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={networkFilter} onValueChange={setNetworkFilter}>
          <SelectTrigger className="h-8 w-[160px] cursor-pointer text-xs" aria-label="Filter by network">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All networks</SelectItem>
            {DESK_NETWORKS.map((n) => (
              <SelectItem key={n.id} value={n.id} className="text-xs">{n.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Switch id="board-archived" checked={includeArchived} onCheckedChange={onToggleArchived} className="cursor-pointer" />
          <Label htmlFor="board-archived" className="cursor-pointer text-xs text-muted-foreground">Show archived</Label>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Inbox className="h-7 w-7 text-muted-foreground/60" />
          <div>
            <p className="text-sm font-medium">
              {query.data && query.data.length > 0 ? 'Nothing matches these filters' : 'Nothing staged yet'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {query.data && query.data.length > 0
                ? 'Loosen the status or network filter to see more.'
                : 'Stage your first post: media, captions per network, and a schedule.'}
            </p>
          </div>
          {(!query.data || query.data.length === 0) && (
            <Button
              size="sm"
              onClick={onNewPost}
              className="cursor-pointer gap-1.5 bg-gradient-to-r from-fuchsia-500 to-pink-600 text-xs text-white transition-all duration-300 hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> New post
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const cover = post.media[0];
            const statusMeta = POST_STATUS_META[post.status] ?? POST_STATUS_META.draft;
            return (
              <button
                key={post.id}
                type="button"
                onClick={() => onOpenPost(post)}
                aria-label={`Open post: ${post.title || 'Untitled post'}`}
                className={cn(
                  'group overflow-hidden rounded-xl border border-border bg-card text-left transition-all duration-300',
                  'cursor-pointer hover:-translate-y-0.5 hover:border-fuchsia-500/40 hover:shadow-lg hover:shadow-fuchsia-500/10',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-muted/40">
                  {cover?.url ? (
                    cover.kind === 'video' ? (
                      <video src={cover.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    ) : (
                      <img src={cover.url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
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
                        return (
                          <span
                            key={t.id}
                            title={`${t.network === 'other' ? t.network_label || 'Other' : net.label}${t.post_type ? ` · ${t.post_type}` : ''} · ${t.status === 'published' ? 'published' : 'to publish'}`}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-1.5 py-0.5"
                          >
                            <Icon className={cn('h-3 w-3', net.accent)} />
                            <span
                              aria-hidden="true"
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                t.status === 'published' ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                              )}
                            />
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {formatScheduled(post.scheduled_at)}
                    {' · '}
                    {user?.id === post.created_by ? 'Added by you' : 'Added by a teammate'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
