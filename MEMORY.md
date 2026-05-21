# MEMORY — Working Memory

No active task. Ready for next assignment.

## Recently shipped (2026-05-21, all deployed/verified)
- Multimodal Brain RAG + true image-to-image recreation (Osha + Pixel): see/recreate/combine Brain images, selected image model, no copyright refusal.
- Security fixes: match_knowledge restricted_agents enforcement (migration), process-ocr CORS allowlist, Brain sanitizeForPrompt, save-to-brain dest validation.
- Wishpedia full UI refactor → card-framed pattern (index, card, detail/view, entry edit mode de-cosmiced). ui-reviewer B+; critical (lightbox focus rings) + contrast/skeleton fixed. tsc/lint/build clean.

## DONE this round (deployed): LOW security — generated-image TTL 7d→24h (osha), per-image 5MB byte caps on source-image fetches (osha+pixel), process-ocr rate limiter (10/min). UI polish — CharacterView dropped max-w-6xl + aligned hero aspect to edit mode; EntryCard count badge bg-black/50→bg-foreground/70. tsc/lint clean, edge fns deployed.

## Only open follow-up
1. **REVOKE the temp Supabase token** — https://supabase.com/dashboard/account/tokens.
- Lightbox keeps bg-black/95 (intentional for a fullscreen image viewer). Dev server: localhost:8000.
