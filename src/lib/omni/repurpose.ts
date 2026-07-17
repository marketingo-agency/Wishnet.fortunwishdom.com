/**
 * Omni repurposing engine.
 * Deterministic resize + cover-crop runs client-side on the native Canvas API
 * (no new dependencies; sharp is unavailable in Deno and unnecessary here).
 * The engine sits behind the RepurposeEngine interface so an alternative
 * implementation (for example Canva) can be added later without rework.
 * AI aspect-extension is NOT handled here: it routes through the generic
 * fal runner as an image-to-image job.
 */

export interface RepurposeTarget {
  width: number;
  height: number;
}

/**
 * 'cover' = centered cover-crop (free Smart crop; fills the box, may cut edges).
 * 'contain' = fit the whole image into the box with no distortion; any letterbox
 * gap is filled with a cover-scaled copy of the same image (no transparent bars).
 * Used by AI re-design, where the fal output already matches the target aspect
 * so the fit is near-exact and the composition is never re-cropped.
 * 'contain-blur' = contain with the background copy blurred + darkened, killing
 * the doubled-edge halo on visible letterbox slivers (REP-06).
 */
export type RepurposeFit = 'cover' | 'contain' | 'contain-blur';

export interface RepurposeEngine {
  /** Produce a target-sized image blob from a source image URL. */
  render(sourceUrl: string, target: RepurposeTarget, fit?: RepurposeFit): Promise<Blob>;
}

/** Stepped high-quality downscale + centered cover-crop / contain-fit on a canvas. */
export class CanvasRepurposeEngine implements RepurposeEngine {
  async render(sourceUrl: string, target: RepurposeTarget, fit: RepurposeFit = 'cover'): Promise<Blob> {
    const source = await loadBitmap(sourceUrl);
    try {
      const canvas = fit === 'cover'
        ? coverCrop(source, target.width, target.height)
        : containFit(source, target.width, target.height, fit === 'contain-blur');
      return await canvasToBlob(canvas);
    } finally {
      source.close();
    }
  }
}

export const repurposeEngine: RepurposeEngine = new CanvasRepurposeEngine();

async function loadBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load the source image (${res.status})`);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

/**
 * Centered cover-crop: pick the largest target-ratio region of the source,
 * centered, and scale it to the target box. Downscales above 2x run in
 * halving steps first to keep quality high.
 */
function coverCrop(source: ImageBitmap, dstW: number, dstH: number): HTMLCanvasElement {
  let current: HTMLCanvasElement | ImageBitmap = source;
  let currentW = source.width;
  let currentH = source.height;

  // Halving steps until within 2x of the target box.
  while (currentW * 0.5 > dstW && currentH * 0.5 > dstH) {
    const stepW = Math.round(currentW * 0.5);
    const stepH = Math.round(currentH * 0.5);
    const step = document.createElement('canvas');
    step.width = stepW;
    step.height = stepH;
    const stepCtx = step.getContext('2d');
    if (!stepCtx) throw new Error('Canvas 2D context unavailable');
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(current, 0, 0, stepW, stepH);
    current = step;
    currentW = stepW;
    currentH = stepH;
  }

  const targetRatio = dstW / dstH;
  const currentRatio = currentW / currentH;
  const cropW = currentRatio > targetRatio ? currentH * targetRatio : currentW;
  const cropH = currentRatio > targetRatio ? currentH : currentW / targetRatio;
  const srcX = (currentW - cropW) / 2;
  const srcY = (currentH - cropH) / 2;

  const out = document.createElement('canvas');
  out.width = dstW;
  out.height = dstH;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(current, srcX, srcY, cropW, cropH, 0, 0, dstW, dstH);
  return out;
}

/**
 * Fit the whole image into the target box (no crop, no distortion), centered.
 * Letterbox gaps are filled with a cover-scaled copy of the same image so there
 * are never transparent/black bars — ideal for AI re-designed compositions.
 */
function containFit(source: ImageBitmap, dstW: number, dstH: number, blurBackground = false): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = dstW;
  out.height = dstH;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Background fill: cover-scale (fills the box, crops overflow). Blur+darken
  // on request so a visible sliver reads as a designed backdrop, not a
  // doubled edge (REP-06).
  const coverScale = Math.max(dstW / source.width, dstH / source.height);
  const bgW = source.width * coverScale;
  const bgH = source.height * coverScale;
  if (blurBackground) ctx.filter = 'blur(24px) brightness(0.72)';
  ctx.drawImage(source, (dstW - bgW) / 2, (dstH - bgH) / 2, bgW, bgH);
  ctx.filter = 'none';

  // Foreground: contain-scale (whole image visible, centered).
  const fitScale = Math.min(dstW / source.width, dstH / source.height);
  const fgW = source.width * fitScale;
  const fgH = source.height * fitScale;
  ctx.drawImage(source, (dstW - fgW) / 2, (dstH - fgH) / 2, fgW, fgH);
  return out;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas export failed'));
    }, 'image/png');
  });
}
