import type { EffectParams, EffectType } from '@/store/useStore'

/** The working size effects are tuned at. Previews compute here; exports scale pixel-based settings up from it. */
export const FX_WORK = 1200

// Settings that are pixel sizes (dot size, block size, blur radius, shift distance) per effect.
// When an effect renders at k times the working size, these are multiplied by k so the result looks the same,
// only sharper. Everything else (strength, levels, colours, thresholds, positions as %) stays as is.
// Per-pixel effects (dither, edge, emboss, sharpen, sketch, noise) have no size setting and simply get finer.
const PIXEL_PARAMS: Partial<Record<EffectType, (keyof EffectParams)[]>> = {
  halftone: ['scale'], ascii: ['scale'], mosaic: ['scale'], oilPaint: ['radius'], crosshatch: ['scale'],
  stipple: ['scale'], watercolor: ['radius'], pointillism: ['scale'], woodcut: ['scale'], pixelate: ['scale'],
  crystallize: ['scale'], lowpoly: ['scale'], glitch: ['scale', 'intensity'], rgbShift: ['intensity'],
  chromatic: ['intensity'], wave: ['frequency', 'amplitude'], displacement: ['intensity', 'frequency'],
  crt: ['scale'], motionBlur: ['intensity'], sliceShift: ['intensity'], blur: ['intensity'], grain: ['scale'],
  scanlines: ['scale', 'density'], bloom: ['radius'], dotMatrix: ['scale'],
}

/** Params for rendering `effect` at `k` times the working size. k <= 1 returns the params unchanged. */
export function scaleParams(effect: EffectType, params: EffectParams, k: number): EffectParams {
  if (k <= 1.001) return params
  const keys = PIXEL_PARAMS[effect] ?? []
  const out = { ...params, renderScale: k }
  for (const key of keys) { const v = out[key]; if (typeof v === 'number') (out as Record<string, unknown>)[key] = v * k }
  return out
}

/** Size an image is previewed at: the long edge capped at the working size. */
export function workSize(w: number, h: number, cap = FX_WORK) {
  const k = Math.min(1, cap / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) }
}

/** Long edge above which a full-size export is capped, so phones do not run out of memory. */
export const EXPORT_MAX = 8000
