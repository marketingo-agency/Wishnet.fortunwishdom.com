# Fortun Wishnet

Internal admin/tooling app for the Fortun Wishdom universe — file management, knowledge base, RAG, and a suite of in-house AI agents.

Production: <https://wishnet.fortunwishdom.com>

## Tech Stack

- **Next.js 16** — App Router, React Server Components where appropriate
- **React 19** + **TypeScript 5.8**
- **Tailwind CSS 3** + **shadcn/ui** (Radix UI primitives)
- **TanStack Query 5** — server state
- **React Hook Form** + **Zod** — forms + validation
- **Supabase** — Postgres + Auth (`@supabase/ssr`) + Storage + Edge Functions + pgvector RAG
- **Lucide** — icons
- **Sonner** — toasts

## Prerequisites

- Node.js 20 or later
- npm 10 or later

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template and fill in your Supabase credentials
cp .env.local.example .env.local
# Edit .env.local — see ENV_MIGRATION.md for the variable names

# 3. Start the dev server
npm run dev
```

Open <http://localhost:8080>.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server on port 8080 (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run the production build on port 8080 |
| `npm run lint` | Run ESLint on `src/` and `middleware.ts` |

## Project structure

```
src/
├── app/                    # Next.js App Router (file-based routing)
│   ├── (public)/           # Login, password reset — no sidebar
│   ├── (protected)/        # All authenticated routes — sidebar shell via MainLayout
│   ├── layout.tsx          # Root: fonts, metadata, providers
│   ├── providers.tsx       # QueryClient, Theme, Auth, Tooltip, Toaster
│   ├── globals.css         # Tailwind + design tokens
│   └── not-found.tsx       # 404 page
├── components/             # Reusable React components (shadcn/ui in components/ui)
├── contexts/               # React contexts (AuthContext)
├── hooks/                  # React Query hooks + business logic
├── screens/                # Page-level components, re-exported from app/**/page.tsx
├── lib/                    # Utilities (cn, fileProcessing) + Supabase server/middleware clients
│   └── supabase/
│       ├── server.ts       # Server Components / Route Handlers
│       └── middleware.ts   # Cookie session refresh
├── integrations/
│   └── supabase/
│       ├── client.ts       # Browser client (@supabase/ssr)
│       └── types.ts        # Auto-generated DB types
├── config/                 # API endpoints, permissions, LLM models
├── data/                   # Static navigation data
└── routes/                 # Route metadata (drives sidebar + ComingSoon pages)

middleware.ts               # Top-level Supabase session refresh
next.config.ts              # Image domains, redirects, server external packages
supabase/                   # Migrations, edge functions, config (managed separately)
```

## Backend

The Supabase project (`zlmideilxfnokemzkavm`) is managed in the `supabase/` directory and is **not** part of the Next.js build:

- 53 SQL migrations (`supabase/migrations/`)
- 12 edge functions (`supabase/functions/`)
- Project config (`supabase/config.toml`)

To work on the backend, use the Supabase CLI:

```bash
supabase start          # local Supabase
supabase db push        # apply migrations
supabase functions deploy <name>
```

## Environment Variables

See [`ENV_MIGRATION.md`](ENV_MIGRATION.md) for the full mapping. Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_PROJECT_ID`

These are public values (anon key only, no service role) and safe in the browser bundle.

## Project memory

See [`CLAUDE.md`](CLAUDE.md) for the long-term project memory (architecture, tech stack, conventions, Supabase inventory).

## Deployment

This is a standard Next.js app and can be deployed to any Next.js-compatible host (Vercel, Netlify, self-hosted Node).

For Vercel:

1. Import the GitHub repository
2. Set the three `NEXT_PUBLIC_SUPABASE_*` env vars in the Vercel dashboard
3. Deploy — `npm run build` will run automatically

The current production deployment serves <https://wishnet.fortunwishdom.com>.
