"use client";

import type { LucideIcon } from 'lucide-react';

interface WhisperPlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** "In progress" panel for Whisper tabs not yet wired; replaced phase-by-phase. */
export function WhisperPlaceholder({ icon: Icon, title, description }: WhisperPlaceholderProps) {
  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl" aria-hidden="true" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-indigo-500/20">
          <Icon className="h-8 w-8 text-white" strokeWidth={1.5} />
        </div>
      </div>
      <div className="max-w-sm space-y-1.5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-300">
        In progress
      </span>
    </div>
  );
}
