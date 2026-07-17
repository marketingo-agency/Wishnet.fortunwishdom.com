"use client";

/**
 * Shared wizard stage rail (2026-07-17 rehab, TOP-10 fix): the old 6px
 * unlabeled bars made stages invisible until reached. This rail keeps the
 * compact bar look, adds VISIBLE stage titles on sm+ screens, expands the
 * hit area to ~26px (the Audios-track before: pseudo trick), and titles
 * every segment for touch/hover.
 */

import { cn } from '@/lib/utils';

export interface StageRailItem {
  ordinal: number;
  title: string;
}

type RailAccent = 'purple' | 'violet' | 'rose' | 'cyan' | 'emerald';

const ACCENTS: Record<RailAccent, { active: string; reachable: string }> = {
  purple: { active: 'bg-purple-500', reachable: 'cursor-pointer bg-purple-500/35 hover:bg-purple-500/60' },
  violet: { active: 'bg-violet-500', reachable: 'cursor-pointer bg-violet-500/35 hover:bg-violet-500/60' },
  rose: { active: 'bg-rose-500', reachable: 'cursor-pointer bg-rose-500/35 hover:bg-rose-500/60' },
  cyan: { active: 'bg-cyan-500', reachable: 'cursor-pointer bg-cyan-500/35 hover:bg-cyan-500/60' },
  emerald: { active: 'bg-emerald-500', reachable: 'cursor-pointer bg-emerald-500/35 hover:bg-emerald-500/60' },
};

interface StageRailProps {
  stages: StageRailItem[];
  current: number;
  isReachable: (ordinal: number) => boolean;
  /** Optional hint appended to the aria-label of unreachable stages. */
  unreachableHint?: (ordinal: number) => string;
  onJump: (ordinal: number) => void;
  accent: RailAccent;
}

export function StageRail({ stages, current, isReachable, unreachableHint, onJump, accent }: StageRailProps) {
  const colors = ACCENTS[accent];
  return (
    <div className="flex shrink-0 gap-1.5 border-b border-border px-4 py-2 sm:px-6" role="group" aria-label="Stages">
      {stages.map((s) => {
        const reachable = isReachable(s.ordinal);
        const active = s.ordinal === current;
        return (
          <button
            key={s.ordinal}
            onClick={() => reachable && !active && onJump(s.ordinal)}
            disabled={!reachable}
            title={s.title}
            aria-label={`${s.title}${reachable ? '' : unreachableHint?.(s.ordinal) ?? ' (not reached yet)'}`}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'group min-w-0 flex-1 pb-0.5 pt-1 focus-visible:outline-none',
              reachable && !active && 'cursor-pointer',
            )}
          >
            <span
              className={cn(
                'relative block h-1.5 rounded-full transition-colors duration-200',
                // WCAG target size: the 6px bar keeps its look; the hit area grows.
                "before:absolute before:-inset-y-2.5 before:inset-x-0 before:content-['']",
                'group-focus-visible:ring-2 group-focus-visible:ring-ring',
                active ? colors.active : reachable ? colors.reachable : 'bg-muted',
              )}
            />
            <span
              className={cn(
                'mt-1 hidden truncate text-center text-[10px] leading-tight sm:block',
                active ? 'font-semibold text-foreground' : reachable ? 'text-muted-foreground' : 'text-muted-foreground/50',
              )}
            >
              {s.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
