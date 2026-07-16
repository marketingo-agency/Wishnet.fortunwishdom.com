/**
 * Regression net for the cost estimator (Plan 1 Phase 2). Pins per-image math,
 * per-megapixel math via specToPixels, and the opaque-pricing (gpt-image)
 * handling so the Stage 2/3 cost surfaces cannot silently drift.
 */
import { describe, expect, it } from 'vitest';
import { estimateModelCost, estimatePlanCost, formatUsd, getFalPrice } from './falPricing';

describe('getFalPrice', () => {
  it('knows the curated models', () => {
    expect(getFalPrice('fal-ai/nano-banana-pro/edit')).toEqual({ unitPrice: 0.15, unit: 'image' });
    expect(getFalPrice('fal-ai/flux/schnell')).toEqual({ unitPrice: 0.003, unit: 'megapixel' });
  });

  it('returns unknown for uncatalogued models', () => {
    expect(getFalPrice('fal-ai/not-a-model')).toEqual({ unitPrice: null, unit: 'unknown' });
  });
});

describe('estimateModelCost', () => {
  it('per-image: price × variants', () => {
    const line = estimateModelCost({ model_id: 'fal-ai/nano-banana-pro/edit', name: 'NBP', variants: 3 });
    expect(line.estimated).toBeCloseTo(0.45, 10);
    expect(line.unitLabel).toBe('$0.15/image');
  });

  it('per-megapixel: uses the chosen output size per variant', () => {
    // square_hd = 1024×1024 = 1.048576 MP @ $0.003/MP
    const line = estimateModelCost(
      { model_id: 'fal-ai/flux/schnell', name: 'Schnell', variants: 2 },
      [{ imageSize: 'square_hd' }, { imageSize: 'square_hd' }],
    );
    expect(line.estimated).toBeCloseTo(2 * 0.003 * 1.048576, 10);
  });

  it('per-megapixel with custom dims scales with pixels', () => {
    const line = estimateModelCost(
      { model_id: 'fal-ai/flux/dev', name: 'Dev', variants: 1 },
      [{ imageSize: 'custom', width: 2048, height: 2048 }],
    );
    expect(line.estimated).toBeCloseTo(0.025 * (2048 * 2048) / 1_000_000, 10);
  });

  it('opaque pricing surfaces as varies / null estimate', () => {
    const line = estimateModelCost({ model_id: 'fal-ai/gpt-image-1.5/edit', name: 'GPT', variants: 4 });
    expect(line.estimated).toBeNull();
    expect(line.unitLabel).toBe('varies');
  });
});

describe('estimatePlanCost', () => {
  it('sums known lines and flags unknown ones without polluting the total', () => {
    const plan = estimatePlanCost([
      { model_id: 'fal-ai/nano-banana-pro/edit', name: 'NBP', variants: 2 },
      { model_id: 'fal-ai/gpt-image-1.5/edit', name: 'GPT', variants: 1 },
    ]);
    expect(plan.total).toBeCloseTo(0.3, 10);
    expect(plan.hasUnknown).toBe(true);
    expect(plan.lines).toHaveLength(2);
  });

  it('empty selection is a zero-cost plan', () => {
    const plan = estimatePlanCost([]);
    expect(plan.total).toBe(0);
    expect(plan.hasUnknown).toBe(false);
  });
});

describe('formatUsd', () => {
  it('renders cents and sub-cent values sensibly', () => {
    expect(formatUsd(0.45)).toBe('$0.45');
    expect(formatUsd(0.003)).toBe('$0.003');
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(-1.5)).toBe('-$1.50');
  });
});
