import { describe, expect, it } from 'vitest';
import { formatSrtTime, segmentsFromTranscribe, toSrt } from './videoCaptions';

describe('videoCaptions', () => {
  it('groups scribe words into readable segments by time and length', () => {
    const words = Array.from({ length: 20 }, (_, i) => ({
      text: `word${i}`,
      start: i * 0.5,
      end: i * 0.5 + 0.4,
      type: 'word',
    }));
    const segments = segmentsFromTranscribe({ words });
    expect(segments.length).toBeGreaterThan(1);
    expect(segments[0].start_s).toBe(0);
    // Every segment respects the ~42-char cap.
    for (const s of segments) expect(s.text.length).toBeLessThanOrEqual(42);
    // Segments are contiguous in order.
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].start_s).toBeGreaterThanOrEqual(segments[i - 1].end_s - 0.001);
    }
  });

  it('skips scribe spacing/audio-event entries', () => {
    const segments = segmentsFromTranscribe({
      words: [
        { text: 'hello', start: 0, end: 0.5, type: 'word' },
        { text: ' ', start: 0.5, end: 0.6, type: 'spacing' },
        { text: 'world', start: 0.6, end: 1.0, type: 'word' },
      ],
    });
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('hello world');
  });

  it('maps wizper chunks directly', () => {
    const segments = segmentsFromTranscribe({
      chunks: [
        { timestamp: [0, 3.2], text: ' First line ' },
        { timestamp: [3.2, 6], text: 'Second line' },
        { timestamp: [6, 7], text: '   ' },
      ],
    });
    expect(segments).toEqual([
      { start_s: 0, end_s: 3.2, text: 'First line' },
      { start_s: 3.2, end_s: 6, text: 'Second line' },
    ]);
  });

  it('falls back to a single segment for plain text and empty for nothing', () => {
    expect(segmentsFromTranscribe({ text: 'just text' })).toHaveLength(1);
    expect(segmentsFromTranscribe({})).toEqual([]);
  });

  it('formats SRT timestamps', () => {
    expect(formatSrtTime(0)).toBe('00:00:00,000');
    expect(formatSrtTime(3.25)).toBe('00:00:03,250');
    expect(formatSrtTime(3661.007)).toBe('01:01:01,007');
    expect(formatSrtTime(-2)).toBe('00:00:00,000');
  });

  it('serializes SRT with sequential numbering and skips empty lines', () => {
    const srt = toSrt([
      { start_s: 0, end_s: 2, text: 'One' },
      { start_s: 2, end_s: 4, text: '   ' },
      { start_s: 4, end_s: 6, text: 'Two' },
    ]);
    expect(srt).toBe('1\n00:00:00,000 --> 00:00:02,000\nOne\n\n2\n00:00:04,000 --> 00:00:06,000\nTwo\n');
    expect(toSrt([])).toBe('');
  });
});
