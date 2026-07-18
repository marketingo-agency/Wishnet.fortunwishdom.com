-- Omni Content hub - Publishing Desk foundations (Phase 2).
-- A manual-handoff publisher: admins stage posts (media + per-network captions
-- + schedule); any admin works the Publish Queue and marks targets published.
-- Admin-SHARED data (both accounts see everything; created_by/published_by
-- record the trail). Per-NETWORK-target status; the post status is derived.

-- 1) Posts ---------------------------------------------------------------
create table public.omni_content_posts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  title text not null default '',
  notes text,
  status text not null default 'draft'
    check (status in ('draft','scheduled','partially_published','published','archived')),
  scheduled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Media (one or many images OR videos per post) ------------------------
create table public.omni_content_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.omni_content_posts(id) on delete cascade,
  kind text not null check (kind in ('image','video')),
  storage_path text not null,
  mime_type text not null,
  sort integer not null default 0,
  width integer,
  height integer,
  byte_size bigint,
  created_at timestamptz not null default now()
);

-- 3) Network targets (per-network post type + caption + manual-publish state)
create table public.omni_content_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.omni_content_posts(id) on delete cascade,
  network text not null
    check (network in ('facebook','instagram','x','tiktok','youtube','pinterest','other')),
  network_label text,
  post_type text not null default '',
  caption text not null default '',
  status text not null default 'scheduled' check (status in ('scheduled','published')),
  published_at timestamptz,
  published_by uuid,
  published_url text,
  created_at timestamptz not null default now()
);

create index idx_omni_content_media_post on public.omni_content_media(post_id);
create index idx_omni_content_targets_post on public.omni_content_targets(post_id);
create index idx_omni_content_targets_status on public.omni_content_targets(status);
create index idx_omni_content_posts_scheduled on public.omni_content_posts(scheduled_at);
create index idx_omni_content_posts_status on public.omni_content_posts(status);

create trigger update_omni_content_posts_updated_at
  before update on public.omni_content_posts
  for each row execute function public.update_updated_at_column();

-- 4) RLS: admin-shared (the whisper_* precedent verbatim) ------------------
alter table public.omni_content_posts enable row level security;
create policy "Admins manage omni_content_posts"
  on public.omni_content_posts for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

alter table public.omni_content_media enable row level security;
create policy "Admins manage omni_content_media"
  on public.omni_content_media for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

alter table public.omni_content_targets enable row level security;
create policy "Admins manage omni_content_targets"
  on public.omni_content_targets for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- 5) omni-content bucket (private; signed URLs only; MIME allowlist + cap).
--    Uploads are client-direct under the uploader's own uid folder (the
--    omni-video precedent); cross-admin reads go through edge-signed URLs.
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('omni-content', 'omni-content', false,
        array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm','video/quicktime'],
        524288000)
on conflict (id) do nothing;

create policy "Users manage own omni-content objects"
  on storage.objects for all
  using (bucket_id = 'omni-content' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'omni-content' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Admins read omni-content objects"
  on storage.objects for select
  using (bucket_id = 'omni-content' and public.is_admin(auth.uid()));
