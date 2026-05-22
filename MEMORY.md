# MEMORY — Working Memory

No active task. Ready for next assignment.

## Recently shipped (2026-05-22, branch `fix/audit-remediation`, NOT pushed/merged)
- **Pulse** — Social Media Command Center (commits 210f8ea + e3aa529, pulse-api v9, security PASS).
- **Whisper** — AI Podcast Generator (commit fcdf287, whisper-api v7, security PASS). Full record in CLAUDE.md.

**Sam's pending live-verification (not blocking — needs runtime credentials):**
- Both: set the **ElevenLabs key** in Settings (shared by Pulse voiceover + all Whisper audio); an **OpenAI key** in llm_settings powers script/show-notes/cover (likely already set).
- Whisper: ElevenLabs `eleven_v3` access is account-dependent — falls back to `eleven_multilingual_v2`.
- Pulse: connect an upload-post profile (publish), Meta app + OAuth (engagement), Canva.
- Run `npm run build` once the dev server is down. Both branches not yet merged/pushed.
