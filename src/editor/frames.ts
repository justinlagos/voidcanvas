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

// ─── Placing new boards ────────────────────────────────────────────
// Every way of adding a board (Add, Duplicate, the + buttons, Cascade) uses these, so boards never
// land on top of each other or on artwork that spills past a board's edge.

/** Space between boards: never under 120px, and wider for big print boards so they read as separate. */
export function boardGap(sizes: { width: number; height: number }[]): number {
  const short = sizes.map(s => Math.min(s.width, s.height)).sort((a, b) => a - b)
  const big = short.length ? short[short.length - 1] : 0
  return Math.max(120, Math.round(big * 0.06 / 10) * 10)
}

const hits = (a: Rect, b: Rect, gap: number) => a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y

/** What is already on the pasteboard: every board, plus any artwork that reaches past one. */
export function occupied(doc: Doc, layers: Layer[]): Rect[] {
  const out: Rect[] = (doc.frames ?? []).map(frameRect)
  for (const l of layers) {
    if (l.type === 'adjustment' || !l.visible) continue
    const f = l.frameId ? doc.frames?.find(x => x.id === l.frameId) : null
    const b = layerBounds(l, doc)
    if (!f) { out.push(b); continue }
    // Artwork is clipped to its board when drawn, so only count it where it spills out.
    if (b.x < f.x || b.y < f.y || b.x + b.w > f.x + f.width || b.y + b.h > f.y + f.height) out.push(b)
  }
  return out
}

export type Side = 'right' | 'left' | 'top' | 'bottom'

/**
 * The nearest free spot for a w×h board next to `ref` on the given side. Aligned to ref's top
 * (left/right) or left (top/bottom); if something is in the way it steps further out past it.
 */
export function placeBeside(taken: Rect[], ref: Rect, w: number, h: number, side: Side, gap: number): { x: number; y: number } {
  let x = side === 'right' ? ref.x + ref.w + gap : side === 'left' ? ref.x - gap - w : ref.x
  let y = side === 'bottom' ? ref.y + ref.h + gap : side === 'top' ? ref.y - gap - h : ref.y
  for (let guard = 0; guard < 500; guard++) {
    const cand = { x, y, w, h }
    const block = taken.find(t => hits(cand, t, gap - 1))
    if (!block) return { x, y }
    if (side === 'right') x = block.x + block.w + gap
    else if (side === 'left') x = block.x - gap - w
    else if (side === 'bottom') y = block.y + block.h + gap
    else y = block.y - gap - h
  }
  return { x, y }
}

/**
 * Positions for a set of new boards laid in one row under everything that is there, starting at
 * `left` and top-aligned. Returns positions in the order given.
 */
export function placeRowBelow(taken: Rect[], left: number, sizes: { width: number; height: number }[], gap: number): { x: number; y: number }[] {
  const bottom = taken.length ? Math.max(...taken.map(t => t.y + t.h)) : 0
  const y = taken.length ? bottom + gap * 2 : 0
  let x = left
  return sizes.map(s => { const p = { x, y }; x += s.width + gap; return p })
}
