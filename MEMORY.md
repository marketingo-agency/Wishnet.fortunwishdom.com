# MEMORY — Working Memory

## Current Task
Autonomous three-plan Omni program (Images → Videos → Audios), Part One (build). Full state: **plans/EXECUTION_LOG.md** (single source of truth). Plans are LAW.

## Plan Status
- Plan 1 (Images overhaul, branch feat/omni-studio-overhaul): Phases 0–8 DONE — Phase 9 (History overhaul) ACTIVE
- Plan 2 (Videos track): pending
- Plan 3 (Audios track): pending
- Part One report + STOP for Sam's go: pending

## Key Decisions
- CLI unauthenticated → all edge deploys via Supabase MCP with mandatory byte-diff readback (full file set; omni verify_jwt TRUE; content-library/omni-finisher FALSE).
- omni v31 LIVE (repurpose-submit tier-2 extend; byte-verified 16/16 IDENTICAL).
- Deploy payload ceiling ~147.6KB escaped → omni edge comments ASCII-fied (now 143.6KB); partial file sets never bundle.
- v2 stage schema flipped (ACTIVE_SCHEMA_VERSION=2); registry = src/components/omni/stepRegistry.ts.

## Current State
Phase 8 closed: 3-tier repurposing (crop/extend/redesign) live end-to-end, omni v31 deployed + smoke-probed (gateway 401 gate + OPTIONS 200 boot). Gates green: tsc clean, lint 0 errors/38 warnings, 101 tests. QA-admin login still blocked (log → Open issues) — browser-gated checks deferred to Phase 11/12/Part Two.

## Next Steps When Resuming
1. Read plans/EXECUTION_LOG.md "Current position" → Phase 9 (History overhaul).
2. History thumbnails/cost chips/bulk ops/pagination + HIST-04 cascade check.
3. content-library `delete-items-by-run` action → MCP deploy verify_jwt FALSE + byte-diff.
4. Then Phases 10–13, then Plans 2–3, then STOP for Part One report.
