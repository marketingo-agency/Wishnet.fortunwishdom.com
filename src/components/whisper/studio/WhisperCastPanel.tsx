"use client";

import { useMemo, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Play, Pause, Mic2 } from 'lucide-react';
import { useWhisperVoicePresets, useElevenLabsVoices } from '@/hooks/useWhisperVoices';
import { usePreviewLine } from '@/hooks/useWhisperPreview';
import type { WhisperScriptSegment } from '@/types/whisper';

interface WhisperCastPanelProps {
  segments: WhisperScriptSegment[];
  onAssign: (speaker: string, voiceId: string) => void;
}

export function WhisperCastPanel({ segments, onAssign }: WhisperCastPanelProps) {
  const { data: presets } = useWhisperVoicePresets();
  const { data: voices } = useElevenLabsVoices(true);
  const preview = usePreviewLine();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);

  // Distinct speakers in first-appearance order, with their current voice + a sample line.
  const speakers = useMemo(() => {
    const map = new Map<string, { voiceId: string | null; sample: string }>();
    for (const s of segments) {
      if (!map.has(s.speaker)) map.set(s.speaker, { voiceId: s.voice_id ?? null, sample: s.text });
    }
    return Array.from(map.entries()).map(([speaker, v]) => ({ speaker, ...v }));
  }, [segments]);

  const handlePreview = async (speaker: string, voiceId: string | null, sample: string) => {
    if (!voiceId) return;
    audioRef.current?.pause();
    if (previewing === speaker) { setPreviewing(null); return; }
    const res = await preview.mutateAsync({ voiceId, text: sample || 'This is a quick voice preview for your podcast.' }).catch(() => null);
    if (!res?.audio) return;
    const audio = new Audio(res.audio);
    audioRef.current = audio;
    audio.onended = () => setPreviewing(null);
    audio.play().then(() => setPreviewing(speaker)).catch(() => setPreviewing(null));
  };

  if (speakers.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Mic2 className="h-4 w-4 text-indigo-500" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cast voices</p>
      </div>
      {speakers.map(({ speaker, voiceId, sample }) => (
        <div key={speaker} className="flex items-center gap-2 rounded-lg border bg-muted/20 p-2">
          <Label className="w-24 shrink-0 truncate text-xs font-medium" title={speaker}>{speaker}</Label>
          <Select value={voiceId ?? ''} onValueChange={(v) => onAssign(speaker, v)}>
            <SelectTrigger className="h-8 flex-1 text-sm"><SelectValue placeholder="Choose a voice" /></SelectTrigger>
            <SelectContent>
              {presets && presets.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-[10px]">Your presets</SelectLabel>
                  {presets.map((p) => <SelectItem key={`p-${p.id}`} value={p.elevenlabs_voice_id} className="text-sm">★ {p.name}</SelectItem>)}
                </SelectGroup>
              )}
              <SelectGroup>
                <SelectLabel className="text-[10px]">Voice library</SelectLabel>
                {(voices ?? []).map((v) => <SelectItem key={v.voice_id} value={v.voice_id} className="text-sm">{v.name}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            type="button" variant="outline" size="icon"
            className="h-8 w-8 shrink-0"
            disabled={!voiceId || (preview.isPending && previewing !== speaker)}
            onClick={() => handlePreview(speaker, voiceId, sample)}
            aria-label={`Preview ${speaker}`}
          >
            {preview.isPending && previewing === null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : previewing === speaker ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
        </div>
      ))}
    </div>
  );
}
