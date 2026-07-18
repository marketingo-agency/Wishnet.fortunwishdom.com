/**
 * Remove knowledge-citation markers that the grounded generators sometimes
 * leak into user-facing text: "[W10]", "[B4]", "[1]", "[B1, W2]". These come
 * from Inspire Me grounding + fenced-knowledge indices and are noise in an
 * idea card or a scene prompt.
 *
 * Conservative by design: only bracketed groups made of optional B/W prefixes
 * plus digits (optionally comma-separated) are removed, so ordinary bracketed
 * prose (e.g. "[note]") is never touched. Spacing artifacts left by the removal
 * (double spaces, a space before punctuation) are normalized away.
 */
export function stripKnowledgeMarkers(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[\s*(?:[bw]\s*)?\d+(?:\s*,\s*(?:[bw]\s*)?\d+)*\s*\]/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}
