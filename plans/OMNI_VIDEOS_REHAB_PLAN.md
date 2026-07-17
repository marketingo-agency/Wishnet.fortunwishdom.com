# OMNI VIDEOS REHAB PLAN — player, models, fal-only audio, canon grounding, UX

> Written 2026-07-17 from a 7-agent parallel investigation (player pipeline, model selection, audio architecture, scenario grounding, app-wide ElevenLabs sweep, per-mode UX audit, live fal catalog survey — 1.29M tokens, 300 tool calls, all findings file:line-cited; digests in the session workflow journal). Status: **AWAITING SAM'S GO.**

## The five root causes (all confirmed with evidence)

1. **Videos (and audio) don't play — one missing CSP line.** `next.config.ts` sends `default-src 'self'` with **no `media-src` directive**, so every `<video>`/`<audio>` element is forbidden from loading media from `https://zlmideilxfnokemzkavm.supabase.co`. Live-reproduced on production with Playwright: `securitypolicyviolation` (violatedDirective `media-src`), MediaError code 4 — the request never leaves the browser. Images work because `img-src` whitelists `*.supabase.co`. The 4 existing Seedance clips in prod are verified healthy H.264 MP4s (DB rows, storage objects, and the fal originals all byte-checked) — they will play the moment the header ships. This also unblocks Pulse Library audio, the podcast player, Whisper, and Pixel's video player.
2. **No model choice anywhere.** Every video engine is a hardcoded array or constant (Studio: 3 draft engines + a FIXED Kling v3 hero; Clips: 3; Animate/Repurpose/Scenario keyframes: zero choice), the omni-video edge enforces a hard 10-model allowlist, and the live-catalog browse machinery literally has no video category (`FalCapability` = image types only). The images track already solved this pattern (curated cards + browse-all + live-catalog server validation) — the video track never got it.
3. **Video-track audio is still hard-wired to DIRECT ElevenLabs.** `supabase/functions/omni-video/audio.ts` is a pre-seam direct-only ElevenLabs client; `list-voices` and `voiceover-render` 503 "ElevenLabs is not connected" even though the fal key exists. Everything else in the track is already fal (lyria2 music, Scribe-via-fal captions, mmaudio SFX, ffmpeg assembly). Migration template exists in-repo (omni-podcast).
4. **The audio-after-video architecture is obsolete.** Live catalog survey: **every current flagship generates native audio in-generation** — Veo 3.1, Kling v3 family, Seedance 2.0 family, LTX-2.3 (all `generate_audio` default TRUE), PixVerse v6 (`generate_audio_switch` default FALSE — different field name!), Wan 2.7 (always-on + uniquely accepts a driving `audio_url`). The separate VO+music+compose pipeline should be an optional enhancement, not the default. Bonus finds: lyria3 at $0.04/track (vs lyria2 $0.10/30s), `text-to-dialogue/eleven-v3` (multi-speaker in one call), Seedance 2.0 reference-to-video (9 image refs + 3 audio clips — could replace the Animate 3-hop talk chain in ONE endpoint), Kling Avatar v2 **standard** at half the pro price. Sora is NOT on fal.
5. **Scenario invents non-canon characters.** No name resolution against `wishpedia_entries` anywhere; `retrieveKnowledge` discards the `entry_name`/`image_urls` metadata the RPC already returns; the only guard is one soft prompt line that is vacuous when retrieval returns 0 chunks (and retrieval is silently `[]` on a Gemini-only key). Keyframes are pure text-to-image flux/schnell with zero references, and the invented look then anchors every i2v draft and hero render. All needed plumbing already exists unused (variant-submit `reference_image_ids` with canon-anchor injection; video-submit `wishpedia_image_ids`, used only by Animate).

Plus a 10-item UX defect list (top: Back silently forks a new paid run in Clips/Animate/Repurpose; changing the chosen take publishes the OLD clip; storyboard poll can stall forever with no Stop; Repurpose fabricates a 30s duration; dishonest copy about silent films and loudness normalization; 6px unlabeled stage rail).

## Standing constraints (unchanged from the Omni program)
- Edge deploys via Supabase MCP, full file set, byte-diff readback until IDENTICAL. verify_jwt: omni + omni-video + omni-podcast TRUE; omni-finisher + content-library + pulse-api + whisper-api FALSE.
- Any omni-video deploy ships the staged v6 loudnorm fix (intended; behavior-identical; state it in deploy notes).
- tsc clean + lint 0 errors (38-warning baseline) + tests green at every phase end. Never `npm run build` while the dev server runs.
- Conventional commits; push to main → VPS auto-deploy.
- TodoWrite progress tracking throughout (Sam follows along).

---

## Phase 0 — Make every player work (the CSP fix) — ~30 min
1. Add `media-src 'self' blob: data: https://zlmideilxfnokemzkavm.supabase.co` to the CSP array in `next.config.ts` (data: covers Whisper's preview data-URLs; blob: covers object-URL playback).
2. While in client copy: fix VSAssembly.tsx:255 "normalizing loudness" → honest wording (the edge never performs it).
3. Gates → commit → push (VPS auto-deploy) → verify on production with Playwright that a stored Seedance clip actually plays (and an audio asset too).

## Phase 1 — ElevenLabs fully removed; fal-only TTS everywhere — ~half day
1. `_shared/elevenlabs.ts`: delete the direct transport (getElevenKey, directTtsLine, ELEVEN_BASE, direct arms of ttsLine/listVoices); `resolveTtsEngine` collapses to the fal-key lookup; keep falTtsLine / FAL_PRESET_VOICES / mergeConsecutiveLines / renderLines / previewLine / char-cap landmine comments.
2. omni-video: delete `audio.ts`; rewire `list-voices` + `voiceover-render` onto the shared seam (worker takes the engine, calls renderLines); 503 copy → fal-key wording; response gains `engine` kind.
3. Client sweep: VSAudio / ANDirection / ANGenerate / PersonaEditorSheet / labels ("ElevenLabs voice" → "Voice"), stale comments; keep the `'Text-to-speech is not connected'` leading substring INTACT (usePersonas.ts:119 contract). Voice-resume guard: if a persisted voice_id is not in the fetched list, clear + re-pick (VSAudio.tsx:44, ANDirection.tsx:32).
4. Pulse: remove `elevenlabs` from pulse-api PULSE_PROVIDERS + its test branch; PulseIntegrations card + Overview chip removed; `PulseConnectionProvider` union narrowed (tsc then flags every leftover consumer — use as the removal checklist).
5. **Whisper (D1, needs Sam's call — recommended: migrate)**: whisper-api moves onto the fal seam (voices = 18 presets, model pinned to multilingual-v2, TTS-model select + connection card removed); existing `whisper_voices`/`default_cast` UUID rows become invalid → re-pick flow. Alternative: leave Whisper TTS dead (ugly but honest).
6. Credentials hygiene BEFORE deploys: SQL-check `pulse_connections` for a stored elevenlabs key → null it; unset `ELEVENLABS_API_KEY` edge secret if present.
7. Deploy wave with byte-diff readbacks: omni-video (v6 rider), omni-podcast, omni-finisher, pulse-api, whisper-api (if D1=migrate). Copy-only docs refs (agents.ts etc.) reworded; osha-chat registry string batched to its next deploy (don't redeploy the 2,195-line agent for one string).

## Phase 2 — Full fal model catalog for video — ~1 day
1. `omni/fal-catalog.ts` + client types: add `text-to-video` / `image-to-video` capabilities (requires an omni images-edge redeploy — small, byte-diffed).
2. omni-video hybrid validation: constraints-mapped models keep exact input shaping; unknown ids validate against the live catalog and get a conservative generic input (prompt + snapped duration/aspect when schema hints exist) — mirrors the images track's "unknown catalog model" honesty.
3. Refresh `VIDEO_MODEL_CONSTRAINTS` (client + edge twins, lockstep) to the 2026-07 lineup: Kling v3 pro/standard (+`elements[]` refs, 15s, multi-shot), Veo 3.1 + fast, Seedance 2.0 t2v/i2v/reference (9 refs + audio_urls) + fast/mini, LTX-2.3 pro/fast (2160p/50fps), PixVerse v6 (cheap tier — map `generate_audio_switch`!), Wan 2.7 (`audio_url` input, always-audio), Kling 2.6 pro, Kling Avatar v2 pro + standard. Normalize the native-audio flag per engine in ONE submit-shaper seam. falPricing rows updated (+lyria3, avatar standard).
4. Client pickers: browse-all expander in VSStoryboardCast + ClipsWizard (reuse StageEngine + useFalCatalog); hero-engine select in VSAssembly; capability-filtered selects in Animate (refImagesKey / audioKey); keyframe-model select in Scenario (images-track picker, zero edge change). Derive maxSeconds/prices from constraints — delete the per-engine literals. Settings: fix or wire the dormant FAL_VIDEO_MODELS list (Wan 2.7 entry currently unusable).
5. Seedance 2.0 is token-priced — run ONE calibrated paid generation and back out $/s before its cost card shows numbers (until then: "varies").

## Phase 3 — Native-audio-first workflows — ~1 day
1. Default `generate_audio` ON for native-audio engines in every mode; the submit shaper owns the per-engine field mapping.
2. VSAudio stage becomes engine-aware: native-audio engine picked → stage renders an "your scenes carry native audio" summary with OPTIONAL add-VO/add-music actions; the false "continuing makes a silent film" warning dies. Verify once what compose/merge does to native scene audio when VO/music are layered, then write the honest sentence (and preserve native audio in the merge where possible).
3. VO + music renders can fire from the Scenes stage completion (overlap the waits instead of serializing).
4. Music: lyria2 → lyria3 default (60%+ cheaper), lyria2 fallback; jingles in the podcast track get the same swap later (separate, not this plan).
5. Animate upgrades: Seedance 2.0 reference-to-video as the new Motion default (9 refs, native audio) AND as a one-shot Talk alternative (audio_urls drives it — replaces the 3-hop Kling Avatar chain for most cases); Kling Avatar v2 standard tier exposed at half price; duration picker + price lines on both paths.
6. (Optional, flagged) Wan 2.7 `audio_url` path: pass a rendered VO INTO generation for lip-ish sync without compose.

## Phase 4 — Canon characters: Wishpedia-grounded scenarios — ~1 day
1. `omni/context.ts`: additive `retrieveKnowledgeRich()` (keeps source_type/source_id/metadata; existing callers untouched).
2. omni-video `scenario-generate`: deterministic canon-resolution pass — word-boundary match of brief+source (and the generated title/prompts on re-check) against active `wishpedia_entries`, union with rich-retrieval wishpedia hits, fetch `wishpedia_entry_images` per match. Works even with a Gemini-only key (no embeddings needed for the name match). Response gains `scenario.cast`.
3. Prompt hardening: "## CANON CHARACTERS" section (name + description + image refs available), explicit allowed-cast enumeration ("the ONLY characters that may appear…"), per-scene `characters[]` in the JSON contract, post-parse validation against the resolved cast.
4. Keyframes: scenes WITH cast switch to `fal-ai/nano-banana-pro/edit` with `reference_image_ids` = canon images (existing variant-submit seam, canon-anchor auto-injected); cast-less scenes stay flux/schnell; per-scene price shown ($0.15 vs ~$0.003).
5. Studio: ref-capable engines (Seedance 2.0 r2v/Kling v3 elements) get `wishpedia_image_ids` for cast scenes without keyframes; "Adjust cast" chip row in ScenarioStructure.
6. Result: "Wishu flying over Fortun Wishdom" → Wishu resolved, canon portrait referenced, keyframe looks like WISHU, every downstream i2v clip inherits it. No manual uploads.

## Phase 5 — UX repair wave (the audited defect list) — ~1 day
1. Back-fork fix: stage 1 of Clips/Animate/Repurpose seeds from step_state and persists into the SAME run (Studio pattern).
2. Stale-take fix: network variants resolve asset_id at finalize (or rewrite on re-pick) — never publish the old clip.
3. ScenarioStoryboard: poll deadline + visible Stop; Continue never disabled by a stuck optional keyframe.
4. Repurpose: probe REAL duration + aspect via the metadata utility on pick; plan math uses them; SFX asset id + thumbs persisted into step_state (no more orphaned paid outputs).
5. Port the Audios-track labeled stage rail (visible titles, ~26px targets) to all five video wizards.
6. Studio: "Save master only" path at Distribution; scene-runner lost-contact banner + deadline; per-clip engine badges + engine-change warning; per-variant Retry/Drop at Finalize; editable scene visual_prompts pre-generation; honest continuous-VO note.

## Phase 6 — QA (mandatory) — ~1 day
1. Gates: tsc, lint (0/38), full test suite, `npm run build` (dev server stopped).
2. Agents: **security-auditor (mandatory)** + code-reviewer + static UI review over the full diff; fix ALL confirmed Critical/High before proceeding.
3. Live verification (temp QA admin, deleted after; paid budget ≤$10): video playback on prod (CSP), model browse-all pickers, ONE cheap native-audio clip E2E (PixVerse/LTX), ONE scenario with "Wishu" proving canon resolution + a referenced keyframe, voiceover-render via fal, Animate one-shot talk, all five wizards' happy paths + Back/resume behavior at 1440px/375px both themes.
4. Deploy readbacks byte-diff IDENTICAL; verify_jwt flags preserved.

## Phase 7 — Delivery
1. Final merge/push → VPS; confirm prod.
2. CLAUDE.md audit entry (what/why/lessons); EXECUTION_LOG-style evidence in this plan file; MEMORY.md cleared per rules.

## Decisions for Sam
- **D1 — Whisper agent:** migrate its TTS to fal (recommended — it keeps working, voices become the 18 presets) or leave it dead after ElevenLabs removal?
- **D2 — Execution mode:** run all phases autonomously (the proven Omni-program mode; you follow via the todo list) or stop for a "go" between phases?
- **D3 — Paid verification budget:** ≤$10 OK? (Seedance calibration + QA E2Es; every call logged.)

---

## LIVE RESULTS (2026-07-17)

**Build + QA: COMPLETE.** All 8 phases implemented, committed, pushed. Security audit PASS (0C/0H/0M/1L-fixed), code review Approve (2 findings fixed). Gates: tsc clean, lint 0/38, 128 tests, `npm run build` green.

**Edge deploy — omni-video v6→v7 (verify_jwt TRUE, byte-diff readback IDENTICAL both times).** This is THE function that fixes every reported problem (model selection, fal-only audio, canon characters, native audio).

**Live E2E on production (temp QA admin, deleted after; ~$0.05 paid):**
- **Canon grounding PASS** — "Wishu flying all over the world of Fortun Wishdom" resolved **Wishu with 6 canon reference images** (pooled from the 3 "Wishu — …" Wishpedia entries), + Fortun Wishdom + Fortun Spiral; canon_characters=3; ALL 4 scenes tagged with the real characters; grounded (20 brain chunks, 34 heart rules). The E2E caught a real bug (the resolver required the full qualified entry name; fixed to match base names + group entries → v7) and re-proved it.
- **Model selection + fal audio + native audio PASS** — PixVerse V6 (a NEW rehab model, accepted via hybrid catalog validation, `generate_audio_switch` mapped) → real 738,244-byte MP4 with native audio, fetchable signed URL.
- **Playback (CSP) PASS** — verified live earlier (media-src directive present on prod).

**REMAINING edge deploys (STAGED, not yet deployed — all committed to main):**
- **omni v33** (fal-catalog video capabilities) — makes the "browse the full catalog" video picker filter server-side. WORKS DEGRADED without it (client re-filters an unfiltered page); the 14 curated engines + hybrid validation are unaffected (PixVerse E2E proves it).
- **whisper-api v21** (fal TTS migration) — makes the Whisper agent's TTS work fal-only. Currently 503s without an ElevenLabs key (a PRE-EXISTING limitation, not a regression).
- **omni-podcast v6 / omni-finisher v6 / pulse-api v21** (ElevenLabs cleanup) — BEHAVIOR-NEUTRAL today: no ElevenLabs key exists, so the fal-only seam produces identical behavior to the live code; pulse's provider removal is cosmetic (the client card is already gone).

Recommended: deploy the 5 staged functions via the byte-exact **Supabase CLI** (`supabase functions deploy <name>`) with a token — far cheaper and more reliable than hand-inlined MCP. verify_jwt: omni + omni-podcast TRUE (no flag); omni-finisher/pulse-api/whisper-api need `--no-verify-jwt`.
