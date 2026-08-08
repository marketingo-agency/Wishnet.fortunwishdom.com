# PARKED — Content Desk vision-captions plan (preserved 2026-08-08)

> This plan was PROPOSED and awaiting Sam's go when the One-Screen Preview task cut in line.
> Preserved verbatim from MEMORY.md so nothing is lost. Resume by re-reading this file.

## Task
Enable the client's workflow: upload ChatGPT-made images from iPhone into the Omni Content Desk, get vision+RAG-grounded captions, schedule, approve, publish via Metricool.

## Plan Status (as parked)
PROPOSED — AWAITING SAM'S GO. No code written.

- [ ] Phase 1 — Vision-grounded captions (analyze-media action, migration, rewire generate-captions, deploy)
- [ ] Phase 2 — One-tap mobile flow (HEIC, copy, 375px, "what Omni sees")
- [ ] Phase 3 — Governance: contributor submits / admin approves
- [ ] Phase 4 — fal rework bridge (Desk -> Omni -> Desk)
- [ ] Phase 5 — Metricool activation (BLOCKED: client has not purchased Advanced plan)
- [ ] Phase 6 — QA (mandatory security-auditor + code-reviewer + real-device pass)

## Key Decisions (as parked)
- MCP-into-ChatGPT idea DROPPED. Reason: an LLM cannot emit image bytes as tool args, and ChatGPT image URLs are session-scoped. Replaced with direct iPhone upload into the Desk.
- Metricool is NOT a blocker for Phases 1-4. Isolated into Phase 5.
- Caption vision port must NOT use omni's `signStoragePath` — it is hardcoded to the `files` bucket AND refuses paths outside `${ownerId}/`. Desk media is in the `omni-content` bucket at `${uploaderUid}/${postId}/${file}`, and the Desk is admin-SHARED. Use the Desk's own `signMedia` helper.
- Provider/model for vision resolves from global `llm_settings`, NOT per-user `omni_settings` (the Desk is shared, not per-user).
- Vision descriptions get CACHED on the media row (new columns) so caption regeneration never re-bills the vision call.

## State at parking time
Investigation complete, nothing built. Verified live: `omni_content_connections` = 0 rows, `omni_content_posts` = 0 rows — the Desk has never been used and Metricool has never been connected. `generate-captions` is text-only today (media_summary is just a count string like "2 images"); it also hard-rejects when title and notes are both empty. `analyzeImage` already exists in `supabase/functions/omni/analysis.ts` returning `{description, universe_relation, suggestions, retrieval}` — it is a port, not a build. `omni_content_media` has no metadata column, so caching needs a migration.

## Next steps when resumed
1. Get Sam's go on the phase plan (or his scope edits).
2. Start Phase 1 Step 1: the `omni_content_media` migration adding `vision_description` + `vision_analyzed_at`.
3. Confirm omni-content's `verify_jwt` in supabase/config.toml BEFORE any deploy (it is TRUE — never pass --no-verify-jwt).
