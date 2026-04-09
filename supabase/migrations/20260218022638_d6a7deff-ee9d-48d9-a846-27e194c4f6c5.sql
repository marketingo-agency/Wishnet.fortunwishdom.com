
-- Create pixel_messages table
CREATE TABLE public.pixel_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  mode text,
  is_image boolean DEFAULT false,
  image_url text,
  attachments jsonb DEFAULT '[]'::jsonb,
  blueprint_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pixel_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pixel messages"
  ON public.pixel_messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trim trigger to keep last 200 messages per user
CREATE OR REPLACE FUNCTION public.trim_pixel_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.pixel_messages
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM public.pixel_messages
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 200
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trim_pixel_messages_trigger
  AFTER INSERT ON public.pixel_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trim_pixel_messages();

-- Create pixel_settings table
CREATE TABLE public.pixel_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  default_mode text NOT NULL DEFAULT 'quick_create',
  default_language text NOT NULL DEFAULT 'en',
  default_verbosity text NOT NULL DEFAULT 'standard',
  default_variations integer NOT NULL DEFAULT 3,
  default_pack_type text NOT NULL DEFAULT 'social_pack',
  include_prompt_set boolean NOT NULL DEFAULT true,
  include_blueprint_summary boolean NOT NULL DEFAULT true,
  include_qa_notes boolean NOT NULL DEFAULT false,
  heart_strictness text NOT NULL DEFAULT 'enforce_and_propose',
  refusal_style text NOT NULL DEFAULT 'neutral',
  safety_guard_mode boolean NOT NULL DEFAULT true,
  allowed_vocabulary text[] NOT NULL DEFAULT '{}',
  blocked_vocabulary text[] NOT NULL DEFAULT '{}',
  allowed_themes text[] NOT NULL DEFAULT '{}',
  blocked_themes text[] NOT NULL DEFAULT '{}',
  default_aesthetic text NOT NULL DEFAULT 'premium',
  palette_behavior text NOT NULL DEFAULT 'adaptive',
  texture_level text NOT NULL DEFAULT 'subtle',
  lighting text NOT NULL DEFAULT 'soft',
  detail_level text NOT NULL DEFAULT 'medium',
  default_aspect_ratio text NOT NULL DEFAULT '1:1',
  default_resolution text NOT NULL DEFAULT '1080',
  preferred_file_format text NOT NULL DEFAULT 'PNG',
  image_generation_enabled boolean NOT NULL DEFAULT false,
  image_provider text NOT NULL DEFAULT 'openai',
  image_model text NOT NULL DEFAULT 'gpt-image-1',
  video_generation_enabled boolean NOT NULL DEFAULT false,
  style_lock_default boolean NOT NULL DEFAULT true,
  character_lock_default boolean NOT NULL DEFAULT false,
  reuse_last_blueprint boolean NOT NULL DEFAULT false,
  retrieval_depth text NOT NULL DEFAULT 'medium',
  internal_audit_logging boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pixel_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pixel settings"
  ON public.pixel_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create pixel_blueprints table
CREATE TABLE public.pixel_blueprints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  format text,
  aspect_ratio text,
  composition_rules text,
  style_rules text,
  typography_vibe text,
  element_rules text,
  negative_constraints text,
  export_specs text,
  palette jsonb DEFAULT '{}'::jsonb,
  source text DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pixel_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pixel blueprints"
  ON public.pixel_blueprints
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert pixel into agent_settings if not exists
INSERT INTO public.agent_settings (agent_id, model, provider, is_active, temperature, max_tokens, system_prompt)
VALUES ('pixel', 'gpt-4o', 'openai', true, 0.8, 4096, 'You are Pixel, the Visual Creator AI of Fortun Wishnet.')
ON CONFLICT DO NOTHING;
