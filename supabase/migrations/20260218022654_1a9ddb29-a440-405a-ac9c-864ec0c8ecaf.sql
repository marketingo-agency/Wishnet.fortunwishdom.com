
-- Fix search path for trim_pixel_messages function
CREATE OR REPLACE FUNCTION public.trim_pixel_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.pixel_messages
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM public.pixel_messages
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 200
  );
  RETURN NEW;
END;
$$;
