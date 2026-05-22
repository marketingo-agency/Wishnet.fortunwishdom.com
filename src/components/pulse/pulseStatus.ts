import type { PulseDraftStatus } from '@/types/pulse';

/** Badge label + classes per draft status (shared by Posts, Calendar, Overview). */
export const DRAFT_STATUS_META: Record<PulseDraftStatus, { label: string; badge: string }> = {
  draft: { label: 'Draft', badge: 'bg-muted text-muted-foreground' },
  pending_approval: { label: 'Pending', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  scheduled: { label: 'Scheduled', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  published: { label: 'Published', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  failed: { label: 'Failed', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

/** Platforms upload-post supports for publishing. */
export const PULSE_PLATFORMS: string[] = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'linkedin',
  'x',
  'threads',
  'pinterest',
];

/** datetime-local <-> ISO helpers. */
export const isoToLocalInput = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
};

export const localInputToIso = (local: string): string | null => {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
