import paper from 'paper'
import { offsetStroke } from 'paperjs-offset'
import type { PathNode, SubPath } from './types'

// Real vector geometry, on top of paper.js: Pathfinder (merge shapes into new paths),
// Outline Stroke, expanding path operations, and curve fitting for the freeform pens.
// Loaded on demand so the editor does not pay for it until someone uses it.

let ready = false
function setup() {
  if (ready) return
  paper.setup(new paper.Size(1, 1))
  ready = true
}

type PItem = paper.Path | paper.CompoundPath

/** Our subpaths (absolute handles) to a paper path (relative handles). */
export function toPaper(subs: SubPath[], rule: 'evenodd' | 'nonzero' = 'evenodd'): PItem {
  setup()
  const children = subs.filter(sp => sp.nodes.length).map(sp => {
    const p = new paper.Path({ insert: false })
    for (const n of sp.nodes) p.add(new paper.Segment(new paper.Point(n.x, n.y), new paper.Point(n.inX - n.x, n.inY - n.y), new paper.Point(n.outX - n.x, n.outY - n.y)))
    p.closed = sp.closed
    return p
  })
  if (children.length === 1) { children[0].fillRule = rule; return children[0] }
  const c = new paper.CompoundPath({ children, insert: false })
  c.fillRule = rule
  return c
}

/** Paper path back to our subpaths. */
export function fromPaper(item: paper.Item | null | undefined): SubPath[] {
  if (!item) return []
  const paths: paper.Path[] = item instanceof paper.CompoundPath ? (item.children as paper.Path[]) : item instanceof paper.Path ? [item] : (item.children ?? []).flatMap(c => (c instanceof paper.CompoundPath ? (c.children as paper.Path[]) : c instanceof paper.Path ? [c] : []))
  return paths.filter(p => p.segments.length).map(p => ({
    closed: p.closed,
    nodes: p.segments.map((s): PathNode => {
      const x = s.point.x, y = s.point.y
      const inX = x + s.handleIn.x, inY = y + s.handleIn.y, outX = x + s.handleOut.x, outY = y + s.handleOut.y
      const smooth = !s.handleIn.isZero() && !s.handleOut.isZero() && Math.abs(s.handleIn.normalize().dot(s.handleOut.normalize()) + 1) < 0.02
      return { x, y, inX, inY, outX, outY, ...(smooth ? { smooth: true } : {}) }
    }),
  }))
}

/** Bake render-time path operations (combine, subtract, intersect, exclude) into real geometry. */
export function expandOps(subs: SubPath[]): SubPath[] {
  setup()
  const runs: { op: NonNullable<SubPath['op']>; subs: SubPath[] }[] = []
  for (const sp of subs) {
    if (!runs.length || sp.op) runs.push({ op: sp.op ?? 'add', subs: [sp] })
    else runs[runs.length - 1].subs.push(sp)
  }
  let acc: PItem | null = null
  for (const r of runs) {
    const cur = toPaper(r.subs, 'evenodd')
    // Resolve even-odd holes inside a run first, so they survive the boolean.
    const clean = cur.closed === false ? cur : (cur as any).resolveCrossings?.() ?? cur
    if (!acc) { acc = clean as PItem; continue }
    acc = (r.op === 'sub' ? acc.subtract(clean, { insert: false }) : r.op === 'intersect' ? acc.intersect(clean, { insert: false }) : r.op === 'xor' ? acc.exclude(clean, { insert: false }) : acc.unite(clean, { insert: false })) as PItem
  }
  return fromPaper(acc).map(sp => ({ ...sp }))
}

export type PathfinderOp = 'unite' | 'minusFront' | 'minusBack' | 'intersect' | 'exclude' | 'divide'

/**
 * Illustrator's Pathfinder. `shapes` are in stacking order, bottom first, each already in one
 * coordinate space. Returns one result (or several pieces for divide).
 */
export function pathfinder(op: PathfinderOp, shapes: SubPath[][]): SubPath[][] {
  setup()
  const items = shapes.map(s => { const p = toPaper(s.some(sp => sp.op) ? expandOps(s) : s, 'evenodd'); return ((p as any).resolveCrossings?.() ?? p) as PItem })
  if (!items.length) return []
  if (op === 'divide') return divide(shapes).map(d => d.subs)
  if (op === 'minusFront') {
    let acc = items[0]
    for (const it of items.slice(1)) acc = acc.subtract(it, { insert: false }) as PItem
    return [fromPaper(acc)]
  }
  if (op === 'minusBack') {
    let acc = items[items.length - 1]
    for (const it of items.slice(0, -1)) acc = acc.subtract(it, { insert: false }) as PItem
    return [fromPaper(acc)]
  }
  let acc = items[0]
  for (const it of items.slice(1)) acc = (op === 'unite' ? acc.unite(it, { insert: false }) : op === 'intersect' ? acc.intersect(it, { insert: false }) : acc.exclude(it, { insert: false })) as PItem
  return [fromPaper(acc)]
}

/** Illustrator's Outline Stroke: the stroke becomes a filled shape you can edit point by point. */
export function outlineStroke(subs: SubPath[], width: number, cap: 'butt' | 'round' | 'square' = 'round', join: 'miter' | 'round' | 'bevel' = 'round', align: 'center' | 'inside' | 'outside' = 'center'): SubPath[] {
  setup()
  const src = toPaper(subs, 'evenodd')
  if (align === 'center') {
    const out = offsetStroke(src as any, width / 2, { cap: cap === 'square' ? 'butt' : cap, join, limit: 10, insert: false }) as any
    return fromPaper(out)
  }
  // Inside or outside: a full-width stroke clipped against the shape.
  const full = offsetStroke(src as any, width, { cap: cap === 'square' ? 'butt' : cap, join, limit: 10, insert: false }) as unknown as PItem
  const fill = ((src as any).resolveCrossings?.() ?? src) as PItem
  const res = align === 'inside' ? full.intersect(fill, { insert: false }) : full.subtract(fill, { insert: false })
  return fromPaper(res)
}

/** Fit smooth bezier curves through a hand-drawn line (the Freeform Pen). */
export function fitCurve(points: { x: number; y: number }[], tolerance = 2.5, closed = false): SubPath {
  setup()
  const p = new paper.Path({ insert: false })
  for (const q of points) p.add(new paper.Point(q.x, q.y))
  // Fit as an open line (paper's closed-path fitting collapses loops), then join the ends.
  if (closed && points.length) p.add(new paper.Point(points[0].x, points[0].y))
  if (p.segments.length > 2) p.simplify(Math.max(0.2, tolerance))
  if (closed && p.segments.length > 2) {
    const last = p.lastSegment, firstSeg = p.firstSegment
    if (last.point.getDistance(firstSeg.point) < Math.max(1, tolerance * 2)) { firstSeg.handleIn = last.handleIn.clone(); last.remove() }
    p.closed = true
  }
  return fromPaper(p)[0] ?? { closed, nodes: [] }
}

/** Point and angle at a distance along a path, for type on a path. */
export function pathMeasure(subs: SubPath[]) {
  setup()
  const item = toPaper(subs.slice(0, 1), 'nonzero') as paper.Path
  const length = item.length ?? 0
  return {
    length,
    at(d: number) {
      const off = Math.max(0, Math.min(length, d))
      const pt = item.getPointAt(off), tan = item.getTangentAt(off)
      return pt && tan ? { x: pt.x, y: pt.y, angle: Math.atan2(tan.y, tan.x) } : null
    },
  }
}

/** Pathfinder Divide, keeping track of which source shape each piece takes its style from. */
export function divide(shapes: SubPath[][]): { subs: SubPath[]; owner: number }[] {
  setup()
  const items = shapes.map(s => { const p = toPaper(s.some(sp => sp.op) ? expandOps(s) : s, 'evenodd'); return ((p as any).resolveCrossings?.() ?? p) as PItem })
  if (!items.length) return []
  let pieces: { item: PItem; owner: number }[] = [{ item: items[0], owner: 0 }]
  items.slice(1).forEach((it, k) => {
    const idx = k + 1
    const next: { item: PItem; owner: number }[] = []
    let rest: PItem = it
    for (const pc of pieces) {
      const inter = pc.item.intersect(rest, { insert: false }) as PItem
      const only = pc.item.subtract(rest, { insert: false }) as PItem
      rest = rest.subtract(pc.item, { insert: false }) as PItem
      if (!only.isEmpty() && Math.abs(only.area) > 0.5) next.push({ item: only, owner: pc.owner })
      if (!inter.isEmpty() && Math.abs(inter.area) > 0.5) next.push({ item: inter, owner: idx })
    }
    if (!rest.isEmpty() && Math.abs(rest.area) > 0.5) next.push({ item: rest, owner: idx })
    pieces = next
  })
  return pieces.map(p => ({ subs: fromPaper(p.item), owner: p.owner }))
}
