/**
 * Shared text chunker for RAG pipeline.
 * RAG-005: consolidated from process-embeddings and process-ocr
 * to eliminate duplicate implementations that could drift.
 *
 * Uses recursive character splitting with sentence-boundary awareness.
 */

export interface ChunkResult {
  content: string;
  index: number;
}

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP = 100;
const DEFAULT_MAX_CHUNKS = 150;

/**
 * Chunk text into overlapping segments, breaking at natural boundaries
 * (paragraphs > sentences > words) when possible.
 */
export function chunkText(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP,
  maxChunks = DEFAULT_MAX_CHUNKS,
): ChunkResult[] {
  if (!text || text.trim().length === 0) return [];

  // Clean and normalize
  const clean = text
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= chunkSize) {
    return [{ content: clean, index: 0 }];
  }

  const chunks: ChunkResult[] = [];
  let start = 0;
  let index = 0;

  while (start < clean.length && index < maxChunks) {
    let end = start + chunkSize;

    if (end < clean.length) {
      const slice = clean.slice(start, end);

      // Try paragraph break first, then sentence, then word
      const paragraphBreak = slice.lastIndexOf('\n\n');
      if (paragraphBreak > chunkSize * 0.5) {
        end = start + paragraphBreak + 2;
      } else {
        const sentenceBreak = Math.max(
          slice.lastIndexOf('. '),
          slice.lastIndexOf('! '),
          slice.lastIndexOf('? '),
        );
        if (sentenceBreak > chunkSize * 0.5) {
          end = start + sentenceBreak + 2;
        } else {
          const wordBreak = slice.lastIndexOf(' ');
          if (wordBreak > chunkSize * 0.5) {
            end = start + wordBreak + 1;
          }
        }
      }
    } else {
      end = clean.length;
    }

    const chunk = clean.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push({ content: chunk, index });
      index++;
    }

    // RAG-001: stop once we've consumed the full text
    if (end >= clean.length) break;

    // Move start with overlap, guarantee forward progress
    const nextStart = end - overlap;
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}
