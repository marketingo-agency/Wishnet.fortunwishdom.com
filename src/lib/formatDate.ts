/** Locale-friendly short date ("Jan 5, 2026"); returns null for empty input,
 *  echoes the raw value if it can't be parsed. */
export const formatDate = (value?: string | null): string | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};
