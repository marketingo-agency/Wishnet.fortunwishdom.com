/**
 * Video Studio audio engine (Plan 2 Phase 6a, D-V5).
 *
 * Voiceover lifts whisper-api's PROVEN pattern verbatim: ElevenLabs ttsLine,
 * consecutive same-voice merging (fewer calls, better prosody), concat, size
 * cap, EdgeRuntime.waitUntil with a polled omni_assets row. The ElevenLabs
 * key is SHARED via pulse_connections provider 'elevenlabs' (landmine #9:
 * never a second key path).
 */

import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';

type AdminClient = ReturnType<typeof createClient>;

const ELEVEN_BASE = 'https://api.elevenlabs.io';
const MAX_VO_BYTES = 80_000_000;

export async function getElevenKey(admin: AdminClient): Promise<string | null> {
  const { data } = await admin.from('pulse_connections').select('api_key').eq('provider', 'elevenlabs').maybeSingle();
  const dbKey = ((data as { api_key: string | null } | null)?.api_key ?? '').trim();
  if (dbKey) return dbKey;
  const envKey = (Deno.env.get('ELEVENLABS_API_KEY') ?? '').trim();
  return envKey || null;
}

/** Synthesize one line via ElevenLabs TTS -> mp3 ArrayBuffer (whisper pattern). */
async function ttsLine(key: string, voiceId: string, text: string, modelId: string): Promise<ArrayBuffer> {
  const resp = await fetch(`${ELEVEN_BASE}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: modelId }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`ElevenLabs TTS ${resp.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }
  return resp.arrayBuffer();
}

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
  key: string;
  modelId: string;
}): Promise<void> {
  const { supabaseAdmin, ownerId, runId, assetId, lines, key, modelId } = params;
  try {
    // Merge consecutive same-voice lines into one TTS call.
    const groups: Array<{ voiceId: string; text: string }> = [];
    for (const l of lines) {
      const last = groups[groups.length - 1];
      if (last && last.voiceId === l.voice_id) last.text += '\n' + l.text;
      else groups.push({ voiceId: l.voice_id, text: l.text });
    }

    const buffers: Uint8Array[] = [];
    let words = 0;
    for (const g of groups) {
      const buf = await ttsLine(key, g.voiceId, g.text.slice(0, 5000), modelId);
      buffers.push(new Uint8Array(buf));
      words += g.text.split(/\s+/).filter(Boolean).length;
    }
    const total = buffers.reduce((n, b) => n + b.length, 0);
    if (total > MAX_VO_BYTES) throw new Error('The voiceover exceeds the size limit; shorten the narration.');
    const merged = new Uint8Array(total);
    let off = 0;
    for (const b of buffers) { merged.set(b, off); off += b.length; }

    const storagePath = `${ownerId}/omni-videos/${runId}/${assetId}.mp3`;
    const { error: upErr } = await supabaseAdmin.storage
      .from('omni-video')
      .upload(storagePath, merged, { contentType: 'audio/mpeg', upsert: true });
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
        metadata: { ...meta, byte_size: total, duration_s: duration },
      })
      .eq('id', assetId);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Voiceover render failed';
    console.error('omni-video: voiceover error:', message);
    await supabaseAdmin.from('omni_assets').update({ status: 'failed', error: message }).eq('id', assetId);
  }
}

export interface ElevenVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
}

export async function listVoices(key: string): Promise<ElevenVoice[]> {
  const resp = await fetch(`${ELEVEN_BASE}/v2/voices?page_size=100`, { headers: { 'xi-api-key': key } });
  if (!resp.ok) throw new Error(`ElevenLabs voices ${resp.status}`);
  const data = await resp.json() as { voices?: Array<Record<string, unknown>> };
  return (data.voices ?? []).map((v) => ({
    voice_id: String(v.voice_id ?? ''),
    name: String(v.name ?? 'Unnamed'),
    category: typeof v.category === 'string' ? v.category : undefined,
    labels: (v.labels && typeof v.labels === 'object' ? v.labels : undefined) as Record<string, string> | undefined,
  })).filter((v) => v.voice_id);
}
