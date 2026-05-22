"use client";

import type { LucideIcon } from 'lucide-react';

interface PulsePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Tasteful "in progress" panel for Pulse tabs not yet wired.
 * Replaced phase-by-phase as each surface ships.
 */
export function PulsePlaceholder({ icon: Icon, title, description }: PulsePlaceholderProps) {
  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-pink-500/20 blur-xl" aria-hidden="true" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 shadow-lg shadow-pink-500/20">
          <Icon className="h-8 w-8 text-white" strokeWidth={1.5} />
        </div>
      </div>
      <div className="max-w-sm space-y-1.5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-[11px] font-medium text-pink-600 dark:text-pink-300">
        In progress
      </span>
    </div>
  );
}
