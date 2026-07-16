# MEMORY — Working Memory

## Current Task
PLANNING SESSION (2026-07-16) — producing multi-phase plan MD files for future execution sessions. No code changes in this session.

## Plan Status
- DONE — `plans/OMNI_IMAGES_OVERHAUL_PLAN.md` written, critiqued round 1 (2 blockers fixed), critiqued round 2 (both SHIP; 6 minor fixes), then REVISED per Sam's final call: **Brainstorm untouched EVERYWHERE — entry tile stays (4 tiles) AND hub card stays (six-card 2×3 hub)**; entry screen only GAINS the fal Engine bar. Consistency-grepped clean. 13 phases: 0 baseline · 1 edge hotfix (reasoning-params — Transform likely broken in prod TODAY) · 2 test harness · 3 step registry · 4 entry fal bar + hub + Surprise-fold · 5 context engine + brainstorm hardening · 6 Studio stages 1-3 (gates 6a/6b) · 7 stages 4-7 + registry flip · 8 repurposing v2 · 9 History (gates 9a/9b) · 10 Character Studio · 11 UI pass · 12 QA · 13 delivery.
- DONE — `plans/OMNI_VIDEOS_TRACK_PLAN.md` written (Videos track: 6-card hub approved by Sam — Scenario Studio · Video Studio · Clips · Animate · Repurpose & Enhance · History; Videos tile moves before Audios). Grounded in live fal recon (30+ endpoints priced, 16 schemas verified; compose = verified assembly backbone; all premium models cap 8-15s/clip → long-form = stitched scenes). Critiqued (2 critics, SHIP_WITH_FIXES): 2 blockers fixed — finisher moved to a NEW `omni-finisher` verify_jwt=false function (pg_cron CANNOT call verify_jwt=true omni), finalize-run video extension rides omni deploy #2 (Phase 6). HARD DEPENDENCY: Plan 1 fully executed first. 14 phases (0-13).
- DONE — `plans/OMNI_AUDIOS_TRACK_PLAN.md` (Podcast suite: 6-card hub approved — Podcast Scenario · Podcast Studio · Cast & Personas · Podcast to Video · Publish & Feed · History; self-hosted RSS approved as default, Transistor pivot documented). Grounded in web-verified 2026 publishing research (PSP-1 RSS, Apple byte-range + AI-disclosure requirements, YouTube RSS ingest, Spotify policies) + Whisper engine deep-read (lift code, never call the admin-gated function). Critiqued (feasibility REWORK → fixed): publish actions got their own omni deploy #2 at Phase 9; the finisher-reuse fallacy fixed with a precise TTS job model (waitUntil interactive path + finisher TTS-worker extension redeployed at Phase 2b); jingle action, transcription-check probe, admin SELECT policies, middleware exclusion for /podcast/* all added. Also patched Plan 2's missing `transcribe` action into its Phase 6 deploy. 13 phases (0-12).
- DONE — Execution mega-prompt delivered to Sam (2026-07-16): new sessions execute Plans 1→2→3 with per-phase gates converted to self-verified checkpoints (Sam pre-authorized), continuity via `plans/EXECUTION_LOG.md` (created by the first execution session; re-paste the same prompt to resume), hard stop after Plan 3 for Sam's go before Playwright live-testing of every mode (report-only, no auto-fixes).
- NEXT — execution sessions take over. This planning session is complete.

## Key Decisions
- Rename "Omni Images" → **"Studio"** (LABEL-only; DB CHECK on omni_runs.mode forbids value rename).
- 11 steps → 7 stages; registry flips to v2 only at END of Phase 7 (critic-caught blocker).
- Brainstorm KEPT everywhere (Sam 2026-07-16): entry tile stays (4 tiles) + hub card stays (6 cards); zero removals. Brainstorm still gets context-engine + lock-grounding + provider-honesty fixes (it's a surviving mode → "100% working" applies).
- Surprise Me folds into Stage 1 as "Inspire me".
- Repurposing v2 tier 2 = fal-ai/flux-2-pro/outpaint via NEW dedicated `repurpose-submit` edge action.
- New mode: Character Studio (Studio pre-seed, zero migration).
- CRITICAL prod bug found (not yet fixed): omni edge sends max_tokens+temperature to reasoning models (SIB-01) — Phase 1 of the plan is the hotfix.

## Current State
Omni Images overhaul plan is complete and self-contained at `plans/OMNI_IMAGES_OVERHAUL_PLAN.md`. Built from an 8-agent deep-map (95 findings) + 2-critic adversarial pass. Base commit assumption: main ≥ e2ba60b (verified in-sync with GitHub + VPS earlier this session).

## Next Steps When Resuming
1. If continuing THIS planning session: create the next plan MD Sam requests into `plans/`.
2. If EXECUTING: open `plans/OMNI_IMAGES_OVERHAUL_PLAN.md`, follow its Execution Protocol, start at Phase 0, wait for Sam's go per phase.
