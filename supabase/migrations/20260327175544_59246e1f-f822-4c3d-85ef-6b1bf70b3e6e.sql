
CREATE POLICY "Users can view own osha audit logs"
ON public.osha_audit_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
