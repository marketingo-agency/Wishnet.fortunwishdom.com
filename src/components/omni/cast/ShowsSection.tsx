"use client";

/**
 * ShowsSection: minimal show registry + per-show default cast editor
 * (speaker label -> persona). Full show management (artwork, feed config,
 * publishing) lands with Publish & Feed in Phase 9.
 */

import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { castFromJson, useCreateShow, usePodcastShows, useUpdateShow, type PodcastShow } from '@/hooks/omni/usePodcastShows';
import type { OmniPersona } from '@/hooks/omni/usePersonas';

interface ShowsSectionProps {
  personas: OmniPersona[];
}

function ShowCastEditor({ show, personas }: { show: PodcastShow; personas: OmniPersona[] }) {
  const [cast, setCast] = useState(() => Object.entries(castFromJson(show.default_cast)));
  const [newLabel, setNewLabel] = useState('');
  const updateShow = useUpdateShow();

  const setEntry = (index: number, label: string, personaId: string) => {
    setCast((prev) => prev.map((row, i) => (i === index ? [label, personaId] as [string, string] : row)));
  };

  const save = () => {
    const map: Record<string, string> = {};
    for (const [label, personaId] of cast) {
      const key = label.trim().toUpperCase();
      if (key && personaId) map[key] = personaId;
    }
    updateShow.mutate({ id: show.id, default_cast: map });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{show.name}</h3>
          <p className="truncate text-[11px] text-muted-foreground">/{show.slug}</p>
        </div>
        <Button size="sm" variant="outline" onClick={save} disabled={updateShow.isPending} className="cursor-pointer shrink-0">
          {updateShow.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Save cast
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {cast.length === 0 && (
          <p className="text-xs text-muted-foreground">No default cast yet. Add speaker labels below.</p>
        )}
        {cast.map(([label, personaId], index) => (
          <div key={`${label}-${index}`} className="flex items-center gap-2">
            <Input
              value={label}
              onChange={(e) => setEntry(index, e.target.value, personaId)}
              className="w-28 uppercase"
              aria-label="Speaker label"
            />
            <Select value={personaId} onValueChange={(v) => setEntry(index, label, v)}>
              <SelectTrigger className="flex-1" aria-label={`Persona for ${label || 'this speaker'}`}>
                <SelectValue placeholder="Pick a persona" />
              </SelectTrigger>
              <SelectContent>
                {personas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCast((prev) => prev.filter((_, i) => i !== index))}
              aria-label={`Remove speaker ${label || 'row'}`}
              className="cursor-pointer text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="HOST"
            className="w-28 uppercase"
            aria-label="New speaker label"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!newLabel.trim()}
            onClick={() => {
              setCast((prev) => [...prev, [newLabel.trim().toUpperCase(), '']]);
              setNewLabel('');
            }}
            className="cursor-pointer gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add speaker
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ShowsSection({ personas }: ShowsSectionProps) {
  const { data: shows = [], isLoading } = usePodcastShows();
  const createShow = useCreateShow();
  const [newShowName, setNewShowName] = useState('');

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold">Shows &amp; default casts</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Each show can preassign personas to speaker labels; the podcast wizards start from this cast.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <Input
          value={newShowName}
          onChange={(e) => setNewShowName(e.target.value)}
          placeholder="New show name…"
          className="max-w-xs"
          aria-label="New show name"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={!newShowName.trim() || createShow.isPending}
          onClick={() => {
            createShow.mutate({ name: newShowName });
            setNewShowName('');
          }}
          className="cursor-pointer gap-1"
        >
          {createShow.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Create show
        </Button>
      </div>

      <div className="mt-3 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center rounded-xl border border-border py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {!isLoading && shows.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            No shows yet. A show groups episodes and later carries its own RSS feed.
          </p>
        )}
        {shows.map((show) => (
          <ShowCastEditor key={show.id} show={show} personas={personas} />
        ))}
      </div>
    </section>
  );
}
