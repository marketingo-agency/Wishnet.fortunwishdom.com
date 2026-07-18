-- Client decision: LinkedIn / Threads / Bluesky / Google Business are not
-- needed - narrow the Desk network set back to the original six + 'other'.
-- Verified zero rows use the removed values before narrowing. Lockstep with
-- the client registry and the edge allowlist.

alter table public.omni_content_targets
  drop constraint omni_content_targets_network_check;
alter table public.omni_content_targets
  add constraint omni_content_targets_network_check
  check (network in ('facebook','instagram','x','tiktok','youtube','pinterest','other'));
