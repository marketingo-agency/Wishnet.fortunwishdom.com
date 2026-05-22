-- Pulse workspace — Social Media Command Center.
-- 4 tables: drafts (content spine), reply_queue (engagement), connections (provider
-- secrets, admin-only), settings (reply model/modes). All RLS-enabled; secrets are
-- only ever read/written by edge functions via the service role.

-- ── pulse_drafts ─────────────────────────────────────────────────────────────
create table if not exists public.pulse_drafts (
  id uuid primary key default gen_random_uuid(),
  profile_username text,
  platforms text[] not null default '{}',
  post_type text not null default 'text',            -- text | photo | video
  title text,
  caption text,
  media_refs jsonb not null default '[]'::jsonb,      -- [{ storage_path, type, mime, ... }]
  status text not null default 'draft',               -- draft | pending_approval | scheduled | published | failed
  scheduled_date timestamptz,
  timezone text,
  job_id text,                                        -- upload-post schedule job id
  request_id text,                                    -- upload-post publish request id
  external_post_ids jsonb not null default '{}'::jsonb,
  generated_by text,                                  -- manual | pixel | bulk
  campaign_id uuid,                                   -- groups bulk variants
  error text,
  approved_by uuid references auth.users(id) on delete set null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pulse_drafts_status_idx on public.pulse_drafts (status);
create index if not exists pulse_drafts_scheduled_date_idx on public.pulse_drafts (scheduled_date);
create index if not exists pulse_drafts_profile_idx on public.pulse_drafts (profile_username);
create index if not exists pulse_drafts_campaign_idx on public.pulse_drafts (campaign_id);
create index if not exists pulse_drafts_created_by_idx on public.pulse_drafts (created_by);

alter table public.pulse_drafts enable row level security;
create policy "Authenticated manage pulse_drafts"
  on public.pulse_drafts for all to authenticated using (true) with check (true);

-- ── pulse_reply_queue ────────────────────────────────────────────────────────
create table if not exists public.pulse_reply_queue (
  id uuid primary key default gen_random_uuid(),
  source text not null,                               -- comment | dm
  platform text not null,                             -- facebook | instagram
  profile_username text,
  external_id text,                                   -- comment id / message id
  thread_id text,                                     -- conversation id
  author_handle text,
  author_id text,
  incoming_text text,
  ai_draft text,
  model_used text,
  sentiment text,                                     -- positive | neutral | negative
  status text not null default 'pending',             -- pending | approved | sent | skipped | failed
  reply_mode text,                                    -- mode at time of handling
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pulse_reply_queue_dedup_idx
  on public.pulse_reply_queue (platform, source, external_id);
create index if not exists pulse_reply_queue_status_idx on public.pulse_reply_queue (status);
create index if not exists pulse_reply_queue_profile_idx on public.pulse_reply_queue (profile_username);

alter table public.pulse_reply_queue enable row level security;
create policy "Authenticated manage pulse_reply_queue"
  on public.pulse_reply_queue for all to authenticated using (true) with check (true);

-- ── pulse_connections (secrets — admin-only) ─────────────────────────────────
create table if not exists public.pulse_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,                      -- meta | elevenlabs | canva | upload_post
  api_key text,                                       -- generic secret (elevenlabs/canva)
  meta_app_id text,
  meta_app_secret text,
  meta_page_tokens jsonb not null default '{}'::jsonb,-- { page_id: long_lived_token }
  config jsonb not null default '{}'::jsonb,
  status text not null default 'disconnected',        -- connected | disconnected | error
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pulse_connections enable row level security;
create policy "Admins manage pulse_connections"
  on public.pulse_connections for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── pulse_settings (reply model / modes — admin-only, single-row) ────────────
create table if not exists public.pulse_settings (
  id uuid primary key default gen_random_uuid(),
  reply_provider text not null default 'openai',      -- openai | gemini | fal
  reply_model text not null default 'gpt-4.1',
  reply_temperature numeric not null default 0.7,
  reply_mode text not null default 'manual',          -- manual | semi | auto (global default)
  reply_mode_overrides jsonb not null default '{}'::jsonb, -- { profile_username: mode }
  reply_persona text,
  daily_dm_cap integer not null default 50,
  autodm_rules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pulse_settings enable row level security;
create policy "Admins manage pulse_settings"
  on public.pulse_settings for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Seed the single settings row so the app always has defaults to read.
insert into public.pulse_settings (reply_provider, reply_model, reply_mode)
select 'openai', 'gpt-4.1', 'manual'
where not exists (select 1 from public.pulse_settings);
