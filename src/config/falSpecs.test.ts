/**
 * Regression net for the fal aspect-ratio snapping helpers (Plan 1 Phase 2).
 * fal validates aspect_ratio against a FIXED per-model enum and 400s anything
 * else — these tests pin the snap-to-nearest behavior and the per-model enum
 * boundaries (project lesson: a shared allowlist wrongly rejects NB2's
 * extremes or wrongly allows them for NBP).
 */
import { describe, expect, it } from 'vitest';
import { defaultSpecForModel, nearestAspectRatio, snapAspectRatio, specToPixels } from './falSpecs';

describe('snapAspectRatio', () => {
  it('passes through a value already in the model enum', () => {
    expect(snapAspectRatio('fal-ai/nano-banana-pro/edit', '4:5')).toBe('4:5');
    expect(snapAspectRatio('fal-ai/flux-pro/kontext/multi', '21:9')).toBe('21:9');
  });

  it('snaps an out-of-enum ratio to the nearest accepted value', () => {
    // 2:1 (2.0) is rejected by nano-banana-pro/edit; nearest is 16:9 (~1.78).
    expect(snapAspectRatio('fal-ai/nano-banana-pro/edit', '2:1')).toBe('16:9');
  });

  it('keeps NB2 extremes on NB2 but snaps them away on NBP', () => {
    expect(snapAspectRatio('fal-ai/nano-banana-2/edit', '8:1')).toBe('8:1');
    // NBP has no extremes; nearest to 8.0 is 21:9 (~2.33).
    expect(snapAspectRatio('fal-ai/nano-banana-pro/edit', '8:1')).toBe('21:9');
  });

  it('FLUX enums have no 4:5 — snaps to an accepted neighbor', () => {
    const snapped = snapAspectRatio('fal-ai/flux-pro/v1.1-ultra', '4:5');
    expect(snapped).not.toBe('4:5');
    expect(['3:4', '1:1']).toContain(snapped as string);
  });

  it('returns null for models without an aspect_ratio param (image_size convention)', () => {
    expect(snapAspectRatio('fal-ai/flux/dev', '4:5')).toBeNull();
    expect(snapAspectRatio('fal-ai/qwen-image-edit-plus', '16:9')).toBeNull();
  });

  it('unknown catalog models: format-validated passthrough', () => {
    expect(snapAspectRatio('fal-ai/some-live-catalog-model', '3:4')).toBe('3:4');
    expect(snapAspectRatio('fal-ai/some-live-catalog-model', 'garbage')).toBeNull();
    expect(snapAspectRatio('fal-ai/some-live-catalog-model', '0:0')).toBeNull();
  });

  it('garbage input on an enum model falls back to auto when available, else null', () => {
    expect(snapAspectRatio('fal-ai/nano-banana-pro/edit', 'garbage')).toBe('auto');
    expect(snapAspectRatio('fal-ai/flux-pro/kontext/multi', 'garbage')).toBeNull();
  });

  it('rejects empty and oversized inputs', () => {
    expect(snapAspectRatio('fal-ai/nano-banana-pro/edit', '')).toBeNull();
    expect(snapAspectRatio('fal-ai/nano-banana-pro/edit', null)).toBeNull();
    expect(snapAspectRatio('fal-ai/nano-banana-pro/edit', undefined)).toBeNull();
    expect(snapAspectRatio('fal-ai/nano-banana-pro/edit', '1234567:12345678')).toBeNull();
  });
});

describe('nearestAspectRatio', () => {
  it('picks the enum value nearest to the target pixel ratio', () => {
    // 1080x566 (~1.91) — the Instagram Feed Landscape case that used to 400.
    expect(nearestAspectRatio('fal-ai/nano-banana-pro/edit', 1080, 566)).toBe('16:9');
  });

  it('exact matches resolve to themselves', () => {
    expect(nearestAspectRatio('fal-ai/nano-banana-pro/edit', 1080, 1350)).toBe('4:5');
    expect(nearestAspectRatio('fal-ai/nano-banana-pro/edit', 1080, 1080)).toBe('1:1');
  });

  it('returns null for unknown models and degenerate dimensions', () => {
    expect(nearestAspectRatio('fal-ai/unknown-model', 1080, 1080)).toBeNull();
    expect(nearestAspectRatio('fal-ai/nano-banana-pro/edit', 0, 1080)).toBeNull();
    expect(nearestAspectRatio('fal-ai/nano-banana-pro/edit', 1080, 0)).toBeNull();
  });
});

describe('specToPixels', () => {
  it('resolves image_size presets to their pixel dims', () => {
    expect(specToPixels('fal-ai/flux/dev', { imageSize: 'square_hd' })).toEqual({ width: 1024, height: 1024 });
    expect(specToPixels('fal-ai/flux/dev', { imageSize: 'landscape_16_9' })).toEqual({ width: 1024, height: 576 });
  });

  it('honors custom pixel dimensions', () => {
    expect(specToPixels('fal-ai/flux/dev', { imageSize: 'custom', width: 2048, height: 1024 }))
      .toEqual({ width: 2048, height: 1024 });
  });

  it('derives dims from aspect + resolution for aspect_resolution models', () => {
    const px = specToPixels('fal-ai/nano-banana-pro/edit', { aspectRatio: '16:9', resolution: '2K' });
    expect(px.width).toBe(2048);
    expect(px.height).toBe(Math.round((2048 * 9) / 16));
  });

  it('parses gpt pixel-enum strings', () => {
    expect(specToPixels('fal-ai/gpt-image-1.5/edit', { imageSize: '1536x1024' }))
      .toEqual({ width: 1536, height: 1024 });
    expect(specToPixels('fal-ai/gpt-image-1.5/edit', { imageSize: 'auto' }))
      .toEqual({ width: 1024, height: 1024 });
  });

  it('falls back to the model defaults when no spec is given', () => {
    const dims = specToPixels('fal-ai/flux/schnell', undefined);
    expect(dims).toEqual({ width: 1024, height: 1024 });
  });
});

describe('defaultSpecForModel', () => {
  it('returns a fresh copy of the schema defaults', () => {
    const a = defaultSpecForModel('fal-ai/flux/dev');
    const b = defaultSpecForModel('fal-ai/flux/dev');
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
