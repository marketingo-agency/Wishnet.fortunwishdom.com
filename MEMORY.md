# MEMORY — Working Memory

## Current Task
Build the Omni agent (multimodal creation workspace). Canonical spec + approved decisions: OMNI_SPEC.md at repo root. Recon: AGENT_RECON_PROMPTOR_PIXEL.md (read in full).

## Plan Status
- DONE — Phase 0 Scaffolding (commit 4690291).
- DONE pending Sam's one-click e2e — Phase 1 FAL LAYER: dynamic catalog via documented GET api.fal.ai/v1/models (live-probed; `q` param, upscalers under image-to-image) + static outage fallback in fal-catalog.ts; generic queue runner fal-runner.ts (queue.fal.run, server-side URL reconstruction, FalUserError mapping incl. 422 schema detail); 4 edge actions (list-fal-models, fal-submit, fal-status, fal-test-generate admin); omni v2 deployed; useFalCatalog + OmniFalHealthCard in Images hub. Sam's fal key in llm_settings (verified present).
- Phase 2 OMNI IMAGES, Phase 3 TRANSFORM, Phase 4 PULSE CONTENT LIBRARY + REPURPOSING, Phase 5 HISTORY, Phase 6 SURPRISE ME, Phase 7 BRAINSTORMING, Phase 8 POLISH + QA.

## Key Decisions
- All approved decisions live in OMNI_SPEC.md "APPROVED DECISIONS" (identity cyan-violet/Orbit, RLS split owner-scoped vs admin-shared library, additive registry lines sanctioned, fal via raw queue.fal.run fetch, files bucket + Omni AI sector, rate limit 30/min).
- omni edge deployed verify_jwt=true + full in-function auth (v1). osha-chat agentMeta line STAGED but NOT deployed (deferred to Phase 8, CLI byte-exact).
- agent_settings row seeded for omni (Nexus toggle + Osha status work).
- Lint baseline now 37 warnings (was 36): the +1 is omni/page.tsx metadata export, same react-refresh pattern as every other agent page.

## Current State
Phase 1 code complete on feat/omni; omni edge v2 ACTIVE. Dev server live on :8000 (skip npm run build while it runs; a corrupt .next/dev/types/validator.ts was deleted once mid-QA, dev regenerates it). tsc exit 0, eslint clean on omni files. Awaiting Sam's one click on "Run test generation" in /ai-agents/omni?track=images (admin button in the fal.ai Engine card) to satisfy the verified-e2e acceptance; confirm via edge logs after, then commit Phase 1.

## Next Steps When Resuming
1. Read OMNI_SPEC.md first (operating rules: present per-phase plan, STOP for Sam's go).
2. If Phase 1 not yet committed: ask Sam to click the test button, verify via Supabase get_logs, then commit `feat(omni): phase 1 fal layer...`.
3. Then present the Phase 2 plan (Omni Images 12-step wizard).
4. Remember: pg_cron availability still unverified (needed Phase 4); verify via Supabase MCP list_extensions then.
