# WISHNET — Project State

> Generated 2026-04-16. Single-source engineering reference for the Fortun Wishnet repo. Every claim below is traceable to a file path. Zero invention. No secret values.

## 1. Executive Summary

Fortun Wishnet is an **internal admin/operations platform** for the Fortun team, built on **Next.js 16 App Router** with a **Supabase** backend. It hosts file management, a RAG-powered knowledge base (Brain), a rules engine (Heart), a content encyclopedia (Wishpedia), a product inventory system (Wishdom), and multiple AI agents (Osha, Pixel, Promptor, Nexus, plus route stubs for Echo, Pulse). The app ships with:

- **32 routes** under `src/app/` across `(protected)` and `(public)` route groups
- **14 Supabase Edge Functions** providing all backend logic (no `src/app/api/`)
- **34 Postgres tables** with RLS enforced on every table, **54 migrations**
- **pgvector 1536-dim hybrid RAG** (vector + BM25) for Brain + Heart retrieval
- **OpenAI + Google Gemini + fal.ai** as three LLM/media providers, selected per-agent
- **upload-post.com (Pulse)** social media scheduling API integration
- **Sentry** error tracking, **Vercel Analytics** + Speed Insights, **security-hardened headers**

**Stage:** Post-batch-11 development. 11 Asana tasks completed across UI fixes, new features, and API integrations. TypeScript strict mode enabled, WCAG AA color contrast enforced, server-side auth guard in place.

---

## 2. Tech Stack and Tooling

| Layer | Technology | Version | Source |
|---|---|---|---|
| Framework | Next.js (App Router) | ^16.2.3 | package.json |
| UI runtime | React / React DOM | ^19.2.5 | package.json |
| Language | TypeScript (strict) | ^5.8.3 | package.json, tsconfig.json |
| Styling | Tailwind CSS | ^3.4.17 | package.json |
| Tailwind plugins | tailwindcss-animate, @tailwindcss/typography | ^1.0.7, ^0.5.16 | package.json |
| Component library | shadcn/ui on Radix primitives | ~48 UI files | src/components/ui/ |
| Server state | TanStack Query | ^5.83.0 | package.json |
| Forms | react-hook-form + @hookform/resolvers + zod | ^7.61.1 / ^3.10.0 / ^3.25.76 | package.json |
| Icons | lucide-react | ^0.462.0 | package.json |
| Toasts | sonner | ^1.7.4 | package.json |
| Theming | next-themes | ^0.3.0 | package.json |
| Drag & drop | @dnd-kit/core, @dnd-kit/sortable | ^6.3.1 / ^10.0.0 | package.json |
| PDF rendering | pdfjs-dist (server-external) | ^4.9.155 | package.json |
| Markdown | react-markdown + remark-gfm | ^10.1.0 / ^4.0.1 | package.json |
| Supabase client | @supabase/supabase-js + @supabase/ssr | ^2.91.0 / ^0.10.2 | package.json |
| Error tracking | @sentry/nextjs | ^10.48.0 | package.json |
| Analytics | @vercel/analytics, @vercel/speed-insights | ^2.0.1 / ^2.0.0 | package.json |
| Testing | Playwright | ^1.57.0 | package.json |

**Package manager:** npm. **Build tool:** Turbopack. **Deployment target:** Vercel.

---

## 3. Repository Structure

```
Fortun Wishnet/
├── .claude/                       # Project-scoped Claude rules + skills
│   ├── rules/                     # code-rules.md, git-rules.md, ui-rules.md
│   └── settings.json
├── public/                        # Static assets (favicon, pdf.worker)
├── src/
│   ├── app/                       # Next.js App Router pages (32 routes)
│   │   ├── (protected)/           # Auth-gated routes (28 pages)
│   │   ├── (public)/              # Login / reset-password (2 pages)
│   │   ├── sentry-example-page/   # Sentry smoke test
│   │   ├── layout.tsx             # Root layout: fonts + Providers
│   │   ├── globals.css            # Tailwind + Fortun design tokens + Pixel theme scoping
│   │   └── not-found.tsx
│   ├── components/                # 165 component files across 16 domains
│   │   ├── ui/                    # shadcn primitives (~48 files)
│   │   ├── agents/, brain/, brand/, files/, heart/, layout/
│   │   ├── navigation/, nexus/, osha/, pixel/, profile/, promptor/
│   │   ├── release-notes/, settings/, wishpedia/
│   │   └── ErrorBoundary.tsx, NavLink.tsx, ProtectedRoute.tsx
│   ├── config/                    # api.ts, llmModels.ts, permissions.ts
│   ├── contexts/                  # AuthContext.tsx
│   ├── hooks/                     # 66 hook files across 4 subdirs (files/, osha/, pixel/, promptor/)
│   ├── integrations/supabase/     # client.ts, types.ts
│   ├── lib/                       # 8 utility modules
│   ├── routes/                    # routeConfig.ts
│   ├── screens/                   # 21 screen components
│   └── types/                     # 8 type definition files
├── supabase/
│   ├── functions/                 # 14 Edge Functions
│   │   ├── _shared/               # cors.ts, rate-limit.ts, token-budgets.ts
│   │   ├── ai-chat/, manage-users/, osha-chat/, pixel-chat/
│   │   ├── process-embeddings/, process-ocr/, promptor/
│   │   ├── pulse-api/, search-knowledge/, serve-file/
│   │   ├── settings-keys/, storage-stats/
│   │   ├── update-bucket-settings/, wishpedia-generate/
│   │   └── import_map.json
│   └── migrations/                # 54 SQL migration files
├── middleware.ts                   # Supabase SSR auth + route protection
├── CLAUDE.md                      # Permanent project memory
├── MEMORY.md                      # Working memory (ephemeral)
└── WISHNET_PROJECT_STATE.md       # This file
```

---

## 4. Architecture

### Auth Flow
Cookie-based SSR via `@supabase/ssr`. Middleware at repo root (`middleware.ts`) + server-side guard in `src/app/(protected)/layout.tsx`. Client context: `src/contexts/AuthContext.tsx`.

### Client Creation
- **Browser:** `src/integrations/supabase/client.ts` — `createBrowserClient` from `@supabase/ssr`
- **Server:** `src/lib/supabase/server.ts` + `src/lib/supabase/middleware.ts`

### API Pattern
No `src/app/api/` routes. All backend logic runs in **14 Supabase Edge Functions** under `supabase/functions/`. Client communicates via `fetch()` to Edge Function URLs defined in `src/config/api.ts`.

### State Management
- **Server state:** TanStack Query (queryClient in every hook)
- **Client state:** React useState/useCallback in screen components
- **Auth state:** React Context (`AuthContext`)
- **Theme:** next-themes for global app theme; `data-pixel-theme` attribute for Pixel-local theme scoping

---

## 5. Routes (32 total)

### Protected Routes (28)
| Route | Screen | Description |
|---|---|---|
| /dashboard | Dashboard | Main dashboard |
| /ai-agents | AIAgents | Agent overview hub |
| /ai-agents/echo | ComingSoon | Echo agent (stub) |
| /ai-agents/nexus | NexusAgent | Nexus control center |
| /ai-agents/osha | OshaAgent | Osha AI assistant |
| /ai-agents/pixel | PixelAgent | Pixel visual generator |
| /ai-agents/promptor | PromptorAgent | Promptor prompt engine |
| /ai-agents/pulse | ComingSoon | Pulse agent (stub) |
| /files | FilesManager | File management |
| /marketing/operations | ComingSoon | Marketing ops (stub) |
| /marketing/plan | ComingSoon | Marketing plan (stub) |
| /mastermind | MasterMind | MasterMind hub |
| /mastermind/brain | BrainKnowledge | Brain knowledge base |
| /mastermind/brain/[sectionType] | BrainSection | Agent-specific brain section |
| /mastermind/heart | HeartRules | Heart rules engine |
| /mastermind/vector-store | VectorStore | RAG vector store viewer |
| /mastermind/wishpedia | WishpediaIndex | Wishpedia entry index |
| /mastermind/wishpedia/[slug] | WishpediaEntry | Individual entry view |
| /profile | Profile | User profile management |
| /release-notes | ReleaseNotes | Release notes feed |
| /settings | Settings | Settings (8 tabs: Account, Branding, Users, LLM, MasterMind, Files, Prompts, Pulse) |
| /taskforce | ComingSoon | Taskforce (stub) |
| /wishdom | Wishdom | Wishdom product hub |
| /wishdom/cards | Wishdom | Cards inventory |
| /wishdom/figurines | Wishdom | Figurines inventory |
| /wishdom/nfc-tags | Wishdom | NFC tags inventory |
| /wishdom/plushes | Wishdom | Plushes inventory |
| /wishdom/stock | Wishdom | Stock overview |

### Public Routes (2)
| Route | Screen |
|---|---|
| /login | Login |
| /reset-password | ResetPassword |

### Other (2)
| Route | Purpose |
|---|---|
| / | Root redirect |
| /sentry-example-page | Sentry smoke test |

---

## 6. Edge Functions (14)

| Function | Purpose | Key Actions |
|---|---|---|
| ai-chat | Multi-provider AI chat proxy | text, image, video generation; OpenAI/Gemini/fal routing; check-keys |
| manage-users | Admin user management | create, update, delete users |
| osha-chat | Osha agent chat | guide/operator/workshop modes; deep research; Heart+Brain context |
| pixel-chat | Pixel visual generation | platform-aware prompts; image/video gen; attachment processing |
| process-embeddings | RAG embedding pipeline | create/delete embeddings for brain docs + wishpedia entries |
| process-ocr | OCR processing | Extract text from uploaded documents |
| promptor | Prompt engineering | create/optimize/optimize-draft actions; Heart+Brain context |
| pulse-api | upload-post.com proxy | test-connection, list-accounts, queue settings, platforms, webhooks |
| search-knowledge | Hybrid RAG search | vector + BM25 + source weighting via match_knowledge RPC |
| serve-file | Secure file serving | Token-gated file download from private buckets |
| settings-keys | API key management | update-key, reset-key, check-keys for openai/gemini/fal/pulse |
| storage-stats | Storage usage | Bucket size aggregation |
| update-bucket-settings | Bucket config | Admin bucket settings management |
| wishpedia-generate | Wishpedia content gen | Generate entry descriptions + angle images |

---

## 7. Data Layer

### Tables (34 in public schema)

| Table | Domain |
|---|---|
| profiles, user_roles, user_permissions | Auth / Users |
| files, file_tags, file_versions, file_settings, sectors | File Management |
| brain_sections, brain_documents, brain_categories, knowledge_embeddings | RAG / Brain |
| heart_rules, heart_categories | Rules Engine |
| promptor_settings, promptor_runs, quick_prompts | Promptor Agent |
| agent_settings | Agent Config (shared) |
| osha_settings, osha_messages, osha_audit_logs | Osha Agent |
| pixel_settings, pixel_messages, pixel_blueprints | Pixel Agent |
| muse_settings, muse_messages | Muse (legacy) |
| wishpedia_categories, wishpedia_entries, wishpedia_entry_images | Wishpedia |
| branding_settings | Branding |
| llm_settings | LLM providers + Pulse config |
| console_messages | System console |
| system_prompts | Agent system prompts |
| user_usage | Usage tracking |

### Storage Buckets (4)

| Bucket | Public | Purpose |
|---|---|---|
| brain-documents | Yes | Brain knowledge document storage |
| files | No | User file uploads (private, SEC-019) |
| profile-pictures | Yes | User avatar images |
| wishpedia-media | Yes | Wishpedia entry images |

### Migrations: 54 files in `supabase/migrations/`

---

## 8. AI / LLM Layer

### Providers (3 + 1 scheduling API)

| Provider | Models | Key Column | Env Fallback |
|---|---|---|---|
| OpenAI | Text, Image, Video, Deep Research | openai_api_key | OPENAI_API_KEY |
| Google Gemini | Text (incl. 3.1 Pro), Image (incl. Nano Banana 2), Video | gemini_api_key | GEMINI_API_KEY |
| fal.ai | Text (OpenRouter), Image (FLUX/Ideogram/Recraft/Imagen), Video (Kling/Veo/Wan/Seedance) | fal_api_key | FAL_KEY |
| upload-post.com (Pulse) | Social scheduling API | upload_post_api_key | UPLOAD_POST_API_KEY |

### Model Registry: `src/config/llmModels.ts`
- `OPENAI_TEXT_MODELS`, `OPENAI_IMAGE_MODELS`, `OPENAI_VIDEO_MODELS`, `OPENAI_DEEP_RESEARCH_MODELS`
- `GEMINI_TEXT_MODELS`, `GEMINI_IMAGE_MODELS`, `GEMINI_VIDEO_MODELS`
- `FAL_TEXT_MODELS`, `FAL_IMAGE_MODELS`, `FAL_VIDEO_MODELS`

### Active Provider Selection
Per-capability active provider stored in `llm_settings`: `active_text_provider`, `active_image_provider`, `active_deep_research_provider`, `active_video_provider`.

### API Key Security (SEC-001)
- Keys stored as TEXT columns on `llm_settings` — written only via `settings-keys` edge function (admin + service-role)
- Client whitelist (`LLM_SETTINGS_CLIENT_COLUMNS` in `useLLMSettings.ts`) explicitly excludes all `*_api_key` columns
- `LLMSettings` TypeScript interface omits key fields — compiler refuses accidental surfacing
- Edge function responses never contain raw key values

---

## 9. Key Features by Domain

### Profile Page
- Avatar upload to `profile-pictures` bucket via `useUploadAvatar` hook
- Email change with regex validation + pending-change indicator
- Password change (min 8 chars, matches Supabase default)
- Empty-name guard on display name save

### Pixel Agent
- Platform-specific visual generation (Facebook, Instagram, TikTok, Cross Platform)
- **Pixel-local theme toggle:** `data-pixel-theme` attribute scopes CSS variables independently of global app theme. Sun/Moon toggle in PixelTopBar, persisted to localStorage.
- **WishReference sidebar:** Replaces old Templates + References sections. Searchable Wishpedia entry picker, multi-select, EntryImageLoader pattern loads angle images, thumbnail chip grid, native HTML5 drag-drop, 5-image cap + 3MB guard. Selected images sent as base64 attachments to pixel-chat.
- **Wishdom nav button:** Package icon in TopBar navigates to /wishdom.
- Promptor optimize-draft button (shared with Osha)
- Blueprint/template system (accessible via Settings Sheet)

### Osha Agent
- Guide/Operator/Workshop modes (6 legacy modes removed)
- Deep research with 5-stage progress indicator
- Smooth scroll-to-bottom on new messages
- Legacy mode coercion for stale settings

### Wishpedia
- Cosmic-editorial masonry index with glass-morphism cards
- Cinematic hero entry view with filmstrip thumbnails
- Dialog-based lightbox with keyboard navigation

### Pulse (Settings Tab)
- upload-post.com API connection card with ApiKeyEditor + test connection
- Connected profiles list from API
- Platform pages (Facebook/LinkedIn/Pinterest)
- API info display
- Auth: `Authorization: Apikey <key>` (custom scheme)

### Settings Page (8 admin tabs)
Account, Branding, Users, LLM, MasterMind, Files, Prompts, Pulse

---

## 10. Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Yes | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_PROJECT_ID | Yes | Supabase project ID |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Yes | Supabase anon key |
| NEXT_PUBLIC_SENTRY_DSN | No | Sentry error tracking (dormant without it) |

Edge Function secrets (set in Supabase dashboard):
- OPENAI_API_KEY, GEMINI_API_KEY, FAL_KEY, UPLOAD_POST_API_KEY
- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

---

## 11. Scripts

```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:3000 (Turbopack)
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # ESLint
```

---

## 12. Edge Function Deploy Status

All 14 edge functions are deployed and ACTIVE. No pending deploys.

Last deployed (2026-04-16): ai-chat v170, osha-chat v116, settings-keys v2, pulse-api v1.

---

## 13. Verification Log

| Check | Result | Date |
|---|---|---|
| Route count | 32 (find src/app -name page.tsx) | 2026-04-16 |
| Component count | 165 .tsx files in src/components/ | 2026-04-16 |
| Hook count | 66 .ts/.tsx files in src/hooks/ | 2026-04-16 |
| Screen count | 21 .tsx files in src/screens/ | 2026-04-16 |
| Edge function count | 14 (ls supabase/functions/*/index.ts) | 2026-04-16 |
| Migration count | 54 .sql files in supabase/migrations/ | 2026-04-16 |
| Table count | 34 in public schema (SQL query) | 2026-04-16 |
| Storage buckets | 4 (brain-documents, files, profile-pictures, wishpedia-media) | 2026-04-16 |
| UI component files | 48 in src/components/ui/ | 2026-04-16 |
| TypeScript strict | Enabled (tsconfig.json) | 2026-04-16 |
| TypeScript errors | 0 (npx tsc --noEmit) | 2026-04-16 |
| ESLint errors | 0 (35 pre-existing warnings) | 2026-04-16 |
| Build | Passed clean (npm run build) | 2026-04-16 |
