"use client";

/**
 * PDCast (stage 2): map every script speaker label to a persona. Rendering
 * needs a VOICE per label, so the gate requires each mapped persona to carry
 * a voice_id (personas without one are selectable but flagged).
 */

import { useMemo, useState } from 'react';
import { AlertTriangle, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePersonas } from '@/hooks/omni/usePersonas';
import type { OmniImagesState } from '@/hooks/omni';

interface PDCastProps {
  state: OmniImagesState;
  onNext: (cast: Record<string, string>) => void;
}

export function PDCast({ state, onNext }: PDCastProps) {
  const { data: personas = [], isLoading } = usePersonas();

  const labels = useMemo(() => {
    const seen = new Set<string>();
    for (const segments of Object.values(state.podcast_script ?? {})) {
      for (const s of segments) seen.add(s.speaker);
    }
    return [...seen].sort();
  }, [state.podcast_script]);

  const [cast, setCast] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const label of labels) {
      const preset = state.podcast_cast?.[label];
      if (preset) initial[label] = preset;
    }
    return initial;
  });

  const personaById = (id: string | undefined) => personas.find((p) => p.id === id) ?? null;
  const allMapped = labels.every((l) => !!cast[l]);
  const allVoiced = labels.every((l) => !!personaById(cast[l])?.voice_id);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Every speaker in the script needs a persona with an ElevenLabs voice. Manage them in Cast &amp; Personas.
      </p>

      <div className="space-y-2">
        {labels.map((label) => {
          const persona = personaById(cast[label]);
          const missingVoice = !!persona && !persona.voice_id;
          return (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="flex w-28 shrink-0 items-center gap-2">
                <Mic className="h-3.5 w-3.5 text-rose-400" />
                <span className="truncate text-[11px] font-semibold uppercase tracking-wider">{label}</span>
              </div>
              <Select
                value={cast[label] ?? ''}
                onValueChange={(v) => setCast((prev) => ({ ...prev, [label]: v }))}
                disabled={isLoading}
              >
                <SelectTrigger className="flex-1" aria-label={`Persona for ${label}`}>
                  <SelectValue placeholder={isLoading ? 'Loading personas…' : 'Pick a persona'} />
                </SelectTrigger>
                <SelectContent>
                  {personas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.voice_id ? '' : ' (no voice)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {missingVoice && (
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-amber-600 [[data-omni-theme=dark]_&]:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  No voice
                </span>
              )}
            </div>
          );
        })}
        {labels.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            The script has no speakers yet. Go back to stage 1.
          </p>
        )}
      </div>

      {personas.length === 0 && !isLoading && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 [[data-omni-theme=dark]_&]:text-amber-400">
          No personas exist yet. Create them in Cast &amp; Personas on the Audios hub.
        </p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={() => onNext(cast)}
          disabled={labels.length === 0 || !allMapped || !allVoiced}
          className="cursor-pointer bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Continue to render
        </Button>
      </div>
    </div>
  );
}
