# OMNI BUILD REPORT

> Final report for the Omni Multimodal Creation AI build (8 phases, 2026-06-12).
> Spec reference: [OMNI_SPEC.md](OMNI_SPEC.md). Branch: `feat/omni`.

## What shipped per phase

| Phase | Deliverable | Commit |
|---|---|---|
| 0 | Scaffolding: registration across every touchpoint (agents.ts, routeConfig, page wrapper, gradients, Header, EditUserSheet, `ai_can_access_omni` migration), 5 workspace tables with RLS, omni edge skeleton, four-tile entry shell, data-omni-theme dark mode, fullscreen | `4690291` |
| 1 | fal.ai layer: dynamic catalog (live Model Search API + curated outage fallback), generic queue runner (submit at full model path, status/result at the base app id), capability metadata, admin health check, verified live generation | `caece6f`, `9e65f6d` |
| 2 | Omni Images: the full 12-step wizard (objective, Promptor lock, multi-model multi-variant selection, recap, live progressive generation with per-image actions, social descriptions, networks, per-network dimension registry, repurposed set generation, approval, finalize to the Content Library) | (phase commit) |
| 3 | Transform and Upscale: vision analysis with universe-relation conclusion (RAG + Heart grounded), transformation brief, i2i/upscale model selection, item-only save or repurposing handoff on the same run | (phase commit) |
| 4 | Pulse Content Library + Mode 3: content-library edge function (post-now, schedule, dispatch, connectors), pg_cron dispatcher every 5 minutes with a DB-seeded secret, the Pulse Library tab, the Images Repurposing gathering wizard | `7df5ba3` |
| 5 | History: registry with covers and filters, resume-at-any-step, retake-as-clone, selective + clear-all delete with protection for library-backed runs; 16 adversarial-review findings fixed (incl. paid-output persistence and back-nav mode gating) | `84793e3` |
| 6 | Surprise Me: knowledge mining via diverse random sampling (Brain + Wishpedia, Heart-compliant), grounded idea cards with citations, one-click routing into the wizard with the objective prefilled | `0abbd4a` |
| 7 | Brainstorming: RAG-grounded chat with provider/model pickers, image attachments, Promptor optimization, lock-and-redirect with prefill on the same run, switch to Surprise Me | `e5306a5` |
| 8 | Polish + QA: finalize-run idempotency (omni v10), security audit, UI review, build green, QA data cleanup, this report | (final commit) |

## Architecture and schema overview

**Edge functions**
- `omni` (v10, verify_jwt + full in-function auth, 60 req/min/user): settings, fal catalog/submit/status, per-variant generation engine (`variant-submit`, batched `variants-poll` persisting outputs to storage), `asset-url`, `save-asset-to-files` (Omni AI sector), `analyze-image` (vision + hybrid RAG + Heart), `surprise-ideas`, `brainstorm-chat`/`brainstorm-lock`, idempotent `finalize-run`.
- `content-library` (v1, verify_jwt=false with in-function auth): admin path (JWT + is_admin + 30/min) for post-now/schedule/unschedule/connections/signed URLs; cron path authenticated by a random secret stored in `pulse_connections` (provider `omni_dispatch`), fired by pg_cron + pg_net every 5 minutes. Connectors: Meta Graph v21.0 (Facebook page photos, Instagram container + publish) activate on credentials; X and TikTok stop honestly at the credential gate (posts park as Queued).

**Tables (all RLS)**
- `omni_settings`, `omni_runs`, `omni_assets`: owner-scoped (`auth.uid() = user_id`); admins can additionally SELECT `omni_assets` so the shared library renders media.
- `content_library_items`, `content_library_posts`: admin-only (is_admin), consistent with the Pulse workspace.
- The workflow engine: every wizard run is an `omni_runs` row (mode, current_step, full step_state snapshots, status); every generated variant is an `omni_assets` row (storage path, model id, parent run, parent image lineage). One schema drives all six modes including the Brainstorming chat (messages live in step_state) and powers History retake/resume.

**Heart + RAG compliance**
- One clean `fetchHeartRules` (agent key `omni`): error-surfaced (a fetch failure blocks generation), priority-ordered in code (critical > high > medium > low, sort_order tiebreak).
- Full vector store access: hybrid `match_knowledge` over `brain_document` AND `wishpedia_entry` with `query_text` for BM25. All retrieved/sampled content is sanitized and fenced as untrusted before prompt interpolation.

**Storage**
- All outputs in the private `files` bucket under `{userId}/omni-images/{runId}/`, served exclusively through signed URLs (24h default). The "Omni AI" sector mirrors Pixel's save pattern.

## REQUIRES HUMAN (complete list)

1. **osha-chat redeploy** (so Osha knows Omni exists). The one-line registry entry is committed; deploying the 2,195-line live function via MCP transcription was ruled out for fidelity risk. Run once with your Supabase access token:
   ```
   npx supabase login
   npx supabase functions deploy osha-chat --project-ref zlmideilxfnokemzkavm
   ```
2. **Meta (Facebook + Instagram) publishing**: Meta app id + secret, page OAuth tokens into `pulse_connections` (provider `meta`, `meta_page_tokens`, `config.default_page_id`, `config.ig_user_id`), Business verification + app review. Until then posts park as Queued with an honest message.
3. **X publishing**: paid-tier X API credentials + app approval (store via the Library connections dialog).
4. **TikTok publishing**: Content Posting API app approval + credentials.
5. fal.ai API key: DONE (stored in `llm_settings.fal_api_key`, verified live in Phase 1).

## Known limitations

- Network publishing is credential-gated by design; the dispatcher, queue, and statuses are fully honest (Not Connected / Queued / Scheduled / Posted / Failed). No posting is faked.
- The Brainstorming provider picker covers OpenAI and Gemini; fal text-gateway models are excluded (no text-chat transport in the omni edge).
- Knowledge retrieval embeddings require the OpenAI key; with only Gemini configured, analysis blocks (vision flow) and the brainstorm chat degrades honestly to Heart-only grounding.
- Retaking a LOCKED brainstorming run clones the brief but not the conversation (Retake means start over).
- The in-memory per-user rate limiter resets on edge cold starts (documented first-layer defense).
- Surprise Me mines by random sampling windows, so idea diversity depends on knowledge base size; an empty knowledge base fails with a clear message.

## Seams left for Audios and Videos

- The entry tiles, `OmniTrack` type, URL `track` param, and `OmniComingSoon` surfaces already reserve both tracks; flipping `availability` in [omniConstants.ts](src/components/omni/omniConstants.ts) lights them up.
- `omni_assets.kind` already accepts `'audio' | 'video'`; the workflow engine (runs + step_state) is mode-agnostic.
- The fal catalog module supports arbitrary capability queries; audio/video capability mappings slot into `CAPABILITY_QUERY` without structural change.
- The generic queue runner normalizes any fal output that exposes file URLs; `normalizeFalOutput` needs an audio/video branch when those tracks arrive.

## QA summary (Phase 8)

- finalize-run idempotency: fixed in omni v10 and verified live (re-finalizing a completed run returned the existing item with `already_finalized: true`, no duplicate row).
- Security audit (security-auditor agent): **PASS, Low risk. 0 Critical, 0 High, 3 Medium, 5 Low.** All three Mediums fixed and deployed as content-library v2: a 60-second atomic dispatch-overlap guard (cron vs manual can no longer double-publish), constant-time cron-secret comparison, and Graph API params moved from the URL to the form body. Low findings triaged: the proposed `UNIQUE(source_run_id)` index was deliberately NOT added (a transform run legitimately produces two items via item-only save plus repurposing handoff); content-length/streaming, variants-poll batch cap, and extension derivation are documented accepted behaviors; the attachment last-role tightening is noted for a future omni pass.
- UI review (ui-reviewer agent) across 375/768/1024/1440 and both Omni themes: **B-, 3 critical / 7 warnings / 6 suggestions.** All three criticals fixed and re-verified visually: History rows now wrap on narrow screens instead of collapsing, the Brainstorming composer is capped to the message column width (clear of the floating Osha button), and the catalog status badge uses theme-aware contrast (emerald/amber 700 in light, 400 in dark via the data-omni-theme variant). The reviewer's detailed warning/suggestion list was lost with its transcript; the named blockers were addressed and a manual re-pass found no further critical issues.
- `npm run build` green (full route table incl. /ai-agents/omni), `tsc` clean, eslint 0 errors (39 pre-existing warnings, unchanged baseline).
- Temp QA admin `claude.qa@wishnet.internal` deleted with all its runs, assets, library items, and posts (verified zero rows). One orphaned ~1MB test PNG remains in storage at `files/1a65e05b-7251-4f3b-9411-33d077a09758/omni-images/9d2add47-860c-49ca-9404-7e68d6a17a2e/1c066722-78af-4551-8ba5-9a820b2ab5fb.png` (direct SQL deletion of storage rows is trigger-blocked; delete it once via Dashboard > Storage if desired).
