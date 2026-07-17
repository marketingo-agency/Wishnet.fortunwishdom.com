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

/** Workflow modes persisted in omni_runs.mode (Images + Videos tracks — the
 *  DB CHECK was widened with the five video modes in migration 20260717050000). */
export type OmniMode =
  | 'omni_images'
  | 'transform_upscale'
  | 'repurposing'
  | 'surprise_me'
  | 'brainstorming'
  | 'video_scenario'
  | 'omni_videos'
  | 'video_clips'
  | 'video_animate'
  | 'video_repurpose'
  | 'podcast_scenario'
  | 'omni_podcast'
  | 'podcast_video';

export type OmniRunStatus = 'active' | 'completed' | 'failed' | 'archived';

/** 'persisting' = the D-V7 compare-and-set claim taken by whichever of
 *  client-poll / finisher wins the persist race (video assets). */
export type OmniAssetStatus = 'pending' | 'generating' | 'persisting' | 'done' | 'failed' | 'discarded';

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

/** Per-variant technical image spec (size / ratio / quality). The fields that
 *  apply depend on the model's fal sizing convention (see src/config/falSpecs).
 *  The edge translates this into the correct fal input params per model. */
export interface OmniVariantSpec {
  /** image_size convention: a named preset or 'custom'; pixel_enum: a pixel string. */
  imageSize?: string;
  /** Custom pixel dimensions (image_size convention, imageSize === 'custom'). */
  width?: number;
  height?: number;
  /** aspect_resolution convention. */
  aspectRatio?: string;
  resolution?: string;
  /** Model-specific quality knob value (e.g. gpt quality, ideogram rendering_speed). */
  quality?: string;
  /** gpt-image only. */
  inputFidelity?: string;
}

export interface OmniRepurposedRef {
  asset_id: string;
  source_asset_id: string;
  network: string;
  preset_id: string;
  // 'redesign' = AI re-layout for the target dimension; 'crop' = free smart
  // crop; 'extend' = pixel-preserving AI outpaint (subject untouched, canvas
  // grown). 'ai' is the legacy extend mode, kept for resumed older runs.
  mode: 'crop' | 'ai' | 'redesign' | 'extend';
}

/** A Wishpedia reference image attached to an Omni Images run for canon-accurate
 *  character recreation. The wizard passes wishpediaImageId to the edge, which
 *  resolves it to a public URL server-side (the client never sends raw URLs). */
export interface OmniWishReferenceRef {
  wishpediaImageId: string;
  entryId: string;
  entryName: string;
  angle: string | null;
  publicUrl: string;
}

export interface OmniAnalysis {
  description: string;
  universe_relation: { related: boolean; conclusion: string };
  suggestions: { type: 'upscale' | 'transform'; text: string }[];
  retrieval: { brain_chunks: number; heart_rules: number };
}

export interface OmniImagesState {
  /** Step-state schema version: absent/1 = the legacy 11-step flow; 2 = the
   *  7-stage Studio flow (current_step then holds a stage ordinal). Reads
   *  migrate through stepRegistry.migrateStepState. */
  schema_version?: number;
  objective?: string;
  optimized_prompt?: string;
  locked_prompt?: string;
  /** How the locked prompt was authored: 'promptor' (already Heart-grounded
   *  upstream) or 'raw' (user text — the edge injects the Heart digest). */
  prompt_provenance?: 'promptor' | 'raw';
  /** Wishpedia character references attached at step 1 for canon-accurate
   *  recreation; when present the wizard auto-routes to an edit-capable model. */
  reference_image_refs?: OmniWishReferenceRef[];
  // Transform and Upscale (Mode 2) extras, persisted in the same engine state
  source_asset_id?: string;
  analysis?: OmniAnalysis;
  transform_prompt?: string;
  model_selections?: OmniModelSelection[];
  /** Per-model, per-variant technical specs (size/ratio/quality), keyed by model_id. */
  model_specs?: Record<string, OmniVariantSpec[]>;
  generated_asset_ids?: string[];
  selected_asset_ids?: string[];
  descriptions?: string[];
  chosen_description?: string;
  /** Per base-image, per-network caption options: [assetId][networkId] → examples. */
  caption_options?: Record<string, Record<string, string[]>>;
  /** Per base-image, per-network chosen caption: [assetId][networkId] → caption. */
  chosen_captions?: Record<string, Record<string, string>>;
  description_locked?: boolean;
  networks?: string[];
  preset_selections?: Record<string, string[]>;
  repurposed?: OmniRepurposedRef[];
  approved_asset_ids?: string[];
  title?: string;
  /** High-water mark: the furthest step this run ever reached (History keeps
   *  later steps resumable even after a backwards jump rewrites current_step). */
  max_step_reached?: number;
  // Brainstorming (Mode 6) extras, persisted in the same engine state
  messages?: OmniChatMessage[];
  idea_locked?: boolean;
  /** Source run id when this run was created via Retake (HIST-15 backlink). */
  retake_of?: string;
  /** Curated-entry marker: 'character_studio' runs are ordinary omni_images
   *  runs pre-seeded from a Wishpedia entry (no new mode, no migration). */
  origin?: 'character_studio';
  character_entry_id?: string;
  /** Video-family schema stamp (Plan 2 D-V1). Independent of the images
   *  schema_version: video modes are born at video_schema_version 1 and
   *  current_step holds their own stage ordinal from day one. */
  video_schema_version?: number;
  /** Video pre-production artifact (Plan 2 D-V2). */
  scenario?: OmniVideoScenario;
  /** Draft engine picked in Video Studio stage 2 (vsEngines id). */
  video_engine_id?: string;
  /** Provenance: the Scenario Studio run this Studio run was seeded from. */
  scenario_source_run_id?: string;
  /** Stage 4 audio artifacts (Plan 2 Phase 6a): polled omni_assets rows. */
  voiceover_asset_id?: string;
  voiceover_voice_id?: string;
  music_asset_id?: string;
  music_prompt?: string;
  /** Stage 5 output (Phase 6b): the assembled film's omni_assets row. */
  assembly_asset_id?: string;
  /** Stage 6 (Phase 7): SRT sidecar path in the omni-video bucket (D-V8). */
  srt_path?: string;
  /** Stage 7 (Phase 7): per-preset distribution variants. */
  video_variants?: Record<string, OmniVideoVariantRef>;
  /** Stage 8 (Phase 7): per-preset caption overrides. */
  video_captions?: Record<string, string>;
  /** Animate mode (Phase 9). */
  animate_path?: 'motion' | 'talk';
  animate_refs?: OmniAnimateRef[];
  animate_prompt?: string;
  animate_script?: string;
  animate_voice_id?: string;
  animate_vo_asset_id?: string;
  /** Audios track (Plan 3 D-A1/D-A3). */
  podcast_show_id?: string;
  podcast_brief?: OmniPodcastBrief;
  podcast_outline?: OmniPodcastOutline;
  /** Chapter idx (as string key) -> generated/edited segments. */
  podcast_script?: Record<string, OmniPodcastSegment[]>;
  /** Speaker label -> persona id (seeded from the show's default cast). */
  podcast_cast?: Record<string, string>;
  /** Provenance: the podcast_scenario run a Studio run was seeded from. */
  podcast_source_run_id?: string;
}

export interface OmniPodcastBrief {
  brief: string;
  source_url?: string;
  pasted_text?: string;
  target_minutes: number;
}

export interface OmniPodcastChapter {
  idx: number;
  title: string;
  summary: string;
  minutes: number;
}

export interface OmniPodcastOutline {
  title: string;
  chapters: OmniPodcastChapter[];
}

export interface OmniPodcastSegment {
  speaker: string;
  text: string;
}

export interface OmniAnimateRef {
  /** wishpedia_entry_images.id (resolved server-side, never a raw URL). */
  wishpedia_image_id: string;
  /** Public wishpedia-media URL, persisted for preview only. */
  url: string;
  label: string;
}

export interface OmniVideoVariantRef {
  asset_id: string;
  network: string;
  preset_id: string;
  /** Honest processing note (e.g. "2:3 snapped to 9:16"). */
  note?: string;
}

// ── Videos track (Plan 2 D-V2) ────────────────────────────────────────────────

export interface OmniScenarioScene {
  idx: number;
  visual_prompt: string;
  narration: string;
  duration_s: number;
  camera?: string;
  keyframe_asset_id?: string;
  clip_asset_id?: string;
  hero_asset_id?: string;
}

export interface OmniVideoScenario {
  title: string;
  scenes: OmniScenarioScene[];
}

// ── Brainstorming (Mode 6) ───────────────────────────────────────────────────

export interface OmniChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Names of images sent with this message (bytes are never persisted). */
  attachment_names?: string[];
  created_at: string;
}

export interface BrainstormReply {
  reply: string;
  rag_available: boolean;
  retrieval: { brain_chunks: number; heart_rules: number };
}

// ── Surprise Me (Mode 5) ─────────────────────────────────────────────────────

export interface SurpriseIdea {
  title: string;
  summary: string;
  objective: string;
  grounding: string;
}

export interface SurpriseResult {
  ideas: SurpriseIdea[];
  retrieval: { brain_chunks: number; wishpedia_chunks: number; heart_rules: number };
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
