# MEMORY - Working Memory

No active task. Ready for next assignment.

## Pending human actions
- **Live visual pass of the sidebar + dashboard** after the Marketing Hub / Fortun Wishdom / Taskforce removal (auth-gated, headless login blocked). Everything is verified green by code + HTTP checks; this is eyes-on confirmation only.
- Metricool: Advanced plan + API token -> Omni > Content > Connections -> pick brand; then the live E2E (stage image+video post -> approve -> verify in Metricool -> publish + status sync).
- ROTATE the fal key (transited earlier transcripts). NOTE: the Supabase CLI is now authenticated via `npx supabase login`, so no access token was pasted into chat this round and there is none to rotate.
- Optional cleanup, flagged by both reviewers: `wishnetrium` + `wishnetrium_can_access_{wishfeed,wishper,wishprint}` are now the ONLY dead permission columns left (no ToolKey, no route, no reader). Same migration pattern as 20260722120000 retires them.

## Reference
Latest round 2026-07-22 (CLAUDE.md audit history): Marketing Hub, Fortun Wishdom and Taskforce erased end-to-end - 9 pages, 3 tool keys, 13 DB columns, 6 redirects to /dashboard. Commit c8596f0 pushed to main (VPS auto-deployed); migration 20260722120000 applied; osha-chat v138 -> v139 (verify_jwt false preserved, 7/7 byte-diff IDENTICAL).
