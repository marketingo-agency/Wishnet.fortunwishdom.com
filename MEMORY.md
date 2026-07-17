# MEMORY - Working Memory

## Current Task
Omni Videos hub rehab (plans/OMNI_VIDEOS_REHAB_PLAN.md): BUILD + QA COMPLETE, the critical fix DEPLOYED + E2E-PROVEN. 5 lower-value edge deploys STAGED (see below). Sam flagged credits mid-run; model on Opus 4.8.

## Plan Status
- Phases 0-6 (all code + QA): DONE, committed + pushed. Security PASS, code review Approve, gates green.
- omni-video: DEPLOYED v7 (verify_jwt TRUE, byte-diff IDENTICAL). Fixes model selection + fal audio + canon + native audio. E2E-PROVEN live (Wishu canon 6 imgs + PixVerse native-audio clip).
- CSP media-src fix: LIVE-verified on prod (fixes "videos don't play").

## Staged edge deploys (NOT deployed - recommend cheap Supabase CLI with a token)
- omni v33 (fal-catalog video caps - browse-all works degraded without it; curated engines fine)
- whisper-api v21 (fal TTS - pre-existing 503 w/o key, not a regression)
- omni-podcast v6 / omni-finisher v6 / pulse-api v21 (ElevenLabs cleanup - BEHAVIOR-NEUTRAL today, no key exists)
- verify_jwt: omni/omni-podcast TRUE (no flag); omni-finisher/pulse-api/whisper-api --no-verify-jwt.

## Current State
User's 4 reported video-hub problems are FIXED + PROVEN on production (playback, model selection, fal-only audio, canon Wishu). MCP deploys are very token-heavy (hand-inline full bundle); Sam authorized MCP but flagged credits, so the 5 remaining (low-value/inert) deploys were deliberately staged for the cheaper CLI path.

## Next Steps When Resuming
1. If Sam provides a Supabase token: `supabase functions deploy <name> --project-ref zlmideilxfnokemzkavm` for the 5 staged functions (flags above). Else MCP deploy_edge_function per function, byte-diffed.
2. Optional follow-ups: rotate the fal key; a Playwright pass over the wizards; the 10b long->shorts mini-plan.
