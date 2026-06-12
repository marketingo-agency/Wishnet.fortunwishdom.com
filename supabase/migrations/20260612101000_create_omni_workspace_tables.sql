-- Omni workspace: multimodal creation agent.
-- 5 tables: omni_settings (per-user defaults), omni_runs (persisted wizard state machine),
-- omni_assets (per-variant generated media records), content_library_items and
-- content_library_posts (Pulse Content Library plus posting queue).
-- RLS: omni_* tables are owner-scoped (auth.uid() = user_id) plus an admin SELECT on
-- omni_assets so the admin-shared Content Library can render variant media.
-- content_library_* tables are admin-only shared, consistent with the Pulse workspace.

-- omni_settings: one row per user
create table if not exists public.omni_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  analysis_provider text not null default 'openai',
  analysis_model text,
  default_variants integer not null default 2,
  defaults jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.omni_settings enable row level security;
create policy "Users can manage own omni settings"
  on public.omni_settings for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger omni_settings_updated_at
  before update on public.omni_settings
  for each row execute function public.update_updated_at_column();

-- omni_runs: persisted wizard state machine (one row per workflow run)
create table if not exists public.omni_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('omni_images','transform_upscale','repurposing','surprise_me','brainstorming')),
  title text,
  current_step integer not null default 1,
  step_state jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','completed','failed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists omni_runs_user_idx on public.omni_runs (user_id);
create index if not exists omni_runs_status_idx on public.omni_runs (status);
create index if not exists omni_runs_mode_idx on public.omni_runs (mode);

alter table public.omni_runs enable row level security;
create policy "Users can manage own omni runs"
  on public.omni_runs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger omni_runs_updated_at
  before update on public.omni_runs
  for each row execute function public.update_updated_at_column();

-- omni_assets: one row per generated variant (links run, model, storage, lineage)
create table if not exists public.omni_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references public.omni_runs(id) on delete cascade,
  parent_asset_id uuid references public.omni_assets(id) on delete set null,
  kind text not null default 'image' check (kind in ('image','audio','video')),
  model_id text,
  prompt text,
  storage_path text,
  mime_type text,
  width integer,
  height integer,
  status text not null default 'pending' check (status in ('pending','generating','done','failed','discarded')),
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists omni_assets_run_idx on public.omni_assets (run_id);
create index if not exists omni_assets_user_idx on public.omni_assets (user_id);
create index if not exists omni_assets_parent_idx on public.omni_assets (parent_asset_id);
create index if not exists omni_assets_status_idx on public.omni_assets (status);

alter table public.omni_assets enable row level security;
create policy "Users can manage own omni assets"
  on public.omni_assets for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins can view omni assets"
  on public.omni_assets for select to authenticated
  using (public.is_admin(auth.uid()));

create trigger omni_assets_updated_at
  before update on public.omni_assets
  for each row execute function public.update_updated_at_column();

-- content_library_items: finalized Omni outputs consulted from Pulse (admin-shared)
create table if not exists public.content_library_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  source_run_id uuid references public.omni_runs(id) on delete set null,
  networks text[] not null default '{}',
  status text not null default 'ready' check (status in ('ready','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_library_items_status_idx on public.content_library_items (status);
create index if not exists content_library_items_source_run_idx on public.content_library_items (source_run_id);
create index if not exists content_library_items_created_by_idx on public.content_library_items (created_by);

alter table public.content_library_items enable row level security;
create policy "Admins manage content_library_items"
  on public.content_library_items for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create trigger content_library_items_updated_at
  before update on public.content_library_items
  for each row execute function public.update_updated_at_column();

-- content_library_posts: per-network posting queue for library items (admin-shared)
create table if not exists public.content_library_posts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.content_library_items(id) on delete cascade,
  network text not null check (network in ('facebook','instagram','x','tiktok')),
  asset_id uuid references public.omni_assets(id) on delete set null,
  caption text,
  scheduled_at timestamptz,
  status text not null default 'draft' check (status in ('draft','queued','scheduled','posted','failed')),
  error text,
  posted_at timestamptz,
  external_post_id text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_library_posts_item_idx on public.content_library_posts (item_id);
create index if not exists content_library_posts_dispatch_idx on public.content_library_posts (status, scheduled_at);
create index if not exists content_library_posts_network_idx on public.content_library_posts (network);
create index if not exists content_library_posts_asset_idx on public.content_library_posts (asset_id);

alter table public.content_library_posts enable row level security;
create policy "Admins manage content_library_posts"
  on public.content_library_posts for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create trigger content_library_posts_updated_at
  before update on public.content_library_posts
  for each row execute function public.update_updated_at_column();

-- Seed the agent_settings row so the Nexus toggle and Osha status resolution work.
insert into public.agent_settings (agent_id, model, provider, is_active, temperature, max_tokens, system_prompt)
values ('omni', 'gpt-4o', 'openai', true, 0.7, 4096, 'You are Omni, the Multimodal Creation AI of Fortun Wishnet.')
on conflict do nothing;
