/**
 * Shared TTS engine (Plan 3 D-A2, fal-only since the 2026-07-17 rehab):
 * the ONE code path for text-to-speech across omni functions.
 *
 * ALL synthesis runs through ElevenLabs' partner endpoints ON FAL using the
 * app's fal key (fal-ai/elevenlabs/tts/multilingual-v2, $0.10/1k chars,
 * synchronous fal.run). The direct ElevenLabs API integration was removed
 * app-wide (Sam's call): no xi-api-key, no pulse_connections key, no account
 * voice library - voices are the curated FAL_PRESET_VOICES set (names).
 *
 * Landmine #5 still applies: 5000 chars/call cap; naive MP3 concat is valid
 * ONLY because every chunk renders with the IDENTICAL output format
 * (mp3_44100_128, the fal endpoint default).
 */

import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';

type AdminClient = ReturnType<typeof createClient>;

/** Every render in a concat chain MUST use this exact format (landmine #5). */
export const ELEVEN_OUTPUT_FORMAT = 'mp3_44100_128';
/** Vestigial model id kept for caller compatibility - the fal transport pins
 *  FAL_TTS_MODEL and ignores this value. */
export const ELEVEN_DEFAULT_MODEL = 'eleven_multilingual_v2';
export const ELEVEN_CHAR_CAP = 5000;
/** The fal-hosted ElevenLabs TTS endpoint (multilingual v2). */
export const FAL_TTS_MODEL = 'fal-ai/elevenlabs/tts/multilingual-v2';

export interface TtsEngine {
  kind: 'fal';
  key: string;
}

/**
 * Resolve the TTS transport: the app's fal key (llm_settings -> env), or null
 * when no fal key exists (callers 503 honestly).
 */
export async function resolveTtsEngine(admin: AdminClient): Promise<TtsEngine | null> {
  const { data, error } = await admin.from('llm_settings').select('fal_api_key').single();
  if (error) console.error('tts: llm_settings read error:', error.message);
  const falKey = (((data as { fal_api_key?: string | null } | null)?.fal_api_key) || Deno.env.get('FAL_KEY') || '').trim();
  if (falKey) return { kind: 'fal', key: falKey };
  return null;
}

export interface ElevenVoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speed?: number;
}

/** fal-routed synthesis of one line via the SYNCHRONOUS fal.run endpoint. */
async function falTtsLine(
  key: string,
  voice: string,
  text: string,
  settings?: ElevenVoiceSettings,
): Promise<ArrayBuffer> {
  const resp = await fetch(`https://fal.run/${FAL_TTS_MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: text.slice(0, ELEVEN_CHAR_CAP),
      voice: voice || 'Rachel',
      ...(settings?.stability !== undefined ? { stability: settings.stability } : {}),
      ...(settings?.similarity_boost !== undefined ? { similarity_boost: settings.similarity_boost } : {}),
      ...(settings?.style !== undefined ? { style: settings.style } : {}),
      ...(settings?.speed !== undefined ? { speed: settings.speed } : {}),
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`ElevenLabs-via-fal TTS ${resp.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }
  const data = await resp.json() as { audio?: { url?: string } };
  const url = data.audio?.url;
  if (!url) throw new Error('ElevenLabs-via-fal returned no audio output');
  const host = new URL(url).hostname;
  if (host !== 'fal.media' && !host.endsWith('.fal.media')) {
    throw new Error(`Unexpected fal media host: ${host}`);
  }
  const audio = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!audio.ok) throw new Error(`fal audio download failed (${audio.status})`);
  return audio.arrayBuffer();
}

/** Synthesize one line -> mp3 ArrayBuffer through the resolved engine.
 *  `modelId` is accepted for caller compatibility and ignored (fal pins
 *  FAL_TTS_MODEL). */
export async function ttsLine(
  engine: TtsEngine,
  voiceId: string,
  text: string,
  _modelId: string = ELEVEN_DEFAULT_MODEL,
  settings?: ElevenVoiceSettings,
): Promise<ArrayBuffer> {
  return falTtsLine(engine.key, voiceId, text, settings);
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
  engine: TtsEngine,
  lines: SpeakerLine[],
  modelId: string = ELEVEN_DEFAULT_MODEL,
): Promise<{ bytes: Uint8Array; words: number }> {
  const buffers: Uint8Array[] = [];
  let words = 0;
  for (const group of mergeConsecutiveLines(lines)) {
    for (let i = 0; i < group.text.length; i += ELEVEN_CHAR_CAP) {
      const piece = group.text.slice(i, i + ELEVEN_CHAR_CAP);
      const buf = await ttsLine(engine, group.voice_id, piece, modelId, group.settings);
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

/** fal's ElevenLabs endpoints take preset voice NAMES (schema default
 *  "Rachel"); there is no list endpoint, so this is the curated known-good
 *  set of ElevenLabs premade voices exposed through fal. voice_id === name. */
export const FAL_PRESET_VOICES: ElevenVoice[] = [
  { voice_id: 'Rachel', name: 'Rachel', category: 'female · calm narration' },
  { voice_id: 'Aria', name: 'Aria', category: 'female · expressive' },
  { voice_id: 'Sarah', name: 'Sarah', category: 'female · soft news' },
  { voice_id: 'Charlotte', name: 'Charlotte', category: 'female · warm' },
  { voice_id: 'Alice', name: 'Alice', category: 'female · confident british' },
  { voice_id: 'Matilda', name: 'Matilda', category: 'female · friendly' },
  { voice_id: 'Jessica', name: 'Jessica', category: 'female · playful' },
  { voice_id: 'Lily', name: 'Lily', category: 'female · velvety british' },
  { voice_id: 'Adam', name: 'Adam', category: 'male · deep narration' },
  { voice_id: 'Brian', name: 'Brian', category: 'male · deep resonant' },
  { voice_id: 'Daniel', name: 'Daniel', category: 'male · authoritative british' },
  { voice_id: 'George', name: 'George', category: 'male · warm british' },
  { voice_id: 'Callum', name: 'Callum', category: 'male · intense' },
  { voice_id: 'Liam', name: 'Liam', category: 'male · articulate' },
  { voice_id: 'Chris', name: 'Chris', category: 'male · casual' },
  { voice_id: 'Charlie', name: 'Charlie', category: 'male · natural australian' },
  { voice_id: 'Bill', name: 'Bill', category: 'male · trustworthy documentary' },
  { voice_id: 'Eric', name: 'Eric', category: 'male · friendly' },
];

/** List voices: the curated fal preset set (fal has no list endpoint). */
export async function listVoices(_engine: TtsEngine): Promise<ElevenVoice[]> {
  return FAL_PRESET_VOICES;
}

/** One short line -> base64 data URL (the whisper preview pattern). */
export async function previewLine(
  engine: TtsEngine,
  voiceId: string,
  text: string,
  modelId: string = ELEVEN_DEFAULT_MODEL,
  settings?: ElevenVoiceSettings,
): Promise<string> {
  const buf = await ttsLine(engine, voiceId, text.slice(0, 300), modelId, settings);
  const bytes = new Uint8Array(buf);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:audio/mpeg;base64,${btoa(binary)}`;
}
