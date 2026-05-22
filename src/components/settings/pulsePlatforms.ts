/**
 * Shared display helpers for upload-post.com platform data.
 * Used by PulseConnectedProfiles + PulseProfileDialog.
 */

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X',
  twitter: 'X',
  threads: 'Threads',
  pinterest: 'Pinterest',
  reddit: 'Reddit',
  telegram: 'Telegram',
  'google-business': 'Google Business',
};

/** Brand-ish accent for the platform pill (Tailwind bg- class). */
const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'bg-blue-500',
  instagram: 'bg-pink-500',
  tiktok: 'bg-zinc-800',
  youtube: 'bg-red-500',
  linkedin: 'bg-sky-600',
  x: 'bg-zinc-900',
  twitter: 'bg-zinc-900',
  threads: 'bg-zinc-700',
  pinterest: 'bg-red-600',
  reddit: 'bg-orange-500',
  telegram: 'bg-sky-500',
  'google-business': 'bg-emerald-500',
};

export const platformLabel = (p: string): string =>
  PLATFORM_LABELS[p.toLowerCase()] ?? p.charAt(0).toUpperCase() + p.slice(1);

export const platformColor = (p: string): string =>
  PLATFORM_COLORS[p.toLowerCase()] ?? 'bg-muted-foreground';

/** Two-letter avatar fallback from a display name or handle. */
export const initials = (name: string): string => {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
};

/** Compact metric formatting (1250 → "1.3K"); em dash when missing. */
export const formatMetric = (n?: number): string =>
  typeof n === 'number' && Number.isFinite(n)
    ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
    : '—';

/** Format an ISO-ish timestamp to a readable date; passthrough on failure. */
export const formatDate = (value?: string | null): string | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};
