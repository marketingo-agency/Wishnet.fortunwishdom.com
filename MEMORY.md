# MEMORY - Working Memory

## Current Task
Erase the Marketing Hub, Fortun Wishdom and Taskforce sections end-to-end. Code COMPLETE and committed-ready; ONE step left (osha-chat deploy) which needs Sam.

## Plan Status
- [x] **Phase 0 - Baseline & hygiene** DONE - no dev server was running; caches purged; baseline green.
- [x] **Phase 1 - Pages & entry points** DONE - 9 page.tsx + 3 dirs deleted; PixelTopBar Wishdom buttons + `Package` import removed; Header routeLabels stripped; 6 redirect rules added.
- [x] **Phase 2 - Release-notes copy** DONE - p3 + p5 deleted, p2 reworded, mockData L10/L17 fixed; `isFeatured` + `in-progress` entries preserved.
- [x] **Phase 3 - Registry (atomic)** DONE - routeConfig, ComingSoonRoute, navigation, AppSidebar, Dashboard.
- [x] **Phase 4 - Permission layer** DONE - ToolKey 6->3, useUserPermissions, EditUserSheet, UsersManagement, types/user.ts last (tsc clean = proof).
- [x] **Phase 5 - DB** DONE - migration 20260722120000 APPLIED LIVE + mirrored; 13 columns gone (0 remaining, 30 left); types.ts -39 lines.
- [x] **Phase 6 - Osha edge + docs** EDIT DONE, **DEPLOY PENDING** (needs Sam's Supabase token). Current-state docs updated; historical audit docs deliberately left as snapshots.
- [x] **Phase 7 - QA** DONE - security-auditor **PASS 0C/0H/0M/0L**; code-reviewer **Approve** (0 Critical; its finding `SimpleNavItem.badge` FIXED). tsc 0, lint 0 errors (38->29 warnings), 133 tests, cold build green.

## Key Decisions
- Redirects (307 -> /dashboard) chosen over bare 404s because `app/not-found.tsx` fires a Sentry warning on every 404.
- DB columns dropped (not left dormant). Verified 0 rows non-default, 0 policy/view/index/constraint/function refs.
- Historical audit docs NOT rewritten - they are point-in-time records. A NEW CLAUDE.md entry was added instead.
- `wishnetrium` + 3 granular columns left alone: now the only dead permission surface, flagged for a future pass.

## Current State
Working tree has 9 deletions + ~21 edits + 1 new migration, NOT yet committed or pushed. All gates green. The DB migration is ALREADY LIVE, so production currently runs OLD code against the NEW schema - a permission SAVE from the live site would 400 (PGRST204) until the app deploys. Pushing to main (VPS auto-deploy) closes that window.

## Next Steps When Resuming
1. Commit the changeset, then get Sam's go to push to main (auto-deploys to the VPS and closes the schema/code window).
2. Get Sam's Supabase access token and run `npx supabase functions deploy osha-chat --project-ref zlmideilxfnokemzkavm` (NEVER pass --no-verify-jwt; config.toml pins it false).
3. Live visual pass of the sidebar + dashboard (auth-gated).

## Pending human actions (carried over, unrelated)
- Metricool: Advanced plan + API token -> Omni > Content > Connections -> pick brand; then the live E2E.
- ROTATE the Supabase access token used for CLI deploys + the fal key.
- Live visual pass: Queue media cards + lightbox, schedule picker, 10-network chips, Plan-in-Desk buttons.
