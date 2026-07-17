"use client";

/**
 * Animate stage 3: generate & review (Plan 2 Phase 9).
 * Motion: one video-submit on Seedance reference-to-video (refs signed
 * server-side from Wishpedia IDs). Talk: the 3-hop chain reuses EXISTING
 * actions — voiceover-render (ElevenLabs) → video-submit on Kling AI Avatar
 * with audio_asset_id. GEN-01: failures retry; paid ids persist at submit.
 */

import { useState } from 'react';
import { Loader2, Play, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { callOmniVideo } from '@/lib/omniApi';
import { usePolledAsset, useVideoAudioActions } from '@/hooks/omni/useVideoAudio';
import type { OmniImagesState } from '@/hooks/omni';

const MOTION_MODEL = 'bytedance/seedance-2.0/reference-to-video';
const AVATAR_MODEL = 'fal-ai/kling-video/ai-avatar/v2/pro';

interface ANGenerateProps {
  runId: string;
  state: OmniImagesState;
  chosenClipId?: string;
  onVoStarted: (assetId: string) => void;
  onClipStarted: (assetId: string) => void;
  onNext: () => void;
}

export function ANGenerate({ runId, state, chosenClipId, onVoStarted, onClipStarted, onNext }: ANGenerateProps) {
  const actions = useVideoAudioActions(runId);
  const vo = usePolledAsset(state.animate_vo_asset_id);
  const clip = usePolledAsset(chosenClipId);
  const [submitting, setSubmitting] = useState(false);

  const refs = state.animate_refs ?? [];
  const isTalk = state.animate_path === 'talk';
  const voBusy = vo.status === 'generating' || vo.status === 'persisting';
  const clipBusy = clip.status === 'generating' || clip.status === 'persisting';

  const startVoice = async () => {
    if (!state.animate_script || !state.animate_voice_id) return;
    try {
      const assetId = await actions.renderVoiceover([{ text: state.animate_script, voice_id: state.animate_voice_id }]);
      onVoStarted(assetId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Voice synthesis could not be started');
    }
  };

  const startClip = async () => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = isTalk
        ? {
          run_id: runId,
          model_id: AVATAR_MODEL,
          prompt: '.',
          prompt_provenance: 'promptor',
          tier: 'hero',
          wishpedia_image_ids: [refs[0]?.wishpedia_image_id].filter(Boolean),
          audio_asset_id: state.animate_vo_asset_id,
        }
        : {
          run_id: runId,
          model_id: MOTION_MODEL,
          prompt: state.animate_prompt,
          prompt_provenance: 'raw',
          tier: 'hero',
          wishpedia_image_ids: refs.map((r) => r.wishpedia_image_id),
          params: { duration: 8, aspect: '9:16', resolution: '1080p' },
        };
      const res = await callOmniVideo<{ asset_id: string }>('video-submit', body);
      onClipStarted(res.asset_id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation could not be started');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {refs.slice(0, 9).map((r) => (
          <img key={r.wishpedia_image_id} src={r.url} alt={r.label} loading="lazy" className="h-14 w-14 rounded-lg border border-border object-cover" />
        ))}
      </div>

      {isTalk && (
        <section className="space-y-2 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold">1 · Brand voice</p>
            <Button
              size="sm"
              onClick={() => void startVoice()}
              disabled={voBusy || actions.isSubmitting}
              className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
            >
              {voBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : vo.status === 'done' ? <RefreshCw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {voBusy ? 'Synthesizing…' : vo.status === 'done' ? 'Re-synthesize' : 'Synthesize the voice'}
            </Button>
          </div>
          {vo.status === 'done' && vo.url && <audio src={vo.url} controls className="w-full" aria-label="Synthesized voice" />}
          {vo.status === 'failed' && (
            <p className="flex items-start gap-1.5 text-xs text-destructive" role="alert"><XCircle className="mt-px h-3.5 w-3.5 shrink-0" /> {vo.error}</p>
          )}
        </section>
      )}

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold">{isTalk ? '2 · Talking clip (Kling AI Avatar)' : 'Motion clip (Seedance, character-anchored)'}</p>
          <Button
            size="sm"
            onClick={() => void startClip()}
            disabled={submitting || clipBusy || (isTalk && vo.status !== 'done')}
            className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
          >
            {submitting || clipBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : clip.status === 'done' ? <RefreshCw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {clipBusy ? 'Rendering…' : clip.status === 'done' ? 'Re-generate' : 'Generate the clip'}
          </Button>
        </div>
        {isTalk && vo.status !== 'done' && (
          <p className="text-[11px] text-muted-foreground">The voice must land first — the audio drives the clip length.</p>
        )}
        {clipBusy && (
          <p className="text-[11px] text-muted-foreground" aria-live="polite">Rendering — closing the tab is safe; the finisher completes it server-side.</p>
        )}
        {clip.status === 'failed' && (
          <p className="flex items-start gap-1.5 text-xs text-destructive" role="alert"><XCircle className="mt-px h-3.5 w-3.5 shrink-0" /> {clip.error}</p>
        )}
        {clip.status === 'done' && clip.url && (
          <video src={clip.url} controls preload="metadata" className="max-h-[420px] w-full rounded-lg border border-border object-contain" aria-label="Animated clip" />
        )}
      </section>

      <div className="flex items-center justify-end gap-3">
        <p className="text-[11px] text-muted-foreground">
          {clip.status === 'done' ? 'Looks right? Character fidelity gets a human sign-off at delivery.' : 'Generate the clip, then continue.'}
        </p>
        <Button
          size="sm"
          onClick={onNext}
          disabled={clip.status !== 'done'}
          className="h-8 cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
        >
          Continue to Formats
        </Button>
      </div>
    </div>
  );
}
