-- Plan 2 Phase 2b: the omni-video finisher sweep (D-V7).
-- pg_cron fires every 2 minutes and POSTs the omni-finisher edge function via
-- pg_net. Auth: a random secret seeded here in the admin-only
-- pulse_connections table (provider 'omni_video_finisher'), validated
-- in-function with a constant-time compare (the function is verify_jwt=false
-- BY DESIGN - pg_net cannot carry a user JWT; landmine #12).
-- Applied only AFTER omni-finisher v1 was deployed and hand-verified
-- (landmine #14).

create extension if not exists pg_net with schema extensions;

insert into public.pulse_connections (provider, api_key, status)
select 'omni_video_finisher', gen_random_uuid()::text, 'connected'
where not exists (
  select 1 from public.pulse_connections where provider = 'omni_video_finisher'
);

do $$
begin
  if exists (select 1 from cron.job where jobname = 'omni-video-finisher') then
    perform cron.unschedule('omni-video-finisher');
  end if;
end
$$;

select cron.schedule(
  'omni-video-finisher',
  '*/2 * * * *',
  $job$
  select net.http_post(
    url := 'https://zlmideilxfnokemzkavm.supabase.co/functions/v1/omni-finisher',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'cron_secret', (select api_key from public.pulse_connections where provider = 'omni_video_finisher')
    )
  );
  $job$
);
