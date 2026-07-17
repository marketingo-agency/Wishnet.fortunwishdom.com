"use client";

/**
 * Video Studio stage 4: voiceover + music (Plan 2 Phase 6a, D-V5).
 * Narration is editable per scene, voiced through the shared fal-only TTS
 * seam (ElevenLabs voices on fal), rendered server-side against a polled
 * asset row.
 * Music is a lyria2 bed with the D-V5 "quiet ambient" guidance (there is no
 * ducking — merge-audio-video has no volume knob, Phase-0 verdict).
 * Both are OPTIONAL: a silent film may proceed.
 */

import { useEffect, useState } from 'react';
import { AudioLines, Loader2, Mic, Music, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useElevenVoices, usePolledAsset, useVideoAudioActions } from '@/hooks/omni/useVideoAudio';
import type { OmniVideoScenario } from '@/hooks/omni';

const DEFAULT_MUSIC_PROMPT =
  'quiet ambient instrumental bed, soft pads, calm, minimal, background music, no vocals';

interface VSAudioProps {
  runId: string;
  scenario: OmniVideoScenario;
  /** The picked engine renders audio WITH the video (2026-07-17 rehab):
   *  this stage then becomes an optional enhancement, not a requirement. */
  engineNativeAudio: boolean;
  voiceoverAssetId?: string;
  voiceId?: string;
  musicAssetId?: string;
  musicPrompt?: string;
  onNarrationChange: (sceneIdx: number, narration: string) => void;
  onVoiceoverStarted: (assetId: string, voiceId: string) => void;
  onMusicStarted: (assetId: string, prompt: string) => void;
  onNext: () => void;
}

export function VSAudio({
  runId: _runId, scenario, engineNativeAudio, voiceoverAssetId, voiceId, musicAssetId, musicPrompt,
  onNarrationChange, onVoiceoverStarted, onMusicStarted, onNext,
}: VSAudioProps) {
  const [selectedVoice, setSelectedVoice] = useState(voiceId ?? '');
  const [musicText, setMusicText] = useState(musicPrompt ?? DEFAULT_MUSIC_PROMPT);
  const voices = useElevenVoices(true);
  // Preset-voice membership guard: a voice id persisted before the fal-only
  // switch (or a removed preset) silently clears so the user re-picks.
  useEffect(() => {
    if (!selectedVoice || !voices.data?.length) return;
    if (!voices.data.some((v) => v.voice_id === selectedVoice)) setSelectedVoice('');
  }, [voices.data, selectedVoice]);
  const actions = useVideoAudioActions(_runId);
  const vo = usePolledAsset(voiceoverAssetId);
  const music = usePolledAsset(musicAssetId);

  const narratedScenes = scenario.scenes.filter((s) => s.narration.trim().length > 0);
  const voBusy = vo.status === 'generating' || vo.status === 'persisting';
  const musicBusy = music.status === 'generating' || music.status === 'persisting';

  const startVoiceover = async () => {
    if (!selectedVoice) {
      toast.error('Pick a voice first.');
      return;
    }
    if (narratedScenes.length === 0) {
      toast.error('Write narration for at least one scene, or skip the voiceover.');
      return;
    }
    try {
      const assetId = await actions.renderVoiceover(
        narratedScenes.map((s) => ({ text: s.narration.trim(), voice_id: selectedVoice })),
      );
      onVoiceoverStarted(assetId, selectedVoice);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Voiceover could not be started');
    }
  };

  const startMusic = async () => {
    try {
      const assetId = await actions.generateMusic(musicText.trim() || DEFAULT_MUSIC_PROMPT);
      onMusicStarted(assetId, musicText.trim() || DEFAULT_MUSIC_PROMPT);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Music could not be started');
    }
  };

  return (
    <div className="space-y-6">
      {engineNativeAudio && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 [[data-omni-theme=dark]_&]:text-emerald-300" role="status">
          Your engine renders native audio WITH each scene — you can skip this stage entirely.
          Adding a voiceover or music replaces the scenes&apos; own soundtrack in the assembled film.
        </p>
      )}
      {/* Narration script */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold">Narration script</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          One block per scene, spoken in order. Leave a scene empty to keep it narration-free.
          The narration renders as ONE continuous track laid over the film from the start — it is
          not aligned to scene boundaries, so keep each block roughly as long as its scene.
        </p>
        <div className="space-y-2">
          {scenario.scenes.map((scene) => (
            <div key={scene.idx} className="rounded-lg border border-border bg-card p-3">
              <label htmlFor={`vs-narration-${scene.idx}`} className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                Scene {scene.idx} · {scene.duration_s}s
              </label>
              <Textarea
                id={`vs-narration-${scene.idx}`}
                value={scene.narration}
                onChange={(e) => onNarrationChange(scene.idx, e.target.value)}
                disabled={voBusy}
                rows={2}
                className="min-h-[52px] resize-y text-sm"
                placeholder="No narration for this scene"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Voiceover */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AudioLines className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold">Voiceover</h2>
            <span className="text-[11px] text-muted-foreground">(optional)</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedVoice} onValueChange={setSelectedVoice} disabled={voBusy || !voices.data?.length}>
              <SelectTrigger className="h-8 w-full cursor-pointer text-xs sm:w-52" aria-label="Voice">
                <SelectValue placeholder={voices.isLoading ? 'Loading voices…' : 'Pick a voice'} />
              </SelectTrigger>
              <SelectContent>
                {(voices.data ?? []).map((v) => (
                  <SelectItem key={v.voice_id} value={v.voice_id} className="cursor-pointer text-xs">
                    {v.name}{v.labels?.accent ? ` · ${v.labels.accent}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => void startVoiceover()}
              disabled={voBusy || actions.isSubmitting || !selectedVoice || narratedScenes.length === 0}
              className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
            >
              {voBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : vo.status === 'done' ? <RefreshCw className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {voBusy ? 'Rendering…' : vo.status === 'done' ? 'Re-render' : 'Render voiceover'}
            </Button>
          </div>
        </div>
        {voices.isError && (
          <p className="text-xs text-amber-700 [[data-omni-theme=dark]_&]:text-amber-400" role="status">
            {voices.error instanceof Error ? voices.error.message : 'Voices are unavailable.'}
          </p>
        )}
        {vo.status === 'done' && vo.url && (
          <div className="space-y-1.5">
            <audio src={vo.url} controls className="w-full" aria-label="Rendered voiceover" />
            {typeof vo.durationS === 'number' && (
              <p className="text-[11px] text-muted-foreground">≈{vo.durationS}s narration</p>
            )}
          </div>
        )}
        {vo.status === 'failed' && (
          <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
            <XCircle className="h-3.5 w-3.5 shrink-0" /> {vo.error}
          </p>
        )}
        {voBusy && (
          <p className="text-[11px] text-muted-foreground" aria-live="polite">
            {vo.status === 'persisting' ? 'Saving…' : 'Synthesizing — closing the tab is safe, the render continues server-side.'}
          </p>
        )}
      </section>

      {/* Music bed */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold">Music bed</h2>
            <span className="text-[11px] text-muted-foreground">(optional)</span>
          </div>
          <Button
            size="sm"
            onClick={() => void startMusic()}
            disabled={musicBusy || actions.isSubmitting}
            className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
          >
            {musicBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : music.status === 'done' ? <RefreshCw className="h-3.5 w-3.5" /> : <Music className="h-3.5 w-3.5" />}
            {musicBusy ? 'Composing…' : music.status === 'done' ? 'Re-generate' : 'Generate music'}
          </Button>
        </div>
        <Textarea
          value={musicText}
          onChange={(e) => setMusicText(e.target.value)}
          disabled={musicBusy}
          rows={2}
          className="min-h-[52px] resize-y text-sm"
          aria-label="Music description"
        />
        <p className="text-[11px] text-muted-foreground">
          There is no volume mixing between narration and music — keep the bed quiet and ambient so the voice stays legible.
        </p>
        {music.status === 'done' && music.url && (
          <audio src={music.url} controls className="w-full" aria-label="Generated music bed" />
        )}
        {music.status === 'failed' && (
          <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
            <XCircle className="h-3.5 w-3.5 shrink-0" /> {music.error}
          </p>
        )}
        {musicBusy && (
          <p className="text-[11px] text-muted-foreground" aria-live="polite">
            {music.status === 'persisting' ? 'Saving…' : 'Composing — closing the tab is safe, the render continues server-side.'}
          </p>
        )}
      </section>

      <div className="flex items-center justify-end gap-3">
        <p className={cn('text-[11px] text-muted-foreground', (voBusy || musicBusy) && 'text-amber-700 [[data-omni-theme=dark]_&]:text-amber-400')}>
          {voBusy || musicBusy
            ? 'Audio is still rendering — you can continue; assembly will wait for it.'
            : vo.status === 'done' || music.status === 'done'
              ? 'Audio ready — it replaces the scenes’ native soundtrack at assembly.'
              : engineNativeAudio
                ? 'No added audio — the film keeps its native scene audio.'
                : 'No audio yet — this engine renders silent scenes, so continuing makes a silent film.'}
        </p>
        <Button
          size="sm"
          onClick={onNext}
          className="h-8 cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
        >
          Continue to Assembly
        </Button>
      </div>
    </div>
  );
}
