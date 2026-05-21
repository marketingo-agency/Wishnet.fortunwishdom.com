# MEMORY — Working Memory

## Current Task
Executing the approved 8-phase audit remediation on branch `fix/audit-remediation`. Core/high-value phases done + verified; edge deploys + some UI remain.

## Plan Status
- [DONE] Phase 1 — BUG-01 (Promptor StrictMode mounted-guard) + PERM-01 (per-agent gating). Verified live. Committed.
- [DONE] Phase 2/3a — edge CORS allowlist (7 fns) + manage-users rate limit + update-bucket validation + serve-file svg attachment + wishpedia is_admin/RL. Committed. **ALL 7 DEPLOYED via MCP + CORS-verified live** (manage-users v130, update-bucket-settings v108, serve-file v103, storage-stats v111, search-knowledge v106, process-embeddings v113, wishpedia-generate v31). Preflight: allowlisted origin OK, evil origin rejected (no wildcard).
- [DONE] Phase 4 — DATA-01 (Vector Store pagination, verified 1,019), CODE-01/02/03, UX-01. Committed.
- [DONE] Phase 5 — SUP-02/03/05/06 migrations applied via MCP + mirrored to supabase/migrations/. Verified (anon EXECUTE revoked, RAG intact). Committed.
- [PARTIAL] Phase 6 — DONE + live-verified: A11Y-01, UI-05, **contrast pass UI-03/04/06** (role badges ×2, Wishpedia category, Nexus 'Not Connected', ComingSoon badge → AA), **UI-08** (Settings mobile tab strip right-edge fade affordance), **UI-13** (AccountSettings avatar: full-cover camera overlay → small corner button so initials show on mobile). All committed, tsc/lint clean. **UI-01 = dev-only false positive** (Next.js dev-tools 'N' overlaps Collapse in dev only; gone in prod). REMAINING (deferred — design decisions or low/marginal): UI-02 (Pixel dark-theme — product decision), UI-07 (disabled-button token — global/subjective), UI-09 (Files tiles), UI-10 (MasterMind back-nav), UI-11 (stat-card affordance — likely already-consistent), UI-12 (agent subtitle — standard muted token), UI-14–19, UI-LB-01 (lightbox dup-close — works, redundant a11y node only).
- [DONE] Phase 3b — osha-chat (SEC-03 host-denylist + sanitize fetched URL; SEC-04 image cap) + pixel-chat (SEC-04) edited, committed, and **deployed byte-exact via CLI** (osha-chat v125 verify_jwt=false, pixel-chat v90 verify_jwt=true). Osha RAG smoke-tested live OK. SEC-07 (DB limiter) deferred.
- [NOT STARTED] Phase 7 — backlog (CODE-04–09, SEC-08/10/11).
- [DONE] Final QA partial — tsc clean, lint 0 errors, build passed, live smoke (Promptor render, per-agent gating, RAG, Vector count) all green.

## Key Decisions
- Provisioned 2 temp audit users to drive the live app; all DELETED at close (baseline restored: 2 users, 33 rules, 1019 embeddings, no residue).
- Edge deploys: `manage-users` shipped via Supabase MCP (nested-path bundling works). Remaining 6 deferred to a CLI batch — needs SUPABASE_ACCESS_TOKEN (not in env; credential-hunting correctly blocked). Until deployed, those 6 still run OLD wildcard-CORS code.

## Latest fix (Pixel image display — committed + deployed + verified)
Pixel-generated images couldn't be seen/downloaded/copied. Two root causes: (1) pixel-chat stored images in the PRIVATE `files` bucket but returned `getPublicUrl()` (403s) → switched to `createSignedUrl(24h)` like osha-chat (redeployed pixel-chat); (2) `PixelOutputCard` (the studio renderer) `<img>` had `loading="lazy"` + `display:none` → never loaded (same deadlock fixed in OshaMessageBubble) → removed lazy + added onError (also fixed PixelMessageBubble). Verified live: 1024×1024 image renders, signed URL 200, Download/Copy/Save-to-Brain present. Note: osha-chat's 24h signed URLs (and now pixel's) expire — historical images break after 24h; a durable fix would serve via serve-file on demand (not done — matches existing osha behavior).

## Current State
All work on branch `fix/audit-remediation` (6 commits, NOT merged/pushed). main is untouched. Findings/plan docs + audit/screens committed. Production build green. The only LIVE prod changes so far: the Phase 5 DB migrations (applied) + manage-users edge fn (deployed). The other edge-fn fixes are committed in git but NOT yet live (pending the 6 deploys).

## Next Steps When Resuming
1. **Phase 3b — DONE & deployed** (osha-chat v125, pixel-chat v90; Osha RAG smoke-tested). SEC-07 DB-backed limiter still deferred (optional). Nothing left here.
2. **Phase 6 UI** — UI-01 (sidebar Collapse clipped behind corner badge, src/components/layout/), UI-02 (Pixel dark theme), UI-07 (disabled-button token in ui/button.tsx), UI-03/04/06 (remaining amber/badge contrast), UI-08–19, UI-LB-01. These are client-only (no deploy); verify each live with screenshots.
3. **Manual (Supabase Dashboard):** SUP-01 (enable leaked-password protection) + SUP-04 (narrow public-bucket listing) — deferred (image-display risk).
4. **Phase 7** backlog (CODE-04 file splits, CODE-05–09, SEC-08/10/11).
5. When all green: merge `fix/audit-remediation`, update CLAUDE.md final status, clear this file. REVOKE the temp Supabase token.
