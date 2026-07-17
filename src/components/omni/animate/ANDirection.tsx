"use client";

/**
 * Animate stage 2: motion or talk (Plan 2 Phase 9).
 * Motion = Seedance reference-to-video (refs addressed as @Image1..N).
 * Talk = script → ElevenLabs brand voice → Kling AI Avatar v2 Pro
 * (the audio drives the clip length; lipsync tiers stay honest about price).
 */

import { useState } from 'react';
import { MessageSquareText, Move3d } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useElevenVoices } from '@/hooks/omni/useVideoAudio';
import type { OmniImagesState } from '@/hooks/omni';

interface ANDirectionProps {
  state: OmniImagesState;
  onMotion: (prompt: string) => void;
  onTalk: (script: string, voiceId: string) => void;
}

export function ANDirection({ state, onMotion, onTalk }: ANDirectionProps) {
  const [path, setPath] = useState<'motion' | 'talk'>(state.animate_path ?? 'motion');
  const [prompt, setPrompt] = useState(state.animate_prompt ?? '');
  const [script, setScript] = useState(state.animate_script ?? '');
  const [voiceId, setVoiceId] = useState(state.animate_voice_id ?? '');
  const voices = useElevenVoices(path === 'talk');
  const refCount = (state.animate_refs ?? []).length;

  const submit = () => {
    if (path === 'motion') {
      if (!prompt.trim()) {
        toast.error('Describe the motion first.');
        return;
      }
      onMotion(prompt.trim());
      return;
    }
    if (!script.trim()) {
      toast.error('Write the script first.');
      return;
    }
    if (!voiceId) {
      toast.error('Pick a brand voice first.');
      return;
    }
    onTalk(script.trim(), voiceId);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Direction">
        <button
          onClick={() => setPath('motion')}
          aria-pressed={path === 'motion'}
          className={cn(
            'cursor-pointer rounded-xl border p-4 text-left transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            path === 'motion' ? 'border-violet-500/60 bg-violet-500/10' : 'border-border hover:border-violet-500/40',
          )}
        >
          <Move3d className="mb-1.5 h-4 w-4 text-violet-400" aria-hidden />
          <p className="text-xs font-semibold">Motion</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Animate the character with a scene prompt (Seedance, {refCount} ref{refCount === 1 ? '' : 's'}, unit-priced — verify).</p>
        </button>
        <button
          onClick={() => setPath('talk')}
          aria-pressed={path === 'talk'}
          className={cn(
            'cursor-pointer rounded-xl border p-4 text-left transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            path === 'talk' ? 'border-violet-500/60 bg-violet-500/10' : 'border-border hover:border-violet-500/40',
          )}
        >
          <MessageSquareText className="mb-1.5 h-4 w-4 text-violet-400" aria-hidden />
          <p className="text-xs font-semibold">Talk</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Script → ElevenLabs voice → talking character (Kling AI Avatar, works on stylized characters).</p>
        </button>
      </div>

      {path === 'motion' ? (
        <div className="space-y-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="What does the character do? Reference the images as @Image1, @Image2…"
            className="min-h-[76px] resize-y text-sm"
            aria-label="Motion prompt"
          />
          <p className="text-[11px] text-muted-foreground">The references anchor the character's look; describe setting, action, and camera.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={3}
            placeholder="What does the character say?"
            className="min-h-[76px] resize-y text-sm"
            aria-label="Script"
          />
          <Select value={voiceId} onValueChange={setVoiceId} disabled={!voices.data?.length}>
            <SelectTrigger className="h-9 w-64 cursor-pointer text-xs" aria-label="Brand voice">
              <SelectValue placeholder={voices.isLoading ? 'Loading voices…' : voices.isError ? 'ElevenLabs unavailable' : 'Pick a brand voice'} />
            </SelectTrigger>
            <SelectContent>
              {(voices.data ?? []).map((v) => (
                <SelectItem key={v.voice_id} value={v.voice_id} className="cursor-pointer text-xs">
                  {v.name}{v.labels?.accent ? ` · ${v.labels.accent}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {voices.isError && (
            <p className="text-[11px] text-amber-700 [[data-omni-theme=dark]_&]:text-amber-400" role="status">
              {voices.error instanceof Error ? voices.error.message : 'ElevenLabs voices are unavailable.'}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">Only the FIRST reference image drives the avatar; the audio sets the clip length.</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={submit}
          className="h-8 cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
        >
          Continue to Generate
        </Button>
      </div>
    </div>
  );
}
