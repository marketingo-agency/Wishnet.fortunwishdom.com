/**
 * Whisper domain types — the AI Podcast Generator.
 * Generated Supabase row types are added to integrations/supabase/types.ts as each
 * table is queried (from Phase 1 on).
 */

export type WhisperFormat = 'solo' | 'two_host' | 'interview' | 'explainer';

export type WhisperEpisodeStatus =
  | 'draft'
  | 'scripted'
  | 'rendering'
  | 'rendered'
  | 'published'
  | 'failed';

export type WhisperSourceType = 'brain' | 'wishpedia' | 'url' | 'text';

export interface WhisperSourceRef {
  type: WhisperSourceType;
  ref: string;
  label?: string;
}

export interface WhisperScriptSegment {
  speaker: string;
  voice_id: string | null;
  text: string;
  audio_path?: string | null;
}

export interface WhisperVoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
  speed?: number;
}

export interface WhisperChapter {
  time: number; // seconds
  label: string;
}

export interface WhisperShowNotes {
  title?: string;
  description?: string;
  chapters?: WhisperChapter[];
  tags?: string[];
}

export interface WhisperEpisode {
  id: string;
  show_id: string | null;
  title: string | null;
  status: WhisperEpisodeStatus;
  format: WhisperFormat;
  language: string;
  source_refs: WhisperSourceRef[];
  script: WhisperScriptSegment[];
  audio_path: string | null;
  transcript: string | null;
  show_notes: WhisperShowNotes;
  duration: number | null;
  cover_path: string | null;
  generated_by: string | null;
  error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhisperShow {
  id: string;
  name: string;
  description: string | null;
  default_cast: Record<string, string>;
  intro_audio_path: string | null;
  outro_audio_path: string | null;
  cover_style: string | null;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface WhisperVoicePreset {
  id: string;
  name: string;
  elevenlabs_voice_id: string;
  settings: WhisperVoiceSettings;
  preview_url: string | null;
}

/** A voice as returned by the ElevenLabs list-voices endpoint (subset). */
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  preview_url?: string;
  labels?: Record<string, string>;
}

export interface WhisperWorkspaceSettings {
  script_provider: string;
  script_model: string;
  tts_model: string;
  default_format: WhisperFormat;
  default_language: string;
  default_cast: Record<string, string>;
}
