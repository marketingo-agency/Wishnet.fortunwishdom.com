
-- Create agent_settings table for per-agent configuration
CREATE TABLE public.agent_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    text NOT NULL UNIQUE,
  is_active   boolean NOT NULL DEFAULT true,
  provider    text NOT NULL DEFAULT 'openai',
  model       text NOT NULL DEFAULT 'gpt-4o',
  temperature numeric NOT NULL DEFAULT 0.7,
  max_tokens  integer NOT NULL DEFAULT 2048,
  system_prompt text,
  updated_at  timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_settings ENABLE ROW LEVEL SECURITY;

-- Admins can fully manage agent settings
CREATE POLICY "Admins can manage agent settings"
  ON public.agent_settings
  FOR ALL
  USING (is_admin(auth.uid()));

-- All authenticated users can read agent settings
CREATE POLICY "Authenticated users can read agent settings"
  ON public.agent_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Auto-update updated_at on changes
CREATE TRIGGER update_agent_settings_updated_at
  BEFORE UPDATE ON public.agent_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
