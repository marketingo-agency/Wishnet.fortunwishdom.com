# OMNI AUDIOS TRACK — PODCAST SUITE BUILD PLAN

> **Status:** APPROVED FOR FUTURE EXECUTION — no code has been changed yet.
> **Written:** 2026-07-16. Grounded in: (a) live web research on 2026 podcast publishing (RSS spec, directory submission, platform AI policies — sources cited inline), (b) a full read of the existing Whisper podcast engine, (c) the two sibling plans. Hub structure (six cards) + self-hosted RSS default explicitly approved by Sam.
> **Execute in:** a fresh session. Read `CLAUDE.md` + this file + **BOTH sibling plans IN FULL** (`plans/OMNI_IMAGES_OVERHAUL_PLAN.md`, `plans/OMNI_VIDEOS_TRACK_PLAN.md` — this plan leans on Plan 1 §3 D-CTX and Plan 2 §1.2/§3/§7, not just their protocol sections); run `git log --oneline -3` to confirm base.
> **HARD DEPENDENCY:** Plans 1 AND 2 must be **fully executed** before this plan starts. This plan consumes, without rebuilding: the mode-keyed step registry (Plan 2 Phase 1), the `omni-finisher` background-job function + `'persisting'` CAS claim (Plan 2 Phase 2b), the `video-utility` fal wrapper incl. `waveform`/`merge-audios`/`merge-audio-video`/`compose`/`loudnorm`/`trim-video`/`metadata` (Plan 2 Phase 2b), the shared voiceover module (Plan 2 D-V5), `content_library.media_type` (Plan 2 D-V10), per-second fal pricing (Plan 2 D-V9), and the context engine (Plan 1 Phase 5). If any is missing, STOP and tell Sam.

---

## 0. Mission & Approved Structure

Build the Omni **Audios** track from `coming_soon` into an AI podcast production + distribution suite: **long-form podcasts** (30–60 min), scenario/pre-production, defined AI personas, podcast-to-video, and **publishing to real podcast platforms**.

**Cost thesis (client-facing):** a 30-minute episode ≈ **$5–10** (ElevenLabs TTS ~26k chars + LLM cents + cover cents). Podcasts are the affordable long-form.

**The Audios hub — six cards, 2×3 (APPROVED by Sam 2026-07-16):**

| # | Card | One-liner |
|---|------|-----------|
| 1 | **Podcast Scenario** | Pre-production: show concept + per-episode planning from topic/URL/**Brain knowledge** → outline → full multi-speaker chaptered script (cold open, intro, chapters, outro). Long-form solved by chapter-by-chapter generation. |
| 2 | **Podcast Studio** | The flagship: script → cast → chunked long-form render → intro/outro jingles + music beds → loudness mastering → real duration probe → chapters, show notes, transcript, cover. A platform-ready episode. |
| 3 | **Cast & Personas** | Define the persons: name, role, personality + speaking style, ElevenLabs voice w/ preview, AI portrait — or link a **Wishpedia character** (Wishu can host). Reused across all modes; portraits power the video versions. |
| 4 | **Podcast to Video** | Full-episode audiogram (cover + waveform → MP4) for YouTube; talking-persona clips (avatar + lipsync on portraits) for promos; highlight clips (AI-picked moments, captioned, vertical) for Reels/TikTok/Shorts. |
| 5 | **Publish & Feed** | Self-hosted RSS per show (PSP-1-valid XML, byte-range-safe serving, **AI-disclosure baked in**), one-time directory submission checklist (Spotify/Apple/Amazon/YouTube-ingest/iHeart), one-click episode publish/schedule; audiograms to YouTube via the existing Pulse upload-post route. Admin-gated. |
| 6 | **History** | Same run registry, audio modes filtered. |

**Considered and set aside (Sam saw these):** standalone "Sound Lab" music/SFX mode (jingles live inside Podcast Studio; a dedicated card can come later); Spotify VIDEO podcasts (partner-host-only — out of reach for self-hosted RSS, and not needed: audio-everywhere + video-on-YouTube covers the goal); voice CLONING (out of scope — designed/library voices only, which is also the safe zone under Spotify's impersonation ban).

**Out of scope:** the standalone Whisper agent is NOT modified (it stays as the admin workspace; see D-A2); Meta-direct publishing (unchanged deferral); animated waveforms (fal can't — static waveform v1, VPS-ffmpeg future).

---

## 1. Verified Capability Base

### 1.1 Publishing facts (web-verified 2026-07-16; sources inline)

- **A podcast = an RSS 2.0 feed + one-time manual directory submission. No submission API exists anywhere.** After submission, every new episode auto-appears everywhere when the XML updates.
- **Feed requirements (PSP-1, github.com/Podcast-Standards-Project):** channel: `atom:link rel=self`, title, description, link, language, `itunes:category`, `itunes:explicit`, `itunes:image`; item: title, `enclosure` (url + length bytes + MIME), immutable `guid`. Recommended: `podcast:guid` (UUIDv5 of feed URL), `itunes:duration`, `podcast:transcript`. Spotify additionally wants `itunes:owner` email for verification.
- **Artwork:** 1400–3000px square (3000 recommended), JPEG/PNG, RGB, no alpha (podcasters.apple.com/support/5514).
- **Apple HARD requirement (podcasters.apple.com/support/823):** the media server MUST support HTTP HEAD + byte-range requests. Supabase Storage has documented intermittent Range regressions (github.com/orgs/supabase/discussions/4115) → **Phase 0 probes the live bucket; the VPS (Traefik) is the fallback serving path.** Enclosure URLs tolerate 301/302; GUIDs must NEVER change (changing one re-creates the episode).
- **Directories (one-time, manual, admin accounts needed):** Spotify for Creators (24–48h approval, third-party RSS fully accepted), Apple Podcasts Connect (Apple ID), Amazon (podcasters.amazon.com/submit-rss), iHeart (US/CA/MX/AU/NZ submitters only), Pocket Casts. **YouTube RSS ingest VERIFIED (support.google.com/youtube/answer/13525207):** Studio → Content → Podcasts → Connect RSS; YouTube auto-creates static-image videos per episode. Constraints: region-gated, NO baked-in ads allowed, audio not updatable post-publish.
- **Hosted-API pivot (documented, not default):** Transistor.fm — `x-api-key` REST: `GET /v1/episodes/authorize_upload` → PUT bytes → `POST /v1/episodes` → `PATCH /publish`; $19/mo unlimited; auto-distributes. (Podbean OAuth2 / Buzzsprout token are fallbacks.)
- **AI policies:** Apple REQUIRES prominent disclosure (in audio AND metadata) when AI generates a material portion — **we bake a spoken disclosure line + metadata note into every episode**. Spotify (May 2026) bans AI impersonation of real people; original designed synthetic voices are allowed. ElevenLabs paid plans include a perpetual commercial license (verify the account tier in Phase 0).
- **Validation before first submission:** castfeedvalidator.com / podba.se / Apple's validator.

### 1.2 The Whisper engine we lift (file:line-verified)

All in `supabase/functions/whisper-api/index.ts` (429 lines, admin-gated, ElevenLabs key from `pulse_connections.provider='elevenlabs'` → env fallback):
- `generate-script` (:107-262): topic/paste/SSRF-hardened URL → strict JSON `{title, segments:[{speaker,text}]}`; 4 formats (solo/two_host/interview/explainer); word budgets short 250-450 / medium 700-1100 / **long 1600-2400 (12-18 min — the ceiling this plan's chaptered generation breaks)**; Heart-grounded; ElevenLabs v3 audio tags (`[laughs]`,`[pause]`) allowed; tolerant parse + stripDashes.
- `render-episode` (:280-346) + `ttsLine` (:145-163): merges consecutive same-voice lines → `POST /v1/text-to-speech/{voiceId}?output_format=mp3_44100_128` (per-voice stability/similarity/style/speed) → naive MP3 byte-concat (valid: same-format frames) → **80MB cap ≈ 83 min @128kbps** → `EdgeRuntime.waitUntil` + status-row polling (client polls the DB row every 4s).
- `list-voices` (:200-214, GET /v2/voices), `preview-line` (:216-278, base64 data-URL preview), `generate-shownotes` (:348-388, JSON title/description/chapters[{time,label}]/tags), `generate-cover` (:390-422, fal image via shared helpers).
- **THE MISMATCH:** whisper-api is `is_admin`-gated with admin-only tables; omni is all-authenticated owner-scoped. **Reuse the CODE (lift to `_shared/`), never call the function** (non-admins would 403 at :195).
- Known engine facts: `eleven_v3` is account-dependent (project lesson) — runtime default `eleven_multilingual_v2`; ElevenLabs TTS caps 5000 chars/call; duration today is ESTIMATED (words/2.5) — **RSS needs real values** (probe via `ffmpeg-api/metadata` or byte-exact math at fixed 128kbps); `whisper_shows.intro_audio_path/outro_audio_path` exist in schema but were never implemented — this plan implements jingles properly via `merge-audios`.

### 1.3 Gaps this plan must build (verified absent)

No audio mimes in `_shared/fal.ts` EXT_BY_MIME (audio would persist as `.png` — 2-line fix + raised maxBytes) · no public audio serving anywhere (whisper-audio is private; `serve-file` is auth-only + bucket-allowlisted; `src/app/api` doesn't exist — but public buckets have precedent: wishpedia-media, profile-pictures, and the VPS runs a real `next start`) · no persona registry (nothing maps an identity → voice + style; `whisper_voices` lacks an entry link) · no ElevenLabs STT/Scribe integration yet (Plan 2 Phase 7 builds transcript tooling this plan reuses) · `omni_runs.mode` CHECK excludes audio modes · fal music models scouted but unregistered (lyria2 $0.10/30s, stable-audio-3 ≤380s, mmaudio-v2 $0.001/s — from Plan 2 §1.2).

### 1.4 Wishpedia persona seam (verified)

`wishpedia_entries` (name, description = lore) + `wishpedia_entry_images` in the PUBLIC `wishpedia-media` bucket (client uses `getPublicUrl` — portraits are directly usable as persona art and RSS channel art). A persona can therefore be a Wishpedia character today; only the identity→voice mapping table is missing (D-A4).

---

## 2. Mode Flows

```
PODCAST SCENARIO  1 Show & Brief (pick/create show, topic/URL/Brain sources, format+length) → 2 Outline (chapter list, editable) → 3 Script (chapter-by-chapter generation, per-segment speaker assignment) → 4 Cast & handoff (personas per speaker → Send to Studio)
PODCAST STUDIO    1 Script-in (from Scenario or quick topic) → 2 Cast (personas, per-voice preview) → 3 Render (chunked TTS → merge → jingles → loudnorm; background via finisher) → 4 Package (chapters, show notes, transcript, cover, duration probe) → 5 Finalize (episode saved; publish handoff)
CAST & PERSONAS   Registry surface (not a wizard): persona list · create/edit (name, role, personality, speaking style, voice+preview, portrait: generate via Images pipeline | pick Wishpedia character | upload) · defaults per show
PODCAST TO VIDEO  1 Source (episode or segment) → 2 Treatment (audiogram | talking personas | highlight clips) → 3 Generate & review → 4 Formats & finalize (rides Videos-track distribution)
PUBLISH & FEED    Show/feed manager (admin): show settings (RSS metadata, category, artwork, AI-disclosure text) · feed preview + validation checklist · episode publish/schedule to feed · directory submission checklist (one-time) · YouTube audiogram push via Pulse
```

## 3. Architecture Decisions

- **D-A1 (modes & data):** THREE new `omni_runs.mode` values — `'podcast_scenario' | 'omni_podcast' | 'podcast_video'` — one CHECK-widening migration (before any client writes). Cast & Personas and Publish & Feed are NOT run modes (registry/manager surfaces). New tables: **`omni_personas`** `{id, user_id, name, role, personality, speaking_style, voice_id, voice_settings jsonb, portrait_url, wishpedia_entry_id FK nullable, created_at}` (owner-scoped RLS); **`podcast_shows`** `{id, user_id, name, slug, description, language, category, artwork_path, feed_config jsonb (itunes tags, owner email, disclosure text), default_cast jsonb (speakerLabel→persona_id), created_at}` (owner-scoped; publishing actions admin-gated); **`podcast_episodes`** `{id, show_id FK, run_id FK nullable, title, description, audio_path (private working copy), public_audio_path nullable, cover_path, duration_s, bytes, guid (immutable, set at publish), chapters jsonb, transcript_path, status draft|published|scheduled, published_at, sort}` — the feed generator reads THIS table, never step_state. Registry: the three audio sequences register in the mode-keyed step registry (Plan 2's generalization) as the third `modeFamily: 'audios'`; HistoryView filter extends.
- **D-A2 (engine lift — reuse code, not the function):** new `_shared/elevenlabs.ts` (getElevenKey, listVoices, previewLine, ttsLine, same-voice merge, MP3 concat) + `_shared/podcast.ts` (script/outline/shownotes prompt skeletons, parseScript, safeFetch lift). New OMNI actions consume them: `podcast-script`, `podcast-render`, `podcast-shownotes`, `podcast-cover`, `podcast-voices`, `podcast-preview-line`. **whisper-api is NOT touched** — it remains the admin workspace on its own tables; consolidating Whisper onto the shared modules is a DEFERRED, optional follow-up (zero-risk posture). Coordinates with Plan 2's D-V5 voiceover module — if Plan 2 already extracted ttsLine into `_shared`, this plan EXTENDS that module rather than creating a second one (check first; never two ElevenLabs code paths).
- **D-A3 (long-form architecture — the 30–60 min answer):** (1) SCRIPT: outline-first, then **chapter-by-chapter script generation** (one LLM call per chapter with outline + prior-chapter tail as context — breaks the 12-18 min single-call ceiling, keeps arcs coherent); (2) RENDER: per-chapter TTS renders persist as chunk `omni_assets` (`metadata.kind:'podcast_chunk'`, each ≤20MB — well inside edge memory), then ONE `merge-audios` pass (+ intro jingle + outro jingle) + `loudnorm` via the Plan-2 `video-utility` action → final episode MP3 persisted (typical 30 min ≈ 29MB @128kbps; cap 200MB ≈ 3.4 hrs); (3) BACKGROUND — **precise job model (TTS is NOT a fal queue job; the inherited finisher is a fal POLLER and cannot execute ElevenLabs calls unmodified):**
  - *Interactive path:* `podcast-render` renders ONE chapter per invocation inside `EdgeRuntime.waitUntil` (the proven Whisper pattern — a single chapter fits the wall-clock window); the chunk row is the job token (`pending` → CAS-claim `'persisting'` → `done`); the CLIENT's 4s row-poll triggers the next chapter's render call. A 60-min episode = ~6-10 sequential chapter calls, all client-paced.
  - *Tab-closed path:* **the `omni-finisher` function is EXTENDED (real work, deployed at Phase 2b):** a new **TTS-worker branch** — sweep picks ONE stale unclaimed `podcast_chunk` row per pass (keyed on `metadata.kind='podcast_chunk'` + no `fal_request_id`; family filter widened from video-only to include audios), CAS-claims it, executes the ElevenLabs render within a per-sweep wall-clock budget, persists, exits. Chapters complete one per sweep (*/2 cron ⇒ a 10-chapter episode finishes ≤ ~20 min unattended).
  - *Assembly tail:* when ALL chunks are `done`, the orchestrator (client trigger OR finisher) SUBMITS `merge-audios` → `loudnorm` → `metadata` probe — these ARE fal queue jobs with request_ids, so the finisher's EXISTING poller path carries them; a tiny state field on the run (`step_state.render_stage: 'chunks'|'assembling'|'done'`) makes the orchestration explicit.
  Duration + bytes for RSS come from the `ffmpeg-api/metadata` probe on the FINAL file — never the words/2.5 estimate.
- **D-A4 (personas):** persona = the unit of casting everywhere: Scenario assigns personas to speaker labels; Studio renders with persona voice+settings; Podcast-to-Video animates persona portraits; scripts inject persona personality/speaking-style lines into the system prompt (Heart-grounded via assembleContext). Portraits: generate via the Images pipeline, pick a Wishpedia character (public URL + lore feeds the prompt), or upload. **Impersonation guard:** persona creation UI carries the Spotify-policy note (original/designed voices only; no cloning of real people — cloning is out of scope entirely).
- **D-A5 (podcast-to-video tiers):** (1) **Audiogram** (default, cents): `ffmpeg-api/waveform` (static waveform image) + cover/persona art + audio → `compose` (image track + audio track) → MP4 → YouTube via pulse-api upload-post (WORKS TODAY) or Videos-track distribution. (2) **Talking personas** (premium, per-second): avatar models on portraits (Kling Avatar v2 / OmniHuman — schemas UNVERIFIED, fetch before building; lipsync tiers per Plan 2 Q1) — positioned for SHORT promo clips, never full episodes (cost). (3) **Highlight clips**: transcript (Plan 2's Scribe/wizper tooling) → assembleContext-grounded LLM picks 3-5 moments → audiogram-per-moment (compose with audio offset — **Phase 0 probes whether compose keyframes can clip an audio segment via timestamp+duration; fallback: trim the full audiogram MP4 with `trim-video`**) → captions → vertical formats. Full episodes reach YouTube automatically via RSS ingest ANYWAY — audiogram uploads are for control/monetization; both routes offered.
- **D-A6 (publishing/RSS — self-hosted, APPROVED):** new PUBLIC bucket **`podcast-public`** (public read; service-role/admin write; audio+image+xml MIME allowlist — wishpedia-media hardening precedent). Publish = copy final MP3 + cover into `podcast-public/{showSlug}/…`, mint the immutable GUID, regenerate the show's `feed.xml` object (PSP-1-complete, XML-escaped, `podcast:guid` = UUIDv5 of feed URL, disclosure metadata, `podcast:transcript` link). **Serving architecture is decided by the Phase 0 Range probe:** (A) probe PASSES → feed + enclosures served directly from the public bucket URLs (zero server code, live-verifiable pre-merge); (B) probe FAILS → thin Next.js route handlers on the VPS (`/podcast/[show]/feed.xml` + Range-passthrough audio proxy) — buildable pre-merge, live-verifiable only post-merge (documented honestly in Phase 9/12). **Feed URL choice is FOREVER** (podcast:guid seeds from it) — locked at the Phase 9 gate with Sam (Q1). AI disclosure: one spoken line auto-appended to each episode's outro segment + `<itunes:summary>`/description note — non-removable default, editable text.
- **D-A7 (gating):** creation (scenario/studio/personas/video) = all authenticated users, owner-scoped. Publishing (shows' feed operations, directory checklist, YouTube push) = **admin-gated** (Content Library precedent) — public exposure is an admin decision.
- **D-A8 (storage):** working audio in a new private **`omni-audio`** bucket (chunks, drafts, transcripts as sidecars — path-only in metadata, per Plan 2 D-V8); published enclosures/covers/feed.xml in `podcast-public`. `persistFalMedia`: add `audio/mpeg→mp3`, `audio/wav→wav`, `audio/ogg→ogg` + audio-appropriate caps.
- **D-A9 (cost card):** ElevenLabs char-based estimator (`chars × rate`, rate CONFIGURABLE in omni_settings — plan-dependent) shown at script lock + render; fal music per-30s rows; per-episode total estimate (the $5-10 story, honest).
- **D-A10 (Content Library):** widen `media_type` enum with `'audio'` (extends Plan 2's column); Pulse Library renders audio items with a player card; episode finalize optionally creates a library item (the podcast's social clips flow through the normal Content Library path).

---

## 4. Execution Protocol

Identical to Plans 1-2 (branch `feat/omni-audios-track`, hard gates, Sam's go per phase, tsc/lint clean, MEMORY.md updates, omni verify_jwt **true**, CLI byte-exact deploys, no acceptance may depend on an undeployed action, interim-terminal rule for multi-phase modes). **PROD-COMPAT:** all new actions/tables are additive — zero old-client risk; `_shared` edits must stay backward-compatible (whisper-api redeploys are NOT triggered by _shared changes unless whisper itself is redeployed — do not redeploy whisper-api at all in this plan). Deploy schedule:
- **omni #1** end of Phase 2 — the creation actions: podcast-voices, podcast-preview-line, podcast-script, podcast-shownotes, podcast-cover, **podcast-jingle** (music generation → omni-audio bucket), podcast-render.
- **omni-finisher extension redeploy (`--no-verify-jwt`)** at Phase 2b — the TTS-worker branch + audios family filter + assembly orchestration (D-A3.3). This is a REAL redeploy of Plan 2's function, listed explicitly.
- **omni #2** end of Phase 9 — the publishing actions: publish-episode, unpublish-episode, feed-regenerate.
- **omni #3** contingency at Phase 8 — only if the talking-persona chain OR audio transcription needs new edge shaping.
- **content-library** (`--no-verify-jwt`) at Phase 7 (media_type 'audio').
Migrations at Phase 1; the `podcast-public` bucket + feed objects are data, not deploys.

---

## 5. THE PHASES

### Phase 0 — Baseline & decisive probes (S)
1. Verify Plans 1+2 landed IN FULL (registry mode-map, omni-finisher live, video-utility live, shared VO module, media_type column); tsc/lint baseline. **Specifically verify by NAME:** (a) does a deployed TRANSCRIPTION edge action exist from Plan 2's Phase 7 (Scribe/wizper) — if Plan 2 shipped captions client-side or the action is missing, transcription joins this plan's omni #1 action list; (b) can Plan 2's live omni generate a Lyria2 AUDIO output and persist it with correct mime/bucket — if not, `podcast-jingle` (already scheduled in omni #1) covers it; (c) upload-post's max video size/duration for YouTube (docs or one cheap test) — decides whether full-episode audiograms ride pulse-api or default to the RSS-ingest route.
2. **THE RANGE PROBE (decides D-A6 serving):** upload a test MP3 to a public bucket → `curl -I` (HEAD) and `curl -H "Range: bytes=0-1"` against the public URL, repeated over an hour — record Accept-Ranges/206 behavior. PASS → bucket-direct; FAIL → VPS route architecture.
3. ElevenLabs: confirm the account is on a PAID plan (commercial license — ask Sam); probe `eleven_v3` availability on this key (project lesson: account-dependent); record the per-char rate for D-A9.
4. Compose audio-clipping probe: can `compose` keyframes place a SEGMENT of a long audio (timestamp+duration clip) — decides the highlight-clip path (D-A5.3 fallback: trim-video on the audiogram).
5. Micro-probe `merge-audios` + `loudnorm` with 3 chunk MP3s (~$0.01).
6. Acceptance: all probe verdicts + the serving architecture decision recorded in MEMORY.md.

### Phase 1 — Foundations: DB, registry, pricing (M)
1. Migration set: widen `omni_runs.mode` CHECK (+3 audio modes); create `omni_personas`, `podcast_shows`, `podcast_episodes` (+owner RLS per D-A1/D-A7 **+ admin SELECT policies on podcast_shows/podcast_episodes** — the Phase-9 feed manager reads client-side and must see all shows; omni_assets admin-SELECT precedent); create `omni-audio` (private) + `podcast-public` (public, MIME-allowlisted) buckets; widen `content_library` media_type with `'audio'`.
2. Registry: register the three audio sequences as `modeFamily:'audios'`; **widen the `modeFamily` TYPE union (`'images'|'videos'` → +`'audios'`) and the HistoryView prop so tsc surfaces every two-family assumption**; Vitest specs for the audio sequences NOW.
3. `_shared/fal.ts`: audio mimes + caps (backward-compatible). falPricing: lyria2/stable-audio rows + the ElevenLabs char estimator util.
4. Acceptance: migrations applied + mirrored; registry tests green; images+videos tracks regression-clean.

### Phase 2 — Engine lift + omni podcast actions + finisher extension (edge) (XL — gates 2a/2b)
1. (2a) Lift into `_shared/elevenlabs.ts` + `_shared/podcast.ts` (extend Plan 2's VO module if it already owns ttsLine — ONE ElevenLabs code path, never two). whisper-api untouched.
2. (2a) Actions: `podcast-voices` (list), `podcast-preview-line`, `podcast-script` (outline mode + chapter mode per D-A3, assembleContext-grounded, persona personality injection, SSRF-hardened sources incl. Brain RAG as a source type), `podcast-shownotes`, `podcast-cover`, **`podcast-jingle`** (Lyria2/Stable-Audio music generation, persists to omni-audio with audio mimes).
3. (2b) `podcast-render` per D-A3.3's PRECISE job model: one chapter per invocation under waitUntil, chunk-row CAS tokens, client-paced chaining; `render_stage` orchestration for the assembly tail (merge-audios + jingles → loudnorm → metadata probe via the fal poller path). Enforce the AI-disclosure outro line server-side (D-A6).
4. (2b) **Extend + redeploy `omni-finisher`** (`--no-verify-jwt`): TTS-worker branch (one stale `podcast_chunk` per sweep, CAS-claimed, wall-clock-budgeted), audios family in the sweep filter, assembly-tail submission when all chunks are done. Vitest for the CAS claim on TTS jobs.
5. Deploy omni #1 + the extended omni-finisher. Live-verify HEADLESS: a 3-chapter script → close the tab mid-render → the finisher completes remaining chapters + assembly across sweeps → final MP3 with correct probed duration.
6. Acceptance (2b): end-to-end script→episode-MP3 works interactively AND tab-closed; whisper-api regression untouched (spot-check one admin whisper render still works).

### Phase 3 — Audios hub shell + History + tile flip (M)
1. `AudiosHub` (six cards, 2×3, omni-theme discipline); OmniAgent routes `view==='audios'`; graceful inert stubs for unbuilt modes; flip the Audios tile `availability` to `'available'` (order already Videos-before-Audios from Plan 2).
2. History: `modeFamily:'audios'` filter; bucket-aware deletion extends to `omni-audio` + **published-episode guard** (deleting a run whose episode is PUBLISHED warns and never touches `podcast-public` objects — feed stability, GUID permanence).
3. Acceptance: hub live; both themes + breakpoints; images/videos History regression-clean.

### Phase 4 — Cast & Personas (M)
1. Persona registry UI: list/create/edit/delete; voice picker with `podcast-preview-line` playback; portrait: generate (Images pipeline), pick Wishpedia character (public URL + lore → persona personality seed), or upload; speaking-style free text; per-show default cast on `podcast_shows`.
2. Impersonation-policy note in the create flow (D-A4).
3. Acceptance: create a Wishpedia-linked persona (Wishu) + a designed persona; previews play; both usable downstream.

### Phase 5 — Podcast Scenario (M)
1. Stage 1 Show & Brief (pick/create show; topic/URL/Brain-knowledge sources; format/length incl. long-form 30/45/60-min targets); Stage 2 Outline (chapter list editor, regenerate per chapter); Stage 3 Script (chapter-by-chapter generation with progress, per-segment speaker labels, inline editing); Stage 4 Cast & handoff (persona per speaker; **"Send to Podcast Studio" DISABLED until Phase 6** — interim-terminal rule; the scenario is a complete resumable artifact).
2. Acceptance: a 45-min-target scenario (outline + full chaptered script) generates end-to-end, Heart/Brain-grounded, costs shown.

### Phase 6 — Podcast Studio (L — gates 6a/6b)
1. (6a) Stages 1-3: script-in (Scenario import or quick topic), cast review, render orchestration UI (per-chapter progress from asset rows, retry per chapter, jingle picker — generate via Lyria2/pick existing/none, bed volume note per Plan 2's no-ducking reality); Scenario handoff button activates.
2. (6b) Stages 4-5: package (chapters editor synced to show notes, transcript sidecar, cover generate/pick, duration/bytes display) + finalize (podcast_episodes draft row + optional Content Library audio item). Interim terminal: "episode ready — publishing lands in Phase 9".
3. Acceptance: full 30-min episode rendered + packaged from a scenario; retry on a failed chapter works; resume clean at every stage.

### Phase 7 — Content Library audio (+content-library deploy) (S)
1. content-library edge + Pulse Library: audio items render with a player card; media_type 'audio' flows through list/delete paths. Deploy content-library (**`--no-verify-jwt`**).
2. Note (existing platform behavior, stated honestly): `content_library_items` is admin-only RLS — library items from a NON-admin's finalize are visible to admins only; suppress the optional item creation for non-admins to avoid invisible rows.
3. Acceptance: an admin-finalized episode appears playable in Pulse → Library.

### Phase 8 — Podcast to Video (L; omni #3 contingency — only if avatar OR transcription shaping needs it)
1. Treatment 1 Audiogram: waveform + cover/persona art + audio → compose → MP4 (full episode or segment); push to YouTube via pulse-api (existing) or hand into Videos-track distribution.
2. Treatment 2 Talking personas: FETCH avatar schemas first (Kling Avatar v2 / OmniHuman — unverified); persona portrait + episode-segment audio → talking clip; lipsync tier fork per Plan 2 Q1; PROMO-length only (cost guard: warn above 90s).
3. Treatment 3 Highlight clips: transcript → grounded moment selection → per-moment audiogram/talking clip via the Phase-0-decided clipping path → captions → vertical formats (Videos-track presets).
4. Acceptance: one full-episode audiogram on YouTube (via upload-post, needs the connected profile), one talking Wishu promo clip, one 3-clip highlight set — costs shown at each trigger.

### Phase 9 — Publish & Feed (L; omni deploy #2 — the publishing actions; +M if the Range probe failed) 
1. Show feed manager (admin, reads via the Phase-1 admin SELECT policies): RSS metadata editor (category/explicit/owner-email/artwork validation 1400-3000px), AI-disclosure text editor (default locked ON), feed preview.
2. Edge actions **`publish-episode` / `unpublish-episode` / `feed-regenerate`** (admin-gated): copy MP3+cover → `podcast-public`, mint immutable GUID, regenerate `feed.xml` (PSP-1-complete, XML-escaped — titles/descriptions are an injection surface, escape EVERYTHING); unpublish removes the episode entry + regenerates, never deletes prior GUIDs' history semantics. Immediate-only v1 (Q2). **Deploy omni #2 HERE** — Phase 9's acceptance exercises these actions live.
3. Serving per the Phase-0 verdict: bucket-direct, OR VPS route handlers (`/podcast/[show]/feed.xml` + Range-passthrough audio proxy) — if VPS: **the public /podcast/* routes MUST be excluded from the auth middleware matcher** (podcast apps carry no session; verify anonymously with cookie-less curl), code ships now, LIVE verification moves to Phase 12/post-merge, stated honestly, and the phase grows by ~M.
4. Directory submission CHECKLIST UI (Spotify/Apple/Amazon/YouTube-ingest/iHeart/Pocket Casts — links, status tracking, validator links castfeedvalidator.com). Submissions themselves are HUMAN actions (accounts) — REQUIRES HUMAN at delivery.
5. Acceptance: a published episode yields a validator-clean feed URL serving byte-range-correct audio (bucket path — or local-verified VPS path with live check deferred to Phase 12); second episode publish updates the feed in place with stable GUIDs; unpublish regenerates correctly.

### Phase 10 — UI perfection pass (M)
Both omni themes, 375/768/1024/1440, WCAG AA, focus/hover/reduced-motion, loading/empty/error states on every new surface (player cards, chapter editors, persona gallery, feed manager); ui-reviewer A-range, 0 critical.

### Phase 11 — QA (mandatory gate) (M)
1. tsc/lint/tests + Playwright smoke (scenario→studio→episode). 
2. **security-auditor (MANDATORY)** + code-reviewer + ui-reviewer, adversarial. Special attention: `podcast-public` bucket exposure (MIME allowlist, write path admin/service-only), feed XML injection/escaping, SSRF on script sources, persona/impersonation guard, admin gates on all publish actions, GUID immutability, whisper-api untouched-regression.
3. Images + Videos tracks full regression (shared files: registry, HistoryView, fal.ts, falPricing, content-library).
4. Live paid E2E: one 30-min episode start-to-published-feed; one audiogram to YouTube; one talking clip.
5. Acceptance: 0 confirmed Critical/High; both sibling tracks regression-clean.

### Phase 12 — Delivery (S)
Merge → push → VPS auto-deploy (activates VPS feed routes if that architecture won); post-merge live feed verification (validator + a real podcast app subscribe test); CLAUDE.md lessons; MEMORY.md cleared; **REQUIRES HUMAN:** directory submissions with real accounts (decide owner: Sam vs client), ElevenLabs paid-plan confirmation, upload-post YouTube profile connection, live listen-through sign-off of episode #1. ✅✅✅ TASK COMPLETE block.

---

## 6. Landmines (Plans 1-2 lists apply in full — ADDITIONS)

1. **GUIDs are immutable forever** — changing one re-creates the episode on every platform; never regenerate on re-publish; never derive from mutable fields.
2. **The feed URL is forever** (`podcast:guid` = UUIDv5 of it) — locked at the Phase 9 gate; enclosure URLs tolerate redirects, the feed URL does not.
3. Apple hard-requires HEAD + byte-range on media — the Phase 0 probe is load-bearing; never ship enclosures on unverified serving.
4. AI disclosure is an APPLE REQUIREMENT (audio + metadata) — the spoken line is a non-removable default; Spotify bans real-person voice impersonation (no cloning, designed voices only).
5. ElevenLabs: 5000 chars/call cap; `eleven_v3` account-dependent (multilingual_v2 fallback); naive MP3 concat is valid ONLY for same-format frames — every chunk must render with the identical output_format; ONE key path (`pulse_connections`), ONE shared code module (extend Plan 2's, never fork).
6. RSS `itunes:duration`/enclosure length must be PROBED values (ffmpeg metadata), never the words/2.5 estimate.
7. XML escaping everywhere in the feed generator — episode titles/descriptions/show notes are user/LLM-authored and are an injection surface into a public document.
8. whisper-api and the whisper tables are NEVER modified or redeployed in this plan — regression-check the admin workspace anyway (shared `_shared` files are bundled at DEPLOY time, so an un-redeployed whisper-api cannot break, which is exactly why it must not be redeployed casually).
9. Published `podcast-public` objects are NEVER deleted by run/History deletion (feed stability) — unpublishing is an explicit admin action that also regenerates the feed.
10. YouTube RSS ingest: region-gated + no baked-in ads + audio immutable post-publish — surface these in the checklist UI.
11. **The inherited omni-finisher is a fal POLLER, not a TTS executor** — podcast chunks have no `fal_request_id` and are invisible to its sweep until the Phase-2b extension (TTS-worker branch + audios family filter) is deployed. Never assume the Plan-2 finisher handles ElevenLabs work as-is.
12. The Phase-9 publishing actions ship in their OWN omni deploy (#2) — front-loading them into deploy #1 would mean building the feed generator seven phases before its design phase; do not "optimize" the schedule that way.

## 7. Open Questions (defaults chosen — execution proceeds on defaults unless Sam overrides at the gate)

| # | Question | Default |
|---|----------|---------|
| Q1 | Feed URL home (FOREVER decision): bucket-direct URL vs `wishnet.fortunwishdom.com/podcast/{show}/feed.xml` vs a dedicated `feeds.` subdomain? | Decided at the Phase 9 gate from the Phase 0 probe + Sam's call; plan default = VPS path under wishnet.fortunwishdom.com if the probe fails, bucket-direct if it passes |
| Q2 | Scheduled episode publishing v1, or immediate-only? | Immediate-only v1 (scheduling rides the existing dispatch pattern later) |
| Q3 | Whisper consolidation (refactor whisper-api onto the shared modules)? | Deferred — separate mini-plan after this track stabilizes |
| Q4 | Highlight clips: audiogram-style only v1, or talking-persona highlights too? | Audiogram-style v1; talking highlights follow the Phase 8 cost A/B |
| Q5 | Directory account ownership (Spotify/Apple/Amazon/iHeart)? | Client-owned accounts, Sam assists — REQUIRES HUMAN at delivery |
| Q6 | Transistor pivot trigger? | Only if self-hosted feed ops prove painful post-launch; the API integration is documented in §1.1, not built |

## 8. Phase Summary

| Phase | Title | Size | Deploys | Ships user-visible |
|-------|-------|------|---------|--------------------|
| 0 | Baseline + decisive probes (Range, ElevenLabs, compose-clip, transcription-action check, upload-post caps) | S | – | – |
| 1 | Foundations: DB (personas/shows/episodes + admin SELECT), registry family widening, buckets, pricing | M | migration | – |
| 2 | Engine lift + podcast actions + jingle + **finisher TTS-worker extension** (gates 2a/2b) | XL | omni #1 + omni-finisher redeploy | – (headless pipeline) |
| 3 | Audios hub + History + tile flip | M | – | **Audios track goes live** |
| 4 | Cast & Personas | M | – | Mode 3 |
| 5 | Podcast Scenario | M | – | Mode 1 |
| 6 | Podcast Studio (gates 6a/6b) | L | – | Mode 2 |
| 7 | Content Library audio | S | content-library | Library audio items |
| 8 | Podcast to Video | L | omni #3 (contingency: avatar/transcription shaping) | Mode 4 |
| 9 | Publish & Feed (+M if Range probe failed → VPS routes) | L | **omni #2 (publish actions)** | Mode 5 |
| 10 | UI perfection pass | M | – | Polish |
| 11 | QA (security mandatory) | M | – | – |
| 12 | Delivery + post-merge feed verification | S | – | CLAUDE.md, handoff |
