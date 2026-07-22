-- Drop the permission columns for the removed Fortun Wishdom, Marketing Hub and
-- Taskforce sections.
--
-- Those three nav sections were never built: every page under them was a
-- ComingSoon stub. The routes, nav entries, ToolKey union members and the
-- Settings toggles were removed in the same change, so these 13 columns have no
-- reader left in the app.
--
-- Verified safe before writing this migration:
--   * 2 rows in user_permissions, ZERO with a non-default value on any of these
--     columns (nothing was ever granted).
--   * No RLS policy, view, index, constraint or function references any of them.
--
-- Deliberately NOT touched:
--   * the `permission_level` enum - files_manager, mastermind, ai_agents and
--     wishnetrium still use it.
--   * the adjacent `wishnetrium*` columns - out of scope for this change.

ALTER TABLE public.user_permissions
  DROP COLUMN IF EXISTS wishdom,
  DROP COLUMN IF EXISTS wishdom_can_access_main,
  DROP COLUMN IF EXISTS wishdom_can_access_plushes,
  DROP COLUMN IF EXISTS wishdom_can_access_figurines,
  DROP COLUMN IF EXISTS wishdom_can_access_cards,
  DROP COLUMN IF EXISTS wishdom_can_access_stocks,
  DROP COLUMN IF EXISTS marketing_hub,
  DROP COLUMN IF EXISTS marketing_can_access_plan,
  DROP COLUMN IF EXISTS marketing_can_access_operations,
  DROP COLUMN IF EXISTS taskforce,
  DROP COLUMN IF EXISTS taskforce_can_create,
  DROP COLUMN IF EXISTS taskforce_can_edit,
  DROP COLUMN IF EXISTS taskforce_can_delete;
