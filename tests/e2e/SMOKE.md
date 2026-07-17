# Omni Studio — E2E smoke script (manual, honest placeholder)

> **Status (2026-07-17):** automated Playwright e2e is NOT wired yet — headless auth
> is blocked (no QA account exists: GoTrue signup requires email confirmation and
> the execution session cannot receive mail; direct auth.users provisioning was
> denied by the tool permission layer). Per Plan 1 Phase 2.3 this file documents
> the manual click-script instead of faking an automated one. When a QA login
> exists (Sam creates one in the Supabase dashboard, or Part Two provisioning
> succeeds), port this script to `@playwright/test` with credentials from
> `QA_EMAIL` / `QA_PASSWORD` env vars.

## Preconditions
- Dev server on http://localhost:8000 (`npm run dev`)
- A login with Omni access (admin recommended so the fal Engine bar shows credits)

## Script

1. **Login** — `/login`, sign in. Expect redirect to the dashboard.
2. **Entry screen** — navigate to `/ai-agents/omni`. Expect the four track tiles
   (Brainstorming, Images, Videos, Audios) and (post Phase 4) the fal.ai Engine
   bar below the grid WITHOUT a test-generation button.
3. **Images hub** — click Images. Expect the hub cards (post Phase 4: six cards
   in 2×3 — Studio, Character Studio, Brainstorming, Transform & Upscale,
   Repurpose, History).
4. **Create a Studio run** — open Studio, enter a short objective ("A cheerful
   Wishu waving under a rainbow"), advance one step. Expect no error toast and
   the URL to carry `?run=<id>`.
5. **Exit mid-flow** — click the X (exit). Expect return to the hub.
6. **Resume from History** — open History, find the run (top of the list),
   click Resume. Expect the wizard to restore the SAME step and the objective
   text to be present.
7. **Step jump** — on the run card, jump to step/stage 1. Expect the wizard at
   the brief with state intact.
8. **Theme + breakpoints** — toggle the Omni-local theme; spot-check 375px and
   1440px. Expect no clipped controls on the entry screen or hub.
9. **Cheap generation (optional, paid)** — only when explicitly testing paid
   paths: pick the cheapest model (flux/schnell), 1 variant, generate; expect a
   tile to complete and be selectable.

## Automation gate
Vitest unit suites (`npm run test`) cover the resume matrix, aspect snapping,
and pricing math deterministically — those are the regression net for the
renumbering work. The browser script above is the only part still manual.
