/**
 * Video Studio voiceover renderer (Plan 2 D-V5, rebuilt on the shared
 * fal-only TTS seam in the 2026-07-17 rehab). Synthesis runs through
 * _shared/elevenlabs.ts (ElevenLabs-on-fal); this module owns only the
 * omni-video persistence contract: the omni-video bucket path, the 80MB
 * cap, the ~150wpm duration estimate, and the polled omni_assets row flip.
 */

import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { renderLines, type SpeakerLine, type TtsEngine } from '../_shared/elevenlabs.ts';

type AdminClient = ReturnType<typeof createClient>;

const MAX_VO_BYTES = 80_000_000;

export interface VoiceoverLine {
  text: string;
  voice_id: string;
}

/**
 * Render the full voiceover into the omni-video bucket and flip the polled
 * asset row. Runs inside EdgeRuntime.waitUntil (whisper's long-job pattern);
 * the ~150wpm duration estimate rides the row metadata for assembly math.
 */
export async function renderVoiceover(params: {
  supabaseAdmin: AdminClient;
  ownerId: string;
  runId: string;
  assetId: string;
  lines: VoiceoverLine[];
  engine: TtsEngine;
}): Promise<void> {
  const { supabaseAdmin, ownerId, runId, assetId, lines, engine } = params;
  try {
    const { bytes, words } = await renderLines(engine, lines as SpeakerLine[]);
    if (bytes.length > MAX_VO_BYTES) throw new Error('The voiceover exceeds the size limit; shorten the narration.');

    const storagePath = `${ownerId}/omni-videos/${runId}/${assetId}.mp3`;
    const { error: upErr } = await supabaseAdmin.storage
      .from('omni-video')
      .upload(storagePath, bytes, { contentType: 'audio/mpeg', upsert: true });
    if (upErr) throw new Error(upErr.message);

    const duration = Math.max(1, Math.round(words / 2.5)); // ~150 wpm estimate
    const { data: row } = await supabaseAdmin.from('omni_assets').select('metadata').eq('id', assetId).maybeSingle();
    const meta = ((row as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    await supabaseAdmin
      .from('omni_assets')
      .update({
        status: 'done',
        storage_path: storagePath,
        mime_type: 'audio/mpeg',
        metadata: { ...meta, byte_size: bytes.length, duration_s: duration },
      })
      .eq('id', assetId);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Voiceover render failed';
    console.error('omni-video: voiceover error:', message);
    await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', assetId);
  }
}
