# Fortun Wishnet — Full Functionality + UI/UX Audit: Findings

**Date:** 2026-05-21
**Scope:** Every area — Auth, Dashboard, AI Agents (Osha, Pixel, Promptor, Nexus, coming-soon), MasterMind (Brain, Heart, Wishpedia, Vector Store), Files, Settings (all tabs + permissions), Profile, Release Notes, coming-soon pages.
**Method:** Static code review (security-auditor + code-reviewer agents) · Supabase MCP (advisors, RLS, edge fns, data integrity) · live Playwright pass driven through the running app on `localhost:8000` using two temporary provisioned audit users (admin + restricted) · UI/UX review of 27 screenshots (desktop 1440, mobile 375, dark mode).
**Disposition:** Audit only — nothing was fixed. Test data created during the pass was cleaned up. Temporary audit users are removed at audit close.

---

## Summary Table

| ID | Severity | Area | One-line |
|----|----------|------|----------|
| **BUG-01** | High | Promptor | Create succeeds server-side (200, run persisted, shown in History) but the Create panel is frozen on "Processing…" and never renders the result |
| **PERM-01** | High | Permissions | Per-agent access toggles (`ai_can_access_osha/pixel/promptor/...`) are not enforced anywhere — toggling an agent off for a user has no effect |
| **SEC-01** | High | Edge fns | Wildcard `Access-Control-Allow-Origin: *` on 7 edge functions including `manage-users` and `update-bucket-settings`, bypassing the shared allowlist |
| **SEC-02** | High | Edge fns | `manage-users` (create/delete/role-change) has no rate limiting |
| **DATA-01** | Medium | Vector Store | Embedding stats use `data.length` (capped at PostgREST's 1000-row default) instead of the requested `count` → undercounts (1,000 shown vs 1,019; 11 docs vs 12) |
| **SEC-03** | Medium | osha/pixel-chat | Fetched URL page content is interpolated into the LLM prompt without `sanitizeForPrompt()` (indirect prompt-injection); no internal-host denylist |
| **SEC-04** | Medium | osha/pixel-chat | Image-result fetch has no pre-buffer size cap (memory-exhaustion risk) |
| **SEC-05** | Medium | update-bucket-settings | Numeric/array body fields accepted with no Zod/range validation |
| **SEC-06** | Medium | update-bucket-settings | Internal Supabase dashboard URL/project ref echoed in error responses |
| **SEC-07** | Medium | Edge fns | In-memory rate limiter is per-instance, resets on cold start, trivially bypassable |
| **CODE-01** | Medium | Hooks | `usePromptorSettings` read-on-load query throws on a network/extension fetch failure instead of returning a safe default |
| **CODE-02** | Medium | Brain upload | `UploadDocumentDialog` outer catch is silent — failed upload gives no toast/Sentry, UI just resets |
| **CODE-03** | Medium | Hooks | `useProviderKeyStatus` + `usePulseSettings` propagate thrown fetch instead of safe default |
| **CODE-04** | Medium | Edge fns | `osha-chat/index.ts` is 2,487 lines (pixel-chat 1,581, ai-chat 1,311); duplicated logic across the three |
| **UX-01** | Medium | Nexus | Provider status shows "Not Connected / No AI providers configured" as a flash on load (no "checking…" state) before `useProviderKeyStatus` resolves |
| **A11Y-01** | Medium | Heart | RuleCard action buttons are icon-only with no `aria-label` (3 unlabeled buttons per card) |
| **SUP-01** | Medium | Supabase | Leaked-password protection (HaveIBeenPwned) disabled in Auth |
| **SUP-02** | Medium | Supabase | `user_usage` INSERT RLS policy is `WITH CHECK (true)` — unrestricted for `authenticated` |
| **SUP-03** | Low/Med | Supabase | 2 functions have mutable `search_path` (`match_knowledge_hybrid`, `set_ef_search`) |
| **SEC-08** | Low | serve-file | Accepts JWT via `?token=` query string (lands in logs/history) |
| **SEC-09** | Low | serve-file | `Content-Disposition: inline` + `image/svg+xml` enables stored-XSS on the storage origin for self-uploaded SVGs |
| **SEC-10** | Low | Edge fns | Server logs include user IDs, file paths, emails (PII-adjacent) |
| **SEC-11** | Low | CSP | `script-src` allows `'unsafe-inline'` and `'unsafe-eval'` |
| **SEC-12** | Low | wishpedia-generate | Admin gate uses direct table read instead of the `is_admin` RPC; no rate limit on a cost-bearing image endpoint |
| **SUP-04** | Low | Supabase | Public buckets `profile-pictures` + `wishpedia-media` have broad SELECT (listing) policies |
| **SUP-05** | Low | Supabase | Many `SECURITY DEFINER` functions executable by `anon`/`authenticated` via RPC |
| **SUP-06** | Low | Supabase | 3 unindexed foreign keys; 7 unused indexes; Auth absolute connection strategy |
| **CODE-05..09** | Low | Code | Duplicated query logic, 200-line-rule offenders, missing AbortControllers, unguarded indicator timers, long synchronous video-poll loops |
| **UI-LB-01** | Low | Wishpedia | Lightbox renders two "Close" controls (shadcn default X + custom) |
| **INFO-01** | Info | Dashboard | "Files" stat is user-scoped (shows 0 for an admin who owns no files while 35 exist) — possibly intended |
| **UI-01** | Critical | Layout | Sidebar "Collapse" control clipped behind the bottom-left avatar/badge on every authenticated screen |
| **UI-02** | Critical | Pixel | Pixel page ships a hard dark theme inside the otherwise-light app + drops the card frame (reads as broken) |
| **UI-03** | Critical | Coming-soon | "Coming Soon"/"Soon" status badges fail WCAG AA contrast |
| **UI-04** | High | Badges | Amber role/category badges (admin, ARTIFACTS) fail AA across profile/users/Wishpedia |
| **UI-05** | High | Heart | Amber "Not indexed" badge fails AA, repeated on most rule cards |
| **UI-06..19** | High→Low | UI/UX | Nexus status contrast, disabled-button styling, mobile tab clipping, file-tile/avatar placeholders, inconsistent back-nav, etc. |

> Full UI/UX detail (overall score **B**) in the **UI/UX** section below.

---

## What's Healthy (verified live)

- **Auth:** login, logout (with `?from=` return), and server-side route guard all work. Login redirected correctly; protected layout enforces `getUser()`.
- **Osha chat + RAG:** end-to-end verified — accurate brand-grounded answer, hybrid retrieval working, Copy + Save-to-Brain present, **0 console errors**.
- **Promptor backend:** edge function returns a complete, compliant payload (prompts, variants, 33 Heart chunks) and persists the run (visible in History) — only the Create-view render is broken (BUG-01).
- **Heart CRUD:** create persists (33→34, auto-categorised) and survives reload.
- **Wishpedia:** entry detail loads, 7 images with correct alt text + angle labels, lightbox opens with keyboard-labeled controls.
- **Nexus / Pixel / Brain / Files / Settings / Profile / Release Notes / coming-soon:** all load with 0 console errors.
- **Permission gating (section-level):** sidebar nav, route-level "Access Denied", and Settings-tab gating all correctly hide admin surfaces from the restricted user.
- **Responsive:** no horizontal overflow at 375px on dashboard, Osha, Heart, Settings; sidebar collapses on mobile.
- **Dark mode:** toggles via user menu (`html.dark`).
- **Data integrity:** 1,019 embedding chunks, 0 null embeddings, 0 orphaned embeddings, all 12 document / 17 wishpedia / 2 rule sources resolve.
- **Security baseline:** no browser key leakage (`LLM_SETTINGS_CLIENT_COLUMNS` whitelist), no committed secrets, all 14 edge fns verify `getUser()`, admin gating on privileged actions, no SQL injection, no `dangerouslySetInnerHTML`, strong security-header set, env-based LLM keys correctly detected ("Using environment secret").

---

## High Severity

### BUG-01 — Promptor "Create" freezes on "Processing…" though generation succeeds
**Area:** Promptor · **Files:** [PromptorCreate.tsx:143-164](src/components/promptor/PromptorCreate.tsx#L143-L164), [useRunPromptor.ts](src/hooks/promptor/useRunPromptor.ts), [usePromptorSession.ts](src/hooks/promptor/usePromptorSession.ts)
**What's wrong:** Submitting a brief on the Create tab calls the `promptor` edge function, which returns **HTTP 200** with a complete payload (`final_prompt_full`, two variants, `compliance_status: pass`, 33 Heart chunks) and the run is **persisted** (it appears in the History tab). The mutation's `onSuccess` fires (the `promptor_runs` query re-fetches). But the Create panel stays on the "Processing…" spinner indefinitely and never renders the `Generated Output` block — `setStep('done')` / `onUpdate({ output })` in the success continuation are not reflected.
**Repro:** `/ai-agents/promptor` → Create → type any brief → "Generate Prompt" → wait. Output never appears in Create; switch to History to see the run saved.
**Evidence:** Network req returned 200 with the full prompt body; History shows "1 run · Compliant · gpt-4.1"; DOM never contains the output text; spinner persists >60s.
**Fix:** Instrument the success path in `handleSubmit` — confirm `runPromptor.mutateAsync` resolves into the continuation (vs. the promise hanging or the state update being dropped). Likely the `output` state-lift via `session.output` isn't repainting the Create panel (parent `usePromptorSession.updateCreate` round-trip) — verify `setStep('done')` runs and the `{output && …}` branch receives the new session value. Add an error/timeout fallback so a non-rendering success can't leave a permanent spinner. (Optimize tab uses the same pattern — verify it too.)

### PERM-01 — Per-agent access toggles are not enforced
**Area:** Permissions · **Files:** [EditUserSheet.tsx](src/components/settings/EditUserSheet.tsx), [useUserPermissions.ts](src/hooks/useUserPermissions.ts), [user.ts](src/types/user.ts) — and notably **absent from any route guard / page**
**What's wrong:** The admin "Edit User" sheet exposes per-agent switches (Osha, Pixel, Promptor, Nexus, ATLAS, …) backed by `user_permissions.ai_can_access_*` columns. A grep shows these columns are referenced **only** in the type defs, the Supabase types, the `useUserPermissions` hook, and the toggle UI — **never in a route guard, page, or agent card**. Route access is gated solely by the section-level `ai_agents` permission, so the granular toggles do nothing.
**Repro (verified live):** Restricted user with `ai_agents='view'` but `ai_can_access_osha=false` → navigate to `/ai-agents/osha` → the full Osha chat loads and is usable. (Contrast: `/mastermind`, gated by the section perm, correctly shows "Access Denied".)
**Impact:** Misleading admin UI (toggles imply control they don't have) + access-control gap (can't actually restrict a user to a subset of agents).
**Fix:** Enforce `ai_can_access_<agent>` in each agent route guard (extend the `ProtectedRoute`/permission check that currently keys off `toolKey: 'ai_agents'` to also check the per-agent flag), and ideally re-check server-side in the corresponding edge function. Hide/disable the agent cards on the AI Agents index for users without the flag.

### SEC-01 — Wildcard CORS on 7 edge functions (incl. `manage-users`)
**Severity:** High · **Files:** `manage-users/index.ts:4`, `serve-file/index.ts:4`, `storage-stats/index.ts:4`, `update-bucket-settings/index.ts:4`, `process-embeddings/index.ts:27`, `search-knowledge/index.ts:12`, `wishpedia-generate/index.ts:14`
**What's wrong:** These hardcode `'Access-Control-Allow-Origin': '*'`, bypassing the shared `getCorsHeaders()` allowlist in `_shared/cors.ts` that the other 7 functions use. Includes the most sensitive endpoints (user create/delete/role-change, admin storage config).
**Fix:** Replace the hardcoded `corsHeaders` with `getCorsHeaders(req.headers.get('Origin'))` exactly as `osha-chat`/`pixel-chat`/`promptor`/`pulse-api`/`settings-keys`/`ai-chat` already do.

### SEC-02 — `manage-users` has no rate limiting
**Severity:** High · **File:** `manage-users/index.ts` (no `createRateLimiter` import)
**What's wrong:** The only privileged function with zero rate limiting. A leaked/compromised admin token can enumerate/create/delete users at unbounded speed; pairs badly with SEC-01.
**Fix:** Add `createRateLimiter({ windowMs: 60_000, maxRequests: 10 })` and a 429 after the admin gate, matching `settings-keys`/`pulse-api`.

---

## Medium Severity

### DATA-01 — Vector Store stats capped at 1,000 rows
**Area:** Vector Store · **File:** [useKnowledgeEmbeddings.ts:285-298](src/hooks/useKnowledgeEmbeddings.ts#L285-L298)
**What's wrong:** The stats query asks for `{ count: 'exact' }` but then returns `totalChunks: data?.length` and computes per-type counts by `.filter()`-ing the **returned rows**, which PostgREST caps at the default **1,000-row** limit. Actual DB total is 1,019, so the UI shows "Total Chunks 1,000", "Documents Indexed 11" (vs 12), "963 doc chunks" (vs 982). Silently worsens as the corpus grows.
**Repro (verified):** Vector Store UI = 1,000 total / 11 docs; DB = 1,019 / 12 docs / 982 doc chunks (no orphans).
**Fix:** Use the returned `count` for `totalChunks`; compute per-type counts with grouped `head: true` count queries (or a single RPC `select source_type, count(*) group by source_type`). Same cap likely affects the Documents listing query — paginate or count server-side.

### SEC-03 — Unsanitized fetched-URL content into LLM prompt (prompt injection)
**Files:** `osha-chat/index.ts:427` + same Jina-reader pattern in `pixel-chat`. `fetchUrlContent()` validates length/protocol but the fetched page content is **not** run through `sanitizeForPrompt()` (unlike Heart/Brain content) and there's no internal-host denylist. SSRF risk is low (Jina proxy) but indirect prompt-injection is real.
**Fix:** `sanitizeForPrompt()` the fetched content and fence it as untrusted; add an RFC1918/link-local/`*.supabase.co`/metadata denylist before constructing the Jina URL.

### SEC-04 — Image-result fetch lacks pre-buffer size cap
**Files:** `osha-chat/index.ts:2147` & `:2233`; `pixel-chat:1318`/`1407`. `MAX_SOURCE_BYTES` guards the Brain-image loop but not the result fetch at 2233 — a large upstream image is fully buffered (memory-exhaustion).
**Fix:** Validate the host (`*.supabase.co` / OpenAI domain) and stream/cap the body size.

### SEC-05 — `update-bucket-settings` accepts unvalidated input
**File:** `update-bucket-settings/index.ts:62-68`. `max_file_size_mb`, `total_storage_quota_gb`, `allowed_file_types`, `auto_delete_trash_days` flow straight into `updateBucket()`/`file_settings` with no Zod/range checks; a 0/negative/NaN value could break all uploads.
**Fix:** Add a Zod schema with positive-int caps and array/null validation.

### SEC-06 — Internal dashboard URL leaked in error response
**File:** `update-bucket-settings/index.ts:84-88`. The `global_limit_exceeded` branch returns a hardcoded `dashboard_url` with the project ref.
**Fix:** Return a generic message; keep the deep-link server-side only.

### SEC-07 — In-memory rate limiter is per-instance / bypassable
**File:** `_shared/rate-limit.ts:28-69`. Counters live in isolate memory, reset on cold start, not shared across instances. The cost-bearing LLM endpoints (osha/pixel/promptor) rely on this soft control; only `ai-chat`'s DB-backed `checkQuota` is durable.
**Fix:** Back the limiter with a table/Redis keyed by `user_id`, or extend the DB-backed `checkQuota` to the other LLM functions.

### CODE-01 — `usePromptorSettings` crashes on network throw
**File:** [usePromptorSettings.ts:24-34](src/hooks/promptor/usePromptorSettings.ts#L24-L34). Read-on-load query whose `queryFn` calls `callPromptor` (raw `fetch`, no try/catch) — a thrown fetch (extension/network) surfaces as a crash instead of degrading. This is the exact pattern already fixed for `useOshaSettings`/`usePixelSettings`.
**Fix:** try/catch the fetch → return `DEFAULT_SETTINGS`.

### CODE-02 — Silent catch on Brain document upload failure
**File:** [UploadDocumentDialog.tsx:213-219](src/components/brain/UploadDocumentDialog.tsx#L213-L219). The outer upload catch resets state but fires no toast and no Sentry capture — a failed upload looks like nothing happened. Violates the "never silent catches" rule.
**Fix:** Add `Sentry.captureException` + `toast.error` (the inner linked-file catch at :190 already does this correctly).

### CODE-03 — Safe-default gap in `useProviderKeyStatus` / `usePulseSettings`
**Files:** [useProviderKeyStatus.ts:43-52](src/hooks/useProviderKeyStatus.ts#L43-L52), [usePulseSettings.ts:16-27](src/hooks/usePulseSettings.ts#L16-L27). Thrown fetch bubbles to an error boundary rather than degrading. Lower risk (admin-gated, `enabled`-conditional, `retry:1`).
**Fix:** try/catch → safe default, or confirm a deliberate `isError` UI consumes it.

### CODE-04 — Oversized edge-function modules
**Files:** `osha-chat/index.ts` (2,487 lines), `pixel-chat` (1,581), `ai-chat` (1,311). Auth + RAG + vision + image-edit + deep-research + intent detection in one module; much duplicated between osha-chat and pixel-chat.
**Fix (backlog):** extract `searchBrain`, embedding, image-edit multipart, deep-research poll into `_shared/` modules.

### UX-01 — Nexus "Not Connected" flash on load
**Area:** Nexus · **Files:** [useNexusConsoleController.ts:69-84](src/hooks/useNexusConsoleController.ts#L69-L84), [NexusConsole.tsx:143-150](src/components/nexus/NexusConsole.tsx#L143-L150), [ProviderStatus.tsx:86](src/components/nexus/ProviderStatus.tsx#L86)
**What's wrong:** Before `useProviderKeyStatus` resolves, `keyStatus` is `undefined` → `isDisabled` is true → the console shows "No AI providers configured" and ProviderStatus shows "Not Connected", even though the providers are connected (env keys; verified: `check-keys` returns `{openai:'env', gemini:'env'}` and Settings→LLM correctly shows "Connected"). Misleading flash; resolves to correct state within ~1s.
**Fix:** Render a "Checking providers…" state while the query `isLoading`/`keyStatus === undefined`, distinct from the genuine "none configured" state.

### A11Y-01 — Heart RuleCard action buttons unlabeled
**Area:** Heart · **File:** [RuleCard.tsx](src/components/heart/RuleCard.tsx)
**What's wrong:** Each rule card exposes 3 icon-only buttons (expand/toggle/menu) with empty accessible names — screen readers announce nothing.
**Fix:** Add `aria-label` to each (e.g. "Expand rule", "Toggle active", "Rule actions"). (Wishpedia's filmstrip + "Open fullscreen" buttons are correctly labeled — use as the pattern.)

### SUP-01 — Leaked-password protection disabled
**Supabase Auth** — enable HaveIBeenPwned check (Dashboard → Auth → Password security). Tracked previously as SEC-009; still off.

### SUP-02 — `user_usage` INSERT RLS is `WITH CHECK (true)`
Unrestricted insert for `authenticated`. [advisor 0024]. If only the service role should insert usage, scope the policy to `auth.uid() = user_id` or to the service role.

### SUP-03 — Mutable `search_path` on 2 functions
`match_knowledge_hybrid`, `set_ef_search` lack a fixed `search_path` (`SET search_path = public`). [advisor 0011]

---

## Low Severity

- **SEC-08** — `serve-file:63-65` accepts JWT via `?token=`; drop the query-string fallback (tokens leak to logs/history).
- **SEC-09** — `serve-file` serves `image/svg+xml` `inline`; self-uploaded SVG = stored-XSS on the storage origin. Use `Content-Disposition: attachment` for svg/html or a sandboxed origin.
- **SEC-10** — Server logs include user IDs/paths/emails; restrict log access / retention.
- **SEC-11** — `next.config.ts:26` CSP allows `'unsafe-inline'`/`'unsafe-eval'`; migrate to nonce-based CSP long-term.
- **SEC-12** — `wishpedia-generate:250-256` uses a direct `user_roles` read instead of the `is_admin` RPC; also no rate limit on a cost-bearing image endpoint.
- **SUP-04** — Public buckets `profile-pictures` + `wishpedia-media` allow listing via broad SELECT; public URL access doesn't need it. [advisor 0025]
- **SUP-05** — Many `SECURITY DEFINER` functions are RPC-executable by `anon`/`authenticated` (`handle_new_user`, `has_role`, `is_admin`, `match_knowledge`, `trim_*`). Revoke `EXECUTE` from `anon` where not intentional. [advisors 0028/0029]
- **SUP-06** — 3 unindexed FKs (`osha_audit_logs.user_id`, `osha_messages.user_id`, `system_prompts.created_by`); 7 unused indexes; Auth uses absolute (not %) connection strategy. [advisors 0001/0005]
- **CODE-05** — `useBulkWishpediaIndex.ts:22-41/61-77` duplicate the unindexed-entries query; the 800ms inter-iteration sleep isn't tied to the AbortSignal.
- **CODE-06** — 200-line-rule offenders: `MasterMindSettings` (814), `BrandingSettings` (773), `HeartRules` (748), `VectorStorePanel` (667), `OshaSettings` (655), `EditUserSheet` (617), `LLMProvidersSettings` (603).
- **CODE-07** — `useStorageUsage`/`useEmbeddingStats` lack AbortControllers (low impact; TanStack handles staleness).
- **CODE-08** — Indicator timers without unmount guards: `useChatUtils.ts:36`, `OshaMessageBubble.tsx:183`, `PixelMessageBubble.tsx:153`, `useOcrIndexing.ts:331`.
- **CODE-09** — `ai-chat` video-poll loops (Sora 5min, Veo 10min) run synchronously in one invocation; verify the platform wall-clock allows 10min or move to fire-and-poll.
- **UI-LB-01** — Wishpedia lightbox renders two "Close" controls (shadcn Dialog's default X + a custom one). Suppress the default `DialogClose` or remove the custom one.
- **INFO-01** — Dashboard "Files" stat is user-scoped (showed 0 for the admin audit user while 35 files exist and the Files manager lists them). Confirm intended ("your files") vs. should reflect admin-visible count.

---

## UI/UX (screenshot review — overall score: B)

A polished, internally consistent admin platform; the card-framed pattern holds across nearly every screen and the dark-premium aesthetic is clean. Held back by a recurring sidebar clipping bug, amber/badge contrast misses, and the Pixel theme inconsistency.

### Critical
- **UI-01 — Sidebar "Collapse" control clipped behind the bottom-left avatar/badge on every authenticated screen.** Renders as "ollapse" — the leading "C" + icon are hidden behind the circular dark badge pinned to the same corner; overlaps content on mobile too. Screens 02/04/05/06/07/08/14/15/17/18/20/21/27. **Fix:** move the floating badge out of the sidebar footer or give the collapse row its own full-width padded track; ensure the label/icon are never overlapped at any width. *(Screenshot-derived — confirm the exact overlapping element in [src/components/layout/](src/components/layout/).)*
- **UI-02 — Pixel page ships a hard dark theme inside an otherwise light app.** Pixel studio (07) is full dark while sibling agent pages (Osha/Promptor/Nexus) are light, and it drops the outer card frame — reads as broken when navigating from the light hub. Deliberate `data-pixel-theme` per project notes. **Fix:** default Pixel to the app theme with dark as an opt-in, or wrap the dark studio in the standard card frame + an in-UI "dark studio" affordance.
- **UI-03 — "Coming Soon" / "Soon" status badges fail WCAG AA.** Pale-blue-on-pale-blue pill (20) and grey-on-grey "Soon" captions (02/03/08/21/27). **Fix:** darken pill text or invert to a solid filled badge; raise caption text to ≥4.5:1.

### High
- **UI-04 — Amber "admin"/"Administrator"/category badges fail AA.** Role pills (15/17/18) + Wishpedia "ARTIFACTS" category badge (12), amber-on-cream. **Fix:** `text-amber-950` on amber fill or solid `amber-600/700` + white; audit all amber tokens globally.
- **UI-05 — "Not indexed" amber warning badge low contrast,** repeated on most Heart rule cards (10/25). **Fix:** `text-amber-800` minimum against white.
- **UI-06 — Nexus "Not Connected" status text near-invisible** (light grey on white) and wraps to two lines in the Gemini pill (06). **Fix:** clearer AA token; widen pill or shorten label. *(Relates to UX-01.)*
- **UI-07 — Disabled primary buttons ("Generate Prompt", "Save") read as broken** — low-opacity tint of the primary color + white label drops below AA, looks mid-load (05/15/26). **Fix:** a defined disabled token (solid muted grey + AA label) in [button.tsx](src/components/ui/button.tsx).

### Medium
- **UI-08 — Mobile tab strips overflow with no scroll affordance & last tab half-clipped** (Heart 25, Settings 26). **Fix:** edge-fade/chevron + snap to full tabs.
- **UI-09 — Files Manager file tiles: oversized red icon on pink tile reads as an error;** filenames truncate with no tooltip (14). **Fix:** neutral tile + muted file-type icon + title tooltips.
- **UI-10 — Three different back-nav patterns within MasterMind** (hub breadcrumb 08 vs in-card "← Back" 09/10 vs Wishpedia 11). **Fix:** standardize one pattern.
- **UI-11 — Dashboard stat-card click affordance inconsistent** (only one card shows a chevron) (02/27). **Fix:** consistent affordance on genuinely navigable cards only.
- **UI-12 — "Powered by Fortun MasterMind" subtitle borderline low contrast** on tinted agent-card headers (04/05/06). **Fix:** darken muted token one step on tinted backgrounds.
- **UI-13 — Profile avatar placeholder (camera-on-dark disc) looks like a broken image** (18/26). **Fix:** initials avatar ("ZA" is already used elsewhere) or a clearly-styled "add photo" placeholder.

### Low
- **UI-14** — Bot FAB overlaps content bottom-right (brief textarea handle, table rows) (05/06/14) — add scroll-container bottom padding.
- **UI-15** — "What's New" blurb truncates mid-word ("…with Nexus for Open…") (02/21/27) — word-boundary clamp.
- **UI-16** — Wishpedia card titles truncate inconsistently (11) — fixed 2-line clamp + consistent card heights.
- **UI-17** — Nexus left column has a double-framed inner scrollbar (06) — bleed scroll to card edge (same family as the CLAUDE.md dashboard scroll fix).
- **UI-18** — Mobile Osha timestamp row tight under the user bubble (24) — minor spacing.
- **UI-19** — Brain populated agent ("2 docs" Osha) lacks emphasis vs "0 docs" peers (09) — subtle highlight when count > 0.

**Done well:** uniform card-framed shell, real empty/coming-soon states, Lucide-only iconography (no emoji icons), consistent color-coded agent identity, competent dark mode, RBAC-aware UI (restricted user correctly hides nav + stat cards), well-structured Vector Store table.

---

## Notes / Non-findings
- Release-notes first navigation exceeded 60s **once** — Turbopack dev first-compile, not a runtime issue.
- `/ai-agents/pulse`, `/whisper`, `/atlas` correctly render the "Coming Soon" page.
- The browser-extension (`window.fetch` interception) issues documented in CLAUDE.md did not recur in the clean Playwright browser.
