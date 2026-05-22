-- Tighten pulse_drafts + pulse_reply_queue to admin-only, matching pulse_connections/
-- pulse_settings and the admin-gated pulse-api edge function. The whole Pulse workspace
-- is an admin/ops surface (the edge requires is_admin), so the data tables should too —
-- this closes the gap where any authenticated user could CRUD them directly via PostgREST.

drop policy if exists "Authenticated manage pulse_drafts" on public.pulse_drafts;
create policy "Admins manage pulse_drafts"
  on public.pulse_drafts for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "Authenticated manage pulse_reply_queue" on public.pulse_reply_queue;
create policy "Admins manage pulse_reply_queue"
  on public.pulse_reply_queue for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
