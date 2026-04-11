-- Create LLM Settings table for storing provider configurations
CREATE TABLE public.llm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- OpenAI Configuration
  openai_api_key TEXT,
  openai_text_model TEXT DEFAULT 'gpt-4o',
  openai_image_model TEXT DEFAULT 'dall-e-3',
  openai_enabled BOOLEAN DEFAULT false,
  
  -- Google Gemini Configuration  
  gemini_api_key TEXT,
  gemini_text_model TEXT DEFAULT 'gemini-1.5-pro',
  gemini_image_model TEXT DEFAULT 'gemini-1.5-pro-vision',
  gemini_enabled BOOLEAN DEFAULT false,
  
  -- Active Provider Selection
  active_text_provider TEXT DEFAULT 'openai',
  active_image_provider TEXT DEFAULT 'openai',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings row
INSERT INTO public.llm_settings (id) VALUES ('00000000-0000-0000-0000-000000000001');

-- Enable RLS
ALTER TABLE public.llm_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view LLM settings
CREATE POLICY "Admins can view LLM settings"
ON public.llm_settings FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only admins can update LLM settings
CREATE POLICY "Admins can update LLM settings"
ON public.llm_settings FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_llm_settings_updated_at
BEFORE UPDATE ON public.llm_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();