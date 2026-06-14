# MEMORY — Working Memory

## Current Task
Omni Images wizard overhaul (finalize bug + 8 feature areas) — DEVELOPMENT COMPLETE. Two human gates remain (edge deploy + live verification).

## Plan Status
All 10 phases DONE. Client complete, tsc clean, lint 0 errors (39-warning baseline). Project CLAUDE.md updated with the full writeup. Adversarial 3-agent QA: 0 confirmed Critical/High; high-value Medium/Low fixed.

## Key Decisions
- Finalize bug = stale DB CHECK (youtube/pinterest) — migration 20260614120000 applied LIVE; bug fixed now.
- Omni edge (omni/index.ts + new fal-specs.ts) is STAGED, NOT deployed. Deploy via CLI (byte-exact, avoids MCP hand-transcription risk on the ~3k-line core function).
- Wizard reflow: Specs@4 + phantom→real gen@6 kept the tail (≥7) + transform/repurpose handoff stable. Networks@7 before Descriptions@8. Repurpose+Approval merged@10, Finalize@11.

## Current State
Everything Sam asked for is built and locally clean. The migration already fixed the finalize bug on the live DB. All other edge enhancements (Specs→fal translation, num_images fix, model-aware ref clamp, fal-credits admin-gated action, finalize hardening) are written in source but NOT live until the omni edge is deployed. The client (specs UI, cost card, per-network captions, AI re-design repurpose, grouped recap) is live on dev :8000.

## Next Steps When Resuming
1. **Sam deploys the omni edge:** `npx supabase functions deploy omni --project-ref zlmideilxfnokemzkavm` (verify_jwt stays true — do NOT pass --no-verify-jwt; omni is unlisted in config.toml).
2. **Sam live-verifies (paid):** spec-honoring generation; cost card vs real bill; live credit balance; a 'redesign' repurpose (keeps text/subjects at 9:16?); Wishu multi-ref fidelity.
3. Rotate any temp Supabase token used for the deploy.
4. If anything fails post-deploy, check omni edge logs (get_logs service=edge-function) — fal-specs translation + fal-credits parse are the new surfaces.
