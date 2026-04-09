/**
 * Promptor Types & Defaults
 */

export type OutputType = 'text' | 'image' | 'social_image' | 'social_copy' | 'video';
export type ComplianceStatus = 'pass' | 'adjusted' | 'refused';

export interface PrompterSettings {
  id?: string;
  user_id?: string;
  default_language: string;
  default_output_type: OutputType;
  default_verbosity: string;
  default_variants: number;
  include_short_prompt: boolean;
  include_full_prompt: boolean;
  include_negatives: boolean;
  include_qa_checklist: boolean;
  include_compliance_notes: boolean;
  brand_tone: {
    wonder: number;
    warmth: number;
    playfulness: number;
    mystery: number;
    clarity: number;
    directness: number;
  };
  allowed_vocabulary: string[];
  blocked_vocabulary: string[];
  heart_strictness: string;
  refusal_style: string;
  safety_guard_mode: boolean;
  formatting_style: string;
  image_aspect_ratio: string;
  image_composition_detail: string;
  image_camera_cue_style: string;
  video_duration_default: string;
  video_shot_list_style: string;
  video_pacing_style: string;
  social_platform_default: string;
  social_hashtag_behavior: string;
  social_cta_intensity: string;
  retrieval_depth: string;
  citation_mode: boolean;
}

export const DEFAULT_SETTINGS: PrompterSettings = {
  default_language: 'en',
  default_output_type: 'text',
  default_verbosity: 'standard',
  default_variants: 2,
  include_short_prompt: true,
  include_full_prompt: true,
  include_negatives: true,
  include_qa_checklist: false,
  include_compliance_notes: true,
  brand_tone: { wonder: 50, warmth: 50, playfulness: 50, mystery: 30, clarity: 70, directness: 60 },
  allowed_vocabulary: [],
  blocked_vocabulary: [],
  heart_strictness: 'enforce_and_propose',
  refusal_style: 'neutral',
  safety_guard_mode: true,
  formatting_style: 'plain',
  image_aspect_ratio: '1:1',
  image_composition_detail: 'standard',
  image_camera_cue_style: 'descriptive',
  video_duration_default: '30s',
  video_shot_list_style: 'standard',
  video_pacing_style: 'moderate',
  social_platform_default: 'instagram',
  social_hashtag_behavior: 'suggest',
  social_cta_intensity: 'moderate',
  retrieval_depth: 'medium',
  citation_mode: true,
};

export interface PromptorOutput {
  run_id: string | null;
  brief_summary: string;
  final_prompt_short: string | null;
  final_prompt_full: string;
  variants: string[];
  negatives: string | null;
  qa_checklist: string[];
  compliance_status: ComplianceStatus;
  compliance_notes: string | null;
  retrieval_meta: {
    heart_chunks: number;
    brain_chunks: number;
  };
}

export interface PromptorRun {
  id: string;
  mode: string;
  output_type: string;
  blueprint: string | null;
  raw_request: string;
  existing_prompt: string | null;
  brief_summary: string | null;
  final_prompt_short: string | null;
  final_prompt_full: string | null;
  variants: string[];
  negatives: string | null;
  qa_checklist: string[];
  compliance_status: string;
  compliance_notes: string | null;
  llm_provider: string | null;
  llm_model: string | null;
  created_at: string;
}
