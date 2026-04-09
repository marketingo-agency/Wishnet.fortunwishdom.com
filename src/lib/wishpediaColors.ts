/**
 * Wishpedia Color Resolver
 * Maps any stored category color to brand-safe amber/neutral UI classes.
 * Wishpedia always renders in the amber family regardless of the DB value.
 */

/** Brand-safe colors for Wishpedia settings */
export const WISHPEDIA_COLORS = [
  { id: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { id: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { id: 'yellow', label: 'Gold', class: 'bg-yellow-600' },
  { id: 'stone', label: 'Stone', class: 'bg-stone-500' },
  { id: 'slate', label: 'Slate', class: 'bg-slate-500' },
  { id: 'zinc', label: 'Zinc', class: 'bg-zinc-500' },
];

/** Returns amber-safe Tailwind classes for Wishpedia UI elements */
export function getWishpediaCategoryStyle() {
  return {
    dot: 'bg-amber-500',
    dotHsl: 'hsl(38 92% 50%)',
    softBg: 'bg-amber-500/10',
    softBorder: 'border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/15',
    gradient: 'from-amber-500/[0.04] via-transparent to-amber-500/[0.02]',
  };
}
