-- Phase 4: Content Library scheduled dispatch.
-- pg_cron (already installed) fires every 5 minutes and POSTs the
-- content-library edge function's dispatch-due action via pg_net.
-- Auth: a random dispatch secret generated here, stored in the admin-only
-- pulse_connections table (provider 'omni_dispatch') and validated
-- in-function (SEC-006 pattern; the function is deployed verify_jwt=false).

create extension if not exists pg_net with schema extensions;

-- Seed the dispatch secret once (no-op if it already exists).
insert into public.pulse_connections (provider, api_key, status)
select 'omni_dispatch', gen_random_uuid()::text, 'connected'
where not exists (
  select 1 from public.pulse_connections where provider = 'omni_dispatch'
);

-- Replace any prior schedule with the same name, then create it.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'content-library-dispatch') then
    perform cron.unschedule('content-library-dispatch');
  end if;
end
$$;

select cron.schedule(
  'content-library-dispatch',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := 'https://zlmideilxfnokemzkavm.supabase.co/functions/v1/content-library',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'action', 'dispatch-due',
      'cron_secret', (select api_key from public.pulse_connections where provider = 'omni_dispatch')
    )
  );
  $job$
);
