# OMNI IMAGES TRACK — FULL OVERHAUL PLAN

> **Status:** APPROVED FOR FUTURE EXECUTION — no code has been changed yet.
> **Written:** 2026-07-16, from a 8-agent deep-map of the live codebase (95 evidence-backed findings, every claim anchored to file:line).
> **Execute in:** a fresh session. Read `CLAUDE.md` + this file fully first, run `git log --oneline -3` to confirm the base is `main` ≥ `e2ba60b`, then follow the Execution Protocol below.
> **Sibling plans:** other `plans/*.md` files may exist from the same planning session; this plan is self-contained and does not depend on them.

---

## 0. Mission & Non-Negotiables

Rebuild the Omni **Images** track into the best creation experience in the app:

1. The 11-step wizard becomes a **7-stage flow** with smart defaults, honest costs, and zero dead ends.
2. **Every mode works 100%** — each phase ends with its mode fully functional, not partially migrated.
3. **Every creative surface is knowledge-grounded**: Heart rules + Brain RAG + Wishpedia references flow through ONE shared edge context engine. (Note: "MasterMind" is the admin hub *over* Heart + Brain — `src/screens/MasterMind.tsx:36-70` — not a fourth store. Covering Heart + Brain + Wishpedia covers everything.)
4. **Brainstorming STAYS — everywhere** (Sam's final decision, 2026-07-16): the Images-hub card stays (six hub cards for design symmetry) AND the top-level entry tile stays (four entry tiles, unchanged). Nothing brainstorm-related is removed in this overhaul. Long-term, Osha remains the natural brainstorm home — any consolidation is a future plan, if ever.
5. **"Omni Images" gets renamed** (label-only — see D2).
6. **Repurposing v2**: a true AI-extend tier that keeps subject pixels identical (verified fal models, schemas fetched live).
7. **History becomes best-in-class**: thumbnails, cost, pagination, bulk ops, bulletproof resume.
8. The **fal.ai Engine bar appears on the first Omni screen** (without the test button).
9. UI perfection per `.claude/rules/ui-rules.md`: both Omni themes, 375/768/1024/1440, WCAG AA, focus states, reduced motion.

**Out of scope (explicitly deferred by Sam):** completing Pulse social publishing setup (the finalize step only gets *honesty* about unconnected networks, not connections); Audios/Videos tracks (but repurposing v2 model choices deliberately map 1:1 onto fal's video-reframe endpoints for later — `fal-ai/ltx-2.3/reframe`, `luma ray-2/reframe`).

---

## 1. Current-State Analysis (what the deep-map found)

### 1.1 The structural map

- `src/screens/OmniAgent.tsx` is the single shell: `view` ('home' | track) + `imagesMode` ('hub' | 6 modes) + `wizardRunId`, hand-rolled URL sync (`?track/?mode/?run` via `replaceState`, OmniAgent.tsx:71-97), page-local theme via `data-omni-theme`.
- **Everything converges on one step engine**: `OmniImagesWizard.tsx` renders steps 1–11 keyed off integer `omni_runs.current_step`. Brainstorm/Surprise seed step 1; Transform owns steps 1–6 on its own chrome then hands the SAME run to step 7; standalone Repurposing fabricates a run at step 7.
- **The edge is step-blind**: `grep current_step supabase/functions/` → 0 hits. Step restructuring is 100% client-side, concentrated in a 3-file lockstep: `WizardChrome.tsx` (titles + STEP_SEQUENCE), `OmniImagesWizard.tsx` (BACK_TARGET + render guards + persist targets), `historyRouting.ts` (sequences + boundaries). Plus `TransformChrome.tsx` and the retake seeder in `useOmniHistory.ts`.

### 1.2 Confirmed defects (the "must fix" backbone)

| ID | Sev | What | Evidence |
|----|-----|------|----------|
| SIB-01 | **CRITICAL** | Every OpenAI text call in the omni edge still sends `max_tokens`+`temperature`; the default model (gpt-5.4) is a reasoning model that REJECTS them. **Transform is hard-gated on analysis → likely broken in prod today** on the OpenAI path. Brainstorm/Surprise also affected. | brainstorm.ts:89-94,203-210; surprise.ts:137-144; analysis.ts:203-206; zero `max_completion_tokens` hits in omni/ |
| GEN-01 | High | Failed step-6 variant is a dead end: no retry, and resume counts failed rows as fulfilled — never resubmitted. | VariantTile.tsx:133; StepGeneration.tsx:55-63 |
| REP-C | High | Step 10 defaults to PAID redesign; one click fires images×formats (18 fal calls easily) with **zero cost display**. | StepRepurpose.tsx:168,201,355 |
| UX-01 | High | One decision (what to make) split across steps 1+2 with TWO paid Promptor calls. | StepObjective.tsx:27-35; StepLockPrompt.tsx:45-51 |
| UX-02 | High | Step 4 is 100% defaultable yet mandatory; users can't tell step 4 "specs" from step 9 "dimensions". | StepSpecs.tsx:203-211; WizardChrome.tsx:17,22 |
| UX-03 | High | Optimistic step advance with no rollback: persist failure only toasts; user marches ahead of saved state. | OmniImagesWizard.tsx:68-69,87-89 |
| UX-04 | High | No-references model picker: raw 30/page fal catalog, no default, no prices, no recommendation. | StepModels.tsx:46,253-307 |
| ORD-01 | Med | Captions (27 sequential LLM calls for 3×3) authored BEFORE formats are chosen and BEFORE final visuals exist. | StepDescriptions.tsx:18,139-151 |
| KB-GAP-1 | High | `variant-submit` — the action that generates every paid image — consults NO Heart rules and NO Brain knowledge at the edge. Brand compliance rides on an optional, bypassable client Promptor detour. | omni/index.ts:520-667 |
| KB-GAP-3 | Med | Captions run under **Promptor's** Heart agent scope, not Omni's — rules assigned to "omni" never reach captions. | promptor/index.ts:486 vs omni/index.ts:95 |
| KB-GAP-5 | Med | `fal-submit` is a raw passthrough: any authenticated user can generate off-brand imagery outside every funnel, no prompt cap, no asset row. | omni/index.ts:398-415 |
| SIB-03 | High | Standalone Repurposing run creation is non-atomic and non-resumable; failure strands an orphan run at step 1 rendering foreign UI; retry duplicates assets. | RepurposeModeWizard.tsx:60-93 |
| HIST-01/02 | High | Step knowledge duplicated as raw ints in ≥4 modules; `step_state` has NO schema version; History jump chips write raw integers the wizard trusts blindly. Renumbering without a registry silently misroutes every historic run. | historyRouting.ts:14-16,47-51; OmniImagesWizard.tsx:33,56 |
| FIN-01 | Med | Finalize says "N posts ready in Pulse" with zero connection awareness — 4 of 6 networks are hardcoded stubs; user learns the truth only inside Pulse. | StepFinalize.tsx:84-103; content-library/connectors.ts:9-13 |
| GAP-5 (critic) | High | **Zero test coverage in the whole repo** (no spec/test files, no playwright.config). The renumbering of a paid-money wizard would land with no regression net. | Glob sweep |

### 1.3 Verdicts on the sibling modes

- **Brainstorm (Images track)** — KEEP EVERYTHING AS-IS (Sam's final decision): the hub card stays (six hub cards for design symmetry) AND the top-level entry tile stays (four entry tiles). The redundancy analysis stands for the record only (~420 client + 228 edge lines whose entire output is a `{title, objective}` pair; Osha's advertised role covers the chat; the tile is a pure alias of the hub card, OmniAgent.tsx:74-77, F3 noted two entry points to one surface) — Sam has seen it and chose to keep both; do NOT act on it. Since the mode survives, it falls under "every mode works 100%": SIB-01 (Phase 1), lock-distillation Heart grounding + provider honesty (Phase 5), persist-failure indicator (Phase 11).
- **Surprise Me** — FOLD into the new Stage 1 as an "Inspire me" action. Its entire handoff is one prefilled objective string (useSurpriseIdeas.ts:32-44); folding fixes its batch-lost-on-unmount defect (SIB-05) for free. The `surprise-ideas` edge action (query-less knowledge MINING — genuinely unique) survives unchanged.
- **Transform & Upscale** — KEEP as a mode; fix SIB-01 (blocking), add skip-analysis, better upscalers (verified: `fal-ai/topaz/upscale/image` $0.01/MP, `fal-ai/recraft/upscale/crisp` $0.004/img).
- **Standalone Repurposing** — KEEP (it is the ONLY bridge from existing/external imagery into the social pipeline); fix atomicity + captions quality.
- **History** — KEEP, overhaul (Phase 9).

### 1.4 Naming (D2)

DB constraint (critic GAP-1): `omni_runs.mode` has a CHECK on `('omni_images','transform_upscale','repurposing','surprise_me','brainstorming')` (migration 20260612101000:34) and the literal is written by client inserts + finalize-run metadata. **Therefore: rename is LABEL-ONLY. The persisted value `omni_images` never changes.**

| Candidate | Verdict |
|---|---|
| **Studio** ✅ RECOMMENDED | Matches the existing tagline "your multimodal creation studio"; premium; instantly explains "the full pipeline" vs the quick modes. Chrome becomes "Studio · Step X of 7". |
| Forge | Punchy runner-up; slightly off the brand's elegant tone. |
| Atelier | On-aesthetic but obscure; harder to say. |
| Canvas / Blueprint | Collide with Canva / Pixel Blueprints. |

Display-string touchpoints: `omniConstants.ts:96-97` (hub card), `WizardChrome.tsx` title, `historyRouting.ts` RUN_MODE_META label, `agents.ts` / `routeConfig.ts` marketing copy, osha-chat registry blurb (batch with next osha deploy — do NOT deploy osha-chat standalone for a blurb).

---

## 2. The New Studio Flow — 11 steps → 7 stages

```
OLD  1 objective · 2 lock · 3 models · 4 specs · 5 recap · 6 generate · 7 networks · 8 captions · 9 dimensions · 10 repurpose · 11 finalize
NEW  1 Brief ───────────── 2 Engine ─────────── 3 Generate ──────────── 4 Distribution ──── 5 Adapt & Approve · 6 Captions · 7 Finalize
     (1+2 merged,          (3+4 merged:         (5+6 merged: recap      (7+9 merged:        (old 10,             (old 8,      (old 11)
      + Inspire me,         curated models       collapses to summary    networks with       repurpose v2)        AFTER
      ONE Promptor call)    + inline specs        bar, grid fills in,     inline format                            approval)
                            + running cost)       cost + credits + CTA)   checklists)
```

Why this shape (all evidence-backed):
- Stages 1–3 fix UX-01/02/04/09 (two decisions were smeared over five screens; cost arrived two screens late).
- Stage 4 merges the two halves of one decision ("where, in what shape") that were split by the captions screen (CONS-01), and shows `formats × images = N outputs ≈ $X` before the multiplier fires (DIM-01 + REP-C).
- Stage 5 before Stage 6 fixes ORD-01: captions are generated ONLY for approved posts — no more paying 27 LLM calls for posts that die at approval.
- The **Transform handoff boundary moves from old-step-7 to new-stage-4**; standalone Repurposing fabricates runs at stage 4. Both derive from the registry (Phase 3), never a literal.

**Fast path:** with a curated default model pre-selected, a power user goes Brief → (Engine is skippable-by-default) → Generate. Three screens from idea to pixels.

---

## 3. Architecture Decisions

- **D-REG (step registry):** ONE module `src/components/omni/stepRegistry.ts` exporting stage ids (`'brief'|'engine'|'generate'|'distribution'|'adapt'|'captions'|'finalize'`), ordinals, titles, surface membership, transform boundary, and `migrateStepState(state, rawStep) → {stage, state}` handling `schema_version` (absent = v1). v1→v2 ordinal map: `1,2→1 · 3,4→2 · 5,6→3 · 7,9→4 · 10→5 · 8→6 · 11,12→7`; `max_step_reached` maps through the same table (take max of mapped values). **The map is prerequisite-AWARE, not just ordinal-faithful:** `mappedStage = min(ordinalMap[oldStep], firstIncompleteStage(state))` — e.g. a legacy run parked at old step 8 (captions) that never completed old step 9 (`preset_selections` empty) resumes at stage 4 Distribution, NOT at stage 6 where it would dead-end on "captions require approved posts"; any existing `caption_options` are preserved in state for later. D-REG also freezes the **state-key contracts** v2 stages must keep reading/writing so legacy state survives: `preset_selections`, `caption_options`/`chosen_captions` keyed `[assetId][networkId]`, `approved_asset_ids`, `generated_asset_ids`/`selected_asset_ids`, `networks`, `model_selections`/`model_specs` — Phase 2's TDD tests cover these. Consumed by WizardChrome, OmniImagesWizard, TransformChrome, historyRouting, retake seeder, and History jump validation. This kills HIST-01/02 and the 12→11-clamp anti-pattern (render-only, never healed the DB, existed in only 1 of 2 consumers).
- **D-CTX (context engine):** `supabase/functions/omni/context.ts` exporting `assembleContext({queryText?, sampling, wishpediaRefIds?, budgets})` → `{heartBlock, heartDigest (≤600 chars, critical/high only), knowledgeBlock (fenced), wishpediaRefs}`. Absorbs the three verbatim-duplicated prompt builders (analysis.ts:136-145 ≡ brainstorm.ts:33-45 ≡ surprise.ts:72-90). New consumers: `variant-submit` (heartDigest into the fal prompt, inside the 8000-char cap at index.ts:543) and a NEW `generate-captions` action (fixes KB-GAP-3 scope + enables batching). MUST inherit verbatim: `sanitizeForPrompt`, UNTRUSTED fences, priority-ordered Heart, `stripDashes`, and `fetchHeartRules`' throw-on-error semantics (a Heart fetch failure blocks generation — never silently degrades, index.ts:97-100). Add `prompt_provenance` field so Promptor-optimized prompts aren't double-injected.
- **D-TIER (repurposing v2):** three tiers with auto-suggestion keyed on aspect-delta `d = max(srcAR,tgtAR)/min(srcAR,tgtAR)`:
  - **Tier 1 "Exact fit"** (free, exists): client cover-crop. Suggest when `d < 1.15`.
  - **Tier 2 "AI extend"** (NEW): `fal-ai/flux-2-pro/outpaint` — schema verified live: singular `image_url` + `expand_top/bottom/left/right` px, NO prompt, interior pixels untouched, ~$0.03/processed MP. Suggest for `1.15 ≤ d ≤ 2.2`. Fallback config: `fal-ai/bria/expand` (flat $0.04, exact `canvas_size`). Optional "Smart reframe" toggle: `fal-ai/ideogram/v3/reframe` ($0.03 flat, typography-strong, but RECOMPOSES — not pixel-identical). Tier 2 outputs the exact canvas → **no contain-fit hack needed** (plain downscale).
  - **Tier 3 "AI redesign"** (exists): nano-banana-pro/edit ($0.15). Suggest for `d > 2.2` or text-heavy sources. Add blur+darken on the contain-fit background layer to kill the doubled-edge halo (repurpose.ts:104-125).
  - Disqualified (verified): luma-photon reframes + image-editing/reframe (aspect enums lack 4:5 and/or 2:3 — miss IG portrait & Pinterest), image-apps-v2/outpaint (700px/edge cap can't do 1:1→9:16 @1080p). **Stay on fal** — Cloudinary/Firefly add a credential set + billing meter for no clear quality win over flux-2-pro/outpaint with all plumbing already built.
- **D-CHAR (new mode, Character Studio):** MVP = a hub card + character picker (Wishpedia entries) that **pre-seeds a Studio run** (references auto-attached, objective template "Create a new scene featuring <name>…", `step_state.character_context`). Mode value stays `omni_images` → **zero DB migration**; provenance via `step_state.origin='character_studio'`. Future upgrade path: `fal-ai/ideogram/character` ($0.05/img, single face ref) verified for human-face consistency.
  **Considered and rejected for THIS overhaul** (Sam can override at the Phase 4 gate): *Campaign/Batch mode* (one brief → coordinated multi-format set — deferred: the new Stage 4 output-matrix already covers 80% of it; revisit as a Studio preset once v2 stabilizes); *Template/Preset mode* (save a Studio config for reuse — high value but belongs after the new flow proves its shape; noted as the natural NEXT plan); *Background/Product mode* (bg-swap + relight via verified `birefnet/v2` + `iclight-v2` — better shipped as Transform operations than a standalone mode, deferred); *Video repurposing* (blocked on the Videos track; model ids already catalogued in D-TIER).
- **D-ENTRY:** entry screen keeps ALL FOUR track tiles unchanged (Brainstorming / Images / Audios / Videos) and gains the fal Engine bar below the grid (`showTestButton={false}` — new prop, card takes zero props today, F1). No URL/track changes at all. Hub becomes a symmetric **2×3 grid of SIX cards**: **Studio · Character Studio · Brainstorming · Transform & Upscale · Repurpose · History** (Sam's call: six for design symmetry; History stays a normal card as today).

---

## 4. Execution Protocol (read before Phase 0)

1. Branch: `feat/omni-studio-overhaul` off `main`. Conventional commits, one commit per completed step-group minimum.
2. **Phase gates are hard**: finish a phase → `tsc --noEmit` clean + `npm run lint` 0 errors (39-warning baseline) → update `MEMORY.md` → present the ✅ Phase block → **WAIT for Sam's go**. Never combine phases.
3. **Edge deploy discipline** (project lessons — non-negotiable):
   - `omni` is UNLISTED in config.toml → verify_jwt defaults **true**. Deploy: `npx supabase functions deploy omni --project-ref zlmideilxfnokemzkavm` — **NEVER pass `--no-verify-jwt` for omni**.
   - `content-library` is live-`false` and unlisted → **MUST pass `--no-verify-jwt`** or auth breaks.
   - CLI only (byte-exact, auto-bundles `_shared/`). Never hand-transcribe through MCP for these files.
   - **Two or three omni deploys** are planned: deploy #1 (Phase 1) happens ONLY if Phase 0 confirms SIB-01 is live-reproducible (near-certain per CLAUDE.md history — default text model gpt-5.4, omni never got the reasoning-param fix); if somehow not, Phase 1's code changes batch into deploy #2. Then deploy #2 (Phase 5) and #3 (Phase 8), + one content-library deploy (Phase 9). Batch everything into those.
   - **PROD-COMPAT:** the VPS client redeploys only from `main`; the branch merges at Phase 13. Every edge deploy before that must keep the OLD prod client working (Phase 5's rule — e.g. heartDigest injection is opt-in via `prompt_provenance`; no action the old client calls may be removed or reshaped).
4. **Never run `npm run build` while the dev server is live** (both write `.next`).
5. Omni dark mode = `[[data-omni-theme=dark]_&]:` variants, NEVER `dark:` (page-local theme).
6. In-step mutations that must not unmount the grid use non-invalidating writes (the `discardAssetSilent` pattern) — the parent gates mounts on `isFetching`.
7. All temporary tokens used for deploys → tell Sam to rotate at Delivery.

---

## 5. THE PHASES

### Phase 0 — Baseline & Reconnaissance (S)
1. Create branch; record `tsc`/`lint` baseline output in MEMORY.md.
2. **Live-verify SIB-01**: read prod `llm_settings.openai_text_model` + `omni_settings` (Supabase MCP, read-only SQL); if the model is gpt-5.x/o3, one `analyze-image` call against the live edge to confirm the 400. This decides whether Phase 1 is a hotfix (deploy immediately) or rides with Phase 5.
3. Screenshot baseline: Playwright MCP at 1440px — entry, hub, each mode's first screen, History (login via Sam or a provisioned QA admin; note the audit-user pattern from 2026-05-21).
4. **Q4 verification:** query `heart_rules` for rules scoped to `promptor` but NOT `omni` (`assigned_agents` contains promptor, lacks omni, not global); record whether any are caption-load-bearing. This clears the Phase-5 caption-scope switch.
5. Acceptance: baseline documented; SIB-01 verdict recorded; Q4 verdict recorded.

### Phase 1 — Emergency edge fixes (omni deploy #1) (S)
1. Port ai-chat's reasoning-model branch into a shared helper in the omni edge (`max_completion_tokens` + `reasoning_effort`, omit `temperature`) and use it in brainstorm.ts, surprise.ts, analysis.ts (SIB-01). Claude branch NOT needed here (omni text paths are OpenAI/Gemini only today — do not widen scope).
2. Gate `fal-submit` (KB-GAP-5): admin-gate it like `fal-test-generate` + add the 8000-char prompt cap. (Nothing in the shipped client uses raw fal-submit — verify with grep before gating.)
3. Fix `finalize-run` to write the run's REAL mode into `content_library_items.metadata.mode` (critic GAP-6 — it currently mislabels repurposing/surprise runs as 'omni_images'; the field is write-only today so this is safe).
4. Deploy omni (verify_jwt stays true). Live-verify: one analyze-image + one surprise-ideas call succeed on the OpenAI path.
5. Acceptance: Transform unblocked in prod; tsc/lint clean.

### Phase 2 — Test harness (the regression net) (M)
> Lands BEFORE any renumbering. The repo has ZERO tests today (critic GAP-5).
> **Framing note for the gate:** Sam did not request a test suite — this is the plan's one deliberate scope addition. Justification: renumbering a paid-money 11-step wizard with zero regression net is how historic runs get silently corrupted. Say this plainly when asking for the Phase 2 go.
1. Add Vitest (dev-dep, per Sam's global stack preference; check current stable version first) + `npm run test` script. Zero app-code changes.
2. Unit tests: `historyRouting.ts` (resume matrix: every mode × step × expected surface, incl. brainstorm locked/unlocked, repurposing floor, legacy step-12), `snapAspectRatio`/`nearestAspectRatio` (falSpecs), `estimatePlanCost` (falPricing incl. per-MP), and `stepRegistry.migrateStepState` specs written from §3 D-REG's table **as `test.todo`/skipped** (the module is created in Phase 3 — todo-specs keep this phase's `tsc` + `npm run test` gates green; Phase 3 step 1 activates them).
3. Playwright smoke script (scripted, not MCP): auth → create Studio run → mock-cheap generation path guarded behind an env flag OR stop at the generate gate → resume from History → verify stage restore. Wire `npm run test:e2e`. If auth automation is blocked, document the manual click-script instead — do not fake it.
4. Acceptance: `npm run test` green in CI-less local run; tests fail if anyone renumbers without migrating.

### Phase 3 — The Step Registry (foundation, no visual change) (M)
1. Create `stepRegistry.ts` per D-REG with `schema_version` + `migrateStepState` + `stageForLegacyStep` + jump validation helpers. **The v2 flow is DEFINED here but NOT yet rendered** — registry initially maps v1 11-step flow identically (identity adapter), so this phase is pure refactor.
2. Consume it everywhere the integers live: WizardChrome (titles/sequence), OmniImagesWizard (BACK_TARGET, render switch, persist targets — switch on stage id, not int), TransformWizard/TransformChrome (boundary), historyRouting (ALL sequences/boundaries/floors), useOmniHistory retake seeder, HistoryRunCard jump (validate + translate before writing `current_step`).
3. `persist()` now always stamps `schema_version` and writes translated ordinals; reads migrate-on-load in ONE place.
4. Fix HIST-03 (brainstorm retake drops `idea_locked` → clone lands in empty chat) and HIST-11 (jump failure silent) while touching those files.
5. Acceptance: zero visual/behavioral change (Playwright smoke passes); all Phase-2 unit tests green; grep shows no remaining hardcoded step literals outside the registry (allow the DB clamp constant).

### Phase 4 — Entry fal bar, hub relayout, Surprise fold (M)
> **Brainstorm is untouched everywhere (Sam's final decision):** entry tile stays, hub card stays, all brainstorm code stays.
> **This gate ratifies two defaults — restate them when asking for the go:** Q2 (rename to "Studio"), Q3 (Surprise folds into Stage 1). Commit the rename (step 4) as its own commit for easy revert.
1. `OmniFalHealthCard`: add `showTestButton?: boolean` (default true) gating lines 138-198; fix the `text-emerald-400` light-mode contrast (F7) and the duplicated icon-size utilities while in the file. Mount `<OmniFalHealthCard showTestButton={false} />` in OmniEntryTiles after the grid (F2: verify 375px short-viewport top-clipping — `justify-center` + overflow; switch to `justify-start` + padding if needed).
2. Entry tiles: NO changes — all four tiles (Brainstorming · Images · Audios · Videos) stay exactly as today in their 2×2 grid; the fal Engine bar from step 1 renders below the grid (the taller column makes F2's 375px short-viewport clipping check more important). URL hygiene while in OmniAgent: add the F6 guard (only parse `?mode`/`?run` when track==='images'); `?track=brainstorming` is untouched and keeps working as today.
3. Surprise fold: build "Inspire me" as a **self-contained component** (button + idea-cards popover/sheet + its own hook wiring) that is merely MOUNTED in StepObjective — Phase 6a re-mounts it in the new Brief stage with zero rework (StepObjective gets rebuilt there). Flow: button → `surprise-ideas` edge action → idea cards → pick fills the objective field. Delete `SurpriseMeView`/`SurpriseIdeaCard`/hub card; keep `useSurpriseIdeas` (repointed) + the edge action + `'surprise_me'` legacy mode value; `?mode=surprise_me` → hub. Cache the last batch in queryClient (fixes SIB-05).
4. Rename: hub card label → **"Studio"** (pending Sam's pick, §7 Q2), update chrome title, RUN_MODE_META label, marketing copy in `agents.ts`/`routeConfig.ts`. Persisted value untouched.
5. Add the Character Studio hub CARD (disabled/"soon" state for now — the mode ships in Phase 10), completing the symmetric **2×3 six-card hub**: Studio · Character Studio · Brainstorming · Transform & Upscale · Repurpose · History. Fix hub copy ("Six ways…" — now coincidentally 6 cards again, but History still isn't a "way to create": reword to the mode-agnostic subtitle or derive the count, F4) + coming-soon tile affordance (F5: make them genuinely inert, matches the file's own comment).
6. Acceptance: entry = the four tiles unchanged + engine bar below (no test button); hub = the six cards above in 2×3; Brainstorm fully functional from BOTH its entry tile and its hub card; all legacy surprise runs open correctly from History; Playwright smoke + unit tests green; both themes + 4 breakpoints checked.

### Phase 5 — Knowledge Context Engine (omni deploy #2) (L)
> **PROD-COMPAT RULE for deploys #2/#3:** the VPS client redeploys only on push to `main` (deploy-vps.yml), and the branch merges at Phase 13 — so the OLD prod client keeps calling the live edge throughout Phases 5–12. Every edge change in deploys #2/#3 must be backward-compatible with that old client.
1. Build `context.ts` per D-CTX; refactor analysis.ts / surprise.ts / **brainstorm.ts** (the mode stays — it is one of the three duplicated prompt builders the engine absorbs) to consume it.
1b. **Brainstorm hardening while in the file** (it survives, so "every mode 100%" applies): pass the heart block into `lockIdea`'s distillation prompt (KB-GAP-4 — the chat is grounded but the lock that seeds the whole run is not; rules are already fetched for the chat path, so this is nearly free); honor `llm_settings.active_text_provider` in brainstorm model resolution instead of the silent key-availability fallback that can misrepresent the picked provider (SIB-06, server side only — the client picker UI is untouched "as it is").
2. `variant-submit`: inject `heartDigest` server-side into the fal prompt (with the canon-anchor line; respect the 8000-char cap). **Injection is OPT-IN: only when the payload carries `prompt_provenance` and it is not `'promptor'`.** The old prod client never sends the field → its behavior is unchanged (no double-injection risk); the new client (Phases 6-7) sends it explicitly. This grounds EVERY paid image — wizard, transform, regenerate, redesign — fixing KB-GAP-1/2 in one seam.
3. NEW `generate-captions` action: request is per-IMAGE (image prompt + objective + list of networks), response is structured JSON `{[networkId]: string[]}` — one LLM call per image covers all its networks (cuts 27 calls to ≤3 for 3×3), Heart scope = omni, platform character limits in the brief, `stripDashes` on output. **Ship a NEW hook `useGenerateCaptions` for it; the legacy `useOmniDescriptions`/StepDescriptions path stays untouched and working until Phase 7's Stage 6 consumes the new hook and deletes the old one.**
4. Heart budget caps (HEART_MAX_CHARS ~4k; priority order already guarantees critical/high survive truncation) + `TOKEN_BUDGETS.OMNI_CONTEXT_*` entries.
5. Verify whether `knowledge_embeddings` rows carry `restricted_agents` metadata; if so, filter them in `surprise.ts` `sampleSource` (random sampling currently bypasses whatever filtering `match_knowledge` applies).
6. Deploy omni #2 (verify_jwt true). Live-verify: one cheap generation WITH `prompt_provenance:'raw'` shows the digest, one WITHOUT the field behaves exactly as before (prod-compat), generate-captions returns per-network JSON, surprise-ideas works, brainstorm-chat + brainstorm-lock work (now context-engine-backed, lock now Heart-grounded).
7. Acceptance: KB access matrix = every creative action grounded (analyze ✓, brainstorm chat ✓, brainstorm lock ✓ NEW, inspire ✓, generate ✓ opt-in, captions ✓ via new action, redesign ✓ via variant-submit); prod client verified unbroken; tsc/lint clean; edge deployed + verified.

### Phase 6 — Studio restructure part A: Stages 1–3 (L — two gates: 6a, 6b)
> **The registry does NOT flip here.** Phase 6 builds the new Stage 1-3 COMPONENTS but maps them onto the v1 ordinals (Brief renders for steps 1-2, Engine for 3-4, Generate for 5-6); the old tail (7-11) renders unchanged, `schema_version` stays 1, and every run remains fully completable end-to-end at all times (non-negotiable #2). The atomic flip to v2 ordinals + `schema_version: 2` stamping + the legacy-migration acceptance tests happen at the END of Phase 7 — the earliest moment all seven v2 stages exist.
> **Gate 6a** = Stage 1 Brief + Stage 2 Engine (steps 1-2 below). **Gate 6b** = Stage 3 Generate & Select + rollback + rail (steps 3-5). Sam gets a go/no-go at each.
1. **Stage 1 "Brief"**: merge StepObjective + StepLockPrompt — objective textarea, ONE auto-engineered prompt below (single Promptor call; drop the step-1 wand, UX-01), edit-in-place, re-optimize FEEDS THE EDITED TEXT (UX-06), "Inspire me" (Phase 4), reference picker with the model-restriction warning inline (UX-20). Draft protection: debounced sessionStorage stash (UX-05). Copy: "Use this prompt" not "Lock" (UX-17).
2. **Stage 2 "Models & Quality"**: curated default view (6-8 vetted text-to-image models with per-image PRICES + house default pre-selected, pattern from FAL_EDIT_MODELS) + "Browse all models" expander for the catalog (UX-04); selection chips in the sticky footer (UX-08); live type-to-filter (UX-14); running cost in the sticky bar (UX-09); per-model spec ACCORDION inline (absorbs old step 4; "generation quality" naming, ORD-02; generic-schema hint for unknown models, UX-18); `default_variants` from omni_settings finally consumed (UX-11).
3. **Stage 3 "Generate & Select"**: recap collapses to a summary bar (prompt · models · count · est. cost · credits with the precise failure reason from useFalCredits.reason, UX-10) + Generate CTA (amber "Generate anyway" escalation survives, critic GAP-7 — feed `defaultSpecForModel` into `estimatePlanCost` so per-MP models price correctly) → grid fills in below. Fix GEN-01 (Retry on failed tiles + exclude failed from resume counting), GEN-02 ("k of N" progress, Stop button, 3-strike poll failure cap mirroring useRepurposeRunner, connection-lost banner), GEN-03 (price hint in regen dialog), SEL-01 (auto-select all done variants; user prunes — matches Stage 5's opt-out). Guard Back during in-flight jobs ("jobs keep running and bill regardless", UX-15).
4. persist() failure rollback (UX-03): revert localStep + "not saved — Retry" banner blocking further advance.
5. Edit-links on the summary bar jump directly to Stages 1/2 (UX-07); progress rail: 7 labeled segments, clickable for stages ≤ max reached (UX-16, UX-07).
6. Acceptance (6b): full run Brief→Generate→old tail→Finalize works END-TO-END on a cheap model (the merged screens live on v1 ordinals, old tail untouched); resume mid-generation restores correctly; tests green. (Legacy-map acceptance moved to Phase 7 where the v2 stages actually exist.)

### Phase 7 — Studio restructure part B: Stages 4–7 + THE REGISTRY FLIP (L)
1. **Stage 4 "Distribution"**: network cards with inline format checklists (selecting a network requires ≥1 preset; **state keeps the `preset_selections` shape** per D-REG's state-key contract so legacy runs and StepRepurpose's job matrix read it unchanged); footer `formats × images = N outputs ≈ $X` with the tier-aware estimate (DIM-01); Pulse connection badges per network ("saved to library only — publishing not connected", FIN-01 — fetch `get-connections-status` once). Transform/standalone-Repurpose handoffs land here (registry boundary).
2. **Stage 5 "Adapt & Approve"**: StepRepurpose upgraded to the 3-tier engine (Phase 8 supplies the edge tier; this phase wires the UI: per-tile tier select with the auto-suggested default + one-line hint "crop would trim 32% — AI extend suggested"; cost line next to "Generate the set", REP-C; mode-change inside the compare modal + Delete resets-to-pending instead of vanishing the slot, REP-02-ux2). If Phase 8 hasn't landed, tier 2 renders disabled with "coming in this overhaul" — 7↔8 stay independently shippable.
3. **Stage 6 "Captions"**: generated ONLY for approved posts (ORD-01), via the Phase-5 `useGenerateCaptions` hook (one call per image → all its networks; run 2-3 IMAGES concurrently); per-network character counters (CAP-02); default 1 option + "More options" (CAP-01); grouped by network. Delete the legacy `useOmniDescriptions` path here.
4. **Stage 7 "Finalize"**: recap grouped by network with INLINE caption editing (FIN-02); title; Save; success screen echoes connection honesty (FIN-01); library-item link.
5. **THE FLIP (exit criterion):** switch the registry to v2 ordinals, stamp `schema_version: 2` on new persists, activate `migrateStepState` for v1 reads (prerequisite-aware clamp per D-REG). Run the full legacy-migration acceptance matrix NOW: old step 8 w/o presets → stage 4 (not 6); old step 8 WITH presets+approvals → stage 6 with captions preserved; transform handed off at old 7 → stage 4; repurposing at old 10 → stage 5; step-12 relic → stage 7; brainstorm runs unaffected (unlocked → chat surface as today; locked → wizard at the mapped stage).
6. Acceptance: complete end-to-end v2 run incl. approval-gated captions; caption edits persist; finalize idempotency intact (LM-3: status must remain finalize-only 'completed', asset ownership stays run-scoped); the full migration matrix above green in unit tests AND one live resume per shape; both themes/breakpoints.

### Phase 8 — Repurposing v2 engine (omni deploy #3) (L)
1. Edge: build a **dedicated `repurpose-submit` action** (DEFAULT approach, not fallback) — the existing variant-submit inference must not learn a third family: its singular-vs-array key choice hangs on an `/(\/|-)upscal/i` regex (index.ts:573) that won't match outpaint models, and its no-spec branch unconditionally sends `aspect_ratio` (unsupported by outpainters). `repurpose-submit` takes `{sourceAssetId, targetW, targetH, tier, model?}`, computes `expand_*` (flux) or `canvas_size` (bria) SERVER-side from the source asset's stored width/height (never trust client pixel math; **verify uploaded standalone-repurpose sources populate width/height** — variants-poll persists dims for generated assets, uploads may not), and reuses the fal transport + persist pipeline. FAL_PRICING rows: flux-2-pro/outpaint `{0.03,'megapixel'}`, bria/expand `{0.04,'image'}`, ideogram/v3/reframe `{0.03,'image'}` (client + edge fal-specs lockstep, MODEL_ASPECT_ENUMS not needed for pixel-exact models). Old prod client never calls the new action → prod-compat free.
2. Client runner: tier 2 path (no contain-fit — plain high-quality downscale to exact preset); tier auto-suggest by `d` at job creation (REP-04); tier 3 keeps contain-fit but with blur+darken background (REP-06); repurpose costs finally in the cost surfaces (stage 4 footer + stage 5 button + compare modal).
3. **Standalone Repurpose mode fixes**: atomic single-insert run creation at the distribution stage (SIB-03 — `useCreateOmniRuns` accepts `current_step`), retry reuses the runId, objective nudge copy + per-asset metadata fallback for caption briefs (SIB-04), Content Library tab truncation hint, preview signing moved to useEffect/useQueries (SIB-10), object-URL cleanup on unmount/continue (SIB-11).
4. Deploy omni #3; live-verify one 1:1→4:5 extend (subject pixel-identical) and one 1:1→9:21 redesign.
5. Acceptance: three tiers selectable + correctly auto-suggested; extend output is pixel-identical in the interior (visual check); costs displayed at every paid trigger; standalone mode survives refresh mid-gather (session stash) and never orphans runs; tests green.
6. **REQUIRES SAM (flagged for Delivery):** one live paid A/B — flux-2-pro/outpaint vs bria/expand vs ideogram reframe on 2-3 real Fortun posts — to lock the default (the plan defaults to flux-2-pro/outpaint; ideogram's $0.03 flat + typography strength flips the order if Sam prefers its recomposed look; open question: whether ideogram accepts fully arbitrary WxH needs one paid probe).

### Phase 9 — History overhaul (+ content-library deploy) (L — two gates: 9a, 9b)
> **Gate 9a** = card/list upgrades (steps 1-3). **Gate 9b** = cascade + edge action + retake dialog (steps 4-6).
1. Card upgrades: 3-4 image thumbnail strip (data already fetched and discarded — useOmniHistory.ts:55-62), est. cost chip (assets × falPricing), meta line (N images · models · networks), "reached stage Y" when max > current (HIST-10/14); "cloned from" backlink via `metadata.source='retake'` (HIST-15).
2. List: select-all-visible header checkbox + bulk Archive (HIST-06); cursor-paginated infinite scroll replacing the 200 cap; clear-all loops until empty (HIST-05); search extends to objective/locked_prompt; sort select (HIST-09).
3. Covers: one `createSignedUrls` batch call instead of ≤200 sequential (HIST-07).
4. Cascade hardening: check `content_library_items` by `source_run_id` UNCONDITIONALLY on delete (HIST-04); per-run warning toast when an item delete fails (not just Sentry).
5. NEW content-library edge action `delete-items-by-run` (batch — collapses N per-item calls to 1 rate-limit slot, HIST-08); client switches to it. **Deploy content-library WITH `--no-verify-jwt`** (hard requirement).
6. Re-run-with-edits: retake opens an editable seed dialog (objective/prompt/models) before insert (HIST-15).
7. Acceptance: 200+ run account scrolls smoothly; bulk-clear 30 finalized runs strands zero library items; resume matrix green across all legacy shapes (v1 runs, step-12 runs, brainstorm rows, transform mid-handoff); tests green.

### Phase 10 — Character Studio (new mode goes live) (M)
1. Character picker screen: Wishpedia entry search → entry card (canon images grid) → "Create with <name>".
2. Seeds a Studio run: references auto-attached (entry's images, respecting per-model ref caps), objective template, `step_state.origin='character_studio'` + `character_entry_id`; Stage 2 defaults to the best edit model (nano-banana-pro/edit) — the whole mode is a curated Studio entry, zero new step machinery, zero DB migration.
3. Context engine already anchors canon (variant-submit canon-anchor + heartDigest); verify Wishu fidelity path end-to-end.
4. Hub card flips from "soon" to live; History shows origin badge for these runs.
5. Acceptance: pick Wishu → generate → character consistent with canon references (needs Sam's eyes for final fidelity sign-off — flag in Delivery); all standard tail stages work; tests green.

### Phase 11 — UI/UX perfection pass (M)
1. Sweep EVERY touched surface against `.claude/rules/ui-rules.md`: semantic elements, hover states (150-300ms), cursor-pointer, focus-visible rings, WCAG AA in BOTH Omni themes (`[[data-omni-theme=dark]_&]:` discipline), prefers-reduced-motion, loading/empty/error states everywhere.
2. Breakpoint pass at 375/768/1024/1440 via Playwright MCP screenshots — entry, hub, all 7 stages, all modes, History, modals.
3. Fix the known cosmetic backlog if not already absorbed: F5 (coming-soon tiles), F4 (hub copy), docstring drift (`WizardChrome.tsx:5` + `OmniImagesWizard.tsx:4` still say "12-step" — update to the 7-stage reality), stale TStepFinalize copy ("Library browsing surface ships with the Pulse phase" — it shipped; link to Pulse → Library, SIB-09), transform objective seed order (prefer `transform_prompt` over `analysis.description`, SIB-16), Surprise error copy names the two sampled sources (SIB-17), brainstorm non-blocking "not saved" indicator on failed message persists (BrainstormView.tsx:62-68 swallows silently, SIB-15 — mode stays, so this is due).
4. Acceptance: ui-reviewer agent scores A-range with 0 critical; screenshots archived.

### Phase 12 — QA (mandatory gate) (M)
1. `tsc` + `lint` + `npm run test` + Playwright suite — all green; `npm run build` ONLY if the dev server is stopped.
2. **security-auditor (MANDATORY)** + code-reviewer + ui-reviewer, adversarial: verify High/Critical findings before accepting; fix all confirmed Critical/High, high-value Mediums.
3. Regression matrix by hand (Playwright MCP): every mode end-to-end, every legacy-run shape resumed from History, both themes, URL deep links incl. aliases, non-admin user (credits pill absent, fal bar thin — F7 note), agent-disabled lock screen.
4. Edge verification: all three omni deploy versions live + `verify_jwt` unchanged (true); content-library flag intact (false); one full paid Studio run + one Character Studio run + one tier-2 extend (cheap models where possible).
5. Acceptance: **0 confirmed Critical/High**; all planned tests green; deploy states verified.

### Phase 13 — Delivery
1. Merge to `main` + push → VPS auto-deploy (small commits were happening throughout per git-rules).
2. Update project `CLAUDE.md` (what was built, decisions, lessons — including the registry pattern and any new fal model gotchas).
3. Clear `MEMORY.md` to the no-active-task state.
4. **REQUIRES HUMAN (Sam) list** — assemble everything flagged: tier-2 default A/B (Phase 8), Wishu fidelity sign-off (Phase 10), token rotations, live paid verifications not doable headless.
5. ✅✅✅ TASK COMPLETE block.

---

## 6. Landmines (verbatim project lessons + new discoveries — the executing session MUST read these)

1. Step engine = 3-file client lockstep (WizardChrome / OmniImagesWizard / historyRouting) + TransformChrome + retake seeder. After Phase 3, the registry is the ONLY place integers live.
2. The edge never reads `current_step` (verified: 0 grep hits) — but LM-3 contracts are hard: finalize idempotency keys off `status==='completed'` + `source_run_id`; asset ownership is run-scoped (`.eq('run_id', runId)`); client-uploaded repurposed assets MUST keep the run's `run_id`.
3. LM-5: variant-submit infers flow from payload shape (spec ⇒ generation; no-spec+imageUrls ⇒ redesign aspect snap). Phase 8's outpaint branch must extend, not break, this inference.
4. `omni_runs.mode` has a DB CHECK — never rename persisted mode values (label-only renames).
5. Tailwind `dark:` does NOT track `data-omni-theme` — use `[[data-omni-theme=dark]_&]:`.
6. TanStack `isLoading` is false on stale cache — gate restore-sensitive mounts on `isFetching`; in-step mutations use non-invalidating writes (`discardAssetSilent` pattern) or the grid unmounts mid-work.
7. A controlled Radix Dialog does NOT fire `onOpenChange` on parent prop change — the compare-modal approve flow depends on this.
8. fal: per-model aspect ENUMS (snap to nearest, never format-validate); some models reject `num_images`; edit family takes `image_urls[]`, upscalers/outpainters take singular `image_url`; queue status/result URLs drop model subpaths; billing balance needs an Admin-scope key (pill logic exists).
9. `fetchHeartRules` throws on error BY DESIGN (generation blocked > silently off-brand). The context engine must preserve this.
10. Edge deploys: CLI byte-exact only; omni verify_jwt **true** (unlisted); content-library **`--no-verify-jwt`** (live-false, unlisted); batch changes into the three planned omni deploys; osha-chat blurb rides the NEXT osha deploy, never standalone.
11. PostgREST caps selects at 1000 rows (clear-all must loop); `order by random()` is not expressible via supabase-js (random-window sampling); `storage.objects` is trigger-protected from SQL DELETE (use storage API / CLI).
12. The 60/min omni rate limit is shared by submits+polls — new actions (generate-captions) must fit in the polling headroom; keep the variants-poll ≤12-id cap in mind.
13. URL params are a public contract: `?track=brainstorming` is untouched (tile + surface both stay); the only alias needed is `?mode=surprise_me` → hub (mode folded into Stage 1).
14. `content_library_items.metadata.mode` is written by finalize-run — Phase 1 fixes its accuracy; Pulse reads only `asset_ids` today, so it's safe, but don't build library features on the old values.

## 7. Open Questions for Sam (defaults chosen — execution proceeds on defaults unless Sam overrides at the Phase gate)

| # | Question | Default in this plan |
|---|----------|----------------------|
| — | Entry screen | **DECIDED by Sam (2026-07-16): keep all FOUR tiles (incl. Brainstorming) unchanged; ADD the fal Engine bar below the grid (no test button). Not open.** |
| Q2 | New name for "Omni Images": **Studio** / Forge / Atelier / other? | **Studio** |
| Q3 | Surprise Me: fold into Stage 1 "Inspire me" (removes the hub card)? | Fold |
| — | Hub layout | **DECIDED by Sam (2026-07-16): six cards, 2×3** — Studio · Character Studio · Brainstorming (kept as-is) · Transform & Upscale · Repurpose · History. Not open. |
| Q4 | Captions move from Promptor's Heart scope to Omni's (Phase 5) — any promptor-only rules load-bearing for captions today? | Switch to omni scope; Phase 0 verifies no promptor-only caption rules exist |
| Q5 | Tier-2 default: flux-2-pro/outpaint (pixel-identical) vs ideogram reframe (recomposes, typography-strong, cheaper-flat)? | flux-2-pro/outpaint; Phase 8 A/B decides finally |
| Q6 | Per-user spend governance (quota) — in scope? | Out of scope (noted for a future plan) |
| Q7 | Per-FORMAT captions (Story vs Feed on one network)? | Out of scope; keyed per-network as today (documented limitation) |

## 8. Phase Summary

| Phase | Title | Size | Edge deploy | Ships user-visible |
|-------|-------|------|-------------|--------------------|
| 0 | Baseline & recon | S | – | – |
| 1 | Emergency edge fixes | S | omni #1 | Transform unblocked |
| 2 | Test harness | M | – | – |
| 3 | Step registry | M | – | – (pure refactor) |
| 4 | Entry fal bar + 6-card hub + Surprise-fold (Brainstorm untouched) | M | – | fal bar on entry, 6-card hub, rename |
| 5 | Knowledge Context Engine + brainstorm hardening | L | omni #2 | Grounded generation + captions action |
| 6 | Studio stages 1–3 on v1 ordinals (gates 6a/6b) | L | – | New create flow |
| 7 | Studio stages 4–7 + registry flip to v2 | L | – | New distribute flow |
| 8 | Repurposing v2 (`repurpose-submit`) | L | omni #3 | AI extend tier |
| 9 | History overhaul (gates 9a/9b) | L | content-library | Best-in-class history |
| 10 | Character Studio | M | – | New mode |
| 11 | UI perfection pass | M | – | Polish everywhere |
| 12 | QA (security mandatory) | M | – | – |
| 13 | Delivery | S | – | CLAUDE.md, handoff |
