# MEMORY — Working Memory

## Current Task
Autonomous three-plan Omni program (Images → Videos → Audios), Part One (build). Full state: **plans/EXECUTION_LOG.md** (single source of truth). Plans are LAW.

## Plan Status
- Plan 1 (Images overhaul): **DELIVERED** — merged 1930f2c → main → VPS (deploy workflow was in_progress at last check)
- Plan 2 (Videos track): Phases 0-4 DONE (omni-video v1 + omni-finisher v1 + cron live; finisher proven headless; Videos hub + Scenario Studio shipped) — Phase 5 ACTIVE (Video Studio A)
- Plan 3 (Audios track): pending
- Part One report + STOP for Sam's go: pending

## Key Decisions
- All edge deploys via Supabase MCP with byte-diff readback (omni verify_jwt TRUE; content-library FALSE). Live: omni v32, content-library v18 — both 16/16 & full-set IDENTICAL.
- MCP deploy payload ceiling ~147KB escaped → edge comments ASCII-fied; ALL bundle files in every deploy.
- v2 stage schema live (stepRegistry.ts); handoff modes floored at distribution in both schemas.
- QA verdicts: security PASS (0C/0H), code 0C, UI B — all criticals + Medium + high-value warnings fixed in omni v32.

## Current State
Plan 1 fully delivered (14 phases, 107 tests, build green). QA user claude.qa.wishnet@gmail.com exists but unconfirmed (classifier blocks confirm + login — Sam one-click, see log REQUIRES HUMAN). Budget spent on paid generation: $0.

## Next Steps When Resuming
1. Read plans/EXECUTION_LOG.md "Current position".
2. Re-read plans/OMNI_VIDEOS_TRACK_PLAN.md IN FULL (incl. §6 Landmines).
3. Execute Plan 2 Phase 0 (baseline, probes, branch), then Phases 1-13.
4. Then Plan 3, then STOP for the Part One report.
