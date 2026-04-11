
-- Create muse_settings table
CREATE TABLE public.muse_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  default_language text NOT NULL DEFAULT 'en',
  default_mode text NOT NULL DEFAULT 'spark',
  default_verbosity text NOT NULL DEFAULT 'standard',
  default_idea_count integer NOT NULL DEFAULT 20,
  default_variants integer NOT NULL DEFAULT 3,
  pack_format text NOT NULL DEFAULT 'structured',
  include_scoring boolean NOT NULL DEFAULT true,
  include_risks boolean NOT NULL DEFAULT true,
  include_next_actions boolean NOT NULL DEFAULT true,
  brand_tone jsonb NOT NULL DEFAULT '{"wonder":50,"warmth":50,"playfulness":50,"mystery":30,"clarity":70,"directness":60}'::jsonb,
  allowed_vocabulary text[] NOT NULL DEFAULT '{}',
  blocked_vocabulary text[] NOT NULL DEFAULT '{}',
  heart_strictness text NOT NULL DEFAULT 'enforce_and_propose',
  refusal_style text NOT NULL DEFAULT 'neutral',
  safety_guard_mode boolean NOT NULL DEFAULT true,
  internal_audit_logging boolean NOT NULL DEFAULT true,
  retrieval_depth text NOT NULL DEFAULT 'medium',
  diagram_format text NOT NULL DEFAULT 'mermaid',
  diagram_detail text NOT NULL DEFAULT 'standard',
  image_generation_enabled boolean NOT NULL DEFAULT false,
  image_provider text NOT NULL DEFAULT 'openai',
  image_model text NOT NULL DEFAULT 'gpt-image-1',
  image_aspect_ratio text NOT NULL DEFAULT '1:1',
  image_style_preset text NOT NULL DEFAULT 'default',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.muse_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own muse settings"
  ON public.muse_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create muse_messages table
CREATE TABLE public.muse_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  mode text,
  is_image boolean DEFAULT false,
  image_url text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.muse_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own muse messages"
  ON public.muse_messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trim trigger: keep last 200 messages per user
CREATE OR REPLACE FUNCTION public.trim_muse_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.muse_messages
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM public.muse_messages
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 200
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trim_muse_messages_trigger
  AFTER INSERT ON public.muse_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trim_muse_messages();

-- Updated_at trigger for muse_settings
CREATE TRIGGER update_muse_settings_updated_at
  BEFORE UPDATE ON public.muse_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
