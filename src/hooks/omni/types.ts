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

// ── fal.ai catalog and runner (client mirrors of the edge shapes) ────────────

export type FalCapability = 'text-to-image' | 'image-to-image' | 'upscale';

export interface FalModel {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnailUrl: string | null;
  licenseType: string | null;
  tags: string[];
}

export interface FalCatalogPage {
  models: FalModel[];
  nextCursor: string | null;
  hasMore: boolean;
  source: 'live' | 'fallback';
  falConfigured: boolean;
}

export interface FalImage {
  url: string;
  width: number | null;
  height: number | null;
  contentType: string | null;
}

export interface FalTestResult {
  success: boolean;
  model: string;
  images: FalImage[];
  elapsed_ms: number;
}

// ── Omni Images wizard state (persisted per step into omni_runs.step_state) ──

export interface OmniModelSelection {
  model_id: string;
  name: string;
  variants: number;
}

export interface OmniRepurposedRef {
  asset_id: string;
  source_asset_id: string;
  network: string;
  preset_id: string;
  mode: 'crop' | 'ai';
}

export interface OmniImagesState {
  objective?: string;
  optimized_prompt?: string;
  locked_prompt?: string;
  model_selections?: OmniModelSelection[];
  generated_asset_ids?: string[];
  selected_asset_ids?: string[];
  descriptions?: string[];
  chosen_description?: string;
  description_locked?: boolean;
  networks?: string[];
  preset_selections?: Record<string, string[]>;
  repurposed?: OmniRepurposedRef[];
  approved_asset_ids?: string[];
  title?: string;
}

export type VariantPollStatus = 'generating' | 'done' | 'failed' | 'discarded';

export interface VariantPollResult {
  id: string;
  status: VariantPollStatus;
  url?: string | null;
  width?: number | null;
  height?: number | null;
  error?: string;
  queue_position?: number | null;
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
