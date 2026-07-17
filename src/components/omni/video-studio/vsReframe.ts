/**
 * LTX-2.3 reframe snapping (Plan 2 D-V6): network preset ratios snap to the
 * model's supported aspect set, with the honest note rendered by the caller.
 */

/** Aspects LTX-2.3 reframe accepts (conservative; fal 422s surface w/ detail). */
const REFRAME_ASPECTS = ['16:9', '9:16', '1:1'];
export const REFRAME_PRICE_PER_S = 0.1;

function ratioValue(ratio: string): number {
  const m = /^(\d+):(\d+)$/.exec(ratio);
  return m ? Number(m[1]) / Number(m[2]) : 1;
}

export function snapReframeAspect(ratio: string): string {
  if (REFRAME_ASPECTS.includes(ratio)) return ratio;
  const target = ratioValue(ratio);
  let best = REFRAME_ASPECTS[0];
  for (const cand of REFRAME_ASPECTS) {
    if (Math.abs(ratioValue(cand) - target) < Math.abs(ratioValue(best) - target)) best = cand;
  }
  return best;
}
