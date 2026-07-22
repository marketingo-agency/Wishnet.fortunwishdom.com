# WishNet Full System Reference

> Single-file technical reference for the Fortun WishNet platform, written for ingestion by an external LLM with zero prior knowledge of the codebase.

- Repository head: `c:\My-Dev-Projects\Fortun Wishnet\` on branch `main`.
- Supabase project ref: `zlmideilxfnokemzkavm` (us-west-1).
- Production URL: `wishnet.fortunwishdom.com`.
- Generated: 2026-05-21.

**Source of truth and method.** Sections 1 to 3, 8, and 19 were written from direct inspection of repository config files, `git`, and live queries against the Supabase project. Sections 4 to 7, 9 to 18 were produced by systematic static analysis of the source tree. Where the live database, the migrations, and the prior audit docs (`FULL_AUDIT_V2.md`, `WISHNET_PROJECT_STATE.md`) disagree, the running-code reality is documented first and the discrepancy is flagged.

**Conventions.** File paths appear in backticks on every claim. Code excerpts are fenced and trimmed. This document contains no em dashes by design (a hard authoring constraint); any em dashes in quoted git history have been replaced with hyphens and are otherwise verbatim.

## Table of Contents

1. Project Overview
2. Tech Stack
3. Directory Structure
4. App Router Map
5. Component Inventory
6. Design System
7. Agent Architecture
8. Database Schema
9. Edge Functions
10. RAG and Knowledge Pipeline
11. Wishpedia
12. Authentication and Authorization
13. Integrations
14. API Routes
15. Hooks and Utilities
16. Environment and Configuration
17. Testing Status
18. Documented Doctrine vs. Code Reality
19. Recent Git Activity
20. Open Questions

---

### 1. Project Overview

Fortun WishNet is an internal admin and operations platform for the Fortun Wishdom organization. It bundles file management, a RAG-powered knowledge base ("Brain"), a rules engine ("Heart"), a Wishpedia content module, and a suite of AI agents (Osha, Pixel, Promptor, Nexus, plus scaffolded Whisper, Pulse, Atlas, Muse) behind a single authenticated Next.js application.

- Production URL: `wishnet.fortunwishdom.com`.
- Supabase project ref: `zlmideilxfnokemzkavm` (region us-west-1, Postgres 17 + pgvector 0.8).
- Hosting platform: Vercel (`vercel.json` declares `"framework": "nextjs"`).
- Repo root: `c:\My-Dev-Projects\Fortun Wishnet\`.

Scripts from `package.json`:

| Command | Action |
|---------|--------|
| `npm run dev` | `next dev -p 8000` (Turbopack dev server on port 8000) |
| `npm run dev:webpack` | `next dev -p 8000 --webpack` (Webpack fallback) |
| `npm run build` | `next build` (production build; `vercel.json` `buildCommand`) |
| `npm run start` | `next start -p 8000` |
| `npm run lint` | `eslint src middleware.ts` |

There is no dedicated test script (see Section 17). The dev/start port is pinned to 8000 (`CLAUDE.md` LOCKED_PORT).

### 2. Tech Stack

Versions from `package.json` (caret ranges; the lockfile pins exact installs).

| Layer | Technology | Version (range) |
|-------|-----------|-----------------|
| Framework | Next.js (App Router) | `^16.2.3` |
| UI runtime | React / React DOM | `^19.2.5` |
| Language | TypeScript | `^5.8.3` (strict mode, `tsconfig.json`) |
| Node types | `@types/node` | `^22.16.5` |
| Styling | Tailwind CSS | `^3.4.17` + `tailwindcss-animate` `^1.0.7` + `@tailwindcss/typography` `^0.5.16` |
| Components | shadcn/ui over Radix UI primitives | ~28 `@radix-ui/*` packages |
| Variants | `class-variance-authority` `^0.7.1`, `clsx` `^2.1.1`, `tailwind-merge` `^2.6.0` | |
| Server state | `@tanstack/react-query` | `^5.83.0` |
| Forms | `react-hook-form` `^7.61.1` + `@hookform/resolvers` `^3.10.0` + `zod` `^3.25.76` | |
| Backend SDK | `@supabase/supabase-js` `^2.91.0` + `@supabase/ssr` `^0.10.2` | |
| Icons | `lucide-react` | `^0.462.0` |
| Notifications | `sonner` | `^1.7.4` |
| Theme | `next-themes` | `^0.3.0` |
| PDF | `pdfjs-dist` | `^4.9.155` (server-external in `next.config.ts`) |
| Markdown | `react-markdown` `^10.1.0` + `remark-gfm` `^4.0.1` | |
| Drag and drop | `@dnd-kit/core` `^6.3.1` + `sortable` `^10.0.0` + `utilities` `^3.2.2` | |
| Carousel / panels | `embla-carousel-react` `^8.6.0`, `react-resizable-panels` `^2.1.9`, `vaul` `^0.9.9` | |
| Dates | `date-fns` `^3.6.0`, `react-day-picker` `^9.14.0` | |
| Uploads | `react-dropzone` `^14.3.8` | |
| Compression | `fflate` `^0.8.2` | |
| Error tracking | `@sentry/nextjs` | `^10.48.0` |
| Analytics | `@vercel/analytics` `^2.0.1`, `@vercel/speed-insights` `^2.0.0` | |
| Tooling | ESLint `^9.32.0` (flat config) + `typescript-eslint` `^8.38.0` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`; `@next/bundle-analyzer` | |

Notes:
- Package manager: `npm` (a `package-lock.json` is present; `CLAUDE.md`/global prefs mention pnpm but this repo uses npm).
- `recharts` and `@xyflow/react` were removed during remediation (`CLAUDE.md`); a stray `src/components/ui/chart.tsx` is deleted in the working tree.
- Architecture: App Router with Server Components by default; data layer is Supabase accessed via a browser client (`src/integrations/supabase/client.ts`, `createBrowserClient`) and a server client (`src/lib/supabase/server.ts`, `createServerClient`). Server state is managed by TanStack Query; there is no Redux/Zustand. Most interactive screens are client components under `src/screens/` rendered by thin server page wrappers in `src/app/`.
- `tsconfig.json`: `strict: true`, `noUnusedLocals: true`, `target ES2020`, `moduleResolution: bundler`, path alias `@/* → ./src/*`. `supabase/functions/**` is excluded from the app tsconfig (Deno runtime).

### 3. Directory Structure

Top-level (repo root):

| Path | Purpose |
|------|---------|
| `src/` | All application source (App Router, components, hooks, lib, screens, types) |
| `supabase/` | `functions/` (14 Deno edge functions + `_shared/`), `migrations/` (54 SQL files), `.temp/` |
| `public/` | Static assets (favicon, pdf.worker, etc.) |
| `docs/` | `supabase-manual-changes.md` (manual DB/bucket/cron changes log) |
| `.github/` | CI workflow (lint + typecheck + build) |
| `.claude/` | Project Claude config: `rules/` (code-rules, git-rules, ui-rules), `settings.json` |
| `dist/` | Stale build output from the pre-Next.js (Vite) era; not used by Next.js |
| `middleware.ts` | Root Next.js middleware (Supabase session refresh) |
| `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `eslint.config.js`, `postcss.config.js`, `components.json`, `vercel.json` | Build/config |
| `sentry.server.config.ts`, `sentry.edge.config.ts` | Sentry runtime config (client config moved to `src/instrumentation-client.ts`) |
| `CLAUDE.md`, `MEMORY.md`, `README.md`, `PROGRESS.md`, `FULL_AUDIT_V2.md`, `WISHNET_PROJECT_STATE.md` | Project docs and audit history |

`src/` annotated tree:

| Path | Purpose |
|------|---------|
| `src/app/` | App Router. `(public)/` (login, reset-password) and `(protected)/` route groups; root `layout.tsx`, `page.tsx`, `not-found.tsx`; `sentry-example-page/` |
| `src/app/(protected)/ai-agents/` | Agent routes: `nexus`, `osha`, `pixel`, `promptor`, `pulse`, `whisper`, `atlas` + index |
| `src/app/(protected)/mastermind/` | `brain/` (+ `[sectionType]`), `heart/`, `wishpedia/` (+ `[slug]`), `vector-store/` + index |
| `src/app/(protected)/marketing/` | `plan`, `operations` (coming-soon area) |
| `src/app/(protected)/` other | `dashboard`, `files`, `profile`, `release-notes`, `settings` |
| `src/components/` | Feature component folders (agents, brain, brand, files, heart, layout, navigation, nexus, osha, pixel, profile, promptor, release-notes, settings, wishpedia) + top-level guards/providers |
| `src/components/ui/` | shadcn/ui primitives (~55 files) |
| `src/screens/` | 21 screen components (the real page bodies, mostly client components) |
| `src/hooks/` | ~45 custom hooks + subfolders `files/`, `osha/`, `pixel/`, `promptor/` |
| `src/lib/` | Utilities (`utils.ts` `cn()`, `apiHelpers.ts`, `constants.ts`, `fileProcessing.ts`, `fileTypes.ts`, `wishpediaColors.ts`) + `supabase/` server/middleware clients |
| `src/config/` | `api.ts` (edge endpoint registry), `permissions.ts`, `llmModels.ts`, `index.ts` |
| `src/contexts/` | `AuthContext.tsx` |
| `src/data/` | `agents.ts` (agent catalog), `navigation.ts` (sidebar nav) |
| `src/routes/` | `routeConfig.ts` (route → permission mapping) |
| `src/types/` | `attachments.ts`, `brain.ts`, `files.ts`, `llm.ts`, `user.ts`, `wishpedia.ts`, `global.d.ts` |
| `src/integrations/supabase/` | `client.ts` (browser client), `types.ts` (generated DB types) |

---

### 4. App Router Map

#### Redirect and Special Notes

- `next.config.ts` defines a server-side redirect: `/ -> /dashboard` (permanent: false), so `src/app/page.tsx` also calls `redirect('/dashboard')` as a client fallback.
- All protected routes go through two auth layers: (1) server component check in `src/app/(protected)/layout.tsx` that calls `supabase.auth.getUser()` and redirects unauthenticated users to `/login`; (2) client-side `ProtectedRoute` inside `ProtectedShell.tsx` as a fallback for expired sessions.
- Tool-gated routes wrap their screen in `ToolProtectedRoute` (`src/components/ToolProtectedRoute.tsx`), which reads `useCurrentUserPermissions()` and checks a `PermissionLevel` against the `toolKey`. Default required level is `'view'`.
- Routes rendering `ComingSoonRoute` are placeholders; the screen displays a "coming soon" card but no functional content.

#### Root-Level Files

| File | Purpose |
|---|---|
| `src/app/layout.tsx` | Root layout. Loads Inter + Poppins via `next/font/google`, applies global CSS, wraps tree in `Providers`. Server component. `dynamic = 'force-dynamic'`. |
| `src/app/page.tsx` | Root page. Calls `redirect('/dashboard')`. Server component. |
| `src/app/not-found.tsx` | Global 404 page. Client component. Logs 404 to Sentry via `useEffect`. |
| `src/app/global-error.tsx` | Root error boundary (wraps the entire app including layout). Client component. Logs to Sentry, renders inline reset button. |
| `src/app/providers.tsx` | Client-only provider tree: `ErrorBoundary -> ThemeProvider -> QueryClientProvider -> TooltipProvider -> Toaster + Sonner -> AuthProvider -> BrandingProvider`. |
| `src/app/sentry-example-page/page.tsx` | Dev-only Sentry test trigger page. Client component. |

#### `(public)` Route Group

Layout: `src/app/(public)/layout.tsx` - pure pass-through, no sidebar.

| URL | Page File | Screen Component | Client? | Auth | Key Data |
|---|---|---|---|---|---|
| `/login` | `src/app/(public)/login/page.tsx` | `src/screens/Login` | No (wraps in `<Suspense>`) | Public | `useAuth` (in screen) |
| `/reset-password` | `src/app/(public)/reset-password/page.tsx` | `src/screens/ResetPassword` | No | Public | Supabase auth hash from URL |

#### `(protected)` Route Group

Layout: `src/app/(protected)/layout.tsx` - async server component; calls `supabase.auth.getUser()`; redirects to `/login` if no session; renders `ProtectedShell` (client wrapper that adds `ProtectedRoute` + `MainLayout`).

Special files:

| File | Purpose |
|---|---|
| `src/app/(protected)/loading.tsx` | Shared loading UI for the group. Server component. Renders a page-shaped animated skeleton (title bar, stats row, content area). |
| `src/app/(protected)/error.tsx` | Shared error boundary for the group. Client component. Captures to Sentry, offers a "Try Again" reset button. |
| `src/app/(protected)/ProtectedShell.tsx` | Client component. Wraps children in `ProtectedRoute` + `MainLayout` (sidebar, header, `OshaFloatingBubble`). |

Protected route table:

| URL | Page File | Screen Component | Client (`"use client"`)? | Auth / Gate | Key Data Dependencies |
|---|---|---|---|---|---|
| `/dashboard` | `src/app/(protected)/dashboard/page.tsx` | `src/screens/Dashboard` | Yes (screen) | Protected | `useCurrentUserPermissions`, `useBrainDocuments`, `useActiveRulesCount`, `useFilesCount`, static `AI_AGENTS` + nav data |
| `/files` | `src/app/(protected)/files/page.tsx` | `src/screens/FilesManager` | Yes (screen) | Protected + `files_manager` tool gate | `useFiles`, `useBrainDocumentsAsFiles`, `useSectors`, `useStorageUsage` |
| `/ai-agents` | `src/app/(protected)/ai-agents/page.tsx` | `src/screens/AIAgents` | Yes (screen) | Protected + `ai_agents` tool gate | Static `AI_AGENTS` data, `useAgentSettings` per card |
| `/ai-agents/nexus` | `src/app/(protected)/ai-agents/nexus/page.tsx` | `src/screens/NexusAgent` | Yes (page has `"use client"`) | Protected + `ai_agents` tool gate | `useLLMSettings`, `useQuickPrompts`, `useAgentSettings`, `useNexusConsoleController` |
| `/ai-agents/osha` | `src/app/(protected)/ai-agents/osha/page.tsx` | `src/screens/OshaAgent` | Yes (screen) | Protected + `ai_agents` tool gate | `useOshaSettings`, `useAgentSettings`, `useOshaMessages` |
| `/ai-agents/pixel` | `src/app/(protected)/ai-agents/pixel/page.tsx` | `src/screens/PixelAgent` | Yes (screen) | Protected + `ai_agents` tool gate | `usePixelSettings`, `usePixelMessages`, `useAgentSettings` |
| `/ai-agents/promptor` | `src/app/(protected)/ai-agents/promptor/page.tsx` | `src/screens/PromptorAgent` | Yes (screen) | Protected + `ai_agents` tool gate | `usePromptorSettings`, `useAgentSettings`, `usePromptorSession` |
| `/ai-agents/pulse` | `src/app/(protected)/ai-agents/pulse/page.tsx` | `src/screens/ComingSoonRoute` | No | Protected (no tool gate) | None - placeholder |
| `/ai-agents/whisper` | `src/app/(protected)/ai-agents/whisper/page.tsx` | `src/screens/ComingSoonRoute` | No | Protected (no tool gate) | None - placeholder |
| `/ai-agents/atlas` | `src/app/(protected)/ai-agents/atlas/page.tsx` | `src/screens/ComingSoonRoute` | No | Protected (no tool gate) | None - placeholder |
| `/mastermind` | `src/app/(protected)/mastermind/page.tsx` | `src/screens/MasterMind` | Yes (screen) | Protected + `mastermind` tool gate | `useTotalDocumentCount`, `useActiveRulesCount` |
| `/mastermind/brain` | `src/app/(protected)/mastermind/brain/page.tsx` | `src/screens/BrainKnowledge` | Yes (screen) | Protected + `mastermind` tool gate | `useBrainSections`, `useTotalDocumentCount`, `useBrainCategories` |
| `/mastermind/brain/[sectionType]` | `src/app/(protected)/mastermind/brain/[sectionType]/page.tsx` | `src/screens/BrainSection` | Yes (screen) | Protected + `mastermind` tool gate | `useBrainDocuments` (section-filtered), `useOcrIndexing` |
| `/mastermind/heart` | `src/app/(protected)/mastermind/heart/page.tsx` | `src/screens/HeartRules` | Yes (screen) | Protected + `mastermind` tool gate | `useHeartRules`, `useHeartCategories` |
| `/mastermind/vector-store` | `src/app/(protected)/mastermind/vector-store/page.tsx` | `src/screens/VectorStore` | Yes (screen) | Protected + `mastermind` tool gate | `VectorStorePanel` (uses `useBulkWishpediaIndex`, `useUnindexedEntryCount`) |
| `/mastermind/wishpedia` | `src/app/(protected)/mastermind/wishpedia/page.tsx` | `src/screens/WishpediaIndex` | Yes (screen) | Protected + `mastermind` tool gate | `useWishpediaEntries`, `useWishpediaCategories`, `useBulkWishpediaIndex` |
| `/mastermind/wishpedia/[slug]` | `src/app/(protected)/mastermind/wishpedia/[slug]/page.tsx` | `src/screens/WishpediaEntry` | Yes (screen) | Protected + `mastermind` tool gate | `useWishpediaCategories`, `useEntryIndexStatus`, `useProcessWishpediaEntryEmbedding` |
| `/settings` | `src/app/(protected)/settings/page.tsx` | `src/screens/Settings` | Yes (page has `"use client"`) | Protected | `useLLMSettings`, `useBranding`, `useUserPermissions`, tab-specific sub-hooks |
| `/profile` | `src/app/(protected)/profile/page.tsx` | `src/screens/Profile` | Yes (screen) | Protected | `useAuth`, `useUploadAvatar` |
| `/release-notes` | `src/app/(protected)/release-notes/page.tsx` | `src/screens/ReleaseNotes` | Yes (screen) | Protected | Static mock data (`mockReleaseUpdates`, `mockPlannedReleases`) |

#### `ToolKey` Values (from `src/routes/routeConfig.ts` and `src/config/permissions`)

Used by `ToolProtectedRoute`: `ai_agents`, `mastermind`, `files_manager`.

---

### 5. Component Inventory

#### `src/components/ui/` (shadcn/ui Primitives)

Contains 49 files: the standard shadcn/ui component set generated from Radix UI primitives. Notable additions beyond the standard set include `video-player.tsx` (custom HTML5 video wrapper with loading skeleton, error state, and play overlay) and `sonner.tsx` (Sonner `<Toaster>` wired to `next-themes`). The full primitive list covers accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, switch, table, tabs, textarea, toast, toaster, toggle-group, toggle, tooltip, and `use-toast.ts`.

#### Top-Level Components

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `src/components/BrandingProvider.tsx` | Applies `branding_settings` (title, favicon) to `document` client-side without triggering re-renders. | `{ children: ReactNode }` | `useBranding()`, `useRef` for change-guard |
| `src/components/ErrorBoundary.tsx` | Class-based React error boundary. Catches render errors, reports to Sentry, shows "Try Again" + "Go to Dashboard" UI. | `{ children: ReactNode, fallback?: ReactNode }` | `Sentry.captureException` in `componentDidCatch` |
| `src/components/NavLink.tsx` | Drop-in for react-router-dom `NavLink`. Accepts both `to` and `href`. Computes active state via `usePathname`. | `{ to?, href?, className?, activeClassName?, pendingClassName?, end?, ...LinkProps }` | `usePathname` |
| `src/components/ProtectedRoute.tsx` | Client-side auth guard fallback for expired sessions. Redirects to `/login` (preserving `?from=` path) when no user. Optionally gates admin access. | `{ children: ReactNode, requireAdmin?: boolean }` | `useAuth`, `useRouter`, `usePathname` |
| `src/components/ToolProtectedRoute.tsx` | Wraps a screen with a permission check on a named `toolKey`. Shows "Access Denied" UI for insufficient `PermissionLevel`. | `{ children: ReactNode, toolKey: ToolPermissionKey, requiredLevel?: PermissionLevel }` | `useCurrentUserPermissions` |

#### `agents/`

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `AgentCard.tsx` | Grid card for the AI Agents index page. Shows agent icon, name, role, description, and live status badge. Links to agent route. | `{ agent: Agent }` (id, name, role, description, icon, color, gradient, glowColor, tags, status?) | `useAgentSettings` (skipped for coming-soon agents) |

#### `brain/`

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `AgentAccessSelector.tsx` | Popover multi-select of AI agents for Brain document access control. | `{ value: string[], onChange: (agents: string[]) => void, disabled?: boolean }` | None (stateless aside from local popover open) |
| `AgentKnowledgeCard.tsx` | Card linking to a per-agent Brain section. Shows doc count. | `{ agent: AgentMetadata }` | `useBrainSections`, `useBrainDocumentCounts` |
| `DocumentCard.tsx` | Display card for a `BrainDocument`. Shows file type, size, indexing status with `Progress`. Action buttons for view/edit/delete. | `{ document: BrainDocument, onView?, onEdit?, onDelete? }` | `useOcrIndexing`, `useDocumentIndexStatus`, `useProcessBrainDocumentEmbedding` |
| `DocumentGrid.tsx` | DnD-enabled grid of `SortableDocumentCard`. Uses `@dnd-kit/core` with `rectSortingStrategy`. | `{ documents: BrainDocument[], isLoading?, onViewDocument?, onEditDocument?, onDeleteDocument?, onReorderDocuments? }` | `useSensors` (Pointer + Keyboard), local drag state |
| `EditDocumentDialog.tsx` | Dialog to edit a Brain document's name, description, category, agent access, and indexing toggle. | `{ document: BrainDocument, open: boolean, onOpenChange: (open: boolean) => void }` | `useUpdateBrainDocument`, `useBrainCategories` |
| `GeneralKnowledgeCard.tsx` | Card linking to the general knowledge brain section. Shows doc + category counts. | None | `useBrainDocumentCounts`, `useGeneralSection`, `useBrainCategories` |
| `SortableDocumentCard.tsx` | `@dnd-kit/sortable` wrapper around `DocumentCard` that adds a `GripVertical` drag handle. | `{ document: BrainDocument, onView?, onEdit?, onDelete? }` | `useSortable` |
| `UploadDocumentDialog.tsx` | Dropzone dialog (react-dropzone) to upload a new Brain document. Accepts text/image/PDF. Handles category, agent access, and index-on-upload toggle. | `{ open: boolean, onOpenChange: (open: boolean) => void, sectionId?: string }` | `useUploadBrainDocument`, `useBrainCategories` |

#### `brand/`

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `FortunLogo.tsx` | Renders the Fortun Wishnet logo. Three variants: `full` (180x40), `mini` (40x40), `login` (260x56). Falls back to inline SVG infinity symbol if no custom URL is configured. | `{ variant?: 'full' \| 'mini' \| 'login', className?: string }` | `useBranding` (reads `main_logo_url`, `mini_logo_url`, `login_logo_url`) |

#### `files/`

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `FileCard.tsx` | Card tile for a file in the grid. Shows file type icon, name, size, and action overlays for pin/restore/delete. | `{ file: FileRecord, isSelected, onClick, versionNumber?, onDragStart?, isBrainDocument?, onRestore?, onDeletePermanently?, onDelete?, onTogglePin? }` | None (stateless, handlers passed in) |
| `FilesGrid.tsx` | Responsive card grid of `FileCard`. Handles restore/delete/pin mutations inline. | `{ files: FileRecord[], selectedFileId, onFileSelect, isLoading, currentView? }` | `useUpdateFile`, `useDeleteFile`, `useUpdateBrainDocument`, `useBrainKnowledgeSector` |
| `FilesList.tsx` | Table/list layout alternative to `FilesGrid`. | Similar to `FilesGrid` | Similar mutations |
| `FileCard.tsx` | (see above) | | |
| `FileActions.tsx` | Dropdown menu of context actions for a selected file (download, rename, move, delete). | `{ file: FileRecord, ... }` | `useUpdateFile`, `useDeleteFile` |
| `FileInspector.tsx` | Right-panel detail view for a selected file. Shows metadata, preview, and version history. | `{ file: FileRecord \| null, ... }` | `useFileVersions`, preview hooks |
| `FileMetadata.tsx` | Metadata display sub-panel (type, size, created, sector). | `{ file: FileRecord }` | None |
| `FilePreview.tsx` | Preview dispatcher: routes to `PdfInlinePreview`, `VideoPlayer`, or `<img>` based on MIME. | `{ file: FileRecord, fileData?: ArrayBuffer }` | None |
| `FilesSidebar.tsx` | Left sidebar with sector list, storage usage bar, create/edit/delete sector actions. | `{ currentView, onViewChange, currentType, onTypeChange }` | `useSectors`, `useStorageUsage`, `useUpdateFile`, `useDeleteSector` |
| `FilesToolbar.tsx` | Top toolbar: search input, view toggle (grid/list), type filter. | `{ search, onSearch, view, onViewChange, type, onTypeChange }` | None |
| `PdfInlinePreview.tsx` | Canvas-based in-browser PDF renderer using `pdfjs-dist`. Lazy-renders pages on scroll. Supports zoom and rotation. | `{ pdfData: ArrayBuffer, fileName: string, onDownload: () => void }` | Local state for pages, zoom, rotation; `IntersectionObserver` for lazy render |
| `StorageUsage.tsx` | Progress bar showing bucket storage vs limit. | `{ used: number, total: number }` | None |
| `UploadButton.tsx` / `UploadDialog.tsx` | File upload trigger and drag-drop dialog. | `{ sectorId?, onUpload? }` | `useUploadFile` |
| `CreateSectorDialog.tsx` / `EditFolderDialog.tsx` | Dialogs for creating and renaming sectors (folders). | `{ open, onOpenChange, ...}` | `useCreateSector`, `useUpdateSector` |

#### `heart/`

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `CreateRuleDialog.tsx` | Dialog to create a new Heart rule. Fields: title, description, content, category, scope, agent targeting, active toggle. | `{ open: boolean, onOpenChange: (open: boolean) => void }` | `useCreateHeartRule`, `useHeartCategories` |
| `RuleCard.tsx` | Display card for a `HeartRule`. Shows scope badge, category, content excerpt, indexing status, and edit/delete/toggle actions. | `{ rule: HeartRule, onEdit, onDelete, onToggle, onDuplicate? }` | `useOcrIndexing`, `useDocumentIndexStatus` |
| `SortableRuleCard.tsx` | `@dnd-kit/sortable` wrapper around a `RuleCard`-shaped `children` prop with `GripVertical` handle. | `{ rule: HeartRule, children: ReactNode, disabled?: boolean }` | `useSortable` |

#### `layout/`

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `MainLayout.tsx` | Root shell for all protected pages. Renders `SidebarProvider`, `AppSidebar`, `Header`, `<main>`, and `OshaFloatingBubble`. | `{ children: ReactNode }` | None (composes children) |
| `AppSidebar.tsx` | Left navigation sidebar. Logo at top (collapses to mini icon), collapsible nav sections filtered by user permissions, footer items. | None | `useSidebar`, `useIsMobile`, `useCurrentUserPermissions` |
| `Header.tsx` | Top bar. Breadcrumb navigation, sidebar trigger, theme toggle (Sun/Moon), user avatar dropdown (profile, settings, logout). | None | `useAuth`, `useTheme`, `useRouter`, `usePathname` |

#### `navigation/`

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `CollapsibleNavSection.tsx` | Accordion-style nav group (using Radix `Collapsible`). Shows section icon/title; expands to sub-items. Highlights active route. | `{ id, title, icon, iconColor, items: NavSubItem[], collapsed, toolKey? }` | `usePathname` (for active state) |
| `SimpleNavItem.tsx` | Single flat nav item in the sidebar (no children). Shows icon + label, active highlight via `NavLink`. | `{ title, url, icon, iconColor, collapsed, badge? }` | None (uses `NavLink`) |

#### `nexus/`

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `NexusHeader.tsx` | Top header for the Nexus page showing provider status badges (OpenAI/Gemini/fal). | `{ settings: LLMSettings \| null }` | `useProviderKeyStatus` |
| `NexusTabs.tsx` | Tab switcher for Console / Prompts / Agents. | `{ activeTab, onTabChange }` | None |
| `NexusConsole.tsx` | AI chat console with model selector, parameter sliders (temperature, max tokens), streaming response view with `ReactMarkdown` (lazy). | Complex - accepts `settings`, model config, message state, callbacks | `useNexusConsoleController` (via screen) |
| `AgentConfigGrid.tsx` | Selection grid of all agents for the Nexus Agents tab. Shows active/inactive status. | `{ selectedAgentId: string \| null, onSelectAgent: (id: string) => void }` | `useAllAgentSettings` |
| `AgentConfigPanel.tsx` | Right panel when an agent is selected in Nexus. Edits system prompt, model selection, active toggle, and runs a quick test chat. | `{ agentId: string \| null, settings: LLMSettings }` | `useAgentSettings`, `useUpsertAgentSettings`, `useAIChat` |
| `AgentModelConfig.tsx` | Sub-panel for selecting text/image/video models for an agent. | `{ agentId, settings, ... }` | None (controlled) |
| `AgentSystemPrompt.tsx` | Textarea sub-panel for editing an agent's system prompt. | `{ value, onChange }` | None (controlled) |
| `PromptLibrary.tsx` | Two-tab prompt browser: static prompt templates (from `promptLibraryConstants.ts`) and user quick prompts from DB. | `{ onSelectPrompt, onSelectQuickPrompt, selectedPromptId }` | `useQuickPrompts`, `useDeleteQuickPrompt`, `useCreateQuickPrompt` |
| `PromptCard.tsx` / `PromptCategoryList.tsx` / `PromptListView.tsx` | Sub-components of the prompt library for rendering category groups and individual prompt cards. | Prompt/category data props | None |
| `QuickPrompts.tsx` | Horizontal scrollable quick-prompt chips above the chat input. | `{ onSelectPrompt, quickPrompts }` | None (controlled) |
| `QuickPromptCard.tsx` / `QuickPromptEditor.tsx` / `QuickPromptListView.tsx` | CRUD sub-components for user-saved quick prompts. | Quick prompt data and callbacks | `useUpdateQuickPrompt`, `useDeleteQuickPrompt` |
| `NewPromptDialog.tsx` / `NewQuickPromptDialog.tsx` | Dialogs for creating prompt templates and quick prompts. | `{ open, onOpenChange, onSave }` | None (controlled forms) |
| `ProviderStatus.tsx` | Card showing connection status of each LLM provider (OpenAI, Gemini, fal). | `{ settings: LLMSettings \| null }` | `useProviderKeyStatus` |
| `agentGradients.ts` | Constant map of `agentId -> TailwindCSS gradient classes`. Not a component. | N/A | N/A |
| `promptLibraryConstants.ts` / `promptLibraryTypes.ts` | Static prompt data and shared TypeScript types for the prompt library. | N/A | N/A |

#### `osha/`

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `OshaChat.tsx` | Main chat UI for Osha. Input bar, mode selector, file attachment, optimize-draft button, message list with `DeepResearchProgress` overlay. | `{ settings: OshaSettings, messages: OshaMessage[], ... }` | `useOshaChatController` |
| `OshaHeader.tsx` | Page header banner for Osha showing mode, connection status, and compliance badge. | `{ mode: string, isConnected: boolean, complianceStatus?: string }` | `useRouter` |
| `OshaFloatingBubble.tsx` | Global floating chat bubble rendered in `MainLayout`. Hidden on `/ai-agents/osha`. Color and label driven by Osha settings. | None | `useOshaSettings`, `useOshaMessages`, `useClearOshaHistory`, `useAuth`, `useIsMobile`, `usePathname` |
| `OshaMessageBubble.tsx` | Single message bubble. Renders `ReactMarkdown` (lazy), Mermaid diagrams, image attachments, copy button, and "Save to Brain" actions. | `{ message: OshaMessage, onDelete? }` | `SaveImageToBrainDialog`, `SaveTextToBrainDialog` (sub-dialogs); `useState` for copy/expand |
| `OshaSettings.tsx` | Settings form for Osha (model, system prompt, temperature, file/image modes, notifications). | `{ settings: OshaSettings }` | `useUpsertOshaSettings`, `react-hook-form` |
| `OshaFileAttachment.tsx` | File chip / preview shown in the input bar before sending. | `{ file, onRemove }` | None |
| `SaveImageToBrainDialog.tsx` / `SaveTextToBrainDialog.tsx` | Dialogs to save an image or text excerpt from a message directly to the Brain knowledge base. | `{ open, onOpenChange, content, ... }` | `useUploadBrainDocument` |
| `oshaConstants.ts` | Mode arrays (`ASSISTANT_MODES`, `POWER_MODES`, `DEEP_RESEARCH_STAGES`), key constants. Not a component. | N/A | N/A |

#### `pixel/`

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `PixelTopBar.tsx` | Mode selector (Facebook/Instagram/TikTok), expand toggle, theme toggle (light/dark), mobile overflow menu. | `{ mode, onModeChange, isExpanded, onToggleExpand, pixelTheme, onToggleTheme }` | `useRouter` |
| `PixelStudio.tsx` | Chat-style prompt input + output card area for Pixel. Handles file attachments, Wishpedia image refs, emoji picker, optimize-draft button, and sends to `pixel-chat` edge function. | `{ settings, messages, wishpediaImageRefs, onAddWishpediaImages, onRemoveWishpediaImage, ... }` | `useSendPixelMessage`, `useDeletePixelMessage`, `useOptimizeDraft` |
| `PixelControlPanel.tsx` | Left control panel: output type selector (image/video), post size chips, and `WishReferencePanel`. | `{ mode, postType, setPostType, postSize, setPostSize, ..., wishpediaImageRefs, ... }` | None (controlled) |
| `PixelContextPanel.tsx` | Context/reference panel showing selected Wishpedia image thumbnails. | `{ refs, onRemove }` | None |
| `PixelBlueprintPanel.tsx` | Visual templates (blueprints) panel for Pixel. Lists saved blueprints from DB. | `{ onSelectBlueprint }` | `usePixelBlueprints` |
| `PixelHeader.tsx` | Page header for Pixel with title, status badge, and nav buttons. | `{ isConnected, ... }` | None |
| `PixelMessageBubble.tsx` | Output card for a Pixel generation. Shows generated image/video, prompt used, download button. | `{ message: PixelMessage }` | None |
| `PixelOutputCard.tsx` | Formatted output card wrapping the generated media with metadata. | `{ message }` | None |
| `PixelSettings.tsx` | Settings form for Pixel (model, image size, style presets). | `{ settings: PixelSettings }` | `useUpsertPixelSettings` |
| `WishReferencePanel.tsx` | Searchable Wishpedia entry picker for reference images. Multi-select entries, shows thumbnail chips, supports native drag-and-drop. 5-image cap, 3 MB guard. | `{ wishpediaImageRefs, onAdd, onRemove, onDropFiles, pendingAttachments }` | `useWishpediaEntries`, `useWishpediaImages` |
| `SavePixelToBrainDialog.tsx` | Dialog to save a Pixel-generated image to the Brain knowledge base. | `{ open, onOpenChange, imageUrl, ... }` | `useUploadBrainDocument` |
| `pixelConstants.tsx` | `EMPTY_STAGE_CARDS`, `MODE_PLACEHOLDERS` constants. Not a component. | N/A | N/A |

#### `profile/`

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `ProfileHero.tsx` | Avatar + name + role hero section. Camera overlay to upload/remove avatar. | `{ fullName, email, role, avatarUrl, isLoadingAvatar, joinDate, onAvatarClick, onRemoveAvatar, onEditProfile }` | None (controlled) |
| `ProfileInfoCard.tsx` | Inline name edit and email-change trigger. Shows "pending email change" amber badge when applicable. | `{ fullName, email, isEditingName, editNameValue, isSavingName, pendingEmailChange?, onEditName, onCancelEditName, onChangeNameValue, onSaveName, onEmailChange }` | None (controlled) |
| `ProfileSecurityCard.tsx` | Security section: role badge and "Change Password" button. | `{ role: string, onPasswordChange: () => void }` | None |

#### `promptor/`

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `PromptorCreate.tsx` | "Create from directive" tab. Text area for a brief, output-type selector, submit button, result panel. | `{ settings: PrompterSettings }` | `useRunPromptor` (`action: 'create'`), timer cleanup |
| `PromptorOptimize.tsx` | "Optimize existing prompt" tab. Accepts a raw prompt and returns an optimized version. | `{ settings: PrompterSettings }` | `useRunPromptor` (`action: 'optimize'`), timer cleanup |
| `PromptorHeader.tsx` | Page header for Promptor. | `{ isConnected }` | None |
| `PromptorHistory.tsx` | Searchable, filterable list of past Promptor runs from the DB. Supports bulk delete. | `{ runs: PromptorRun[] }` | `useDeletePromptorRun`, `useDeleteAllPromptorRuns`, local search/filter/sort state |
| `PromptorOutput.tsx` | Output display panel with copy button and save-to-history action. | `{ output: PromptorOutput \| null, isLoading }` | None |
| `PromptorSettings.tsx` | Settings panel for Promptor (model, Heart rules, Brain context toggles, custom system prompt). | `{ settings: PrompterSettings }` | `useUpdatePromptorSettings` |
| `briefPlaceholders.ts` | Rotating placeholder strings for the brief textarea. Not a component. | N/A | N/A |

#### `release-notes/`

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `FeaturedUpdate.tsx` | Hero card for the most recent release (gradient background, Sparkles icon). | `{ update: ReleaseUpdate }` | None |
| `UpdateFeed.tsx` | List of `UpdateCard` items. Shows empty state message when none match filters. | `{ updates: ReleaseUpdate[], feedback, onFeedback }` | None |
| `UpdateCard.tsx` | Card for a single release update with type badge, date, description, and thumbs up/down feedback buttons. | `{ update: ReleaseUpdate, feedback, onFeedback }` | None |
| `PlannedReleases.tsx` | Grid of upcoming planned releases with status badges (planned, in-progress, completed). | `{ releases: PlannedRelease[] }` | None |
| `ReleaseNotesFilters.tsx` | Search + type filter bar. | `{ search, onSearch, type, onTypeChange }` | None |
| `ReleaseNotesHeader.tsx` | Page header with title and subtitle. | None | None |
| `FeedbackWidget.tsx` | Summary row showing feedback tallies. | `{ feedback }` | None |
| `mockData.ts` / `mockPlannedData.ts` / `types.ts` | Static mock release data and TypeScript types. Not components. | N/A | N/A |

#### `settings/`

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `LLMProvidersSettings.tsx` | "AI Providers" tab. Provider cards for OpenAI, Gemini, fal.ai with model selectors, key editor, and test buttons. | None (reads context) | `useLLMSettings`, `useUpdateLLMSettings`, `useAuth`, `useProviderKeyStatus` |
| `ProviderCard.tsx` | Reusable card for a single LLM provider (logo, key status badge, model selectors, `ApiKeyEditor`, test button). | `{ provider, settings, keySource, isAdmin, ... }` | `useAIChat`, `useToast` |
| `ApiKeyEditor.tsx` | Masked password input to set/reset a provider API key. Admin-only (returns `null` for non-admins). Clears state on save. | `{ provider: 'openai' \| 'gemini' \| 'fal', keySource: KeySource, isAdmin: boolean }` | `useUpdateProviderKey`, `useResetProviderKey`, local masked/reveal state |
| `ProviderModelSelectors.tsx` | Dropdowns for text, image, and video model selection for a provider. | `{ provider, settings, onUpdate, ... }` | None (controlled) |
| `SystemPromptsPanel.tsx` | Edit global system prompt overrides per agent. | None | `useLLMSettings`, `useUpdateLLMSettings` |
| `MasterMindSettings.tsx` | "MasterMind" settings tab. Manage brain categories and heart categories. | None | `useBrainCategories`, `useHeartCategories`, related CRUD hooks |
| `VectorStorePanel.tsx` | Embedding stats and bulk re-index controls. | None | `useBulkWishpediaIndex`, `useUnindexedEntryCount` |
| `BrandingSettings.tsx` | "Branding" tab. Upload logos, set app title, pick accent color with icon picker gallery. | None | `useBranding`, `useUpdateBranding`, `useFiles`, `useUploadFile` |
| `FilesManagerSettings.tsx` | File manager settings (bucket policy, allowed types). | None | `useFilesSettings` |
| `UsersManagement.tsx` | Admin user list: invite user, view users, open edit sheet. | None | `useUsers`, `useInviteUser`, `useAuth` |
| `EditUserSheet.tsx` | Slide-over sheet to edit a user's name, role, and all tool permission levels. | `{ user, open, onOpenChange }` | `useUserPermissions`, `useUpdateUserPermissions` |
| `PermissionLevelSelector.tsx` | Reusable `none/view/limited/full` segmented button group. | `{ value: PermissionLevel, onChange, label }` | None |
| `AccountSettings.tsx` | "Account" tab (legacy path, lives inside settings). Avatar, name, email, password change forms. | None | `useAuth`, `useFiles`, `useUploadFile` |
| `AITestConsole.tsx` | Quick test console embedded in settings to fire a test message at the selected provider. | `{ settings }` | `useAIChat` |
| `ModelTestButton.tsx` | Single button that fires a test call and shows a pass/fail badge. | `{ model, provider, ... }` | `useAIChat` |
| `TestAllPanel.tsx` | Runs all configured models in sequence and displays a results table. | `{ steps: TestAllStep[] }` | Local `isRunning`, `results` state |
| `PulseSettings.tsx` | "Pulse" tab. upload-post.com API key editor, connected profiles, platform pages. | None | `usePulseSettings`, `usePulseAccounts`, `usePulsePlatforms`, `useUpdatePulseQueueSettings` |

#### `wishpedia/`

| File | Purpose | Props | Notable Hooks/State |
|---|---|---|---|
| `WishpediaEntryCard.tsx` | Card for a single Wishpedia entry in the masonry index grid. Glass-morphism style, cover image, category badge. | `{ entry: WishpediaEntry, category?: WishpediaCategory }` | `useWishpediaImages`, `useEntryIndexStatus` |
| `WishpediaCharacterView.tsx` | Full entry detail view. Cinematic `aspect-[21/9]` hero image, metadata strip, filmstrip thumbnails, masonry free gallery, lightbox integration. | `{ entry: {...}, images: WishpediaEntryImage[], category? }` | `useState` (lightboxOpen, lightboxIndex, activeFilmstripIndex) |
| `WishpediaLightbox.tsx` | Full-screen image lightbox (shadcn `Dialog`). Keyboard arrow navigation. | `{ images, activeIndex, open, onOpenChange, onNavigate }` | `useCallback` for keyboard handler |
| `WishpediaCreateDialog.tsx` | Dialog to create a new Wishpedia entry (name, category, description). | `{ open, onOpenChange }` | `useCreateWishpediaEntry`, `useWishpediaCategories`, `useRouter` |
| `WishpediaAngleGrid.tsx` | Grid showing all angle slots for an entry (front, back, left, right, top, bottom) with upload/replace controls. | `{ entryId, images, onUpload, onDelete }` | `useUploadWishpediaImage`, `useDeleteWishpediaImage` |
| `WishpediaFreeGallery.tsx` | Masonry gallery for non-angle images associated with an entry. | `{ entryId, images, onUpload, onDelete }` | `useUploadWishpediaImage`, `useDeleteWishpediaImage` |
| `SelectFromFilesDialog.tsx` | Dialog to select an image from the Files Manager to use in Wishpedia. | `{ open, onOpenChange, onSelect: (file: {url, name, mime_type}) => void }` | `useFiles` |

---

### 6. Design System

#### Color Tokens

All tokens are CSS custom properties in `src/app/globals.css`, consumed via `hsl(var(--token))` in `tailwind.config.ts`.

| Token | Light Value (HSL) | Dark Value (HSL) | Notes |
|---|---|---|---|
| `--background` | `210 20% 98%` (near-white blue-gray) | `220 25% 6%` (near-black) | |
| `--foreground` | `210 25% 15%` | `210 20% 95%` | |
| `--card` | `0 0% 100%` | `220 25% 8%` | |
| `--card-foreground` | `210 25% 15%` | `210 20% 95%` | |
| `--popover` | `0 0% 100%` | `220 25% 8%` | |
| `--popover-foreground` | `210 25% 15%` | `210 20% 95%` | |
| `--primary` | `197 78% 37%` (Fortun Blue, darkened) | `197 78% 55%` | Darkened from original `45%` to `37%` in light mode for WCAG AA 4.5:1 contrast vs white (fix UI-021) |
| `--primary-foreground` | `0 0% 100%` | `0 0% 100%` | |
| `--secondary` | `197 100% 97%` | `197 40% 15%` | |
| `--secondary-foreground` | `197 78% 35%` | `197 78% 80%` | |
| `--muted` | `210 25% 96%` | `220 25% 12%` | |
| `--muted-foreground` | `210 15% 45%` | `210 15% 55%` | |
| `--accent` | `197 100% 92%` | `197 40% 18%` | |
| `--accent-foreground` | `197 78% 30%` | `197 78% 85%` | |
| `--destructive` | `9 100% 60%` (Fortun Red) | `9 100% 55%` | |
| `--destructive-foreground` | `0 0% 100%` | `0 0% 100%` | |
| `--border` | `210 25% 92%` | `220 25% 14%` | |
| `--input` | `210 25% 92%` | `220 25% 14%` | |
| `--ring` | `197 78% 45%` | `197 78% 55%` | |
| `--sidebar-background` | `0 0% 100%` (white) | `220 30% 5%` (deep slate) | |
| `--sidebar-foreground` | `210 25% 25%` | `210 20% 90%` | |
| `--sidebar-primary` | `197 78% 45%` | `197 78% 55%` | |
| `--sidebar-primary-foreground` | `0 0% 100%` | `0 0% 100%` | |
| `--sidebar-accent` | `197 100% 97%` | `197 40% 12%` | |
| `--sidebar-accent-foreground` | `197 78% 35%` | `197 78% 80%` | |
| `--sidebar-border` | `210 25% 94%` | `220 25% 10%` | |
| `--sidebar-ring` | `197 78% 45%` | `197 78% 55%` | |

**Fortun Custom Colors** (available as Tailwind utility classes):

| Token | Value (HSL) | Tailwind Class |
|---|---|---|
| `--fortun-blue` | `197 78% 45%` | `bg-fortun-blue`, `text-fortun-blue` |
| `--fortun-blue-light` | `195 100% 75%` | `bg-fortun-blue-light` |
| `--fortun-blue-lighter` | `195 100% 85%` | `bg-fortun-blue-lighter` |
| `--fortun-red` | `9 100% 60%` | `bg-fortun-red`, `text-fortun-red` |
| `--fortun-red-light` | `9 100% 70%` | `bg-fortun-red-light` |
| `--fortun-red-lighter` | `9 100% 85%` | `bg-fortun-red-lighter` |

**Primary color note:** Light-mode primary is `hsl(197 78% 37%)` (#2E96C1 approx), which achieves WCAG AA 4.5:1 contrast ratio against white. The comment in `globals.css` documents this was darkened from `45%` to resolve audit finding UI-021.

#### Typography

Fonts loaded in `src/app/layout.tsx` via `next/font/google`:

| Font | Variable | Weights | Usage |
|---|---|---|---|
| Inter | `--font-inter` | 400, 500, 600, 700 | Body (`font-sans` base, applied to `body`) |
| Poppins | `--font-poppins` | 600, 700 | Headings (`h1`–`h6`) |

Both use `display: swap` and `latin` subset. The `@tailwindcss/typography` plugin is loaded via `tailwind.config.ts` `plugins` array; it is used in `ReactMarkdown` rendered content (primarily in `NexusConsole` and `OshaMessageBubble`).

#### Spacing and Radius

| Token | Value | Tailwind mapping |
|---|---|---|
| `--radius` | `0.75rem` (12px) | `rounded-lg` = `var(--radius)`, `rounded-md` = `calc(var(--radius) - 2px)`, `rounded-sm` = `calc(var(--radius) - 4px)` |

Container config: `center: true`, `padding: '2rem'`, max-width breakpoint `2xl: 1400px`.

#### Theme System

- `next-themes` v0.3.0 with `ThemeProvider` mounted in `src/app/providers.tsx`.
- Config: `attribute="class"`, `defaultTheme="light"`, `enableSystem: true`, `disableTransitionOnChange: true`.
- Tailwind config: `darkMode: ["class"]` - dark mode activates by toggling `.dark` on `<html>`.
- The `Header` component provides the Sun/Moon toggle button that calls `setTheme` from `useTheme`.
- **Per-page theme override:** The Pixel agent page (`src/screens/PixelAgent`) stores a `pixel-theme` value in `localStorage` and applies `data-pixel-theme="light"` or `data-pixel-theme="dark"` to the root `<div>` of the Pixel container. `src/app/globals.css` contains matching `[data-pixel-theme='light']` and `[data-pixel-theme='dark']` blocks that re-declare all CSS variables, scoping Pixel's theme independently of the global app theme.

#### Layout Patterns

**Main shell** (all protected routes):

```
SidebarProvider
  AppSidebar        (collapsible icon/expanded, sticky left)
  div.flex-col.flex-1
    Header           (breadcrumb + theme + user menu)
    main#main-content (p-3 sm:p-4 md:p-6, overflow-hidden, flex-col)
      {page content}
  OshaFloatingBubble (fixed, bottom-right)
```

**Screen card pattern:** Most screens open with `div.flex.h-full.p-0` wrapping a single `div.bg-card.rounded-xl.border.shadow-sm` that fills the space, with an internal header border-b and a scrollable body area (`ScrollArea` or `overflow-y-auto`).

**Sidebar:** Uses `@/components/ui/sidebar` (Radix-based). Collapsible between icon mode (`state='collapsed'`) and expanded mode. Width is controlled by CSS; logo swaps between `FortunLogo variant='mini'` and `variant='full'`.

**Modals / Dialogs:** shadcn `Dialog` for most overlays (upload, create, edit, lightbox). shadcn `Sheet` (slide-over) for `FileInspector` and `EditUserSheet`.

**Card grid:** Typically `grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6` for agent/file grids. Wishpedia uses CSS-only masonry: `columns-2 sm:columns-3 lg:columns-4 xl:columns-5` with `break-inside-avoid` per card.

#### State Patterns

**Loading:** Page-level loading uses `src/app/(protected)/loading.tsx` (skeleton layout). Component-level loading uses `<Skeleton>` from `src/components/ui/skeleton`. Inline spinners use `<Loader2 className="animate-spin">` from Lucide.

**Empty states:** Typically a centered flex column with a muted icon, title text, and optional CTA button. Pattern visible in `FilesGrid`, `HeartRules`, `WishpediaIndex`, `PromptorHistory`.

**Error states:** `ErrorBoundary` class component for render errors (reports to Sentry). `(protected)/error.tsx` for route-segment errors (Next.js `error.tsx` convention). Inline query errors surfaced via Sonner toast (`toast.error(...)`).

**Toast / Notifications:** Sonner v1.7.4 is the primary toast system, exposed via `import { toast } from 'sonner'`. A legacy shadcn `Toaster` (`src/components/ui/toaster`) is also mounted but Sonner is the active system. Both are mounted in `src/app/providers.tsx`. `src/components/ui/sonner.tsx` wraps Sonner and wires its theme to `next-themes`.

#### Iconography

Lucide React v0.462.0 is the sole icon library. All icons are imported by name from `'lucide-react'`. No image-based icons, no emoji as functional UI icons.

#### Custom Keyframe Animations

All animations defined in `src/app/globals.css`. All respect `prefers-reduced-motion: reduce` via a global override block at the bottom of the file.

| Class / Keyframe | Effect | Usage |
|---|---|---|
| `wpCardReveal` / `.wp-card-reveal` | Fade in + translate Y 12px + scale 0.97 -> 1 (0.5s ease-out) | Wishpedia index entry cards |
| `wpHeroReveal` / `.wp-hero-reveal` | Fade in + translate Y 16px (0.6s ease-out) | Wishpedia entry hero section |
| `wpIconPulse` / `.wp-icon-pulse` | Amber box-shadow pulse (3s infinite) | Wishpedia index title icon |
| `wpShimmer` / `.wp-shimmer` | Horizontal shimmer sweep (1.8s infinite) | Wishpedia loading skeletons |
| `wp-fade-in` / `.wp-animate-in` | Fade in + translate Y 6px (0.35s ease-out) | General Wishpedia entrance; stagger classes `.wp-stagger-1` through `.wp-stagger-8` in 40ms steps |
| `profileFadeInUp` / `.profile-fade-in-up` | Fade in + translate Y 16px (0.5s ease-out) | Profile page card entrance |
| `accordion-down` / `accordion-up` | Radix accordion height animation (0.2s) | shadcn `Accordion` (via Tailwind plugin) |

`.profile-glass-card` is a utility class (not a keyframe) providing glass-morphism shadow and hover transitions for the profile page cards.

---

---

### 7. Agent Architecture

This section documents every AI agent in the Fortun Wishnet platform as of 2026-05-21.

---

## Summary Table

| Agent | Status | Provider / Model | Backend fn | Route |
|-------|--------|-----------------|------------|-------|
| Nexus | fully built | OpenAI or Gemini (user-selectable) | `ai-chat` | `/ai-agents/nexus` |
| Osha | fully built | OpenAI (default `gpt-4o`) or Gemini (fallback) | `osha-chat` | `/ai-agents/osha` |
| Pixel | fully built | OpenAI or Gemini (per `llm_settings.active_image_provider` / `active_video_provider`) | `pixel-chat` | `/ai-agents/pixel` |
| Promptor | fully built | OpenAI (default `gpt-4o`) or Gemini (per `llm_settings.active_text_provider`) | `promptor` | `/ai-agents/promptor` |
| Pulse | scaffolded/coming-soon | none (settings proxy only via `pulse-api`) | `pulse-api` | `/ai-agents/pulse` |
| Whisper | scaffolded/coming-soon | none | none | `/ai-agents/whisper` |
| ATLAS | scaffolded/coming-soon | none | none | `/ai-agents/atlas` |
| Muse | DB tables only (no route, no UI, no edge fn) | none | none | none |

---

#### Nexus

**Build status:** fully built

**Purpose:** Central LLM control hub for testing provider connections (OpenAI, Gemini), configuring agent settings (model, temperature, max tokens, system prompt), managing quick prompts, and firing ad-hoc text/image/video/deep-research calls from a developer console.

**UI location:**
- Screen: `src/screens/NexusAgent.tsx`
- Components: `src/components/nexus/` (NexusHeader, NexusTabs, NexusConsole, AgentConfigPanel, AgentConfigGrid, PromptLibrary, QuickPrompts, ProviderStatus, AgentModelConfig, AgentSystemPrompt)
- Route page: `src/app/(protected)/ai-agents/nexus/page.tsx`

**Backend location:** `supabase/functions/ai-chat/index.ts`

**Model and provider:**
- Provider and model are passed per-request (`provider: 'openai' | 'gemini' | 'fal'`, `model: string`).
- For `chat` action, falls back to `llm_settings.openai_text_model` (default `gpt-4o`) or `llm_settings.gemini_text_model`.
- For `generate-image`: `llm_settings.openai_image_model` (default `gpt-image-1`) or `llm_settings.gemini_image_model`.
- For `generate-video`: `llm_settings.openai_video_model` (default `sora-2`) or `llm_settings.gemini_video_model`.
- For `start-research` / `poll-research`: `llm_settings.openai_deep_research_model` (default `o3-deep-research`).
- fal.ai image/video models are routed through a direct POST to `fal.run/{model}` with `Authorization: Key {FAL_KEY}`.

**System prompt:**
- User-supplied via the `systemPrompt` field in the request body. Defaults to `'You are a helpful AI assistant.'` if omitted.
- Default per-agent prompts stored in `src/components/nexus/AgentConfigPanel.tsx` (`defaultSystemPrompts` map):
```
nexus:    'You are Nexus, the central control hub for AI operations. You help users test and configure AI capabilities with precision and clarity.'
osha:     'You are Osha, a friendly platform assistant. You help users navigate the platform, answer questions, and provide guidance on features and capabilities.'
whisper:  'You are Whisper, a podcast producer. You write engaging, well-structured podcast scripts and prepare them for natural-sounding audio narration.'
pulse:    'You are Pulse, a social media strategist. You create engaging content strategies, analyze trends, and optimize social presence for maximum impact.'
pixel:    'You are Pixel, a visual designer specialist. You create stunning visuals, optimize image generation prompts, and ensure visual consistency across projects.'
atlas:    'You are ATLAS, the Kickstarter operations control agent. ...'
```
- DB-overrides stored in `agent_settings` table, queried via `src/hooks/useAgentSettings.ts`. Highest-version active row from `system_prompts` table also consulted (via `supabase/functions/_shared/system-prompts.ts`).
- Before every `chat` call, Heart rules (global + `assigned_agents.cs.{"nexus"}`) and Brain RAG chunks (up to 8, threshold 0.3) are prepended to the system prompt (`supabase/functions/ai-chat/index.ts` lines 512-535).

**Tool calls / integrations:**
- Heart rules injected via `fetchNexusHeartRules` (direct Supabase query).
- Brain context injected via `searchBrainForNexus` (OpenAI `text-embedding-3-small` + `match_knowledge` RPC).
- SSE streaming supported for OpenAI text chat (`action: 'chat'`, `stream: true`).
- Deep-research uses OpenAI Responses API (`/v1/responses`) with `web_search_preview` tool; supports async (`background: true`) + polling.
- Image generation: OpenAI Images API (`/v1/images/generations`) or Gemini `generateContent` or fal.ai `fal.run/{model}`.
- Video generation: OpenAI Sora (`/v1/videos`) or Gemini Veo (`predictLongRunning`).
- Per-user daily quota enforced via `supabase/functions/_shared/usage-quota.ts` for LLM actions.

**Input / output schema:**
```typescript
// Request
{
  action: 'chat' | 'test-connection' | 'generate-image' | 'generate-video'
        | 'start-research' | 'poll-research' | 'check-keys';
  provider: 'openai' | 'gemini' | 'fal';
  model?: string;
  message?: string;
  apiKey?: string;          // test-connection only
  temperature?: number;
  systemPrompt?: string;
  responseId?: string;      // poll-research
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  stream?: boolean;         // chat SSE
}

// Response (chat)       { content: string }
// Response (image)      { imageUrl: string }
// Response (video)      { videoUrl: string } (binary blob piped directly)
// Response (research)   { responseId: string, status: string } or { status: 'completed', content: string }
// Response (check-keys) { openai: boolean, gemini: boolean, fal: boolean }
```

**Known TODOs:** None found in source. Legacy `check-keys` action in `ai-chat` still returns old `{ openai: boolean, gemini: boolean }` shape but has no callers (noted in `CLAUDE.md` as "can be removed in a future cleanup pass").

---

#### Osha

**Build status:** fully built

**Purpose:** Platform assistant, creative brainstorming partner, deep researcher, and knowledge-powered Q&A agent; handles guidance, ideation, document analysis, image generation, web search, and saving responses to the Brain knowledge base.

**UI location:**
- Screen: `src/screens/OshaAgent.tsx`
- Components: `src/components/osha/` (OshaChat, OshaControlPanel, OshaSettings, OshaTopBar, and others)
- Route page: `src/app/(protected)/ai-agents/osha/page.tsx`

**Backend location:** `supabase/functions/osha-chat/index.ts`

**Model and provider:**
- Text chat: `llm_settings.openai_text_model` (fallback `gpt-4o`) when OpenAI key available; else `llm_settings.gemini_text_model` (fallback `gemini-1.5-pro`). See `supabase/functions/osha-chat/index.ts` line 2208.
- Deep research: `llm_settings.openai_deep_research_model` (fallback `o3-deep-research`). OpenAI only.
- Web search: hard-coded `gpt-4o` via OpenAI Responses API (`web_search_preview` tool). See line 1601.
- Image generation (when enabled): resolved from `osha_settings.image_provider` + `osha_settings.image_model` (defaults `openai` / `gpt-image-1`).
- File analysis: `osha_settings.file_analysis_model` (default `gemini-2.0-flash`) for PDF extraction via Gemini; or OpenAI vision model for PDF via `extractPdfWithOpenAI`.
- Clarification / query reformulation sub-calls: hard-coded `gpt-4.1-mini`.
- All keys resolved: `llm_settings.openai_api_key` then `Deno.env.get('OPENAI_API_KEY')`.

**System prompt:**
Dynamically built by `buildSystemPrompt` in `supabase/functions/osha-chat/index.ts` (lines 164-376). Key opening (truncated for space; full prompt in file):

```
You are Osha, the official AI assistant of Fortun Wishnet.

You operate exclusively inside the Fortun Wishnet platform. You are not a public chatbot,
cannot be embedded on external sites, and must never reveal internal system details.

## YOUR ROLE
You assist authenticated Fortun Wishnet users with questions, guidance, reasoning, brainstorming,
structured outputs, document analysis, and content generation - all within the boundaries defined
by Heart rules and Brand knowledge.

[PLATFORM KNOWLEDGE section - ~200 lines describing all platform modules and live agent registry]

## KNOWLEDGE RETRIEVAL PROTOCOL
1. TIER 0 - PLATFORM SELF-KNOWLEDGE: answer from PLATFORM KNOWLEDGE section
2. TIER 1 - BRAIN KNOWLEDGE BASE: check retrieved Brand Knowledge
3. TIER 2 - GENERAL KNOWLEDGE
4. TIER 3 - WEB SEARCH (requires user confirmation)

## MANDATORY HEART RULES - ALWAYS ENFORCE, ALWAYS TAKE PRECEDENCE
[Heart rules injected per-request, fetched live from DB]

## BRAND KNOWLEDGE (from Fortun Mastermind Brain & Wishpedia)
[Brain RAG chunks injected per-request]
...
```

Mode-specific instruction block (from `defaultModeInstructions`, overridable by `system_prompts` DB table):
- `guide`: step-by-step, onboarding-friendly
- `operator`: concise, action-oriented
- `workshop`: guided brainstorming facilitation

**Tool calls / integrations:**
- Heart rules: `fetchHeartRules` queries `heart_rules` table (global + `assigned_agents.cs.{"osha"}`), sanitized before injection.
- Brain RAG: `searchBrain` generates embedding via OpenAI `text-embedding-3-small`, queries `match_knowledge` RPC (threshold 0.2, filter `brain_document` + `wishpedia_entry`, filter `agent_id: 'osha'`).
- URL content fetching: `fetchUrlContent` via Jina Reader (`https://r.jina.ai/{url}`), up to 3 URLs per message, 30,000 char cap, 15s timeout.
- Web search: OpenAI Responses API with `web_search_preview` tool. Triggered on explicit phrase or user confirmation after Osha offers to search.
- Deep research: 3-step flow (clarify, execute, poll) via OpenAI Responses API (`background: true`). Uses `o3-deep-research` by default.
- Image generation: OpenAI Images API or Gemini image model, when `osha_settings.image_generation_enabled` is `true` and `detectImageIntent` matches the message.
- PDF extraction: `extractPdfWithGemini` (primary) or `extractPdfWithOpenAI` (fallback), based on `osha_settings.file_analysis_provider`.
- Save to Brain: `save-to-brain` action cleans content via `gpt-4o-mini`, uploads PDF to `brain-documents` storage bucket, inserts into `brain_documents` + `brain_sections` tables, then triggers `process-embeddings` edge function.
- Audit logging: every turn writes to `osha_audit_logs` table when `internal_audit_logging` is enabled.
- Message persistence: `osha_messages` table (max 10,000 messages; pg_cron trim job scheduled).
- Promptor draft optimization: via `useOptimizeDraft` hook calling `promptor` edge function action `optimize-draft` (Wand button in chat input, see `src/hooks/osha/useOshaChatController.ts`).

**Input / output schema:**
```typescript
// Request
{
  action: 'chat' | 'get-settings' | 'save-settings' | 'clear-history'
        | 'deep-research' | 'deep-research-clarify' | 'deep-research-execute'
        | 'poll-research' | 'web-search' | 'save-to-brain';
  message?: string;
  mode?: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  attachments?: { name: string; type: string; content: string; isImage?: boolean }[];
  settings?: Partial<OshaSettings>;
  responseId?: string;      // poll-research
  title?: string;           // save-to-brain
  content?: string;         // save-to-brain / deep-research-execute (clarification answers)
  category?: string;        // save-to-brain
}

// Response (chat)                 { content: string, isImage?: boolean, imageUrl?: string, audit: {...} }
// Response (deep-research-execute) { responseId: string, status: string } or { status: 'completed', content: string }
// Response (poll-research)        { status: string, content?: string, stage?: number }
// Response (web-search)           { content: string }
// Response (get-settings)         { settings: OshaSettings | null }
// Response (save-to-brain)        { success: true, document: {...} }
```

**Known TODOs:** The `deep-research` action (legacy, kept for backward compat) and `deep-research-execute` have near-duplicate logic. Line 1429 comment: `// ── DEEP RESEARCH (legacy, kept for backward compat)`. No explicit TODO/FIXME markers found.

---

#### Pixel

**Build status:** fully built

**Purpose:** Visual Creator AI that generates images and videos for social media, presentations, and marketing; includes a Blueprint system for reusable visual styles and Wishpedia character visual grounding.

**UI location:**
- Screen: `src/screens/PixelAgent.tsx`
- Components: `src/components/pixel/` (PixelStudio, PixelControlPanel, PixelTopBar, PixelBlueprintPanel, WishReferencePanel, and others)
- Route page: `src/app/(protected)/ai-agents/pixel/page.tsx`

**Backend location:** `supabase/functions/pixel-chat/index.ts`

**Model and provider:**
- Image generation: `llm_settings.active_image_provider` (default `openai`) selects provider; model resolved from `llm_settings.openai_image_model` (default `gpt-image-1`) or `llm_settings.gemini_image_model` (default `gemini-2.5-flash-image`). See `supabase/functions/pixel-chat/index.ts` lines 1267-1270.
- Video generation: `llm_settings.active_video_provider` (default `openai`); model from `llm_settings.openai_video_model` (default `sora-2`) or `llm_settings.gemini_video_model` (default `veo-3.1-generate-preview`). See lines 1037-1040.
- Text-only / diagram fallback: `llm_settings.openai_text_model` (fallback `gpt-4o`) or `llm_settings.gemini_text_model` (fallback `gemini-1.5-pro`). See line 1418.
- Blueprint AI generation: `llm_settings.active_text_provider` resolved to `openai_text_model` (default `gpt-4o`) or `gemini_text_model` (default `gemini-2.5-flash`). See lines 847-848.
- All keys: `llm_settings.openai_api_key` then `Deno.env.get('OPENAI_API_KEY')` (same for gemini).

**System prompt:**
Built by `buildPixelSystemPrompt` (lines 281-401). Key opening:

```
You are Pixel, the Visual Creator AI of Fortun Wishnet. Your PRIMARY output is generated images.

## SESSION MEMORY - UNLIMITED RECALL
Messages may contain annotations: [Generated image: ...], [Generated video: ...], [Attached files: ...], [Format: ...]

## CORE DIRECTIVE
Generate an image for every creative request. Only respond with text when the user explicitly
asks for explanation, help, advice, or non-visual information.

## OPERATING LAW (mandatory)
1. Heart rules are ABSOLUTE.
2. Brain knowledge is authoritative Fortun visual identity and brand context.
3. Wishpedia entries are the CANONICAL visual reference for Fortun universe characters.
4. If Heart and Brain conflict, Heart wins.
...
## IDENTITY
- You are Pixel. Never claim to be GPT, ChatGPT, Claude, Gemini, or any other AI.
```

Injects: Heart rules section, Brain RAG section, Wishpedia canon note, active Blueprint context, target format (post type + dimensions), platform section, vocabulary/theme constraints, diagram instruction if needed.

**Tool calls / integrations:**
- Heart rules: `fetchHeartRules` (global + `assigned_agents.cs.{"pixel"}`).
- Brain RAG: `searchBrain` (threshold 0.2, no agent filter, limit 100, unrestricted access to full vector store).
- Wishpedia visual grounding: `searchWishpedia` (threshold 0.3, `filter_source_types: ['wishpedia_entry']`), enriches results with image URLs from `wishpedia_entry_images` table or metadata.
- Image generation: OpenAI Images API (`/v1/images/generations`) or Gemini `generateContent`; output uploaded to `files` storage bucket, saved to `files` table under a "Pixel AI" sector.
- Video generation: OpenAI Sora (`/v1/videos` submit + poll, 5-min timeout) or Gemini Veo (`predictLongRunning`, 10-min timeout); output persisted to `files` storage.
- Blueprint CRUD: `get-blueprints`, `save-blueprint`, `delete-blueprint` actions against `pixel_blueprints` table.
- Blueprint AI generation: `generate-blueprint` action uses text model to produce JSON blueprint grounded in Heart + Brain context.
- Message persistence: `pixel_messages` table (with `is_image`, `is_video`, `image_url`, `video_url` fields).
- Shared audit log: `osha_audit_logs` table (legacy name; shared across agents).
- User-selectable theme toggle (light/dark local to Pixel page, persisted to `localStorage('pixel-theme')`): client-side only.
- WishReferencePanel: client-side Wishpedia image picker + drag-and-drop; images base64-encoded and sent as `attachments` in the chat request.
- Promptor draft optimization: Wand button in PixelStudio calls `promptor` edge function `optimize-draft` action.

**Input / output schema:**
```typescript
// Request
{
  action: 'chat' | 'get-settings' | 'save-settings' | 'clear-history'
        | 'get-blueprints' | 'save-blueprint' | 'delete-blueprint' | 'generate-blueprint';
  message?: string;
  mode?: string;                // platform: 'facebook' | 'instagram' | etc.
  conversationHistory?: ChatMessage[];
  attachments?: AttachmentContext[];
  settings?: Partial<PixelSettings>;
  blueprint?: Partial<BlueprintContext>;
  blueprintId?: string;
  styleLock?: boolean;
  lastBlueprintSummary?: string;
  selectedPostType?: string;
  selectedSize?: { width: number; height: number; ratio: string };
}

// Response (chat / image)  { content: string, isImage: boolean, imageUrl?: string, audit: {...} }
// Response (chat / video)  { content: string, isImage: false, isVideo: true, videoUrl: string, audit: {...} }
// Response (blueprints)    { blueprints: BlueprintContext[] }
// Response (save-blueprint) { blueprint: BlueprintContext }
// Response (generate-blueprint) { blueprint: Record<string, string> }
```

**Known TODOs:** None found. `gemini-1.5-pro` appears as a hardcoded fallback for text-only mode (line 1418) even though that model is not listed in the current `GEMINI_TEXT_CAPABLE` set in `ai-chat`; this inconsistency is a latent issue.

---

#### Promptor

**Build status:** fully built

**Purpose:** Prompt engineering assistant that creates, optimizes, and rewrites prompts for text, image, social media copy/images, and video; enforces brand compliance via Heart rules and Brain context on every run.

**UI location:**
- Screen: `src/screens/PromptorAgent.tsx`
- Components: `src/components/promptor/` (PromptorCreate, PromptorOptimize, PromptorHistory, and others)
- Route page: `src/app/(protected)/ai-agents/promptor/page.tsx`

**Backend location:** `supabase/functions/promptor/index.ts`

**Model and provider:**
- Provider resolved from `llm_settings.active_text_provider` (default `openai`).
- Model: `llm_settings.openai_text_model` (fallback `gpt-4o`) or `llm_settings.gemini_text_model` (fallback `gemini-2.0-flash`).
- `optimize-draft` action (tight budget for in-chat rewrites) uses the same provider/model but limits tokens to `TOKEN_BUDGETS.PROMPT_OPTIMIZE` (800).
- Keys: `llm_settings.openai_api_key` then `Deno.env.get('OPENAI_API_KEY')`.

**System prompt:**
Built by `buildSystemPrompt` in `supabase/functions/promptor/index.ts` (lines 191-321). Opening:

```
You are Promptor, an expert AI prompt engineer integrated into Fortun Wishnet.

[language, verbosity, formatting style directives]

Your operating law:
1. Heart rules are ABSOLUTE and always override everything else. Never invent Heart rules.
2. Brain context informs brand alignment. If Heart and Brain conflict, Heart wins.
3. [strictness instruction from settings]
4. [refusal style from settings]
5. Never hallucinate Fortun canon, brand rules, or policies.

## MANDATORY HEART RULES
[all active global Heart rules + promptor-assigned rules]

## BRAND & KNOWLEDGE CONTEXT
[Brain RAG chunks]

## BLUEPRINT GUIDE
[blueprint JSON if applicable]

## RESPONSE CONTRACT
You MUST respond with a valid JSON object:
{
  "brief_summary": "...",
  "final_prompt_short": "...",
  "final_prompt_full": "...",
  "variants": [...],
  "negatives": "...",
  "qa_checklist": [...],
  "compliance_status": "pass" | "adjusted" | "refused",
  "compliance_notes": "...",
  "derived_brief": { "output_type", "goal", "audience", "key_constraints" }
}

Action mode: [create|optimize|optimize-draft]
```

**Tool calls / integrations:**
- Heart rules: direct DB query (`heart_rules` table, global + `assigned_agents.cs.{"promptor"}`), no similarity filter (rules always apply).
- Brain RAG: via `search-knowledge` edge function (semantic search, threshold 0.3, sources `brain_document` + `wishpedia_entry`, depth from `promptor_settings.retrieval_depth`: small=5, medium=10, large=20).
- Blueprint registry: inline `BLUEPRINTS` constant in `promptor/index.ts` covering `text`, `image`, `social_image`, `social_copy`, `video` output types with named sub-blueprints.
- All runs persisted to `promptor_runs` table (includes Heart rules used, Brain chunks used, LLM provider/model, output fields).
- Audit log: `osha_audit_logs` table (shared; see AGENT-009 comment in source).
- `optimize-draft` action: called from Osha and Pixel chat inputs via `src/hooks/promptor/useOptimizeDraft.ts`; returns only `final_prompt_full` field (all other JSON fields ignored).

**Input / output schema:**
```typescript
// Request
{
  action: 'create' | 'optimize' | 'optimize-draft' | 'get-settings' | 'save-settings';
  output_type?: 'text' | 'image' | 'social_image' | 'social_copy' | 'video';
  blueprint?: string;       // sub-blueprint key within output_type
  raw_request: string;      // required for create/optimize/optimize-draft
  existing_prompt?: string; // optimize only
}

// Response (create/optimize/optimize-draft)
{
  run_id: string | null;
  brief_summary: string;
  final_prompt_short: string | null;
  final_prompt_full: string;
  variants: string[];
  negatives: string | null;
  qa_checklist: string[];
  compliance_status: 'pass' | 'adjusted' | 'refused';
  compliance_notes: string | null;
  retrieval_meta: { heart_chunks: number; brain_chunks: number };
}
```

**Known TODOs:** None found in source.

---

#### Pulse

**Build status:** scaffolded/coming-soon (settings backend built; no AI agent logic)

**Purpose:** Community Manager AI for managing social media interactions, replies to comments and messages, and scheduling posts across platforms (using upload-post.com API).

**UI location:**
- Route page: `src/app/(protected)/ai-agents/pulse/page.tsx` renders `ComingSoonRoute`.
- No screen component. Settings tab exists in the main Settings page (`src/components/settings/PulseSettings.tsx`).

**Backend location:** `supabase/functions/pulse-api/index.ts` (settings proxy only, no AI generation)

**Model and provider:** None. `pulse-api` is a secure proxy for the upload-post.com API; no LLM calls.

**System prompt:** None. The default from `AgentConfigPanel.tsx`:
```
'You are Pulse, a social media strategist. You create engaging content strategies,
analyze trends, and optimize social presence for maximum impact.'
```
This is stored in `agent_settings` (Nexus config panel) but is not consumed by any active backend.

**Tool calls / integrations:**
- `pulse-api` edge function proxies upload-post.com REST API (`https://api.upload-post.com/api`).
- Auth scheme: `Authorization: Apikey <key>` (not Bearer).
- API key stored in `llm_settings.upload_post_api_key` (never returned to client); fallback to `Deno.env.get('UPLOAD_POST_API_KEY')`.
- Admin-only gate enforced.
- Rate limit: 30 req/min.
- Actions: `test-connection`, `list-accounts`, `get-usage`, `get-queue-settings`, `update-queue-settings`, `get-platforms`.

**Input / output schema:**
```typescript
// Request (pulse-api)
{ action: string; [platform-specific params] }

// Responses are passthrough from upload-post.com API
// test-connection: { plan, email, ... }
// list-accounts:   { accounts: [...] }
// get-platforms:   { facebook: [...], linkedin: [...], pinterest: [...] }
```

**Known TODOs:** The AI agent logic (posting, replying, scheduling with AI generation) is not built. The settings UI and API proxy are ready, but the actual agent screen does not exist.

---

#### Whisper

**Build status:** scaffolded/coming-soon (route exists; no screen, no edge function)

**Purpose:** Generates podcast scripts with AI and produces studio-quality audio narration using the ElevenLabs API.

**UI location:**
- Route page: `src/app/(protected)/ai-agents/whisper/page.tsx` renders `ComingSoonRoute`.
- No screen component.

**Backend location:** None. No edge function exists.

**Model and provider:** None currently deployed. Intended providers per `agents.ts` description: an LLM for script generation + ElevenLabs for TTS audio.

**System prompt:** Default in `AgentConfigPanel.tsx` (Nexus config):
```
'You are Whisper, a podcast producer. You write engaging, well-structured podcast
scripts and prepare them for natural-sounding audio narration.'
```

**Tool calls / integrations:** None built. ElevenLabs API integration is described in `agents.ts` but not implemented.

**Input / output schema:** Not applicable (no backend).

**Known TODOs:** Entire agent backend and screen UI need to be built. The `osha-chat` agent registry (`supabase/functions/osha-chat/index.ts` line 219) already documents the intended capability: "Generates podcast scripts with AI and produces studio-quality audio narration using the ElevenLabs API."

---

#### ATLAS

**Build status:** scaffolded/coming-soon (route exists; no screen, no edge function)

**Purpose:** Kickstarter operations control agent that structures, calculates, verifies, and monitors KS operations across SKU data, factory quotes, QC, freight, 3PL, pledge manager, backer delivery, and financial modeling; identifies risks and recommends next actions without making final decisions.

**UI location:**
- Route page: `src/app/(protected)/ai-agents/atlas/page.tsx` renders `ComingSoonRoute`.
- No screen component.

**Backend location:** None. No edge function exists.

**Model and provider:** None currently deployed.

**System prompt:** Default in `AgentConfigPanel.tsx` (Nexus config):
```
'You are ATLAS, the Kickstarter operations control agent. You structure, calculate, verify,
and monitor KS operations across SKU data, factory quotes, QC, freight, 3PL, pledge manager,
backer delivery, and financial modeling. You identify risks, missing data, and cost impact,
and recommend next actions for human review - you never make final decisions.'
```

**Tool calls / integrations:** None built.

**Input / output schema:** Not applicable (no backend).

**Known TODOs:** Entire agent backend and screen UI need to be built.

---

#### Muse

**Build status:** missing (DB tables only; no route, no screen, no edge function, not in `agents.ts`)

**Purpose:** Unknown. No agent metadata in `src/data/agents.ts`. DB has `muse_messages` and `muse_settings` tables (found in `src/integrations/supabase/types.ts` lines 640 and 676). No code in `src/` or `supabase/functions/` references these tables beyond the generated types file.

**UI location:** None.

**Backend location:** None.

**Model and provider:** Unknown.

**System prompt:** None found.

**Tool calls / integrations:** None found.

**Input / output schema:** Not applicable.

**Known TODOs:** The `muse_*` DB tables suggest a planned agent that was never built or was removed before the current codebase state. The tables can likely be dropped if Muse is not on the roadmap.

---

---

### 8. Database Schema

Source of truth: live Supabase project `zlmideilxfnokemzkavm` (us-west-1), cross-checked against `supabase/migrations/` (54 migration files). Postgres 17 with extensions `vector` 0.8.0 (pgvector), `pg_cron` 1.6.4, `pgcrypto` 1.3. The `public` schema contains 33 base tables; every table has Row Level Security (RLS) enabled.

> Discrepancy with `CLAUDE.md`: the project doc states "33 tables" and "53 migrations". Table count matches (33). Migration file count is 54 on disk (one extra from the timestamp resync in commit `b941e69`). The doc also lists `embedding_jobs` as dropped; confirmed absent from the live schema.

#### 8.1 Custom enum types (`public`)

| Enum | Labels |
|------|--------|
| `app_role` | `admin`, `agent` |
| `brain_category` | `brand`, `products`, `support`, `operations` |
| `brain_section_type` | `general`, `agent` |
| `knowledge_source_type` | `brain_document`, `heart_rule`, `wishpedia_entry` |
| `permission_level` | `none`, `view`, `limited`, `full` |

#### 8.2 RLS policy patterns

Three recurring RLS shapes cover almost every table. Predicates reference the `is_admin(uuid)` and `has_role(uuid, app_role)` SECURITY DEFINER functions (see 8.12). The `auth.uid()` calls are wrapped as `( SELECT auth.uid() )` (the SUP-002/SUP-003 initplan optimization).

- Pattern A, "admin-managed reference data" (read for any authenticated user, write for admins only):
```sql
-- SELECT
USING ( ( SELECT auth.uid() ) IS NOT NULL )
-- INSERT / UPDATE / DELETE
USING/CHECK ( is_admin( ( SELECT auth.uid() ) ) )
```
Applied to: `agent_settings`, `brain_categories`, `brain_documents`, `brain_sections`, `heart_categories`, `heart_rules`, `knowledge_embeddings`, `quick_prompts` (uses an inline `user_roles` admin check rather than `is_admin`), `system_prompts`, `wishpedia_categories`, `wishpedia_entries`, `wishpedia_entry_images`.

- Pattern B, "user-owned data" (single `ALL` policy or four CRUD policies keyed on `auth.uid() = user_id`):
```sql
USING ( ( SELECT auth.uid() ) = user_id )
WITH CHECK ( ( SELECT auth.uid() ) = user_id )
```
Applied to: `console_messages`, `files`, `sectors`, `muse_messages`, `muse_settings`, `osha_messages`, `osha_settings`, `pixel_blueprints`, `pixel_messages`, `pixel_settings`, `promptor_runs`, `promptor_settings`. `file_tags` and `file_versions` use an `EXISTS (SELECT 1 FROM files WHERE files.id = <tbl>.file_id AND files.user_id = auth.uid())` ownership join.

- Pattern C, "self-or-admin" (row owner or admin): `profiles`, `user_permissions`, `user_roles`, `user_usage`, `osha_audit_logs` use `USING ( auth.uid() = <owner col> OR is_admin(auth.uid()) )`.

Notable exceptions:
- `branding_settings`: SELECT policy `Anyone can view branding` is granted to roles `{anon, authenticated}` with `USING (true)`; writes are admin-only.
- `llm_settings`: SELECT is admin-only (`is_admin(auth.uid())`), not "any authenticated". This protects the API-key columns (see SEC-001 reversal note in 8.11).
- `user_usage`: INSERT policy `Service role can insert usage` has `WITH CHECK (true)` (writes happen via service-role edge functions).
- `osha_audit_logs`: INSERT keyed on `auth.uid() = user_id`; SELECT is self-or-admin. No UPDATE/DELETE policies (append-only).

#### 8.3 Auth and users domain

`profiles` - one row per auth user, auto-created by the `handle_new_user` trigger on `auth.users`.
- Columns: `id uuid PK` (FK to `auth.users`), `full_name text`, `avatar_url text`, `email text`, `created_at`, `updated_at`.
- Trigger: `update_profiles_updated_at` BEFORE UPDATE → `update_updated_at_column()`.
- RLS: Pattern C (self-or-admin for SELECT/UPDATE; admin-only INSERT/DELETE).

`user_roles` - role assignment.
- Columns: `id uuid PK`, `user_id uuid NOT NULL`, `role app_role NOT NULL DEFAULT 'agent'`, `created_at`.
- Indexes: `user_roles_user_id_key` UNIQUE btree(`user_id`).
- RLS: Pattern C. The `has_role`/`is_admin` functions read this table.

`user_permissions` - per-user feature and tool gating (one row per user, `user_permissions_user_id_key` UNIQUE).
- Columns: `id`, `user_id`, area-level `permission_level` columns (`files_manager`, `mastermind`, `ai_agents`), plus many boolean flags. AI tool gates: `ai_can_access_nexus`, `ai_can_access_promptor`, `ai_can_access_osha`, `ai_can_access_whisper`, `ai_can_access_pulse`, `ai_can_access_muse`, `ai_can_access_pixel`, `ai_can_access_atlas` (all DEFAULT true). Mastermind gates: `mastermind_can_{create,edit,delete}`, `mastermind_can_access_{brain,heart}`. Files flags: `files_can_see_admin_files`, `files_can_delete`, `files_can_upload`. Global flags: `can_access_branding`, `can_access_user_management`.
- Trigger: `update_user_permissions_updated_at`.
- RLS: Pattern C.
- Note: column `ai_can_access_whisper` was renamed from `ai_can_access_echo` (migration `rename_ai_can_access_echo_to_whisper`, documented in `CLAUDE.md`).

`user_usage` - per-action usage ledger for daily quotas (AGENT-012/014).
- Columns: `id`, `user_id`, `action text`, `provider text`, `model text`, `tokens_used int4 DEFAULT 0`, `created_at`.
- Indexes: `idx_user_usage_action` btree(`user_id, action, created_at DESC`), `idx_user_usage_user_created` btree(`user_id, created_at DESC`).
- RLS: SELECT self-or-admin; INSERT `WITH CHECK (true)` for service role.

#### 8.4 Files domain

`files` - user file records (storage in the private `files` bucket).
- Columns: `id`, `user_id NOT NULL`, `name`, `original_name`, `storage_path`, `mime_type`, `size int8 DEFAULT 0`, `description`, `is_pinned bool DEFAULT false`, `is_trashed bool DEFAULT false`, `trashed_at`, `sector_id uuid` (FK → `sectors`), `created_at`, `updated_at`.
- Indexes: `idx_files_sector_id`. Trigger: `update_files_updated_at`. RLS: Pattern B.

`file_tags` - `id`, `file_id` (FK → `files`), `name`, `color text DEFAULT '#3B82F6'`, `created_at`. UNIQUE(`file_id, name`). RLS: ownership join through `files`.

`file_versions` - `id`, `file_id` (FK → `files`), `version_number int4`, `storage_path`, `size int8`, `created_at`. Index `idx_file_versions_file_id`. RLS: ownership join.

`sectors` - user-defined folders. `id`, `user_id`, `name`, `color DEFAULT '#3B82F6'`, `created_at`. RLS: Pattern B.

`file_settings` - singleton admin config: `max_file_size_mb int4 DEFAULT 50`, `total_storage_quota_gb numeric DEFAULT 1.00`, `allowed_file_types text[]`, `auto_delete_trash_days int4 DEFAULT 30`. RLS: Pattern A. Trigger: `update_file_settings_updated_at`.

#### 8.5 RAG / Knowledge domain

`brain_sections` - `id`, `type brain_section_type DEFAULT 'general'`, `agent_id text`, `name`, `description`, timestamps. Indexes: `idx_brain_sections_agent`, `idx_brain_sections_type`, `unique_agent_section` UNIQUE btree(`agent_id`). RLS: Pattern A. Trigger: updated_at.

`brain_documents` - `id`, `section_id` (FK → `brain_sections`), `name`, `original_name`, `storage_path`, `mime_type`, `size int8`, `category brain_category DEFAULT 'brand'`, `description`, `restricted_agents text[]`, `uploaded_by uuid` (FK → `profiles`), `sort_order int4 DEFAULT 0`, `is_pinned bool DEFAULT false`, timestamps. Indexes: `idx_brain_documents_section`, `idx_brain_documents_uploaded_by`. RLS: Pattern A. Trigger: updated_at. Storage in public `brain-documents` bucket.

`brain_categories` - `id text PK`, `name`, `description`, `icon text DEFAULT 'FileText'`, `sort_order`, `is_active bool DEFAULT true`, `color text DEFAULT 'indigo'`, timestamps. RLS: Pattern A. Trigger: updated_at.

`knowledge_embeddings` - the pgvector store (see Section 10 for the RAG pipeline).
- Columns: `id`, `source_type knowledge_source_type NOT NULL`, `source_id uuid NOT NULL`, `chunk_index int4 DEFAULT 0`, `content text NOT NULL`, `embedding vector(1536)`, `metadata jsonb DEFAULT '{}'`, timestamps.
- Indexes: `knowledge_embeddings_embedding_idx` HNSW(`embedding vector_cosine_ops`) WITH (`ef_construction='100'`, `m='16'`); `idx_knowledge_embeddings_content_fts` GIN(`to_tsvector('english', content)`) for BM25 full-text; `knowledge_embeddings_source_idx` btree(`source_type, source_id`); UNIQUE(`source_id, chunk_index`).
- RLS: Pattern A. Trigger: `update_knowledge_embeddings_updated_at`.

#### 8.6 Rules (Heart) domain

`heart_rules` - `id`, `name`, `description`, `rule_content text NOT NULL`, `category text DEFAULT 'communication'`, `priority text DEFAULT 'medium'`, `is_global bool DEFAULT true`, `assigned_agents text[]`, `is_active bool DEFAULT true`, `created_by uuid` (FK → `profiles`), `sort_order int4 DEFAULT 0`, timestamps. Index `idx_heart_rules_created_by`. RLS: Pattern A. Trigger: updated_at.

`heart_categories` - `id text PK`, `name`, `description`, `icon text DEFAULT 'MessageSquare'`, `color text DEFAULT 'gray'`, `sort_order`, `is_active`, timestamps. RLS: Pattern A. Trigger: updated_at.

#### 8.7 Promptor domain

`promptor_settings` - one row per user (`promptor_settings_user_id_key` UNIQUE). Holds output defaults (`default_output_type`, `default_variants int4 DEFAULT 2`), inclusion toggles (`include_short_prompt`, `include_full_prompt`, `include_negatives`, `include_qa_checklist`, `include_compliance_notes`), brand tone (`brand_tone jsonb` with warmth/wonder/clarity/mystery/directness/playfulness), `allowed_vocabulary text[]`, `blocked_vocabulary text[]`, `heart_strictness text DEFAULT 'enforce_and_propose'`, `refusal_style`, `safety_guard_mode`, image/video/social style cues, `retrieval_depth`, `citation_mode bool DEFAULT true`. RLS: Pattern B. Trigger: updated_at.

`promptor_runs` - run history. `id`, `user_id`, `mode text DEFAULT 'create'`, `output_type text DEFAULT 'text'`, `blueprint`, `raw_request NOT NULL`, `existing_prompt`, `heart_rules_used jsonb`, `brain_context_used jsonb`, `derived_brief jsonb`, `brief_summary`, `final_prompt_short`, `final_prompt_full`, `variants jsonb`, `negatives`, `qa_checklist jsonb`, `compliance_status text DEFAULT 'pass'`, `compliance_notes`, `llm_provider`, `llm_model`, `created_at`. RLS: Pattern B.

`quick_prompts` - shared quick-prompt presets. `id`, `label`, `prompt`, `mode`, `icon text DEFAULT 'Sparkles'`, `is_default bool DEFAULT false`, `sort_order`, timestamps. RLS: read for authenticated; writes gated by inline `user_roles` admin check.

#### 8.8 Agents domain (chat history, settings, prompts)

`agent_settings` - per-agent model config keyed by `agent_id text` (UNIQUE `agent_settings_agent_id_key`). Columns: `is_active bool DEFAULT true`, `provider text DEFAULT 'openai'`, `model text DEFAULT 'gpt-4o'`, `temperature numeric DEFAULT 0.7`, `max_tokens int4 DEFAULT 2048`, `system_prompt text`, `updated_at`. RLS: Pattern A. Trigger: updated_at.

`system_prompts` - versioned, DB-stored system prompts (AGENT-007). `id`, `agent_id text NOT NULL`, `prompt_key text NOT NULL`, `content text NOT NULL`, `version int4 DEFAULT 1`, `is_active bool DEFAULT true`, `created_by uuid`, timestamps. Indexes: UNIQUE(`agent_id, prompt_key, version`); partial `idx_system_prompts_agent_key` btree(`agent_id, prompt_key`) WHERE `is_active = true`. RLS: Pattern A.

`osha_messages` - Osha chat history. `id`, `user_id`, `role`, `content`, `mode`, `is_image bool`, `image_url`, `attachments jsonb DEFAULT '[]'`, `created_at`. RLS: single `ALL` Pattern B policy. Trigger `trim_osha_messages_trigger` AFTER INSERT keeps the latest 200 rows per user.

`osha_settings` - large per-user Osha config (40+ columns): conversation defaults (`default_mode DEFAULT 'guide'`, `default_language`, `auto_detect_language`, `default_verbosity`, `response_structure`), control toggles (`hallucination_control`, `heart_strictness`, `refusal_style`, `safety_guard_mode`, `retrieval_depth`, `context_window_messages int4 DEFAULT 20`, `internal_audit_logging`), floating-bubble config (`bubble_enabled`, `bubble_scope`, `bubble_greeting`, `bubble_name`, `bubble_subtitle`, `bubble_accent_color`, `bubble_position`, `bubble_panel_size`, `bubble_*` UI flags), file-analysis (`max_file_size_mb DEFAULT 10`, `max_pages_processed DEFAULT 50`, `chunking_strategy DEFAULT 'recursive'`, `file_analysis_provider DEFAULT 'gemini'`, `file_analysis_model DEFAULT 'gemini-2.0-flash'`), image generation (`image_generation_enabled`, `image_provider`, `image_model DEFAULT 'gpt-image-1'`, `image_default_size`, `image_aspect_ratio`, `image_brand_preset`). RLS: Pattern B. Trigger: updated_at.

`osha_audit_logs` - compliance trace (AGENT-017/018). `id`, `user_id`, `message_id uuid`, `heart_rules_used jsonb`, `brain_chunks_used int4`, `compliance_status text DEFAULT 'pass'`, `compliance_notes`, `retrieval_ms int4`, `llm_provider`, `llm_model`, `created_at`. RLS: self-or-admin SELECT, owner INSERT, append-only (no UPDATE/DELETE).

`pixel_messages` - Pixel chat history; like `osha_messages` plus `blueprint_id uuid`, `is_video bool`, `video_url text`. Trigger `trim_pixel_messages_trigger` AFTER INSERT. RLS: Pattern B.

`pixel_settings` - per-user Pixel config (UNIQUE `pixel_settings_user_id_key`): generation defaults, aesthetic controls (`default_aesthetic DEFAULT 'premium'`, `palette_behavior`, `texture_level`, `lighting`, `detail_level`), output specs (`default_aspect_ratio`, `default_resolution DEFAULT '1080'`, `preferred_file_format DEFAULT 'PNG'`), `image_generation_enabled`/`video_generation_enabled`, `image_provider`/`image_model`, `style_lock_default`, `character_lock_default`, `reuse_last_blueprint`, vocab/theme allow-block arrays, `heart_strictness`, `retrieval_depth`, `internal_audit_logging`. RLS: Pattern B. Trigger: none for updated_at observed (has `updated_at` column with DEFAULT now()).

`pixel_blueprints` - reusable visual blueprints. `id`, `user_id`, `name`, `description`, `format`, `aspect_ratio`, `composition_rules`, `style_rules`, `typography_vibe`, `element_rules`, `negative_constraints`, `export_specs`, `palette jsonb`, `source text DEFAULT 'user'`, timestamps. RLS: Pattern B.

`muse_messages` / `muse_settings` - Muse agent history and config. `muse_settings` mirrors the Osha/Pixel settings shape (modes, brand_tone jsonb, vocab arrays, `heart_strictness`, image-gen fields, `diagram_format DEFAULT 'mermaid'`). Both RLS Pattern B. `muse_messages` has trigger `trim_muse_messages_trigger`. See Section 7 / 18 for Muse build status.

`console_messages` - Nexus console history. `id`, `user_id`, `role`, `content`, `is_image bool`, `image_url`, `provider`, `model`, `mode`, `created_at`. Index `idx_console_messages_created_at` btree(`user_id, created_at DESC`). Trigger `trim_console_messages_trigger` AFTER INSERT. RLS: Pattern B (own messages).

#### 8.9 Wishpedia domain

`wishpedia_categories` - `id`, `name` (UNIQUE), `description`, `icon text DEFAULT 'Users'`, `color text DEFAULT 'amber'`, `has_angle_views bool DEFAULT false`, `sort_order`, `is_active`, timestamps. RLS: Pattern A. Trigger: updated_at.

`wishpedia_entries` - `id`, `category_id` (FK → `wishpedia_categories`), `slug text` (UNIQUE), `name`, `description`, `is_archived bool DEFAULT false`, `created_by uuid`, timestamps. Index `idx_wishpedia_entries_category_id`. RLS: Pattern A. Trigger: updated_at.

`wishpedia_entry_images` - `id`, `entry_id` (FK → `wishpedia_entries`), `storage_path`, `original_name`, `mime_type text DEFAULT 'image/png'`, `size int8`, `angle text`, `sort_order`, `is_primary bool DEFAULT false`, `uploaded_by uuid`, `created_at`. Index `idx_wishpedia_entry_images_entry_id`. RLS: Pattern A. Media in public `wishpedia-media` bucket.

#### 8.10 Branding / config domain

`branding_settings` - singleton. `login_logo_url`, `main_logo_url`, `mini_logo_url`, `favicon_url`, `app_title text DEFAULT 'Fortun Wishnet'`, timestamps. RLS: public SELECT (anon + authenticated), admin writes. Trigger: updated_at.

`llm_settings` - singleton provider config. Model selectors per provider (`openai_text_model`, `openai_image_model`, `openai_video_model`, `openai_deep_research_model`, `gemini_text_model`, `gemini_image_model`, `gemini_video_model`, `fal_text_model`, `fal_image_model`, `fal_video_model`), enable flags (`openai_enabled`, `gemini_enabled`, `fal_enabled`), active-provider selectors (`active_text_provider`, `active_image_provider`, `active_video_provider`, `active_deep_research_provider`), Pulse fields (`upload_post_api_key`, `pulse_timezone DEFAULT 'UTC'`, `pulse_queue_enabled`, `pulse_webhook_url`), and the API-key columns `openai_api_key`, `gemini_api_key`, `fal_api_key`. RLS: admin-only on every command (SELECT included). Trigger: updated_at.

#### 8.11 API-key storage note (SEC-001 reversal)

`llm_settings` holds plaintext API-key columns (`openai_api_key`, `gemini_api_key`, `fal_api_key`, `upload_post_api_key`). Per `CLAUDE.md` (Batch Task 6), SEC-001 originally banned DB-stored keys; they were re-introduced under tighter controls: admin-only RLS on `llm_settings` (SELECT and writes), an explicit client column whitelist in `src/hooks/useLLMSettings.ts` that omits the key columns, and a service-role-only `settings-keys` edge function for writes. The keys are intended never to reach the browser.

#### 8.12 Functions and triggers

| Function | Args | Returns | Security definer | Role |
|----------|------|---------|------------------|------|
| `handle_new_user()` | none | trigger | yes | Inserts a `profiles` row on new `auth.users` signup. |
| `has_role(_user_id uuid, _role app_role)` | | bool | yes (STABLE) | Existence check against `user_roles`. |
| `is_admin(_user_id uuid)` | | bool | yes (STABLE) | `has_role(_user_id, 'admin')`. Used in nearly all admin RLS. |
| `match_knowledge(...)` | two overloads (5-arg and 6-arg with `query_text`) | record | yes | Legacy vector match (see Section 10). |
| `match_knowledge_hybrid(...)` | embedding, query_text, threshold, count, source filter, agent filter, vector_weight 0.7, text_weight 0.3 | table | no | Current hybrid vector + BM25 search (full body in Section 10). |
| `set_ef_search(ef int DEFAULT 100)` | | void | no | `set_config('hnsw.ef_search', ef, true)`. |
| `update_updated_at_column()` | none | trigger | no | Generic BEFORE UPDATE timestamp setter (used by ~20 tables). |
| `trim_console_messages()` / `trim_muse_messages()` / `trim_osha_messages()` / `trim_pixel_messages()` | none | trigger | yes | Keep latest 200 rows per `user_id`. Wired as AFTER INSERT triggers. |

`handle_new_user` body:
```sql
INSERT INTO public.profiles (id, email, full_name)
VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
RETURN NEW;
```

`is_admin` / `has_role` bodies:
```sql
-- is_admin(_user_id)
SELECT public.has_role(_user_id, 'admin')
-- has_role(_user_id, _role)
SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
```

pg_cron jobs (daily, near 03:00 UTC) call the trim functions directly:

| Job | Schedule | Command |
|-----|----------|---------|
| `trim-osha-messages` | `0 3 * * *` | `SELECT public.trim_osha_messages()` |
| `trim-pixel-messages` | `5 3 * * *` | `SELECT public.trim_pixel_messages()` |
| `trim-muse-messages` | `10 3 * * *` | `SELECT public.trim_muse_messages()` |
| `trim-console-messages` | `15 3 * * *` | `SELECT public.trim_console_messages()` |

#### 8.13 Storage buckets

| Bucket | Public | Size limit | Allowed MIME | Used by |
|--------|--------|------------|--------------|---------|
| `brain-documents` | true | 100 MB | any | Brain knowledge docs (`brain_documents`) |
| `files` | false | 100 MB | any | File manager (`files`); served via `serve-file` edge fn (SEC-019) |
| `profile-pictures` | true | 2 MB | jpeg/png/webp/gif | Avatars (`profiles.avatar_url`) |
| `wishpedia-media` | true | 10 MB | jpeg/png/webp/gif | Wishpedia images (`wishpedia_entry_images`) |

---

### 9. Edge Functions

All edge functions run on the Deno runtime inside Supabase. Source lives under `supabase/functions/`. Shared helpers are in `supabase/functions/_shared/`. The import map at `supabase/functions/import_map.json` pins three external packages:

```json
{
  "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.91.0",
  "zod":                   "https://esm.sh/zod@3.23.8",
  "fflate":                "https://esm.sh/fflate@0.8.2"
}
```

#### Summary table

| Function | Purpose | Auth required | External services |
|---|---|---|---|
| `ai-chat` | Multi-provider LLM chat, image/video generation, web research | User Bearer token | OpenAI, Gemini, fal.ai |
| `manage-users` | Create / update role / delete workspace users | User Bearer + admin role | None |
| `osha-chat` | Osha agent: conversational AI, deep research, URL fetch, PDF gen | User Bearer token | OpenAI, Gemini, r.jina.ai |
| `pixel-chat` | Pixel agent: image/video generation with brand context | User Bearer token | OpenAI, Gemini |
| `process-embeddings` | Extract text from documents and embed into knowledge base | User Bearer token | OpenAI (embeddings), Supabase Storage |
| `process-ocr` | OCR multi-page PDFs via vision model, embed results | User Bearer token | OpenAI gpt-4o (vision) |
| `promptor` | AI prompt engineering assistant with Heart rules + Brain context | User Bearer token | OpenAI, Gemini |
| `pulse-api` | Secure proxy for upload-post.com social media API | User Bearer + admin gate | upload-post.com |
| `search-knowledge` | Vector similarity search over knowledge base with source weighting | User Bearer token | OpenAI (embeddings) |
| `serve-file` | Authenticated file download from private buckets | User Bearer token | Supabase Storage |
| `settings-keys` | Write/reset/classify provider API keys in DB | User Bearer + admin gate | None |
| `storage-stats` | Return storage usage and quota for the workspace | User Bearer token | Supabase Storage |
| `update-bucket-settings` | Update file bucket limits and allowed types | User Bearer + admin gate | Supabase Storage |
| `wishpedia-generate` | Generate product/character reference images | User Bearer + admin role | OpenAI, Gemini |

---

#### Shared helpers

**`supabase/functions/_shared/cors.ts`**

`getCorsHeaders(requestOrigin)` enforces an origin allowlist (SEC-003). It reads a comma-separated `ALLOWED_ORIGINS` env var at request time; if the var is absent it falls back to the hard-coded `DEFAULT_ORIGINS` array.

```typescript
const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8000',
  'http://localhost:8080',
  'https://wishnet.fortunwishdom.com',
];
```

If the incoming `Origin` header matches, it is echoed back; otherwise `allowed[0]` is returned. Every response also carries `Vary: Origin`. Functions that use the shared helper: `ai-chat`, `osha-chat`, `pixel-chat`, `promptor`, `pulse-api`, `serve-file`, `settings-keys`.

Several older functions (`manage-users`, `process-embeddings`, `process-ocr`, `search-knowledge`, `storage-stats`, `update-bucket-settings`, `wishpedia-generate`) use a wildcard `Access-Control-Allow-Origin: *` directly.

---

**`supabase/functions/_shared/token-budgets.ts`**

Centralises `max_tokens` / `maxOutputTokens` caps so no function hardcodes a number.

| Budget key | Value |
|---|---|
| `CHAT_RESPONSE` | 8192 |
| `CONTENT_GENERATION` | 4096 |
| `OCR_EXTRACTION` | 4096 |
| `IMAGE_PROMPT` | 1024 |
| `PROMPT_OPTIMIZE` | 800 |
| `CLASSIFICATION` | 500 |
| `INTENT` | 200 |
| `DEFAULT` | 2048 |

---

**`supabase/functions/_shared/rate-limit.ts`**

`createRateLimiter({ windowMs, maxRequests })` returns an in-memory sliding-window limiter keyed by `userId`. It exposes `check(userId): boolean` (returns `true` when the limit is exceeded) and `remaining(userId): number`. Expired buckets are purged every `2 * windowMs` milliseconds. Because each Deno isolate has its own heap the limiter resets on cold start.

---

**`supabase/functions/_shared/sanitize.ts`**

`sanitizeForPrompt(text)` strips content that could cause prompt injection before text is embedded in a system or user message. It removes XML-style role tags (`<system>`, `<user>`, `<assistant>`), triple back-ticks, and common injection phrases: "ignore previous instructions", "you are now", "act as", "forget everything".

---

**`supabase/functions/_shared/system-prompts.ts`**

Two helpers query the `system_prompts` table:

- `getSystemPrompt(supabaseAdmin, agentId, promptKey, fallback)` - returns the content of the highest-version active prompt matching `(agent_id, prompt_key)`, or `fallback` when none exists.
- `getAgentPrompts(supabaseAdmin, agentId, fallbacks)` - returns a `Record<string, string>` of all active prompts for an agent.

---

**`supabase/functions/_shared/usage-quota.ts`**

Tracks per-user daily action counts in the `user_usage` table.

Daily limits by action:

| Action | Limit |
|---|---|
| `chat` | 200 |
| `osha-chat` | 100 |
| `pixel-chat` | 50 |
| `pixel-blueprint` | 20 |
| `promptor-generate` | 50 |
| `generate-image` | 30 |
| `generate-video` | 10 |
| `start-research` | 5 |

`checkQuota(supabaseAdmin, userId, action)` queries the table and returns `{ allowed: boolean, remaining: number }`. It fails open on DB error so a quota-service outage does not block users. `logUsage(supabaseAdmin, userId, action, provider, model)` inserts a record and never throws.

---

**`supabase/functions/_shared/chunker.ts`**

`chunkText(text, chunkSize=1000, overlap=100, maxChunks=150)` normalises whitespace then splits at paragraph, sentence, and word boundaries to produce `ChunkResult[]` objects each containing `content` and `index`. The 150-chunk cap prevents runaway memory use on very large documents.

---

#### Per-function reference

---

##### `ai-chat`

**Source:** `supabase/functions/ai-chat/index.ts`

**Purpose:** Central LLM gateway. Handles conversational chat with RAG context injection, image generation, video generation, and OpenAI Responses-API deep research.

**HTTP:** `POST /ai-chat`

**Auth:** User Bearer token via `auth.getUser()`. Admin gate applied only to `test-connection` and `check-keys` actions.

**Rate limit:** 30 requests/min per user via shared rate limiter.

**Actions and request/response shapes:**

`chat`
```jsonc
// request
{ "action": "chat", "messages": [...], "stream": true, "provider": "openai" }
// response (stream=false)
{ "response": "...", "usage": { "prompt_tokens": N, "completion_tokens": N } }
// response (stream=true): SSE text/event-stream, data chunks then data: [DONE]
```

`generate-image`
```jsonc
// request
{ "action": "generate-image", "prompt": "...", "model": "dall-e-3",
  "provider": "openai", "size": "1024x1024" }
// response
{ "url": "https://...", "revised_prompt": "..." }
```

`generate-video`
```jsonc
// request
{ "action": "generate-video", "prompt": "...", "model": "sora-1.0",
  "provider": "openai", "duration": 5 }
// response (OpenAI Sora polls /v1/videos every 5s, max 5 min)
{ "url": "https://..." }
```

`start-research` / `poll-research`
```jsonc
// start-research request
{ "action": "start-research", "query": "..." }
// response
{ "job_id": "resp_..." }

// poll-research request
{ "action": "poll-research", "job_id": "resp_..." }
// response
{ "status": "queued|in_progress|completed|failed",
  "result": "..." }
```

`test-connection` (admin only)
```jsonc
// request
{ "action": "test-connection", "provider": "openai" }
// response
{ "connected": true, "model": "gpt-4o" }
```

`check-keys` (admin only)
```jsonc
// response
{ "openai": true, "gemini": false }
```

**RAG context injection (chat action):** Before the LLM call, two parallel requests fire:
1. Heart rules: `heart_rules` table filtered for `is_global = true` OR `'ai-chat'` in `assigned_agents`. Rules are prepended to the system prompt as compliance constraints.
2. Brain knowledge: `match_knowledge` RPC with `match_threshold=0.3`, `match_count=8`, `filter_source_types=['brain_document','wishpedia_entry']`. Results appended as context.

**API key resolution:** For each provider, the function first checks the DB column (`llm_settings.openai_api_key` / `gemini_api_key` / `fal_api_key`) via service-role client, then falls back to the Deno env var (`OPENAI_API_KEY` / `GEMINI_API_KEY` / `FAL_KEY`).

**Retry logic:** `fetchWithRetry` wraps all upstream calls with exponential backoff: up to 5 retries, base delay 1 s, cap 60 s, retries only on HTTP 429 and 5xx responses.

**Provider routing:**
- `openai`: `/v1/chat/completions` for text; `/v1/images/generations` for images; `/v1/videos` + polling for Sora video; `/v1/responses` with `background: true` for research.
- `gemini`: `generateContent` endpoint; `predictLongRunning` + polling every 10 s (max 10 min) for Veo video.
- `fal`: `fal.run/{model}` via POST with `Authorization: Key {FAL_KEY}` for images and video with 5-min timeout.

**Env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `FAL_KEY`

**CORS:** `supabase/functions/_shared/cors.ts`

---

##### `manage-users`

**Source:** `supabase/functions/manage-users/index.ts`

**Purpose:** Admin-only CRUD for workspace user accounts.

**HTTP:** `POST /manage-users`

**Auth:** Bearer token + `user_roles.role = 'admin'` check (direct table query, not the `is_admin` RPC).

**Actions:**

`create`
```jsonc
// request
{ "action": "create", "email": "...", "password": "...",
  "name": "...", "role": "admin|user", "permissions": { ... } }
// response
{ "success": true, "user_id": "uuid" }
```

`updateRole`
```jsonc
// request
{ "action": "updateRole", "user_id": "uuid", "role": "admin|user",
  "permissions": { ... } }
// response
{ "success": true }
```

`delete`
```jsonc
// request
{ "action": "delete", "user_id": "uuid" }
// response
{ "success": true }
```

**Side effects:**
- `create`: calls `auth.admin.createUser`, inserts into `profiles`, `user_roles`, and `user_permissions` with a 500 ms delay after auth creation to allow the trigger to fire.
- Every action appends a row to `osha_audit_logs`.
- Self-deletion is blocked: the calling user's `user_id` is compared against the target before proceeding.

**CORS:** Wildcard `Access-Control-Allow-Origin: *` (does not use shared cors.ts).

**Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`

---

##### `osha-chat`

**Source:** `supabase/functions/osha-chat/index.ts` (2364 lines)

**Purpose:** Osha AI assistant. Conversational guidance with Heart rules, Brain RAG context, URL content fetching, deep research via OpenAI Responses API, and a built-in PDF generator.

**HTTP:** `POST /osha-chat`

**Auth:** User Bearer token. User-scoped client used for RLS-gated tables (`osha_messages`, `osha_sessions`). Service-role client used for `llm_settings` and audit logs.

**Rate limit:** 20 requests/min per user.

**AGENT-017:** Every response carries `x-request-id` (generated per request) for distributed tracing.

**Actions:**

`chat`
```jsonc
// request
{ "action": "chat", "message": "...", "session_id": "uuid",
  "mode": "guide|operator|workshop", "depth": "small|default|large",
  "attachments": [{ "type": "image|pdf|url", ... }] }
// response
{ "response": "...", "session_id": "uuid" }
```

`get-settings` / `save-settings`
```jsonc
// get-settings response
{ "default_mode": "guide", "preferred_provider": "openai", ... }
// save-settings request
{ "action": "save-settings", "settings": { ... } }
```

`clear-history`
```jsonc
// request
{ "action": "clear-history", "session_id": "uuid" }
// response
{ "success": true }
```

`deep-research-clarify`
```jsonc
// request
{ "action": "deep-research-clarify", "topic": "..." }
// response (gpt-4.1-mini, 500 tokens)
{ "questions": ["...", "...", "..."] }
```

`deep-research-execute`
```jsonc
// request
{ "action": "deep-research-execute", "topic": "...",
  "answers": ["...", "..."] }
// response
{ "job_id": "resp_..." }
```

`poll-research`
```jsonc
// request
{ "action": "poll-research", "job_id": "resp_..." }
// response
{ "status": "queued|in_progress|completed|failed",
  "stage": 0..4, "result": "..." }
// stage mapping: queued=0, in_progress=1, completed=4
```

`web-search` - permission-gated; uses OpenAI web_search_preview tool.

`save-to-brain`
```jsonc
// request
{ "action": "save-to-brain", "content": "...", "title": "..." }
// response
{ "success": true, "document_id": "uuid" }
```

**RAG context injection:**
- **Heart rules:** rows from `heart_rules` where `is_global = true` OR `'osha'` in `assigned_agents`. Always injected, no similarity filter.
- **Brain knowledge:** `match_knowledge` RPC with `match_threshold=0.2` and limit based on `depth` (`small=15`, `default=30`, `large=50`), `filter_agent_id='osha'`.

**URL fetching:** Up to 3 URLs per message, fetched via `https://r.jina.ai/{url}` with a 15 s timeout and a 30 000-character cap per page.

**Attachment handling:**
- Images: base64-encoded, passed as vision content blocks.
- PDFs: extracted via Gemini native PDF (`gemini-2.0-flash`) or OpenAI vision (`gpt-4o`), configurable via `llm_settings.pdf_extraction_provider`.

**Image generation (within chat):** `buildImagePrompt` queries Brain for visual chunks, appends Heart visual constraints, then calls the configured `llm_settings.active_image_provider` / `image_model`.

**Built-in PDF generator:** Produces valid PDF 1.4 documents from markdown-like text including headings, tables, and word-wrapping. Used by the `export-to-pdf` sub-action inside `chat`.

**Mode system:** Three modes (`guide`, `operator`, `workshop`) map to distinct system-prompt keys. Prompts can be overridden per row in the `system_prompts` table. A `coerceMode()` guard falls back to `guide` for stale DB values referencing removed modes.

**CORS:** `supabase/functions/_shared/cors.ts`

**Env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`

---

##### `pixel-chat`

**Source:** `supabase/functions/pixel-chat/index.ts` (1504 lines)

**Purpose:** Pixel AI image/video generation agent with Wishpedia reference images, blueprint system, and dual-provider support.

**HTTP:** `POST /pixel-chat`

**Auth:** User Bearer token. Rate limit: 10 requests/min per user (expensive due to image generation).

**Actions:**

`chat`
```jsonc
// request
{ "action": "chat", "message": "...", "session_id": "uuid",
  "attachments": [...], "wishpedia_image_refs": [...] }
// response
{ "response": "...", "images": [...], "video_url": "..." }
```

`get-blueprints` / `save-blueprint` / `delete-blueprint`
```jsonc
// save-blueprint request
{ "action": "save-blueprint", "name": "...", "blueprint": { ... } }
// get-blueprints response
{ "blueprints": [{ "id": "uuid", "name": "...", "blueprint": { ... } }] }
```

`generate-blueprint`
```jsonc
// request
{ "action": "generate-blueprint", "brand_context": "..." }
// response (structured JSON object)
{ "style": "...", "color_palette": [...], "typography": { ... }, ... }
```

`get-settings` / `save-settings` - same pattern as `osha-chat`.

`clear-history`
```jsonc
{ "action": "clear-history", "session_id": "uuid" }
```

**RAG context injection:**
- **Brain knowledge:** `match_knowledge` with `match_count=100` (no limit), no agent filter. Used to inject brand visual identity context into image prompts.
- **Wishpedia search:** `match_knowledge` with `filter_source_types=['wishpedia_entry']`, `match_threshold=0.3`, `match_count=10`. Results enriched with public image URLs queried from `wishpedia_entry_images`.

**Intent detection:** The chat handler classifies each message as text-only, video, diagram, or regeneration intent to select the correct generation path.

**Video generation:**
- **Sora:** polls `/v1/videos/{job_id}` every 5 s, up to 60 attempts.
- **Veo:** polls Gemini `predictLongRunning` every 10 s, up to 60 attempts.
- Completed video stored to the `files` bucket under a "Pixel AI" sector (created on demand if absent).

**Blueprint generation:** Fires two parallel Brain queries for brand visual identity, then calls OpenAI with `response_format: { type: 'json_object' }` or Gemini to produce a structured blueprint JSON.

**CORS:** `supabase/functions/_shared/cors.ts`

**Env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`

---

##### `process-embeddings`

**Source:** `supabase/functions/process-embeddings/index.ts`

**Purpose:** Ingestion pipeline. Extracts text from uploaded documents, heart rules, or Wishpedia entries, chunks them, and writes embedding vectors to `knowledge_embeddings`.

**HTTP:** `POST /process-embeddings`

**Auth:** User Bearer token + Zod validation (UUID regex on all ID parameters).

**Limits:** `MAX_TEXT_LENGTH=300000`, `MAX_CHUNKS=150`, `BATCH_SIZE=50` embeddings per API call, `MAX_REQUEST_BODY_BYTES=5MB`.

**Actions:**

`process_document`
```jsonc
// request
{ "action": "process_document", "document_id": "uuid" }
// response
{ "success": true, "chunks_created": N }
```

Downloads from `brain-documents` bucket. Format routing:
- DOCX: unzipped via `fflate`, `word/document.xml` parsed with a regex XML walker.
- Excel (xlsx/xls): parsed via SheetJS, sheets flattened to text rows.
- Text, HTML, CSV, JSON: read directly as UTF-8.
- PDF / image: returns empty string; caller must invoke `process-ocr` instead.

`process_rule`
```jsonc
// request
{ "action": "process_rule", "rule_id": "uuid" }
// response
{ "success": true, "chunks_created": N }
```

Combines `name + description + category + content` fields from `heart_rules` into a single text block, then chunks and embeds. `source_type = 'heart_rule'`.

`process_entry`
```jsonc
// request
{ "action": "process_entry", "entry_id": "uuid" }
// response
{ "success": true, "chunks_created": N }
```

Fetches `wishpedia_entries` joined with `wishpedia_entry_images`. Builds structured text with angle labels and image public URLs. `source_type = 'wishpedia_entry'`. Metadata fields stored: `entry_name`, `category_name`, `image_urls`.

`delete`
```jsonc
// request
{ "action": "delete", "document_id"?: "uuid",
  "rule_id"?: "uuid", "entry_id"?: "uuid" }
```

Deletes existing embeddings in paginated batches of 500 rows to avoid the PostgREST 1000-row hard limit.

`reprocess_all` - re-runs `process_document` across all documents in the Brain.

**Embedding call:**
```jsonc
// POST https://api.openai.com/v1/embeddings
{ "input": ["chunk1", "chunk2", ...],
  "model": "text-embedding-3-small" }
// response shape used
{ "data": [{ "embedding": [0.0012, ...] }] }
```
Vectors written as `ARRAY[...]::vector(1536)` into `knowledge_embeddings.embedding`.

**CORS:** Wildcard `Access-Control-Allow-Origin: *`

**Env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` (env only; this function does not read DB keys)

---

##### `process-ocr`

**Source:** `supabase/functions/process-ocr/index.ts`

**Purpose:** OCR pipeline for PDF pages. Accepts base64 page images, extracts text via OpenAI gpt-4o vision, then chunks and embeds the result.

**HTTP:** `POST /process-ocr`

**Auth:** User Bearer token + Zod validation. Body content-length checked at 100 MB max.

**Request / response:**
```jsonc
// request
{ "document_id": "uuid",
  "page_images": ["base64...", "base64..."],
  "append": false }
// response
{ "success": true, "chunks_created": N, "pages_processed": N }
```

**Limits:** Max 50 pages per batch. Max 10 MB per image (base64). Token budget: `TOKEN_BUDGETS.OCR_EXTRACTION = 4096`.

**Append mode:** When `append=false`, existing embeddings for the document are deleted first. When `append=true`, the function reads the current maximum `chunk_index` and offsets new chunks accordingly. This enables clients to call the function in batches for large PDFs without overwriting earlier pages.

**Processing flow:**
1. For each page image, call OpenAI gpt-4o with the base64 image and a text-extraction prompt.
2. Concatenate all extracted page texts.
3. Call `chunkText` from the shared chunker.
4. Call OpenAI `text-embedding-3-small` in batches of 50.
5. Insert into `knowledge_embeddings` with `metadata.extraction_method = 'ocr_vision'` and `metadata.page_count = N`.

**CORS:** Wildcard `Access-Control-Allow-Origin: *`

**Env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`

---

##### `promptor`

**Source:** `supabase/functions/promptor/index.ts`

**Purpose:** Prompt engineering assistant. Accepts a user brief and returns structured prompts (short, full, variants, negatives) with Heart compliance check.

**HTTP:** `POST /promptor`

**Auth:** User Bearer token. Rate limit: 15 requests/min per user.

**Actions:**

`get-settings` / `save-settings` - read/write `promptor_settings` row for the user.

`create` / `optimize`
```jsonc
// request
{ "action": "create", "brief": "...", "blueprint": "general_scene",
  "provider": "openai" }
// response
{ "brief_summary": "...",
  "final_prompt_short": "...",
  "final_prompt_full": "...",
  "variants": ["...", "..."],
  "negatives": ["...", "..."],
  "qa_checklist": ["...", "..."],
  "compliance_status": "pass|warn|fail",
  "compliance_notes": "...",
  "derived_brief": "..." }
```

`optimize-draft`
```jsonc
// request
{ "action": "optimize-draft", "draft": "..." }
// response - only final_prompt_full is populated (budget: PROMPT_OPTIMIZE=800 tokens)
{ "final_prompt_full": "..." }
```

**Blueprint registry** (determines system-prompt framing):

| Category | Keys |
|---|---|
| text | `general`, `ad_copy`, `landing_page`, `email`, `blog_outline`, `product_description` |
| image | `general_scene`, `character_portrait`, `product_hero`, `social_square` |
| social_image | `announcement`, `quote_card`, `carousel_slide` |
| social_copy | `hook_variants`, `caption_variants`, `cta_variants` |
| video | `short_reel`, `cinematic_trailer`, `explainer_storyboard` |

**RAG context injection:**
- **Heart rules:** all active global + agent-assigned rules fetched directly from DB (no similarity filter, full rule text injected).
- **Brain:** HTTP call to `search-knowledge` function with `threshold=0.3`.

**Persistence:** Saves run output to `promptor_runs`. Writes to `osha_audit_logs` (AGENT-009 audit requirement).

**CORS:** `supabase/functions/_shared/cors.ts`

**Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `OPENAI_API_KEY` (env fallback), `GEMINI_API_KEY` (env fallback)

---

##### `pulse-api`

**Source:** `supabase/functions/pulse-api/index.ts`

**Purpose:** Secure server-side proxy for the upload-post.com social media scheduling API. The raw API key never leaves this function.

**HTTP:** `POST /pulse-api`

**Auth:** User Bearer token + `is_admin` RPC gate. Rate limit: 30 requests/min.

**API key resolution:** DB column `llm_settings.upload_post_api_key` first, then env var `UPLOAD_POST_API_KEY`. Upstream auth header format: `Authorization: Apikey {key}` (upload-post.com custom scheme, not Bearer).

**Actions and upstream mappings:**

| Action | Method | Upstream path |
|---|---|---|
| `test-connection` | GET | `/uploadposts/me` |
| `list-accounts` | GET | `/uploadposts/users` |
| `get-queue-settings` | GET | `/uploadposts/queue/settings` |
| `update-queue-settings` | POST | `/uploadposts/queue/settings` |
| `get-platforms` | GET (x3 parallel) | `/uploadposts/facebook/pages`, `/uploadposts/linkedin/pages`, `/uploadposts/pinterest/boards` |
| `set-webhook` | POST | `/uploadposts/users/notifications` |

`test-connection` response:
```jsonc
{ "connected": true, "email": "...", "plan": "...", "subscriptionStatus": "..." }
```

`get-platforms` response:
```jsonc
{ "facebook": [...], "linkedin": [...], "pinterest": [...] }
```
Failed platform sub-requests are silently skipped; the remaining platforms are still returned.

**Security properties:** Key is never included in any response or log line. `test-connection` works even without a configured key (returns `{ connected: false }`). All other actions return a 400 if the key is absent.

**CORS:** `supabase/functions/_shared/cors.ts`

**Env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPLOAD_POST_API_KEY`

---

##### `search-knowledge`

**Source:** `supabase/functions/search-knowledge/index.ts`

**Purpose:** Public-facing vector similarity search over `knowledge_embeddings` with source-type weighting. Consumed by `promptor` and the VectorStore UI.

**HTTP:** `POST /search-knowledge`

**Auth:** User Bearer token. Zod-validated request body.

**Request / response:**
```jsonc
// request
{ "query": "...",                 // max 2000 chars
  "source_types": ["brain_document", "heart_rule", "wishpedia_entry"],
  "agent_id": "osha",            // optional, filters by assigned agent
  "limit": 10,                   // 1–50
  "threshold": 0.5 }             // 0–1

// response
{ "results": [
    { "id": "uuid",
      "source_type": "brain_document",
      "similarity": 0.82,
      "weighted_similarity": 0.82,
      "content": "...",
      "metadata": { ... },
      "enrichment": { "name": "...", "category": "..." } }
  ] }
```

**Processing flow:**
1. Generate query embedding: POST to `https://api.openai.com/v1/embeddings` with `text-embedding-3-small`.
2. Call `match_knowledge` RPC (see Section 10 for full signature).
3. Apply source-type weighting to raw similarity scores:

| Source type | Weight multiplier |
|---|---|
| `heart_rule` | 1.15 |
| `wishpedia_entry` | 1.05 |
| `brain_document` | 1.00 |

4. Sort by `weighted_similarity` descending.
5. Enrich results: three parallel DB queries for document names (from `brain_documents`), rule names (from `heart_rules`), and entry names (from `wishpedia_entries`) - one batch query per type instead of N+1.

**CORS:** Wildcard `Access-Control-Allow-Origin: *`

**Env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`

---

##### `serve-file`

**Source:** `supabase/functions/serve-file/index.ts`

**Purpose:** Authenticated download proxy for private Supabase storage buckets. Returns files inline with private cache headers.

**HTTP:** `POST /serve-file` (query params: `bucket`, `path`, `filename`)

**Auth (SEC-011):** Bearer token preferred from `Authorization` header; falls back to `?token=` query param for direct-link compatibility. Resolved via `auth.getUser()`.

**Allowed buckets:** `files` and `brain-documents` only; any other value returns 400.

**Authorization logic:**
- `files` bucket: verifies `files.user_id = authenticated_user.id` via DB query.
- `brain-documents` bucket: any authenticated user can download.

**Response:** Service-role `storage.download()` result streamed inline. Headers:
```
Content-Disposition: inline; filename="..."
Cache-Control: private, max-age=3600
```

**CORS:** Wildcard; allowed headers include `x-request-id` for tracing.

**Env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

##### `settings-keys`

**Source:** `supabase/functions/settings-keys/index.ts`

**Purpose:** Admin-only write path for provider API keys stored in `llm_settings`. Never returns raw key values.

**HTTP:** `POST /settings-keys`

**Auth:** User Bearer token + `is_admin` RPC gate. Rate limit: 15 requests/min.

**Actions:**

`check-keys`
```jsonc
// response
{ "openai": "db|env|none",
  "gemini": "db|env|none",
  "fal":    "db|env|none",
  "pulse":  "db|env|none" }
```

`update-key`
```jsonc
// request
{ "action": "update-key", "provider": "openai|gemini|fal|pulse",
  "key": "sk-..." }
// response
{ "success": true }
```
Validation: non-empty string, max 4096 chars. Writes to the appropriate column via service-role client.

`reset-key`
```jsonc
// request
{ "action": "reset-key", "provider": "openai|gemini|fal|pulse" }
// response
{ "success": true }
```
Sets the column to `NULL`; the function will then fall back to the Deno env var.

**Column map:**

| Provider | Column |
|---|---|
| `openai` | `llm_settings.openai_api_key` |
| `gemini` | `llm_settings.gemini_api_key` |
| `fal` | `llm_settings.fal_api_key` |
| `pulse` | `llm_settings.upload_post_api_key` |

**Security properties:** Raw key value never appears in any response body, log line, or error message. Input validation rejects keys over 4096 chars. SEC-001 reversal is documented in the migration comment and in `src/types/llm.ts`.

**CORS:** `supabase/functions/_shared/cors.ts`

**Env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

##### `storage-stats`

**Source:** `supabase/functions/storage-stats/index.ts`

**Purpose:** Aggregates storage usage across the workspace and returns per-bucket stats plus the admin-configured quota.

**HTTP:** `POST /storage-stats`

**Auth:** User Bearer token (no admin gate - all authenticated users can view stats).

**Response:**
```jsonc
{ "used_bytes": N,
  "total_bytes": N,
  "percentage": 42.7,
  "buckets": {
    "files":             { "used": N, "limit": N },
    "brain-documents":   { "used": N, "limit": N },
    "wishpedia-media":   { "used": N, "limit": N },
    "profile-pictures":  { "used": N, "limit": N }
  } }
```

**Data sources:**
- `files.size` sum from the `files` table.
- `brain_documents.size` sum from the `brain_documents` table.
- `wishpedia_entry_images.file_size` sum from the images table.
- Quota read from `file_settings.total_storage_quota_gb` (default: 5 GB).
- Actual bucket configs via `storage.getBucket()` for the `bucket_limits` map.

**CORS:** Wildcard `Access-Control-Allow-Origin: *`

**Env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

##### `update-bucket-settings`

**Source:** `supabase/functions/update-bucket-settings/index.ts`

**Purpose:** Admin-only update of file upload limits and allowed MIME types across the `files` and `brain-documents` buckets.

**HTTP:** `POST /update-bucket-settings`

**Auth:** User Bearer token + `is_admin` RPC gate.

**Request / response:**
```jsonc
// request
{ "max_file_size_mb": 50,
  "total_storage_quota_gb": 10,
  "allowed_file_types": ["image/jpeg", "application/pdf"],
  "auto_delete_trash_days": 30 }
// response
{ "success": true }
```

Calls `storage.updateBucket()` for both `files` and `brain-documents`. Includes special error handling for the Supabase global file size ceiling: when the upstream returns a "global limit exceeded" error the function returns a descriptive 400 instead of a generic 500. Persists settings to the `file_settings` table.

**CORS:** Wildcard `Access-Control-Allow-Origin: *`

**Env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

##### `wishpedia-generate`

**Source:** `supabase/functions/wishpedia-generate/index.ts`

**Purpose:** Generate product/character reference images for Wishpedia entries using OpenAI or Gemini, with optional reference images from prior angles.

**HTTP:** `POST /wishpedia-generate`

**Auth:** User Bearer token. Admin check: `user_roles.role = 'admin'` direct table query (not `is_admin` RPC - note inconsistency with other admin-gated functions).

**Actions:**

`generate-image`
```jsonc
// request
{ "action": "generate-image",
  "entry_id": "uuid",
  "angle": "front|back|side|detail",
  "reference_images": ["uuid", ...],  // max 3
  "feedback": "...",
  "custom_prompt": "...",
  "transparent_background": true }
// response
{ "image_id": "uuid", "public_url": "https://..." }
```

`generate-batch`
```jsonc
// request
{ "action": "generate-batch",
  "entry_id": "uuid",
  "angles": ["front", "back", "side"],
  "transparent_background": true }
// response
{ "results": [
    { "angle": "front", "image_id": "uuid", "public_url": "..." },
    { "angle": "back",  "error": "..." }
  ] }
```

`generate-batch` fires all angles concurrently via `Promise.allSettled`; partial failures are captured per-angle without aborting the batch.

**Provider routing:**
- **OpenAI:** `/v1/images/edits` when reference blobs are provided; `/v1/images/generations` when generating from prompt only. PNG format, transparent background flag supported.
- **Gemini:** `generateContent` with `inlineData` reference images and `responseModalities: ['image', 'text']`.

**API key resolution:** env var first (`OPENAI_API_KEY` / `GEMINI_API_KEY`), then DB column. This is reversed from the pattern used by `ai-chat` and `osha-chat` which check DB first.

**Storage:** Generated PNG saved to the `wishpedia-media` bucket. A `wishpedia_entry_images` row is inserted with the `angle`, `file_size`, and `public_url`.

**CORS:** Wildcard `Access-Control-Allow-Origin: *`

**Env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`

---

### 10. RAG and Knowledge Pipeline

#### Overview

The knowledge pipeline converts documents, compliance rules, and Wishpedia product entries into 1536-dimensional vector embeddings stored in Postgres via `pgvector`. At query time, a cosine-similarity search retrieves relevant chunks which are injected into agent system prompts before the LLM call.

---

#### Embedding model

| Property | Value |
|---|---|
| Model | `text-embedding-3-small` |
| Provider | OpenAI |
| Dimensions | 1536 |
| API endpoint | `https://api.openai.com/v1/embeddings` |
| Batch size | 50 chunks per API call |
| Used by | `process-embeddings`, `process-ocr`, `search-knowledge`, `ai-chat`, `osha-chat`, `pixel-chat` |

---

#### Database schema

**`knowledge_embeddings` table** - defined in `supabase/migrations/20260202100238_4fbe7b06-b577-45ec-8a4f-ea573a95a99b.sql`:

```sql
CREATE TABLE public.knowledge_embeddings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type   public.knowledge_source_type NOT NULL,
  source_id     UUID NOT NULL,
  content       TEXT NOT NULL,
  embedding     extensions.vector(1536),
  metadata      JSONB DEFAULT '{}',
  chunk_index   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

**`knowledge_source_type` enum** - values added across two migrations:

- Initial values (`20260202100238`): `'brain_document'`, `'heart_rule'`
- Added (`20260406150200_ec4a12ad-a53e-4e0f-9603-b6f33b507efe.sql`): `'wishpedia_entry'`

**HNSW index** - same initial migration:

```sql
CREATE INDEX knowledge_embeddings_embedding_idx
  ON public.knowledge_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops);
```

Distance metric: cosine (`<=>` operator). The HNSW index enables sub-linear approximate nearest-neighbour search. `ef_search` tuning and BM25 hybrid search referenced in `CLAUDE.md` audit notes were applied as live DB changes and are not captured in the migration files under `supabase/migrations/`.

---

#### `match_knowledge` RPC

The primary retrieval function. Current signature (from `supabase/migrations/20260202100601_ef4d14b2-f25b-48f0-9810-ccf93e193936.sql`):

```sql
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding    TEXT,
  match_threshold    FLOAT     DEFAULT 0.7,
  match_count        INT       DEFAULT 10,
  filter_source_types public.knowledge_source_type[] DEFAULT NULL,
  filter_agent_id    TEXT      DEFAULT NULL
)
RETURNS TABLE (
  id          UUID,
  source_type public.knowledge_source_type,
  source_id   UUID,
  content     TEXT,
  metadata    JSONB,
  similarity  FLOAT
)
```

The `query_embedding` parameter accepts the vector as a serialised text string (`'[0.001, 0.002, ...]'`) which is cast internally to `extensions.vector(1536)`. Similarity is computed as:

```sql
(1 - (ke.embedding <=> query_vec))::FLOAT AS similarity
```

Agent filtering logic: returns a row if `filter_agent_id` is NULL, OR `ke.metadata->>'agent_id' = filter_agent_id`, OR `filter_agent_id = ANY(ARRAY(SELECT jsonb_array_elements_text(ke.metadata->'assigned_agents')))`, OR `(ke.metadata->>'is_global')::BOOLEAN = TRUE`.

Note: the `search-knowledge` edge function also passes a `query_text` parameter to the RPC. No migration adding this parameter was found in `supabase/migrations/`. This may be a live DB change not reflected in the local migration files, or the parameter may be silently ignored by the current function signature.

---

#### Chunking

All text goes through `chunkText` from `supabase/functions/_shared/chunker.ts` before embedding:

| Parameter | Default |
|---|---|
| `chunkSize` | 1000 characters |
| `overlap` | 100 characters |
| `maxChunks` | 150 |

Split priority: paragraph boundary (`\n\n`) > sentence boundary (`. `) > word boundary (` `). The overlap window carries context across chunk boundaries to reduce retrieval gaps.

---

#### Ingestion flows

**Brain document ingestion**

Triggered from the UI or an admin action. Entry point: `process-embeddings` function with `action='process_document'`.

1. Fetch `brain_documents` row to get storage `path` and `mime_type`.
2. Download file from `brain-documents` bucket via service-role client.
3. Extract text based on format:
   - **DOCX:** `fflate` unzips the file; `word/document.xml` is walked with a regex walker.
   - **Excel (xlsx/xls):** SheetJS parses sheets; rows are joined as tab-separated lines.
   - **text/html/csv/json:** direct UTF-8 decode.
   - **PDF / image:** returns empty string; caller must use `process-ocr`.
4. Truncate at `MAX_TEXT_LENGTH = 300000` characters.
5. `chunkText` produces up to 150 chunks.
6. Delete existing embeddings for this `source_id` (paginated batches of 500).
7. Batch-embed 50 chunks at a time via `text-embedding-3-small`.
8. Insert rows into `knowledge_embeddings` with `source_type='brain_document'`, plus metadata: `name`, `category`, `section_id`, `restricted_agents`, `mime_type`.

**PDF OCR ingestion**

For PDFs where text extraction is not feasible via the document parser. Entry point: `process-ocr` function.

1. Client renders PDF pages to base64 PNG images (done browser-side).
2. Client POSTs batches of up to 50 pages to `process-ocr`.
3. For each page: POST to OpenAI gpt-4o with the base64 image, requesting text extraction (`TOKEN_BUDGETS.OCR_EXTRACTION = 4096` tokens).
4. All page texts concatenated.
5. If `append=true`: read current max `chunk_index` for this document; offset new chunks.
6. `chunkText` on full extracted text.
7. Batch-embed and insert with `metadata.extraction_method='ocr_vision'`, `metadata.page_count=N`.

**Heart rule ingestion**

Entry point: `process-embeddings` with `action='process_rule'`.

1. Fetch `heart_rules` row.
2. Concatenate `name + description + category + content`.
3. `chunkText` (rules are typically short; usually produces 1–3 chunks).
4. Delete existing embeddings for this rule.
5. Embed and insert with `source_type='heart_rule'`.

**Wishpedia entry ingestion**

Entry point: `process-embeddings` with `action='process_entry'`.

1. Fetch `wishpedia_entries` joined with `wishpedia_entry_images`.
2. Build structured text: entry name, description, category, and per-image lines with angle labels and public URLs.
3. `chunkText`.
4. Delete existing embeddings for this entry.
5. Embed and insert with `source_type='wishpedia_entry'`, metadata: `entry_name`, `category_name`, `image_urls`.

---

#### Retrieval logic

**Direct `match_knowledge` calls (agent functions)**

`osha-chat`, `pixel-chat`, `ai-chat`, and `promptor` call the `match_knowledge` RPC directly via the Supabase client:

```typescript
const { data } = await supabaseAdmin.rpc('match_knowledge', {
  query_embedding: embeddingVector,   // serialised text string
  match_threshold: 0.2,               // varies per agent (see below)
  match_count: 30,
  filter_source_types: ['brain_document', 'wishpedia_entry'],
  filter_agent_id: 'osha',
});
```

Threshold and count per agent:

| Agent function | Threshold | Count | Source filter |
|---|---|---|---|
| `osha-chat` | 0.2 | depth-based (15/30/50) | none (filter_agent_id='osha') |
| `pixel-chat` Brain | 0.3 | 100 (unlimited) | none |
| `pixel-chat` Wishpedia | 0.3 | 10 | `['wishpedia_entry']` |
| `ai-chat` | 0.3 | 8 | `['brain_document','wishpedia_entry']` |
| `promptor` (via search-knowledge) | 0.3 | 10 | all types |

**`search-knowledge` function (weighted retrieval)**

Used by `promptor` (via HTTP) and the VectorStore UI. Adds source-type weighting on top of raw cosine similarity:

```
weighted_similarity = raw_similarity * weight_factor
```

Weights: `heart_rule=1.15`, `wishpedia_entry=1.05`, `brain_document=1.00`. Results re-sorted by `weighted_similarity`.

---

#### Context injection into agent prompts

After retrieval, each agent function assembles the LLM context:

1. **Heart rules block** - all active global rules plus rules assigned to the agent are fetched from the `heart_rules` table (no similarity filter; always injected in full). Prepended to the system prompt as hard compliance constraints.

2. **Brain/Wishpedia knowledge block** - top-N chunks from `match_knowledge` appended to the system prompt as brand/product context. Chunks carry `metadata` fields (document name, category, agent restrictions) used for citation or filtering.

3. **User message** - sanitized via `sanitizeForPrompt` from `supabase/functions/_shared/sanitize.ts` before being added to the message array.

The final prompt structure for a typical `osha-chat` call:

```
[System]: {mode instructions}
[System]: HEART RULES: {rule 1} ... {rule N}
[System]: BRAND CONTEXT: {chunk 1} ... {chunk M}
[History]: {prior messages}
[User]: {sanitized user message}
```

---

#### Agents consuming the RAG pipeline

| Agent | Heart rules | Brain knowledge | Wishpedia entries |
|---|---|---|---|
| `osha-chat` | Yes (always, full text) | Yes (depth-scaled) | No |
| `ai-chat` | Yes | Yes | Yes |
| `pixel-chat` | No (visual context only) | Yes (limit=100) | Yes (enriched with image URLs) |
| `promptor` | Yes (always, full text) | Yes (via search-knowledge, weighted) | Yes (via search-knowledge, weighted) |
| `wishpedia-generate` | No | No | No (uses Wishpedia data as prompt input, not RAG) |

---

### 11. Wishpedia

#### Content Model

Wishpedia is an encyclopedia of product/character entries, each belonging to a category and carrying multiple images (including structured angle views).

**Tables (3):**

| Table | Key columns |
|---|---|
| `wishpedia_categories` | `id`, `name`, `description`, `icon` (Lucide name), `color`, `has_angle_views` (bool), `sort_order`, `is_active` |
| `wishpedia_entries` | `id`, `category_id` (FK), `slug` (auto-generated from name), `name`, `description`, `is_archived`, `created_by` |
| `wishpedia_entry_images` | `id`, `entry_id` (FK), `storage_path`, `original_name`, `mime_type`, `size`, `angle` (nullable), `sort_order`, `is_primary`, `uploaded_by` |

TypeScript types are in `src/types/wishpedia.ts`. The `ANGLE_VIEWS` constant defines the six structured angles:

```ts
// src/types/wishpedia.ts
export const ANGLE_VIEWS = ['front', 'back', 'left', 'right', 'top', 'bottom'] as const;
export type AngleView = typeof ANGLE_VIEWS[number];
```

`is_primary` is automatically set to `true` when `angle === 'front'` on upload.

**Storage bucket:** `wishpedia-media` (public bucket). Path format: `{entryId}/{timestamp}_{sanitizedFilename}`.

Public URL helper: `getWishpediaImageUrl(storagePath)` in `src/hooks/useWishpediaImages.ts` calls `supabase.storage.from('wishpedia-media').getPublicUrl(storagePath)`.

#### Color Helpers

`src/lib/wishpediaColors.ts` maps any DB `color` value to amber-family Tailwind classes. `getWishpediaCategoryStyle()` returns a fixed set of amber tokens regardless of the stored color. This ensures brand consistency.

```ts
// src/lib/wishpediaColors.ts
export function getWishpediaCategoryStyle() {
  return {
    dot: 'bg-amber-500',
    softBg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    // ...
  };
}
```

#### Hooks

| Hook | File | Returns | Notes |
|---|---|---|---|
| `useWishpediaEntries(options?)` | `src/hooks/useWishpediaEntries.ts` | `WishpediaEntry[]` | Filters: `search`, `categoryId`, `includeArchived`; ordered newest-first |
| `useWishpediaEntry(id)` | same | `WishpediaEntry \| null` | Lookup by UUID |
| `useWishpediaEntryBySlug(slug)` | same | `WishpediaEntry \| null` | Accepts UUID or slug string |
| `useWishpediaEntryCount()` | same | `number` | Count of non-archived entries |
| `useCreateWishpediaEntry()` | same | mutation | Auto-generates slug; triggers embedding on success if description exists |
| `useUpdateWishpediaEntry()` | same | mutation | Re-slugs if name changes; re-indexes embedding |
| `useDeleteWishpediaEntry()` | same | mutation | Cascade: deletes embeddings, storage files, image rows, then entry |
| `useWishpediaCategories()` | `src/hooks/useWishpediaCategories.ts` | `WishpediaCategory[]` | Ordered by `sort_order` |
| `useCreateWishpediaCategory()` | same | mutation | |
| `useUpdateWishpediaCategory()` | same | mutation | |
| `useDeleteWishpediaCategory()` | same | mutation | |
| `useWishpediaImages(entryId)` | `src/hooks/useWishpediaImages.ts` | `WishpediaEntryImage[]` | Ordered by `sort_order` |
| `useUploadWishpediaImage()` | same | mutation | Sanitizes filename; replaces existing image at same angle; sets `is_primary` for front; re-indexes |
| `useDeleteWishpediaImage()` | same | mutation | Removes from storage + DB row; re-indexes |
| `useSetPrimaryImage()` | same | mutation | Clears all `is_primary` then sets target |
| `useUnindexedEntryCount()` | `src/hooks/useBulkWishpediaIndex.ts` | `number` | Entries without a `knowledge_embeddings` row |
| `useBulkWishpediaIndex()` | same | `{ isRunning, progress, total, currentName, start, cancel }` | Sequential processing with 800ms delay between entries; `AbortController` for cancel; Sentry on error |

**Search/filter pattern:** `useWishpediaEntries` accepts `{ search, categoryId, includeArchived }`. The `search` string is sanitized via `escapePostgrestSearch` from `src/lib/utils.ts` then applied as `.or('name.ilike.%x%,description.ilike.%x%')`. Filtering is client-driven via query params; no server-side pagination.

#### Gallery UI Components

| Component | File | Role |
|---|---|---|
| `WishpediaEntryCard` | `src/components/wishpedia/WishpediaEntryCard.tsx` | Masonry card; 2/3 aspect ratio; hover glow; category badge |
| `WishpediaCharacterView` | `src/components/wishpedia/WishpediaCharacterView.tsx` | Cinematic hero (21/9 on desktop), horizontal metadata strip, filmstrip thumbnails, free gallery |
| `WishpediaLightbox` | `src/components/wishpedia/WishpediaLightbox.tsx` | shadcn Dialog; fullscreen (95vw x 92vh); keyboard arrow nav; angle label pill |
| `WishpediaAngleGrid` | `src/components/wishpedia/WishpediaAngleGrid.tsx` | 6-slot grid for the fixed angle views |
| `WishpediaFreeGallery` | `src/components/wishpedia/WishpediaFreeGallery.tsx` | Masonry grid for non-angle images |
| `WishpediaCreateDialog` | `src/components/wishpedia/WishpediaCreateDialog.tsx` | Admin create form: name, description, category picker |
| `SelectFromFilesDialog` | `src/components/wishpedia/SelectFromFilesDialog.tsx` | Picks images from the files bucket to import as Wishpedia images |

Index screen (`src/screens/WishpediaIndex.tsx`) renders `columns-2 sm:columns-3 lg:columns-4 xl:columns-5` CSS masonry with `break-inside-avoid` per card. Entry screen (`src/screens/WishpediaEntry.tsx`) uses `useWishpediaEntryBySlug` with the `[slug]` param.

#### Routes

| Route | File | Guard |
|---|---|---|
| `/mastermind/wishpedia` | `src/app/(protected)/mastermind/wishpedia/page.tsx` | `ToolProtectedRoute toolKey="mastermind"` |
| `/mastermind/wishpedia/[slug]` | `src/app/(protected)/mastermind/wishpedia/[slug]/page.tsx` | `ToolProtectedRoute toolKey="mastermind"` |

#### Admin Authoring Flow

1. Admin opens `/mastermind/wishpedia`, clicks Create.
2. `WishpediaCreateDialog` calls `useCreateWishpediaEntry` to insert the entry row; slug is auto-derived.
3. In the entry view, admin uploads images via `useUploadWishpediaImage` to `wishpedia-media` bucket, optionally assigning an angle.
4. For AI-generated images, the `wishpedia-generate` edge function is called (OpenAI or Gemini image models); it generates image bytes and uploads them to `wishpedia-media`, then inserts a row in `wishpedia_entry_images`.
5. On each image upload or update, `useProcessWishpediaEntryEmbedding` (from `src/hooks/useKnowledgeEmbeddings.ts`) is called to re-index the entry in `knowledge_embeddings` for RAG search.
6. Bulk-indexing of un-indexed entries is available via `useBulkWishpediaIndex` in the Vector Store admin panel.

#### Consumption Flow

The `wishpedia-generate` edge function (`supabase/functions/wishpedia-generate/index.ts`) accepts reference image IDs, generates images via OpenAI/Gemini, uploads to `wishpedia-media`, and returns the new image row. The Pixel agent (`src/components/pixel/WishReferencePanel.tsx`) lets users pick Wishpedia entries as visual references; selected images are fetched as public URLs, converted to base64, and sent as `AttachmentContext` to the `pixel-chat` edge function.

---

### 12. Authentication and Authorization

#### Supabase Auth Configuration

- **Protocol:** Cookie-based SSR via `@supabase/ssr`.
- **Browser client:** `createBrowserClient` in `src/integrations/supabase/client.ts` reads/writes auth state to `document.cookie`.
- **Server client:** `createServerClient` in `src/lib/supabase/server.ts` reads from `next/headers` cookies.
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (both required; module throws at init if missing).
- **Auth method:** Email + password (`signInWithPassword`). No OAuth providers are wired in the current code.

```ts
// src/integrations/supabase/client.ts
export const supabase = createBrowserClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
);
```

#### Sign-in and Reset Flows

- Sign-in: `src/screens/Login.tsx` calls `AuthContext.signIn(email, password)`, which calls `supabase.auth.signInWithPassword`.
- Password reset: `src/screens/ResetPassword.tsx` (route: `/reset-password`).
- Both are public routes under `src/app/(public)/`.

#### Session Handling

The middleware at `middleware.ts` (repo root) delegates to `updateSession` from `src/lib/supabase/middleware.ts` on every non-static request. `updateSession` calls `supabase.auth.getUser()` which refreshes the access token cookie if needed:

```ts
// src/lib/supabase/middleware.ts
await supabase.auth.getUser();  // Refreshes session cookie in-place
```

The `AuthContext` uses `getUser()` (server round-trip) rather than `getSession()` (cached read) to validate the session on startup (comment `CODE-002`). Profile and role are loaded via two sequential Supabase queries (`profiles`, `user_roles`).

#### Role and Permission Model

**Roles** (Supabase enum `app_role`): `admin`, `user`.

`isAdmin` is derived from `role === 'admin'` in `AuthContext`. The `is_admin` Postgres RPC is used in edge functions as the admin gate.

**Top-level tool permissions** (column type `permission_level` enum): `none`, `view`, `limited`, `full`. Applied to 6 tools:

| Column | Tool |
|---|---|
| `files_manager` | Files Manager |
| `mastermind` | MasterMind |
| `ai_agents` | AI Agents |

**Granular boolean permissions** (columns in `user_permissions` table): ~30 columns covering per-agent access (`ai_can_access_osha`, `ai_can_access_pixel`, `ai_can_access_whisper`, `ai_can_access_atlas`, etc.), per-section MasterMind access, and file operations.

Defined in full in `src/types/user.ts` as `UserPermissions` interface.

Admins bypass the permission query entirely; `useCurrentUserPermissions` returns a hardcoded full-access object when `isAdmin` is true.

Permission level ordering: `none < view < limited < full`, enforced in `ToolProtectedRoute` via `meetsPermissionLevel`.

#### Three Enforcement Layers

| Layer | Location | Mechanism |
|---|---|---|
| 1. Middleware | `middleware.ts` + `src/lib/supabase/middleware.ts` | Runs on every non-static request; refreshes session cookie; does NOT redirect (redirect handled at layout) |
| 2. Protected layout server guard | `src/app/(protected)/layout.tsx` | Server Component; calls `supabase.auth.getUser()`; `redirect('/login')` if no user. Runs before any client JS. |
| 3. ToolProtectedRoute client gate | `src/components/ToolProtectedRoute.tsx` | Client Component; reads `useCurrentUserPermissions()`; renders "Access Denied" if `userLevel < requiredLevel`. Default `requiredLevel` is `'view'`. |

`ProtectedRoute` (`src/components/ProtectedRoute.tsx`) is a secondary client guard used in select places for admin-only routes; it redirects to `/dashboard` when `requireAdmin` is true but user is not admin.

---

### 13. Integrations

| Service | Purpose | Surface | Auth | Env vars | Features |
|---|---|---|---|---|---|
| **Supabase DB** | Primary database (Postgres 17 + pgvector) | All hooks via `src/integrations/supabase/client.ts`; server via `src/lib/supabase/server.ts` | Cookie-based JWT | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 33 tables, RLS on all, HNSW vector search |
| **Supabase Auth** | User authentication, session management | `AuthContext`, all edge functions via `getUser()` | JWT in cookies | same as DB | Email+password; cookie SSR |
| **Supabase Storage** | File and media storage | `src/hooks/files/`, `src/hooks/useWishpediaImages.ts`, `src/hooks/useUploadAvatar.ts` | User JWT (RLS) | same as DB | Buckets: `files` (private), `wishpedia-media` (public), `profile-pictures` (public), `brain-documents` |
| **Supabase Edge Functions** | Serverless compute for AI, file ops, user mgmt | All AI agent hooks via `src/lib/apiHelpers.ts` `getAuthHeaders()` | `Authorization: Bearer {access_token}` + `apikey` header | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Deno env, server-side only) | 12 functions deployed |
| **OpenAI** | Text generation, image generation, embeddings, OCR, deep research | `supabase/functions/ai-chat`, `osha-chat`, `pixel-chat`, `promptor`, `wishpedia-generate`, `process-embeddings`, `process-ocr`, `search-knowledge` | `Authorization: Bearer {key}` | `OPENAI_API_KEY` (Deno env); fallback to `llm_settings.openai_api_key` (DB) | GPT-4o, GPT-5, image gen, deep research, text-embedding-3-small |
| **Google Gemini** | Text generation, image generation, video generation | `supabase/functions/ai-chat`, `osha-chat`, `pixel-chat`, `promptor`, `wishpedia-generate` | `?key={key}` query param | `GEMINI_API_KEY` (Deno env); fallback to `llm_settings.gemini_api_key` (DB) | Gemini 2.5 Flash/Pro, image models, Veo video |
| **fal.ai** | Image generation, video generation, text (via OpenRouter) | `supabase/functions/ai-chat` | `Authorization: Key {key}` | `FAL_KEY` (Deno env); fallback to `llm_settings.fal_api_key` (DB) | FLUX, Ideogram, Recraft, Kling, Veo 3.1, Wan, Seedance |
| **upload-post.com (Pulse)** | Social media scheduling and queue management | `supabase/functions/pulse-api/index.ts`; client via `src/hooks/usePulseSettings.ts` | `Authorization: Apikey {key}` (non-standard scheme) | `UPLOAD_POST_API_KEY` (Deno env); fallback to `llm_settings.upload_post_api_key` (DB) | Test connection, list accounts, queue settings, Facebook/LinkedIn/Pinterest pages, webhook |
| **Sentry** | Error tracking and performance monitoring | `src/` (24 `Sentry.captureException` calls); `sentry.server.config.ts`; `sentry.edge.config.ts`; wrapped via `withSentryConfig` in `next.config.ts` | DSN-based | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Production-only (`NODE_ENV === 'production'`); 10% traces sample rate; source maps via `widenClientFileUpload` |
| **Vercel Analytics** | Page view and web analytics | `src/app/layout.tsx`: `<Analytics />` from `@vercel/analytics/next` | Automatic (Vercel platform) | `VERCEL` (auto-injected) | Rendered only when `process.env.VERCEL` is set |
| **Vercel Speed Insights** | Core Web Vitals monitoring | `src/app/layout.tsx`: `<SpeedInsights />` from `@vercel/speed-insights/next` | Automatic (Vercel platform) | `VERCEL` (auto-injected) | Rendered only when `process.env.VERCEL` is set |
| **ElevenLabs** | Text-to-speech for Whisper (podcast) agent | Referenced in agent description (`src/data/agents.ts`); not yet implemented in edge functions | API key (not yet wired) | None defined yet | Planned: Whisper agent generates audio from AI scripts. Currently a coming-soon page. |

**Note on AI key resolution:** All AI-calling edge functions follow the pattern `llm_settings.{provider}_api_key || Deno.env.get('{ENV_VAR}')`. The DB column is checked first; the env var is the fallback. The column is never returned to the browser (enforced by the `LLM_SETTINGS_CLIENT_COLUMNS` whitelist in `src/hooks/useLLMSettings.ts`).

---

### 14. API Routes

**Confirmed: no Next.js route handlers (`route.ts` / `route.tsx`) exist in this codebase.** A glob search for `src/app/**/route.ts` and `src/app/**/route.tsx` returns zero results. The app uses Supabase Edge Functions exclusively for all server-side logic.

The effective API surface is defined in `src/config/api.ts`:

```ts
// src/config/api.ts
export const EDGE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
export const AI_CHAT_ENDPOINT    = `${EDGE_FUNCTIONS_URL}/ai-chat`;
export const MANAGE_USERS_ENDPOINT = `${EDGE_FUNCTIONS_URL}/manage-users`;
export const SETTINGS_KEYS_ENDPOINT = `${EDGE_FUNCTIONS_URL}/settings-keys`;
export const PULSE_API_ENDPOINT  = `${EDGE_FUNCTIONS_URL}/pulse-api`;
```

**All 12 deployed edge functions:**

| Function | Primary actions |
|---|---|
| `ai-chat` | Text generation (OpenAI/Gemini/fal), image generation, video, deep research, check-keys |
| `osha-chat` | Osha agent chat, deep research, settings CRUD, history |
| `pixel-chat` | Pixel agent chat, blueprint generation, settings CRUD, history |
| `promptor` | create, optimize, optimize-draft prompt actions |
| `wishpedia-generate` | Single-image and batch angle-image generation for Wishpedia entries |
| `manage-users` | Admin user CRUD (invite, update, delete) |
| `settings-keys` | update-key, reset-key, check-keys for OpenAI/Gemini/fal providers |
| `pulse-api` | Proxy for upload-post.com: test-connection, list-accounts, queue settings, platforms, webhook |
| `storage-stats` | Bucket size and file count stats |
| `update-bucket-settings` | Admin bucket public/private toggle |
| `serve-file` | Signed-URL proxy for private `files` bucket |
| `process-embeddings` | Generate and store vector embeddings for brain documents and Wishpedia entries |
| `search-knowledge` | Hybrid vector + BM25 search over `knowledge_embeddings` |
| `process-ocr` | OCR extraction from images/PDFs using OpenAI Vision |

All edge functions require `Authorization: Bearer {access_token}` plus `apikey: {SUPABASE_ANON_KEY}` headers. These are built by `getAuthHeaders()` in `src/lib/apiHelpers.ts`. Edge functions internally validate the token via `supabase.auth.getUser()` and use `is_admin` RPC for admin-gated actions.

---

### 15. Hooks and Utilities

#### Hooks by Group

**Root hooks (`src/hooks/`)**

| File | Key exports | Usage |
|---|---|---|
| `useAgentSettings.ts` | `useAgentSettings(agentId)`, `useUpsertAgentSettings()` | Agent model/temperature/prompt config per agent ID |
| `useBrainCategories.ts` | `useBrainCategories()`, `useCreateBrainCategory()`, etc. | CRUD for `brain_categories` |
| `useBrainDocuments.ts` | `useBrainDocuments(sectionId?)`, `useCreateBrainDocument()`, `useDeleteBrainDocument()`, etc. | CRUD for `brain_documents` |
| `useBrainSections.ts` | `useBrainSections(categoryId?)`, `useCreateBrainSection()`, etc. | CRUD for `brain_sections` |
| `useBranding.ts` | `useBranding()`, `useUpdateBranding()` | Reads/writes `branding_settings` |
| `useBulkWishpediaIndex.ts` | `useBulkWishpediaIndex()`, `useUnindexedEntryCount()` | Bulk RAG indexing of Wishpedia entries |
| `useChatUtils.ts` | Chat formatting utilities | Shared across Osha/Pixel |
| `useConsoleMessages.ts` | `useConsoleMessages()` | Reads `console_messages` table |
| `useFiles.ts` | Re-export barrel | Points to `./files` |
| `useFileSettings.ts` | `useFileSettings()`, `useUpdateFileSettings()` | Reads/writes file module settings |
| `useHeartCategories.ts` | `useHeartCategories()`, `useCreateHeartCategory()`, etc. | CRUD for `heart_categories` |
| `useHeartRules.ts` | `useHeartRules(categoryId?)`, `useCreateHeartRule()`, `useUpdateHeartRule()`, `useDeleteHeartRule()` | CRUD for `heart_rules` |
| `useKnowledgeEmbeddings.ts` | `useProcessWishpediaEntryEmbedding()`, `useDeleteEmbedding()`, `processEmbedding()` | Triggers `process-embeddings` edge fn |
| `useLLMSettings.ts` | `useLLMSettings()`, `useUpdateLLMSettings()` | Reads `llm_settings` with explicit column whitelist (no key columns returned to browser) |
| `useNexusConsoleController.ts` | Controller for Nexus AI console | Orchestrates Nexus agent interaction |
| `useOcrIndexing.ts` | `useOcrIndexing()` | Triggers `process-ocr` edge fn |
| `useOsha.ts` | Re-export barrel | Points to `./osha` |
| `useOshaChatController.ts` | `useOshaChatController()` | Full Osha chat state machine: send, clear, modes, optimize draft |
| `useOshaPower.ts` | `useOshaPower()` | Osha power/active state toggle |
| `usePixel.ts` | Re-export barrel | Points to `./pixel` |
| `usePromptor.ts` | Re-export barrel | Promptor hooks |
| `usePromptorSession.ts` | `usePromptorSession()` | Creates/resumes Promptor sessions |
| `usePulseSettings.ts` | `usePulseTestConnection()`, `usePulseAccounts()`, `usePulseQueueSettings()`, `useUpdatePulseQueueSettings()`, `usePulsePlatforms()` | upload-post.com proxy hooks |
| `useProviderKeyActions.ts` | `useUpdateProviderKey()`, `useResetProviderKey()` | Calls `settings-keys` edge fn |
| `useProviderKeyStatus.ts` | `useProviderKeyStatus()` | Returns `{ openai, gemini, fal }` each `'db' \| 'env' \| 'none'`; `hasProviderKey(source)` helper |
| `useQuickPrompts.ts` | `useQuickPrompts()`, `useCreateQuickPrompt()`, etc. | CRUD for `quick_prompts` |
| `useSaveToBrain.ts` | `useSaveToBrain()` | Saves chat content to `brain_documents` |
| `useSystemPrompts.ts` | `useSystemPrompts()` | Reads system prompt config |
| `useUploadAvatar.ts` | `useUploadAvatar()` | Uploads to `profile-pictures` public bucket |
| `useUserPermissions.ts` | `useUserPermissions(userId?)`, `useCurrentUserPermissions()`, `useUpdateUserPermissions()` | Permission CRUD |
| `useUsers.ts` | `useUsers()`, `useUpdateUser()`, `useDeleteUser()` | Admin user management via `manage-users` edge fn |
| `useVectorStoreManagement.ts` | `useVectorStore()`, `useDeleteVectorEntry()`, etc. | Admin view/manage `knowledge_embeddings` |
| `useWishpediaCategories.ts` | `useWishpediaCategories()`, `useCreateWishpediaCategory()`, `useUpdateWishpediaCategory()`, `useDeleteWishpediaCategory()` | Category CRUD |
| `useWishpediaEntries.ts` | `useWishpediaEntries()`, `useWishpediaEntry()`, `useWishpediaEntryBySlug()`, `useWishpediaEntryCount()`, `useCreateWishpediaEntry()`, `useUpdateWishpediaEntry()`, `useDeleteWishpediaEntry()` | Entry CRUD with auto-slug and embedding triggers |
| `useWishpediaImages.ts` | `useWishpediaImages()`, `useUploadWishpediaImage()`, `useDeleteWishpediaImage()`, `useSetPrimaryImage()`, `getWishpediaImageUrl()` | Image CRUD |
| `use-toast.ts` | `useToast()` | shadcn toast hook |

**Files subdir (`src/hooks/files/`)**

| File | Key exports | Usage |
|---|---|---|
| `useFilesCore.ts` | `useFiles(view, type, sectorId?, search?)`, `useUploadFile()`, `useDeleteFile()`, `useUpdateFile()` | Core files CRUD |
| `useFilesCount.ts` | `useFilesCount()` | File count for sidebar badge |
| `useStorage.ts` | `useStorageStats()` | Calls `storage-stats` edge fn |
| `useBrainBridge.ts` | `useBrainBridge()` | Saves file to Brain Knowledge |
| `useTags.ts` | `useFileTags()`, `useCreateFileTag()`, etc. | CRUD for `file_tags` |
| `useVersions.ts` | `useFileVersions()`, `useCreateFileVersion()` | CRUD for `file_versions` |
| `useSectors.ts` | `useSectors()`, `useCreateSector()`, etc. | CRUD for `sectors` |
| `fileUrls.ts` | `getFileUrl()`, `useFileUrl()` | Constructs signed/public file URLs |
| `types.ts` | `FileType`, `FileView`, `FileRecord` types | Shared types for files domain |
| `index.ts` | Barrel export | |

**Osha subdir (`src/hooks/osha/`)**

| File | Key exports | Usage |
|---|---|---|
| `useOshaMessages.ts` | `useOshaMessages()`, `useClearOshaHistory()` | Loads history; clear history with actionable network error messages |
| `useOshaSettings.ts` | `useOshaSettings()`, `useUpdateOshaSettings()` | Reads/writes via `osha-chat` edge fn; try/catch on fetch to avoid crash on extension interception |
| `useOshaSend.ts` | `useOshaSend()` | Sends a message to `osha-chat`; returns streaming response |
| `types.ts` | `OshaMessage`, `OshaSettings`, `DEFAULT_OSHA_SETTINGS` | |
| `index.ts` | Barrel export | |

**Pixel subdir (`src/hooks/pixel/`)**

| File | Key exports | Usage |
|---|---|---|
| `usePixelMessages.ts` | `usePixelMessages()`, `useClearPixelHistory()` | Same actionable error pattern as Osha |
| `usePixelSettings.ts` | `usePixelSettings()`, `useUpdatePixelSettings()` | try/catch on fetch |
| `usePixelBlueprints.ts` | `usePixelBlueprints()`, `useCreatePixelBlueprint()`, `useDeletePixelBlueprint()` | try/catch on fetch |
| `usePixelSend.ts` | `usePixelSend()` | Sends to `pixel-chat` edge fn |
| `types.ts` | `PixelMessage`, `PixelSettings`, `DEFAULT_PIXEL_SETTINGS` | |
| `index.ts` | Barrel export | |

**Promptor subdir (`src/hooks/promptor/`)**

| File | Key exports | Usage |
|---|---|---|
| `usePromptorSettings.ts` | `usePromptorSettings()`, `useUpdatePromptorSettings()` | `promptor_settings` CRUD |
| `usePromptorRuns.ts` | `usePromptorRuns()` | Lists `promptor_runs` |
| `usePromptorSession.ts` | `usePromptorSession()` | Session state |
| `useRunPromptor.ts` | `useRunPromptor()` | Calls `promptor` edge fn (create/optimize actions) |
| `useOptimizeDraft.ts` | `useOptimizeDraft()` | Calls `promptor` edge fn with `optimize-draft` action (in-chat rewrite) |
| `types.ts` | Promptor type definitions | |
| `index.ts` | Barrel export | |

#### Utilities (`src/lib/`)

| File | Exports | Purpose |
|---|---|---|
| `utils.ts` | `cn(...inputs)`, `sanitizeFileName(name)`, `escapePostgrestSearch(input)` | `cn` = `twMerge(clsx(...))`; `sanitizeFileName` normalizes NFD + strips special chars; `escapePostgrestSearch` escapes `%`, `_`, `\` for PostgREST `.ilike` |
| `constants.ts` | `LLM_SETTINGS_ROW_ID` | Fixed UUID `00000000-0000-0000-0000-000000000001` for the single-row `llm_settings` table |
| `apiHelpers.ts` | `getAuthHeaders()`, `edgeFunctionUrl(name)` | `getAuthHeaders` calls `getUser()` (validated) then `getSession()` for the token; returns `Content-Type`, `Authorization: Bearer`, `apikey` headers |
| `fileProcessing.ts` | `ACCEPTED_FILE_TYPES`, `extractTextFromFile(file, maxPages?)` | Extracts text (or base64) from PDF, DOCX, XLSX, images, plain text, CSV, JSON, Markdown using native FileReader + fflate; 60KB text cap |
| `fileTypes.ts` | `getFileIcon(mimeType, fileName?)`, `getFileTypeLabel(mimeType, fileName?)`, `formatFileSize(bytes)`, `getFileExtension(mimeType, fileName)` | MIME-to-Lucide-icon mapping; human-readable type labels; size formatting |
| `wishpediaColors.ts` | `WISHPEDIA_COLORS`, `getWishpediaCategoryStyle()` | Amber-family Tailwind classes for Wishpedia UI; DB color values are ignored at render time |
| `supabase/server.ts` | `createClient()` | Async factory for server-side `createServerClient` reading from `next/headers` cookies |
| `supabase/middleware.ts` | `updateSession(request)` | Session refresh middleware; calls `getUser()` to refresh cookie |

---

### 16. Environment and Configuration

#### Required Environment Variables

| Variable | Side | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project REST/Realtime URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client + Server | Supabase anon (publishable) key for client auth |
| `NEXT_PUBLIC_SUPABASE_PROJECT_ID` | Client | Project ID used to build storage URLs |
| `NEXT_PUBLIC_SENTRY_DSN` | Client | Sentry DSN; error tracking dormant without it |
| `SENTRY_AUTH_TOKEN` | Build-time | Authorizes source map upload to Sentry |
| `SENTRY_ORG` | Build-time | Sentry organization slug |
| `SENTRY_PROJECT` | Build-time | Sentry project slug |
| `VERCEL` | Runtime (auto) | Injected by Vercel; gates Analytics and Speed Insights rendering |
| `ANALYZE` | Build-time | Set to `'true'` to enable `@next/bundle-analyzer` |

**Edge function secrets (Supabase Deno env, never in client):**

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Auto-injected by Supabase into edge functions |
| `SUPABASE_ANON_KEY` | Auto-injected |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected; used for admin DB operations |
| `OPENAI_API_KEY` | OpenAI calls; fallback when DB column is empty |
| `GEMINI_API_KEY` | Gemini calls; fallback when DB column is empty |
| `FAL_KEY` | fal.ai calls; fallback when DB column is empty |
| `UPLOAD_POST_API_KEY` | upload-post.com; fallback when DB column is empty |
| `ALLOWED_ORIGINS` | CORS origin allowlist for edge functions; overrides hardcoded list |

#### Configuration Files

**`next.config.ts`**
- Wraps config in `withSentryConfig` and `withBundleAnalyzer`.
- Security headers applied to all routes: `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`.
- CSP `connect-src` allows `*.supabase.co` (WSS + HTTPS), `*.ingest.sentry.io`, `va.vercel-scripts.com`.
- `images.remotePatterns`: `*.supabase.co`, `lh3.googleusercontent.com`, `avatars.githubusercontent.com`.
- `redirects`: `/` to `/dashboard` (non-permanent).
- `serverExternalPackages`: `['pdfjs-dist']` (no server bundle).
- `typescript.ignoreBuildErrors: false` (TS errors fail the build).

**`tailwind.config.ts`**
- `darkMode: ["class"]` (next-themes class strategy).
- Content globs cover `./src/**/*.{ts,tsx}`.
- Custom colors: `fortun-blue`, `fortun-blue-light`, `fortun-blue-lighter`, `fortun-red`, `fortun-red-light`, `fortun-red-lighter` (all via CSS vars).
- Plugins: `tailwindcss-animate`, `@tailwindcss/typography`.

**`tsconfig.json`**
- Target: `ES2020`; module resolution: `bundler`.
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: false`.
- Path alias: `@/*` maps to `./src/*`.
- Supabase edge functions excluded from compilation.

**`eslint.config.js`**
- Uses `@eslint/js` + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`.

**`postcss.config.js`**
- Standard: `tailwindcss` + `autoprefixer`.

**`components.json`** (shadcn/ui config)
- Style: `default`; base color: `slate`; CSS variables enabled.
- Aliases: `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`.
- Note: `rsc: false` (shadcn CLI does not generate Server Component variants).

**`vercel.json`**
- `framework: "nextjs"`, `buildCommand: "npm run build"`, `devCommand: "npm run dev"`.
- **Deployment platform: Vercel.**

**`src/config/api.ts`**
- Centralizes all edge function endpoint URLs. Throws at module init if Supabase env vars are missing.

**`src/config/permissions.ts`**
- `TOOL_DEFINITIONS` array with metadata for 6 tools (key, label, icon, color, description).
- `PERMISSION_LEVEL_LABELS` and `PERMISSION_LEVEL_DESCRIPTIONS` maps.

**`src/config/llmModels.ts`**
- Model registries for OpenAI (text, image, video, deep research, file analysis), Gemini (text, image, video), and fal.ai (text, image, video).
- Default model constants for each provider/modality combination.
- Helper functions: `getTextModelsForProvider`, `getImageModelsForProvider`, `getVideoModelsForProvider`.

---

### 17. Testing Status

#### Test Frameworks in `package.json`

`package.json` has **no test framework dependencies and no test scripts**. The `scripts` object contains only: `dev`, `dev:webpack`, `build`, `start`, `lint`. There is no `test`, `test:e2e`, `vitest`, or `playwright` script entry.

Playwright 1.57.0 is listed in CLAUDE.md as part of the tech stack, but it is **not present in `package.json`** (neither `dependencies` nor `devDependencies`). It is used by the Jarvis/Claude Code agent via MCP (`mcp__playwright__*`) for ad-hoc browser testing during QA phases, not as a project-level automated test suite.

#### Test File Search Results

A glob search for `src/**/*.test.ts`, `src/**/*.spec.ts`, `src/**/__tests__/**`, and `e2e/**/*.ts` returns **zero results**. No application test files exist.

#### CI Workflow (`.github/workflows/ci.yml`)

The workflow runs on push and PR to `main`. Steps:

1. `npm ci` (install dependencies)
2. `npm run lint` (`eslint src middleware.ts`) -- `continue-on-error: true` because ~34 pre-existing react-refresh warnings exist (tracked as P3 CODE-039..046)
3. `npx tsc --noEmit` (TypeScript type check)
4. `npm run build` (Next.js production build) -- uses placeholder env vars to satisfy module init guards

**There are no automated unit tests, integration tests, or E2E tests.** The CI pipeline validates only lint, TypeScript correctness, and build success. Manual browser testing is performed ad-hoc via the Playwright MCP during development sessions.

---

---

### 18. Documented Doctrine vs. Code Reality

**Scope of investigation:** All files under `src/`, `supabase/functions/`, `supabase/migrations/`, and the five root-level markdown files (`CLAUDE.md`, `WISHNET_PROJECT_STATE.md`, `FULL_AUDIT_V2.md`, `MEMORY.md`, `README.md`, `docs/supabase-manual-changes.md`). No PDF files exist in the repository.

**Finding on doctrine source files:** No file named "WishNet cognitive doctrine", "canon authority map", or any doctrine PDF was found anywhere in the repository. The terms `doctrine`, `authority map`, `invariant`, `density law`, `protected origin`, `non-oracle`, `oracle`, `probabilistic`, `mystery elasticity`, `voice separation`, and `emergent canon` return zero matches across all project source code and all project markdown files. The doctrine described in this audit prompt exists **only outside the repository** (presumably in external PDFs or verbal documentation not committed to the codebase).

---

#### 18.1 Canon Authority Map (L0 to L4 tiers)

**Status: EXISTS ONLY IN DOCTRINE**

The terms `L0`, `L1`, `L2`, `L3`, `L4`, `authority map`, and `tier` (in a canon context) are absent from all source files. No enum, constant, database column, or schema constraint encodes a tiered authority hierarchy by these names.

The closest thing in code is an **unnamed four-tier knowledge retrieval sequence** expressed as plain text in the Osha system prompt inside `supabase/functions/osha-chat/index.ts` (lines 318-330):

- TIER 0: platform self-knowledge (hardcoded in prompt string)
- TIER 1: Brain knowledge base (RAG retrieval)
- TIER 2: general LLM knowledge
- TIER 3: web search (requires user permission)

This is a prompt-level instruction to the LLM, not a programmatic authority map. There is no code that routes, blocks, or scores responses based on tier. The tiers exist solely as natural-language instructions the LLM may or may not follow. The formal L0-L4 naming used in the doctrine has no counterpart anywhere in code.

---

#### 18.2 Heart Rules Engine and Canon Supremacy Enforcement

**Status: PARTIALLY EXISTS**

The Heart rules engine exists as a functional CRUD system:

- Database table `heart_rules` with columns: `name`, `rule_content`, `category`, `priority` (string: low/medium/high/critical), `is_global`, `assigned_agents`, `is_active`, `sort_order`. Source: `supabase/migrations/` and `src/types/brain.ts`.
- Client hooks for create/read/update/delete/reorder/toggle: `src/hooks/useHeartRules.ts`.
- Admin UI: `src/screens/HeartRules.tsx`.

All three agent edge functions fetch active Heart rules and prepend them to the LLM system prompt as a mandatory-labeled text block:

- `supabase/functions/osha-chat/index.ts` line 206: `## MANDATORY HEART RULES - ALWAYS ENFORCE, ALWAYS TAKE PRECEDENCE`
- `supabase/functions/pixel-chat/index.ts` line 311: `## MANDATORY HEART RULES - ABSOLUTE, ALWAYS TAKE PRECEDENCE`
- `supabase/functions/promptor/index.ts` line 212: `## MANDATORY HEART RULES (always override everything else)`

**What "canon supremacy" actually is in code:** A set of natural-language strings prepended to an LLM prompt, labeled as mandatory. There is no programmatic enforcement layer. The system cannot independently detect rule violations, cannot veto an LLM response before it reaches the user, and cannot apply differential behavior based on rule priority level. Rule priority (`low`/`medium`/`high`/`critical`) is stored in the database and rendered as a label in the prompt string (e.g., `[CRITICAL] rule name: content`) but there is no code that processes these tiers differently. The heart rules fetch in osha-chat does not even sort by priority (lines 102-120, `supabase/functions/osha-chat/index.ts`).

The only post-generation compliance check is a naive string-match in `supabase/functions/osha-chat/index.ts` (lines 2313-2317): if the LLM response begins with phrases like "I cannot" or "that violates", the `complianceStatus` audit field is set to `'adjusted'`. This is a heuristic for logging, not enforcement.

---

#### 18.3 Cognitive Invariants (individual assessment)

##### Canon Supremacy

**Status: PARTIALLY EXISTS**

As described in 18.2: the phrase "Heart always wins" appears in comments and prompt text (e.g., `supabase/functions/osha-chat/index.ts` line 7, line 261; `supabase/functions/pixel-chat/index.ts` line 5). The Heart rules block is labeled mandatory and placed before Brain context in all system prompts. However, supremacy is enforced only through LLM instruction, not through code that independently validates or vetoes output.

##### Tier Integrity

**Status: EXISTS ONLY IN DOCTRINE**

No code enforces tier integrity as a distinct mechanism. The four-tier Osha prompt sequence (see 18.1) approximates the concept but has no runtime tier-validation logic. The formal L0-L4 naming does not appear.

##### Density Law

**Status: EXISTS ONLY IN DOCTRINE**

The term "density law" and any semantic equivalent (maximum canon density, information density enforcement) are absent from all source files. No code limits, scores, or enforces density constraints on canon content.

##### Protected Origins

**Status: EXISTS ONLY IN DOCTRINE**

The terms "protected origin" and "protected origins" do not appear anywhere in source code or project markdown. A `canon_status` column was declared in one migration (`supabase/migrations/20260220024818_50e59c84-7ba1-4373-983a-92c3370b4527.sql`, lines 10 and 88, default `'draft'`), as part of an earlier `wishpedia_entries` design that also carried an `entry_type` column and a companion `wishpedia_relationships` table. **Assembler correction (verified against the live schema):** that migration was superseded by a later one; the live `wishpedia_entries` table has no `canon_status` and no `entry_type` column, and `wishpedia_relationships` does not exist (see Section 8.9). So even the dormant database scaffold for an origin/canon status no longer exists in the running database. `canon_status` returns zero matches in `src/`.

##### Non-Oracle Constraint

**Status: EXISTS ONLY IN DOCTRINE**

The term "non-oracle" does not appear anywhere. The closest functional analog is the `hallucination_control` setting in Osha (`supabase/functions/osha-chat/index.ts` line 42 and line 350): when enabled, the system prompt instructs the LLM to say it does not know rather than invent Fortun canon. This is a configurable per-user toggle, not a system-wide invariant, and applies only to Osha. Pixel and Promptor carry analogous text ("Never invent Fortun canon") as hardcoded prompt strings but with no toggleable enforcement or audit trail specific to this constraint.

##### Probabilistic Framing

**Status: EXISTS ONLY IN DOCTRINE**

The term "probabilistic" does not appear in any source file in a doctrine context. No code instructs agents to express confidence levels, frame outputs probabilistically, or distinguish certain from uncertain outputs beyond the hallucination-control toggle described above.

##### Mystery Elasticity

**Status: EXISTS ONLY IN DOCTRINE**

"Mystery elasticity" does not appear anywhere in the repository. The word "mystery" appears once in `supabase/functions/promptor/index.ts` line 447 as a brand tone slider value (`mystery: 30`), which is a creative-tone parameter unrelated to any doctrine concept of the same name.

##### Voice Separation

**Status: EXISTS ONLY IN DOCTRINE**

"Voice separation" does not appear in any source file. The concept of separate internal vs. public voice is referenced only obliquely: the Osha system prompt states the platform is "not a public chatbot" and that agents "must never reveal internal system details" (`supabase/functions/osha-chat/index.ts` line 310). This is a confidentiality instruction, not a voice-separation architecture. No code enforces distinct output formats, vocabularies, or tonal registers for internal vs. external audiences.

##### No Emergent Canon

**Status: EXISTS ONLY IN DOCTRINE**

"Emergent canon" does not appear anywhere. The functional analog is the hallucination-control prompt instruction ("Do not invent Fortun canon") and the Pixel operating law item 5 ("Never invent Heart rules or Fortun canon", `supabase/functions/pixel-chat/index.ts` line 372). These are LLM instructions; no code detects or blocks canon being created through agent outputs, and no review gate or quarantine mechanism for LLM-generated content exists.

---

#### 18.4 Public vs. Internal Voice Separation

**Status: EXISTS ONLY IN DOCTRINE**

Osha's system prompt contains the statement "You are not a public chatbot, cannot be embedded on external sites" (`supabase/functions/osha-chat/index.ts` line 310). All agents are behind Supabase auth (JWT required on every edge function call). These are access-control and confidentiality measures, not voice-separation architecture. There is no code that maintains two distinct output registers, tonal profiles, or content rulesets differentiated by audience type (public vs. internal). The concept as a doctrine invariant is not implemented.

---

#### 18.5 Protected Origins Enforcement

**Status: EXISTS ONLY IN DOCTRINE**

As corrected in 18.3 (Protected Origins): the `canon_status` column was declared and indexed (`idx_wishpedia_entries_canon`) only in the superseded migration `20260220024818`, and is absent from the live `wishpedia_entries` table (Section 8.9). No application code reads it (zero matches in `src/`), and the live RLS policies on `wishpedia_entries` use only `is_admin(auth.uid())` and `auth.uid() IS NOT NULL`. Protected-origins enforcement is not implemented in code or in the running schema.

---

## Summary

The WishNet cognitive doctrine (Canon Authority Map with L0-L4 tiers, nine named cognitive invariants) is **aspirational documentation, not implemented code**.

What actually exists in code is a simpler, functional system:

1. A CRUD rules engine (Heart) that stores rule strings in a database and prepends them to LLM system prompts labeled as mandatory.
2. A four-tier knowledge retrieval sequence expressed as natural-language instructions inside the Osha system prompt, bearing no formal resemblance to the L0-L4 naming.
3. A `canon_status` database column that appears only in a superseded migration; it is not present in the live `wishpedia_entries` table and is read by no application query.
4. Per-agent hallucination-control toggles that instruct the LLM not to invent brand facts.
5. Audit logging of compliance outcomes based on naive string detection of refusal signals.

None of the nine named doctrine invariants (tier integrity, density law, protected origins, non-oracle constraint, probabilistic framing, mystery elasticity, voice separation, no emergent canon) are implemented as executable logic. Enforcement of all doctrine concepts is delegated entirely to the LLM's interpretation of natural-language prompt instructions, with no programmatic validation, no veto layer, and no runtime invariant checks.

---

---

### 19. Recent Git Activity

Current branch: `main` (the only local branch). `CLAUDE.md` records `main` as the default branch.

`git log --oneline -50` (most recent first; the history is 45 commits total):

```
f5b7df3 chore: add Sentry MCP server config
3b1e883 fix(hydration): add p→div override to ALL ReactMarkdown components
b941e69 chore(supabase): resync 54 migration timestamps with remote (SUP-005)
a047ccc fix: hydration error <pre> inside <p> in ReactMarkdown + SEC-011/019 fixes
7406a7f fix: SEC-011 token header, SEC-019 files private, AGENT-017/018 tracing+validation
f0d5f76 docs: document SEC-014 bucket + SUP-010 pg_cron in manual changes
8eab0a1 chore(lint): suppress 2 shadcn/ui empty-interface errors - 0 errors remaining
f0e5d63 fix: final audit sweep - all remaining P2/P3 items resolved
3fff05f feat(agents): system prompt management UI + DB storage (AGENT-007)
d20a19b fix: final audit items - audit logging, CDN pinning, Suspense, manage-users
8250819 fix: remaining agent, security, lint fixes - AGENT-008/011/015, SEC-006, UI-002, P3 lint
f6cb3d7 fix: PROD-004 next/image, UI-021 contrast, UI-038 validation, CODE-028 loading/error
8e64e80 fix: batch CODE/UI fixes - error handling, invalidation, race conditions, a11y
936ff53 fix: batch P1/P2 fixes - typo, deps, robots, QueryClient, vercel, gradients
d16c003 feat(security): per-user daily usage quotas for LLM actions (AGENT-012/014)
6ed61a0 feat(streaming): SSE streaming for Nexus text chat with OpenAI (AGENT-005)
92e5343 feat(rag): hybrid search - vector + BM25 full-text union (RAG-004)
d971c3a refactor(components): split 4 bloated components into 19 focused files (CODE-027)
ac68113 fix(ui): add empty/error states to BrainKnowledge, FilesGrid, HeartRules (UI-033..036)
5532657 fix(ui): remove hardcoded dark-only colors from Pixel + remove as-any casts (UI-009/UI-042/CODE-005)
c305cef perf(supabase): optimize RLS - 75 initplan + 20 permissive warnings resolved (SUP-002/SUP-003)
c5c374a fix(security): Phase C-5 - agent lockdown, CORS, rate limiting, sanitization
a775f5d fix(rag): Phase C-4 - consolidate chunker, batch enrichment, tune search (RAG-005/008/011/012)
68b3455 feat(ui): stats card responsive fix + dark mode toggle (UI-003/UI-004/UI-008)
30ab1b5 fix(a11y): Phase C Cluster 1+3 - accessibility, responsive, and bug fixes
755977f docs: Phase B complete - production instrumentation done
04427cf fix(security): remove plaintext API key columns from llm_settings (SEC-001)
8671854 chore(supabase): document FK indexes + SEC-008 + deployment updates (SUP-004/SEC-008)
9c68597 perf(rag): bump embedding BATCH_SIZE 3→50 for 25x faster indexing (RAG-007)
a571d88 feat(prod): wire Sentry, Vercel analytics, PDF cache header, audit fix (PROD-002/003/005/006/007)
2d066af docs: Phase A complete - all 10 P0 fixes done
2e1d9b9 fix(nexus): replace document.querySelector with React state for image regenerate (CODE-003)
c7f0bb2 fix(auth): replace getSession/getClaims with getUser everywhere (CODE-002/AGENT-004/BUG-001)
2295eee chore(ci): add GitHub Actions CI workflow with lint + typecheck + build (PROD-001)
0cb1eaf fix(hooks): convert useEmbeddingStats from useMutation to useQuery (CODE-004)
217276a fix(rag): eliminate chunker infinite-loop duplicate chunks (RAG-001)
3bdcb19 fix(agents): rename wishpedia-generate table refs (AGENT-001)
d4ded1d chore(supabase): document wishpedia-media bucket lockdown (SUP-001/SEC-007)
d5e2721 feat(security): add 6 HTTP security headers to next.config (SEC-002)
ed6c288 fix(ui): resolve FileCard button-in-button hydration error (UI-001)
8c90c54 fix(rag): add Authorization header to OCR edge function call (CODE-001/RAG-002)
92062a5 chore: pre-phase-A checkpoint
7cc22a0 chore: initial commit - Next.js 16 App Router + Supabase backend
```

> Note: the commit messages above are reproduced from `git log`. Em dashes present in the original author-written messages have been replaced with hyphens to honor the zero-em-dash constraint of this document; the messages are otherwise verbatim.

Working tree status (snapshot at documentation time): heavily dirty.
- 177 modified tracked files (`git status -s` count of ` M`).
- 3 deleted tracked files: `sentry.client.config.ts`, `src/app/(protected)/ai-agents/echo/page.tsx`, `src/components/ui/chart.tsx`.
- 28 untracked entries, including new agent routes `src/app/(protected)/ai-agents/atlas/`, `.../whisper/`, the Pulse/settings-keys edge functions (`supabase/functions/pulse-api/`, `supabase/functions/settings-keys/`), new components (`WishReferencePanel.tsx`, `ApiKeyEditor.tsx`, `PulseSettings.tsx`, `WishpediaLightbox.tsx`), new hooks (`useOptimizeDraft.ts`, `useProviderKeyActions.ts`, `usePulseSettings.ts`, `useUploadAvatar.ts`), `src/instrumentation-client.ts`, `src/app/(protected)/ProtectedShell.tsx`, `supabase/functions/import_map.json`, and the audit docs `FULL_AUDIT_V2.md` / `WISHNET_PROJECT_STATE.md`.

Significant finding: the last commit is `f5b7df3`, but essentially all of the feature work documented in the `CLAUDE.md` "Audit History" after 2026-04-11 (Batch Tasks 1 to 10: Whisper rename, ATLAS agent, Pulse + upload-post.com integration, fal.ai provider, Gemini 3.1 / Nano Banana 2, Promptor optimize-draft, Pixel theming + WishReference, Wishpedia premium redesign, editable API keys, Profile fixes) lives in the uncommitted working tree. The committed history reflects the post-migration audit and remediation only; the subsequent batch features are staged on disk but not yet committed.

---

### 20. Open Questions

Concrete items that could not be settled from the codebase alone, plus a few that were resolved during this documentation pass and are recorded for traceability.

#### 20.1 Resolved during this pass (recorded for traceability)

- `src/app/(protected)/ProtectedShell.tsx` is a `"use client"` wrapper that renders `ProtectedRoute` around `MainLayout`; it is the client-side fallback that catches sessions expiring mid-navigation, while `src/app/(protected)/layout.tsx` performs the primary server-side redirect.
- Client-side Sentry is active via `src/instrumentation-client.ts` (the `@sentry/nextjs` v8+ pattern that replaced the deleted `sentry.client.config.ts`). It initializes only when `NODE_ENV === 'production'`, with `tracesSampleRate` 0.1 and session replay at 1 percent (100 percent on error).
- `eslint.config.js` is an ESLint flat config extending `js.configs.recommended` and `typescript-eslint` recommended, with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`; it sets `@typescript-eslint/no-unused-vars` to off (unused-symbol enforcement is delegated to `tsc` `noUnusedLocals`). `postcss.config.js` loads only `tailwindcss` and `autoprefixer`.
- `wishpedia_entries.slug` carries a UNIQUE constraint (`wishpedia_entries_slug_key`, Section 8.9), so a duplicate-slug insert from `generateSlug` fails at the database rather than creating a duplicate.
- The `canon_status` column referenced in Section 18 exists only in the superseded migration `20260220024818`; it is absent from the live `wishpedia_entries` table (Section 8.9).

#### 20.2 Open questions by area

##### From Sections 4 to 6 (routes, components, design)

- `src/components/settings/AccountSettings.tsx` appears to be a legacy settings sub-component (predates the dedicated `src/screens/Profile.tsx` + profile-specific hooks). It is not visibly wired into the current `Settings` screen tabs or the current `Profile` page - its exact render context could not be confirmed from static analysis alone.
- `src/app/sentry-example-page/page.tsx` has no route group (neither `(public)` nor `(protected)`). It sits under `src/app/` directly. It is unprotected by the `(protected)` layout server check. Whether it is intended to be publicly accessible or is simply a dev utility left ungated could not be determined from code alone.
- The `src/components/nexus/promptLibraryConstants.ts` mock prompt data is described as static; it is unclear whether there is a planned migration to DB-backed prompts or if the mock data is permanent.

##### From Section 7 (agents)

1. **Muse identity:** What was Muse meant to do? `muse_messages` and `muse_settings` exist in the DB schema (`src/integrations/supabase/types.ts` lines 640 and 676) but there is no corresponding agent metadata, screen, or edge function. It is unclear whether this is a canceled agent or a future one.

2. **Pixel text-only model fallback:** `pixel-chat/index.ts` line 1418 hard-codes `gemini-1.5-pro` as the Gemini fallback for text-only responses, but that model string is absent from the `GEMINI_TEXT_CAPABLE` allowlist in `ai-chat/index.ts`. Whether Gemini 1.5 Pro is still accessible on the project's API key is not verified in code.

3. **`ai-chat` legacy `check-keys` shape:** The `check-keys` action in `supabase/functions/ai-chat/index.ts` lines 239-248 returns `{ openai: boolean, gemini: boolean, fal: boolean }` directly, while the newer `settings-keys` edge function returns richer `'db' | 'env' | 'none'` source classifications. The `ai-chat` version has no callers per `CLAUDE.md` but still exists; its removal timeline is not documented.

4. **Pulse deploy status:** `CLAUDE.md` notes `settings-keys` and `pulse-api` edge functions "need CLI deploy." Whether `pulse-api` was subsequently deployed is not confirmed in any commit message or CLAUDE.md entry after the Batch Task 9 note (2026-04-16).

5. **`osha_audit_logs` table name:** Used as a shared audit log for Osha, Pixel, and Promptor (`AGENT-008`, `AGENT-009` comments). Renaming to `agent_audit_logs` would require a migration but has not been scheduled. This is noted in multiple inline comments.

6. **ElevenLabs API integration for Whisper:** The description mentions ElevenLabs TTS but no API key management, edge function, or client library choice has been documented for this integration.

##### From Section 8 (database)

- The four `trim_*` trigger functions are also scheduled as standalone pg_cron jobs (`SELECT public.trim_<x>_messages()`). These functions are written as trigger functions returning `NEW`; invoking them outside a trigger context (no `NEW` row) would normally raise at runtime. Confirm whether the cron jobs actually succeed or silently error, or whether a separate non-trigger trim path is intended.
- `pixel_settings` has an `updated_at` column but no `update_*_updated_at` trigger was found, unlike the other settings tables. Confirm whether this is intentional.

##### From Sections 11 to 17 (wishpedia, auth, integrations, hooks, config, testing)

1. **Wishpedia slug uniqueness:** `generateSlug` in `src/hooks/useWishpediaEntries.ts` does not check for collisions before insert. If two entries have the same normalized name, the second insert will either fail (if a unique constraint exists on `slug`) or create a duplicate slug. Whether a DB constraint enforces uniqueness on `wishpedia_entries.slug` is not confirmed from the files read.

2. **Whisper edge function:** The Whisper agent is listed as a coming-soon page (`src/app/(protected)/ai-agents/whisper/page.tsx`). No `whisper-chat` or `whisper` edge function exists in `supabase/functions/`. ElevenLabs integration is mentioned only in the agent description string in `src/data/agents.ts`. Implementation is pending.

3. **`ProtectedShell` component:** `src/app/(protected)/layout.tsx` imports `ProtectedShell` from `./ProtectedShell`. This file was not read. Its role (client-side fallback guard) is described in the layout comment but the exact implementation (whether it wraps `ProtectedRoute` or has custom logic) is not confirmed.

4. **Sentry client config:** Only `sentry.server.config.ts` and `sentry.edge.config.ts` were found. The `sentry.client.config.ts` file appears in git status as deleted (`D sentry.client.config.ts`). It is unclear whether Sentry is currently active on the client side in production.

5. **`eslint.config.js` exact content:** Not read. The CI workflow uses `npm run lint` which is `eslint src middleware.ts`. The exact rules and extends are not confirmed beyond the devDependency list.

6. **`postcss.config.js` exact content:** Not read; assumed standard `tailwindcss` + `autoprefixer` based on `package.json` devDeps.

7. **`process-ocr` and `serve-file` edge function actions:** Both are listed as deployed but their full action surface was not read in detail for this document.

##### From Section 18 (doctrine)

1. **External doctrine source:** The cognitive doctrine described in this audit prompt is not present in any file in this repository. It may exist in external PDFs, Notion pages, or verbal documentation held by the product owner. If such a document exists, it should be committed to the repo (e.g., `docs/wishnet-cognitive-doctrine.md`) to allow traceability.

2. **`canon_status` intended use:** The `canon_status` column appears only in the superseded migration `20260220024818` and is absent from the live schema. Was the original (canon-aware) `wishpedia_entries` design intentionally abandoned in favor of the current category-based shape, or was the canon-status concept meant to be carried forward? If protected-origins filtering is still desired, both the column and the consuming logic are missing.

3. **Heart rule priority ordering:** Rules are fetched without sorting by priority. Whether `critical` rules should be presented first in the prompt (to increase LLM weight) is an open design question; currently the sort order is the user-defined `sort_order` drag-and-drop value only.

4. **Doctrine vs. roadmap:** It is unclear whether the L0-L4 authority map and the nine invariants are intended as a current implementation specification or as a future design target. The code treats them as neither.

#### 20.3 Cross-cutting questions for the human

1. **Uncommitted working tree.** Roughly all feature work after 2026-04-11 (Batch Tasks 1 to 10, per `CLAUDE.md`) is present on disk but uncommitted (177 modified, 28 untracked files; Section 19). Is this intentional staging, or should it be committed and pushed before any further work?
2. **External cognitive doctrine.** The Canon Authority Map (L0 to L4) and the nine named invariants are not present anywhere in the repository (Section 18). If a doctrine document exists (PDF, Notion, etc.), it should be committed (for example `docs/wishnet-cognitive-doctrine.md`) so code can be traced against it. Is the doctrine a current spec or a future target?
3. **Edge function deploy state.** `CLAUDE.md` lists `pulse-api` and `settings-keys` as needing CLI deploy, and several osha-chat/ai-chat changes as staged. Which edge function versions are actually live in `zlmideilxfnokemzkavm` right now?
4. **Muse agent.** `muse_messages` and `muse_settings` tables exist (Section 8.8) with no screen, route, edge function, or catalog entry. Is Muse cancelled, paused, or planned?
5. **Trim cron correctness.** The four `trim_*` functions are trigger functions, yet they are also invoked directly by pg_cron as `SELECT public.trim_x_messages()` (Section 8.12). Confirm these scheduled calls succeed rather than erroring on the missing `NEW` record.
6. **Whisper, Pulse, Atlas backends.** These are coming-soon routes with no edge functions. ElevenLabs (Whisper) and upload-post.com (Pulse) appear only as descriptions or partial client scaffolding. What is the build order and the credential plan for each?
