-- Omni agent per-user access flag (PERM-01 pattern: enforced at the route level).
-- Default true matches every other ai_can_access_* column.
alter table public.user_permissions
  add column if not exists ai_can_access_omni boolean default true;
