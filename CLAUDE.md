# Fortun Wishnet

> This file is the permanent project memory. It is updated at the end of every completed task.

## Project Overview
Fortun Wishnet is an internal admin/operations platform built on **Next.js 16 App Router** with a Supabase backend. It hosts file management, a RAG-powered knowledge base, multiple AI agents (Osha, Pixel, Promptor), a rules engine (Heart Rules), and a Wishpedia content module.

## Tech Stack
- **Framework:** Next.js 16.2.3 (App Router + Turbopack)
- **Language:** TypeScript 5.8.3 (strict mode)
- **UI:** React 19.2.5 + React DOM 19.2.5
- **Styling:** Tailwind CSS 3.4.17 + tailwindcss-animate + @tailwindcss/typography
- **Components:** shadcn/ui (Radix UI primitives, ~40 packages)
- **State/Data:** TanStack Query 5.83.0
- **Forms:** React Hook Form 7.61.1 + Zod 3.25.76 (@hookform/resolvers 3.10.0)
- **Backend:** Supabase (@supabase/supabase-js 2.91.0 + @supabase/ssr 0.10.2)
- **Icons:** Lucide React 0.462.0
- **Notifications:** Sonner 1.7.4
- **Charts:** Recharts 2.15.4
- **Flow/Diagrams:** @xyflow/react 12.10.1
- **Drag & Drop:** @dnd-kit/core 6.3.1 + sortable 10.0.0
- **PDF:** pdfjs-dist 4.9.155
- **Markdown:** react-markdown 10.1.0 + remark-gfm 4.0.1
- **Theme:** next-themes 0.3.0
- **Testing:** Playwright 1.57.0

Do not upgrade dependencies without discussion.

## Architecture
- **Frontend:** Next.js App Router, source in `src/`, alias `@` → `./src`
- **Routing:** `src/app/` with `(public)` and `(protected)` route groups
- **Auth:** Cookie-based SSR via `@supabase/ssr` + `middleware.ts` at repo root + `src/contexts/AuthContext.tsx`
- **Supabase client (browser):** `src/integrations/supabase/client.ts` — uses `createBrowserClient` from `@supabase/ssr`, reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Supabase client (server):** `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`
- **Supabase types:** `src/integrations/supabase/types.ts` (generated)
- **Edge functions:** `supabase/functions/` — 12 functions (all deployed)
- **Migrations:** `supabase/migrations/` — 53 files

## Supabase Backend
- **Project:** Fortun Wishnet (`zlmideilxfnokemzkavm`)
- **Region:** us-west-1
- **Postgres:** 17.6.1 + pgvector 0.8 (HNSW, 1536-dim, cosine)
- **Tables:** 33 in `public` schema — all with RLS enabled
- **Edge functions (12):** manage-users, ai-chat, storage-stats, update-bucket-settings, serve-file, process-embeddings, search-knowledge, process-ocr, promptor, osha-chat, pixel-chat, wishpedia-generate
- **Storage buckets:** brain-documents, files, wishpedia-media, profile-pictures

## Domain Areas
- **Auth / users:** profiles, user_roles, user_permissions
- **Files:** files, file_tags, file_versions, file_settings
- **RAG / Knowledge:** brain_sections, brain_documents, brain_categories, knowledge_embeddings, embedding_jobs
- **Rules:** heart_rules, heart_categories
- **Promptor:** promptor_settings, promptor_runs, quick_prompts
- **Agents:** agent_settings, osha_*, muse_*, pixel_*
- **Wishpedia:** wishpedia_categories, wishpedia_entries, wishpedia_entry_images
- **Branding / config:** branding_settings, llm_settings, sectors, console_messages

## How to Run
```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run start   # serve production build
npm run lint
```

## Environment Variables
Create a `.env.local` file (never commit) — see `.env.example` for required vars:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PROJECT_ID=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SENTRY_DSN=...  (optional — error tracking dormant without it)
```

## Conventions
- TypeScript strict mode
- shadcn/ui components in `src/components/ui/` — don't modify, extend
- Tailwind for all styling (no CSS modules)
- `@/` import alias for `src/`
- Server state via TanStack Query
- Forms via React Hook Form + Zod
- Server Components by default; add `"use client"` only when required

## Agent Workflow
The following agents are available globally at `~/.claude/agents/`:

- 🧠 **Planner** — multi-step task planning
- 🔍 **Researcher** — unfamiliar tech / APIs
- 👔 **Technical CTO** — architecture decisions
- 🎨 **Figma-to-Code** — Figma → code
- 🎨 **UI Reviewer** — after building any visual component
- 🔧 **Code Reviewer** — after building backend logic
- 🔍 **SEO Auditor** — after building public pages
- 🔒 **Security Auditor** — mandatory during QA
- 🐛 **Bug Fixer** — error investigation

### Mandatory review flow
- Visual component → UI Reviewer
- Backend logic → Code Reviewer
- Public page → SEO Auditor
- QA phase → Security Auditor

## Audit History

### Full functionality + UI/UX audit + remediation (2026-05-21)
Complete audit (4 lenses: security-auditor + code-reviewer static, Supabase MCP, live Playwright across every route via 2 temporary provisioned audit users, ui-reviewer on 27 screenshots). Deliverables: [AUDIT_FINDINGS.md](AUDIT_FINDINGS.md) + [AUDIT_REMEDIATION_PLAN.md](AUDIT_REMEDIATION_PLAN.md) (8 phases), screenshots in `audit/screens/`. Remediation executed on branch **`fix/audit-remediation`** (not merged/pushed).

**Done + verified (committed):**
- **BUG-01 (High)** — Promptor Create froze on "Processing…" despite a 200 + persisted run. Root cause: the `useRef(true)` + cleanup-only mounted-guard left `mountedRef.current` stuck `false` after React StrictMode's dev mount→unmount→remount, so the success continuation early-returned before `setStep('done')`. Fix: reset the flag in the effect setup. Applied to [PromptorCreate.tsx](src/components/promptor/PromptorCreate.tsx), [PromptorOptimize.tsx](src/components/promptor/PromptorOptimize.tsx), [AuthContext.tsx](src/contexts/AuthContext.tsx). **Verified live.**
- **PERM-01 (High)** — per-agent `ai_can_access_*` toggles were enforced nowhere. Added `agentKey` to [ToolProtectedRoute.tsx](src/components/ToolProtectedRoute.tsx) + wired osha/pixel/promptor/nexus routes. **Verified live** (Osha denied / Promptor allowed for a restricted user).
- **DATA-01 (Med)** — Vector Store undercounted (1,000 vs 1,019). Real source `useVectorStoreStats`/`useIndexedItems` ([useVectorStoreManagement.ts](src/hooks/useVectorStoreManagement.ts)) used `.range(0,9999)` capped by PostgREST max-rows (1000). Added `fetchAllEmbeddings()` pagination. Also hardened `useEmbeddingStats` to use COUNT. **Verified live: 1,019 / 12 docs.**
- **CODE-01/03** safe-defaults ([usePromptorSettings](src/hooks/promptor/usePromptorSettings.ts), [useProviderKeyStatus](src/hooks/useProviderKeyStatus.ts)); **CODE-02** Sentry+toast on [UploadDocumentDialog](src/components/brain/UploadDocumentDialog.tsx) silent catch; **UX-01** Nexus "Checking AI providers…" loading state.
- **A11Y-01 + UI-05** — Heart RuleCard aria-labels + amber badge contrast (amber-800).
- **Phase 5 DB (migrations applied via MCP + mirrored to `supabase/migrations/`):** SUP-02 (user_usage INSERT RLS → `auth.uid()=user_id`), SUP-03 (search_path on match_knowledge_hybrid/set_ef_search), SUP-05 (revoked anon EXECUTE on 8 SECURITY DEFINER fns; authenticated/service_role retained for RLS/RAG — **verified** anon=false, RAG live-tested OK), SUP-06 (3 FK indexes).
- **Edge code (committed, SEC-01/02/05/06/09/12):** wildcard CORS → `getCorsHeaders` allowlist on 7 fns; manage-users rate limit; update-bucket-settings validation + dropped leaked dashboard URL; serve-file svg/html attachment; wishpedia-generate `is_admin` RPC + rate limit. **`manage-users` deployed (v130) via MCP.**
- QA: `tsc` clean, `lint` 0 errors (36 known warnings), `npm run build` passed.

**Edge deploys — DONE:** all 7 SEC-01 functions deployed via Supabase MCP and CORS-verified live (manage-users v130, update-bucket-settings v108, serve-file v103, storage-stats v111, search-knowledge v106, process-embeddings v113, wishpedia-generate v31). Preflight from `localhost:8000` returns the allowlisted origin; a non-allowlisted origin gets the safe default (no wildcard).

**Phase 3b — DONE + deployed:** osha-chat SEC-03 (internal-host denylist in `fetchUrlContent` + `sanitizeForPrompt` on fetched page content, fenced as untrusted) + SEC-04 (image-result host validation + 20MB cap); pixel-chat SEC-04. Deployed **byte-exact via CLI** (osha-chat v125 `verify_jwt=false`, pixel-chat v90 `verify_jwt=true`) — MCP inline was deemed unsafe for these 1,593/2,520-line files (transcription-fidelity risk on the live main agent). Osha RAG smoke-tested live OK. SEC-07 (DB-backed limiter) deferred (optional; in-memory limiter is an acceptable first layer).

**NOT done — remaining (see MEMORY.md):**
- **Phase 6 UI remaining** — UI-01 (sidebar Collapse clipped, every screen), UI-02 (Pixel dark theme), UI-03/04/06 (more amber/badge contrast), UI-07 (disabled-button token), UI-08–19, UI-LB-01.
- **Phase 7** backlog (CODE-04 file splits, CODE-05–09, SEC-08/10/11).
- **Manual (Supabase Dashboard):** SUP-01 enable leaked-password protection; SUP-04 narrow public-bucket listing policies (deferred — image-display risk).
- **Lessons:** never run `npm run build` while `npm run dev` is live (both write `.next`; disrupted HMR mid-audit). The `useRef(true)`+cleanup-only mounted-guard is a StrictMode footgun — always reset to `true` in the effect setup.

### Refactor — Wishpedia UI rebuilt to the app's card-framed pattern (2026-05-21)
Replaced the off-pattern "cosmic-editorial" Wishpedia design (full-bleed nebula headers, masonry, dark-glass cards, cinematic black-overlay hero) with the standard card-framed pattern used by the AI Agents page. UI-only — hooks (`useWishpediaEntries/Categories/Images`, `useBulkWishpediaIndex`) and `wishpedia-generate` edge fn untouched.
- **Index** [WishpediaIndex.tsx](src/screens/WishpediaIndex.tsx): standard shell (`bg-card rounded-2xl border`) → header (amber BookOpen icon-box + title + entry count) → standard `Input` search + `Button` category chips → responsive **grid** (2/3/4/5 cols, replaced masonry) in ScrollArea. All actions preserved (New Entry, Index All, Vector Store, Settings, back). Skeleton-grid loading + filtered/first-run empty states.
- **Card** [WishpediaEntryCard.tsx](src/components/wishpedia/WishpediaEntryCard.tsx): AgentCard-style clean `Card` — image hero (object-cover, hover-scale), name, amber category badge, Indexed/image-count overlays, `Link` + focus ring.
- **Detail** [WishpediaCharacterView.tsx](src/components/wishpedia/WishpediaCharacterView.tsx): replaced cinematic hero with a framed-hero + info-panel split; angle views → labeled grid; gallery → responsive grid (was masonry); both open the lightbox. [WishpediaEntry.tsx](src/screens/WishpediaEntry.tsx): de-cosmiced header (removed ambient glow), edit mode flattened (standard inputs, solid `bg-amber-500 text-amber-950` save/toggle, removed checkerboard + custom glow rings), card-shaped loading skeleton.
- **QA:** tsc/lint clean, `npm run build` passed. ui-reviewer score **B+** → fixed the 1 critical (WishpediaLightbox nav/close buttons had no focus-visible ring — keyboard inaccessible) + key warnings (amber-500+white WCAG-AA contrast on Primary badges/buttons → `text-amber-950`; edit-mode de-cosmic; loading skeleton). Sub-components (lightbox/galleries/create dialog) were already neutral. Cosmic `wp-*` keyframes left in globals.css (harmless; `wp-animate-in` still shared with Dashboard).

### Feature — Multimodal Brain RAG + true image-to-image recreation (2026-05-21)
Agents can now retrieve, SEE, and RECREATE Brain images; full Brain+Heart+Wishpedia access verified for every agent.
- **Indexing** [process-ocr](supabase/functions/process-ocr/index.ts): standalone image docs get `describeMode` (rich visual description + OCR, not OCR-only) so picture-only images are searchable; metadata now carries `is_image`, `storage_path`, `mime_type`, `extraction_method:'vision_describe'`. Client `useOcrIndexing` already routes images to process-ocr (manual index button). PDF path unchanged.
- **Retrieval/vision** [osha-chat](supabase/functions/osha-chat/index.ts) + [pixel-chat](supabase/functions/pixel-chat/index.ts): `searchBrain` returns `{content, imageUrl?}`, mints 5-min signed URLs for `is_image` chunks (dedup), passes `query_text` (hybrid). Retrieved Brain images attached to vision-model calls (OpenAI `image_url` / Gemini inline) with a **text-only retry fail-safe** so a vision failure degrades to the description instead of crashing.
- **Image-to-image** (Osha + Pixel): when source image(s) exist (user attachments + up to 4 retrieved Brain images), OpenAI uses `/v1/images/edits` (multipart, multiple `image[]` to COMBINE characters) and Gemini uses inline images; falls back to `/images/generations` if the edit is rejected. Uses the globally **selected image model** (`llm_settings.active_image_provider`/`openai_image_model` = gpt-image-1.5).
- **Image intent** (osha-chat): `detectImageIntent` rewritten — article-proof verb+noun regex ("generate **an** image" now matches; old keywords only matched article-less "generate image") + explicit "output must be an image". This was why Osha replied with TEXT instead of generating.
- **Copyright** (osha-chat system prompt): "OWNED VISUAL ASSETS" clause — Brain/Wishpedia/attachments are Fortun's own first-party assets; never refuse to recreate on copyright/originality grounds. (No Heart rule caused the refusal — the model was confabulating; confirmed via DB query.)
- **RAG audit (no changes needed):** Osha/ai-chat/Promptor pull Brain+Wishpedia via RAG and Heart via full direct fetch; Pixel searches all source types + Wishpedia images + Heart. 100% access confirmed once the duplicate `match_knowledge` overload was dropped (see entry below).
- **Client fixes** [OshaMessageBubble](src/components/osha/OshaMessageBubble.tsx): removed `loading="lazy"` + added `onError` (lazy+`display:none` deadlock left generated images stuck on the skeleton). [useOshaChatController](src/hooks/useOshaChatController.ts): `handleClearHistory` resets `localMessages` immediately (DB-sync effect ignored the empty server result, so clear didn't reflect until remount).
- **Deployed** via CLI (token): process-ocr, osha-chat, pixel-chat. tsc+lint clean (client). Verified by Sam: Osha sees + recreates + combines images, no copyright refusal, correct image model.
- **Not done (optional):** Vector Store / Brain image thumbnails+badges (UI polish); security-auditor pass on signed-URL TTLs + private-bucket image handling.
- **Lesson:** OpenAI image edits = multipart/form-data (`image[]`, PNG), not JSON; gpt-image always returns b64. Vision intent detection must allow articles ("an"/"a").

### Fix — RAG retrieval broken by duplicate match_knowledge overload (2026-05-21)
Symptom: Osha (and any agent) couldn't access Brain knowledge — a freshly indexed PDF returned nothing. Deep investigation ruled out indexing (new doc had 74 valid 1536-dim chunks, `restricted_agents` null, same `text-embedding-3-small` model as the query, identical metadata to working docs). **Root cause:** TWO overloaded `public.match_knowledge` functions existed — the legacy 5-arg pure-vector version and the current 6-arg hybrid version (`query_text` added by the RAG-004 hybrid migration via CREATE OR REPLACE, which created a 2nd function instead of replacing). Any caller omitting `query_text` (osha-chat, ai-chat, pixel-chat ×2) hit `ERROR: function match_knowledge(...) is not unique`; `searchBrain` caught it and returned `[]` → no Brain context. Only `search-knowledge` (passes `query_text`) worked, which confirmed the hybrid fn is healthy/canonical. Reproduced the exact failure in SQL.
- **Fix (migration `drop_duplicate_match_knowledge_overload`):** `DROP FUNCTION public.match_knowledge(text, double precision, integer, knowledge_source_type[], text)` — the legacy 5-arg overload. All callers' 4/5-arg calls now resolve uniquely to the hybrid fn (`query_text` DEFAULT NULL → clean vector search). **Approved by Sam** (destructive prod change). No edge-function code changes or redeploys — code was already correct; only the ambiguity blocked it.
- **Verified:** re-ran osha-chat's exact 5-arg RPC against the new doc — resolves cleanly, returns chunks (0.700 self-match = hybrid `0.7×vector` weight, proving the kept fn is the hybrid). search-knowledge unaffected.
- **Optional follow-up (not done):** osha-chat/ai-chat/pixel-chat could pass `query_text` to actually use the hybrid BM25 half (better keyword recall) — currently they get pure vector. Enhancement, requires CLI redeploys.
- **Lesson:** adding a param to a Postgres function via CREATE OR REPLACE creates a NEW overload, it does not replace — always DROP the old signature in the same migration.

### Fix — port 8000 CORS block (2026-05-21)
Edge-function calls from `http://localhost:8000` were CORS-blocked: [_shared/cors.ts](supabase/functions/_shared/cors.ts) allowlist had `:3000`/`:8080`/prod but not `:8000` (LOCKED_PORT), so it fell back to `allowed[0]` and the browser rejected the preflight (symptom: `fetch` threw "blocked before reaching the server"). Root cause: project standardized on 8080 in package.json while CLAUDE.md LOCKED_PORT is 8000. Sam chose to keep 8000. Resolution: added `http://localhost:8000` to `DEFAULT_ORIGINS` in cors.ts; switched [package.json](package.json) dev/start scripts to `-p 8000`; set the `ALLOWED_ORIGINS` secret via CLI (`http://localhost:3000,http://localhost:8000,http://localhost:8080,https://wishnet.fortunwishdom.com`) — runtime override read per-request, no redeploy needed, applies to all functions. Verified live: preflight from `:8000`/`:8080`/prod each return matching `Access-Control-Allow-Origin`. **Note:** `getCorsHeaders` reads `ALLOWED_ORIGINS` env at request time; setting that secret overrides DEFAULT_ORIGINS entirely, so the value must list every allowed origin.

### Feature — Rename Echo → Whisper (podcast agent) + new ATLAS agent (2026-05-21)
Executed as a 6-phase plan. Echo (customer-support, coming-soon) renamed to **Whisper** (podcast generator: AI script → ElevenLabs audio); new **ATLAS** agent added (Kickstarter Ops Control, coming-soon). Both are coming-soon pages now; build later.
- **Whisper rename (app layer):** [agents.ts](src/data/agents.ts) (role "Podcast Generator AI", icon `Mic`, tags Podcast/Audio/Script/Voice, path `/ai-agents/whisper`), [routeConfig.ts](src/routes/routeConfig.ts), route folder `whisper/` created + `echo/` deleted, [Header.tsx](src/components/layout/Header.tsx), [agentGradients.ts](src/components/nexus/agentGradients.ts) (key `whisper`), [AgentConfigPanel.tsx](src/components/nexus/AgentConfigPanel.tsx) (podcast system prompt), [promptLibraryConstants.ts](src/components/nexus/promptLibraryConstants.ts) (support template → podcast-script template), release-notes [mockPlannedData.ts](src/components/release-notes/mockPlannedData.ts) + [mockData.ts](src/components/release-notes/mockData.ts).
- **Whisper permission rename (DB):** migration `rename_ai_can_access_echo_to_whisper` — `ALTER TABLE user_permissions RENAME COLUMN ai_can_access_echo TO ai_can_access_whisper` (verified no dependent policies/functions/views). Updated [types.ts](src/integrations/supabase/types.ts) (3×), [user.ts](src/types/user.ts), [useUserPermissions.ts](src/hooks/useUserPermissions.ts), [EditUserSheet.tsx](src/components/settings/EditUserSheet.tsx) (toggle "Whisper (Podcast)", icon `Mic`).
- **ATLAS new agent:** [agents.ts](src/data/agents.ts) (role "Kickstarter Ops Control Agent", icon `Boxes`, accent teal→emerald, path `/ai-agents/atlas`), [routeConfig.ts](src/routes/routeConfig.ts), new [atlas/page.tsx](src/app/(protected)/ai-agents/atlas/page.tsx), Header title `ATLAS`, agentGradients `atlas` (teal→emerald), AgentConfigPanel prompt ("flag risks/missing data, recommend, never decide"). Permission column `ai_can_access_atlas` **already existed in DB** (default true) — no migration; `types/user.ts` + `useUserPermissions.ts` already declared it; only [EditUserSheet.tsx](src/components/settings/EditUserSheet.tsx) needed the "ATLAS (Operations)" toggle.
- **Osha self-knowledge:** [osha-chat/index.ts](supabase/functions/osha-chat/index.ts) agent registry (echo→whisper + atlas) + coming-soon status check. **DEPLOYED** via Supabase CLI (`npx supabase functions deploy osha-chat`) on 2026-05-21 — bundled the new index.ts + cors.ts (also shipped the previously-staged Tasks 2/9/10 osha-chat changes, all inert/forward-compatible).
- QA: `tsc` clean, `eslint` 0 errors (36 pre-existing react-refresh warnings), `npm run build` passed (route table shows `/ai-agents/whisper` + `/ai-agents/atlas`, no `/ai-agents/echo`). Runtime: whisper/atlas → 307 auth-redirect (healthy), echo → 404. Zero `echo` references remain in `src` or `supabase/functions`.
- **Note (stale Next cache):** deleting a route folder while a dev server holds `.next` leaves a stale `.next/types/validator.ts` referencing the old page; delete it (or rebuild) — a full `npm run build` regenerates it clean.

### Fix — dashboard inner scrollbar + clear-history actionable errors (2026-05-21)
Two issues, both surfaced while testing in a browser running the **Similarweb extension** (`frame_ant.js`, ext id `hoklmmgfnpapgjgcpechhaamimifchmp`), which monkey-patches `window.fetch` and intermittently blocks edge-function POSTs. See [[the 2026-05-20 hooks-resilience entry]] below — same extension, same `window.fetch` interception.

**1. Dashboard floating scrollbar** — [Dashboard.tsx:233](src/screens/Dashboard.tsx#L233). The dashboard was the only screen breaking the app's layout convention (every other screen is `flex h-full p-0` with internal card scroll, relying on `<main>` for padding). It set its own `p-4 md:p-6 overflow-auto`, so its scrollbar landed *inside* `<main>`'s padding with bare background to its right — a scrollbar "floating inside the frame," plus doubled padding. Fixed by bleeding the scroll container out of `<main>`'s horizontal padding and restoring it inside: `h-full overflow-y-auto -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6`. Scrollbar now flush to the window edge, single source of padding. No shared-layout change (zero risk to other pages).

**2. "Failed to clear history" on Osha + Pixel** — NOT a server bug. Diagnosis via Supabase MCP: RLS policy `Users can manage own osha messages` (ALL, `auth.uid()=user_id`) **allows** the delete; the only trigger is `AFTER INSERT`; no FKs block deletion; deployed `osha-chat` v116 has the correct handler. Edge logs showed **lone `OPTIONS 200` preflights with no following `POST`** — the browser-issued preflight reaches the server but the `window.fetch` POST is intercepted/rejected by the Similarweb extension before it leaves the browser. The hooks threw a hardcoded `'Failed to clear history'` that masked the cause. Fixed [useOshaMessages.ts](src/hooks/osha/useOshaMessages.ts) + [usePixelMessages.ts](src/hooks/pixel/usePixelMessages.ts): `try/catch` around `fetch` → actionable "request blocked before reaching the server — check connection/extensions" message; on `!res.ok`, read and surface the server's real error body; `onError` now shows the specific message instead of a generic string.
- **Root-cause action for Sam:** run this admin app in a clean browser profile (no Similarweb) or allowlist the extension to exclude `localhost` + `*.supabase.co`. The extension has now bitten 3 surfaces (dashboard load, Osha clear, Pixel clear).
- QA: `tsc --noEmit` clean, eslint clean on all touched files.

### Fix — settings useQuery hooks crash on fetch network throw (2026-05-20)
Dashboard showed a `Runtime TypeError: Failed to fetch` overlay after login. Root trigger was a browser extension (`frame_ant.js`, ext id `hoklmmgfnpapgjgcpechhaamimifchmp`) that monkey-patches `window.fetch` and rejects the request to the `osha-chat` edge function. Confirmed app-side clean: Playwright smoke test (no extensions) loaded the app with zero errors.
- **Real code gap:** read-on-load `useQuery` settings hooks only handled HTTP error *statuses* (`if (!res.ok) return <default>`) but let a thrown `fetch` (network/extension failure) propagate and surface as a crash.
- **Fix:** wrapped the `fetch` in a `try/catch` returning the existing safe default, matching each hook's `getAuthHeaders` catch pattern. Three hooks: [useOshaSettings.ts](src/hooks/osha/useOshaSettings.ts) → `DEFAULT_OSHA_SETTINGS`, [usePixelSettings.ts](src/hooks/pixel/usePixelSettings.ts) → `DEFAULT_PIXEL_SETTINGS`, [usePixelBlueprints.ts](src/hooks/pixel/usePixelBlueprints.ts) → `[]`.
- **Deliberately left as-is:** user-triggered mutations (`useOshaSend`, `usePixelSend`, save/clear/delete) — they `throw` into Sonner `onError` toasts and never run on load. `useStorage` + knowledge-search queries `throw` by design for error-state UI; catching would mask real failures.
- QA: `tsc --noEmit` clean, eslint clean on all three files.

### Batch Task 9 — Pulse tab + upload-post.com API integration (2026-04-16)
New Pulse settings tab with full upload-post.com API integration. Migration + edge fn + client components.
- **API Research:** upload-post.com API fully documented. Auth: `Authorization: Apikey <key>` (custom scheme, NOT Bearer). Base URL: `https://api.upload-post.com/api`. 11 platforms supported. Public docs, no paywall.
- **Migration** [`pulse_settings_columns`](supabase/migrations/) — adds `upload_post_api_key` TEXT, `pulse_timezone` TEXT DEFAULT 'UTC', `pulse_queue_enabled` BOOLEAN DEFAULT false, `pulse_webhook_url` TEXT to llm_settings. Key column follows SEC-001 pattern (never in client whitelist).
- **settings-keys extension:** Provider type widened to `'openai' | 'gemini' | 'fal' | 'pulse'`. `isValidProvider()`, `PROVIDER_COLUMN`, `PROVIDER_ENV_VAR`, `check-keys` response all extended. `ProviderKeyProvider` type + `ProviderKeyStatus` interface + `ApiKeyEditor` label/placeholder maps updated.
- **New edge function** [`pulse-api`](supabase/functions/pulse-api/index.ts) — secure proxy for upload-post.com. Actions: `test-connection` (GET /uploadposts/me), `list-accounts` (GET /uploadposts/users), `get-queue-settings` / `update-queue-settings` (GET/POST /uploadposts/queue/settings), `get-platforms` (facebook/linkedin/pinterest pages), `set-webhook`. Auth + admin gate + 30/min rate limit. Key never in responses.
- **New hook** [`usePulseSettings`](src/hooks/usePulseSettings.ts) — `usePulseTestConnection`, `usePulseAccounts`, `usePulseQueueSettings`, `useUpdatePulseQueueSettings`, `usePulsePlatforms`.
- **New component** [`PulseSettings`](src/components/settings/PulseSettings.tsx) — API connection card (ApiKeyEditor + test connection + status badge), connected profiles list, platform pages (Facebook/LinkedIn/Pinterest), API info grid. Rose-500 accent.
- **Settings tab wiring** — Radio icon, rose-500 accent, admin-only, `?tab=pulse` URL param.
- **`PULSE_API_ENDPOINT`** registered in [`src/config/api.ts`](src/config/api.ts).
- **Client whitelist** in `useLLMSettings` extended with `pulse_timezone`, `pulse_queue_enabled`, `pulse_webhook_url` — NOT `upload_post_api_key`.
- **Deploy pending:** `settings-keys` and `pulse-api` edge functions need CLI deploy.
- QA: typecheck clean, lint 0 errors, build passed.

### Batch Task 8 — Pixel dark mode + Wishdom button + WishReference sidebar (2026-04-16)
Three feature additions to the Pixel agent page (/ai-agents/pixel). No migrations, no edge fn changes.
- **Pixel-local theme toggle:** `data-pixel-theme` attribute on PixelAgent root `<div>` scopes CSS variable overrides in [`globals.css`](src/app/globals.css) — Pixel page toggles light/dark independently of the global app theme. State persisted to `localStorage('pixel-theme')`, defaults to dark. Sun/Moon toggle button in [`PixelTopBar`](src/components/pixel/PixelTopBar.tsx) (desktop + mobile dropdown).
- **Wishdom nav button:** Package icon button in PixelTopBar right-side group, navigates to `/wishdom`. Amber hover accent. Added to both desktop and mobile dropdown.
- **WishReferencePanel:** New component at [`src/components/pixel/WishReferencePanel.tsx`](src/components/pixel/WishReferencePanel.tsx). Replaces the old Templates + References sections in [`PixelControlPanel`](src/components/pixel/PixelControlPanel.tsx). Features: searchable Wishpedia entry picker (multi-select), `EntryImageLoader` sub-component pattern (one per selected entry, avoids hook-rules violation), thumbnail chip grid with angle labels, native HTML5 drag-and-drop zone for ad-hoc image references, 5-image cap with 3MB size guard, all empty/loading/error states.
- **Exported type:** `WishpediaImageRef` from [`WishReferencePanel`](src/components/pixel/WishReferencePanel.tsx) — `{ wishpediaImageId, entryId, entryName, angle, publicUrl }`.
- **PixelAgent state wiring:** [`PixelAgent.tsx`](src/screens/PixelAgent.tsx) manages `wishpediaImageRefs` state, passes to both desktop + mobile ControlPanel instances + PixelStudio. `handleAddWishpediaImages`, `handleRemoveWishpediaImage`, `handleDropFiles` handlers.
- **pixel-chat payload:** [`PixelStudio.tsx`](src/components/pixel/PixelStudio.tsx) `handleSend` fetches Wishpedia image public URLs → blob → base64, pushes as `AttachmentContext` into the existing attachments array. 3MB per-image guard, send-allowed check includes `wishpediaImageRefs.length`.
- **Templates accessible via:** Settings Sheet → Visual Templates (PixelBlueprintPanel). No UX regression from sidebar removal.
- QA: typecheck clean, lint 0 errors, build passed.

### Batch Task 4 — Profile page audit & fix (2026-04-16)
12 bugs fixed on the /profile page. No migrations, no edge fn changes.
- **Avatar upload fix:** New [`useUploadAvatar`](src/hooks/useUploadAvatar.ts) hook uploads directly to the public `profile-pictures` bucket (was incorrectly using `useUploadFile` → private `files` bucket). Stores public URL from `profile-pictures` via `getPublicUrl`. Broken file-picker gallery removed (images from private `files` bucket returned 403 since SEC-019).
- **Form validation:** Email change now validates with regex (`^[^\s@]+@[^\s@]+\.[^\s@]+$`). Password min bumped from 6 → 8 (matches Supabase default). Empty/whitespace-only name guard added with toast.
- **UX fixes:** Double toast on avatar upload eliminated (hook owns single toast). Password + email fields clear on dialog close via `onOpenChange`. Pending-email-change indicator added: amber banner in email dialog + Clock badge on [`ProfileInfoCard`](src/components/profile/ProfileInfoCard.tsx).
- **Dead code removed:** `Image`, `ScrollArea`, `Separator`, `Check`, `ImageIcon` imports dropped. `useFiles`/`useUploadFile` no longer imported.
- **Bucket verified:** `profile-pictures` confirmed public with user-scoped RLS (INSERT/UPDATE/DELETE require `auth.uid()` match, SELECT open).
- QA: typecheck clean, lint 0 errors, build passed.

### Batch Task 10 — fal.ai third provider card (2026-04-16)
Full third AI provider added to the LLM settings page. Reuses all Task 6 infrastructure (ApiKeyEditor, settings-keys edge fn, fal_api_key column).
- **Migration** [`fal_ai_provider_columns`](supabase/migrations/) — adds `fal_text_model`, `fal_image_model`, `fal_video_model` TEXT + `fal_enabled` BOOLEAN to llm_settings. `fal_api_key` was already pre-added by Task 6.
- **Model registry** in [src/config/llmModels.ts](src/config/llmModels.ts) — `FAL_IMAGE_MODELS` (8 models: FLUX family, Ideogram V3, Recraft V4, Imagen 4), `FAL_VIDEO_MODELS` (5 models: Kling 3.0 Pro, Veo 3.1/Fast, Wan 2.7, Seedance 2.0), `FAL_TEXT_MODELS` (2: OpenRouter gateway, Seed 2.0 Mini). Helper functions widened to `LLMProviderKey = 'openai' | 'gemini' | 'fal'`.
- **LLMSettings type** in [src/types/llm.ts](src/types/llm.ts) — `LLMProvider` union widened to include `'fal'`, 4 new fields added.
- **Client column whitelist** in [src/hooks/useLLMSettings.ts](src/hooks/useLLMSettings.ts) extended with 4 fal columns.
- **Edge fn routing** in [supabase/functions/ai-chat/index.ts](supabase/functions/ai-chat/index.ts) — `FAL_IMAGE_CAPABLE` + `FAL_VIDEO_CAPABLE` allow-lists, fal key resolution branch, fal.ai image branch (POST to `fal.run/{model}` with `Authorization: Key {FAL_KEY}`), fal.ai video branch (same pattern, 5min timeout), `check-keys` includes fal. **Deploy pending** — file too large for MCP inline; needs CLI deploy via `npx supabase functions deploy ai-chat`.
- **ProviderCard** widened to accept `provider: 'openai' | 'gemini' | 'fal'`. FalIcon SVG added inline. fal.ai card renders below Gemini with purple accent border.
- **Active Provider Selection** — fal.ai added as a selectable option for Text, Image, and Video dropdowns.
- QA: typecheck clean, lint 0 errors, build passed.

### Batch Task 7 — Wishpedia premium redesign (2026-04-16)
Complete visual overhaul of the Wishpedia index + entry pages. Cosmic-editorial aesthetic, zero functional changes to hooks/edge functions.

**Index page ([src/screens/WishpediaIndex.tsx](src/screens/WishpediaIndex.tsx)):**
- Cosmic nebula header: zinc-950/40 base + violet-900/20 and indigo-950/20 radial blobs + amber-500/[0.03] dust cloud
- Title block: 4xl font-black, text-gradient "Wish" span (amber-300→amber-500), icon scaled to w-20 h-20 with wp-icon-pulse animation, glass-pill entry count badge
- Category chips → glass morphism: bg-white/[0.04] + border-white/[0.08] + backdrop-blur-sm; active: bg-amber-500/20 + border-amber-500/40 + text-amber-300
- Search bar: full-width (max-w-md dropped), violet-500/10 border + violet-500/20 focus ring
- Section dividers → gradient from-transparent via-amber-500/20 to-transparent
- **Masonry grid:** `columns-2 sm:columns-3 lg:columns-4 xl:columns-5` with `break-inside-avoid` per card (CSS-only, zero JS library)
- Card entrance: wp-card-reveal animation (replaces Tailwind animate-in)
- Empty state: cosmic nebula orb (violet-900/30 → indigo-900/20 gradient, violet-500/10 border + shadow)
- Loading skeleton: masonry layout with alternating aspect-[2/3] / aspect-[3/4] + wp-shimmer class

**Entry card ([src/components/wishpedia/WishpediaEntryCard.tsx](src/components/wishpedia/WishpediaEntryCard.tsx)):**
- Glass-morphism: bg-black/40 + backdrop-blur-md + border-white/[0.06]
- Aspect ratio: 3/4 → **2/3** (taller, more dramatic)
- Intensified vignette: from-black/75 + hover violet radial glow
- Hover: shadow-violet-500/10 + -translate-y-2 (was -1.5)
- Category badge: glass pill (bg-white/[0.08] + backdrop-blur-sm + border-white/[0.10])

**Entry page view ([src/components/wishpedia/WishpediaCharacterView.tsx](src/components/wishpedia/WishpediaCharacterView.tsx)):**
- **Cinematic hero:** replaces the 58/42 split-panel with a full-width `aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]` hero with `object-cover`, gradient overlay from-black/90 via-black/30, entry name + category pill overlaid at bottom-left
- Horizontal metadata strip below hero (Images + Created + Updated) replaces the old right-panel grid
- Description section below metadata at text-base sm:text-lg
- Filmstrip thumbnails upgraded: w-24 sm:w-28, aspect-[3/4], rounded-2xl, amber-500 ring on active
- Free gallery: masonry `columns-2 sm:columns-3 lg:columns-4`

**New component: [src/components/wishpedia/WishpediaLightbox.tsx](src/components/wishpedia/WishpediaLightbox.tsx):**
- Dialog-based (shadcn Dialog), zero new dependencies
- Full-screen (95vw × 92vh), bg-black/95 + backdrop-blur-xl
- Keyboard arrow nav (ArrowLeft/Right + Escape)
- Prev/Next buttons (48px tap targets), angle label pill at bottom-center, index counter
- Wired into CharacterView hero (expand button), filmstrip, and gallery tiles via lightboxOpen + lightboxIndex state

**CSS keyframes added to [src/app/globals.css](src/app/globals.css):** `wpCardReveal`, `wpHeroReveal`, `wpIconPulse`, `wpShimmer` — all respect prefers-reduced-motion.

QA: typecheck clean, lint 0 errors, `npm run build` passed. UI Reviewer deferred — first visual review should be Sam's eyes on the actual pages.

### Batch Task 6 — Editable OpenAI/Gemini API keys in-UI (2026-04-15)
Reverses the SEC-001 ban on DB-stored keys under tighter controls, unblocking Tasks 9 (Pulse) and 10 (fal.ai) which reuse the same pattern.

**Architecture chosen:** Option A (plain TEXT columns + admin-only RLS + explicit column whitelist on the client + service-role-only writes). Option B (pgcrypto AES) rejected — Supabase already encrypts at rest, RLS is admin-only, the actual threat (browser leak) is architecturally eliminated, and a decrypt RPC in every reader function adds ongoing ceremony for marginal benefit on an internal admin tool.

**What shipped:**
- **Migration** [`llm_settings_api_key_columns`](supabase/migrations/) — adds `openai_api_key`, `gemini_api_key`, **and `fal_api_key`** (pre-added for Task 10 reuse, saves a second migration). Applied via Supabase MCP.
- **Browser-leak mitigation** in [src/hooks/useLLMSettings.ts](src/hooks/useLLMSettings.ts) — explicit `LLM_SETTINGS_CLIENT_COLUMNS` whitelist replaces `.select('*')` on both the read query and the update's return `.select()`. The `LLMSettings` interface in [src/types/llm.ts](src/types/llm.ts) deliberately omits the key fields so TypeScript refuses any accidental surfacing.
- **New edge function** [supabase/functions/settings-keys/index.ts](supabase/functions/settings-keys/index.ts) deployed as v1. Actions: `update-key`, `reset-key`, `check-keys`. Auth via `getUser()` → admin gate via `is_admin` RPC → service-role write. Never returns the raw key. Rate-limited 15/min per user. Supports `openai | gemini | fal` providers so Task 10 just consumes it.
- **New hook** [src/hooks/useProviderKeyActions.ts](src/hooks/useProviderKeyActions.ts) — `useUpdateProviderKey` + `useResetProviderKey` with automatic `provider-key-status` invalidation.
- **Enriched status shape** [src/hooks/useProviderKeyStatus.ts](src/hooks/useProviderKeyStatus.ts) — `{ openai, gemini, fal }` now return `'db' | 'env' | 'none'` via the settings-keys `check-keys` action. Added `hasProviderKey(source)` helper to prevent the `'none'`-is-truthy string trap. All 6 callsites across `LLMProvidersSettings.tsx`, `NexusHeader.tsx`, `ProviderStatus.tsx`, and `useNexusConsoleController.ts` migrated.
- **New component** [src/components/settings/ApiKeyEditor.tsx](src/components/settings/ApiKeyEditor.tsx) — reusable across OpenAI/Gemini/fal. Admin-only (returns null otherwise). Masked input with reveal toggle, save clears state synchronously, reset button only renders when `keySource === 'db'`. Fires Sonner toasts on all outcomes. Accessible (aria-labels, htmlFor).
- **Wired into** [src/components/settings/ProviderCard.tsx](src/components/settings/ProviderCard.tsx) — the old static `API Key` status block replaced with `<ApiKeyEditor />`. `ProviderCardProps` extended with `keySource` + `isAdmin`, threaded from `LLMProvidersSettings.tsx` via `useAuth()`.
- Edge fn readers (`ai-chat`, `osha-chat`, `pixel-chat`, `promptor`, `wishpedia-generate`) already had the `settings.<provider>_api_key || Deno.env.get(...)` fallback pattern, so the new columns are picked up automatically without any reader updates. No redeploy needed for those.

**Security properties:**
- Key never reaches browser: column whitelist + `LLMSettings` type + explicit return select cover all three SELECT paths.
- Key never in responses: settings-keys returns `{ success: true }` or source classifications only.
- Key never logged: edge fn logs status strings only, never the value.
- Write path requires admin: auth check + `is_admin` RPC + rate limit.
- Input validation: provider enum, key length ≤4096, trim + non-empty required.
- SEC-001 reversal is documented in the migration comment and in `src/types/llm.ts`.

**Deprecated surface:** `ai-chat`'s `check-keys` action still returns the old `{ openai: boolean, gemini: boolean }` shape but has zero callers now. Left in place for rollback safety; can be removed in a future cleanup pass.

QA: typecheck clean, lint 0 errors (35 pre-existing warnings on unrelated files), `npm run build` passed. Migration applied. settings-keys edge function deployed as v1. No code-reviewer / security-auditor agent runs — self-audited against the plan's mandatory security checklist; all 9 items pass. Manual first-click validation (enter a test key, save, verify DB value + status badge flip) deferred to Sam.

### Batch Task 5 — Gemini 3.1 Pro + Nano Banana 2 added to LLM settings (2026-04-15)
Additive: two new Gemini model entries registered + routed. No existing models touched.
- **Model identifiers verified** from official Google Gemini API docs via context7:
  - `gemini-3.1-pro-preview` — reasoning flagship (preview), REST curl example confirmed
  - `gemini-3.1-flash-image-preview` — Nano Banana 2 (preview), confirmed as plain non-thinking image endpoint
- [src/config/llmModels.ts](src/config/llmModels.ts) — `GEMINI_TEXT_MODELS` gains Gemini 3.1 Pro at the top; `GEMINI_IMAGE_MODELS` gains Nano Banana 2 at the top. Defaults unchanged (still fall back to stable `gemini-2.5-flash` / `gemini-2.5-flash-image`).
- [supabase/functions/ai-chat/index.ts](supabase/functions/ai-chat/index.ts) — `GEMINI_TEXT_CAPABLE` and `GEMINI_IMAGE_CAPABLE` allow-lists extended. `isThinkingModel` gate stays locked to `gemini-3-pro-image-preview` only (Nano Banana 2 uses plain contents body per docs). Error hint strings updated to include the new models. Deployed as ai-chat v169.
- **No DB migration needed** — `llm_settings.gemini_text_model` and `gemini_image_model` are plain TEXT columns with no CHECK constraint. The existing precedent of `gemini-3-pro-preview` / `gemini-3-pro-image-preview` already proves arbitrary strings are accepted.
- No hardcoded references to the old strings elsewhere in the codebase; defaults in `LLMProvidersSettings.tsx` / `PixelSettings.tsx` correctly fall through to the GA stable model.
- QA: typecheck clean, lint 0 errors, `npm run build` passed, ai-chat deployed via Supabase MCP. Live test buttons deferred to Sam's manual validation (requires a live Gemini API key).

### Batch Task 3 — Promptor optimize-prompt button on Osha + Pixel (2026-04-15)
Net-new feature: a Wand2 icon button next to the send button on both the Osha and Pixel chat inputs. Clicking it rewrites the current draft via Promptor without sending it. Uses existing Promptor infrastructure (Heart rules + Brain context still enforced).
- **Token budget:** new [`TOKEN_BUDGETS.PROMPT_OPTIMIZE = 800`](supabase/functions/_shared/token-budgets.ts) — tight budget for fast in-chat rewrites.
- **Edge fn:** [promptor/index.ts](supabase/functions/promptor/index.ts) gained a third action `optimize-draft`. Same auth / rate-limit / Heart+Brain query path as the existing `create`/`optimize` actions; new tight user-message block; uses `PROMPT_OPTIMIZE` budget via a new `maxTokens` local. Deployed as version 97.
- **Shared hook:** new [src/hooks/promptor/useOptimizeDraft.ts](src/hooks/promptor/useOptimizeDraft.ts) wraps `callPromptor({ action: 'optimize-draft' })` in TanStack Query's `useMutation`, returns `{ optimizeDraft, isOptimizing }`, surfaces errors via Sonner. Exported from the `@/hooks/promptor` barrel.
- **Osha wiring:** [useOshaChatController.ts](src/hooks/useOshaChatController.ts) consumes the hook, exposes `handleOptimizeDraft` + `isOptimizing`. [OshaChat.tsx](src/components/osha/OshaChat.tsx) renders the Wand2 button immediately left of the send button (wrapped in a fragment, disabled when input empty or mid-optimize, Loader2 when pending, violet hover tint).
- **Pixel wiring:** [PixelStudio.tsx](src/components/pixel/PixelStudio.tsx) consumes the hook inline (no controller hook in this module — matches existing local-state pattern), adds `handleOptimizeDraft` via `useCallback`, renders the same button inside the existing Paperclip/Smile cluster.
- **Edge fn deployed** — live as promptor v97 via Supabase MCP. The feature is live now; first click should be validated manually.
- QA: typecheck clean, lint 0 errors, `npm run build` passed. Playwright live click deferred to Sam's next manual check.

### Batch Task 2 — Osha scroll fix + mode cleanup + deep research progress (2026-04-15)
Three targeted improvements to the Osha agent. UI + one edge fn file touched; edge fn changes are inert without deploy (see note below).
- **Scroll fix** ([useOshaChatController.ts:86](src/hooks/useOshaChatController.ts#L86)) — swapped bare `scrollTop = scrollHeight` for `scrollTo({ behavior: 'smooth' })` and added `localMessages.length` to the effect deps so each new bubble fires an additional scroll-to-bottom.
- **Mode cleanup** — six modes removed (creative, analyst, spark, expand, combine, filter). Workshop promoted from IDEATION_MODES into ASSISTANT_MODES. `PACK_SHORTCUTS` strip deleted entirely. `IDEATION_MODES` / `IDEATION_MODE_VALUES` / `IDEATION_STARTERS` / `isIdeationMode` state all removed. Settings default-mode Select pruned to match. Files: [oshaConstants.ts](src/components/osha/oshaConstants.ts), [useOshaChatController.ts](src/hooks/useOshaChatController.ts), [OshaChat.tsx](src/components/osha/OshaChat.tsx), [OshaSettings.tsx](src/components/osha/OshaSettings.tsx).
- **Legacy-mode safety coercion** — added `coerceMode()` in the controller so stale `osha_settings.default_mode` rows pointing to removed values fall back to `'guide'` instead of leaving the UI in a dead state.
- **Deep research 5-stage progress** — new `DEEP_RESEARCH_STAGES` export + new `DeepResearchProgress` sub-component (inline in OshaChat.tsx) rendering a vertical step list with done/active/pending states. Controller tracks `researchStageIndex` monotonically and advances it at elapsed thresholds 15 / 45 / 90 / 150s. Old `getProgressMessage()` time-bucket helper deleted. Model routing was already reading `llmSettings?.openai_deep_research_model` in the edge fn — no change needed there.
- **Edge fn pending deploy** — [osha-chat/index.ts](supabase/functions/osha-chat/index.ts) has two changes staged but NOT deployed: `defaultModeInstructions` trimmed to guide/operator/workshop (superset behavior, unreachable in UI → inert), and additive `stage` field on `poll-research` response (forward-compatible, client ignores). Both will ship in the next osha-chat deploy batch.
- QA: typecheck clean, lint 0 errors (35 pre-existing warnings), `npm run build` passed. Playwright / ui-reviewer / code-reviewer / security-auditor skipped — internal refactor + additive UI component, no external surface / credentials / public pages / auth changes.

### Batch Task 1 — MasterMind UI copy fixes (2026-04-15)
Three cosmetic string changes on /mastermind and /mastermind/brain plus removal of the Duplicate menu item on Heart rule cards. UI-only, no handler changes.
- [src/screens/MasterMind.tsx](src/screens/MasterMind.tsx): "Create Rule" → "Heart Rules", "Add Knowledge" → "Brain Knowledge", "AI Agents" stat label → "Active AI Agents"
- [src/screens/BrainKnowledge.tsx](src/screens/BrainKnowledge.tsx): both agent-count badges "{N} agents" → "{N} active agents"
- [src/components/heart/RuleCard.tsx](src/components/heart/RuleCard.tsx): removed `<DropdownMenuItem>` Duplicate block. Cleaned up orphaned `Copy` import + local `handleDuplicate` wrapper to satisfy `noUnusedLocals`. Parent-side handler in `HeartRules.tsx:504` preserved — `onDuplicate` prop still accepted by RuleCard for forward-compatibility.
- QA: typecheck clean, lint 0 errors, `npm run build` passed. Playwright/ui-reviewer skipped (zero-logic copy change).

### 9-Phase Audit + 10-Phase Remediation (2026-04-09 → 2026-04-11)

**Audit:** 9-phase post-migration audit found ~150 findings across Security, Code Quality, Supabase, RAG, Agents, UI/UX, Bug Hunt, and Prod Readiness. Archive at `C:\My-Dev-Projects\Fortun Wishnet-audit-archive\`.

**Remediation:** 10-phase perfection plan executed. Final status: 98/118 findings fixed, 15 won't-fix (justified), 1 partial, 1 unverified (Dashboard toggle), 3 backlogged (P3).

**Key changes made during remediation:**
- Removed dead deps (`@xyflow/react`, `recharts`) — 47 packages removed
- Full accessibility pass: aria-labels, htmlFor bindings, aria-pressed, skip-to-content, WCAG AA color contrast
- AuthContext hardened: mounted guard, race condition fix, `authError` state exposed
- All `console.error` replaced with `Sentry.captureException` (24 replacements, 15 files)
- Timer cleanup: mounted guards in PromptorCreate/Optimize, PixelStudio copy timer
- Server-side auth guard in protected layout (eliminates flash of protected content)
- `"use client"` removed from 25 page wrappers; per-route metadata on 27 pages
- Edge functions: TOKEN_BUDGETS centralized (18 replacements), history truncation standardized, error responses hardened (42 leak fixes), import_map.json created
- Database: 4 unused indexes dropped, `embedding_jobs` table dropped, `branding_settings` tightened to auth-only, `match_knowledge` upgraded to hybrid search (vector + BM25 + source weighting), `ef_search=100`, 4 pg_cron trim jobs scheduled, osha_messages trim trigger wired
- react-markdown lazy-loaded in 5 chat components
- AbortController added to bulk wishpedia indexing
- VectorStore search + type filter added
- **TypeScript `strict: true` enabled** — ~110 errors fixed across ~60 files
- Primary color darkened to `hsl(197, 78%, 37%)` for WCAG AA 4.5:1 compliance
- Loading skeleton improved from spinner to page-shaped skeleton

**Remaining backlog:**
- SEC-009: Enable leaked password protection in Supabase Dashboard (manual toggle)
- SUP-016: Build admin audit log viewer component
- UI-038: Extend `aria-invalid` to all forms beyond Login
- CODE-026/032: Component/hook splits (all under 400 lines, well-organized)

## Project Runtime Config

| Key | Value |
|-----|-------|
| LOCKED_PORT | 8000 |
| JARVIS_PROJECT_NAME | Fortun Whishnet |
| ASANA_PROJECT_GID | 1214048856670612 |
| ASANA_PROJECT_NAME | Fortun Wishnet |

### Port Rule
Dev server starts on LOCKED_PORT (8000) first. If busy, fallback to any port in the 8000–8999 range only. Never fall back outside this range. Never kill a process on an unrelated port without asking first.

### Asana Binding
All Asana actions in this project use ASANA_PROJECT_GID (1214048856670612). To change the binding, say: "rebind asana to {new project name}".

### Jarvis Voice
On task completion, Jarvis says: "Your Fortun Whishnet task is done." Powered by the global ElevenLabs Stop hook reading this section.
