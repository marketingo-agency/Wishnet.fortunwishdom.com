/**
 * Canon character resolution (2026-07-17 rehab, Phase 4).
 *
 * The Wishu fix: a brief that mentions a Wishpedia character by name gets that
 * character resolved DETERMINISTICALLY (word-boundary name match against
 * wishpedia_entries - no embeddings, works on any key config), its canon
 * reference images fetched, the scenario LLM constrained to the resolved cast,
 * and every downstream keyframe anchored on the real art. No manual uploads.
 */

import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { sanitizeForPrompt } from '../_shared/sanitize.ts';

type AdminClient = ReturnType<typeof createClient>;

export interface CanonCharacter {
  entry_id: string;
  name: string;
  description: string;
  /** wishpedia_entry_images ids (primary first) - the canon references. */
  image_ids: string[];
}

const MAX_CAST = 6;
const MAX_IMAGES_PER_CHARACTER = 4;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Resolve every active Wishpedia entry whose NAME appears (word-boundary,
 * case-insensitive) in the given text. Sorted by name length descending so
 * "Wishu Prime" wins over "Wishu" when both match the same span.
 */
export async function resolveCanonCharacters(
  supabaseAdmin: AdminClient,
  text: string,
): Promise<CanonCharacter[]> {
  if (!text.trim()) return [];
  const { data: entries, error } = await supabaseAdmin
    .from('wishpedia_entries')
    .select('id, name, description, is_archived')
    .eq('is_archived', false)
    .limit(500);
  if (error) {
    console.error('omni-video: canon entries read error:', error.message);
    return [];
  }
  const hay = ` ${text.toLowerCase()} `;
  const matched = ((entries ?? []) as { id: string; name: string | null; description: string | null }[])
    .filter((e) => {
      const name = (e.name ?? '').trim();
      if (name.length < 3) return false; // 1-2 char names would false-positive
      const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(name.toLowerCase())}(?=[^a-z0-9]|$)`);
      return re.test(hay);
    })
    .sort((a, b) => (b.name ?? '').length - (a.name ?? '').length)
    .slice(0, MAX_CAST);
  if (matched.length === 0) return [];

  const { data: images } = await supabaseAdmin
    .from('wishpedia_entry_images')
    .select('id, entry_id, is_primary, sort_order')
    .in('entry_id', matched.map((m) => m.id))
    .order('sort_order', { ascending: true });
  const rows = ((images ?? []) as { id: string; entry_id: string; is_primary: boolean; sort_order: number }[]);

  return matched.map((e) => ({
    entry_id: e.id,
    name: sanitizeForPrompt(e.name ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, 80),
    description: sanitizeForPrompt(e.description ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, 400),
    image_ids: rows
      .filter((i) => i.entry_id === e.id)
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
      .slice(0, MAX_IMAGES_PER_CHARACTER)
      .map((i) => i.id),
  }));
}

/** Union two cast lists by entry id (input-resolved + output-re-resolved). */
export function unionCast(a: CanonCharacter[], b: CanonCharacter[]): CanonCharacter[] {
  const seen = new Set(a.map((c) => c.entry_id));
  return [...a, ...b.filter((c) => !seen.has(c.entry_id))].slice(0, MAX_CAST);
}
