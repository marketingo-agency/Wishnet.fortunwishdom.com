-- Add new permission columns for the new tools
ALTER TABLE public.user_permissions
ADD COLUMN IF NOT EXISTS ai_agents permission_level DEFAULT 'none',
ADD COLUMN IF NOT EXISTS wishdom permission_level DEFAULT 'none',
ADD COLUMN IF NOT EXISTS wishnetrium permission_level DEFAULT 'none';

-- Drop the old unused columns (content_studio and social_pulse are no longer visible tools)
ALTER TABLE public.user_permissions
DROP COLUMN IF EXISTS content_studio,
DROP COLUMN IF EXISTS social_pulse;