
-- ────────────────────────────────────────────────────────────────────────────
-- Osha Platform Assistant — Database Schema
-- Tables: osha_settings, osha_messages, osha_audit_logs
-- ────────────────────────────────────────────────────────────────────────────

-- 1. osha_settings (per-user configuration)
CREATE TABLE IF NOT EXISTS public.osha_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  -- Assistant behavior
  default_mode text NOT NULL DEFAULT 'guide',
  default_language text NOT NULL DEFAULT 'en',
  auto_detect_language boolean NOT NULL DEFAULT true,
  default_verbosity text NOT NULL DEFAULT 'standard',
  response_structure text NOT NULL DEFAULT 'plain',
  hallucination_control boolean NOT NULL DEFAULT true,
  -- Heart enforcement
  heart_strictness text NOT NULL DEFAULT 'enforce_and_propose',
  refusal_style text NOT NULL DEFAULT 'neutral',
  safety_guard_mode boolean NOT NULL DEFAULT true,
  -- Retrieval
  retrieval_depth text NOT NULL DEFAULT 'medium',
  context_window_messages integer NOT NULL DEFAULT 20,
  internal_audit_logging boolean NOT NULL DEFAULT true,
  -- Floating bubble
  bubble_enabled boolean NOT NULL DEFAULT true,
  bubble_scope text NOT NULL DEFAULT 'app_wide',
  bubble_greeting text NOT NULL DEFAULT 'Hi! I''m Osha, your Fortun Wishnet assistant. How can I help?',
  bubble_quick_starters jsonb NOT NULL DEFAULT '[]'::jsonb,
  bubble_remember_state boolean NOT NULL DEFAULT true,
  -- File handling
  max_file_size_mb integer NOT NULL DEFAULT 10,
  max_pages_processed integer NOT NULL DEFAULT 50,
  chunking_strategy text NOT NULL DEFAULT 'recursive',
  preferred_file_output text NOT NULL DEFAULT 'summary',
  citation_behavior boolean NOT NULL DEFAULT false,
  -- Image generation
  image_generation_enabled boolean NOT NULL DEFAULT false,
  image_default_size text NOT NULL DEFAULT '1024x1024',
  image_aspect_ratio text NOT NULL DEFAULT '1:1',
  image_brand_preset text NOT NULL DEFAULT 'default',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.osha_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own osha settings"
  ON public.osha_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. osha_messages (per-user chat history)
CREATE TABLE IF NOT EXISTS public.osha_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  mode text,
  is_image boolean DEFAULT false,
  image_url text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.osha_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own osha messages"
  ON public.osha_messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. osha_audit_logs (internal compliance records — admin-visible only)
CREATE TABLE IF NOT EXISTS public.osha_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id uuid,
  heart_rules_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  brain_chunks_used integer NOT NULL DEFAULT 0,
  compliance_status text NOT NULL DEFAULT 'pass',
  compliance_notes text,
  retrieval_ms integer,
  llm_provider text,
  llm_model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.osha_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all osha audit logs"
  ON public.osha_audit_logs
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own osha audit logs"
  ON public.osha_audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Trigger to keep last 200 messages per user (mirrors trim_console_messages)
CREATE OR REPLACE FUNCTION public.trim_osha_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.osha_messages
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM public.osha_messages
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 200
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trim_osha_messages_trigger
  AFTER INSERT ON public.osha_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trim_osha_messages();

-- 5. updated_at trigger for osha_settings
CREATE TRIGGER update_osha_settings_updated_at
  BEFORE UPDATE ON public.osha_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
