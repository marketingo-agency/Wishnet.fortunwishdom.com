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
SHIPPED. Client committed+pushed to main (commit d254b4a → VPS auto-deploy). DB migration live (finalize bug fixed). **Omni edge DEPLOYED — version 20**, verified booting clean (OPTIONS 200, CORS origin OK, verify_jwt preserved). All staged edge enhancements (Specs→fal translation, num_images fix, model-aware ref clamp, fal-credits admin-gated, finalize hardening) are LIVE.

## Next Steps When Resuming
1. **ROTATE the Supabase access token** (sbp_...) — it was pasted in chat during the deploy; treat as compromised. https://supabase.com/dashboard/account/tokens
2. **Sam live-verifies (paid):** spec-honoring generation; cost card vs real bill; live credit balance (admin); a 'redesign' repurpose (keeps text/subjects at 9:16?); Wishu multi-ref fidelity.
3. If anything fails, check omni edge logs (get_logs service=edge-function) — fal-specs translation + fal-credits parse are the new surfaces.
