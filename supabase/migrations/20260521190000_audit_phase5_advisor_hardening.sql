-- Audit remediation Phase 5 — Supabase advisor hardening (applied via MCP)
-- SUP-03: fix mutable search_path on flagged functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT oid::regprocedure AS sig FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('match_knowledge_hybrid','set_ef_search')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
  END LOOP;
END $$;

-- SUP-05: remove the default PUBLIC EXECUTE grant on SECURITY DEFINER functions,
-- re-grant to the roles that legitimately need it (authenticated for RLS/RPC,
-- service_role for edge functions).
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT oid::regprocedure AS sig FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('handle_new_user','has_role','is_admin','match_knowledge',
                      'trim_console_messages','trim_muse_messages','trim_osha_messages','trim_pixel_messages')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;

-- SUP-02: tighten user_usage INSERT RLS (was WITH CHECK (true) for authenticated).
DROP POLICY IF EXISTS "Service role can insert usage" ON public.user_usage;
CREATE POLICY "Users can insert own usage" ON public.user_usage
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- SUP-06: covering indexes for the 3 unindexed foreign keys.
CREATE INDEX IF NOT EXISTS idx_osha_audit_logs_user_id ON public.osha_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_osha_messages_user_id ON public.osha_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_system_prompts_created_by ON public.system_prompts(created_by);
