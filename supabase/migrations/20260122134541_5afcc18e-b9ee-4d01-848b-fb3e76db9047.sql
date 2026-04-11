-- Update llm_settings with new default Gemini models
UPDATE llm_settings 
SET 
  gemini_text_model = 'gemini-2.5-flash',
  gemini_image_model = 'gemini-2.5-flash-image',
  updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';