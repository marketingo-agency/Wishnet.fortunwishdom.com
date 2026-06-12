# MEMORY — Working Memory

## Current Task
Build the Omni agent (multimodal creation workspace). Canonical spec + approved decisions: OMNI_SPEC.md at repo root.

## Plan Status
- DONE — Phases 0-6: scaffolding, fal layer, Omni Images, Transform/Upscale, Pulse Content Library + Mode 3 (7df5ba3), History review-hardened (84793e3), Surprise Me (0abbd4a).
- DONE — Phase 7 BRAINSTORMING (omni edge v9): brainstorm.ts (chat + lock) with actions `brainstorm-chat` (Heart rules + hybrid retrieveKnowledge fenced untrusted, per-message provider/model picker validated against keys, image attachments 3x3MB OpenAI data-URL/Gemini inline, bytes NEVER persisted) and `brainstorm-lock` (JSON {title,objective}); budgets OMNI_BRAINSTORM_CHAT/LOCK. Session = omni_runs row mode 'brainstorming', conversation in step_state.messages (cap 80). Lock updates the SAME run (title + objective + idea_locked) and hands to the Omni Images wizard step 1. resolveSurfaceForRun: unlocked brainstorm -> chat, locked/advanced -> wizard. ownsEarlySteps += brainstorming. Track tile + hub card both open the same surface (track=brainstorming URL aliased). Client: brainstorm/ (View/Message/Composer w/ Promptor wand, attach previews, provider+model Selects from llmModels registries, Surprise Me switch), useBrainstorm.ts hooks. E2E-verified via Playwright + SQL: grounded chat cited real canon (Wishu capsule form; Guardian card glyphic borders) w/ 20 chunks + 33 Heart rules; lock -> same run, LLM title "Wishu's Cozy Winter Wish", faithful prefilled brief at step 1, idea_locked true + 4 messages preserved in SQL; resume-after-lock -> wizard, resume-before-lock -> chat restored; Promptor wand rewrite verified; Surprise Me switch verified. tsc + lint clean, 0 console errors. NOT live-tested: image-attachment vision turn (code mirrors the verified analyze-image shapes), Gemini provider switch (same validated code path).
- NEXT — Phase 8 POLISH + QA (final phase).

## Key Decisions
- Approved decisions live in OMNI_SPEC.md "APPROVED DECISIONS".
- Brainstorm sessions are runs (no new table); messages in step_state jsonb; attachment bytes never persisted (names only).
- fal text-gateway models excluded from the chat picker (no fal text transport in the omni edge) — flagged in the plan.
- Known minor: retaking a LOCKED brainstorm clones objective without messages -> opens an empty chat (acceptable; Retake means start over).
- DEFERRED to Phase 8: finalize-run idempotency (duplicate library item if a completed run re-finalizes); osha-chat omni agentMeta line CLI byte-exact deploy.

## Current State
Phase 7 complete, e2e-verified on feat/omni (commit pending as last action). omni edge v9 ACTIVE. All six Images modes + the Brainstorming track are live. Dev server on :8000 (skip npm run build). Temp QA admin claude.qa@wishnet.internal (1a65e05b-7251-4f3b-9411-33d077a09758) — DELETE in Phase 8 with its test runs/items. Pulse library test data: 1 X post Scheduled + 1 IG post Queued (cron re-parks honestly).

## Next Steps When Resuming
1. Read OMNI_SPEC.md (operating rules: per-phase plan, STOP for Sam's go).
2. Verify Phase 7 commit exists on feat/omni (else commit).
3. Present the Phase 8 plan: polish pass (transitions/states/responsiveness/dark mode/error paths), npm run build green (STOP dev server first - both write .next), full lint, finalize-run idempotency fix + omni edge redeploy, osha-chat CLI byte-exact deploy (needs SUPABASE_ACCESS_TOKEN or MCP-safe path decision), DELETE QA admin + its data, OMNI_BUILD_REPORT.md at repo root (per-phase shipped, schema overview, REQUIRES HUMAN list, limitations, Audios/Videos seams), update project CLAUDE.md, clear MEMORY.md.
4. REQUIRES HUMAN (live publishing, not blocking): Meta app id/secret + page OAuth (+ ig_user_id), X API paid-tier keys, TikTok Content Posting API approval.
