// Client comments tied to layers. When a review version is made, each image records where the layers that
// matter sit on it (in image pixels), with the layer's id and name. These boxes stay on this device: the
// review link carries only the images, so clients never see layer names. A pin is matched to the smallest
// layer under it, and keeps where it sits on that layer, so it can follow the layer in the Editor.

import { layerBounds } from '@/editor/engine'
import type { Doc, Frame, Group, Layer } from '@/editor/types'

export interface LayerBox { id: string; name: string; x: number; y: number; w: number; h: number; sig: string }
export interface PinPlace { layerId?: string; layerName?: string; rel?: { x: number; y: number } }

const shown = (l: Layer, groups: Group[]) => {
  if (!l.visible) return false
  let gid = l.groupId ?? null, n = 0
  while (gid && n++ < 64) { const g = groups.find(x => x.id === gid); if (!g) break; if (g.visible === false) return false; gid = g.parentId ?? null }
  return true
}

/** What a layer looks like, without where it is: moving a layer is not a change to what a comment was about. */
export function layerSig(l: Layer, doc?: Doc): string {
  const b = layerBounds(l, doc)
  const common = [l.type, Math.round(b.w), Math.round(b.h), Math.round(l.rotation * 1000), Math.round(l.opacity * 100), l.blend, l.visible ? 1 : 0]
  const own = l.type === 'text' ? [l.text, l.fontFamily, l.fontWeight, l.fontSize, l.color]
    : l.type === 'shape' ? [l.shape, l.fill, l.stroke, l.strokeWidth]
    : l.type === 'raster' ? [l.canvas?.width, l.canvas?.height]
    : []
  return JSON.stringify([...common, ...own])
}

/**
 * The layers a client might point at on one board, as boxes on the board's image. `k` is image pixels per
 * design pixel. Hidden layers, adjustments and a background that fills the board are left out.
 */
export function boardBoxes(d: { doc: Doc; layers: Layer[]; groups: Group[] }, frame: Frame | null, k: number): LayerBox[] {
  const fx = frame?.x ?? 0, fy = frame?.y ?? 0
  const fw = frame?.width ?? d.doc.width, fh = frame?.height ?? d.doc.height
  const out: LayerBox[] = []
  for (const l of d.layers) {
    if (frame && l.frameId !== frame.id) continue
    if (l.type === 'adjustment' || !shown(l, d.groups)) continue
    const b = layerBounds(l, d.doc)
    const x0 = Math.max(b.x, fx), y0 = Math.max(b.y, fy), x1 = Math.min(b.x + b.w, fx + fw), y1 = Math.min(b.y + b.h, fy + fh)
    if (x1 - x0 < 1 || y1 - y0 < 1) continue
    if (l.role === 'background' || (x1 - x0) * (y1 - y0) >= 0.9 * fw * fh) continue
    out.push({ id: l.id, name: l.type === 'text' && (l.name === 'Text' || !l.name) ? (l.text.split('\n')[0] || 'Text').slice(0, 40) : l.name, x: (x0 - fx) * k, y: (y0 - fy) * k, w: (x1 - x0) * k, h: (y1 - y0) * k, sig: layerSig(l, d.doc) })
  }
  return out
}

/** The smallest box under a point, in image pixels. Later layers (on top) win a tie. */
export function layerAt(boxes: LayerBox[] | undefined, x: number, y: number): LayerBox | null {
  let best: LayerBox | null = null
  for (const b of boxes ?? []) {
    if (x < b.x || y < b.y || x > b.x + b.w || y > b.y + b.h) continue
    if (!best || b.w * b.h <= best.w * best.h) best = b
  }
  return best
}

/** Tie a pin (x and y from 0 to 1 across the image) to the layer under it. Pins already tied are kept. */
export function placePin<P extends { x: number; y: number } & PinPlace>(pin: P, boxes: LayerBox[] | undefined, imgW: number, imgH: number): P & PinPlace {
  if (pin.layerId || !boxes?.length) return pin
  const px = pin.x * imgW, py = pin.y * imgH
  const b = layerAt(boxes, px, py)
  if (!b) return pin
  return { ...pin, layerId: b.id, layerName: b.name, rel: { x: b.w ? (px - b.x) / b.w : 0.5, y: b.h ? (py - b.y) / b.h : 0.5 } }
}

/**
 * Where a pin goes on the design now, in design pixels: on its layer if the layer is still there (so it follows
 * the layer), otherwise where it was on the board. `changed` says the layer no longer looks as it did.
 */
export function pinNow(pin: { x: number; y: number } & PinPlace, box: LayerBox | undefined, frame: Frame | null, doc: Doc, layers: Layer[]): { x: number; y: number; layer: Layer | null; changed: boolean; gone: boolean } {
  const fx = frame?.x ?? 0, fy = frame?.y ?? 0, fw = frame?.width ?? doc.width, fh = frame?.height ?? doc.height
  const layer = pin.layerId ? layers.find(l => l.id === pin.layerId) ?? null : null
  if (layer && pin.rel) {
    const b = layerBounds(layer, doc)
    return { x: b.x + pin.rel.x * b.w, y: b.y + pin.rel.y * b.h, layer, changed: !!box && box.sig !== layerSig(layer, doc), gone: false }
  }
  return { x: fx + pin.x * fw, y: fy + pin.y * fh, layer: null, changed: false, gone: !!pin.layerId }
}
