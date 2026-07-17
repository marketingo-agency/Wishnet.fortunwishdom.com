/**
 * Pasted-script parsing for Podcast Studio stage 1 (Plan 3 Phase 6).
 */

import type { OmniPodcastSegment } from '@/hooks/omni';

/** Parse "SPEAKER: text" lines; unprefixed lines continue the prior speaker. */
export function parsePastedScript(raw: string): OmniPodcastSegment[] {
  const segments: OmniPodcastSegment[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([A-Za-z][A-Za-z0-9 _-]{0,30}):\s*(.+)$/);
    if (match) {
      segments.push({ speaker: match[1].trim().toUpperCase(), text: match[2].trim() });
    } else if (segments.length > 0) {
      segments[segments.length - 1].text += ` ${trimmed}`;
    } else {
      segments.push({ speaker: 'HOST', text: trimmed });
    }
  }
  return segments;
}
