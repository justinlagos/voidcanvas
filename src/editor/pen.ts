import { layerMatrix, polygonPoints } from './engine'
import type { Doc, Layer, PathNode, ShapeLayer, SubPath, TextLayer } from './types'

// Path geometry for the Pen, Curvature Pen and Direct Selection tools.
// Everything here is pure: it takes subpaths and returns new subpaths.

export type Pt = { x: number; y: number }
export const KAPPA = 0.5522847498

export const node = (x: number, y: number, extra?: Partial<PathNode>): PathNode => ({ x, y, inX: x, inY: y, outX: x, outY: y, ...extra })
export const hasIn = (n: PathNode) => n.inX !== n.x || n.inY !== n.y
export const hasOut = (n: PathNode) => n.outX !== n.x || n.outY !== n.y
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

/** Snap a point to 45 degree steps around an origin (Shift in Photoshop and Illustrator). */
export function constrain45(origin: Pt, p: Pt): Pt {
  const dx = p.x - origin.x, dy = p.y - origin.y
  const len = Math.hypot(dx, dy); if (!len) return p
  const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
  return { x: origin.x + Math.cos(a) * len, y: origin.y + Math.sin(a) * len }
}

/** Segment i runs from node i to node i+1 (wrapping on closed subpaths). */
export function segCount(sp: SubPath) { return sp.nodes.length < 2 ? 0 : sp.closed ? sp.nodes.length : sp.nodes.length - 1 }
export function segPoints(sp: SubPath, i: number): [Pt, Pt, Pt, Pt] {
  const a = sp.nodes[i], b = sp.nodes[(i + 1) % sp.nodes.length]
  return [{ x: a.x, y: a.y }, { x: a.outX, y: a.outY }, { x: b.inX, y: b.inY }, { x: b.x, y: b.y }]
}
export function bez(p: [Pt, Pt, Pt, Pt], t: number): Pt {
  const u = 1 - t
  return {
    x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
    y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
  }
}

/** Closest point on any segment of the subpaths. */
export function nearestSegment(subs: SubPath[], p: Pt): { sub: number; seg: number; t: number; d: number; pt: Pt } | null {
  let best: { sub: number; seg: number; t: number; d: number; pt: Pt } | null = null
  subs.forEach((sp, si) => {
    for (let i = 0; i < segCount(sp); i++) {
      const c = segPoints(sp, i)
      let bt = 0, bd = Infinity
      const N = 32
      for (let k = 0; k <= N; k++) { const t = k / N, q = bez(c, t), d = dist(q, p); if (d < bd) { bd = d; bt = t } }
      // Refine around the best sample.
      let lo = Math.max(0, bt - 1 / N), hi = Math.min(1, bt + 1 / N)
      for (let it = 0; it < 12; it++) {
        const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3
        if (dist(bez(c, m1), p) < dist(bez(c, m2), p)) hi = m2; else lo = m1
      }
      const t = (lo + hi) / 2, q = bez(c, t), d = dist(q, p)
      if (!best || d < best.d) best = { sub: si, seg: i, t, d, pt: q }
    }
  })
  return best
}

/** Add an anchor on a segment without changing the curve (de Casteljau split). */
export function splitSegment(subs: SubPath[], si: number, seg: number, t: number): { subs: SubPath[]; idx: number } {
  const sp = subs[si], n = sp.nodes.length
  const [p0, p1, p2, p3] = segPoints(sp, seg)
  const lerp = (a: Pt, b: Pt) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  const a = lerp(p0, p1), b = lerp(p1, p2), c = lerp(p2, p3), d = lerp(a, b), e = lerp(b, c), m = lerp(d, e)
  const straight = !hasOut(sp.nodes[seg]) && !hasIn(sp.nodes[(seg + 1) % n])
  const mid: PathNode = straight ? node(m.x, m.y) : { x: m.x, y: m.y, inX: d.x, inY: d.y, outX: e.x, outY: e.y, smooth: true }
  const nodes = sp.nodes.map(x => ({ ...x }))
  if (!straight) {
    nodes[seg] = { ...nodes[seg], outX: a.x, outY: a.y }
    const j = (seg + 1) % n
    nodes[j] = { ...nodes[j], inX: c.x, inY: c.y }
  }
  nodes.splice(seg + 1, 0, mid)
  return { subs: subs.map((x, i) => (i === si ? { ...x, nodes } : x)), idx: seg + 1 }
}

/** Remove an anchor. The neighbours keep their handles, as in Photoshop. */
export function deleteNodes(subs: SubPath[], picks: { sub: number; idx: number }[]): SubPath[] {
  const kill = new Set(picks.map(p => `${p.sub}:${p.idx}`))
  return subs
    .map((sp, si) => ({ ...sp, nodes: sp.nodes.filter((_, i) => !kill.has(`${si}:${i}`)) }))
    .map(sp => (sp.nodes.length < 3 ? { ...sp, closed: false } : sp))
    .filter(sp => sp.nodes.length > 0)
}

export function reverseSub(sp: SubPath): SubPath {
  return { ...sp, nodes: sp.nodes.slice().reverse().map(n => ({ ...n, inX: n.outX, inY: n.outY, outX: n.inX, outY: n.inY })) }
}

/** Join the end of subpath a to the start of subpath b (both open). Endpoints closer than 0.5px merge. */
export function joinSubs(subs: SubPath[], a: number, aEnd: 'start' | 'end', b: number, bEnd: 'start' | 'end'): { subs: SubPath[]; index: number } {
  if (a === b) {
    // Same subpath: close it.
    const sp = subs[a]
    const nodes = sp.nodes.slice()
    const f = nodes[0], l = nodes[nodes.length - 1]
    if (nodes.length > 2 && dist(f, l) < 0.5) { nodes[0] = { ...f, inX: l.inX, inY: l.inY }; nodes.pop() }
    return { subs: subs.map((x, i) => (i === a ? { ...x, nodes, closed: true } : x)), index: a }
  }
  let A = subs[a], B = subs[b]
  if (aEnd === 'start') A = reverseSub(A)
  if (bEnd === 'end') B = reverseSub(B)
  const nodes = A.nodes.slice()
  let bn = B.nodes.slice()
  const last = nodes[nodes.length - 1], first = bn[0]
  if (dist(last, first) < 0.5) { nodes[nodes.length - 1] = { ...last, outX: first.outX, outY: first.outY, smooth: false }; bn = bn.slice(1) }
  const merged: SubPath = { ...A, closed: false, nodes: [...nodes, ...bn] }
  const out = subs.filter((_, i) => i !== a && i !== b)
  out.push(merged)
  return { subs: out, index: out.length - 1 }
}

/** Split a subpath into two at an anchor (the Scissors tool). On a closed subpath this opens it there. */
export function cutAt(subs: SubPath[], si: number, idx: number): SubPath[] {
  const sp = subs[si]
  if (sp.closed) {
    const nodes = [...sp.nodes.slice(idx), ...sp.nodes.slice(0, idx), { ...sp.nodes[idx] }]
    nodes[0] = { ...nodes[0], inX: nodes[0].x, inY: nodes[0].y }
    const e = nodes.length - 1; nodes[e] = { ...nodes[e], outX: nodes[e].x, outY: nodes[e].y }
    return subs.map((x, i) => (i === si ? { ...x, closed: false, nodes } : x))
  }
  if (idx === 0 || idx === sp.nodes.length - 1) return subs
  const a = sp.nodes.slice(0, idx + 1), b = sp.nodes.slice(idx).map(n => ({ ...n }))
  a[a.length - 1] = { ...a[a.length - 1], outX: a[a.length - 1].x, outY: a[a.length - 1].y }
  b[0] = { ...b[0], inX: b[0].x, inY: b[0].y }
  const out = subs.slice(); out.splice(si, 1, { ...sp, nodes: a }, { ...sp, op: sp.op, nodes: b })
  return out
}

/** Curvature Pen: recompute handles of automatic points so the path flows through them. */
export function autoSmooth(sp: SubPath): SubPath {
  const n = sp.nodes.length
  if (n < 2) return sp
  const nodes = sp.nodes.map((m, i) => {
    if (!m.auto) return m
    const hasPrev = sp.closed || i > 0, hasNext = sp.closed || i < n - 1
    const prev = sp.nodes[(i - 1 + n) % n], next = sp.nodes[(i + 1) % n]
    if (!hasPrev || !hasNext || n < 3) {
      // Open ends: aim the single handle at a third of the way to the neighbour's handle-side.
      return { ...m, inX: m.x, inY: m.y, outX: m.x, outY: m.y }
    }
    const tx = next.x - prev.x, ty = next.y - prev.y, tl = Math.hypot(tx, ty) || 1
    const dp = dist(m, prev) / 3, dn = dist(m, next) / 3
    return { ...m, inX: m.x - (tx / tl) * dp, inY: m.y - (ty / tl) * dp, outX: m.x + (tx / tl) * dn, outY: m.y + (ty / tl) * dn, smooth: true }
  })
  // Open ends of a curvature path: point the end handle along the neighbouring curve so the first and last segments bend too.
  if (!sp.closed && n >= 3) {
    const f = nodes[0], s1 = nodes[1]
    if (f.auto) nodes[0] = { ...f, outX: f.x + (s1.inX - f.x) / 2, outY: f.y + (s1.inY - f.y) / 2 }
    const l = nodes[n - 1], s2 = nodes[n - 2]
    if (l.auto) nodes[n - 1] = { ...l, inX: l.x + (s2.outX - l.x) / 2, inY: l.y + (s2.outY - l.y) / 2 }
  }
  return { ...sp, nodes }
}

/** Turn a point into a corner (no handles) or a smooth point (handles along the neighbours). */
export function convertNode(sp: SubPath, i: number, toSmooth?: boolean): PathNode {
  const n = sp.nodes[i], len = sp.nodes.length
  const has = hasIn(n) || hasOut(n)
  const smooth = toSmooth ?? !has
  if (!smooth) return { ...n, inX: n.x, inY: n.y, outX: n.x, outY: n.y, smooth: false, auto: false }
  const prev = sp.nodes[(i - 1 + len) % len], next = sp.nodes[(i + 1) % len]
  const tx = next.x - prev.x, ty = next.y - prev.y, tl = Math.hypot(tx, ty) || 1
  const dp = dist(n, prev) / 3 || 20, dn = dist(n, next) / 3 || 20
  return { ...n, inX: n.x - (tx / tl) * dp, inY: n.y - (ty / tl) * dp, outX: n.x + (tx / tl) * dn, outY: n.y + (ty / tl) * dn, smooth: true, auto: false }
}

/** Drag a point on a segment and bend the curve through it (Direct Selection segment drag). */
export function bendSegment(sp: SubPath, seg: number, t: number, dx: number, dy: number): SubPath {
  const n = sp.nodes.length, j = (seg + 1) % n
  const k1 = 3 * (1 - t) * (1 - t) * t, k2 = 3 * (1 - t) * t * t
  const den = k1 * k1 + k2 * k2 || 1
  const a = { ...sp.nodes[seg] }, b = { ...sp.nodes[j] }
  a.outX += dx * k1 / den; a.outY += dy * k1 / den
  b.inX += dx * k2 / den; b.inY += dy * k2 / den
  const keepSmooth = (m: PathNode, moved: 'in' | 'out') => {
    if (!m.smooth) return m
    const hx = moved === 'out' ? m.outX - m.x : m.inX - m.x, hy = moved === 'out' ? m.outY - m.y : m.inY - m.y
    const hl = Math.hypot(hx, hy) || 1
    const ol = moved === 'out' ? Math.hypot(m.inX - m.x, m.inY - m.y) : Math.hypot(m.outX - m.x, m.outY - m.y)
    if (!ol) return m
    return moved === 'out' ? { ...m, inX: m.x - (hx / hl) * ol, inY: m.y - (hy / hl) * ol } : { ...m, outX: m.x - (hx / hl) * ol, outY: m.y - (hy / hl) * ol }
  }
  const nodes = sp.nodes.slice()
  nodes[seg] = { ...keepSmooth(a, 'out'), auto: false }
  nodes[j] = { ...keepSmooth(b, 'in'), auto: false }
  return { ...sp, nodes }
}

/** Remove points that do not change the shape much (Simplify path). */
export function simplifySub(sp: SubPath, tol = 1.5): SubPath {
  if (sp.nodes.length < 3) return sp
  const out: PathNode[] = []
  const n = sp.nodes.length
  for (let i = 0; i < n; i++) {
    const m = sp.nodes[i]
    const isEnd = !sp.closed && (i === 0 || i === n - 1)
    if (isEnd || hasIn(m) || hasOut(m)) { out.push(m); continue }
    const prev = out[out.length - 1] ?? sp.nodes[(i - 1 + n) % n], next = sp.nodes[(i + 1) % n]
    if (hasOut(prev) || hasIn(next)) { out.push(m); continue }
    // Distance from m to the line prev-next.
    const vx = next.x - prev.x, vy = next.y - prev.y, vl = Math.hypot(vx, vy) || 1
    const d = Math.abs((m.x - prev.x) * vy - (m.y - prev.y) * vx) / vl
    if (d > tol) out.push(m)
  }
  return { ...sp, nodes: out.length >= 2 ? out : sp.nodes }
}

/** Move a set of nodes (and their handles) by dx, dy. */
export function moveNodes(subs: SubPath[], picks: { sub: number; idx: number }[], dx: number, dy: number): SubPath[] {
  const set = new Set(picks.map(p => `${p.sub}:${p.idx}`))
  return subs.map((sp, si) => ({ ...sp, nodes: sp.nodes.map((m, i) => (set.has(`${si}:${i}`) ? { ...m, x: m.x + dx, y: m.y + dy, inX: m.inX + dx, inY: m.inY + dy, outX: m.outX + dx, outY: m.outY + dy } : m)) })).map(sp => (sp.nodes.some(m => m.auto) ? autoSmooth(sp) : sp))
}

/** Line up points on their average (Illustrator: Object > Path > Average). */
export function averageNodes(subs: SubPath[], picks: { sub: number; idx: number }[], axis: 'h' | 'v' | 'both'): SubPath[] {
  if (picks.length < 2) return subs
  const pts = picks.map(p => subs[p.sub].nodes[p.idx])
  const ax = pts.reduce((a, m) => a + m.x, 0) / pts.length, ay = pts.reduce((a, m) => a + m.y, 0) / pts.length
  const set = new Set(picks.map(p => `${p.sub}:${p.idx}`))
  return subs.map((sp, si) => ({ ...sp, nodes: sp.nodes.map((m, i) => {
    if (!set.has(`${si}:${i}`)) return m
    const tx = axis === 'v' ? m.x : ax, ty = axis === 'h' ? m.y : ay
    const dx = tx - m.x, dy = ty - m.y
    return { ...m, x: tx, y: ty, inX: m.inX + dx, inY: m.inY + dy, outX: m.outX + dx, outY: m.outY + dy }
  }) }))
}

export function mapSubs(subs: SubPath[], f: (p: Pt) => Pt): SubPath[] {
  return subs.map(sp => ({ ...sp, nodes: sp.nodes.map(n => { const a = f({ x: n.x, y: n.y }), i = f({ x: n.inX, y: n.inY }), o = f({ x: n.outX, y: n.outY }); return { ...n, x: a.x, y: a.y, inX: i.x, inY: i.y, outX: o.x, outY: o.y } }) }))
}

export function subsBounds(subs: SubPath[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const sp of subs) {
    for (let i = 0; i < segCount(sp); i++) { const c = segPoints(sp, i); for (let k = 0; k <= 16; k++) { const q = bez(c, k / 16); x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y) } }
    for (const n of sp.nodes) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y) }
  }
  if (!Number.isFinite(x0)) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** Live shapes (rectangle, ellipse, polygon, line) as editable bezier paths, in layer-local pixels. */
export function shapeToSubpaths(l: ShapeLayer): SubPath[] {
  if (l.shape === 'path') return l.subpaths ?? []
  const sw = l.stroke ? l.strokeWidth : 0
  if (l.shape === 'line') return [{ closed: false, nodes: [node(0, l.h / 2), node(l.w, l.h / 2)] }]
  if (l.shape === 'polygon') return [{ closed: true, nodes: polygonPoints(l, sw / 2).map(p => node(p.x, p.y)) }]
  if (l.shape === 'ellipse') {
    const cx = l.w / 2, cy = l.h / 2, rx = Math.max(0.5, l.w / 2 - sw / 2), ry = Math.max(0.5, l.h / 2 - sw / 2), kx = rx * KAPPA, ky = ry * KAPPA
    return [{ closed: true, nodes: [
      { x: cx, y: cy - ry, inX: cx - kx, inY: cy - ry, outX: cx + kx, outY: cy - ry, smooth: true },
      { x: cx + rx, y: cy, inX: cx + rx, inY: cy - ky, outX: cx + rx, outY: cy + ky, smooth: true },
      { x: cx, y: cy + ry, inX: cx + kx, inY: cy + ry, outX: cx - kx, outY: cy + ry, smooth: true },
      { x: cx - rx, y: cy, inX: cx - rx, inY: cy + ky, outX: cx - rx, outY: cy - ky, smooth: true },
    ] }]
  }
  const x0 = sw / 2, y0 = sw / 2, x1 = l.w - sw / 2, y1 = l.h - sw / 2
  const r = Math.min(l.radius, (x1 - x0) / 2, (y1 - y0) / 2)
  if (r <= 0) return [{ closed: true, nodes: [node(x0, y0), node(x1, y0), node(x1, y1), node(x0, y1)] }]
  const k = r * KAPPA
  return [{ closed: true, nodes: [
    { ...node(x0 + r, y0), inX: x0 + r - k, inY: y0 }, { ...node(x1 - r, y0), outX: x1 - r + k, outY: y0 },
    { ...node(x1, y0 + r), inX: x1, inY: y0 + r - k }, { ...node(x1, y1 - r), outX: x1, outY: y1 - r + k },
    { ...node(x1 - r, y1), inX: x1 - r + k, inY: y1 }, { ...node(x0 + r, y1), outX: x0 + r - k, outY: y1 },
    { ...node(x0, y1 - r), inX: x0, inY: y1 - r + k }, { ...node(x0, y0 + r), outX: x0, outY: y0 + r - k },
  ] }]
}

/** A path shape layer's subpaths in document space. */
export function layerSubsToDoc(l: Layer): SubPath[] {
  const local = l.type === 'shape' ? shapeToSubpaths(l) : l.type === 'text' && l.onPath ? l.onPath.subpaths : null
  if (!local) return []
  const m = layerMatrix(l)
  return mapSubs(local, p => { const q = m.transformPoint(p); return { x: q.x, y: q.y } })
}

/** Write a document-space path back into a type-on-a-path layer, refitting its box around the path. */
export function docSubsToTextPathPatch(l: TextLayer, subs: SubPath[]): Partial<TextLayer> {
  if (!l.onPath) return {}
  if (l.rotation === 0) {
    const b = subsBounds(subs), pad = Math.ceil(l.fontSize * 1.6)
    const ox = b.x - pad, oy = b.y - pad
    return { x: ox, y: oy, scaleX: 1, scaleY: 1, onPath: { ...l.onPath, subpaths: mapSubs(subs, p => ({ x: p.x - ox, y: p.y - oy })), w: Math.max(1, b.w + pad * 2), h: Math.max(1, b.h + pad * 2) } }
  }
  const inv = layerMatrix(l).inverse()
  return { onPath: { ...l.onPath, subpaths: mapSubs(subs, p => { const q = inv.transformPoint(p); return { x: q.x, y: q.y } }) } }
}

/** A layer's vector mask in document space, and back. The mask moves and scales with its layer. */
export function vmaskToDoc(l: Layer, doc?: Doc): SubPath[] {
  if (!l.vmask) return []
  const m = layerMatrix(l, doc)
  return mapSubs(l.vmask.subpaths, p => { const q = m.transformPoint(p); return { x: q.x, y: q.y } })
}
export function docToVmask(l: Layer, subs: SubPath[], doc?: Doc): SubPath[] {
  const inv = layerMatrix(l, doc).inverse()
  return mapSubs(subs, p => { const q = inv.transformPoint(p); return { x: q.x, y: q.y } })
}

/**
 * Write document-space subpaths back into a shape layer. When the layer is not rotated, the box is
 * refitted around the path (plus room for the stroke), so nothing gets clipped as the path grows.
 */
export function docSubsToLayerPatch(l: ShapeLayer, subs: SubPath[]): Partial<ShapeLayer> {
  if (l.rotation === 0) {
    const b = subsBounds(subs)
    const pad = (l.stroke ? l.strokeWidth * (l.strokeAlign === 'outside' ? 1 : l.strokeAlign === 'inside' ? 0 : 0.5) : 0) + 2
    const ox = b.x - pad, oy = b.y - pad
    return {
      shape: 'path', x: ox, y: oy, w: Math.max(1, b.w + pad * 2), h: Math.max(1, b.h + pad * 2), scaleX: 1, scaleY: 1,
      subpaths: mapSubs(subs, p => ({ x: p.x - ox, y: p.y - oy })),
    }
  }
  const inv = layerMatrix(l).inverse()
  return { shape: 'path', subpaths: mapSubs(subs, p => { const q = inv.transformPoint(p); return { x: q.x, y: q.y } }) }
}

/** SVG path data for a set of subpaths. */
export function toSvgD(subs: SubPath[], round = 2): string {
  const f = (v: number) => String(+v.toFixed(round))
  return subs.map(sp => {
    const n = sp.nodes; if (!n.length) return ''
    let d = `M${f(n[0].x)} ${f(n[0].y)}`
    const segs = segCount(sp)
    for (let i = 0; i < segs; i++) {
      const a = n[i], b = n[(i + 1) % n.length]
      d += !hasOut(a) && !hasIn(b) ? ` L${f(b.x)} ${f(b.y)}` : ` C${f(a.outX)} ${f(a.outY)} ${f(b.inX)} ${f(b.inY)} ${f(b.x)} ${f(b.y)}`
    }
    return sp.closed ? d + ' Z' : d
  }).join(' ')
}

/** Sample points along the subpaths with their position along the length (0..1), for tapered strokes. */
export function samplePath(subs: SubPath[], step = 1): { x: number; y: number; t: number; sub: number }[][] {
  return subs.map((sp, si) => {
    const raw: Pt[] = []
    for (let i = 0; i < segCount(sp); i++) { const c = segPoints(sp, i); const len = dist(c[0], c[1]) + dist(c[1], c[2]) + dist(c[2], c[3]); const N = Math.max(4, Math.ceil(len / step)); for (let k = i ? 1 : 0; k <= N; k++) raw.push(bez(c, k / N)) }
    let total = 0; const acc = [0]
    for (let i = 1; i < raw.length; i++) { total += dist(raw[i], raw[i - 1]); acc.push(total) }
    return raw.map((p, i) => ({ ...p, t: total ? acc[i] / total : 0, sub: si }))
  })
}
