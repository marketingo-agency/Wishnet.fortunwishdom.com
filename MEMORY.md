# MEMORY — Working Memory

## Current Task
EXECUTING the pre-approved three-plan Omni program (Images → Videos → Audios) autonomously. Single source of truth for progress: `plans/EXECUTION_LOG.md`. Plans are LAW: `plans/OMNI_IMAGES_OVERHAUL_PLAN.md` → `OMNI_VIDEOS_TRACK_PLAN.md` → `OMNI_AUDIOS_TRACK_PLAN.md`.

## Plan Status (Plan 1 — Images overhaul, branch feat/omni-studio-overhaul)
- DONE — Phase 0 baseline (SIB-01 NOT live-reproducible: prod model is gpt-4.1 → no deploy #1; Q4 clear)
- DONE — Phase 1 edge fixes CODE-ONLY (44e8ed1) — deploy batches into omni #2
- DONE — Phase 2 test harness (32ba0cc): Vitest 4.1.10, 91 tests now
- DONE — Phase 3 step registry (6a2b8dd): D-REG, identity v1 adapter, HIST-03/11 fixed
- DONE — Phase 4 entry/hub/fold/rename (38bdb21 + f21d2b4): fal bar on entry, 6-card hub, InspireMe fold, "Studio" rename
- ACTIVE — Phase 5 Knowledge Context Engine + omni deploy #2 (via Supabase MCP + byte-diff readback; CLI unauthenticated)
- Then: 6 (stages 1-3) · 7 (stages 4-7 + flip) · 8 (repurpose v2) · 9 (History) · 10 (Character Studio) · 11 (UI) · 12 (QA) · 13 (delivery). Then Plans 2 and 3.

## Key Decisions
- CLI unauthenticated → ALL backend via Supabase MCP with mandatory byte-diff readback (get_edge_function vs local) + verify_jwt checks (omni true; content-library/omni-finisher false).
- Gate override active (Sam pre-authorized): phase gates are self-verified checkpoints; stop only on unfixable acceptance failure / hard external blocker / budget cap ($15 Part One).
- QA-admin login BLOCKED headless (classifier denies auth.users writes; GoTrue needs email confirm). Browser-gated acceptance items deferred → Phase 11/12 + REQUIRES HUMAN. See EXECUTION_LOG Open issues.

## Current State
Plan 1 Phase 5 starting: context.ts engine, brainstorm hardening, opt-in heartDigest in variant-submit, generate-captions action, then omni deploy #2 (first deploy of the program — carries Phase 1's staged fixes too).

## Next Steps When Resuming
1. Read `plans/EXECUTION_LOG.md` "Current position" and resume exactly there.
2. If a fresh session: re-paste the execution mega-prompt; STEP 0 bootstrap resumes from the log.
