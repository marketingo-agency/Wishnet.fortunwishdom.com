"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Play, Pause, Plus, Trash2, AudioLines, Star } from 'lucide-react';
import {
  useElevenLabsVoices,
  useWhisperVoicePresets,
  useSaveWhisperVoice,
  useDeleteWhisperVoice,
} from '@/hooks/useWhisperVoices';

export function WhisperVoicesTab() {
  const { data: voices, isLoading, isError, error } = useElevenLabsVoices(true);
  const { data: presets } = useWhisperVoicePresets();
  const savePreset = useSaveWhisperVoice();
  const deletePreset = useDeleteWhisperVoice();

  const [search, setSearch] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const preview = (id: string, url?: string) => {
    if (!url) return;
    audioRef.current?.pause();
    if (playing === id) { setPlaying(null); return; }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlaying(null);
    audio.play().then(() => setPlaying(id)).catch(() => setPlaying(null));
  };

  const savedIds = useMemo(() => new Set((presets ?? []).map((p) => p.elevenlabs_voice_id)), [presets]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (voices ?? []).filter((v) => !q || v.name.toLowerCase().includes(q) || (v.category ?? '').toLowerCase().includes(q));
  }, [voices, search]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Saved presets */}
      {presets && presets.length > 0 && (
        <section className="space-y-2">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><Star className="h-3.5 w-3.5" /> Your casting presets</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-full border bg-muted/40 py-1 pl-3 pr-1.5">
                <span className="text-xs font-medium">{p.name}</span>
                {p.preview_url && (
                  <button type="button" onClick={() => preview(`preset-${p.id}`, p.preview_url ?? undefined)} aria-label={`Preview ${p.name}`} className="text-muted-foreground hover:text-foreground cursor-pointer">
                    {playing === `preset-${p.id}` ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                )}
                <button type="button" onClick={() => deletePreset.mutate(p.id)} aria-label={`Remove ${p.name}`} className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Library */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Voice library</p>
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search voices…" className="h-9 pl-8 text-sm" />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {error instanceof Error && /key/i.test(error.message) ? 'Add your ElevenLabs key in Settings to load the voice library.' : 'Could not load voices. Check the ElevenLabs connection in Settings.'}
          </p>
        ) : filtered.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v) => {
              const saved = savedIds.has(v.voice_id);
              return (
                <div key={v.voice_id} className="flex flex-col gap-2 rounded-xl border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{v.name}</p>
                      {v.category && <p className="text-[10px] capitalize text-muted-foreground">{v.category.replace(/_/g, ' ')}</p>}
                    </div>
                    {v.labels?.gender && <Badge variant="outline" className="shrink-0 text-[9px] capitalize">{v.labels.gender}</Badge>}
                  </div>
                  <div className="mt-auto flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => preview(v.voice_id, v.preview_url)} disabled={!v.preview_url} className="h-7 flex-1 gap-1.5 text-xs">
                      {playing === v.voice_id ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} Preview
                    </Button>
                    <Button
                      variant={saved ? 'ghost' : 'default'}
                      size="sm"
                      disabled={saved || savePreset.isPending}
                      onClick={() => savePreset.mutate({ name: v.name, elevenlabs_voice_id: v.voice_id, preview_url: v.preview_url ?? null })}
                      className="h-7 gap-1.5 text-xs"
                    >
                      {saved ? <Star className="h-3.5 w-3.5 fill-current" /> : <Plus className="h-3.5 w-3.5" />}
                      {saved ? 'Saved' : 'Save'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <AudioLines className="h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No voices match your search.</p>
          </div>
        )}
      </section>
    </div>
  );
}
