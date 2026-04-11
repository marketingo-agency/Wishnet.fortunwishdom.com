-- Rename Lexicon permission column to Promptor
ALTER TABLE public.user_permissions 
  RENAME COLUMN ai_can_access_lexicon TO ai_can_access_promptor;