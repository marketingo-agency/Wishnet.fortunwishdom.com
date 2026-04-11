-- Add deep research model column for OpenAI
ALTER TABLE llm_settings 
ADD COLUMN openai_deep_research_model TEXT DEFAULT 'o3-deep-research';