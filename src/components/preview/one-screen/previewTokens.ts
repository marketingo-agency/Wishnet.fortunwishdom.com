/**
 * Shared theme utility classes for the One-Screen Preview page.
 *
 * Dark is the base theme; light overrides ride the page-local
 * `data-preview-theme="light"` attribute. Tailwind's `dark:` variant does NOT
 * track page-local themes, so every pair is written out literally for the JIT
 * scanner (no string interpolation).
 *
 * Portal-rendered surfaces (dropdown menus) escape the attribute's DOM scope;
 * they receive conditional classes from the live theme state instead.
 */
export const PT = {
  page:
    'bg-zinc-950 text-zinc-100 [[data-preview-theme=light]_&]:bg-zinc-100 [[data-preview-theme=light]_&]:text-zinc-900',
  rail:
    'bg-zinc-900/80 border-white/[0.06] [[data-preview-theme=light]_&]:bg-white [[data-preview-theme=light]_&]:border-zinc-200',
  topbar:
    'border-white/[0.06] [[data-preview-theme=light]_&]:border-zinc-200',
  panel:
    'bg-white/[0.04] border border-white/[0.08] [[data-preview-theme=light]_&]:bg-white [[data-preview-theme=light]_&]:border-zinc-200',
  panelHover:
    'hover:bg-white/[0.08] [[data-preview-theme=light]_&]:hover:bg-zinc-50',
  border:
    'border-white/[0.08] [[data-preview-theme=light]_&]:border-zinc-200',
  muted:
    'text-zinc-400 [[data-preview-theme=light]_&]:text-zinc-500',
  faint:
    'text-zinc-500 [[data-preview-theme=light]_&]:text-zinc-500',
  input:
    'bg-white/[0.05] border-white/[0.10] text-zinc-100 placeholder:text-zinc-500 [[data-preview-theme=light]_&]:bg-white [[data-preview-theme=light]_&]:border-zinc-300 [[data-preview-theme=light]_&]:text-zinc-900 [[data-preview-theme=light]_&]:placeholder:text-zinc-400',
  ghostBtn:
    'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] [[data-preview-theme=light]_&]:text-zinc-500 [[data-preview-theme=light]_&]:hover:text-zinc-900 [[data-preview-theme=light]_&]:hover:bg-zinc-900/[0.06]',
  row:
    'text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100 [[data-preview-theme=light]_&]:text-zinc-600 [[data-preview-theme=light]_&]:hover:bg-zinc-900/[0.05] [[data-preview-theme=light]_&]:hover:text-zinc-900',
  rowActive:
    'bg-white/[0.10] text-zinc-100 [[data-preview-theme=light]_&]:bg-zinc-900/[0.08] [[data-preview-theme=light]_&]:text-zinc-900',
  bubbleUser:
    'border bg-gradient-to-r from-cyan-500/15 to-violet-500/15 border-white/[0.08] [[data-preview-theme=light]_&]:from-cyan-500/10 [[data-preview-theme=light]_&]:to-violet-500/10 [[data-preview-theme=light]_&]:border-zinc-200',
  focusRing:
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70',
  accentBtn:
    'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-violet-500',
} as const;
