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
- **Edge functions:** `supabase/functions/` — 14 functions (all deployed)
- **Migrations:** `supabase/migrations/` — 56 files

## Supabase Backend
- **Project:** Fortun Wishnet (`zlmideilxfnokemzkavm`)
- **Region:** us-west-1
- **Postgres:** 17.6.1 + pgvector 0.8 (HNSW, 1536-dim, cosine)
- **Tables:** 38 in `public` schema — all with RLS enabled
- **Edge functions (14):** manage-users, ai-chat, storage-stats, update-bucket-settings, serve-file, process-embeddings, search-knowledge, process-ocr, promptor, osha-chat, pixel-chat, wishpedia-generate, omni, content-library
- **Storage buckets:** brain-documents, files, wishpedia-media, profile-pictures, whisper-audio
- **pg_cron jobs:** content-library-dispatch (*/5, posts dispatch-due to content-library via pg_net with a DB-seeded secret)

## Domain Areas
- **Auth / users:** profiles, user_roles, user_permissions
- **Files:** files, file_tags, file_versions, file_settings
- **RAG / Knowledge:** brain_sections, brain_documents, brain_categories, knowledge_embeddings, embedding_jobs
- **Rules:** heart_rules, heart_categories
- **Promptor:** promptor_settings, promptor_runs, quick_prompts
- **Agents:** agent_settings, osha_*, muse_*, pixel_*, omni_* (settings/runs/assets)
- **Content Library (Pulse):** content_library_items, content_library_posts
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

### Feature — Omni Images wizard overhaul: finalize bug + 8 feature areas (2026-06-14)
Ten-phase Ultracode task (investigation via a 12-agent parallel workflow; QA via a 3-agent adversarial review — security-auditor + code-reviewer + ui-reviewer — with verification of high/critical findings). Branch: `main`. **CLIENT changes are complete + tsc/lint clean. The OMNI EDGE FUNCTION IS STAGED, NOT YET DEPLOYED** (see REQUIRES HUMAN).

**P1 — Finalize bug fixed (root cause).** "Finalize failed: Failed to create the Content Library posts" = a stale DB CHECK: `content_library_posts_network_check` only allowed `facebook|instagram|x|tiktok`; YouTube/Pinterest were added to the edge `NETWORKS` allowlist (commit 7cf14ee) but never to the DB, so any youtube/pinterest post hit a 23514 violation (and, with no transaction, orphaned the just-created item). **Migration [20260614120000](supabase/migrations/20260614120000_widen_content_library_posts_network_check_youtube_pinterest.sql) applied LIVE + mirrored** — widens the CHECK to all 6 networks. **The bug is fixed and live now.** Deleted the 2 orphaned `content_library_items` (post_count 0, today). Hardened `finalize-run` to delete the item if the posts insert fails (no future orphans) — staged. Step 9 dimension preset icons made sharp (`StepDimensions` RatioPreview `rounded-sm`→`rounded-none`).

**P2 — Step 1 reference picker** ([OmniWishReferencePicker.tsx](src/components/omni/wizard/OmniWishReferencePicker.tsx)). Was: ticking a Wishpedia entry auto-added ALL its images, cap 4. Now: each entry **expands to a per-image grid with individual select/deselect**, images **mix across entries** up to a model-aware cap (`MAX_REFERENCE_IMAGES`=10, derived from the max edit-model `maxRefs`), per-entry count badges, attached-summary grid. The 4-cap was arbitrary, not a model limit.

**P3 — Step 3 curated edit models** ([StepModels.tsx](src/components/omni/wizard/StepModels.tsx), [llmModels.ts](src/config/llmModels.ts)). Was: references locked to ONLY `nano-banana-pro/edit`. Now: new **`FAL_EDIT_MODELS`** registry (6 curated, fal-schema-verified: nano-banana-pro/edit, nano-banana-2/edit, seedream/v4/edit, qwen-image-edit-plus, flux-2-pro/edit, gpt-image-1.5/edit) shown as a multi-select grid w/ per-model maxRefs + over-cap warning. `EDIT_MODEL_MAX_REFS` map; edge clamps refs per chosen model.

**P4 — Wizard reflow** (delicate). Inserted a **Specs** step at 4 and promoted the old phantom step 6 into a real **Generation** step — which left the shared tail (steps ≥7) and the transform/repurpose handoff (→ step 7) numerically UNCHANGED. New flow: 1 objective, 2 lock, 3 models, **4 specs**, 5 recap, 6 generation, 7 networks, 8 descriptions, 9 dimensions, 10 repurpose+approve, 11 finalize. Updated [WizardChrome](src/components/omni/wizard/WizardChrome.tsx) (titles, STEP_SEQUENCE, dynamic "of N"), [OmniImagesWizard](src/components/omni/wizard/OmniImagesWizard.tsx) (BACK_TARGET, render guards, persist targets, step-6 generation guarded by `ownsEarlySteps` else loader, step-12→11 clamp for old runs), [historyRouting](src/components/omni/history/historyRouting.ts) (sequences).

**P5 — Technical Specs step** ([StepSpecs.tsx](src/components/omni/wizard/StepSpecs.tsx), [falSpecs.ts](src/config/falSpecs.ts), edge [fal-specs.ts](supabase/functions/omni/fal-specs.ts)). Model-schema-aware size/ratio/quality, **per variant** (with a "same for all variants" toggle). Three fal conventions handled: `image_size` (preset|{w,h}), `aspect_ratio`+`resolution`, gpt-image pixel-enum + quality/fidelity. `model_specs` threaded state → `useGenerationRunner` (per-variant `spec`) → `variant-submit`. Edge `applySpecToInput` translates spec→fal params, lifts aspect_ratio out of the i2i-only guard, and **conditionally omits `num_images`** (fixes flux-2-pro/edit + flux-2-max + recraft which reject it).

**P6 — Cost + credits card** ([StepRecap.tsx](src/components/omni/wizard/StepRecap.tsx), [falPricing.ts](src/config/falPricing.ts), [useFalCredits.ts](src/hooks/omni/useFalCredits.ts)). Per-model cost (live fal `get_pricing`: per-image vs per-MP, MP-aware via `specToPixels`; gpt-image opaque→"varies"), estimated total, **live fal credit balance** (new admin-gated `fal-credits` edge action → `GET /v1/account/billing?expand=credits`), remaining-after-run (red + "Generate anyway" when negative). Static pricing means the estimate works without the edge; live balance shows "Unavailable" until deploy.

**P7 — Per-image × per-network captions** ([StepDescriptions.tsx](src/components/omni/wizard/StepDescriptions.tsx)). Reordered Networks (7) before Descriptions (8). Was: one caption for all images. Now: each approved image × each network gets its own Promptor caption examples (network-tailored brief incl. the image's prompt); pick/edit/regenerate per cell; **not auto-fired** (explicit "Generate all" to avoid surprise LLM billing). State `caption_options`/`chosen_captions` keyed `[assetId][networkId]`. [StepFinalize](src/components/omni/wizard/StepFinalize.tsx) resolves each post's caption via `source_asset_id`×network (legacy `chosen_description` fallback). `finalize-run` already stored caption per post — no edge change.

**P8 — Repurpose + Approval merged** ([StepRepurpose.tsx](src/components/omni/wizard/StepRepurpose.tsx), [useRepurposeRunner.ts](src/hooks/omni/useRepurposeRunner.ts), [repurpose.ts](src/lib/omni/repurpose.ts)). New **'redesign' mode**: an edit model (`nano-banana-pro/edit`) re-lays-out the post for the target aspect (keeps subjects/text/colors), then **contain-fits** to exact pixels (cover-bg + contain-fg, no bars) — never re-cropped. Free **'crop'** kept (global toggle, redesign default). Dead crop/extend toggles replaced with real per-tile action buttons (regenerate/download/save/delete) + lightbox + select/deselect approval. Merged step 10+11 (Finalize → 11). Deleted `StepApproval.tsx`. **Client-only — reuses existing `variant-submit` (source+aspect), works on the live edge.**

**P9 — Final recap** ([StepFinalize.tsx](src/components/omni/wizard/StepFinalize.tsx)). Approved posts as cards **grouped by social network** (icon + count), each showing image + size (preset WxH) + its unique caption, with a lightbox.

**P10 — QA.** tsc clean + lint 0 errors (39-warning baseline) every phase; `npm run build` skipped (dev live, project lesson). Adversarial 3-agent review: **0 confirmed Critical/High** (47 raw findings, all Medium/Low; the one escalated High was an over-rated touch-target whose "unreachable on mobile" premise the verifier debunked). Fixed the high-value findings: **edge** — `fal-credits` admin-gated, `finalize-run` ownership now `.eq('run_id', runId)`, aspect_ratio regex rejects 0:0, quality knobs membership-validated, unknown-model `num_images` defaults off; **client** — reference remove-X 16→24px, captions non-color selection cue + no auto-fire, repurpose non-dim exclusion cue + namespaced job keys + atomic mode toggle + mode-scope hint, recap "Generate anyway" escalation, `prefers-reduced-motion` in WizardChrome + StepFinalize, finalize Back-button transition.

**REQUIRES HUMAN (Sam):**
1. **Deploy the omni edge function** — staged, NOT deployed. Run (with your Supabase token): `npx supabase functions deploy omni --project-ref zlmideilxfnokemzkavm`. omni is unlisted in config.toml → **verify_jwt stays true** (do NOT pass `--no-verify-jwt`). The CLI is byte-exact + auto-bundles `_shared/` (12 files: omni/index.ts + 7 siblings incl. new fal-specs.ts + 4 `_shared`). This activates: finalize hardening, ref clamp, model-aware clamp, the **Specs→fal translation**, `num_images` fix, and the **fal-credits** action. (I avoided an MCP deploy to not risk the core function with hand-transcription of ~3k lines.)
2. **Live paid verification** (post-deploy): a real generation honoring chosen specs; the cost card vs the real fal bill; the live **credit balance** display (needs the real fal key); a **redesign** repurpose (does it keep text/subjects while re-laying-out for 9:16?); and **Wishu** multi-reference fidelity.
3. Rotate any temporary Supabase token used for the deploy.

**Deferred (non-blocking):** repurpose AI re-designs aren't in the cost card (generation-only); each redesign orphans one intermediate fal asset (same as the old AI-extend; storage hygiene); STEP_SEQUENCE duplicated in WizardChrome + historyRouting (single-source later); caption brief not fenced (Promptor sanitizes; internal-admin); per-variant regen uses variant-0 spec; old in-flight runs abandoned at old step 4/5 resume one step off (recoverable).

**Lessons:** the omni step engine keys everything off integer `current_step` in `omni_runs` — inserting/merging steps means updating WizardChrome titles+STEP_SEQUENCE, OmniImagesWizard BACK_TARGET+render-guards+persist-targets, AND historyRouting sequences in lockstep (adding one step + removing the phantom kept the tail stable — exploit that). fal models use **3 different sizing conventions** (image_size enum|{w,h}; aspect_ratio+resolution; gpt pixel-enum) and some reject `num_images` — always check `get_model_schema` per model. fal credit balance: `GET https://api.fal.ai/v1/account/billing?expand=credits` (server-only key). True dimension re-design = an edit model with a re-layout prompt + target aspect + pad-not-crop (contain-fit with a cover background), NOT outpaint-then-crop. Per-post captions already supported end-to-end in finalize-run — only the client fan-out needed fixing.

### Feature — LLM overhaul: Claude provider, refreshed OpenAI/Gemini reasoning models, fal-only image/video, 2x2 settings (2026-06-14)
Eight-phase Ultracode task (audit via a 9-agent parallel workflow + 3 web-research agents; QA via parallel security-auditor + code-reviewer + ui-reviewer). Branch: `main` (committed + pushed → live).

**Goal:** add Anthropic Claude as a reasoning provider, refresh OpenAI/Gemini to their latest reasoning models, restructure LLM Settings into a 2x2 card grid, and make **fal.ai the SOLE image/video engine app-wide** (OpenAI/Gemini image+video fully removed).

**1. Model registry + types ([llmModels.ts](src/config/llmModels.ts), [types/llm.ts](src/types/llm.ts)).** `OPENAI_TEXT_MODELS` → 10 latest reasoning (gpt-5.5/5.5-pro/5.4/5.4-pro/5.4-mini/5.4-nano/5.2/5.1/o3/gpt-4.1); `GEMINI_TEXT_MODELS` → 7 current (dropped the **shut-down `gemini-3-pro-preview`**); new **`CLAUDE_TEXT_MODELS`** (opus-4-8 default, opus-4-7/4-6, sonnet-4-6, haiku-4-5, opus-4-5, sonnet-4-5 — **fable-5 removed: account has no access, verified via live API 404**). **Removed OPENAI/GEMINI IMAGE+VIDEO arrays** entirely; image/video helpers return models only for fal. `LLMProvider`/`LLMProviderKey` widened to `claude`. Defaults bumped to current GA (`gpt-5.4`, `gemini-3.5-flash`, `claude-opus-4-8`).

**2. DB ([migration 20260614000000](supabase/migrations/20260614000000_claude_provider_columns_and_fal_image_video_default.sql)).** Added `claude_api_key` (server-only, SEC-001 — NEVER client-whitelisted), `claude_text_model` DEFAULT 'claude-opus-4-8', `claude_enabled`. `active_image_provider`/`active_video_provider` DEFAULT → `'fal'` **and the live row force-flipped** (was openai/gemini); the shut-down `gemini-3-pro-preview` stored value repointed to `gemini-3.1-pro-preview`. Reconciled the stale `llm_settings` block in the generated [types.ts](src/integrations/supabase/types.ts) (added claude_* + the drifted fal_*/pulse_*).

**3. Key management.** [settings-keys](supabase/functions/settings-keys/index.ts) gained `claude → claude_api_key / ANTHROPIC_API_KEY` (4 enum spots + check-keys); `useProviderKeyStatus`/`useProviderKeyActions`/`ApiKeyEditor`/`useLLMSettings` whitelist all widened to `claude`. **ANTHROPIC env var = `ANTHROPIC_API_KEY`** (Supabase secret).

**4. Edge — Claude text + fal-only generation.** New shared [_shared/fal.ts](supabase/functions/_shared/fal.ts) (promoted from Omni's proven queue transport; Omni left untouched): `falSubmit/Status/ResultRaw`, `generateImageViaFal`/`generateVideoViaFal` (with i2i shaping — upscaler→`image_url`, edit family→`image_urls`), `persistFalMedia` (host-validated *.fal.media, size-capped, any bucket), `uploadTempImageForFal` (raw bytes → signed temp URL so fal can fetch i2i sources), `resolveFalKey`, `DEFAULT_FAL_EDIT_MODEL='fal-ai/nano-banana-pro/edit'`. [ai-chat](supabase/functions/ai-chat/index.ts): Claude Messages branch (top-level `system`, **omit `thinking`+`temperature`** so it works on every listed model, SSE `text_delta`→`{content}` re-emit, `refusal` check), reasoning-model handling (gpt-5.x/o-series → `max_completion_tokens`+`reasoning_effort`, no temperature), **image/video fully fal-only** (OpenAI/Gemini image+Sora+Veo branches ripped out; fal failure now returns 502). osha-chat/pixel-chat/wishpedia-generate/whisper-api image (+pixel video) → fal via the shared helper; osha/pixel **text now honors `active_text_provider`** (was key-availability-only) + Claude branch + reasoning-aware OpenAI; promptor Claude branch + reasoning-aware OpenAI. Pixel video persistence fixed to **signed URL** (was getPublicUrl on the private bucket → 403). **grep confirms ZERO openai/gemini image/video endpoints remain.**

**5. UI ([LLMProvidersSettings.tsx](src/components/settings/LLMProvidersSettings.tsx)).** Rewritten to a **2x2 provider grid** (OpenAI + Gemini, then Claude + fal.ai) + a utility row (Test-with-Nexus + Active Provider Selection). New Claude card (Anthropic rust mark, orange accent). [ProviderCard](src/components/settings/ProviderCard.tsx)/[ProviderModelSelectors](src/components/settings/ProviderModelSelectors.tsx) sections made optional (reasoning-only cards omit image; fal card omits text; subtitle fixed). Active Provider Selection: General Reasoning adds Claude; **Image/Video locked to fal.ai**; Verify Active Settings reworked (claude text + fal image/video, provider-label map). Nexus console image→fal + text+claude; AgentModelConfig/AgentConfigPanel/ProviderStatus/NexusHeader widened to claude (+fal). OshaSettings image picker → fal note. Deleted dead `AITestConsole` (stale dall-e-3/gemini-1.5-pro-vision).

**Deploys (CLI byte-exact, verify_jwt preserved):** ai-chat (false), osha-chat (false), promptor (false), wishpedia-generate (false), whisper-api (`--no-verify-jwt`), **pixel-chat (true — preserved)**, settings-keys (false, MCP). Client deploys on push to main → VPS auto-deploy.

**QA:** tsc + lint clean (0 errors, 39-warning baseline; build skipped — dev live). **security-auditor PASS Low** (0C/0H/4M/3L). **code-reviewer B-** — all 4 criticals fixed (promptor provider-resolution + `!res.ok`; ai-chat Claude history leading-assistant trim; fal failures → 502). **ui-reviewer B+** — criticals fixed (removed `✓` glyph, Nexus card focus-ring + dark gradient, amber-700→800). Also hardened: osha/pixel attachment-count DoS cap (10), whisper+wishpedia fal-prompt sanitize, Nexus Claude streaming. **Claude 7/8 models live-verified** via direct Anthropic API with the exact edge request shape.

**REQUIRES HUMAN (Sam):** (1) the stored **Gemini key is SUSPENDED at Google** (`CONSUMER_SUSPENDED`, project 258398476107) — Gemini is down app-wide until re-enabled/replaced (external, not a code issue); (2) run **Verify Active Settings** in the UI to confirm each OpenAI reasoning model on the live OpenAI key (env-secret, not testable headless); (3) a live paid **fal image/video** gen + **Wishu** character-recreation fidelity check; (4) rotate the temporary `ANTHROPIC_API_KEY` + `SUPABASE_ACCESS_TOKEN` used for this task.

**Deferred follow-ups (non-blocking):** temp `{userId}/fal-temp/` objects aren't auto-pruned (storage hygiene); dead `DEFAULT_OPENAI/GEMINI_IMAGE/VIDEO_MODEL` consts; [PixelSettings](src/components/pixel/PixelSettings.tsx) still displays a stale openai/gemini image provider (cosmetic); osha/pixel could add an early `!falKey` user-facing guard; [whisper-api](supabase/functions/whisper-api/index.ts) Heart-rules column bug (pre-existing, noted earlier).

**Lessons:** Claude Messages API = top-level `system` (NOT a role message), `x-api-key` + `anthropic-version: 2023-06-01`, **omit `thinking`+`temperature` to work across all 4.x/legacy models** (adaptive-only models accept the absence; opus-4.7/4.8 reject temperature). gpt-5.x/o-series reject `max_tokens`+`temperature` → use `max_completion_tokens`+`reasoning_effort`. fal needs URLs not bytes for i2i → upload attachments/Brain images to signed temp paths. The Supabase CLI deploys edge functions **without Docker** (uploads assets directly) and auto-bundles `_shared/` relative imports; config.toml drives verify_jwt for listed functions, default true for unlisted (whisper-api needed explicit `--no-verify-jwt`, pixel-chat stays true by being unlisted). Always live-verify model ids per-account — `claude-fable-5` and `gemini-3-pro-preview` are real ids that 404/shut-down on this account/date.

### Fix + Feature — Omni download/lightbox, app-wide private-bucket image display, broken-file forensics, YouTube+Pinterest networks (2026-06-13)
Five-phase Ultracode task (investigation via a 4-agent parallel workflow; QA via parallel ui-reviewer + code-reviewer).

**1. Omni tile: download + lightbox** ([VariantTile.tsx](src/components/omni/wizard/VariantTile.tsx)). ROOT CAUSE of the dead download: the handler was `window.open(signedUrl)` — navigation, not download (storage responses carry no `Content-Disposition`, so the image just opened inline). Fix: new [downloadFromUrl.ts](src/lib/downloadFromUrl.ts) (fetch → blob → same-origin object URL → real `<a download>` → revoke; a cross-origin `<a download>` is ignored by browsers). Also added a top-left hover/focus `Maximize2` button → Dialog lightbox at native dimensions (object-contain, dark backdrop so the built-in close X stays visible), as a sibling of the select button so previewing never toggles selection.

**2 + 2b. "Broken images" were a DISPLAY bug, not missing files.** ROOT CAUSE: the Files Manager (and 4 other surfaces) rendered private-`files`-bucket images via `getFileUrl` → `getPublicUrl`, which **403s** (the bucket is private; the helper is even self-flagged `@deprecated SEC-019`). The files were fine. Fix: new reusable [SecureImage + SecureAvatarImage](src/components/files/SecureImage.tsx) + hardened [useSecureImageUrl](src/hooks/files/useSecureImageUrl.ts) (synchronous passthrough for public/external URLs; per-path tracking so a `stored` swap never flashes a stale/again signed URL; `onError` → fallback). Swept every surface: FileCard/FilePreview/FileInspector (+ real blob download in the inspector), Wishpedia [SelectFromFilesDialog](src/components/wishpedia/SelectFromFilesDialog.tsx) (signed thumbnails + signed select — the consumer *fetches* the URL), [NexusConsole](src/components/nexus/NexusConsole.tsx) generated images, app logo [FortunLogo](src/components/brand/FortunLogo.tsx), and avatars in ProfileHero/AccountSettings/EditUserSheet/UsersManagement. **`getFileUrl` kept (6 callers, some non-display) but unused for display.** **FAVICON is the one unfixable case via this approach** ([BrandingProvider](src/components/BrandingProvider.tsx) sets a `<link href>` the browser fetches with no JS) — a custom favicon from the private bucket will 403; properly fixing it needs a public bucket (flagged, not done).

**3. Cleanup — the destructive assumptions were wrong; gated and corrected.** The investigation's "29 abandoned Omni images / ~56MB" were **live `omni_assets`** (spared by cross-checking). The genuine garbage was **2 objects (~3.1MB)** — deleted via the CLI `supabase storage rm --linked` (storage.objects is trigger-protected from SQL DELETE). The 11 "broken" rows turned out to be **Brain Knowledge canon PDFs (+ original-wishu.png) whose SOURCE storage was wiped** (10 of 12 brain docs; knowledge intact — 982 embeddings) — **NOT deleted**; Sam will re-upload the originals. **Open question flagged: how did the brain-doc source storage get wiped** (a past cleanup / SEC-019 migration?).

**4. YouTube + Pinterest networks** ([omniNetworkPresets.ts](src/components/omni/omniNetworkPresets.ts)). Image-only targets with researched dimensions — YT: Thumbnail 1280×720, Community Square 1080×1080, Community Landscape 1920×1080, Channel Banner 2560×1440; Pinterest: Standard 1000×1500, Square 1000×1000, Long 1000×2100. lucide has `Youtube` but no Pinterest → inline [PinterestIcon](src/components/omni/PinterestIcon.tsx) (icon type widened to `ComponentType<{className?}>`). Wizard steps auto-inherit (no changes). Edge: omni `NETWORKS` allowlist extended; [content-library/connectors.ts](supabase/functions/content-library/connectors.ts) gained **honest image-library-only stubs** (`isConfigured:false`, publish rejects `NotConnectedError` → posts park queued; no fake publishing).

**Deploys:** omni v17 (verify_jwt true), content-library v6 (verify_jwt false, forced `--no-verify-jwt`). All other changes are client-only (deploy on push to main → VPS auto-deploy).

**QA:** tsc clean; lint 0 errors (39-warning baseline); build skipped (dev live :8000). **ui-reviewer B+** + **code-reviewer B+** — all criticals + high-value warnings fixed: AccountSettings picker `fallback`; lightbox visible close (dark backdrop); 44px-ish expand target + contrast; Pinterest `text-red-500`; FileInspector modal empty-`src` gate; sticky `errored` reset in SecureImage/FilePreview; the `useSecureImageUrl` one-tick-stale refactor; download ext matched on path not query string.

**Lessons:** `window.open(url)` is not a download; cross-origin `<a download>` is ignored — fetch→blob→same-origin object URL is the reliable path. `getPublicUrl` on a PRIVATE bucket 403s; `useSecureImageUrl` re-signs files refs AND passes public/external URLs through (handles legacy stored public URLs by extracting the path — no data migration needed). storage.objects is trigger-protected from SQL DELETE → use `supabase storage rm --linked` (or the Storage API). Always cross-check `omni_assets` before calling Omni storage objects "orphaned." A `[&>button]:hidden` on a shadcn DialogContent hides ALL direct-child buttons (including a custom close); a dark backdrop + `text-white` keeps the built-in close visible instead.

### Feature — No em dashes app-wide + Omni Wishpedia character recreation + emoji captions (2026-06-13)
Three fixes in one 4-phase plan. **Branch: `main` (uncommitted at time of writing).**

**1. Em dashes eliminated everywhere (rule + deterministic guarantee).** Seeded a global, `critical`-priority Heart rule "No em dashes or en dashes" (migration [20260613000000](supabase/migrations/20260613000000_seed_no_dashes_heart_rule.sql)) — propagates to every Heart-aware agent as a soft instruction. Added `stripDashes()` to [_shared/sanitize.ts](supabase/functions/_shared/sanitize.ts) as the hard backstop (figure/en/em dash + horizontal bar → comma for clause breaks, hyphen kept for numeric ranges; **literal regex, NOT `new RegExp` — interpolating the dash class misparses it as a range**). Wired into the FINAL text output of every generator and CLI-deployed byte-exact: **promptor v101, ai-chat v174 (incl. SSE stream deltas), osha-chat v128, pixel-chat v94, pulse-api v12, whisper-api v10, omni** (brainstorm/surprise/analysis). `wishpedia-generate` + `content-library` skipped (images / pre-generated captions, no generated text). **verify_jwt preserved per function** — pulse-api/whisper-api are live-`false` but NOT in config.toml, so they needed an explicit `--no-verify-jwt` or a plain deploy would have flipped them to `true` and broken auth (promptor's drifted `true` was corrected to its documented SEC-006 `false`).

**2. Omni now recreates Wishpedia characters (the "Wishu" fix).** ROOT CAUSE: Omni's image generation sent the raw text prompt to fal.ai with NO reference image, so a generic model invented a look-alike (unlike Osha/Pixel, which do image-to-image from Wishpedia art). Fix: [variant-submit](supabase/functions/omni/index.ts) accepts `reference_image_ids` (Wishpedia entry-image IDs, **never raw URLs**), resolves them server-side via `resolveWishpediaReferences()` to public `wishpedia-media` URLs (validated against `wishpedia_entry_images`; names sanitized + line-stripped + 80-char capped before prompt interpolation), passes them as `image_urls`, and prepends a canon-anchor line. When references are attached the wizard auto-routes to **`fal-ai/nano-banana-pro/edit`** (verified valid endpoint; schema requires `image_urls`+`prompt`). New [OmniWishReferencePicker](src/components/omni/wizard/OmniWishReferencePicker.tsx) in wizard step 1 (entry search → attach art, cap 4, resume-safe: never re-adds trimmed images); `reference_image_refs` persists in `OmniImagesState` and threads StepObjective → wizard → StepModels (`hasReferences` branch) / StepGeneration → useGenerationRunner → variant-submit. omni redeployed.

**3. Emoji social captions.** [useOmniDescriptions](src/hooks/omni/useOmniDescriptions.ts) caption brief now requests natural, platform-native emoji use; image-prompt path ([StepLockPrompt](src/components/omni/wizard/StepLockPrompt.tsx)) is a separate brief so prompts stay emoji-free.

**QA:** `tsc` clean; `lint` 0 errors (39-warning baseline); `npm run build` skipped (dev live on :8000, project lesson). **security-auditor PASS Low (0C/0H/1M/3L)** — the Medium (admin-set Wishpedia entry name → fal image prompt, sanitizeForPrompt doesn't strip newlines/cap length) fixed by the line-strip+80-char cap. **ui-reviewer B-** — 3 criticals fixed: keyboard-invisible Remove button (added `focus-visible`/`group-focus-within` opacity + ring), cyan text failing WCAG AA in Omni **light** mode (scoped to `[[data-omni-theme=dark]_&]:` with `text-cyan-700` light fallback — `dark:` does NOT track Omni's page-local theme), sub-12px text bumped; plus broken listbox ARIA contract (→ `aria-pressed` button list), cap-reached toast, lazy chip images. Wishu reference URLs confirmed publicly fetchable (HTTP 200, PNG) so fal can fetch them.

**REQUIRES HUMAN (Sam):** a live paid Wishu generation + visual confirmation of character accuracy (needs login + fal spend + human eyes — could not be done headless). Revoke the temporary `SUPABASE_ACCESS_TOKEN` used for CLI deploys.

**Latent bug found (NOT fixed, out of scope):** [whisper-api](supabase/functions/whisper-api/index.ts) fetches Heart rules with non-existent columns (`title`/`content` vs the real `name`/`rule_content`), so Heart rules never reach Whisper — its em-dash compliance is covered only by the deterministic `stripDashes`, not the rule. Worth a future fix for full brand compliance.

**Lessons:** a JS regex char class built via `new RegExp(\`[${dashes}]\`)` misparses adjacent unicode dashes as a range and silently fails to match — use a literal regex with the glyphs (or `\u` escapes). Supabase CLI deploy applies `config.toml` `verify_jwt` for listed functions and defaults to `true` for unlisted ones, so ALWAYS pass `--no-verify-jwt` for a live-`false` function that isn't pinned in config.toml. fal `nano-banana-pro/edit` takes `image_urls` (array) + `prompt`. Reference recreation needs the actual reference IMAGE passed to an edit-capable model; a text description alone can't reproduce a proprietary character.

### Deployment — wishnet.fortunwishdom.com live on Hostinger VPS + GitHub auto-deploy (2026-06-13)
Moved the app off Vercel onto the client's own **Hostinger KVM 2 VPS** (`168.231.82.233`, Ubuntu 24.04, 2 vCPU/8 GB) as a **Docker container behind the VPS's existing Traefik** reverse proxy, alongside an **untouched n8n** stack. Live at **https://wishnet.fortunwishdom.com** with auto-renewing Let's Encrypt SSL and **push-to-`main` auto-deploy**.

**Why the VPS, not managed Hostinger:** hPanel's "connect domain" step **silently fails** for an existing subdomain on BOTH the Cloud Enterprise and Business accounts — Hostinger ties a domain to one hosting account and the managed Node.js domain-bind is unreliable. The VPS removes that broken middleman (domain bound in Traefik directly, DNS via the Hostinger API). A managed **Cloud Enterprise Node.js app dry-run first proved the app builds/runs** on Hostinger's Node 22 runtime (temp domain) before committing to the VPS.

**Repo prep (commit `41a4ed3`):** `package.json` `start` → `next start` (managed Node + Traefik need **port 3000**, not the hardcoded `-p 8000` → otherwise the proxy can't reach the app); pinned `engines.node` `22.x`.

**VPS layout — `/root/wishnet/`:** `docker-compose.yml` (compose project "wishnet" on the **external `root_default`** network; Traefik labels `Host(` + "`wishnet.fortunwishdom.com`" + `)` + `tls.certresolver=mytlschallenge`; container on `:3000`) + `.env` (the 3 public `NEXT_PUBLIC_SUPABASE_*` — **NOT committed**, per git-rules) + `app/` (git clone via a **read-only GitHub deploy key** `/root/.ssh/wishnet_deploy`). **`app/Dockerfile`** (`node:22` → `npm ci` → `next build` → `next start`) **must `COPY .npmrc` before `npm ci`** — the repo's `legacy-peer-deps=true` is required for React 19 peer ranges, else `npm ci` dies with ERESOLVE. **n8n's `/root/docker-compose.yml` is never edited.** Manual redeploy: `cd /root/wishnet && GIT_SSH_COMMAND="ssh -i /root/.ssh/wishnet_deploy" git -C app pull && docker compose up -d --build`.

**Auto-deploy — `.github/workflows/deploy-vps.yml`:** on push to `main`, GitHub Actions (`appleboy/ssh-action@v1.2.5`) SSHes to the VPS with a **dedicated CI key** (repo secrets `VPS_SSH_KEY` / `VPS_HOST` / `VPS_USER`) and runs `git pull` + `docker compose up -d --build`. Verified green (~1 min). A failing build leaves the old container running → **zero downtime**. (A first attempt with a hand-rolled `ssh` step failed: `bash -e` aborted on `ssh-keyscan` before connecting — hence the action.)

**DNS / cutover (Hostinger DNS API):** `wishnet` A → `168.231.82.233` (was `185.158.133.1`) via `PUT /api/dns/v1/zones/fortunwishdom.com` with `overwrite:true` (only replaces records of the **same name+type** → Google MX/email untouched). After any DNS change, force Traefik's cert: **`docker restart root-traefik-1`** (n8n's cert persists in the `traefik_data` `acme.json` volume; the `mytlschallenge` resolver only issues once DNS resolves to the box). Edge-function CORS already allowed the new origin (verified all 7 key functions).

**Cleanup:** deleted both Vercel projects (`fortunwishnet`, `fortunwishdom` — no more Vercel), the Cloud Enterprise dry-run app, the old Business `wishnet` subdomain, and the stale `_lovable.wishnet` TXT. **GOTCHA:** deleting a Hostinger subdomain **rewrites that subdomain's DNS** — it re-added a rogue `AAAA` + a second `A` pointing at the Business shared server, briefly breaking the live site via stale caches (30-min TTL). Fixed by resetting `wishnet` to **A→VPS-only** + deleting the AAAA. **Always re-verify the DNS zone after any Hostinger subdomain/website delete.**

**Requires human (done by Sam):** Supabase → Authentication → URL Configuration → Site URL `https://wishnet.fortunwishdom.com` + Redirect URL `https://wishnet.fortunwishdom.com/**` (for password-reset/email; login works without it). Hostinger API token stored locally; revoke when no longer needed.

**Lessons:** Hostinger managed Node.js wants port **3000** (no `$PORT` injection) and **skips devDependencies if `NODE_ENV=production` is set as a build env var** → `next build` fails on missing `@next/bundle-analyzer`/tailwind/etc. (don't set `NODE_ENV`; `next start` sets it at runtime). hPanel's **browser terminal mangles pasted commands** (bracketed-paste `^[[200~` corrupts the first token) — paste keys into `nano`, never the shell prompt. Hostinger has **no public API** to delete a Node.js app / addon website or to attach a custom domain to a Node.js app (hPanel-only); it DOES expose VPS, DNS, subdomain-delete, billing. Deploy-key for private-repo pulls on the box; dedicated CI key (not the admin key) for GitHub Actions.

### Feature — Omni agent: full Multimodal Creation AI (2026-06-12)
Built Omni end-to-end at `/ai-agents/omni` in 8 approved phases on branch `feat/omni`. Canonical spec: [OMNI_SPEC.md](OMNI_SPEC.md); final report: [OMNI_BUILD_REPORT.md](OMNI_BUILD_REPORT.md). Four-tile entry (Brainstorming, Images, Audios/Videos coming-soon w/ reserved seams), the complete Images track (six modes), full fal.ai integration, and the new Pulse Content Library with scheduled posting.

**Edge — `omni` v10** (verify_jwt + in-function bearer auth, 60/min): settings; dynamic fal catalog (live `api.fal.ai/v1/models` + curated fallback; new models appear with zero code changes); generic queue runner (submit at the FULL model path, status/result at the first-2-segment app id — empirically verified); per-variant engine (`variant-submit` w/ i2i shaping: upscalers `image_url` singular/no prompt, edit families `image_urls`; batched `variants-poll` persisting outputs to storage); `analyze-image` (vision + hybrid match_knowledge w/ query_text over brain+wishpedia + priority-ordered Heart, fenced untrusted); `surprise-ideas` (random-window sampling, no embeddings needed); `brainstorm-chat`/`brainstorm-lock`; idempotent `finalize-run` (re-finalizing a completed run returns the existing item). One clean `fetchHeartRules` (agent key "omni", error-surfaced, rank critical>high>medium>low + sort_order).

**Edge — `content-library` v2** (verify_jwt=false, SEC-006): admin path (JWT+is_admin+30/min) for post-now/schedule/unschedule/connections/`library-asset-urls`; cron path authed by a DB-seeded secret (pulse_connections provider `omni_dispatch`, constant-time compare) fired by **pg_cron job `content-library-dispatch`** (*/5) via pg_net (migration 20260612120000). 60s atomic dispatch-overlap guard (config.last_dispatch_at claim) prevents cron-vs-manual double-publish. Connectors: Meta Graph v21.0 FB/IG real (params in form body; activates on `pulse_connections` meta row w/ `meta_page_tokens`, `config.ig_user_id`), X/TikTok honest credential-gated stubs → posts park as `queued`. NO pulse-api changes (spec rule).

**DB (migrations 20260612100000/101000/120000):** `ai_can_access_omni`; `omni_settings`/`omni_runs`/`omni_assets` owner-scoped RLS (+admin SELECT on assets); `content_library_items`/`content_library_posts` admin-only; agent_settings seed. **Workflow engine:** every run is an omni_runs row (mode, current_step, step_state snapshots incl. `max_step_reached` high-water + brainstorm `messages`); every variant an omni_assets row (storage path, model, parent run/image lineage). Storage: private `files` bucket `{userId}/omni-images/{runId}/`, signed URLs only, "Omni AI" sector.

**Client:** [OmniAgent.tsx](src/screens/OmniAgent.tsx) (URL-synced track/mode/run, data-omni-theme local dark mode, fullscreen); [src/components/omni/](src/components/omni/) wizard/ (12-step Omni Images), transform/ (6-step + handoff), repurpose-mode/, surprise/, brainstorm/, history/; [src/hooks/omni/](src/hooks/omni/). Pulse gained ONLY the Library tab ([src/components/pulse/library/](src/components/pulse/library/)). Promptor reused everywhere via useOptimizeDraft. History: resume-at-any-step (surface resolver: transform ≤6 → TransformWizard, ≥7 → Omni Images; unlocked brainstorm → chat), retake-as-clone, selective+clear-all delete (spares files referenced by other runs; completed/archived runs protected → Archive). Brainstorm lock updates the SAME run (title/objective/idea_locked) → wizard step 1.

**QA (Phase 8):** security-auditor **PASS Low (0C/0H/3M/5L)** — all 3 Mediums fixed in content-library v2; ui-reviewer **B- (3 criticals fixed:** History row wrap at 375px, brainstorm composer width vs Osha FAB, catalog badge contrast via `[[data-omni-theme=dark]_&]:` variant — `dark:` does NOT track Omni's page-local theme). 19-agent adversarial review in Phase 5 confirmed+fixed 16 findings (incl. step-10 paid-output persistence, back-from-7 mode gating, delete sparing cross-run references). `npm run build` green, tsc clean, lint 0 errors (39-warning baseline). QA admin claude.qa@wishnet.internal deleted with all test data (one orphaned PNG noted in the report for dashboard deletion).

**REQUIRES HUMAN:** osha-chat redeploy for the Omni registry line (`npx supabase login && npx supabase functions deploy osha-chat --project-ref zlmideilxfnokemzkavm` — MCP transcription of the 2,195-line live agent ruled out); Meta app+page OAuth (+ig_user_id), X paid-tier keys, TikTok Content Posting approval for live publishing.

**Lessons:** fal queue status/result URLs drop model subpaths; MCP edge deploys need the FULL file set re-inlined each time (`<name>/index.ts` + sibling `_shared/`); `order by random()` is not expressible via supabase-js (use random-offset windows); SSR auth tokens live in chunked `sb-*-auth-token` cookies (base64- prefix), not localStorage; storage.objects rows are trigger-protected from direct SQL deletes; Tailwind `dark:` variants do not track `data-omni-theme` (use `[[data-omni-theme=dark]_&]:`); TanStack `isLoading` is false on stale cache — gate restore-sensitive mounts on `isFetching` too; PowerShell here-strings with embedded quotes can fail — use `git commit -F file`.

### Feature — Whisper AI agent: full AI Podcast Generator (2026-05-22)
Built Whisper from a coming-soon stub into a full agent at `/ai-agents/whisper` (10-phase plan, "go for all"). Source (topic / paste / URL) → AI script → ElevenLabs voices → stitched MP3 → show notes + cover → distribute. Mirrors the Pulse architecture (admin-gated edge, admin-only RLS, secure key pattern).

**DB (migration 20260522160000):** 4 admin-only RLS tables — `whisper_shows`, `whisper_episodes`, `whisper_voices`, `whisper_settings` — + a **private `whisper-audio`** storage bucket (admin-only RLS; audio/cover served via 1h signed URLs). `ai_can_access_whisper` already existed. Types hand-added to [types.ts](src/integrations/supabase/types.ts).

**Edge — `whisper-api` v7** (admin-gated + 30/min rate limit; ElevenLabs key SHARED with Pulse via `pulse_connections.provider='elevenlabs'`; OpenAI/Gemini from `llm_settings`): `list-voices`; `generate-script` (script model + Heart rules + format/length/tone/language → JSON segments; SSRF-hardened URL source fetch); `preview-line` (TTS one line → data URL); **`render-episode`** (merges consecutive same-voice lines → ElevenLabs TTS each → concat MP3 → upload → audio_path/duration; runs as an **async background task via `EdgeRuntime.waitUntil`** so long episodes never hit the request timeout — client polls status); `generate-shownotes` (title/description/chapters/tags); `generate-cover` (OpenAI image → cover_path).

**Workspace** [WhisperAgent.tsx](src/screens/WhisperAgent.tsx) — blue/indigo, 6 URL-synced tabs: **Overview** (stats + recent + connection health), **Studio** (Single create: source → generate → editable script → **cast panel** w/ voice preview → save; optional **Show** to inherit cast/language), **Episodes** (library + the episode view: render, audio player, show notes, **Distribution**: download MP3 / copy transcript / generate cover / send to Pulse), **Shows** (series CRUD w/ default cast), **Voices** (ElevenLabs library + preview + presets), **Settings** (ElevenLabs connection reusing Pulse's row + script/tts model + defaults).

**Components** under [src/components/whisper/](src/components/whisper/); **hooks** useWhisperSettings/Voices/Episodes/Shows, useGenerateScript/ShowNotes/Cover, usePreviewLine, useRenderEpisode (+ useWhisperAudioUrl), shared [lib/whisperApi.ts](src/lib/whisperApi.ts).

**Long-episode timeout fix:** render is async (background task + 4s client polling) + consecutive same-voice line merging + an 80MB render cap → no request-timeout risk regardless of length.

**QA:** `tsc` clean; `npm run lint` 0 errors (36 known warnings); **security-auditor: PASS** (0 Critical/2 High/3 Med/3 Low) — all High+Med fixed + redeployed **v7**: SSRF-hardened `safeFetch` (https-only, `Deno.resolveDns` private-IP denylist incl. v4-mapped v6 / octal-hex, `redirect:'manual'`, 8MB cap) for both the URL source and the cover-image fetch; render 80MB cap; show-notes untrusted-content clause; `audio_path`/`duration`/`cover_path` removed from the client episode-update input (edge-only). **NOT done:** `npm run build` (dev live :8000), live ElevenLabs verification (needs Sam's key — same as Pulse). **Lesson:** eleven_v3 TTS model availability is account-dependent; default preview/render falls back to eleven_multilingual_v2.

### Feature — Pulse AI agent: full Social Media Command Center (2026-05-22)
Built Pulse from a Settings tab into a full agent workspace at `/ai-agents/pulse` (10-phase plan, Sam approved "go for all"). Concept: Pulse orchestrates the other agents (Pixel/Promptor/Heart/Brain) over upload-post.com (publish/schedule/analytics) + Meta Graph (engagement). Scope decisions: NO Asana, Google Calendar, Freepik, subtitles; engagement backbone = Meta Graph (FB+IG); reply model selected separately from llm_settings; reply modes switchable.

**DB (migrations 20260522120000 + 20260522140000):** 4 RLS tables — `pulse_drafts`, `pulse_reply_queue`, `pulse_connections`, `pulse_settings`. All **admin-only** RLS (`is_admin(auth.uid())`) — the whole workspace is admin/ops (the edge is admin-gated, so the data tables match). `ai_can_access_pulse` already existed. Types hand-added to [types.ts](src/integrations/supabase/types.ts) (gen output too big for MCP).

**Edge — `pulse-api` v8** (one function, admin-gated + 30/min rate limit, secrets never returned): upload-post actions (test-connection, list-accounts, get-profile-analytics, get/update-queue-settings, get-platforms, set-webhook, **publish-post** = multipart upload_text/upload_photos/upload with `user`/`platform[]`/`title`/`description`/`photos[]`|`video`/`scheduled_date`/`timezone`); connection mgmt (get-connections-status, update/reset/test-connection-provider for Meta/ElevenLabs/Canva → pulse_connections); get/update-workspace-settings; **generate-reply** (LLM via reply model OpenAI/Gemini + Heart rules + persona — fully functional), **send-reply** + **sync-engagement** (Meta Graph — go live once a Meta page is connected via OAuth).

**Workspace** [PulseAgent.tsx](src/screens/PulseAgent.tsx) — standard card shell, pink/fuchsia, 7 URL-synced accessible tabs:
- **Overview** ([overview/](src/components/pulse/overview/)) — stat cards (scheduled/pending replies/published/connections), upcoming list, connection health, quick actions (navigate tabs).
- **Create** ([create/](src/components/pulse/create/)) — Single/Bulk toggle. Composer: profile datalist, platform chips, type, caption + "Improve with AI" (reuses Promptor `useOptimizeDraft`), extended text, media-URL list, Save draft / Publish now / Schedule. Bulk: brief → N variants (cancelable, progress) → Save all as one campaign.
- **Calendar** ([calendar/](src/components/pulse/calendar/)) — `@dnd-kit` month grid, drag to reschedule, Unscheduled rail, locked when published, status legend.
- **Posts** ([posts/](src/components/pulse/posts/)) — filterable card grid + Sheet draft editor + delete confirm.
- **Engagement** ([engagement/](src/components/pulse/engagement/)) — Comments/Inbox sub-tabs, reply cards (incoming → editable AI draft → Generate/Send/Skip), live Manual/Semi/Auto mode switch, Sync.
- **Analytics** ([analytics/](src/components/pulse/analytics/)) — per-profile/per-platform metric grid + dependency-free SVG reach sparkline (recharts was removed in the audit — do NOT reintroduce).
- **Settings** ([settings/](src/components/pulse/settings/)) — upload-post (existing PulseSettings) + Integrations (Meta/ElevenLabs/Canva key editors) + Reply Model picker + Automation (mode + DM cap) + Posting Schedule.

**Hooks:** usePulseDrafts, usePulseReplyQueue, usePublishPost, usePulseConnections, usePulseWorkspaceSettings (+ existing usePulseSettings/usePulseProfileAnalytics). Shared [lib/pulseApi.ts](src/lib/pulseApi.ts).

**Runtime credentials Sam still supplies (for live testing, not to unblock build):** Meta app id/secret + Business verification/app review (gates send-reply/sync-engagement), ElevenLabs key, Canva creds, and a connected upload-post profile (gates live publish). generate-reply works today with the OpenAI/Gemini key already in llm_settings.

**QA:** `tsc` clean; `npm run lint` 0 errors (36 known warnings); **security-auditor agent: PASS, Low risk** (0 Critical/1 High/2 Med/3 Low — none exploitable in current internal-admin/manual-review state). Hardening applied + redeployed **v9**: `sync-engagement`/`send-reply` Meta token moved to Authorization header (was in URL/body) + numeric pageId / comment-id validation; `publish-post` platform allowlist + https-only media URLs; `generate-reply` prompt-injection clause (untrusted fenced content); error logs message-only; `getApiKey` → `maybeSingle`. RLS verified admin-only on all 4 tables (anon denied). **NOT done:** `npm run build` (dev server live on :8000 — project lesson), live publish/Meta verification (needs Sam's credentials). Before enabling Meta OAuth + `reply_mode:'auto'`, revisit the auto-send prompt-injection surface. Branch `fix/audit-remediation` (committed; not pushed/merged).

**Lessons:** recharts is NOT installed (removed in the 9-phase audit; CLAUDE.md stack line is stale) — use inline SVG. MCP edge deploys need full-file re-inline each time (no patch) + bundle `_shared/` via `<name>/index.ts` layout. The generated types file is too large for the MCP type-gen round-trip — hand-add new tables.

### Fix — Pulse Settings: profiles never rendered + React key warning (2026-05-22)
Two bugs on Settings → Pulse, both rooted in the `pulse-api` edge fn returning upload-post.com's raw payloads while the client expected a different shape (verified the real shapes against docs.upload-post.com).
- **Profiles not showing:** `GET /uploadposts/users` returns `{ success, plan, limit, profiles: [{ username, social_accounts }] }` — a wrapper object, not an array. [usePulseSettings.ts](src/hooks/usePulseSettings.ts) typed `list-accounts` as `PulseAccount[]` and [PulseSettings.tsx](src/components/settings/PulseSettings.tsx) did `Array.isArray(accounts)` → always false → permanent "No profiles found." Also each profile carries `social_accounts` (object keyed by platform, value `{display_name, social_images}` when connected, `""` when not) — not the `platforms: string[]` the UI read.
- **React key warning** (`Each child in a list should have a unique "key" prop … from PulseSettings`): the Platform Pages lists keyed on `page.page_id`/`org.urn`/`board.board_id`, but the real fields are `id`/`name` → keys resolved `undefined`.
- **Fix (edge, normalize server-side so the client gets one predictable shape):** added `toArray()`/`pick()` helpers to [pulse-api/index.ts](supabase/functions/pulse-api/index.ts). `list-accounts` now unwraps `.profiles` → `{ username, platforms }` (platforms = connected `social_accounts` keys, skipping empty values). `get-platforms` now normalizes all three networks to `{ id, name }[]` with field fallbacks (`id ?? page_id`, `id ?? urn`, `id ?? board_id`; index fallback `${key}-${i}` if both missing). Deployed via **MCP as pulse-api v3** (`verify_jwt:false`, matching prior; bundled `_shared/cors.ts` + `_shared/rate-limit.ts` using the project's proven `<name>/index.ts` + sibling `_shared/` MCP layout).
- **Fix (client):** `PulsePlatformPages` retyped to `PulsePlatformItem[]` (`{id,name}`) arrays; [PulseSettings.tsx](src/components/settings/PulseSettings.tsx) renders the arrays directly with `key={item.id ?? i}` and the `length > 0` guards, dropping all the `as` casts.
- **Follow-up — surfaced the Posting Schedule (queue settings) UI** (same session): Task 9 shipped `usePulseQueueSettings`/`useUpdatePulseQueueSettings` but they were never rendered. Verified the real shape (`{ timezone, slots:[{hour,minute}] (≤24), days:[0=Mon..6=Sun] }`). Fixed the hook types (`PulseTimeSlot`; `slots` was wrongly `number[]`/`number`). Edge `get-queue-settings` now normalizes/unwraps to `{slots,days,timezone}`; `update-queue-settings` payload retyped. New component [PulseQueueSettings.tsx](src/components/settings/PulseQueueSettings.tsx) (kept separate so [PulseSettings.tsx](src/components/settings/PulseSettings.tsx) stays under the 200-line rule): timezone Select (curated TZ list + always includes the fetched value), Mon–Sun day toggles (`aria-pressed`, rose accent, focus ring), add/remove `type="time"` slots with a 24 cap + counter, Save → mutation; loading/empty/not-connected states; renders only when `isConnected`. Wired in after Platform Pages. Edge **redeployed v4**.
- **Follow-up — rich Connected Profiles view + per-profile analytics** (same session): replaced the flat "username + Active badge" list with a full profile view. Edge `list-accounts` now returns the rich shape `{ username, createdAt, accounts: [{ platform, displayName, image, handle }] }` (every connected platform's display name + profile picture `social_images` + handle, instead of just platform names); new edge action `get-profile-analytics` → `GET /analytics/{username}?platforms=…` (followers/reach/views/impressions/profileViews/likes/comments/shares/saves). Edge **redeployed v5**. Hook: `PulseSocialAccount`/`PulseAccount` retyped, new `usePulseProfileAnalytics(username, platforms, enabled)` (lazy — fires only when a profile dialog opens). New client files: [pulsePlatforms.ts](src/components/settings/pulsePlatforms.ts) (platform label/color maps + `initials`/`formatMetric`/`formatDate` helpers), [PulseConnectedProfiles.tsx](src/components/settings/PulseConnectedProfiles.tsx) (profile cards: avatar w/ initials fallback, display name, @handle, brand-colored platform pill; profile pictures are `<a target="_blank">` to open the image in a new tab; "View details" button), [PulseProfileDialog.tsx](src/components/settings/PulseProfileDialog.tsx) (Dialog: enlarged accounts list + lazy analytics stat grid, loading/error/empty states). Wired into [PulseSettings.tsx](src/components/settings/PulseSettings.tsx) replacing the old inline card (dropped `usePulseAccounts`/`Users`/`Share2`). Avatars use Radix `AvatarImage` (native `<img>`, no next/image domain config needed). **No fabricated social-page links** — API gives none; the picture URL is the only reliable external link.
- QA: `tsc --noEmit` clean, eslint clean on all touched/new client files. `npm run build` skipped — dev server was live on :8000 (project lesson: don't build over live HMR); HMR hot-reloaded the client changes. Live re-verify (reload Pulse + Test Connection → profiles + schedule + View-details analytics) deferred to Sam.
- **Lesson:** upload-post list endpoints wrap their arrays (`profiles`/`pages`/`boards`) and use `id`/`name`, not the `page_id`/`urn`/`board_id`/`platforms[]` the original Task 9 client assumed; queue slots are `{hour,minute}` objects (≤24), days are 0=Mon..6=Sun; per social account exposes `display_name`/`social_images`/`username` (no profile-page URL); analytics is a separate `/analytics/{username}?platforms=` call. Normalize external payloads in the edge proxy, not the component.

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
- **Phase 6 UI** — DONE + live-verified: A11Y-01, UI-05, a WCAG-AA contrast pass (UI-03/04/06 — role badges in UsersManagement + AccountSettings amber-700→800, WishpediaEntryCard category badge, Nexus 'Not Connected' faint→amber, ComingSoon page badge → explicit AA), **UI-08** ([Settings.tsx](src/screens/Settings.tsx) mobile tab strip gets a `sm:`-only right-edge fade mask hinting horizontal scroll), and **UI-13** ([AccountSettings.tsx](src/components/settings/AccountSettings.tsx) avatar camera was a full-cover overlay at `opacity-100` on mobile, hiding the initials → replaced with a small bottom-right corner button + aria-label). **UI-01 was a dev-only false positive** — the bottom-left "N" over "Collapse" is the Next.js dev-tools indicator (`nextjs-portal`), absent in production; the app sidebar footer has only the Collapse button. (ProfileHero's avatar was already correct — initials fallback; the AccountSettings one was the actual UI-13 culprit.) REMAINING (deferred — design decisions or low/marginal, see MEMORY.md): UI-02 (Pixel dark-theme — product decision), UI-07 (disabled-button token — global/subjective), UI-09 (Files tile icon/truncation), UI-10 (MasterMind back-nav consistency), UI-11 (stat-card affordance — appears already consistent), UI-12 (agent subtitle — standard muted token), UI-14–19, UI-LB-01 (works; redundant a11y node only).
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
