"use client";

/**
 * Publishing Desk: the Content hub's first live mode. A manual-handoff
 * publisher over admin-shared data - stage a post (media + per-network
 * captions/types + schedule) on the Board, plan it on the Calendar, and work
 * the Publish Queue (download the asset, post it manually, mark it done).
 */

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, CalendarDays, LayoutGrid, ListChecks, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDeskPosts, type DeskPost } from '@/hooks/omni/useContentDesk';
import { BoardView } from './BoardView';
import { DeskCalendar } from './DeskCalendar';
import { QueueView } from './QueueView';
import { ComposeSheet } from './ComposeSheet';

type DeskTab = 'board' | 'calendar' | 'queue';

const TABS: { id: DeskTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'board', label: 'Board', icon: LayoutGrid },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'queue', label: 'Publish Queue', icon: ListChecks },
];

interface PublishingDeskProps {
  onExit: () => void;
  /** Deep-linked post (e.g. freshly planned from another hub): opens its
   *  compose sheet once the board has loaded. */
  initialPostId?: string | null;
  onInitialPostConsumed?: () => void;
}

export function PublishingDesk({ onExit, initialPostId, onInitialPostConsumed }: PublishingDeskProps) {
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<DeskTab>('board');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [editPost, setEditPost] = useState<DeskPost | null>(null);

  const posts = useDeskPosts(includeArchived);

  const openCompose = (post: DeskPost | null) => {
    setEditPost(post);
    setComposeOpen(true);
  };

  useEffect(() => {
    if (!initialPostId || !posts.data) return;
    const target = posts.data.find((p) => p.id === initialPostId);
    // Consume only once the post is actually found - a stale first snapshot
    // must not swallow the deep link.
    if (target) {
      openCompose(target);
      onInitialPostConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per deep link, when the data lands
  }, [initialPostId, posts.data]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onExit}
            aria-label="Back to the Content hub"
            className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Content</p>
            <h1 className="truncate text-sm font-semibold sm:text-base">
              <span className="bg-gradient-to-r from-fuchsia-600 to-pink-600 bg-clip-text text-transparent [[data-omni-theme=dark]_&]:from-fuchsia-400 [[data-omni-theme=dark]_&]:to-pink-500">
                Publishing Desk
              </span>
            </h1>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => openCompose(null)}
          className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-fuchsia-500 to-pink-600 text-xs text-white transition-all duration-300 hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          New post
        </Button>
      </div>

      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-4 py-2 sm:px-6" role="tablist" aria-label="Publishing Desk views">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-fuchsia-500/10 text-fuchsia-700 [[data-omni-theme=dark]_&]:text-fuchsia-300'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={tab}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex-1 overflow-y-auto px-4 py-4 sm:px-6"
      >
        {tab === 'board' && (
          <BoardView
            query={posts}
            includeArchived={includeArchived}
            onToggleArchived={setIncludeArchived}
            onOpenPost={(p) => openCompose(p)}
            onNewPost={() => openCompose(null)}
          />
        )}
        {tab === 'calendar' && (
          <DeskCalendar query={posts} onOpenPost={(p) => openCompose(p)} />
        )}
        {tab === 'queue' && (
          <QueueView query={posts} onOpenPost={(p) => openCompose(p)} />
        )}
      </motion.div>

      <ComposeSheet
        open={composeOpen}
        onOpenChange={(open) => {
          setComposeOpen(open);
          if (!open) setEditPost(null);
        }}
        post={editPost}
      />
    </div>
  );
}
