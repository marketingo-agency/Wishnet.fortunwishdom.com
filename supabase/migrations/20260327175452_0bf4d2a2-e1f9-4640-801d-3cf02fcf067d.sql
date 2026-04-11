
-- Fix: Change llm_settings SELECT policy from 'public' to 'authenticated' role
-- This prevents unauthenticated requests from potentially bypassing the is_admin check

DROP POLICY IF EXISTS "Admins can view LLM settings" ON public.llm_settings;

CREATE POLICY "Admins can view LLM settings"
ON public.llm_settings
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Also fix the UPDATE policy to use 'authenticated' role
DROP POLICY IF EXISTS "Admins can update LLM settings" ON public.llm_settings;

CREATE POLICY "Admins can update LLM settings"
ON public.llm_settings
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));
