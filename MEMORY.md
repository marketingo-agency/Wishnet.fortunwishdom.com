# MEMORY — Working Memory

## Current Task
Build the Omni agent (multimodal creation workspace). Canonical spec + approved decisions: OMNI_SPEC.md at repo root.

## Plan Status
- DONE — Phase 0 Scaffolding (commit 4690291).
- DONE — Phase 1 FAL LAYER (omni edge v5): dynamic catalog + queue runner, e2e-verified. Lesson: fal queue status/result URLs use the BASE app id (first 2 path segments).
- DONE — Phase 2 OMNI IMAGES (omni edge v6): 12-step wizard e2e-verified on run 9d2add47 (1 item + 6 posts + 13 assets).
- DONE — Phase 3 TRANSFORM AND UPSCALE (omni edge v7): analyze-image RAG/Heart-grounded, i2i/upscale, item-only save + step 7 handoff, e2e-verified on run 02324df6.
- DONE — Phase 4 PULSE CONTENT LIBRARY + REPURPOSING MODE: content-library edge v1 (verify_jwt=false, SEC-006; cron path via DB-seeded secret in pulse_connections provider='omni_dispatch'; admin path JWT+is_admin+30/min). Migration 20260612120000: pg_net enabled, secret seeded, cron.schedule 'content-library-dispatch' */5 (jobid 5). Connectors: Meta FB/IG real (gated on pulse_connections 'meta' row), x/tiktok honest NotConnectedError stubs -> posts park as 'queued'. Pulse Library tab (8th tab, the ONLY PulseAgent edit): src/components/pulse/library/ (grid + filters + item Sheet w/ post-now/schedule/unschedule + connections strip + x/tiktok key dialog + run dispatch). Mode 3 repurpose-mode/ wizard (multi-source: upload/Files/Content Library -> mode 'repurposing' run -> handoff step 7). E2E-verified via Playwright: schedule->Scheduled, post-now->honest Queued w/ connector detail, manual dispatch {0 posted,1 queued,0 failed}, CRON LIVE (net._http_response 200 via:'cron'), Mode 3 full run 04d6e6f1 -> 3rd item (1 X post, smart crop 1080x1080 from a cross-user Content Library source). tsc clean; lint 0 errors (39 warnings, 0 from Phase 4 files).
- NEXT — Phase 5 HISTORY (retake/resume; fix the step>6 URL seam below), Phase 6 SURPRISE ME, Phase 7 BRAINSTORMING, Phase 8 POLISH + QA.

## Key Decisions
- Approved decisions live in OMNI_SPEC.md "APPROVED DECISIONS".
- Cron dispatch auth: random uuid secret in pulse_connections (provider 'omni_dispatch'), validated in-function; no human secret setup needed.
- Mode 3 references existing storage paths via NEW owner-scoped omni_assets rows (dims copied) — never moves bytes; service-role signs cross-user reads (library-asset-urls edge action).
- osha-chat omni agentMeta line still STAGED, deploy in Phase 8 (CLI byte-exact).

## Current State
Phase 4 complete and e2e-verified on feat/omni (uncommitted — commit next). Dev server live on :8000 (skip npm run build). Temp QA admin claude.qa@wishnet.internal (1a65e05b-7251-4f3b-9411-33d077a09758) — DELETE in Phase 8. Test data left in place for Sam: 1 X post Scheduled tonight 23:30 + 1 IG post Queued (cron re-parks them honestly every 5 min — by design). Known seam: reopening a handed-off run via mode=transform_upscale/repurposing URL with current_step>6 renders empty; Phase 5 routes by step.

## Next Steps When Resuming
1. Read OMNI_SPEC.md (operating rules: per-phase plan, STOP for Sam's go).
2. Commit Phase 4 if not yet committed (check git status).
3. Present the Phase 5 plan (History mode: run list, retake, resume-at-step routing incl. the step>6 seam).
4. REQUIRES HUMAN (for live publishing, not blocking): Meta app id/secret + page OAuth (+ ig_user_id in pulse_connections config), X API paid-tier keys, TikTok Content Posting API approval.
