"use client";

/**
 * PublishFeedView: the Publish & Feed manager (Plan 3 Phase 9) — per-show
 * feed management plus the one-time directory submission checklist
 * (submissions are HUMAN actions; this tracks and links them).
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePodcastShows } from '@/hooks/omni/usePodcastShows';
import { ShowFeedPanel } from './ShowFeedPanel';
import { PODCAST_DIRECTORIES } from './publishFeedConstants';

interface PublishFeedViewProps {
  onExit: () => void;
}

export function PublishFeedView({ onExit }: PublishFeedViewProps) {
  const reduceMotion = useReducedMotion();
  const { data: shows = [], isLoading, isError } = usePodcastShows();
  const [activeShowId, setActiveShowId] = useState<string | null>(null);
  const activeShow = shows.find((s) => s.id === activeShowId) ?? shows[0] ?? null;

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-6 sm:px-8">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto w-full max-w-3xl"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="mb-4 -ml-2 cursor-pointer gap-1.5 text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Audios
        </Button>

        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          <span className="bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent [[data-omni-theme=dark]_&]:from-orange-400 [[data-omni-theme=dark]_&]:to-rose-500">Publish &amp; Feed</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Self-hosted RSS per show. Publishing is admin-only; the feed URL is permanent once submitted to directories.
        </p>

        {isLoading && <Skeleton className="mt-5 h-40 rounded-xl" />}
        {!isLoading && isError && (
          <p className="mt-5 rounded-xl border border-destructive/30 px-4 py-10 text-center text-sm text-destructive">
            Couldn&apos;t load the shows. Reload the page to retry.
          </p>
        )}
        {!isLoading && !isError && shows.length === 0 && (
          <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            No shows yet. Create one in Cast &amp; Personas.
          </p>
        )}

        {shows.length > 1 && (
          <div className="mt-5 flex flex-wrap gap-1.5" role="group" aria-label="Shows">
            {shows.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveShowId(s.id)}
                aria-pressed={activeShow?.id === s.id}
                className={cn(
                  'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  activeShow?.id === s.id
                    ? 'border-orange-500/50 bg-orange-500/10 text-orange-700 [[data-omni-theme=dark]_&]:text-orange-400'
                    : 'border-border text-muted-foreground hover:border-orange-500/30 hover:text-foreground',
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {activeShow && (
          <div className="mt-5">
            <ShowFeedPanel key={activeShow.id} show={activeShow} />
          </div>
        )}

        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Rss className="h-4 w-4 text-orange-400" />
            Directory submissions (one-time, human)
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Submit the feed URL once per directory — each needs an account, so these are manual steps.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {PODCAST_DIRECTORIES.map((d) => (
              <li key={d.name}>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors duration-200 hover:border-orange-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {d.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
