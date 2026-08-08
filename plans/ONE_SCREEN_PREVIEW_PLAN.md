# Plan — One-Screen Wishnet Preview (`/preview/one-screen`)

**Status:** APPROVED by Sam 2026-08-08 — executing all phases in one run (Sam: "Go ahead. The plan is approved.")
**One-line summary:** A brand-new, isolated, auth-gated page that mocks the ChatGPT-style one-screen Wishnet — collapsible left history rail, center home + active states, top-right profile/settings cluster — under Fortun Wishnet branding, touching zero existing files.

## Surface

**New files only:**
- `src/app/(preview)/layout.tsx` — bare route-group layout: server-side `getUser()` -> redirect `/login` (clone of the `(protected)` check), NO MainLayout/AppSidebar/Header
- `src/app/(preview)/preview/one-screen/page.tsx` — metadata + `ToolProtectedRoute` (`ai_agents` / `ai_can_access_omni`, same gate as Omni)
- `src/screens/OneScreenPreview.tsx` — screen shell, theme + view state
- `src/components/preview/one-screen/`:
  - `previewMockData.ts` — mock runs, threads, suggestion prompts, track meta
  - `previewTokens.ts` — shared theme className constants (keeps components under the 200-line rule)
  - `PreviewRail.tsx` — collapsible history sidebar
  - `PreviewTopBar.tsx` — context title + theme/settings/avatar cluster
  - `PreviewComposer.tsx` — shared composer (home + active docked) — extracted so both states reuse one component
  - `PreviewHome.tsx` — greeting + composer + track chips + suggestion cards
  - `PreviewActiveView.tsx` — mock threads + run cards

**Stays untouched (verified at QA via git diff = additions only):** OmniAgent + entire omni tree, MainLayout/AppSidebar/Header, navigation.ts, routeConfig.ts, globals.css, middleware, all edge functions, DB, redirects. No nav entry — direct URL only.

## Execution order & dependencies
Standalone. No dependency on any other plan. Parked Content-Desk plan preserved at `plans/PARKED_CONTENT_DESK_VISION_PLAN.md`.

## Sam's binding rulings
1. **Hybrid data** — real avatar/name/email from `useAuth().profile` (Header's exact pattern, initials fallback); hand-crafted mock history.
2. **Home + active states** — both, connected by clicking rail entries.
3. **Light + dark toggle** (non-recommended, binding) — page-local `data-preview-theme` attribute, one token set, both themes QA'd. Consequence (doubled visual QA surface) absorbed.
4. **Real links** — menu items navigate to real pages; **Sign out shown but disabled** (a demo click must not log Sam out).

## Ground truth (verified 2026-08-08)
- Every `(protected)` page is wrapped by MainLayout — a one-screen page must live in its own route group.
- Root layout provides Providers (Auth/Query) — `useAuth()` works inside `(preview)`.
- `FortunLogo` ships `full` + `mini` variants; the Omni Orbit mark is never rendered on this page.
- `useAuth()` exposes `profile.avatar_url / full_name / email` + `signOut`; avatars live in the PUBLIC `profile-pictures` bucket so plain `AvatarImage` is correct (Header pattern).
- Settings has a real `users` tab -> `/settings?tab=users`.
- `ToolProtectedRoute` accepts `toolKey` + `agentKey` and denies only when the flag is explicitly false.
- Tailwind `dark:` does NOT track page-local themes — all theming via `[[data-preview-theme=light]_&]:` arbitrary variants (dark is the base/default).

## Phases

**Phase 1 — Route + shell skeleton**
1. `(preview)/layout.tsx` (server auth, bare children).
2. Page with metadata `One-Screen Preview | Fortun Wishnet` + Omni-equivalent gate.
3. `OneScreenPreview.tsx`: `data-preview-theme` state (localStorage `preview-theme`, dark default), rail + main column layout.
4. Gate: tsc + lint clean, page renders at `http://localhost:8000/preview/one-screen`.

**Phase 2 — Left rail**
1. Expanded (~280px) / collapsed (~64px icon rail), animated width, reduced-motion fallback, toggle.
2. Rail header: FortunLogo `full` expanded / `mini` collapsed.
3. "New creation" primary button + search input (live-filters mock list).
4. `previewMockData.ts`: ~14 realistic runs across Images/Videos/Audios/Content/Brainstorm, grouped Today / Yesterday / Previous 7 days, track icons + status.
5. Row interactions: hover, active highlight, kebab (visual only).
6. Mobile (<768px): overlay drawer with backdrop.
7. Gate: tsc/lint + both themes.

**Phase 3 — Top bar + profile cluster**
1. Left = mobile hamburger + current context title; right = cluster.
2. Theme toggle (sun/moon), settings gear -> `/settings`, real avatar chip.
3. Avatar dropdown: name/email header; Profile, Settings, Users (`/settings?tab=users`), Files, MasterMind, Dashboard, Release Notes -> real navigation; Sign out disabled with "preview" hint.
4. Gate: tsc/lint + keyboard/focus pass.

**Phase 4 — Center: Home state**
1. Greeting with real first name (time-of-day aware), large rounded composer (attach/wand/mic/send — visual), gradient accent.
2. Track quick-chips: Images / Videos / Audios / Content / Brainstorm.
3. Four suggestion cards with realistic Fortun prompts; click fills composer.
4. Composer send -> transitions into the Active state (mocked ad-hoc thread).
5. Gate: tsc/lint + both themes.

**Phase 5 — Center: Active state**
1. Mock thread — user message + Omni reply with gradient-placeholder image tiles (no paid generation, no external assets).
2. Rail entry click loads its matching mock thread (2-3 distinct threads; rest show a generic run-summary card).
3. Wizard-type entries render a run card: step-rail snapshot + mock thumbnails + "Resume in Omni" -> real `/ai-agents/omni`.
4. Composer docks at the bottom.
5. Gate: tsc/lint.

**Phase 6 — Polish + responsiveness**
1. Breakpoint pass 375 / 768 / 1024 / 1440 — x both themes.
2. `prefers-reduced-motion`, focus-visible rings, cursor-pointer, aria-labels.
3. Empty state for no-match rail search; avatar initials fallback.
4. 150-300ms transitions per ui-rules.

**Phase 7 — QA (mandatory, last)**
1. tsc + lint (0 errors); `npm run build` only if the dev server is down.
2. security-auditor (mandatory): new route group's auth gate; confirm no new input surface.
3. code-reviewer on the new component tree.
4. UI review: static pass + Playwright screenshots if session allows (headless login historically blocked — Sam's eyes are the final visual gate).
5. Fix criticals, re-run gates.
6. Delivery: update project CLAUDE.md, clear MEMORY.md, hand Sam `http://localhost:8000/preview/one-screen`.

## Reversibility
All additive + isolated. Undo = delete `src/app/(preview)/`, `src/components/preview/`, `src/screens/OneScreenPreview.tsx`, then purge `.next` + `tsconfig.tsbuildinfo` (stale-validator landmine).

## Gotchas carried forward
Port 8000 locked · never build over live dev · `[[data-preview-theme=light]_&]:` not `dark:` · avatar via Header's live pattern · mock data in `previewMockData.ts` not component files (react-refresh) · Sign out stays disabled.

## Out of scope
Replacing the real shell, navigation/redirect changes, Osha's fate, the Dashboard decision, wiring live runs, any edge function or DB change, the parked Content-Desk task. Look-and-feel prototype only — the real migration becomes its own planned task if approved.
