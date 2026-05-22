import type { WhisperEpisodeStatus } from '@/types/whisper';

export const EPISODE_STATUS_META: Record<WhisperEpisodeStatus, { label: string; badge: string }> = {
  draft: { label: 'Draft', badge: 'bg-muted text-muted-foreground' },
  scripted: { label: 'Scripted', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  rendering: { label: 'Rendering', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  rendered: { label: 'Rendered', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  published: { label: 'Published', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  failed: { label: 'Failed', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

/** Seconds → "m:ss". */
export const formatDuration = (s: number | null | undefined): string => {
  if (!s || s <= 0) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};
