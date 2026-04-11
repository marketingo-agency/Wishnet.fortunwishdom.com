
-- Migration: Create promptor_settings and promptor_runs tables

-- promptor_settings: per-user Promptor configuration
CREATE TABLE public.promptor_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  -- Output preferences
  default_language text NOT NULL DEFAULT 'en',
  default_output_type text NOT NULL DEFAULT 'text',
  default_verbosity text NOT NULL DEFAULT 'standard',
  default_variants integer NOT NULL DEFAULT 2,
  include_short_prompt boolean NOT NULL DEFAULT true,
  include_full_prompt boolean NOT NULL DEFAULT true,
  include_negatives boolean NOT NULL DEFAULT true,
  include_qa_checklist boolean NOT NULL DEFAULT false,
  include_compliance_notes boolean NOT NULL DEFAULT true,
  -- Brand lens
  brand_tone jsonb NOT NULL DEFAULT '{"wonder":50,"warmth":50,"playfulness":50,"mystery":30,"clarity":70,"directness":60}',
  allowed_vocabulary text[] NOT NULL DEFAULT '{}',
  blocked_vocabulary text[] NOT NULL DEFAULT '{}',
  -- Compliance
  heart_strictness text NOT NULL DEFAULT 'enforce_and_propose',
  refusal_style text NOT NULL DEFAULT 'neutral',
  safety_guard_mode boolean NOT NULL DEFAULT true,
  -- Prompt style
  formatting_style text NOT NULL DEFAULT 'plain',
  image_aspect_ratio text NOT NULL DEFAULT '1:1',
  image_composition_detail text NOT NULL DEFAULT 'standard',
  image_camera_cue_style text NOT NULL DEFAULT 'descriptive',
  video_duration_default text NOT NULL DEFAULT '30s',
  video_shot_list_style text NOT NULL DEFAULT 'standard',
  video_pacing_style text NOT NULL DEFAULT 'moderate',
  social_platform_default text NOT NULL DEFAULT 'instagram',
  social_hashtag_behavior text NOT NULL DEFAULT 'suggest',
  social_cta_intensity text NOT NULL DEFAULT 'moderate',
  -- Memory & retrieval
  retrieval_depth text NOT NULL DEFAULT 'medium',
  citation_mode boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.promptor_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own promptor settings"
  ON public.promptor_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- promptor_runs: every prompt generation run
CREATE TABLE public.promptor_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  -- Input
  mode text NOT NULL DEFAULT 'create',
  output_type text NOT NULL DEFAULT 'text',
  blueprint text,
  raw_request text NOT NULL,
  existing_prompt text,
  -- Context bundle (audit log)
  heart_rules_used jsonb NOT NULL DEFAULT '[]',
  brain_context_used jsonb NOT NULL DEFAULT '[]',
  derived_brief jsonb NOT NULL DEFAULT '{}',
  -- Output
  brief_summary text,
  final_prompt_short text,
  final_prompt_full text,
  variants jsonb NOT NULL DEFAULT '[]',
  negatives text,
  qa_checklist jsonb NOT NULL DEFAULT '[]',
  -- Compliance
  compliance_status text NOT NULL DEFAULT 'pass',
  compliance_notes text,
  -- Meta
  llm_provider text,
  llm_model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promptor_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own promptor runs"
  ON public.promptor_runs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at on promptor_settings
CREATE TRIGGER update_promptor_settings_updated_at
  BEFORE UPDATE ON public.promptor_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
