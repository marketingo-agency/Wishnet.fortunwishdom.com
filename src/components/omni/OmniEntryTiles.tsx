"use client";

/**
 * OmniEntryTiles: the four large entry tiles (Brainstorming, Images, Audios, Videos).
 * Coming-soon tracks render as elegant non-navigating tiles; available and
 * in-development tracks navigate into their surface.
 */

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OMNI_TRACKS, type OmniTrackDef } from './omniConstants';
import type { OmniTrack } from '@/hooks/omni';

interface OmniEntryTilesProps {
  onSelectTrack: (track: OmniTrack) => void;
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const tileVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

const AVAILABILITY_BADGE: Record<OmniTrackDef['availability'], { label: string; className: string } | null> = {
  available: null,
  in_development: {
    label: 'In Development',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  },
  coming_soon: {
    label: 'Coming Soon',
    className: 'border-border bg-muted/60 text-muted-foreground',
  },
};

export function OmniEntryTiles({ onSelectTrack }: OmniEntryTilesProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-4 py-8 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8 text-center sm:mb-10"
      >
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          What shall we{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            create
          </span>
          ?
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Omni is your multimodal creation studio. Pick a track to begin.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {OMNI_TRACKS.map((track) => {
          const badge = AVAILABILITY_BADGE[track.availability];
          const isComingSoon = track.availability === 'coming_soon';
          const Icon = track.icon;

          return (
            <motion.button
              key={track.id}
              variants={tileVariants}
              whileHover={isComingSoon ? undefined : { y: -4, transition: { duration: 0.2 } }}
              onClick={() => onSelectTrack(track.id)}
              aria-label={`${track.label}${badge ? ` (${badge.label})` : ''}`}
              className={cn(
                'group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-left',
                'transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isComingSoon
                  ? 'cursor-pointer opacity-80 hover:opacity-100'
                  : 'cursor-pointer hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/10',
              )}
            >
              <div
                className={cn(
                  'pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl transition-opacity duration-300',
                  track.glow,
                  'opacity-0 group-hover:opacity-100',
                )}
                aria-hidden="true"
              />
              <div className="relative flex items-start justify-between">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg',
                    track.gradient,
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                {badge ? (
                  <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-medium', badge.className)}>
                    {badge.label}
                  </span>
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:text-cyan-400 group-hover:opacity-100" />
                )}
              </div>
              <h2 className="relative mt-4 text-lg font-semibold">{track.label}</h2>
              <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {track.description}
              </p>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
