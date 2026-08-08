"use client";

/**
 * Home state of the One-Screen Preview: ChatGPT-style greeting, hero
 * composer, track chips, and suggestion cards. The greeting uses the REAL
 * logged-in user's first name (Sam's hybrid ruling); everything else is mock.
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const TRACK_ORDER: PreviewTrack[] = ['images', 'videos', 'audios', 'content', 'brainstorm'];

export const PreviewHome = ({ firstName, draft, onDraftChange, onSend }: PreviewHomeProps) => {
  const [selectedTrack, setSelectedTrack] = useState<PreviewTrack | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="m-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-8 sm:px-6">
        <div className="text-center">
          <h2 className="[font-family:var(--font-poppins)] text-2xl font-bold sm:text-3xl">
            {getGreeting()},{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
              {firstName}
            </span>
          </h2>
          <p className={cn('mt-2 text-sm', PT.muted)}>
            One screen. Every creation. What are we making today?
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
                  'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 motion-reduce:transition-none',
                  PT.focusRing,
                  selected
                    ? 'border-cyan-400/50 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 [[data-preview-theme=light]_&]:text-cyan-700'
                    : cn('border-white/[0.08] [[data-preview-theme=light]_&]:border-zinc-200', PT.row),
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', meta.iconClass)} aria-hidden="true" />
                {meta.label}
              </button>
            );
          })}
        </div>

        <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onDraftChange(suggestion)}
              className={cn(
                'group flex cursor-pointer items-start justify-between gap-2 rounded-2xl p-3.5 text-left text-sm transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                PT.panel,
                PT.panelHover,
                PT.focusRing,
              )}
            >
              <span className={cn('leading-snug', PT.muted)}>{suggestion}</span>
              <ArrowUpRight
                className={cn('mt-0.5 h-4 w-4 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none', PT.faint)}
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
