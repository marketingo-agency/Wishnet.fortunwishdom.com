# MEMORY — Working Memory

## Current Task
Executing the approved 8-phase audit remediation on branch `fix/audit-remediation`. Core/high-value phases done + verified; edge deploys + some UI remain.

## Plan Status
- [DONE] Phase 1 — BUG-01 (Promptor StrictMode mounted-guard) + PERM-01 (per-agent gating). Verified live. Committed.
- [DONE] Phase 2/3a — edge CORS allowlist (7 fns) + manage-users rate limit + update-bucket validation + serve-file svg attachment + wishpedia is_admin/RL. Committed. **manage-users deployed (v130); 6 deploys PENDING.**
- [DONE] Phase 4 — DATA-01 (Vector Store pagination, verified 1,019), CODE-01/02/03, UX-01. Committed.
- [DONE] Phase 5 — SUP-02/03/05/06 migrations applied via MCP + mirrored to supabase/migrations/. Verified (anon EXECUTE revoked, RAG intact). Committed.
- [PARTIAL] Phase 6 — A11Y-01 + UI-05 done/committed. UI-01/02/03/04/06–19 + UI-LB-01 remaining.
- [NOT STARTED] Phase 3b — osha-chat/pixel-chat SEC-03/04/07 (large files; deploy needs token).
- [NOT STARTED] Phase 7 — backlog (CODE-04–09, SEC-08/10/11).
- [DONE] Final QA partial — tsc clean, lint 0 errors, build passed, live smoke (Promptor render, per-agent gating, RAG, Vector count) all green.

## Key Decisions
- Provisioned 2 temp audit users to drive the live app; all DELETED at close (baseline restored: 2 users, 33 rules, 1019 embeddings, no residue).
- Edge deploys: `manage-users` shipped via Supabase MCP (nested-path bundling works). Remaining 6 deferred to a CLI batch — needs SUPABASE_ACCESS_TOKEN (not in env; credential-hunting correctly blocked). Until deployed, those 6 still run OLD wildcard-CORS code.

## Current State
All work on branch `fix/audit-remediation` (6 commits, NOT merged/pushed). main is untouched. Findings/plan docs + audit/screens committed. Production build green. The only LIVE prod changes so far: the Phase 5 DB migrations (applied) + manage-users edge fn (deployed). The other edge-fn fixes are committed in git but NOT yet live (pending the 6 deploys).

## Next Steps When Resuming
1. **Deploy the 6 edge functions** — `SUPABASE_ACCESS_TOKEN=… npx supabase functions deploy serve-file storage-stats update-bucket-settings process-embeddings search-knowledge wishpedia-generate` (ask Sam for the token, or deploy each via Supabase MCP). Then live-smoke Files (storage-stats) + Settings→Users (manage-users) for CORS.
2. **Phase 3b** — osha-chat/pixel-chat SEC-03/04/07, then deploy (token).
3. **Phase 6 UI** — start with UI-01 (sidebar Collapse clipped, src/components/layout/) + the amber-contrast family + UI-07 disabled-button token.
4. **Manual:** SUP-01 (enable leaked-password protection) + SUP-04 (bucket listing) in Supabase Dashboard.
5. When all green: merge `fix/audit-remediation`, update CLAUDE.md final status, clear this file. REVOKE the temp Supabase token.
