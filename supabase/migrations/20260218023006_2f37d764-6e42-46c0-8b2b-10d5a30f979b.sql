
-- Fix search_path for all pre-existing trim functions
CREATE OR REPLACE FUNCTION public.trim_osha_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.osha_messages
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM public.osha_messages
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 200
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trim_muse_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.muse_messages
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM public.muse_messages
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 200
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trim_console_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM console_messages
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM console_messages
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 100
  );
  RETURN NEW;
END;
$$;
