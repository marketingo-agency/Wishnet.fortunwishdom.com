ALTER TABLE public.osha_settings
  ADD COLUMN IF NOT EXISTS file_analysis_provider text NOT NULL DEFAULT 'gemini';
NOTIFY pgrst, 'reload schema';