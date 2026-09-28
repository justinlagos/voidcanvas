// The point a layer turns around: its centre by default, or a corner or edge picked in Properties.

import { layerMatrix, layerSize } from './engine'
import type { Doc, Layer } from './types'

export const PIVOTS = {
  tl: [0, 0], t: [0.5, 0], tr: [1, 0],
  l: [0, 0.5], c: [0.5, 0.5], r: [1, 0.5],
  bl: [0, 1], b: [0.5, 1], br: [1, 1],
} as const
export type Pivot = keyof typeof PIVOTS
export const PIVOT_NAMES: Record<Pivot, string> = {
  tl: 'top left corner', t: 'top edge', tr: 'top right corner', l: 'left edge', c: 'centre', r: 'right edge', bl: 'bottom left corner', b: 'bottom edge', br: 'bottom right corner',
}

/** Where the pivot is on the design, following the layer's rotation and flips. */
export function pivotPoint(l: Layer, doc: Doc | undefined, pv: Pivot) {
  const { w, h } = layerSize(l, doc)
  const [fx, fy] = PIVOTS[pv] ?? PIVOTS.c
  const p = layerMatrix(l, doc).transformPoint({ x: fx * w, y: fy * h })
  return { x: p.x, y: p.y }
}

/** The position and rotation that turn `l` to `rotation` while the point `p` stays where it is. */
export function rotatedAbout(l: Layer, doc: Doc | undefined, p: { x: number; y: number }, rotation: number) {
  const { w, h } = layerSize(l, doc)
  const hw = (w * l.scaleX) / 2, hh = (h * l.scaleY) / 2
  const cx = l.x + hw, cy = l.y + hh
  const da = rotation - l.rotation, c = Math.cos(da), s = Math.sin(da)
  const vx = cx - p.x, vy = cy - p.y
  const nx = p.x + vx * c - vy * s, ny = p.y + vx * s + vy * c
  return { rotation, x: nx - hw, y: ny - hh }
}
