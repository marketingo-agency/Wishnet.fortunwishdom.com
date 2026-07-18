-- Metricool auto-publish foundations (Phase 2).
-- Adds the approval layer to Publishing Desk posts, the per-target Auto/Manual
-- publish lane + Metricool linkage, and the Metricool connection storage.

-- 1) Posts: approval lifecycle -------------------------------------------
-- draft -> pending_approval -> approved (armed) -> partially_published ->
-- published -> archived. 'scheduled' stays legal for pre-approval-layer rows.
alter table public.omni_content_posts
  drop constraint omni_content_posts_status_check;
alter table public.omni_content_posts
  add constraint omni_content_posts_status_check
  check (status in ('draft','pending_approval','approved','scheduled','partially_published','published','archived'));

alter table public.omni_content_posts
  add column approved_by uuid,
  add column approved_at timestamptz,
  add column rejected_reason text;

-- 2) Targets: publish lane + Metricool linkage ---------------------------
-- publish_mode: 'auto' = pushed to Metricool on approval (autoPublish),
-- 'manual' = worked by a human in the Publish Queue (the existing lane).
-- metricool_status mirrors ProviderStatus.status (PUBLISHED/PUBLISHING/
-- PENDING/AWAITING_CONFIRMATION/ERROR/DRAFT); sync_error carries
-- detailedStatus / push failures for honest surfacing.
alter table public.omni_content_targets
  add column publish_mode text not null default 'manual'
    check (publish_mode in ('auto','manual')),
  add column metricool_post_id text,
  add column metricool_status text,
  add column sync_error text,
  add column last_synced_at timestamptz;

create index idx_omni_content_targets_metricool
  on public.omni_content_targets(metricool_post_id)
  where metricool_post_id is not null;

-- 3) Metricool connection (token + brand + cached health) ----------------
-- SERVICE-ROLE ONLY: RLS is enabled with ZERO policies, so no client can
-- ever select the api_token. All access goes through the admin-gated
-- omni-content edge function, which never returns the token.
create table public.omni_content_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique check (provider in ('metricool')),
  api_token text not null,
  metricool_user_id text not null,
  blog_id text,
  brand_label text,
  brand_timezone text,
  networks jsonb not null default '{}'::jsonb,
  pinterest_boards jsonb not null default '[]'::jsonb,
  last_checked_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.omni_content_connections enable row level security;
-- No policies on purpose: clients (even admins) are denied; only the
-- service-role edge function reads/writes this table.

create trigger update_omni_content_connections_updated_at
  before update on public.omni_content_connections
  for each row execute function public.update_updated_at_column();
