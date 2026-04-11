CREATE OR REPLACE FUNCTION public.trim_console_messages()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
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
$function$;