# MEMORY — Working Memory

## Current Task
Build the Omni agent (multimodal creation workspace). Canonical spec + approved decisions: OMNI_SPEC.md at repo root. Recon: AGENT_RECON_PROMPTOR_PIXEL.md (read in full).

## Plan Status
- DONE — Phase 0 Scaffolding (commit 4690291).
- DONE — Phase 1 FAL LAYER (commits caece6f + 9e65f6d, omni edge v5): dynamic catalog via GET api.fal.ai/v1/models + static outage fallback; generic queue runner; 4 edge actions; useFalCatalog + OmniFalHealthCard. E2E VERIFIED via Playwright: live catalog 100+ models, flux/schnell generation 2.9s, thumbnail rendered. Bug fixed live: fal queue status/result URLs use the BASE app id (first 2 segments, subpaths dropped); nested path 405s. Health-check image returned as data URI (CSP allows data:, not fal.media; user-facing renders use Supabase signed URLs).
- DONE — Phase 2 OMNI IMAGES (omni edge v6): full 12-step wizard e2e-verified via Playwright on run 9d2add47 (multi-model schnell+Z-Turbo live progressive generation, regenerate-variation, 4 Promptor descriptions, networks IG+X, 6-output repurpose = 4 canvas crops + 2 nano-banana AI extends with exact-pixel final crop, approval, finalize). DB verified: 1 item + 6 posts + run completed + 13 assets. Live fixes: StrictMode stopRef reset (BUG-01 class), DB-driven resume-aware generation start (restores existing + submits missing), assets-query invalidation past step 5, repurpose matrix waits for assets, CSP img-src + fal.media/GCS gallery paths (next.config.ts; dev server restarted), StepLockPrompt local busy state.
- DONE — Phase 3 TRANSFORM AND UPSCALE (omni edge v7): analyze-image (vision OpenAI/Gemini + hybrid match_knowledge brain+wishpedia w/ query_text + priority-ordered Heart + fenced untrusted context) e2e-verified on run 02324df6 (33 Heart rules + 20 chunks injected; conclusion cited canon). Transform wizard 6 steps; StepModels capability prop + Upscalers toggle; variant-submit i2i shaping (upscalers image_url singular/no prompt, edit family image_urls); finalize item_only branch (metadata.asset_ids, 0 posts); handoff to OmniImagesWizard step 7 on same run VERIFIED; direct save VERIFIED in DB. New budgets OMNI_VISION_DESCRIBE/OMNI_ANALYSIS. Known seam: a handed-off run reopened via mode=transform_upscale URL with current_step>6 renders empty (Phase 5 routes by step).
- Phase 4 PULSE CONTENT LIBRARY + REPURPOSING MODE, Phase 5 HISTORY, Phase 6 SURPRISE ME, Phase 7 BRAINSTORMING, Phase 8 POLISH + QA.

## Key Decisions
- All approved decisions live in OMNI_SPEC.md "APPROVED DECISIONS" (identity cyan-violet/Orbit, RLS split owner-scoped vs admin-shared library, additive registry lines sanctioned, fal via raw queue.fal.run fetch, files bucket + Omni AI sector, rate limit 30/min).
- omni edge deployed verify_jwt=true + full in-function auth (v1). osha-chat agentMeta line STAGED but NOT deployed (deferred to Phase 8, CLI byte-exact).
- agent_settings row seeded for omni (Nexus toggle + Osha status work).
- Lint baseline now 37 warnings (was 36): the +1 is omni/page.tsx metadata export, same react-refresh pattern as every other agent page.

## Current State
Phase 1 complete and e2e-verified on feat/omni; omni edge v5 ACTIVE. Dev server live on :8000 (skip npm run build while it runs). Temp QA admin claude.qa@wishnet.internal (user 1a65e05b-7251-4f3b-9411-33d077a09758) exists for Playwright self-testing per Sam's instruction; DELETE in Phase 8. Waiting for Sam's go on Phase 2.

## Next Steps When Resuming
1. Read OMNI_SPEC.md first (operating rules: present per-phase plan, STOP for Sam's go).
2. Present the Phase 2 plan (Omni Images 12-step wizard: run engine actions on omni_runs/omni_assets, batched fal-status polling, storage persistence to files bucket + Omni AI sector, Promptor steps, networks/dimensions registry, repurposing pipeline, save to Content Library tables).
3. Lessons to carry: fal queue status/result URLs drop model subpaths (use first 2 segments); Supabase request-log analytics lag minutes and omit console output (debug via temporary response detail + Playwright repro); verify interactive flows yourself via Playwright with the QA admin.
4. pg_cron availability still unverified (needed Phase 4); check list_extensions then.
