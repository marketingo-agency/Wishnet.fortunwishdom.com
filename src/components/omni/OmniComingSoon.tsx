"use client";

/**
 * OmniComingSoon: elegant placeholder surface for tracks and modes that have a
 * reserved slot but ship in a later phase (Audios, Videos, Brainstorming stub).
 */

import { motion } from 'framer-motion';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OmniComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badgeLabel: string;
  badgeClassName?: string;
  gradient: string;
  onBack: () => void;
}

export function OmniComingSoon({
  icon: Icon,
  title,
  description,
  badgeLabel,
  badgeClassName,
  gradient,
  onBack,
}: OmniComingSoonProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex max-w-md flex-col items-center"
      >
        <div className="relative mb-6">
          <div
            className={cn(
              'pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br opacity-30 blur-2xl',
              gradient,
            )}
            aria-hidden="true"
          />
          <div
            className={cn(
              'relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br text-white shadow-xl',
              gradient,
            )}
          >
            <Icon className="h-10 w-10" />
          </div>
        </div>

        <span
          className={cn(
            'mb-3 rounded-full border px-3 py-1 text-xs font-medium',
            badgeClassName ?? 'border-border bg-muted/60 text-muted-foreground',
          )}
        >
          {badgeLabel}
        </span>

        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>

        <Button
          variant="outline"
          onClick={onBack}
          className="mt-8 cursor-pointer gap-2 transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Omni Home
        </Button>
      </motion.div>
    </div>
  );
}
