"use client";

/**
 * Home state of the One-Screen Preview: Omni-voiced greeting, hero composer,
 * the four Omni track chips (no brainstorm — the chat itself replaces it),
 * and suggestion cards styled like Omni's entry tiles. The greeting uses the
 * REAL logged-in user's first name (Sam's hybrid ruling); the rest is mock.
 */
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUGGESTIONS, TRACK_META, type PreviewTrack } from './previewMockData';
import { PreviewComposer } from './PreviewComposer';
import { PT } from './previewTokens';

interface PreviewHomeProps {
  firstName: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: (text: string) => void;
}

const TRACK_ORDER: PreviewTrack[] = ['images', 'videos', 'audios', 'content'];

export const PreviewHome = ({ firstName, draft, onDraftChange, onSend }: PreviewHomeProps) => {
  const [selectedTrack, setSelectedTrack] = useState<PreviewTrack | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="m-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-8 sm:px-6">
        <div className="text-center">
          <h2 className="[font-family:var(--font-poppins)] text-2xl font-bold tracking-tight sm:text-3xl">
            What shall we{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
              create
            </span>
            , {firstName}?
          </h2>
          <p className={cn('mx-auto mt-2 max-w-md text-sm', PT.muted)}>
            Ask in the chat, or jump straight into a studio track.
          </p>
        </div>

        <div className="w-full">
          <PreviewComposer value={draft} onChange={onDraftChange} onSend={onSend} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Creation tracks">
          {TRACK_ORDER.map((track) => {
            const meta = TRACK_META[track];
            const Icon = meta.icon;
            const selected = selectedTrack === track;
            return (
              <button
                key={track}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedTrack(selected ? null : track)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 motion-reduce:transition-none',
                  PT.focusRing,
                  selected
                    ? 'border-cyan-500/40 bg-secondary text-secondary-foreground shadow-sm shadow-cyan-500/10'
                    : cn('border-border bg-card', PT.row),
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn('flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br text-white shadow-sm', meta.gradient)}
                >
                  <Icon className="h-3 w-3" />
                </span>
                {meta.label}
              </button>
            );
          })}
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onDraftChange(suggestion)}
              className={cn(
                'group flex cursor-pointer items-start justify-between gap-2 rounded-2xl p-4 text-left text-sm transition-all duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                PT.panel,
                PT.panelHover,
                PT.focusRing,
              )}
            >
              <span className={cn('leading-snug', PT.muted)}>{suggestion}</span>
              <ArrowUpRight
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-cyan-400 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        <p className={cn('text-center text-[11px]', PT.faint)}>
          Suggestions fill the composer. Sending opens a simulated response, no AI is called in this preview.
        </p>
      </div>
    </div>
  );
};
