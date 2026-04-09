-- Add video generation and active provider columns
ALTER TABLE llm_settings 
ADD COLUMN openai_video_model TEXT DEFAULT 'sora-2',
ADD COLUMN gemini_video_model TEXT DEFAULT 'veo-2',
ADD COLUMN active_deep_research_provider TEXT DEFAULT 'openai',
ADD COLUMN active_video_provider TEXT DEFAULT 'openai';