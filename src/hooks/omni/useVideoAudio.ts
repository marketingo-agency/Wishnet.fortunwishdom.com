"use client";

/**
 * Video Studio audio + assembly hooks (Plan 2 Phase 6). Voiceover, music,
 * and assembly all run as server-side jobs against polled omni_assets rows
 * (the whisper long-job pattern) — asset ids persist into step_state the
 * moment they exist, so closing the tab never orphans a paid output.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Sentry from '@sentry/nextjs';
import { supabase } from '@/integrations/supabase/client';
import { callOmniVideo } from '@/lib/omniApi';
import { pollVideoAssets } from './useVideoScenes';

const POLL_MS = 3500;
/** Background jobs (assembly chains) can legitimately run for minutes, but a
 *  row stuck 'generating' past this is unrecoverable client-side (CR-W fix:
 *  surface it instead of spinning forever). */
const MAX_POLL_MS = 20 * 60_000;

export interface ElevenVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
}

/** ElevenLabs voice library (key shared via Pulse). A 503 means the key is
 *  not connected — surfaced to the UI as `error`, never retried in a loop. */
export function useElevenVoices(enabled: boolean) {
  return useQuery({
    queryKey: ['omni-eleven-voices'],
    queryFn: async () => {
      const res = await callOmniVideo<{ voices: ElevenVoice[] }>('list-voices');
      return res.voices;
    },
    enabled,
    staleTime: 10 * 60_000,
    retry: false,
  });
}

export type PolledAssetStatus = 'idle' | 'generating' | 'persisting' | 'done' | 'failed';

export interface PolledAssetState {
  status: PolledAssetStatus;
  url?: string;
  thumbUrl?: string;
  durationS?: number | null;
  error?: string;
}

/** Poll one asset row until it reaches a terminal state. Resume-safe: give it
 *  a persisted asset id and it picks up wherever the server got to. */
export function usePolledAsset(assetId: string | null | undefined): PolledAssetState {
  const [state, setState] = useState<PolledAssetState>({ status: assetId ? 'generating' : 'idle' });
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!assetId) {
      trackedRef.current = null;
      setState({ status: 'idle' });
      return;
    }
    if (trackedRef.current === assetId) return;
    trackedRef.current = assetId;
    setState({ status: 'generating' });

    let cancelled = false;
    let errors = 0;
    const startedAt = Date.now();
    const tick = async () => {
      while (!cancelled) {
        if (Date.now() - startedAt > MAX_POLL_MS) {
          if (!cancelled) setState({ status: 'failed', error: 'This job is taking unusually long. Reopen the run later — if it still has not finished, retry it.' });
          return;
        }
        try {
          const [r] = await pollVideoAssets([assetId]);
          errors = 0;
          if (cancelled || trackedRef.current !== assetId) return;
          if (r?.status === 'done') {
            setState({
              status: 'done',
              url: r.url ?? undefined,
              thumbUrl: (r as { thumb_url?: string | null }).thumb_url ?? undefined,
              durationS: r.duration_s ?? null,
            });
            return;
          }
          if (r?.status === 'failed') {
            setState({ status: 'failed', error: r.error ?? 'The job failed' });
            return;
          }
          if (r?.status === 'discarded') {
            setState({ status: 'idle' });
            return;
          }
          setState({ status: r?.status === 'persisting' ? 'persisting' : 'generating' });
        } catch {
          errors += 1;
          if (errors >= 5) {
            if (!cancelled) setState({ status: 'failed', error: 'Lost contact with the server — reopen the run to resume.' });
            return;
          }
        }
        await new Promise((res) => setTimeout(res, POLL_MS));
      }
    };
    void tick();
    return () => { cancelled = true; };
  }, [assetId]);

  return state;
}

export interface VoiceoverLineInput {
  text: string;
  voice_id: string;
}

/** Submit helpers: each returns the created asset id so the caller persists
 *  it immediately (paid outputs persist — project rule). */
export function useVideoAudioActions(runId: string | null) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async <T extends { asset_id: string }>(
    action: string,
    body: Record<string, unknown>,
  ): Promise<string> => {
    if (!runId) throw new Error('No active run');
    setIsSubmitting(true);
    try {
      const res = await callOmniVideo<T>(action, { run_id: runId, ...body });
      return res.asset_id;
    } finally {
      setIsSubmitting(false);
    }
  }, [runId]);

  const renderVoiceover = useCallback(
    (lines: VoiceoverLineInput[]) => submit('voiceover-render', { lines }),
    [submit],
  );

  const generateMusic = useCallback(
    (prompt: string) => submit('music-generate', { prompt }),
    [submit],
  );

  const assemble = useCallback(
    (input: {
      scene_asset_ids: string[];
      timeline_seconds: number;
      voiceover_asset_id?: string;
      music_asset_id?: string;
      resolution: '1080p' | '720p';
      fps?: number;
    }) => submit('assemble-run', { ...input }),
    [submit],
  );

  return { renderVoiceover, generateMusic, assemble, isSubmitting };
}

/** Owner-RLS read-modify-write on an asset's metadata (best-effort). */
export async function patchAssetMetadata(assetId: string, patch: Record<string, unknown>): Promise<boolean> {
  const { data, error: readError } = await supabase
    .from('omni_assets')
    .select('metadata')
    .eq('id', assetId)
    .maybeSingle();
  if (readError || !data) return false;
  const metadata = { ...((data.metadata as Record<string, unknown> | null) ?? {}), ...patch };
  const { error } = await supabase
    .from('omni_assets')
    .update({ metadata: metadata as never })
    .eq('id', assetId);
  if (error) {
    Sentry.captureException(new Error(error.message), { tags: { feature: 'omni-video-asset-meta' } });
    return false;
  }
  return true;
}

/** Mark a draft clip superseded by its hero re-render (Plan 2 Phase 6b).
 *  The draft stays retrievable in History; assembly simply prefers the hero. */
export async function markSuperseded(draftAssetId: string, heroAssetId: string): Promise<void> {
  await patchAssetMetadata(draftAssetId, { superseded_by: heroAssetId });
}
