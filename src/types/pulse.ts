/**
 * Pulse domain types — the Social Media Command Center.
 * Hand-written app-facing shapes; the generated Supabase row types are added to
 * integrations/supabase/types.ts as each table gets queried (from Phase 2 on).
 */

export type PulsePostType = 'text' | 'photo' | 'video';

export type PulseDraftStatus =
  | 'draft'
  | 'pending_approval'
  | 'scheduled'
  | 'published'
  | 'failed';

export interface PulseMediaRef {
  storage_path: string;
  type: 'image' | 'video' | 'audio';
  mime?: string;
  url?: string;
}

export interface PulseDraft {
  id: string;
  profile_username: string | null;
  platforms: string[];
  post_type: PulsePostType;
  title: string | null;
  caption: string | null;
  media_refs: PulseMediaRef[];
  status: PulseDraftStatus;
  scheduled_date: string | null;
  timezone: string | null;
  job_id: string | null;
  request_id: string | null;
  external_post_ids: Record<string, string>;
  generated_by: string | null;
  campaign_id: string | null;
  error: string | null;
  approved_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PulseReplySource = 'comment' | 'dm';
export type PulseReplyStatus = 'pending' | 'approved' | 'sent' | 'skipped' | 'failed';
export type PulseSentiment = 'positive' | 'neutral' | 'negative';

export interface PulseReplyItem {
  id: string;
  source: PulseReplySource;
  platform: 'facebook' | 'instagram';
  profile_username: string | null;
  external_id: string | null;
  thread_id: string | null;
  author_handle: string | null;
  author_id: string | null;
  incoming_text: string | null;
  ai_draft: string | null;
  model_used: string | null;
  sentiment: PulseSentiment | null;
  status: PulseReplyStatus;
  reply_mode: PulseReplyMode | null;
  sent_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export type PulseReplyMode = 'manual' | 'semi' | 'auto';

export type PulseConnectionProvider = 'meta' | 'canva' | 'upload_post';
export type PulseConnectionStatusValue = 'connected' | 'disconnected' | 'error';

export interface PulseWorkspaceSettings {
  reply_provider: string;
  reply_model: string;
  reply_temperature: number;
  reply_mode: PulseReplyMode;
  reply_mode_overrides: Record<string, PulseReplyMode>;
  reply_persona: string | null;
  daily_dm_cap: number;
}
