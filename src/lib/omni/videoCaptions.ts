/**
 * Caption segmentation + SRT serialization (Plan 2 Phase 7, Stage 6).
 * Pure functions: transcribe results (ElevenLabs Scribe word-level via fal,
 * or wizper chunk-level fallback) become editable segments, and segments
 * serialize to an SRT sidecar (stored path-only per D-V8).
 */

export interface CaptionSegment {
  start_s: number;
  end_s: number;
  text: string;
  /** Stable UI key (editor rows re-key on delete without it). */
  id?: string;
}

/** Segment targets: readable caption lines, not one giant block. */
const MAX_SEGMENT_SECONDS = 4.5;
const MAX_SEGMENT_CHARS = 42;

interface ScribeWord {
  text?: string;
  start?: number;
  end?: number;
  type?: string;
}

interface WizperChunk {
  timestamp?: [number, number];
  text?: string;
}

/** Normalize either transcription engine's result into caption segments. */
export function segmentsFromTranscribe(result: Record<string, unknown>): CaptionSegment[] {
  const words = result.words as ScribeWord[] | undefined;
  if (Array.isArray(words) && words.length > 0) {
    const segments: CaptionSegment[] = [];
    let current: CaptionSegment | null = null;
    for (const w of words) {
      const text = typeof w.text === 'string' ? w.text : '';
      if (!text.trim()) continue;
      if (w.type && w.type !== 'word') continue;
      const start: number = typeof w.start === 'number' ? w.start : current?.end_s ?? 0;
      const end = typeof w.end === 'number' ? w.end : start;
      if (
        !current
        || end - current.start_s > MAX_SEGMENT_SECONDS
        || current.text.length + text.length + 1 > MAX_SEGMENT_CHARS
      ) {
        if (current) segments.push(current);
        current = { start_s: start, end_s: end, text: text.trim() };
      } else {
        current.end_s = end;
        current.text = `${current.text} ${text.trim()}`;
      }
    }
    if (current) segments.push(current);
    return segments;
  }

  const chunks = result.chunks as WizperChunk[] | undefined;
  if (Array.isArray(chunks) && chunks.length > 0) {
    return chunks
      .filter((c) => typeof c.text === 'string' && c.text.trim().length > 0 && Array.isArray(c.timestamp))
      .map((c) => ({
        start_s: Number(c.timestamp![0]) || 0,
        end_s: Number(c.timestamp![1]) || 0,
        text: c.text!.trim(),
      }));
  }

  // Last resort: plain text with no timing becomes one segment at 0.
  const text = typeof result.text === 'string' ? result.text.trim() : '';
  return text ? [{ start_s: 0, end_s: MAX_SEGMENT_SECONDS, text }] : [];
}

/** SRT timestamp: HH:MM:SS,mmm */
export function formatSrtTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const ms = Math.round((clamped - Math.floor(clamped)) * 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

/** Serialize segments to SRT (skips empty lines, renumbers sequentially). */
export function toSrt(segments: CaptionSegment[]): string {
  const blocks: string[] = [];
  let index = 1;
  for (const seg of segments) {
    const text = seg.text.trim();
    if (!text) continue;
    blocks.push(`${index}\n${formatSrtTime(seg.start_s)} --> ${formatSrtTime(seg.end_s)}\n${text}`);
    index += 1;
  }
  return blocks.join('\n\n') + (blocks.length > 0 ? '\n' : '');
}
