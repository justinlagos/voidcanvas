import type { Doc, Frame, Layer, Rect } from './types'
import { layerBounds, uid } from './engine'

export const hasFrames = (doc: Doc | null) => !!doc?.frames && doc.frames.length > 0

export function frameRect(f: Frame): Rect { return { x: f.x, y: f.y, w: f.width, h: f.height } }

/** Which frame a document-space point falls in (topmost by list order). */
export function frameAt(doc: Doc, x: number, y: number): Frame | null {
  if (!doc.frames) return null
  for (let i = doc.frames.length - 1; i >= 0; i--) { const f = doc.frames[i]; if (x >= f.x && y >= f.y && x < f.x + f.width && y < f.y + f.height) return f }
  return null
}

/** The frame a layer sits in, by its centre. Used when a layer is dragged across boards. */
export function frameForLayer(doc: Doc, l: Layer): Frame | null {
  if (!doc.frames) return null
  const b = layerBounds(l, doc)
  return frameAt(doc, b.x + b.w / 2, b.y + b.h / 2)
}

/** Lay out n frames of a given size in a grid on the canvas, with a gap, and return frames + total bounds. */
export function layoutFrames(items: { name: string; width: number; height: number; background: string | null }[], gap = 120): { frames: Frame[]; width: number; height: number } {
  const cols = Math.min(items.length, Math.ceil(Math.sqrt(items.length)) + (items.length > 6 ? 1 : 0))
  const colW: number[] = [], rowH: number[] = []
  items.forEach((it, i) => { const c = i % cols, r = Math.floor(i / cols); colW[c] = Math.max(colW[c] ?? 0, it.width); rowH[r] = Math.max(rowH[r] ?? 0, it.height) })
  const xOff: number[] = [0]; for (let c = 1; c <= cols; c++) xOff[c] = xOff[c - 1] + colW[c - 1] + gap
  const rows = Math.ceil(items.length / cols); const yOff: number[] = [0]; for (let r = 1; r <= rows; r++) yOff[r] = yOff[r - 1] + rowH[r - 1] + gap
  const frames = items.map((it, i) => { const c = i % cols, r = Math.floor(i / cols); return { id: uid(), name: it.name, x: xOff[c], y: yOff[r], width: it.width, height: it.height, background: it.background } })
  return { frames, width: xOff[cols] - gap, height: yOff[rows] - gap }
}
