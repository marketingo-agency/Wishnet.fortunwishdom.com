ALTER TABLE public.osha_settings
  ADD COLUMN IF NOT EXISTS image_provider text NOT NULL DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS image_model text NOT NULL DEFAULT 'gpt-image-1';