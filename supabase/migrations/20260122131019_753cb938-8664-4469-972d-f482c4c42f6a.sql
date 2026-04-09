-- Reset LLM settings to the new OpenAI models
UPDATE llm_settings
SET 
  openai_text_model = 'gpt-4o-mini',
  openai_image_model = 'gpt-image-1',
  openai_deep_research_model = 'o3-deep-research',
  openai_video_model = 'sora-2',
  updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';