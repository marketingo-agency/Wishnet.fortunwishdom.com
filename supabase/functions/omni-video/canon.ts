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
const MAX_IMAGES_PER_CHARACTER = 6;
/** Wishpedia entries are qualified ("Wishu - Bag Charm", "Wishu - Ritual
 *  Ascension"), but people refer to the character by its base name ("Wishu").
 *  Split on a space-surrounded dash/colon/pipe to get that base name; a
 *  hyphenated single word (no surrounding spaces) is left intact. */
const NAME_SEP = /\s+[—–\-:|]\s+/;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function baseName(name: string): string {
  const first = name.split(NAME_SEP)[0]?.trim();
  return first && first.length > 0 ? first : name.trim();
}

function nameMatches(candidate: string, hay: string): boolean {
  const c = candidate.toLowerCase().trim();
  if (c.length < 3) return false; // 1-2 char names would false-positive
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(c)}(?=[^a-z0-9]|$)`).test(hay);
}

/**
 * Resolve active Wishpedia entries referenced in the text (word-boundary,
 * case-insensitive) by their FULL name OR their base name, then GROUP entries
 * that share a base name into one canon character with pooled reference art.
 * So "Wishu" resolves all three "Wishu - ..." entries into a single Wishu
 * character carrying every canon image (the 2026-07-17 E2E fix).
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
    .map((e) => ({ ...e, base: baseName(e.name ?? '') }))
    .filter((e) => e.base.length >= 3 && (nameMatches(e.name ?? '', hay) || nameMatches(e.base, hay)));
  if (matched.length === 0) return [];

  const { data: images } = await supabaseAdmin
    .from('wishpedia_entry_images')
    .select('id, entry_id, is_primary, sort_order')
    .in('entry_id', matched.map((m) => m.id))
    .order('sort_order', { ascending: true });
  const rows = ((images ?? []) as { id: string; entry_id: string; is_primary: boolean; sort_order: number }[]);
  const imagesFor = (entryId: string) => rows
    .filter((i) => i.entry_id === entryId)
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
    .map((i) => i.id);

  // Group by base name (case-insensitive); the character keeps the first
  // entry's casing, its first non-empty description, and pooled canon art.
  const groups = new Map<string, CanonCharacter>();
  for (const e of matched) {
    const key = e.base.toLowerCase();
    const cleanName = sanitizeForPrompt(e.base).replace(/[\r\n\t]+/g, ' ').slice(0, 80);
    const desc = sanitizeForPrompt(e.description ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, 400);
    const existing = groups.get(key);
    if (existing) {
      existing.image_ids = [...new Set([...existing.image_ids, ...imagesFor(e.id)])].slice(0, MAX_IMAGES_PER_CHARACTER);
      if (!existing.description && desc) existing.description = desc;
    } else {
      groups.set(key, {
        entry_id: e.id,
        name: cleanName,
        description: desc,
        image_ids: imagesFor(e.id).slice(0, MAX_IMAGES_PER_CHARACTER),
      });
    }
  }
  return [...groups.values()].slice(0, MAX_CAST);
}

/** Union two cast lists by entry id (input-resolved + output-re-resolved). */
export function unionCast(a: CanonCharacter[], b: CanonCharacter[]): CanonCharacter[] {
  const seen = new Set(a.map((c) => c.entry_id));
  return [...a, ...b.filter((c) => !seen.has(c.entry_id))].slice(0, MAX_CAST);
}
