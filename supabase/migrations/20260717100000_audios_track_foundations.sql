-- Plan 3 (Omni Audios track) Phase 1 foundations - D-A1/D-A7/D-A8/D-A10.
-- 1) omni_runs.mode gains the three audio modes (one widening, before any
--    client writes them - the Plan-2 landmine applies).
alter table public.omni_runs drop constraint omni_runs_mode_check;
alter table public.omni_runs add constraint omni_runs_mode_check
  check (mode in (
    'omni_images','transform_upscale','repurposing','surprise_me','brainstorming',
    'video_scenario','omni_videos','video_clips','video_animate','video_repurpose',
    'podcast_scenario','omni_podcast','podcast_video'
  ));

-- 2) Personas (D-A4): the unit of casting everywhere. Owner-scoped.
create table public.omni_personas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  role text,
  personality text,
  speaking_style text,
  voice_id text,
  voice_settings jsonb not null default '{}'::jsonb,
  portrait_url text,
  wishpedia_entry_id uuid references public.wishpedia_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.omni_personas enable row level security;
create policy "Users manage own personas" on public.omni_personas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) Shows (D-A1): owner-scoped creation; ADMIN SELECT for the feed manager.
create table public.podcast_shows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  slug text not null unique,
  description text,
  language text not null default 'en',
  category text,
  artwork_path text,
  feed_config jsonb not null default '{}'::jsonb,
  default_cast jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.podcast_shows enable row level security;
create policy "Users manage own shows" on public.podcast_shows
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins read all shows" on public.podcast_shows
  for select using (public.is_admin(auth.uid()));

-- 4) Episodes (D-A1): the feed generator reads THIS table, never step_state.
--    GUID is immutable once set at publish (landmine #1).
create table public.podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.podcast_shows(id) on delete cascade,
  run_id uuid references public.omni_runs(id) on delete set null,
  title text not null,
  description text,
  audio_path text,
  public_audio_path text,
  cover_path text,
  duration_s numeric,
  bytes bigint,
  guid text unique,
  chapters jsonb not null default '[]'::jsonb,
  transcript_path text,
  status text not null default 'draft' check (status in ('draft','published','scheduled')),
  published_at timestamptz,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.podcast_episodes enable row level security;
create policy "Users manage own episodes via show" on public.podcast_episodes
  for all using (exists (select 1 from public.podcast_shows s where s.id = show_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.podcast_shows s where s.id = show_id and s.user_id = auth.uid()));
create policy "Admins read all episodes" on public.podcast_episodes
  for select using (public.is_admin(auth.uid()));
create index podcast_episodes_show_id_idx on public.podcast_episodes (show_id);

-- 5) omni-audio bucket (private; the omni-video precedent verbatim).
insert into storage.buckets (id, name, public)
values ('omni-audio', 'omni-audio', false)
on conflict (id) do nothing;
create policy "Users manage own omni-audio objects"
  on storage.objects for all
  using (bucket_id = 'omni-audio' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'omni-audio' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Admins read omni-audio objects"
  on storage.objects for select
  using (bucket_id = 'omni-audio' and public.is_admin(auth.uid()));

-- 6) podcast-public bucket (public READ; writes are service-role/admin only -
--    no user policies exist, so client writes are denied by default; MIME
--    allowlist per D-A6/D-A8).
insert into storage.buckets (id, name, public, allowed_mime_types)
values ('podcast-public', 'podcast-public', true,
        array['audio/mpeg','audio/mp3','audio/wav','image/jpeg','image/png','application/rss+xml','text/xml','application/xml'])
on conflict (id) do nothing;
create policy "Admins manage podcast-public objects"
  on storage.objects for all
  using (bucket_id = 'podcast-public' and public.is_admin(auth.uid()))
  with check (bucket_id = 'podcast-public' and public.is_admin(auth.uid()));

-- 7) content_library media_type gains 'audio' (D-A10; defaults untouched).
alter table public.content_library_items drop constraint content_library_items_media_type_check;
alter table public.content_library_items add constraint content_library_items_media_type_check
  check (media_type in ('image','video','audio'));
alter table public.content_library_posts drop constraint content_library_posts_media_type_check;
alter table public.content_library_posts add constraint content_library_posts_media_type_check
  check (media_type in ('image','video','audio'));
