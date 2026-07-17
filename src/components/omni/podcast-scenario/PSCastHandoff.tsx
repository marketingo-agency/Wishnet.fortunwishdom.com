"use client";

/**
 * PSCastHandoff (stage 4): the finished scenario at a glance — cast mapping,
 * script size, estimated TTS cost — plus Finish and the Podcast Studio
 * handoff (badge-disabled until Phase 6 ships).
 */

import { useMemo } from 'react';
import { Check, Loader2, Mic, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePersonas } from '@/hooks/omni/usePersonas';
import { estimateTtsCost } from '@/config/falPricing';
import type { OmniImagesState } from '@/hooks/omni';

interface PSCastHandoffProps {
  state: OmniImagesState;
  onFinish: () => void;
  /** Absent until the Podcast Studio surface ships (Phase 6). */
  onSendToStudio?: () => void;
  finishing: boolean;
}

export function PSCastHandoff({ state, onFinish, onSendToStudio, finishing }: PSCastHandoffProps) {
  const outline = state.podcast_outline!;
  const cast = state.podcast_cast ?? {};
  const { data: personas = [] } = usePersonas();

  const stats = useMemo(() => {
    const segments = Object.values(state.podcast_script ?? {}).flat();
    const chars = segments.reduce((n, s) => n + s.text.length, 0);
    const words = segments.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0);
    return { chars, words, minutes: Math.round(words / 150), cost: estimateTtsCost(chars) };
  }, [state.podcast_script]);

  const castRows = Object.entries(cast).map(([label, personaId]) => ({
    label,
    persona: personas.find((p) => p.id === personaId) ?? null,
  }));

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">{outline.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {outline.chapters.length} chapters · ~{stats.words.toLocaleString()} words · ≈{stats.minutes} spoken minutes
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Estimated voice cost:{' '}
          <span className="font-medium text-foreground">{stats.cost === null ? 'unknown' : `$${stats.cost.toFixed(2)}`}</span>
          <span className="ml-1 text-[11px]">({stats.chars.toLocaleString()} characters, rate configurable)</span>
        </p>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">The cast</h3>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {castRows.length === 0 && (
            <p className="col-span-full rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              Single-host episode (no default cast on the show).
            </p>
          )}
          {castRows.map(({ label, persona }) => (
            <div key={label} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
              {persona?.portrait_url ? (
                <img src={persona.portrait_url} alt={`Portrait of ${persona.name}`} className="h-8 w-8 shrink-0 rounded-md border border-border object-cover" loading="lazy" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
                  <Mic className="h-3.5 w-3.5 text-orange-400" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-600 [[data-omni-theme=dark]_&]:text-orange-400">{label}</p>
                <p className="truncate text-xs font-medium">{persona?.name ?? 'Missing persona'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-end gap-2 border-t border-border pt-4 sm:flex-row">
        <Button
          variant="outline"
          onClick={onFinish}
          disabled={finishing}
          className="cursor-pointer gap-1.5"
        >
          {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Finish &amp; save scenario
        </Button>
        {onSendToStudio ? (
          <Button
            onClick={onSendToStudio}
            disabled={finishing}
            className="cursor-pointer gap-1.5 bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
          >
            {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to Podcast Studio
          </Button>
        ) : (
          <Button disabled className="cursor-not-allowed gap-1.5" aria-label="Send to Podcast Studio (lands in Phase 6)">
            <Send className="h-4 w-4" />
            Send to Podcast Studio
            <span className="rounded-full border border-border bg-muted/60 px-1.5 py-0.5 text-[9px] font-medium">Phase 6</span>
          </Button>
        )}
      </div>
    </div>
  );
}
