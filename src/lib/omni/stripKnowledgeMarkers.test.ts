import { describe, expect, it } from 'vitest';
import { stripKnowledgeMarkers } from './stripKnowledgeMarkers';

describe('stripKnowledgeMarkers', () => {
  it('removes [W#] and [B#] citation markers and fixes the spacing', () => {
    expect(stripKnowledgeMarkers('A hero shot [W10] of Wishu [B4].')).toBe('A hero shot of Wishu.');
  });

  it('removes bare [n] and comma-separated marker lists', () => {
    expect(stripKnowledgeMarkers('Grounded in [1] and [B1, W2] canon')).toBe('Grounded in and canon');
  });

  it('strips a leading marker cleanly', () => {
    expect(stripKnowledgeMarkers('[W3, W4] opening shot')).toBe('opening shot');
  });

  it('leaves ordinary bracketed prose untouched', () => {
    expect(stripKnowledgeMarkers('See [note] and [TODO] here')).toBe('See [note] and [TODO] here');
  });

  it('is a no-op on plain text and empty input', () => {
    expect(stripKnowledgeMarkers('A calm forest at dawn')).toBe('A calm forest at dawn');
    expect(stripKnowledgeMarkers('')).toBe('');
  });
});
