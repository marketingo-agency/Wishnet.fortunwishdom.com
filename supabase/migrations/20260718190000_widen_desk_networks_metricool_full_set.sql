-- Widen the Desk network CHECK to the FULL Metricool-schedulable set
-- (locked from the live swagger: linkedinData/threadsData/blueskyData/gmbData
-- all exist as ScheduledPost per-network objects). The finalize-bug lesson:
-- the DB check must move in lockstep with the client/edge allowlists.

alter table public.omni_content_targets
  drop constraint omni_content_targets_network_check;
alter table public.omni_content_targets
  add constraint omni_content_targets_network_check
  check (network in (
    'facebook','instagram','x','tiktok','youtube','pinterest',
    'linkedin','threads','bluesky','google_business','other'
  ));
