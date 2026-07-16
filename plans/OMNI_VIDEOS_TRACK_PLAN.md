# OMNI VIDEOS TRACK — FULL BUILD PLAN

> **Status:** APPROVED FOR FUTURE EXECUTION — no code has been changed yet.
> **Written:** 2026-07-16. Grounded in a live fal catalog sweep (30+ endpoints priced, 16 schemas fetched — every model id below is verified unless marked otherwise) + a full codebase-seams map. Hub structure (six cards) explicitly approved by Sam.
> **Execute in:** a fresh session. Read `CLAUDE.md` + this file + **`plans/OMNI_IMAGES_OVERHAUL_PLAN.md`** (Plan 1 — at minimum its §4 Execution Protocol, §6 Landmines, and §1.2 findings table, which this plan incorporates by reference) fully first; run `git log --oneline -3` to confirm base ≥ `e2ba60b`.
> **HARD DEPENDENCY:** `plans/OMNI_IMAGES_OVERHAUL_PLAN.md` must be **fully executed (through its Phase 13)** before this plan starts. Non-negotiable reasons: this plan's video wizard builds on the step registry in its FINAL v2 state (Plan-1 Phase 7 flip), the context engine (Plan-1 Phase 5), and the overhauled HistoryView (Plan-1 Phase 9) — interleaving would make Plan-1's later phases rewrite surfaces this plan changes. If Plan 1 is not complete, STOP and tell Sam.

---

## 0. Mission & Approved Structure

Build the Omni **Videos** track from `coming_soon` to a full production suite: complex videos, long-form multi-scene videos, short-form social clips, and scenario/pre-production authoring.

**Entry screen change (Sam's explicit ask):** reverse the tile order — **Videos before Audios** (`OMNI_TRACKS` array order in `src/components/omni/omniConstants.ts`; Brainstorming · Images · Videos · Audios). The Videos tile's `availability` flips to `'available'` only at the phase where the hub ships (Phase 3) — never before.

**The Videos hub — six cards, 2×3 (APPROVED by Sam 2026-07-16):**

| # | Card | One-liner |
|---|------|-----------|
| 1 | **Scenario Studio** | Pre-production: brief/topic/URL → knowledge-grounded scenario (acts → scenes with visual prompt, narration, duration, camera) → storyboard keyframes via the Images pipeline → shot list. A saved, reusable artifact that seeds Video Studio. |
| 2 | **Video Studio** | The flagship: scenario → per-scene clip generation (draft/hero tiers) → continuity chaining → ElevenLabs voiceover + music → fal timeline assembly → captions → distribution → finalize. Duration-agnostic: long-form = more scenes. |
| 3 | **Clips** | Short-form fast lane: one idea → platform-ready 15–60s vertical clip. Hook-first, native-audio models, auto-captions, TikTok/Reels/Shorts presets. 3–4 screens. |
| 4 | **Animate** | Image-to-video: any image (Omni assets, Files, Wishpedia canon art, Content Library) comes to life — motion, character consistency (up to 9 refs), talking characters (avatar + ElevenLabs voice + lipsync). The Wishu mode. |
| 5 | **Repurpose & Enhance** | Master video → per-network variants: AI reframe (no cropping), trim-to-length, thumbnails, upscale/interpolation. Stretch: long→shorts highlight clipping. |
| 6 | **History** | Same run registry, filtered to video modes. |

**Brainstorming is deliberately NOT a video card** — Scenario Studio owns structured ideation for video (approved).

**Out of scope:** the Audios track; Meta-direct video publishing connectors (IG Reels API needs app review — same deferral as Pulse setup); caption BURN-IN (v1 ships sidecar SRT; burn-in needs ffmpeg on own infra — documented as a future plan); audio ducking/mixing beyond what fal offers.

---

## 1. Verified Capability Base (live-checked 2026-07-16 — the executing session can trust these, re-verify only marked items)

### 1.1 Generation models

| Role | Model id | Facts (schema-verified) | Price |
|------|----------|------------------------|-------|
| Hero T2V | `fal-ai/kling-video/v3/pro/text-to-video` | 3–15s enum, native audio (`generate_audio`), **`multi_prompt` multi-shot** (several scenes inside one clip), `elements[]` character refs (@Element1 in prompt), aspect 16:9\|9:16\|1:1, no resolution param (1080p tier; `/v3/4k` + `/turbo` exist) | $0.14/s |
| Hero T2V (premium) | `fal-ai/veo3.1` (+`/fast`) | 4\|6\|8s only, 720p\|1080p\|4k, native audio, `auto_fix`, aspect 16:9\|9:16 only; Google policy can block prompts | $0.40/s; fast $0.15/s |
| Hero T2V (value) | `bytedance/seedance-2.0/text-to-video` | 4–15s or `auto`, 480p→4k, aspect auto\|21:9\|16:9\|4:3\|1:1\|3:4\|9:16 (widest), native audio at no extra cost | $0.014/**unit** — OPAQUE; calibrate with one live run (Phase 0) |
| Draft T2V | `fal-ai/ltx-2.3/text-to-video` (+`/fast`) | 6\|8\|10s, 1080p\|1440p\|2160p, fps 24\|25\|48\|50, `generate_audio`, aspect **16:9\|9:16 ONLY** | $0.08/s; fast $0.06/s |
| Long-form draft | `fal-ai/longcat-video/text-to-video/720p` | The ONLY >60s single-shot generator: `num_frames` (no schema max), 720p/30fps, GIF/ProRes/webm/mp4 out, **NO audio**, open-model quality | $0.04/s |
| I2V (storyboard) | `bytedance/seedance-2.0/image-to-video` | `image_url` (start) + `end_image_url` + prompt; **`reference-to-video` sibling: up to 9 images + 3 videos + 3 audio refs** — strongest character-consistency engine on fal | $0.014/unit |
| I2V (storyboard) | `fal-ai/kling-video/v3/pro/image-to-video` | `start_image_url` + `end_image_url` + `elements[]` + `multi_prompt` | $0.14/s |
| I2V (frames) | `fal-ai/veo3.1/first-last-frame-to-video` | `first_frame_url` + `last_frame_url` (both required) + prompt | tier ~$0.40/s |

### 1.2 Assembly & post (the architecture-critical facts)

- **`fal-ai/ffmpeg-api/compose`** ($0.0002/s) — VERIFIED multi-track timeline: `tracks[]` of `{id, type: 'video'|'audio'|'image', keyframes: [{timestamp ms, duration ms, url}]}` → `video_url` + `thumbnail_url`. Concat clips, layer VO + music tracks, place image overlays. **PLACEMENT ONLY: no transitions/crossfades, no text overlay, no caption burn-in, no per-track volume/opacity.** Hard cuts only.
- **`fal-ai/ffmpeg-api/merge-videos`** — straight concat that **normalizes resolution/fps** (`video_urls[]` + `resolution` + `target_fps`; defaults to min-dimensions if omitted — ALWAYS pass both).
- **`fal-ai/ffmpeg-api/merge-audio-video`** (`video_url` + `audio_url` + `start_offset`), `merge-audios`, `loudnorm` (EBU R128), `metadata` (probe), `waveform`.
- **`fal-ai/ffmpeg-api/extract-frame`** (first|middle|last → images[]; thumbnails + last-frame chaining), **`fal-ai/workflow-utilities/trim-video`** (start_time + end_time|duration), `scale-video`, `reverse-video`.
- **Reframe (aspect conversion, the video twin of image tier-2):** `fal-ai/ltx-2.3/reframe` — ≤60s input, aspect 1:1|4:5|5:4|9:16|16:9, 720p|1080p, $0.10/s (generative outpaint, NO cropping). >60s: `fal-ai/wan-vace-apps/long-reframe` (scene-by-scene). Alt: `luma ray-2/reframe` $0.20/s.
- **Upscale/interpolation:** `fal-ai/topaz/upscale/video` $0.01/s (model enum Proteus/Artemis/…, `upscale_factor`, `target_fps` = built-in interpolation); budget `fal-ai/seedvr/upscale/video` $0.001/MP; `fal-ai/film/video` interpolation $0.0013/s.
- **Restyle (v2v):** `decart/lucy-restyle` — up to 30-min videos (UNVERIFIED schema/price — 429'd; verify before use).
- **Lipsync/talking:** `fal-ai/sync-lipsync/v3` $8/min (sync_mode cut_off|loop|bounce|silence|remap); budget `fal-ai/latentsync` $0.005/s (~$0.30/min); `fal-ai/kling-video/lipsync/audio-to-video`; talking stills: `fal-ai/bytedance/omnihuman/v1.5`, `fal-ai/kling-video/ai-avatar/v2/pro` (**works on stylized/cartoon characters — Wishu-relevant**; schemas unverified — fetch before Phase 9).
- **STT/captions:** `fal-ai/wizper` is SEGMENT-level only (no word timestamps, no SRT/VTT) — build SRT from `chunks[]`, or use **ElevenLabs Scribe** (word-level; $0.008/min via fal, or ElevenLabs DIRECT — the key is already integrated via `pulse_connections`).
- **Music/SFX:** `fal-ai/lyria2` $0.10/30s (loop/stitch for beds); `stable-audio-3` up to 380s (price unfetched); SFX-on-video: `fal-ai/mmaudio-v2` $0.001/s (video+prompt → video WITH synced audio; set `duration` explicitly, default 8s).

### 1.3 Known gaps (each has a chosen path — see D-decisions)

No transitions on fal (hard cuts v1; generative bridge `pixverse /transition` or VPS ffmpeg later) · no caption burn-in (SRT sidecar v1) · no per-track volume (no ducking v1) · Sora not on fal · `units` pricing opaque on Seedance/Hailuo/Kling-lipsync (calibrate) · no dedicated GIF converter (LongCat/LTX emit GIF natively).

### 1.4 Codebase seams to inherit (verified file:line)

- **fal transport:** `_shared/fal.ts` — `generateVideoViaFal` (queue+poll), `normalizeFalVideoOutput` (both `video`/`videos[]` shapes), `persistFalMedia` (host-validated, mp4/webm mimes, **parameterized bucket + maxBytes, default 20MB**), `uploadTempImageForFal`. Omni's own queue runner (`fal-runner.ts`) + LIVE catalog (`fal-catalog.ts`) are track-agnostic by design (OMNI_SPEC reserved seams).
- **The only fully-persisted video path today:** pixel-chat (`pixel-chat/index.ts:1044-1116`) — fal.media re-validation → magic-byte sanity check → private bucket upload → 24h signed URL (getPublicUrl 403s — documented bugfix) → Files Manager row. THE template for the omni video persist path.
- **Whisper's crown jewels** (`whisper-api/index.ts`): `render-episode` = the long-job pattern (status row 'rendering' → heavy loop in `EdgeRuntime.waitUntil` → client polls the DB ROW every 4s, NOT the function → 80MB cap with a user-facing message → status 'rendered'/'failed'+error). `ttsLine` + consecutive-same-voice merging = the VOICEOVER engine. `generate-script` = the SCENARIO generator skeleton (topic/paste/SSRF-hardened URL → Heart-grounded → strict JSON `{title, segments[]}` with tolerant parsing + stripDashes) — adapting it to scenes is a prompt swap.
- **Omni UI seams:** videos tile exists with `availability:'coming_soon'` (one-field flip, `omniConstants.ts:63-71`); `?track=videos` already routes (`OmniAgent.tsx:71-95`); `OmniComingSoon` swaps for a `VideosHub` mirroring the `view==='images'` branch.
- **Resume machinery:** `omni_assets.metadata.fal_request_id` is persisted at submit (`omni/index.ts:656`) and `variants-poll` re-derives status from it — the foundation the server-side finisher builds on.
- **Rate math:** omni 60/min limiter; 3s polling = 20 req/min — one video run fits. The gap: tab-closed completion (finisher, D-V7).
- **DB:** `omni_runs.mode` CHECK = `('omni_images','transform_upscale','repurposing','surprise_me','brainstorming')` (migration 20260612101000:34) — needs widening. `omni_assets` has width/height + status enum that fits video; duration goes in metadata.
- **Publishing:** content-library connectors are image-typed (`PublishInput = {caption, imageUrl}`), BUT **pulse-api `publish-post` already supports `postType:'video'`** via upload-post `/upload` with a `video` form param (`pulse-api/index.ts:516-561`) — a working video publish route exists TODAY.
- **Presets:** `omniNetworkPresets.ts` is image-only (YouTube block literally commented "Images only (no video)") — video needs a parallel registry (D-V6).
- **Buckets:** `whisper-audio` (migration 20260522160000) is the exact precedent for a private `omni-video` bucket.

---

## 2. The Mode Flows

```
SCENARIO STUDIO   1 Brief (topic/URL/idea + Inspire) → 2 Structure (acts/scenes editor) → 3 Storyboard (keyframes via Images pipeline) → 4 Export / Send to Video Studio
VIDEO STUDIO      1 Scenario (import or quick-brief) → 2 Storyboard & Cast (keyframes, characters, tier pick) → 3 Scenes (per-scene draft generation, review, re-roll)
                  → 4 Audio (VO script+voices, music) → 5 Assembly (timeline, hero re-render of approved scenes) → 6 Captions → 7 Distribution (per-network variants) → 8 Finalize
CLIPS             1 Idea (hook templates + Inspire) → 2 Generate (1–2 native-audio clips) → 3 Captions & Format → 4 Finalize
ANIMATE           1 Source (Omni/Files/Wishpedia/Library picker) → 2 Motion or Talk (prompt | script+voice+lipsync) → 3 Generate & review → 4 Formats & Finalize
REPURPOSE&ENHANCE 1 Source video → 2 Targets (networks + ops: reframe/trim/upscale) → 3 Process & review → 4 Finalize
```

## 3. Architecture Decisions

- **D-V1 (modes & registry):** five new `omni_runs.mode` values: `'video_scenario' | 'omni_videos' | 'video_clips' | 'video_animate' | 'video_repurpose'` — ONE widening migration. **Registry generalization is REAL, budgeted work (Phase 1), not free:** Plan 1's registry is a SINGLE-flow module (one images stage-id union, one ordinal map, images-surface membership). Phase 1 extends `stepRegistry.ts` into a **mode-keyed sequence map** — `{mode → {stages[], surfaces, migrate}}` — with family-aware surface resolution, per-mode `schema_version` handling (video modes are born at their own `video_schema_version: 1`; the images v1→v2 map is untouched), and Vitest specs for all five video sequences written IN Phase 1. History resolves surfaces off mode exactly as today; `HistoryView` gains a `modeFamily: 'images' | 'videos'` filter prop (images hub History shows image modes, videos hub shows video modes; one component — built on the POST-Plan-1-Phase-9 HistoryView).
- **D-V2 (scene data model):** `step_state.scenario = {title, scenes: [{idx, visual_prompt, narration, duration_s, camera?, keyframe_asset_id?, clip_asset_id?, hero_asset_id?}]}`. Clips are `omni_assets` rows (`metadata: {scene_idx, tier: 'draft'|'hero', duration_s, fal_request_id}`); storyboard keyframes are IMAGE `omni_assets` linked by `metadata.scene_idx`. The assembly timeline is derived, never stored duplicated.
- **D-V3 (draft/hero tiering — the cost answer):** iterate the WHOLE timeline on cheap models (LongCat 720p for long-form silent drafts $0.04/s; LTX-fast for short drafts w/ audio $0.06/s), then **re-render only approved scenes** on the hero model (Kling 3 Pro default; Seedance for wide/unusual aspects or heavy reference needs; Veo 3.1 for premium moments). Rough finished-minute math shown in the cost card: draft ≈ $2.4–3.6/min · hero Kling ≈ $8.4/min · Veo ≈ $24/min + VO/music/assembly cents.
- **D-V4 (assembly):** `ffmpeg-api/compose` is the backbone (video track = scene clips back-to-back by cumulative ms; audio track 1 = VO; audio track 2 = music; optional image track = logo overlay). Straight concat with mixed sources → `merge-videos` WITH explicit `resolution` + `target_fps`. Always finish with `loudnorm`; thumbnail via `extract-frame`. Hard cuts are v1 (and the dominant social style); transitions = future (generative bridges or VPS ffmpeg).
- **D-V5 (audio):** voiceover = lift Whisper's `ttsLine` + same-voice merging + concat into a shared module consumed by the omni edge (ElevenLabs key already shared via `pulse_connections`); music = Lyria2 (30s beds, loop via `merge-audios`) or Stable Audio 3 for long beds; mux via `merge-audio-video`/compose tracks. **No ducking v1** (fal has no volume control) — mitigation: prompt music as "quiet ambient bed", and Clips prefers native-audio models where speech+sound are generated coherently in-clip.
- **D-V6 (video presets):** NEW parallel registry `OMNI_VIDEO_NETWORKS` (do NOT extend the image presets — every image consumer assumes static pixels): per network `{id, label, width, height, ratio, fps, maxSeconds, sweetSpotSeconds, maxMB}` — TikTok 1080×1920 9:16 ≤600s (sweet 15–60s) · IG Reels 9:16 ≤90s · YT Shorts 9:16 ≤180s · YouTube 16:9 1920×1080 long-form · Pinterest 2:3 / 9:16 · Facebook 16:9/9:16. Reframe targets snap to each MODEL's aspect enum exactly like `MODEL_ASPECT_ENUMS` does for images (LTX reframe lacks 21:9 — snap+note).
- **D-V7 (long-job finisher — the tab-closed answer):** keep the proven 3s client polling for interactive sessions, PLUS a pg_cron sweep every 2 min. **CRITICAL AUTH FACT (critic-verified): the sweep CANNOT call the omni function** — omni is `verify_jwt=true`, so a pg_net POST without a valid user JWT is 401'd at the platform gateway before our code runs (the content-library cron works ONLY because that function is `verify_jwt=false` with an in-function `cron_secret` check). Therefore the finisher lives in a **NEW, tiny, dedicated edge function `omni-finisher`**, deployed **`--no-verify-jwt`**, validating a DB-seeded `cron_secret` in-function (constant-time compare — the exact content-library cron pattern), importing the shared poll/persist code from `_shared/fal.ts` + a small shared module extracted from omni's persist path. Sweep logic: SELECT omni_assets WHERE status IN ('pending','generating','persisting'-stale) AND metadata.fal_request_id IS NOT NULL AND mode-family=video AND updated_at older than 90s → poll fal → claim → persist → status. **Double-persist race guard:** persisting is claimed via compare-and-set (`UPDATE ... SET status='persisting' WHERE id=? AND status IN ('pending','generating')` — the `'persisting'` status value is added to the omni_assets CHECK in Phase 1's migration); exactly one of client-poll/finisher wins the claim; stale `persisting` rows (>10 min) are reclaimable. Phase 0 must verify fal queue-result retention (probe with a real request_id).
- **D-V8 (storage):** new private bucket **`omni-video`** (whisper-audio precedent: owner+admin RLS, signed-URL-only, migration), path `{userId}/omni-videos/{runId}/{assetId}.mp4`. Persist via `persistFalMedia(bucket:'omni-video', maxBytes raised)`. **Edge-memory policy (persistFalMedia buffers via arrayBuffer — the isolate ceiling is real): in-request persist only ≤50MB; larger files persist via `EdgeRuntime.waitUntil` inside the poll response (Whisper precedent) or the finisher exclusively; hard user-facing cap 200MB** with a Whisper-style "split it" message — Phase 0 probes the largest realistic file, and the cap tightens if the probe says so. Intermediates policy: ALL paid clips persist (project lesson: paid outputs persist the moment they exist); superseded drafts stay `'done'` with `metadata.superseded_by` pointing at the hero (History cost chips count all); assembly steps reference fal.media URLs directly as inputs (no intermediate re-downloads into the edge), only outputs persist. **SRT files are sidecar objects in the bucket** (`{runId}/{assetId}.srt`) — only their PATH goes in step_state / item metadata, never the transcript text (long-form SRT is 100s of KB of row bloat otherwise). **History deletion must become bucket-aware** (Phase 3): `useOmniHistory`'s delete/clear-all/sparing logic hardcodes the `'files'` bucket today — video runs would silently orphan hundreds of MB; derive the bucket from the asset's storage path or mode family.
- **D-V9 (cost card):** `falPricing.ts` gains a per-SECOND branch (`{price, unit:'second'}`) + a `calibrate:true` flag rendering "≈, verify" for unit-priced models (Seedance/Hailuo) until Phase 0 calibrates them. Studio estimates = Σ scenes × duration × tier price + VO chars + music + cents of assembly; shown at tier-pick, before hero re-render, and per-network in distribution.
- **D-V10 (publishing v1):** finalize writes `content_library_items/posts` with a new `media_type` column (`'image'|'video'`, default 'image' — backfill-free). Video posts publish via the WORKING pulse-api upload-post route (manual from Pulse); the scheduled Meta-direct connectors stay image-only (IG Reels API deferred with Pulse setup). Download + SRT sidecar always available from Finalize.
- **D-V11 (context grounding):** every creative action (scenario generation, scene prompts via video-submit, captions) consumes Plan-1's `assembleContext` — Heart digest into video prompts (opt-in `prompt_provenance`, same rule), Brain RAG into scenario generation, Wishpedia refs into Animate/character scenes. Zero new design; declared dependency.

---

## 4. Execution Protocol

Identical to Plan 1 (branch `feat/omni-videos-track`, hard phase gates, Sam's go per phase, tsc/lint clean at every gate, MEMORY.md updates, edge-deploy discipline: omni verify_jwt **true**, CLI byte-exact). **PROD-COMPAT:** all video edge actions are NEW — zero old-client risk; the only shared-file edits (`_shared/fal.ts` param widening, falPricing) must stay backward-compatible. **A phase that changes an edge function DEPLOYS it in that same phase — no acceptance criterion may depend on an undeployed action.** Deploy schedule: **omni #1 end of Phase 2b · omni #2 end of Phase 6 (INCLUDES the finalize-run video extension — backward-compatible, old clients never send media_type) · omni #3 end of Phase 9 only if Animate's avatar/lipsync shaping needs it** · `omni-finisher` (NEW function) deployed **`--no-verify-jwt`** at Phase 2b · content-library (`--no-verify-jwt` — hard requirement) at Phase 7 · migrations at Phases 1 and 2b.
**Interim-terminal rule (inherited from Plan 1's non-negotiable #2, adapted for a mode built across phases):** while Video Studio's later stages are unbuilt, the flow ends at the last BUILT stage with an explicit terminal screen ("Your scenes are saved — the pipeline continues in Phase N"), resume clamps to the max built stage (the registry carries a `builtThrough` marker per mode during execution), and cross-mode handoffs into unbuilt surfaces ship DISABLED with a "lands in Phase N" note. No dead ends, ever.

---

## 5. THE PHASES

### Phase 0 — Baseline & live probes (S)
1. Verify Plan-1 landed (registry + `context.ts` exist); record git base; tsc/lint baseline.
2. **Paid micro-probes (~$2 total, needs Sam's fal key live):** (a) Seedance 2.0 unit calibration — one 4s 480p clip, record real $; (b) `compose` with two mismatched clips (does it normalize or fail?); (c) `merge-audio-video` — confirm param surface (any volume?); (d) fal queue-result retention — submit, wait 30+ min, poll again (finisher viability); (e) persist-path stress: one LTX draft clip AND the largest realistic file (a ~1-2 min 1080p render or the biggest cheap clip obtainable) through `persistFalMedia` — record peak-memory viability and set the real in-request threshold + user cap for D-V8.
3. Confirm edge worker wall-clock ceiling on this Supabase plan (docs/probe) — decides waitUntil headroom for VO renders.
4. Acceptance: all five probe verdicts recorded in MEMORY.md; unit prices calibrated into a note for Phase 1's pricing rows.

### Phase 1 — Foundations: DB, registry generalization, presets, pricing, tile order (L)
1. Migration set (one file): widen `omni_runs.mode` CHECK with the 5 video modes; **add `'persisting'` to the `omni_assets.status` CHECK** (D-V7 claim state); create `omni-video` bucket + RLS (whisper-audio precedent); add `content_library_items.media_type` + `content_library_posts.media_type` ('image' default).
2. **Registry generalization (D-V1 — real work, budgeted here):** extend `stepRegistry.ts` to the mode-keyed sequence map with family-aware surface resolution, per-mode schema versioning, and the `builtThrough` interim marker; register the five video sequences (§2 flows) — unreachable until the hub ships. **Vitest specs for all five video sequences + resume clamping written NOW.**
3. `OMNI_VIDEO_NETWORKS` presets registry (D-V6 values), exported alongside the image registry.
4. `falPricing.ts` per-second branch + calibrate flag + rows for every §1.1/1.2 model. `falSpecs.ts` + edge `fal-specs.ts` lockstep entries for the chosen video models (duration enums, aspect enums, resolution params — each verified via get_model_schema during implementation; snap-don't-validate per project lesson).
5. Entry screen: swap OMNI_TRACKS order (**Videos before Audios**); Videos tile stays `coming_soon`.
6. Acceptance: migration applied + mirrored; registry tests green; tsc/lint clean; images track fully regression-green (its presets/pricing/registry behavior untouched — the images sequence path through the generalized registry is covered by Plan-1's existing tests).

### Phase 2 — Video transport + finisher (edge) (L — two gates: 2a, 2b)
**Gate 2a — generation transport:**
1. New edge action **`video-submit`**: `{runId, sceneIdx?, model, prompt, tier, params: {duration, aspect, resolution, image_url?, end_image_url?, reference_urls?}}` — validates model against the live catalog + per-model spec translation (§1.1 param names are exact), inserts the omni_assets row (metadata: scene/tier/request_id), submits to the fal queue. Prompt grounding via `assembleContext` heartDigest (opt-in provenance, Plan-1 rule).
2. New **`video-poll`**: re-derive status from request_id; **persist with the D-V7 claim (CAS to `'persisting'`) and the D-V8 memory policy** — ≤50MB in-request, larger via `EdgeRuntime.waitUntil` in the poll response; `persistFalMedia` → `omni-video` bucket (magic-byte check from the pixel template), thumbnail via `extract-frame`, signed URLs.
3. `scenario-generate` edge action (adapted from whisper generate-script: scenes JSON contract, assembleContext grounding, SSRF-hardened URL ingestion) — shipped now so Phase 4 is client-only.
**Gate 2b — utilities + finisher:**
4. New **`video-utility`** action wrapping the allowlisted fal utility calls (trim, merge-videos, merge-audio-video, compose, loudnorm, extract-frame, reframe, upscale) — server-side input shaping, never raw client passthrough (the fal-submit governance lesson).
5. **Finisher per D-V7:** NEW dedicated function **`omni-finisher`** (verify_jwt=false via explicit `--no-verify-jwt`, in-function DB-seeded `cron_secret` constant-time check — content-library cron pattern), sharing the poll/persist/claim code. **Second migration (this phase, applied only AFTER the function is deployed + hand-verified):** pg_cron job `omni-video-finisher` (*/2) + secret seed row — mirroring migration 20260612120000's structure.
6. Deploy omni #1 + omni-finisher (`--no-verify-jwt` for the finisher ONLY — omni itself stays verify_jwt=true). Live-verify: one LTX-fast clip submitted → tab CLOSED → finisher claims + persists it; the claim CAS proven (no double-persist when client poll and finisher race); scenario-generate returns valid scene JSON.
7. Acceptance (2b): clip generation works end-to-end headless; finisher proven with the tab-closed test; tsc/lint clean.

### Phase 3 — Videos hub shell + History (M)
1. `VideosHub` component (six cards, 2×3, mirroring OmniImagesHub patterns incl. `[[data-omni-theme=dark]_&]:` discipline); OmniAgent routes `view==='videos'` to it (replacing OmniComingSoon); mode surfaces stubbed behind cards with graceful "lands in Phase N" states for not-yet-built modes.
2. Flip the Videos tile `availability` to `'available'`.
3. `HistoryView` gains the `modeFamily` filter prop; videos-hub History card shows video runs; images History unchanged (regression-check).
4. **Bucket-aware deletion (D-V8):** extend `useOmniHistory`'s delete / clear-all / cross-run-sparing logic to the `omni-video` bucket (it hardcodes `'files'` today — `useOmniHistory.ts:102,147`; derive bucket from the asset's storage path). Without this, every deleted video run silently orphans its storage.
5. Acceptance: hub navigable with graceful inert stubs (both themes) for not-yet-built modes; tile live; deleting a test video run removes its omni-video objects; images track untouched.

### Phase 4 — Scenario Studio (M)
1. Stage 1 Brief: topic/idea/URL input + "Inspire me" (reuses the images-track surprise component pattern against video-flavored mining).
2. Stage 2 Structure: acts/scenes editor (add/remove/reorder scenes; per-scene visual_prompt, narration, duration_s, camera preset chips); regenerate-scene via scenario-generate.
3. Stage 3 Storyboard: batch-generate keyframes per scene via the EXISTING image pipeline (image variant-submit, cheap model default), review/re-roll per frame.
4. Stage 4 Export & handoff: shot-list view; the "Send to Video Studio" button ships **DISABLED with "lands in Phase 5"** (interim-terminal rule — Video Studio doesn't exist yet; the button activates in Phase 5 and seeds an `omni_videos` run from this run's scenario, provenance in step_state); scenario runs are themselves complete, resumable artifacts in History.
5. Acceptance: brief → complete scenario with storyboard end-to-end; costs shown for keyframe batch; the scenario is a finished deliverable on its own (export works).

### Phase 5 — Video Studio A: scenes on draft tier (L — gates 5a/5b)
1. (5a) Stages 1–2: scenario import (or quick-brief that calls scenario-generate inline), storyboard & cast review, tier/model pick with per-scene + total cost estimate (D-V3 math).
2. (5b) Stage 3 Scenes: per-scene generation queue (sequential submits, batched polling — the proven generation-runner pattern), draft tier default, per-scene re-roll/edit-prompt, i2v from keyframes (start frame; optional end frame = next scene's keyframe for continuity), last-frame chaining option (`extract-frame` last → next scene's start), scene approval gating. **Interim terminal:** stage 3 ends with the "scenes saved — audio & assembly land in Phase 6" screen; registry `builtThrough` clamps resumes; the Scenario Studio handoff button activates NOW.
3. Acceptance: a 4-scene draft timeline fully generated + approved on LongCat/LTX-fast; failures retryable per scene (Plan-1 §1.2 GEN-01 lesson — a failed clip must have Retry, and resume must NOT count failed rows as fulfilled); resume mid-generation works (finisher covers closed tabs); exiting at the interim terminal and resuming from History lands back at stage 3, never a blank surface.

### Phase 6 — Video Studio B: audio + assembly + hero (L — gates 6a/6b; omni deploy #2)
1. (6a) Stage 4 Audio: VO script derived from scenario narration (editable per scene), voice picker (ElevenLabs voices — Whisper's picker pattern), **voiceover-render edge action** (lifted ttsLine+merge+concat, waitUntil — the whisper pattern verbatim, 80MB-style cap). **The polled status row is an `omni_assets` row** (`metadata.kind:'voiceover'`, status pending→done) — the existing 3-4s row-polling pattern, no new table. Music: Lyria2/Stable Audio pick + "quiet ambient bed" prompt guidance (no ducking v1, D-V5).
2. (6b) Stage 5 Assembly: timeline preview (scene order, durations, VO/music alignment readout), **assemble-run edge action**: compose tracks (or merge-videos for uniform straight concat) → merge-audio-video → loudnorm → persist final + thumbnail. Hero re-render: approved scenes only, per-scene hero model submit, swap into timeline (draft keeps `metadata.superseded_by`), re-assemble.
3. **The finalize-run video extension (media_type + SRT path + thumbnail in item metadata) is COMMITTED AND DEPLOYED HERE** so Phase 7's gate never depends on an undeployed omni action (backward-compatible — old clients never send the new fields). Interim terminal: stage 5 ends with "assembled — captions & distribution land in Phase 7".
4. Deploy omni #2 (transport additions + voiceover-render + assemble-run + finalize-run extension + **`transcribe` action** — ElevenLabs Scribe word-level via the server-side key, wizper fallback; Phase 7's captions AND the future Audios plan consume it, and it must be DEPLOYED before Phase 7's gate per the protocol rule). Live-verify: 30–60s 4-scene draft with VO+music assembled headless; hero re-render of one scene swaps correctly; transcribe returns word-level JSON for a test clip.
5. Acceptance: full draft→hero→assembled pipeline green; cost card matches actual fal spend within ~15% (calibration honest); interim-terminal resume clean.

### Phase 7 — Video Studio C: captions, distribution, finalize (+content-library deploy) (L)
1. Stage 6 Captions: transcript via the **`transcribe` edge action deployed in Phase 6's omni #2** (ElevenLabs Scribe word-level; wizper segment-level fallback) → editable caption/SRT editor → **SRT saved as a sidecar object in the omni-video bucket, path-only in metadata (D-V8)**.
2. Stage 7 Distribution: `OMNI_VIDEO_NETWORKS` picker; per-network variant plan (reframe via LTX-2.3/reframe for aspect, trim for length caps) with per-variant cost; execute via video-utility; review grid.
3. Stage 8 Finalize: recap grouped by network (the omni-side finalize-run extension is ALREADY LIVE from Phase 6's deploy); content-library deploy (**`--no-verify-jwt`** — hard requirement) for `media_type`-aware items/posts; Pulse Library renders video items (player + thumbnail) and manual publish routes video posts via pulse-api upload-post (D-V10).
4. Acceptance: finalized video visible + playable in Pulse Library with caption sidecar; publish honesty per network surfaced (the Plan-1 §1.2 FIN-01 lesson: badge networks whose connectors can't publish video — "saved to library only" — instead of a false green success).

### Phase 8 — Clips mode (M)
1. Four screens per §2: Idea (hook-first templates: problem-hook / POV / listicle / before-after + Inspire), Generate (1–2 clips, native-audio hero models — Kling/Seedance; 9:16 default; draft toggle), Captions & Format (auto-captions, per-network trim), Finalize.
2. Built as an opinionated preset OVER Studio machinery (same runner, same finalize) — a thin mode, not a fork.
3. Acceptance: idea → published-ready 30s TikTok clip in under 4 screens; total cost visible up front.

### Phase 9 — Animate mode (L; omni deploy #3 IF the avatar/lipsync chain needs new edge shaping)
1. Source picker (Omni image assets / Files / Wishpedia entry images / Content Library — the repurpose-mode picker pattern).
2. Two paths: **Motion** (prompt + i2v: Seedance i2v default; reference-to-video with up to 9 refs for character consistency — the Wishu engine) and **Talk** (script → ElevenLabs voice → talking character: Kling Avatar v2 / OmniHuman — FETCH THEIR SCHEMAS FIRST (unverified, §1.2); the 3-hop chain script→TTS→lipsync likely needs a dedicated edge action; lipsync tier fork: latentsync default, sync-v3 offered as "hero lipsync" with its $8/min price shown).
3. If new edge shaping is needed, it deploys HERE as omni #3 (per the protocol rule: no acceptance may depend on an undeployed action).
4. Tail reuses Studio stages (formats + finalize).
5. Acceptance: one Wishpedia character animated with motion AND one talking clip with brand voice; fidelity sign-off flagged for Sam (like the images plan's Wishu item).

### Phase 10 — Repurpose & Enhance (M; no new edge actions expected — video-utility from 2b covers it)
1. Source: any finished video (omni runs, Files upload, Content Library).
2. Targets: network presets (reframe/trim per D-V6 snapping) + ops (Topaz upscale w/ target_fps interpolation for YouTube hero; SeedVR budget tier; mmaudio SFX pass for silent drafts; **thumbnail generation via extract-frame** — the card promises it).
3. (10b — STRETCH, may defer to its own mini-plan with Sam's go): long→shorts clipping — Scribe transcript → LLM highlight selection (assembleContext-grounded) → trim-video per highlight → Clips-style caption/format tail.
4. Acceptance: one 16:9 master fanned to 9:16 + 1:1 + 4:5 without cropping; one upscale verified; thumbnails extracted; costs shown per variant.

### Phase 11 — UI perfection pass (M)
Both omni themes, 375/768/1024/1440, WCAG AA, focus/hover/cursor/reduced-motion, loading/empty/error states on every new surface (video players, timelines, scene grids, caption editor); ui-reviewer target A-range 0 critical.

### Phase 12 — QA (mandatory gate) (M)
1. tsc/lint/tests green (extend Plan-1's Vitest: registry sequences for the 5 video modes, preset snapping, per-second pricing math; Playwright smoke: scenario→studio handoff).
2. **security-auditor (MANDATORY)** + code-reviewer + ui-reviewer, adversarial verify on High/Critical. Special attention: video-utility action input shaping (no raw passthrough), finisher secret handling, bucket RLS, SSRF on scenario URL ingestion.
3. Full regression of the IMAGES track (shared files touched: falPricing, falSpecs, HistoryView, finalize-run, presets exports).
4. Live paid E2E: one Clips run, one 60–90s multi-scene Studio run with VO+music+captions, one Animate talk clip, one repurpose fan-out.
5. Acceptance: 0 confirmed Critical/High; images track regression-clean; deploy states verified (omni verify_jwt true; content-library false).

### Phase 13 — Delivery (S)
Merge → push → VPS auto-deploy; CLAUDE.md updated (new lessons: video model enums, compose semantics, finisher pattern, unit calibrations); MEMORY.md cleared; **REQUIRES HUMAN list**: Seedance/lipsync tier choices from live A/Bs, Wishu animate fidelity sign-off, upload-post video publish live test, token rotations. ✅✅✅ TASK COMPLETE block.

---

## 6. Landmines (Plan-1 list applies in full — these are ADDITIONS)

1. Every premium model caps at 8–15s/clip — never promise single-shot long-form; LongCat (720p, NO audio) is the only >60s generator and is draft-tier quality.
2. Per-model video enums are as strict as image ones: Veo duration only 4|6|8s; LTX aspect only 16:9|9:16; Kling v3 has NO resolution param; LTX reframe has NO 21:9. Snap, never format-validate.
3. `compose` is placement-only (no transitions/overlays/volume); `merge-videos` DEFAULTS to min-resolution of inputs — always pass `resolution` + `target_fps`.
4. `wizper` has no word-level timestamps — SRT from ElevenLabs Scribe or built from segment chunks.
5. Unit-priced models (Seedance, Hailuo, Kling-lipsync) — never show $ without the Phase-0 calibration; keep the `calibrate` flag honest.
6. `persistFalMedia` buffers whole files via arrayBuffer — the real ceiling; 200MB cap + assembly-by-URL (never re-download intermediates into the edge) keeps memory sane. Long-form finals: verify size before promising 4k exports.
7. The finisher depends on fal queue-result retention — Phase 0 probe is load-bearing; if retention is short, the finisher sweep interval tightens (*/1) and drafts persist eagerly.
8. `EdgeRuntime.waitUntil` is wall-clock-bounded (~150-400s) — fine for VO/TTS, NOT for waiting on multi-minute video renders; renders always go queue+poll/finisher, never in-request waits.
9. ElevenLabs key lives in `pulse_connections` (provider 'elevenlabs') — shared by Whisper/Pulse; do not create a second key path.
10. Videos-hub History and images History share one component — mode-family filtering must not leak video runs into the images hub (regression test both), AND deletion must be bucket-aware (video assets live in `omni-video`, not `'files'` — `useOmniHistory.ts:102,147` hardcodes the latter).
11. All five new mode values must land in ONE CHECK-widening migration before any client writes them (client inserts are RLS+CHECK-validated directly).
12. **pg_cron/pg_net CANNOT call a verify_jwt=true function** — the gateway 401s before function code runs. Any cron-invoked endpoint must be a verify_jwt=false function with an in-function secret check (content-library precedent). This is WHY the finisher is its own `omni-finisher` function and not an omni action.
13. Exactly one persist per asset: the `'persisting'` CAS claim (D-V7) is load-bearing — client poll and finisher share the persist code and WILL race on multi-minute downloads without it.
14. Cron migrations apply AFTER their target function is deployed and hand-verified — never schedule a job against an endpoint that isn't live.

## 7. Open Questions (defaults chosen — execution proceeds on defaults unless Sam overrides at the gate)

| # | Question | Default |
|---|----------|---------|
| Q1 | Lipsync tier: latentsync (~$0.30/min) vs sync-v3 ($8/min)? | latentsync default; sync-v3 selectable with price shown; A/B at Phase 9 gate |
| Q2 | Captions: SRT sidecar only in v1? | Yes — burn-in is a future plan (VPS ffmpeg); platforms auto-caption from video anyway |
| Q3 | Video publish route v1: pulse-api upload-post (works today) vs building Meta-direct video connectors? | upload-post; Meta-direct deferred with Pulse setup |
| Q4 | Music under VO with no ducking: ship music track v1 or VO-only until burn-in plan? | Ship both tracks; music prompted as quiet ambient; revisit if muddy |
| Q5 | Draft tier default: LongCat (silent, cheapest, >60s) vs LTX-fast (audio, ≤10s clips)? | LongCat for long-form drafts; LTX-fast for short-form drafts |
| Q6 | Hero default: Kling 3 Pro vs Seedance 2.0 (post-calibration)? | Kling 3 Pro until Phase 0 calibrates Seedance's real $/clip — flip if Seedance is materially cheaper at equal quality |

## 8. Phase Summary

| Phase | Title | Size | Deploys | Ships user-visible |
|-------|-------|------|---------|--------------------|
| 0 | Baseline + paid micro-probes | S | – | – |
| 1 | Foundations: DB, registry generalization, presets, pricing, tile order | L | migration #1 | Videos-before-Audios tile order |
| 2 | Video transport + finisher + scenario action (gates 2a/2b) | L | omni #1 + omni-finisher (`--no-verify-jwt`) + migration #2 (cron) | – (headless capability) |
| 3 | Videos hub shell + History filter + bucket-aware deletion | M | – | **Videos track goes live** |
| 4 | Scenario Studio | M | – | Mode 1 |
| 5 | Video Studio A: scenes (gates 5a/5b) | L | – | Mode 2 (draft pipeline, interim terminal) |
| 6 | Video Studio B: audio + assembly + hero + finalize-run extension (6a/6b) | L | omni #2 | Full production pipeline |
| 7 | Video Studio C: captions + distribution + finalize | L | content-library | Library video items |
| 8 | Clips | M | – | Mode 3 |
| 9 | Animate | L | omni #3 (if avatar chain needs it) | Mode 4 |
| 10 | Repurpose & Enhance (10b stretch: long→shorts) | M | – | Mode 5 |
| 11 | UI perfection pass | M | – | Polish |
| 12 | QA (security mandatory) | M | – | – |
| 13 | Delivery | S | – | CLAUDE.md, handoff |
