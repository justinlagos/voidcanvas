import { ctx2d, layerBounds, layerSize, makeCanvas, uid } from './engine'
import { nextRev } from './store'
import type { Doc, Layer } from './types'

/**
 * Re-lay a design for a different format.
 * Layers that fill the page (backgrounds, full-bleed photos) are scaled to cover the new page.
 * Everything else keeps its relative position and is scaled to fit, so nothing is cropped off.
 */
export function resizeDesign(doc: Doc, layers: Layer[], width: number, height: number, name: string): { doc: Doc; layers: Layer[] } {
  const fit = Math.min(width / doc.width, height / doc.height)
  const cover = Math.max(width / doc.width, height / doc.height)
  const next = layers.map(l => {
    if (l.type === 'adjustment') {
      if (!l.mask) return { ...l, rev: nextRev() } as Layer
      const m = makeCanvas(width, height); ctx2d(m).drawImage(l.mask, 0, 0, width, height)
      return { ...l, mask: m, rev: nextRev() } as Layer
    }
    const b = layerBounds(l, doc)
    const k = b.w >= doc.width * 0.95 && b.h >= doc.height * 0.95 ? cover : fit
    // The box centre is also the rotation centre, so moving the centre works for rotated layers too.
    const cx = width / 2 + (b.x + b.w / 2 - doc.width / 2) * k
    const cy = height / 2 + (b.y + b.h / 2 - doc.height / 2) * k
    const out = { ...l, rev: nextRev() } as Layer
    if (out.type === 'text') {
      out.fontSize = Math.max(4, out.fontSize * k); out.letterSpacing *= k
      if (out.outline) out.outline = { ...out.outline, width: out.outline.width * k }
      if (out.shadow) out.shadow = { ...out.shadow, blur: out.shadow.blur * k, x: out.shadow.x * k, y: out.shadow.y * k }
    } else if (out.type === 'shape') { out.w *= k; out.h *= k; out.strokeWidth *= k; out.radius *= k }
    else if (out.type === 'raster') { out.scaleX *= k; out.scaleY *= k }
    const s = layerSize(out, doc)
    out.x = cx - (s.w * out.scaleX) / 2
    out.y = cy - (s.h * out.scaleY) / 2
    return out
  })
  return { doc: { ...doc, id: uid(), name, width, height }, layers: next }
}
