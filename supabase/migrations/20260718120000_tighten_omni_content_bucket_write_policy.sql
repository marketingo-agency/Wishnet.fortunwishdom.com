-- QA hardening (security-auditor Low): the omni-content bucket write policy
-- admitted ANY authenticated user (uid-folder-confined, but the Desk is an
-- admin-only feature). Add the is_admin predicate on top of the folder check
-- so the bucket matches the feature's admin-only boundary everywhere.

drop policy "Users manage own omni-content objects" on storage.objects;

create policy "Admins manage own omni-content objects"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'omni-content'
    and public.is_admin(auth.uid())
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'omni-content'
    and public.is_admin(auth.uid())
    and auth.uid()::text = (storage.foldername(name))[1]
  );
