/**
 * Shared ElevenLabs engine (Plan 3 D-A2): the ONE code path for TTS across
 * omni functions. Lifted from whisper-api's proven ttsLine/merge/concat
 * pattern and omni-video/audio.ts (which keeps a local copy until its next
 * redeploy - noted in the EXECUTION_LOG; new consumers import THIS module).
 *
 * Landmine #5: 5000 chars/call cap; eleven_v3 is account-dependent
 * (multilingual_v2 default); naive MP3 concat is valid ONLY when every chunk
 * renders with the IDENTICAL output_format; ONE key path (pulse_connections
 * provider 'elevenlabs' -> env fallback).
 */

import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';

type AdminClient = ReturnType<typeof createClient>;

const ELEVEN_BASE = 'https://api.elevenlabs.io';
/** Every render in a concat chain MUST use this exact format (landmine #5). */
export const ELEVEN_OUTPUT_FORMAT = 'mp3_44100_128';
export const ELEVEN_DEFAULT_MODEL = 'eleven_multilingual_v2';
export const ELEVEN_CHAR_CAP = 5000;

export async function getElevenKey(admin: AdminClient): Promise<string | null> {
  const { data } = await admin.from('pulse_connections').select('api_key').eq('provider', 'elevenlabs').maybeSingle();
  const dbKey = ((data as { api_key: string | null } | null)?.api_key ?? '').trim();
  if (dbKey) return dbKey;
  const envKey = (Deno.env.get('ELEVENLABS_API_KEY') ?? '').trim();
  return envKey || null;
}

export interface ElevenVoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speed?: number;
}

/** Synthesize one line -> mp3 ArrayBuffer (the whisper pattern verbatim). */
export async function ttsLine(
  key: string,
  voiceId: string,
  text: string,
  modelId: string = ELEVEN_DEFAULT_MODEL,
  settings?: ElevenVoiceSettings,
): Promise<ArrayBuffer> {
  const resp = await fetch(`${ELEVEN_BASE}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${ELEVEN_OUTPUT_FORMAT}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: text.slice(0, ELEVEN_CHAR_CAP),
      model_id: modelId,
      ...(settings && Object.keys(settings).length > 0 ? { voice_settings: settings } : {}),
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`ElevenLabs TTS ${resp.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }
  return resp.arrayBuffer();
}

export interface SpeakerLine {
  text: string;
  voice_id: string;
  settings?: ElevenVoiceSettings;
}

/** Merge consecutive same-voice lines into fewer TTS calls (better prosody). */
export function mergeConsecutiveLines(lines: SpeakerLine[]): SpeakerLine[] {
  const groups: SpeakerLine[] = [];
  for (const l of lines) {
    const last = groups[groups.length - 1];
    if (last && last.voice_id === l.voice_id) last.text += '\n' + l.text;
    else groups.push({ ...l });
  }
  return groups;
}

/** Render a line group to ONE MP3 buffer (chunked at the 5000-char cap so a
 *  long merged group never silently truncates). Same-format concat is valid. */
export async function renderLines(
  key: string,
  lines: SpeakerLine[],
  modelId: string = ELEVEN_DEFAULT_MODEL,
): Promise<{ bytes: Uint8Array; words: number }> {
  const buffers: Uint8Array[] = [];
  let words = 0;
  for (const group of mergeConsecutiveLines(lines)) {
    for (let i = 0; i < group.text.length; i += ELEVEN_CHAR_CAP) {
      const piece = group.text.slice(i, i + ELEVEN_CHAR_CAP);
      const buf = await ttsLine(key, group.voice_id, piece, modelId, group.settings);
      buffers.push(new Uint8Array(buf));
    }
    words += group.text.split(/\s+/).filter(Boolean).length;
  }
  const total = buffers.reduce((n, b) => n + b.length, 0);
  const merged = new Uint8Array(total);
  let off = 0;
  for (const b of buffers) { merged.set(b, off); off += b.length; }
  return { bytes: merged, words };
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

/** One short line -> base64 data URL (the whisper preview pattern). */
export async function previewLine(
  key: string,
  voiceId: string,
  text: string,
  modelId: string = ELEVEN_DEFAULT_MODEL,
  settings?: ElevenVoiceSettings,
): Promise<string> {
  const buf = await ttsLine(key, voiceId, text.slice(0, 300), modelId, settings);
  const bytes = new Uint8Array(buf);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:audio/mpeg;base64,${btoa(binary)}`;
}
