-- Drop the orphaned Wishnetrium permission columns.
--
-- Follow-up to 20260722120000. After the Marketing Hub / Fortun Wishdom /
-- Taskforce removal, these 4 columns were the last dead permission surface in
-- the table: no `ToolKey` member, no route, no nav entry, no Settings toggle,
-- and no application reader anywhere in src/ (the only code mention was the
-- generated `integrations/supabase/types.ts`, updated in the same change).
--
-- Verified safe before writing this migration:
--   * 2 rows in user_permissions, ZERO with a non-default value on any of these
--     columns.
--   * No RLS policy, view, index, constraint or function references any of them.
--
-- Deliberately NOT touched: the `permission_level` enum. It is still used by
-- the three surviving tool columns (files_manager, mastermind, ai_agents).

ALTER TABLE public.user_permissions
  DROP COLUMN IF EXISTS wishnetrium,
  DROP COLUMN IF EXISTS wishnetrium_can_access_wishfeed,
  DROP COLUMN IF EXISTS wishnetrium_can_access_wishper,
  DROP COLUMN IF EXISTS wishnetrium_can_access_wishprint;
