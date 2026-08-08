/**
 * Shared theme utility classes for the One-Screen Preview page.
 *
 * The preview rides Omni's own `data-omni-theme` CSS-variable remap
 * (globals.css), so semantic classes (bg-card, border-border, ...) resolve to
 * Omni's exact palette in both themes. Rare explicit pairs follow Omni's
 * convention: light values as the base, dark via `[[data-omni-theme=dark]_&]:`.
 *
 * Portal-rendered surfaces (dropdown menus) escape the attribute's DOM scope;
 * they receive conditional classes from the live theme state instead.
 */
export const PT = {
  page: 'bg-background text-foreground',
  rail: 'bg-card border-border',
  topbar: 'border-border',
  panel: 'border border-border bg-card',
  panelHover: 'hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/10',
  border: 'border-border',
  muted: 'text-muted-foreground',
  faint: 'text-muted-foreground/70',
  input: 'border-input bg-background text-foreground placeholder:text-muted-foreground',
  ghostBtn: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  row: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  rowActive: 'bg-secondary text-secondary-foreground',
  bubbleUser: 'border border-border bg-gradient-to-r from-cyan-500/15 to-violet-500/15',
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  accentBtn: 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-violet-500',
} as const;
