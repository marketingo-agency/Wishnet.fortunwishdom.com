# MEMORY — Working Memory

## Current Task
Build the Omni agent (multimodal creation workspace). Canonical spec + approved decisions: OMNI_SPEC.md at repo root. Recon: AGENT_RECON_PROMPTOR_PIXEL.md (read in full).

## Plan Status
- DONE — Phase 0 Scaffolding: registration touchpoints, permission column, 5 tables + RLS, omni edge v1 deployed, entry shell with 4 tiles + Images hub skeleton + data-omni-theme + fullscreen. QA green (tsc, lint 0 errors, build). Committed on feat/omni.
- NEXT (awaiting go) — Phase 1 FAL LAYER: model catalog module + generic queue runner + capability metadata + verified e2e test generation.
- Phase 2 OMNI IMAGES, Phase 3 TRANSFORM, Phase 4 PULSE CONTENT LIBRARY + REPURPOSING, Phase 5 HISTORY, Phase 6 SURPRISE ME, Phase 7 BRAINSTORMING, Phase 8 POLISH + QA.

## Key Decisions
- All approved decisions live in OMNI_SPEC.md "APPROVED DECISIONS" (identity cyan-violet/Orbit, RLS split owner-scoped vs admin-shared library, additive registry lines sanctioned, fal via raw queue.fal.run fetch, files bucket + Omni AI sector, rate limit 30/min).
- omni edge deployed verify_jwt=true + full in-function auth (v1). osha-chat agentMeta line STAGED but NOT deployed (deferred to Phase 8, CLI byte-exact).
- agent_settings row seeded for omni (Nexus toggle + Osha status work).
- Lint baseline now 37 warnings (was 36): the +1 is omni/page.tsx metadata export, same react-refresh pattern as every other agent page.

## Current State
Phase 0 shipped and committed on branch feat/omni (off fix/vercel-install). /ai-agents/omni builds and renders: 4 tiles (Images -> 6-mode chooser skeleton, all modes disabled; Brainstorming "In Development"; Audios/Videos "Coming Soon"), theme toggle, fullscreen, inactive overlay. Edge omni v1 live (get-settings/save-settings + clean fetchHeartRules ready). framer-motion 12.40.0 installed.

## Next Steps When Resuming
1. Read OMNI_SPEC.md first (operating rules: present per-phase plan, STOP for Sam's go).
2. Present the Phase 1 plan (fal catalog module shape, queue runner, capability metadata, e2e test needs Sam's fal key = REQUIRES HUMAN).
3. Remember: pg_cron availability still unverified (needed Phase 4); verify via Supabase MCP list_extensions then.
