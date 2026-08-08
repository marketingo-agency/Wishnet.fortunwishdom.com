"use client";

/**
 * Expanded-rail content for the One-Screen Preview: new-creation button,
 * search, and the grouped mock history list. Shared by the desktop rail and
 * the mobile drawer (split out of PreviewRail to honor the 200-line rule).
 */
import { useMemo, useState } from 'react';
import { MoreHorizontal, Plus, Search, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  GROUP_LABELS,
  MOCK_RUNS,
  TRACK_META,
  type PreviewGroup,
  type PreviewRun,
} from './previewMockData';
import { PT } from './previewTokens';

const GROUP_ORDER: PreviewGroup[] = ['today', 'yesterday', 'week'];

interface RailContentProps {
  activeId: string | null;
  onSelect: (run: PreviewRun) => void;
  onNew: () => void;
}

const RailRow = ({ run, active, onSelect }: { run: PreviewRun; active: boolean; onSelect: (run: PreviewRun) => void }) => {
  const meta = TRACK_META[run.track];
  const Icon = meta.icon;
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onSelect(run)}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 pr-9 text-left text-sm transition-colors duration-150 motion-reduce:transition-none',
          PT.focusRing,
          active ? PT.rowActive : PT.row,
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0', meta.iconClass)} aria-hidden="true" />
        <span className="truncate">{run.title}</span>
      </button>
      <button
        type="button"
        aria-label={`Options for ${run.title} (preview only)`}
        title="Available in the real build"
        className={cn(
          'absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none',
          PT.ghostBtn,
          PT.focusRing,
        )}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export const RailContent = ({ activeId, onSelect, onNew }: RailContentProps) => {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? MOCK_RUNS.filter((r) => r.title.toLowerCase().includes(q)) : MOCK_RUNS;
    return GROUP_ORDER.map((group) => ({
      group,
      runs: matches.filter((r) => r.group === group),
    })).filter((g) => g.runs.length > 0);
  }, [query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={onNew}
          className={cn(
            'flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 motion-reduce:transition-none',
            PT.accentBtn,
            PT.focusRing,
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New creation
        </button>
        <div className="relative mt-3">
          <Search className={cn('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', PT.faint)} aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search creations"
            aria-label="Search creations"
            className={cn(
              'h-9 w-full rounded-lg border pl-9 pr-3 text-sm outline-none transition-colors duration-200 motion-reduce:transition-none',
              PT.input,
              PT.focusRing,
            )}
          />
        </div>
      </div>

      <nav className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="Creation history">
        {groups.length === 0 ? (
          <div className={cn('flex flex-col items-center gap-2 px-4 py-10 text-center text-sm', PT.muted)}>
            <SearchX className="h-6 w-6 opacity-60" aria-hidden="true" />
            No creations match "{query.trim()}"
          </div>
        ) : (
          groups.map(({ group, runs }) => (
            <div key={group} className="mb-1">
              <p className={cn('px-2.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider', PT.faint)}>
                {GROUP_LABELS[group]}
              </p>
              <ul className="space-y-0.5">
                {runs.map((run) => (
                  <li key={run.id}>
                    <RailRow run={run} active={activeId === run.id} onSelect={onSelect} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </nav>

      <div className={cn('border-t px-3 py-3', PT.border)}>
        <p className={cn('text-[11px] leading-relaxed', PT.faint)}>
          One-screen concept preview. History entries are mock data.
        </p>
      </div>
    </div>
  );
};
