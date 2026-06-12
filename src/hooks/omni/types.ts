/**
 * Omni hook types: client mirrors of the omni edge function shapes.
 */

export interface OmniSettings {
  analysis_provider: 'openai' | 'gemini';
  analysis_model: string | null;
  default_variants: number;
  defaults: Record<string, unknown>;
}

export const DEFAULT_OMNI_SETTINGS: OmniSettings = {
  analysis_provider: 'openai',
  analysis_model: null,
  default_variants: 2,
  defaults: {},
};

/** The four entry tracks on the Omni home screen. */
export type OmniTrack = 'brainstorming' | 'images' | 'audios' | 'videos';

/** Workflow modes persisted in omni_runs.mode (Images track sequences). */
export type OmniMode =
  | 'omni_images'
  | 'transform_upscale'
  | 'repurposing'
  | 'surprise_me'
  | 'brainstorming';

export type OmniRunStatus = 'active' | 'completed' | 'failed' | 'archived';

export type OmniAssetStatus = 'pending' | 'generating' | 'done' | 'failed' | 'discarded';

export interface OmniRun {
  id: string;
  user_id: string;
  mode: OmniMode;
  title: string | null;
  current_step: number;
  step_state: Record<string, unknown>;
  status: OmniRunStatus;
  created_at: string;
  updated_at: string;
}

export interface OmniAsset {
  id: string;
  user_id: string;
  run_id: string;
  parent_asset_id: string | null;
  kind: 'image' | 'audio' | 'video';
  model_id: string | null;
  prompt: string | null;
  storage_path: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  status: OmniAssetStatus;
  error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
