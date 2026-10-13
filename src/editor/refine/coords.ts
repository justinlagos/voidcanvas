/**
 * C3 Refine coordinates — one mathematically consistent mapping between
 * document space, layer-local pixels, source-image pixels and provider crops.
 *
 * Mirrors engine.layerMatrix exactly (translate centre → rotate → scale →
 * translate -w/2,-h/2) using plain arithmetic so it runs in Node tests,
 * workers and the browser with identical results. Negative scales (flips)
 * and non-uniform scales are handled; nothing here touches the DOM.
 */

export interface LayerTransform {
  /** Document-space origin of the layer box. */
  x: number
  y: number
  scaleX: number
  scaleY: number
  /** Radians, clockwise-positive to match the renderer. */
  rotation: number
  /** Layer-local pixel dimensions (= canvas size for raster layers). */
  localW: number
  localH: number
}

export interface Pt {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Centre of the layer box in document space (engine.layerMatrix convention). */
export function layerCentre(t: LayerTransform): Pt {
  return { x: t.x + (t.localW * t.scaleX) / 2, y: t.y + (t.localH * t.scaleY) / 2 }
}

/** Layer-local pixel → document space. */
export function localToDoc(t: LayerTransform, p: Pt): Pt {
  const c = Math.cos(t.rotation)
  const s = Math.sin(t.rotation)
  const lx = (p.x - t.localW / 2) * t.scaleX
  const ly = (p.y - t.localH / 2) * t.scaleY
  const ctr = layerCentre(t)
  return { x: ctr.x + lx * c - ly * s, y: ctr.y + lx * s + ly * c }
}

/** Document space → layer-local pixel. Returns null for degenerate transforms. */
export function docToLocal(t: LayerTransform, p: Pt): Pt | null {
  if (!Number.isFinite(t.scaleX) || !Number.isFinite(t.scaleY) || t.scaleX === 0 || t.scaleY === 0) return null
  const c = Math.cos(t.rotation)
  const s = Math.sin(t.rotation)
  const ctr = layerCentre(t)
  const dx = p.x - ctr.x
  const dy = p.y - ctr.y
  // Inverse rotation, then inverse scale, then re-offset to top-left origin.
  const lx = (dx * c + dy * s) / t.scaleX
  const ly = (-dx * s + dy * c) / t.scaleY
  return { x: lx + t.localW / 2, y: ly + t.localH / 2 }
}

/** Axis-aligned bounding box of a layer-local rect mapped into document space. */
export function localRectToDoc(t: LayerTransform, r: Rect): Rect {
  const pts = [
    localToDoc(t, { x: r.x, y: r.y }),
    localToDoc(t, { x: r.x + r.w, y: r.y }),
    localToDoc(t, { x: r.x, y: r.y + r.h }),
    localToDoc(t, { x: r.x + r.w, y: r.y + r.h }),
  ]
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const x0 = Math.min(...xs)
  const y0 = Math.min(...ys)
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 }
}

/** Layer-local pixel → original source-image pixel (asset dims may exceed canvas). */
export function localToSource(p: Pt, localW: number, localH: number, srcW: number, srcH: number): Pt {
  return { x: (p.x / Math.max(1, localW)) * srcW, y: (p.y / Math.max(1, localH)) * srcH }
}

/** Source-image pixel → layer-local pixel. */
export function sourceToLocal(p: Pt, localW: number, localH: number, srcW: number, srcH: number): Pt {
  return { x: (p.x / Math.max(1, srcW)) * localW, y: (p.y / Math.max(1, srcH)) * localH }
}

export interface ProviderCrop {
  /** Source-pixel box to send the provider (clamped, non-empty). */
  x: number
  y: number
  w: number
  h: number
  /** True when the selection extended past the layer and was clamped. */
  clamped: boolean
}

/**
 * Map a document-space selection rectangle onto source-image pixels for a
 * provider request. Out-of-bounds areas are clamped (flagged); zero-area or
 * fully-outside selections return null so callers show "nothing to edit".
 */
export function selectionToProviderCrop(
  t: LayerTransform,
  selDoc: Rect,
  srcW: number,
  srcH: number,
): ProviderCrop | null {
  if (!(selDoc.w > 0) || !(selDoc.h > 0)) return null
  // Map all four corners through the inverse transform, then bound in local space.
  const corners = [
    docToLocal(t, { x: selDoc.x, y: selDoc.y }),
    docToLocal(t, { x: selDoc.x + selDoc.w, y: selDoc.y }),
    docToLocal(t, { x: selDoc.x, y: selDoc.y + selDoc.h }),
    docToLocal(t, { x: selDoc.x + selDoc.w, y: selDoc.y + selDoc.h }),
  ]
  if (corners.some(c => c === null)) return null
  const xs = (corners as Pt[]).map(p => p.x)
  const ys = (corners as Pt[]).map(p => p.y)
  const lx0 = Math.min(...xs)
  const ly0 = Math.min(...ys)
  const lx1 = Math.max(...xs)
  const ly1 = Math.max(...ys)
  const kx = srcW / Math.max(1, t.localW)
  const ky = srcH / Math.max(1, t.localH)
  let sx0 = Math.floor(lx0 * kx)
  let sy0 = Math.floor(ly0 * ky)
  let sx1 = Math.ceil(lx1 * kx)
  let sy1 = Math.ceil(ly1 * ky)
  const clamped = sx0 < 0 || sy0 < 0 || sx1 > srcW || sy1 > srcH
  sx0 = Math.max(0, sx0)
  sy0 = Math.max(0, sy0)
  sx1 = Math.min(srcW, sx1)
  sy1 = Math.min(srcH, sy1)
  if (sx1 - sx0 < 1 || sy1 - sy0 < 1) return null
  return { x: sx0, y: sy0, w: sx1 - sx0, h: sy1 - sy0, clamped }
}

/** Clamp a rect to bounds; null when nothing overlaps. */
export function clampRect(r: Rect, bounds: Rect): Rect | null {
  const x0 = Math.max(bounds.x, r.x)
  const y0 = Math.max(bounds.y, r.y)
  const x1 = Math.min(bounds.x + bounds.w, r.x + r.w)
  const y1 = Math.min(bounds.y + bounds.h, r.y + r.h)
  if (x1 - x0 < 1 || y1 - y0 < 1) return null
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}
