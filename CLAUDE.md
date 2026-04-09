# Fortun Wishnet

> This file is the permanent project memory. It is updated at the end of every completed task.

## Project Overview
Fortun Wishnet is an internal admin/operations platform built on **Next.js 16 App Router** with a Supabase backend. It hosts file management, a RAG-powered knowledge base, multiple AI agents (Osha, Pixel, Promptor), a rules engine (Heart Rules), and a Wishpedia content module.

## Tech Stack
- **Framework:** Next.js 16.2.3 (App Router + Turbopack)
- **Language:** TypeScript 5.8.3 (strict mode)
- **UI:** React 19.2.5 + React DOM 19.2.5
- **Styling:** Tailwind CSS 3.4.17 + tailwindcss-animate + @tailwindcss/typography
- **Components:** shadcn/ui (Radix UI primitives, ~40 packages)
- **State/Data:** TanStack Query 5.83.0
- **Forms:** React Hook Form 7.61.1 + Zod 3.25.76 (@hookform/resolvers 3.10.0)
- **Backend:** Supabase (@supabase/supabase-js 2.91.0 + @supabase/ssr 0.10.2)
- **Icons:** Lucide React 0.462.0
- **Notifications:** Sonner 1.7.4
- **Charts:** Recharts 2.15.4
- **Flow/Diagrams:** @xyflow/react 12.10.1
- **Drag & Drop:** @dnd-kit/core 6.3.1 + sortable 10.0.0
- **PDF:** pdfjs-dist 4.9.155
- **Markdown:** react-markdown 10.1.0 + remark-gfm 4.0.1
- **Theme:** next-themes 0.3.0
- **Testing:** Playwright 1.57.0

Do not upgrade dependencies without discussion.

## Architecture
- **Frontend:** Next.js App Router, source in `src/`, alias `@` → `./src`
- **Routing:** `src/app/` with `(public)` and `(protected)` route groups
- **Auth:** Cookie-based SSR via `@supabase/ssr` + `middleware.ts` at repo root + `src/contexts/AuthContext.tsx`
- **Supabase client (browser):** `src/integrations/supabase/client.ts` — uses `createBrowserClient` from `@supabase/ssr`, reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Supabase client (server):** `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`
- **Supabase types:** `src/integrations/supabase/types.ts` (generated)
- **Edge functions:** `supabase/functions/` — 12 functions (all deployed)
- **Migrations:** `supabase/migrations/` — 53 files

## Supabase Backend
- **Project:** Fortun Wishnet (`zlmideilxfnokemzkavm`)
- **Region:** us-west-1
- **Postgres:** 17.6.1 + pgvector 0.8 (HNSW, 1536-dim, cosine)
- **Tables:** 33 in `public` schema — all with RLS enabled
- **Edge functions (12):** manage-users, ai-chat, storage-stats, update-bucket-settings, serve-file, process-embeddings, search-knowledge, process-ocr, promptor, osha-chat, pixel-chat, wishpedia-generate
- **Storage buckets:** brain-documents, files, wishpedia-media, profile-pictures

## Domain Areas
- **Auth / users:** profiles, user_roles, user_permissions
- **Files:** files, file_tags, file_versions, file_settings
- **RAG / Knowledge:** brain_sections, brain_documents, brain_categories, knowledge_embeddings, embedding_jobs
- **Rules:** heart_rules, heart_categories
- **Promptor:** promptor_settings, promptor_runs, quick_prompts
- **Agents:** agent_settings, osha_*, muse_*, pixel_*
- **Wishpedia:** wishpedia_categories, wishpedia_entries, wishpedia_entry_images
- **Branding / config:** branding_settings, llm_settings, sectors, console_messages

## How to Run
```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run start   # serve production build
npm run lint
```

## Environment Variables
Create a `.env.local` file (never commit) with:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PROJECT_ID=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

## Conventions
- TypeScript strict mode
- shadcn/ui components in `src/components/ui/` — don't modify, extend
- Tailwind for all styling (no CSS modules)
- `@/` import alias for `src/`
- Server state via TanStack Query
- Forms via React Hook Form + Zod
- Server Components by default; add `"use client"` only when required

## Agent Workflow
The following agents are available globally at `~/.claude/agents/`:

- 🧠 **Planner** — multi-step task planning
- 🔍 **Researcher** — unfamiliar tech / APIs
- 👔 **Technical CTO** — architecture decisions
- 🎨 **Figma-to-Code** — Figma → code
- 🎨 **UI Reviewer** — after building any visual component
- 🔧 **Code Reviewer** — after building backend logic
- 🔍 **SEO Auditor** — after building public pages
- 🔒 **Security Auditor** — mandatory during QA
- 🐛 **Bug Fixer** — error investigation

### Mandatory review flow
- Visual component → UI Reviewer
- Backend logic → Code Reviewer
- Public page → SEO Auditor
- QA phase → Security Auditor
