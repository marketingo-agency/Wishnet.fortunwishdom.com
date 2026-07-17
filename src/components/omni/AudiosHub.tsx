"use client";

/**
 * AudiosHub: the Audios-track mode chooser (Plan 3 Phase 3 — six cards, 2×3,
 * Sam-approved structure). Mirrors VideosHub's patterns; unbuilt modes render
 * visibly disabled with an honest "lands in Phase N" note (the
 * interim-terminal rule — no dead ends, ever).
 */

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OMNI_AUDIO_MODES, type OmniAudioModeDef } from './omniConstants';

interface AudiosHubProps {
  onBack: () => void;
  onSelectMode: (mode: OmniAudioModeDef['id']) => void;
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export function AudiosHub({ onBack, onSelectMode }: AudiosHubProps) {
  // ui-rules: entrance/hover animations respect prefers-reduced-motion.
  const reduceMotion = useReducedMotion();
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
          onClick={onBack}
          className="mb-4 -ml-2 cursor-pointer gap-1.5 text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Omni Home
        </Button>

        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          <span className="bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent [[data-omni-theme=dark]_&]:from-orange-400 [[data-omni-theme=dark]_&]:to-rose-500">Audios</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the mode that fits where you are.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {OMNI_AUDIO_MODES.map((mode) => {
          const Icon = mode.icon;
          return (
            <motion.button
              key={mode.id}
              variants={cardVariants}
              onClick={() => mode.available && onSelectMode(mode.id)}
              disabled={!mode.available}
              aria-label={mode.available ? mode.label : `${mode.label} (${mode.availabilityNote})`}
              className={cn(
                'group relative rounded-xl border border-border bg-card p-4 text-left transition-all duration-300',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                mode.available
                  ? 'cursor-pointer hover:-translate-y-0.5 hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/10'
                  : 'cursor-not-allowed opacity-65',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
                    <Icon className={cn('h-[18px] w-[18px]', mode.accent)} />
                  </div>
                  <span className="text-sm font-semibold">{mode.label}</span>
                </div>
                {mode.available ? (
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-orange-400 group-hover:opacity-100" />
                ) : (
                  <span className="mt-0.5 shrink-0 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Soon
                  </span>
                )}
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{mode.description}</p>
              {!mode.available && (
                <p className="mt-1.5 text-[11px] italic text-muted-foreground/70">{mode.availabilityNote}</p>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
