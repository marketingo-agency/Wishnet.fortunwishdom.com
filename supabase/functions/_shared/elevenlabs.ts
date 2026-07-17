/**
 * Shared ElevenLabs engine (Plan 3 D-A2 + the fal-routing extension): the ONE
 * code path for TTS across omni functions.
 *
 * TWO transports behind one seam (resolveTtsEngine):
 *  - 'direct': the ElevenLabs API with an account key (pulse_connections
 *    provider 'elevenlabs' -> env fallback). Account voice library available.
 *  - 'fal': ElevenLabs' partner endpoints on fal.ai using the app's existing
 *    fal key ($0.10/1k chars, schema-verified 2026-07-17). Preset voices only
 *    (names like "Rachel"); synchronous fal.run - TTS of <=5000 chars returns
 *    in seconds. This is the default working mode for this app (fal is the
 *    sole media engine; no separate ElevenLabs account needed).
 *
 * Landmine #5 still applies: 5000 chars/call cap; naive MP3 concat is valid
 * ONLY when every chunk renders with the IDENTICAL output format - both
 * transports are pinned to mp3_44100_128 defaults.
 */

import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';

type AdminClient = ReturnType<typeof createClient>;

const ELEVEN_BASE = 'https://api.elevenlabs.io';
/** Every render in a concat chain MUST use this exact format (landmine #5). */
export const ELEVEN_OUTPUT_FORMAT = 'mp3_44100_128';
export const ELEVEN_DEFAULT_MODEL = 'eleven_multilingual_v2';
export const ELEVEN_CHAR_CAP = 5000;
/** The fal-hosted ElevenLabs TTS endpoint (multilingual v2). */
export const FAL_TTS_MODEL = 'fal-ai/elevenlabs/tts/multilingual-v2';

export interface TtsEngine {
  kind: 'direct' | 'fal';
  key: string;
}

export async function getElevenKey(admin: AdminClient): Promise<string | null> {
  const { data } = await admin.from('pulse_connections').select('api_key').eq('provider', 'elevenlabs').maybeSingle();
  const dbKey = ((data as { api_key: string | null } | null)?.api_key ?? '').trim();
  if (dbKey) return dbKey;
  const envKey = (Deno.env.get('ELEVENLABS_API_KEY') ?? '').trim();
  return envKey || null;
}

/**
 * Resolve the TTS transport: a direct ElevenLabs key wins (account voice
 * library); otherwise ElevenLabs-via-fal on the app's fal key; null when
 * neither exists (callers 503 honestly).
 */
export async function resolveTtsEngine(admin: AdminClient): Promise<TtsEngine | null> {
  const direct = await getElevenKey(admin);
  if (direct) return { kind: 'direct', key: direct };
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

/** Direct-API synthesis of one line -> mp3 ArrayBuffer (the whisper pattern). */
async function directTtsLine(
  key: string,
  voiceId: string,
  text: string,
  modelId: string,
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

/** Synthesize one line -> mp3 ArrayBuffer through the resolved engine. */
export async function ttsLine(
  engine: TtsEngine,
  voiceId: string,
  text: string,
  modelId: string = ELEVEN_DEFAULT_MODEL,
  settings?: ElevenVoiceSettings,
): Promise<ArrayBuffer> {
  return engine.kind === 'direct'
    ? directTtsLine(engine.key, voiceId, text, modelId, settings)
    : falTtsLine(engine.key, voiceId, text, settings);
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

/** List voices for the resolved engine: the account library (direct) or the
 *  curated fal preset set. */
export async function listVoices(engine: TtsEngine): Promise<ElevenVoice[]> {
  if (engine.kind === 'fal') return FAL_PRESET_VOICES;
  const resp = await fetch(`${ELEVEN_BASE}/v2/voices?page_size=100`, { headers: { 'xi-api-key': engine.key } });
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
