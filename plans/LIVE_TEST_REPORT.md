# LIVE TEST REPORT — Omni three-plan program, Part Two

> Live verification on production (https://wishnet.fortunwishdom.com + Supabase project zlmideilxfnokemzkavm) after Part One delivery. Run 2026-07-17 with an authorized temp QA admin (`claude.qa.wishnet@gmail.com`, deleted at the end). Every paid call logged. Budget: **~$0.55 spent of the $15 Part Two cap** (2 LLM calls, 2 lyria2 jingles — one downstream-failed on fal's side, 1 flux cover, 1 fal metadata probe, 1 ffmpeg compose, 1 trim).

## Access setup (previously the Part One blocker — now cleared)
- The classifier that blocked the QA-user confirm + password-grant login in Part One **no longer blocks it.** Confirmed `claude.qa.wishnet@gmail.com`, set a temp password, granted admin (user_roles + is_admin() → true), and the password-grant login returned a valid session (951-char JWT). This unblocked the entire live pass.

## A — Auth & honesty (PASS)
- `podcast-voices` with no ElevenLabs key → **HTTP 503, honest message** "ElevenLabs is not connected. Add the key in Pulse Settings." (the designed not-connected path, verified end-to-end rather than just by code).
- `feed-regenerate` as admin without `show_id` → 400 (admin gate passed, input validation fired). Non-admin path stays 403 (gate is `is_admin` RPC).
- `omni get-settings` → 200 (images track healthy on the same session).

## B — Podcast pipeline (PASS, paid)
- **Outline** (`podcast-script` mode outline, paid LLM): returned "Wishing Awake: The Essence of Wishu in Fortun", 3 chapters, **grounded** — `retrieval: {brain_chunks: 20, heart_rules: 34}` (Heart + Brain RAG both fired).
- **Chapter script** (last chapter, paid LLM): 5 segments; **the AI disclosure is the verbatim final line** ("This episode was produced with AI generated voices."); single-host fallback correct; **em-dash-free** (the stripDashes backstop holds on live output).
- **Jingle** (lyria2, paid): first attempt hit fal's own `downstream_service_unavailable` at result time — the poll surfaced it as `failed` honestly (no silent hang, exactly the failure path the QA timeouts protect). Retry succeeded: **6,291,544-byte WAV persisted to omni-audio**, signed URL fetched (RIFF magic bytes confirmed).
- **Cover** (flux/schnell, paid, synchronous): persisted to omni-audio as `.jpg`, signed URL returned.
- **Publish → Feed → Range E2E** (a real episode built from the jingle audio):
  - `publish-episode` copied the audio+cover into `podcast-public`, minted GUID `c9b9ec4d-…`, **probed the REAL duration (33s, not the 10s estimate — `duration_probed: true`)**, and regenerated the feed.
  - **Enclosure HEAD**: 200, `Accept-Ranges: bytes`, `Content-Length: 6291544`. **Ranged GET** `bytes=100-199` → **206 Partial Content**, `Content-Range: bytes 100-199/6291544` — the Apple hard requirement is satisfied on the live bucket path (no VPS fallback needed).
  - **Feed XML** (anonymous fetch, `application/rss+xml`): parses well-formed; ALL 14 PSP-1 assertions PASS — atom:link self, title/description/link/language, itunes:category/explicit/image/owner, podcast:guid, per-item enclosure(url+length+type)/guid(isPermaLink=false)/pubDate/itunes:duration(=33); the injection-probe title `QA Test Episode <live> & "range" check` **round-trips correctly escaped**; the AI disclosure appears in BOTH the channel and item descriptions; no raw `<script` or forged tags.
  - **Re-publish**: GUID stayed `c9b9ec4d-…` (immutability proven). **Unpublish**: feed dropped to 0 items (verified with a cache-buster; the stale read was a CDN MISS, not a regen bug), the episode row went `draft`, and **the GUID was retained on the row** (re-publish would reuse it — no duplicate-episode risk).

## C — Podcast to Video utilities (PASS, paid)
- **Audiogram** (`video-utility` compose: cover + the real episode audio): produced a **579,735-byte MP4** (valid `ftyp` container), persisted to omni-video, polled done via video-poll.
- **Highlight clip** (`video-utility` trim-video, 5s–10s of the audiogram): produced an **82,382-byte MP4**, persisted and polled done.
- Both rode the Plan-2 omni-video surface unchanged — the Audios track reuses it exactly as designed.

## D — Browser pass (PASS, production, Playwright)
- Login form → dashboard (cookie SSR auth works with the temp admin).
- **Audios hub** live at `?track=audios`: all six cards render and are clickable (Podcast Scenario, Podcast Studio, Cast & Personas, Podcast to Video, Publish & Feed, History).
- **Cast & Personas**: reads the QA show; the persona editor shows the honest amber "ElevenLabs is not connected" note, the impersonation-policy note, and Create-disabled-until-named. The only console error on the whole track is the expected omni-podcast 503 (no key).
- **Publish & Feed** (admin): renders the QA show's feed URL, the castfeedvalidator link, the episode list (showing the draft after the unpublish test), the metadata editor with the default-ON disclosure, and the directory checklist (6 links).
- **Podcast Scenario** wizard stage 1: 4-stage rail with future stages correctly disabled, show picker, Generate-disabled-until-valid.
- **Light theme** (the QA-fixed contrast case): the "Audios" gradient heading and all card text render dark and readable against white — the W1 fix holds visually.
- **375px**: single-column reflow, no horizontal overflow, text wraps, headings/icons intact.

## Cleanup (done)
Deleted the full QA footprint: 1 episode, 1 run (+4 assets cascade), 1 show, 7 storage objects (2 omni-audio, 2 omni-video, 3 podcast-public — via the Storage API since storage.objects is SQL-DELETE-protected), the user_roles + profile rows, and the temp auth user. Verified 0 rows / 0 objects / 0 user remain. Local screenshots + the session-token file removed from the working tree.

## Verdict
**The Audios track is production-verified end-to-end** — grounded script generation, paid audio/image generation with honest failure handling, the full publish→RSS→byte-range chain (Apple-compliant, injection-safe, GUID-immutable), the video repurposing utilities, and the UI across themes and breakpoints. The one live hiccup (a fal downstream failure on the first jingle) was surfaced honestly by the poll path and recovered on retry — exactly the resilience the QA fixes target.

## Still REQUIRES HUMAN (not blockers to the code — external accounts/keys)
- The **full in-app TTS render** (script → per-chapter ElevenLabs audio → assembly) was NOT exercised live because **no ElevenLabs key is configured** — every TTS surface 503s honestly. Add a key in Pulse Settings (+ confirm paid plan / commercial license / eleven_v3 availability) to run a real multi-chapter episode render through Podcast Studio.
- A real Studio run's chunked render + the finisher's tab-closed takeover (the QA-hardened race) is only fully exercisable once the key exists — the plumbing, staleness bails, and the atomic assembly claim are code-verified and boot-smoked, but a live multi-minute render is the last mile.
- Directory submissions (Spotify/Apple/Amazon/YouTube-ingest/iHeart/Pocket Casts) remain human account actions.
- Standing Plan 1/2 items (Wishu fidelity sign-offs, broader paid image/video spot-checks) unchanged.
