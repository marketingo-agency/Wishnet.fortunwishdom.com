# Fortun Wishnet — Audit Remediation Plan

**Source:** [AUDIT_FINDINGS.md](AUDIT_FINDINGS.md) · **Date:** 2026-05-21
**Principle:** Fix in order of (severity × blast-radius), batching by subsystem to minimise redeploys. Every edge-function phase ends with a CLI deploy; every client phase ends with `tsc + lint + build`. A dedicated QA phase closes the plan.

> Phased per the workflow rules. Each phase is gated — I stop for your "go" before starting the next. UI-NN steps will be finalised once the ui-reviewer findings are merged into the findings doc.

---

## Phase 1 — Critical functional + access-control fixes (highest user/security impact)
*These two break a shipped feature and an advertised admin control. No dependencies; do first.*

1. **BUG-01 — Promptor Create render.** Instrument `PromptorCreate.handleSubmit` ([PromptorCreate.tsx:143-164](src/components/promptor/PromptorCreate.tsx#L143)): confirm `mutateAsync` resolves into the continuation and `setStep('done')`/`onUpdate({output})` run; verify the `session.output` lift repaints the Create panel. Add a hard timeout/error fallback so a non-rendering success can never leave a permanent "Processing…". Re-test Create **and** Optimize (same pattern). 
2. **PERM-01 — Enforce per-agent toggles.** Extend the AI-agent route guard to check `ai_can_access_<agent>` in addition to the section `ai_agents` permission; show "Access Denied" (reuse the MasterMind pattern) and hide/disable the agent cards on the AI Agents index for users without the flag. Re-check server-side in each agent edge function (osha-chat/pixel-chat/promptor) as defense-in-depth.
3. **QA gate:** live re-test with the two audit users — Promptor renders output; restricted user is blocked from Osha; `tsc + lint + build` clean.

## Phase 2 — High-severity edge-function security (CORS + rate limit)
*Self-contained; reuses existing shared helpers. One deploy batch.*

1. **SEC-01 — CORS.** Replace hardcoded `corsHeaders` with `getCorsHeaders(req.headers.get('Origin'))` in all 7 functions (`manage-users`, `serve-file`, `storage-stats`, `update-bucket-settings`, `process-embeddings`, `search-knowledge`, `wishpedia-generate`).
2. **SEC-02 — Rate limit `manage-users`** via `createRateLimiter` + 429 after the admin gate.
3. **SEC-12 (fold in)** — switch `wishpedia-generate` to the `is_admin` RPC + add a limiter.
4. **Deploy** the 7 functions via Supabase CLI; verify preflight from `:8000`/prod returns matching `Access-Control-Allow-Origin`.

## Phase 3 — Medium edge-function hardening
1. **SEC-03** — `sanitizeForPrompt()` + untrusted-fence fetched-URL content in osha/pixel-chat; add internal-host denylist.
2. **SEC-04** — host-validate + size-cap the image-result fetch.
3. **SEC-05 / SEC-06** — Zod-validate `update-bucket-settings` body; remove the leaked dashboard URL from responses.
4. **SEC-07** — back the rate limiter with a DB table keyed by `user_id` (or extend `checkQuota` to osha/pixel/promptor).
5. **Deploy** affected functions; smoke-test each action.

## Phase 4 — Client data-accuracy + resilience
1. **DATA-01** — fix Vector Store stats to use `count` + grouped count queries / RPC ([useKnowledgeEmbeddings.ts:285](src/hooks/useKnowledgeEmbeddings.ts#L285)); paginate/count the Documents listing. Verify UI shows 1,019 / 12 docs.
2. **CODE-01 / CODE-03** — try/catch the read-on-load fetches → safe defaults (`usePromptorSettings`, `useProviderKeyStatus`, `usePulseSettings`).
3. **CODE-02** — add Sentry + toast to the `UploadDocumentDialog` outer catch.
4. **UX-01** — Nexus "Checking providers…" loading state distinct from "none configured".
5. **QA gate:** `tsc + lint + build`; live re-check Vector Store counts + Nexus load (no false "Not Connected" flash).

## Phase 5 — Supabase / database hardening (migrations + dashboard)
1. **SUP-01** — enable leaked-password protection (Dashboard toggle).
2. **SUP-02** — tighten `user_usage` INSERT RLS to service-role / `auth.uid() = user_id`.
3. **SUP-03** — `SET search_path = public` on `match_knowledge_hybrid` + `set_ef_search`.
4. **SUP-05** — `REVOKE EXECUTE … FROM anon` on the `SECURITY DEFINER` functions not meant to be public.
5. **SUP-04** — narrow the public-bucket SELECT/listing policies.
6. **SUP-06** — add the 3 FK indexes; review/drop the 7 unused indexes; consider %-based Auth connections.
7. Apply via migrations; re-run `get_advisors` to confirm the warnings clear; **regression-test RAG retrieval** after touching `match_knowledge*`.

## Phase 6 — UI/UX + accessibility (ui-reviewer score B → A)
*Sub-ordered by reach. UI-01 and the amber-contrast family touch every screen.*
1. **UI-01 (Critical)** — fix the clipped sidebar "Collapse" control / bottom-left badge overlap ([src/components/layout/](src/components/layout/)) — highest reach (every screen).
2. **UI-04 / UI-05 / A11Y badge family** — global amber-token contrast pass to WCAG AA (`text-amber-950`/`amber-800` or solid fills) across role pills, Wishpedia category badges, and Heart "Not indexed" badges.
3. **UI-03 / UI-06 / UI-12** — contrast fixes on "Coming Soon"/"Soon" badges, Nexus "Not Connected" status, and tinted-card subtitles.
4. **UI-07** — define a proper disabled-button token in [button.tsx](src/components/ui/button.tsx) (distinguish disabled vs loading vs active).
5. **UI-02** — resolve the Pixel theme inconsistency (default to app theme + opt-in dark, or frame the dark studio as intentional).
6. **A11Y-01** — `aria-label` the Heart RuleCard icon buttons. **UI-LB-01** — de-duplicate the Wishpedia lightbox Close control.
7. **UI-08..UI-19 (Medium/Low)** — mobile tab-strip affordance, Files tile/avatar placeholders, MasterMind back-nav consistency, dashboard stat-card affordance, FAB overlap padding, text-truncation clamps.
8. **SEC-09** — `Content-Disposition: attachment` for svg/html in `serve-file`.
9. **INFO-01** — confirm/relabel the dashboard "Files" stat semantics.

## Phase 7 — Low-priority code quality (backlog, optional)
- **CODE-04** — extract shared edge-fn modules. **CODE-05** — dedupe + signal-aware sleep in bulk indexing. **CODE-06** — split 200-line-rule components. **CODE-07/08** — AbortControllers + timer unmount guards. **CODE-09** — verify/relocate long video-poll loops. **SEC-08** — drop `?token=` fallback. **SEC-10/11** — log hygiene + nonce-based CSP (longer-term).

## Phase 8 — Final QA (mandatory)
1. Full `tsc --noEmit` + `eslint` + `npm run build` clean.
2. Re-run **security-auditor** + **code-reviewer** + **ui-reviewer** to confirm fixed findings clear and nothing regressed.
3. Re-run Supabase `get_advisors` (security + performance) — confirm targeted warnings resolved.
4. Live Playwright smoke of every previously-broken path (Promptor Create, per-agent gating, Vector Store counts, Nexus load) + a console-error sweep across all pages.
5. Update project `CLAUDE.md` audit history; clear `MEMORY.md`.

---

### Suggested sequencing
Phase 1 (broken feature + access control) → Phase 2 (high security, fast) are the must-dos. Phases 3-5 are the bulk of the hardening. Phases 6-7 are polish/backlog. Phase 8 always closes.

### Dependencies / cautions
- **Phase 5** touches `match_knowledge*` — regression-test RAG (the duplicate-overload incident in CLAUDE.md shows how fragile this is).
- Phases 2/3/5 require Supabase CLI deploys / migrations against prod — confirm before each.
- BUG-01 root cause is not fully pinned statically; Phase 1 step 1 is investigate-then-fix, may need a short sub-phase if the cause is in the session-state lift rather than the handler.
