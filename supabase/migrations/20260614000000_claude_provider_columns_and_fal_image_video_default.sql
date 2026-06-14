-- Add Claude (Anthropic) as a TEXT/reasoning provider on llm_settings.
-- SEC-001: claude_api_key is a server-only column, NEVER added to the client whitelist
-- (LLM_SETTINGS_CLIENT_COLUMNS in src/hooks/useLLMSettings.ts) or the LLMSettings interface.
-- Claude is text-only: no claude_image/video/deep_research model columns.
ALTER TABLE public.llm_settings
  ADD COLUMN IF NOT EXISTS claude_api_key TEXT,
  ADD COLUMN IF NOT EXISTS claude_text_model TEXT DEFAULT 'claude-opus-4-8',
  ADD COLUMN IF NOT EXISTS claude_enabled BOOLEAN DEFAULT false;

-- fal.ai becomes the default image/video engine app-wide.
-- OpenAI/Gemini image+video generation is retired; Claude cannot generate images/video.
ALTER TABLE public.llm_settings
  ALTER COLUMN active_image_provider SET DEFAULT 'fal',
  ALTER COLUMN active_video_provider SET DEFAULT 'fal';

-- Move the single live settings row onto fal for image/video, and replace the shut-down
-- gemini-3-pro-preview id with a current reasoning model so the active text model keeps working.
UPDATE public.llm_settings
SET active_image_provider = 'fal',
    active_video_provider = 'fal',
    gemini_text_model = CASE
      WHEN gemini_text_model IN ('gemini-3-pro-preview', 'gemini-2.0-flash', 'gemini-1.5-pro') OR gemini_text_model IS NULL
        THEN 'gemini-3.1-pro-preview'
      ELSE gemini_text_model
    END
WHERE id = '00000000-0000-0000-0000-000000000001';
