# MEMORY — Working Memory

## Current Task
Build the Omni agent (multimodal creation workspace). Canonical spec + approved decisions: OMNI_SPEC.md at repo root.

## Plan Status
- DONE — Phases 0-4 (scaffolding, fal layer, Omni Images, Transform/Upscale, Pulse Content Library + Mode 3; commits up to 7df5ba3) and Phase 5 HISTORY (review-hardened, commit 84793e3). Details in prior commits + project CLAUDE.md after Phase 8.
- DONE — Phase 6 SURPRISE ME (omni edge v8): new action `surprise-ideas` in supabase/functions/omni/surprise.ts — diverse random-window sampling of knowledge_embeddings (brain_document + wishpedia_entry, balanced, sanitized + fenced untrusted), priority-ordered Heart rules, JSON-strict LLM pass (OpenAI json_object / Gemini regex; either provider key works since no embeddings needed); new OMNI_SURPRISE_IDEAS budget (2048). Client: SurpriseMeView + SurpriseIdeaCard (fuchsia, framer-motion), useSurpriseIdeas + useStartRunFromIdea (creates mode 'surprise_me' run, objective prefilled, step 1) -> opens Omni Images wizard via the History resolver. ownsEarlySteps gate extended to surprise_me (these runs DO own steps 1-5). E2E-verified via Playwright: mined 6 grounded ideas (12 Brain + 12 Wishpedia samples, 33 Heart rules, [B#]/[W#] citations of real canon), picked one -> wizard step 1 prefilled, SQL-verified run row (mode surprise_me, title = idea title), History shows Surprise Me badge w/ full resume/retake/delete controls. tsc + lint clean, 0 console errors. SCOPING (flagged in plan, approved): all ideas route to Omni Images; transform-anchored ideas (Wishpedia media plumbing) deferred.
- NEXT — Phase 7 BRAINSTORMING (chat + provider/model picker + attachments + Promptor + lock-and-redirect prefill + switch to Surprise Me), Phase 8 POLISH + QA.

## Key Decisions
- Approved decisions live in OMNI_SPEC.md "APPROVED DECISIONS".
- Surprise mining = random-offset windows (order by random() not expressible via supabase-js; no migration needed), NOT similarity search.
- Surprise runs keep mode 'surprise_me' for honest History provenance; all sequence/resolver else-branches already handle it.
- DEFERRED to Phase 8 (edge batch w/ osha-chat CLI deploy): finalize-run idempotency (duplicate library item if a completed run re-finalizes from step 12).
- osha-chat omni agentMeta line still STAGED, deploy in Phase 8 (CLI byte-exact).

## Current State
Phase 6 complete, e2e-verified on feat/omni (commit pending as last action). omni edge v8 ACTIVE (deployed via MCP full re-inline). Dev server live on :8000 (skip npm run build). Temp QA admin claude.qa@wishnet.internal (1a65e05b-7251-4f3b-9411-33d077a09758) — DELETE in Phase 8 with its test runs/items. Pulse library test data: 1 X post Scheduled + 1 IG post Queued (cron re-parks honestly, by design).

## Next Steps When Resuming
1. Read OMNI_SPEC.md (operating rules: per-phase plan, STOP for Sam's go).
2. Verify Phase 6 commit exists on feat/omni (else commit).
3. Present the Phase 7 plan (Brainstorming chat: provider/model pickers from llm registries, attachments, Promptor wand, RAG-grounded discussion, lock-and-redirect with prefill, switch to Surprise Me; likely new omni edge action + omni_messages-like persistence decision to flag).
4. REQUIRES HUMAN (live publishing, not blocking): Meta app id/secret + page OAuth (+ ig_user_id), X API paid-tier keys, TikTok Content Posting API approval.
