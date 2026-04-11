-- Drop the trim_osha_messages trigger to allow unlimited message history
-- The trigger function still exists but is no longer attached to any table
DROP TRIGGER IF EXISTS trim_osha_messages_trigger ON public.osha_messages;