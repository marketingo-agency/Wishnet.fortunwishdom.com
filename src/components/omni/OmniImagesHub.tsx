"use client";

/**
 * OmniImagesHub: the Images-track mode chooser (6 modes).
 * Phase 0 ships the chooser shell; each mode card flips to available as its
 * phase lands. Unavailable modes are visibly disabled with an honest note.
 */

import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OMNI_IMAGE_MODES, type OmniModeDef } from './omniConstants';

interface OmniImagesHubProps {
  onBack: () => void;
  onSelectMode: (mode: OmniModeDef['id']) => void;
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export function OmniImagesHub({ onBack, onSelectMode }: OmniImagesHubProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-6 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
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
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Images</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Six ways to create. Pick the mode that fits where you are.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {OMNI_IMAGE_MODES.map((mode) => {
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
                  ? 'cursor-pointer hover:-translate-y-0.5 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10'
                  : 'cursor-not-allowed opacity-65',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
                    <Icon className={cn('h-4.5 w-4.5 h-[18px] w-[18px]', mode.accent)} />
                  </div>
                  <h2 className="text-sm font-semibold">{mode.label}</h2>
                </div>
                {mode.available ? (
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-cyan-400 group-hover:opacity-100" />
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
