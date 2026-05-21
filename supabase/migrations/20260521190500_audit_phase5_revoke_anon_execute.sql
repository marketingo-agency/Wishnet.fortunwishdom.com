-- Audit remediation Phase 5 (cont.) — revoke anon's direct EXECUTE grant.
-- Supabase grants EXECUTE directly to anon/authenticated, so REVOKE FROM PUBLIC
-- was insufficient (advisor 0028 persisted). Revoke anon explicitly; also revoke
-- authenticated on trigger/cron-only functions (advisor 0029). is_admin/has_role/
-- match_knowledge keep authenticated (RLS / edge RAG depend on it).
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT oid::regprocedure AS sig, proname FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('handle_new_user','has_role','is_admin','match_knowledge',
                      'trim_console_messages','trim_muse_messages','trim_osha_messages','trim_pixel_messages')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
    IF r.proname IN ('handle_new_user','trim_console_messages','trim_muse_messages','trim_osha_messages','trim_pixel_messages') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.sig);
    END IF;
  END LOOP;
END $$;
