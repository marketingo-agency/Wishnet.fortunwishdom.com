-- Reset LLM settings to use verified working models
UPDATE llm_settings
SET 
  openai_text_model = 'gpt-4o-mini',
  openai_image_model = 'dall-e-3',
  openai_deep_research_model = 'o1-preview',
  gemini_text_model = 'gemini-1.5-flash-latest',
  gemini_image_model = 'gemini-2.0-flash-exp',
  updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';