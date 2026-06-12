# MEMORY — Working Memory

## Current Task
Build the Omni agent (multimodal creation workspace). Canonical spec + approved decisions: OMNI_SPEC.md at repo root.

## Plan Status
- DONE — Phase 0 Scaffolding, Phase 1 FAL LAYER (omni edge v5), Phase 2 OMNI IMAGES (v6), Phase 3 TRANSFORM AND UPSCALE (v7), Phase 4 PULSE CONTENT LIBRARY + REPURPOSING MODE (content-library edge v1 + cron jobid 5, commit 7df5ba3). Details in project CLAUDE.md after Phase 8 delivery; key lessons inline below.
- DONE — Phase 5 HISTORY: registry (src/components/omni/history/: HistoryView, HistoryRunCard, useOmniHistory, historyRouting), resume-at-any-step (step chips, active/failed runs only), retake-as-clone (fresh run, re-referenced sources, no stale downstream keys), selective + clear-all delete w/ confirmation (hard delete spares bytes referenced by OTHER runs; completed/archived runs protected because finalize=library-backed; archive toggle). Seam fixed: TransformWizard auto-hands-off step>=7 on SERVER truth; handoff non-optimistic; OmniImagesWizard step-6 loader fallback; back-from-7 gated by run mode (transform/repurposing runs cannot fall into t2i branches); max_step_reached high-water in step_state; step-10 restore-aware seeding + incremental onProgress persist of repurposed refs (exit/refresh mid-step no longer re-bills); isFetching gate on step 10; repurpose runner unmount stop + poll error tolerance + latest-state job lookup. ADVERSARIAL REVIEW (19-agent workflow): 16 confirmed findings, all 3 distinct HIGHs + 9 mediums FIXED; e2e re-verified via Playwright (registry+covers, step-jump seeded restore, stale-URL auto-forward, retake clone DB-verified, delete row+assets+storage verified, clear-all skipped 3 protected, archive toggle). tsc clean; lint 0 errors (39-warning baseline unchanged).
- NEXT — Phase 6 SURPRISE ME, Phase 7 BRAINSTORMING, Phase 8 POLISH + QA.

## Key Decisions
- Approved decisions live in OMNI_SPEC.md "APPROVED DECISIONS".
- History delete protection = run.status in (completed, archived) (finalize is the only path to completed; archived implies was-completed). Status heuristic accepted over live library-reference checks (RLS: non-admins cannot read content_library_*).
- Retake = CLONE into a new run (never rewind the original): old assets can never satisfy a new plan, no phantom approvals.
- DEFERRED to Phase 8 (edge changes batch with the osha-chat CLI deploy): finalize-run idempotency (re-finalizing a completed run from step 12 currently inserts a DUPLICATE content_library_items row; canJump gating removed the main path, but Open at step 12 + Save still allows it).
- osha-chat omni agentMeta line still STAGED, deploy in Phase 8 (CLI byte-exact).

## Current State
Phase 5 complete, review-hardened, e2e-verified on feat/omni (commit pending as last action). Dev server live on :8000 (skip npm run build). Temp QA admin claude.qa@wishnet.internal (1a65e05b-7251-4f3b-9411-33d077a09758) — DELETE in Phase 8 (its 3 completed test runs + 3 library items go with it). Pulse library test data: 1 X post Scheduled + 1 IG post Queued (cron re-parks honestly every 5 min, by design).

## Next Steps When Resuming
1. Read OMNI_SPEC.md (operating rules: per-phase plan, STOP for Sam's go).
2. Verify Phase 5 commit exists on feat/omni (else commit).
3. Present the Phase 6 plan (Surprise Me: mine Brain/Wishpedia via RAG for concrete creation ideas -> prefilled handoff into Omni Images; likely new omni edge action with OMNI_* token budget).
4. REQUIRES HUMAN (live publishing, not blocking): Meta app id/secret + page OAuth (+ ig_user_id), X API paid-tier keys, TikTok Content Posting API approval.
