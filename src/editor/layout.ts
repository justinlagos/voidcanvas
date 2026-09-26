import { layerBounds, uid } from './engine'
import { docToVmask } from './pen'
import { nextRev } from './store'
import type { Doc, Frame, Group, Layer, Rect, SubPath } from './types'

// Re-laying a design for another size.
//
// The master board is read as a designer would: groups are pieces that never come apart, pieces
// sit in panels (a column or a row with its own background), and panels rank by what matters
// (the logo, the headline) over what can go (a photo strip). Each target size tries a few
// arrangements of the panels (side by side, stacked, the lead panel over the rest) and keeps the
// one that shows the content biggest. A panel only drops out when keeping it would make the rest
// too small to read.

type Axis = 'x' | 'y'
export interface Block { key: string; layers: Layer[]; rect: Rect; kind: 'bg' | 'fill' | 'content'; hasText: boolean; maxText: number; logo: boolean; name: string }
export interface Panel { id: string; name: string; box: Rect; blocks: Block[]; content: Rect | null; flexible: boolean; weight: number; logo: boolean; headline: number }
export interface Analysis { axis: Axis | null; blocks: Block[]; backgrounds: Block[]; panels: Panel[] }

const rel = (b: Rect, f: Frame): Rect => ({ x: b.x - f.x, y: b.y - f.y, w: b.w, h: b.h })
const union = (rs: Rect[]): Rect | null => {
  if (!rs.length) return null
  const x = Math.min(...rs.map(r => r.x)), y = Math.min(...rs.map(r => r.y))
  return { x, y, w: Math.max(...rs.map(r => r.x + r.w)) - x, h: Math.max(...rs.map(r => r.y + r.h)) - y }
}
const clip = (r: Rect, W: number, H: number): Rect => {
  const x = Math.max(0, r.x), y = Math.max(0, r.y)
  return { x, y, w: Math.max(0, Math.min(W, r.x + r.w) - x), h: Math.max(0, Math.min(H, r.y + r.h) - y) }
}
const LOGO = /logo|brand ?mark|emblem|badge|wordmark|lockup/i
const textSize = (l: Layer) => (l.type === 'text' ? l.fontSize * Math.abs(l.scaleY) : 0)

/** The chain of group ids from the outermost group down to the layer's own group. */
function chainOf(l: Layer, groups: Map<string, Group>): string[] {
  const out: string[] = []
  let g = l.groupId ? groups.get(l.groupId) : undefined, guard = 0
  while (g && guard++ < 64) { out.unshift(g.id); g = g.parentId ? groups.get(g.parentId) : undefined }
  return out
}

/** Split the master's layers into pieces that move as one. */
export function blocksOf(master: Layer[], m: Frame, doc: Doc, groupList: Group[]): Block[] {
  const groups = new Map(groupList.map(g => [g.id, g]))
  const content = master.filter(l => l.type !== 'adjustment')
  const chains = new Map(content.map(l => [l.id, chainOf(l, groups)]))
  const area = m.width * m.height
  const out: Block[] = []
  const make = (key: string, ls: Layer[], name: string): Block => {
    const vis = ls.filter(l => l.visible)
    const rect = clip(rel(union((vis.length ? vis : ls).map(l => layerBounds(l, doc)))!, m), m.width, m.height)
    const texts = ls.filter(l => l.type === 'text' && l.visible)
    const logo = LOGO.test(name) || ls.some(l => LOGO.test(l.name))
    return { key, layers: ls, rect, kind: 'content', hasText: texts.length > 0, maxText: Math.max(0, ...texts.map(textSize)), logo, name }
  }
  const split = (ls: Layer[], depth: number) => {
    const byKey = new Map<string, Layer[]>()
    for (const l of ls) { const c = chains.get(l.id)!; const k = c[depth] ?? l.id; if (!byKey.has(k)) byKey.set(k, []); byKey.get(k)!.push(l) }
    byKey.forEach((members, key) => {
      const isGroup = groups.has(key)
      const b = make(key, members, isGroup ? groups.get(key)!.name : members[0].name)
      // A group that is most of the design (a PSD artboard folder) is opened up, so its parts can move.
      const parts = new Set(members.map(l => chains.get(l.id)![depth + 1] ?? l.id))
      if (isGroup && parts.size > 1 && (b.rect.w * b.rect.h) / area > 0.6) split(members, depth + 1)
      else out.push(b)
    })
  }
  split(content, 0)
  // Keep stacking order: blocks in the order their first layer appears.
  const order = new Map(master.map((l, i) => [l.id, i]))
  out.sort((a, b) => Math.min(...a.layers.map(l => order.get(l.id)!)) - Math.min(...b.layers.map(l => order.get(l.id)!)))
  return out
}

/** Find backgrounds, panel fills and panels. */
export function analyse(master: Layer[], m: Frame, doc: Doc, groups: Group[]): Analysis {
  const blocks = blocksOf(master, m, doc, groups)
  const W = m.width, H = m.height
  for (const b of blocks) if (b.rect.w >= W * 0.9 && b.rect.h >= H * 0.9 && !b.hasText) b.kind = 'bg'
  const backgrounds = blocks.filter(b => b.kind === 'bg')
  const rest = blocks.filter(b => b.kind !== 'bg' && b.rect.w > 0 && b.rect.h > 0)
  const ratio = W / H
  const axes: Axis[] = ratio >= 1.25 ? ['x'] : ratio <= 0.8 ? ['y'] : ['x', 'y']
  for (const axis of axes) {
    const panels = panelsAlong(rest.map(b => ({ ...b })), axis, W, H, doc, m)
    if (panels.length > 1 && panels.length <= 4) return { axis, blocks, backgrounds, panels }
  }
  // One panel: the whole board.
  const all = rest.map(b => ({ ...b }))
  return { axis: null, blocks, backgrounds, panels: all.length ? [makePanel(all, { x: 0, y: 0, w: W, h: H }, 0, null)] : [] }
}

function makePanel(blocks: Block[], box: Rect, i: number, axis: Axis | null, doc?: Doc, m?: Frame): Panel {
  // A group that holds the panel's own background (a full-height stone slab behind the type): the
  // background is lifted out so it can fill the panel's new slot while the type stays one piece.
  if (axis && doc && m) {
    const spansBox = (r: Rect) => (axis === 'x' ? r.h >= box.h * 0.8 && r.w >= box.w * 0.6 : r.w >= box.w * 0.8 && r.h >= box.h * 0.6)
    for (const b of blocks.slice()) {
      if (b.layers.length < 2 || !b.hasText) continue
      const back = b.layers.filter(l => l.type !== 'text' && l.type !== 'adjustment' && spansBox(clip(rel(layerBounds(l, doc), m), m.width, m.height)))
      if (!back.length || back.length === b.layers.length) continue
      const restL = b.layers.filter(l => !back.includes(l))
      const vis = (ls: Layer[]) => { const v = ls.filter(l => l.visible); return v.length ? v : ls }
      blocks.splice(blocks.indexOf(b), 1,
        { ...b, key: b.key + '#bg', layers: back, rect: clip(rel(union(vis(back).map(l => layerBounds(l, doc)))!, m), m.width, m.height), hasText: false, maxText: 0, logo: false },
        { ...b, layers: restL, rect: clip(rel(union(vis(restL).map(l => layerBounds(l, doc)))!, m), m.width, m.height) })
    }
  }
  for (const b of blocks) {
    if (b.kind === 'bg' || b.hasText || !axis) continue
    const spans = axis === 'x' ? b.rect.h >= box.h * 0.8 && b.rect.w >= box.w * 0.6 : b.rect.w >= box.w * 0.8 && b.rect.h >= box.h * 0.6
    if (spans) b.kind = 'fill'
  }
  const contentBlocks = blocks.filter(b => b.kind === 'content')
  const content = union(contentBlocks.map(b => b.rect))
  const logo = contentBlocks.some(b => b.logo)
  const headline = Math.max(0, ...contentBlocks.map(b => b.maxText))
  const hasText = contentBlocks.some(b => b.hasText)
  // A panel with no type and nothing but pictures is a picture panel: it can stretch or crop to fit.
  const flexible = !hasText && !logo
  const named = blocks.find(b => b.layers.length > 1 && b.name && !/^(group|layer)\s*\d*$/i.test(b.name))?.name
  const firstText = contentBlocks.flatMap(b => b.layers).find(l => l.type === 'text' && l.visible)
  const name = named ?? (firstText && firstText.type === 'text' ? firstText.text.split('\n')[0].slice(0, 28) : flexible ? 'Picture' : `Panel ${i + 1}`)
  return { id: `p${i}`, name, box, blocks, content, flexible, weight: flexible ? 0.35 : 1 + (logo ? 1 : 0) + (hasText ? 0.5 : 0), logo, headline }
}

function panelsAlong(blocks: Block[], axis: Axis, W: number, H: number, doc: Doc, m: Frame): Panel[] {
  const D = axis === 'x' ? W : H
  const a0 = (b: Block) => (axis === 'x' ? b.rect.x : b.rect.y), a1 = (b: Block) => a0(b) + (axis === 'x' ? b.rect.w : b.rect.h)
  // Pieces that span nearly the whole length cannot be split along this axis.
  if (blocks.some(b => a1(b) - a0(b) > D * 0.9)) return []
  const sorted = blocks.slice().sort((p, q) => a0(p) - a0(q))
  const tol = D * 0.004
  const clusters: { lo: number; hi: number; blocks: Block[] }[] = []
  for (const b of sorted) {
    const c = clusters[clusters.length - 1]
    if (c && a0(b) < c.hi - tol) { c.hi = Math.max(c.hi, a1(b)); c.blocks.push(b) }
    else clusters.push({ lo: a0(b), hi: a1(b), blocks: [b] })
  }
  // A sliver (a divider line) joins its neighbour rather than becoming a panel.
  for (let i = clusters.length - 1; i >= 0 && clusters.length > 1; i--) {
    const c = clusters[i]
    if (c.hi - c.lo < D * 0.04 && !c.blocks.some(b => b.hasText || b.logo)) {
      const j = i > 0 ? i - 1 : i + 1
      clusters[j].lo = Math.min(clusters[j].lo, c.lo); clusters[j].hi = Math.max(clusters[j].hi, c.hi); clusters[j].blocks.push(...c.blocks)
      clusters.splice(i, 1)
    }
  }
  if (clusters.length < 2) return []
  // Panels tile the board: each one reaches halfway into the gap to its neighbours.
  return clusters.map((c, i) => {
    const lo = i === 0 ? 0 : (clusters[i - 1].hi + c.lo) / 2
    const hi = i === clusters.length - 1 ? D : (c.hi + clusters[i + 1].lo) / 2
    const box = axis === 'x' ? { x: lo, y: 0, w: hi - lo, h: H } : { x: 0, y: lo, w: W, h: hi - lo }
    return makePanel(c.blocks, box, i, axis, doc, m)
  })
}

// ─── Arrangements ──────────────────────────────────────────────────

type Node = { kind: 'leaf'; panel: Panel } | { kind: 'row' | 'stack'; kids: Node[] }
const leaf = (panel: Panel): Node => ({ kind: 'leaf', panel })

interface Fit { k: number; tree: Node; panels: Panel[]; score: number }

/** Space a panel needs at content scale k, with its inner margin. Picture panels need a minimum slice. */
function need(n: Node, k: number, m: number, T: { w: number; h: number }): { w: number; h: number } {
  if (n.kind === 'leaf') {
    const p = n.panel
    if (p.flexible || !p.content) return { w: T.w * 0.16, h: T.h * 0.16 }
    return { w: p.content.w * k + m * 2, h: p.content.h * k + m * 2 }
  }
  const s = n.kids.map(c => need(c, k, m, T))
  return n.kind === 'row' ? { w: s.reduce((a, b) => a + b.w, 0), h: Math.max(...s.map(b => b.h)) } : { w: Math.max(...s.map(b => b.w)), h: s.reduce((a, b) => a + b.h, 0) }
}

function bestK(tree: Node, m: number, T: { w: number; h: number }): number {
  let lo = 0, hi = 8
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2, n = need(tree, mid, m, T)
    if (n.w <= T.w + 0.5 && n.h <= T.h + 0.5) lo = mid; else hi = mid
  }
  return lo
}

/**
 * Every way to cut the panels, in reading order, into rows and stacks: side by side, stacked,
 * two rows of two, the first panel over the rest, and so on. Four panels give a few dozen.
 */
function splits(ps: Panel[], memo = new Map<string, Node[]>()): Node[] {
  const key = ps.map(p => p.id).join(',')
  const hit = memo.get(key); if (hit) return hit
  if (ps.length === 1) return [leaf(ps[0])]
  const out: Node[] = []
  const join = (kind: 'row' | 'stack', a: Node, b: Node): Node => ({ kind, kids: [...(a.kind === kind ? a.kids : [a]), ...(b.kind === kind ? b.kids : [b])] })
  for (let i = 1; i < ps.length; i++) {
    const L = splits(ps.slice(0, i), memo), R = splits(ps.slice(i), memo)
    for (const l of L) for (const r of R) { out.push(join('row', l, r)); out.push(join('stack', l, r)) }
  }
  memo.set(key, out)
  return out
}

function trees(ps: Panel[]): Node[] {
  const out = splits(ps)
  // The lead panel (logo or headline) first, over or beside the rest.
  const lead = ps.slice().sort((a, b) => b.weight - a.weight || b.headline - a.headline)[0]
  const rest = ps.filter(p => p !== lead)
  if (rest.length && ps[0] !== lead) for (const r of splits(rest)) { out.push({ kind: 'stack', kids: [leaf(lead), r] }, { kind: 'row', kids: [leaf(lead), r] }) }
  return out
}

/** Choose which panels to keep and how to arrange them for a target size. */
export function chooseFit(a: Analysis, T: { w: number; h: number }, keep?: (p: Panel) => boolean): Fit | null {
  const all = a.panels.filter(p => (keep ? keep(p) : true))
  if (!all.length) return null
  const m = Math.min(T.w, T.h) * 0.06
  const minRead = Math.min(T.w, T.h) * 0.045
  // Keep as much as possible: try the full set first, then drop the least important panels one
  // at a time (pictures go first). Take the first set where every panel's type stays readable.
  const ranked = all.slice().sort((p, q) => p.weight - q.weight || p.headline - q.headline)
  let fallback: Fit | null = null
  for (let drop = 0; drop < all.length; drop++) {
    const gone = new Set(ranked.slice(0, drop))
    const ps = all.filter(p => !gone.has(p))
    if (!ps.some(p => !p.flexible)) continue
    let best: Fit | null = null
    for (const tree of trees(ps)) {
      const k = bestK(tree, m, T)
      if (k > 0 && (!best || k > best.k * 1.0001)) best = { k, tree, panels: ps, score: k }
    }
    if (!best) continue
    const texty = ps.filter(p => p.headline > 0)
    const readable = texty.every(p => p.headline * best!.k >= minRead)
    if (readable) return best
    if (!fallback || best.k > fallback.k) fallback = best
  }
  return fallback
}

// ─── Moving layers ─────────────────────────────────────────────────

const scaleSubs = (subs: SubPath[], k: number): SubPath[] => subs.map(sp => ({ ...sp, nodes: sp.nodes.map(n => ({ ...n, x: n.x * k, y: n.y * k, inX: n.inX * k, inY: n.inY * k, outX: n.outX * k, outY: n.outY * k })) }))

/** Scale a layer's own content by k (type size, shape size, picture scale), keeping it crisp. */
export function scaleContent(l: Layer, k: number): Layer {
  const nl = { ...l, rev: nextRev() } as Layer
  if (nl.type === 'text') {
    if (nl.onPath) { nl.scaleX *= k; nl.scaleY *= k; return nl }
    nl.fontSize = Math.max(1, nl.fontSize * k); nl.letterSpacing *= k
    if (nl.boxWidth) nl.boxWidth *= k
    if (nl.outline) nl.outline = { ...nl.outline, width: nl.outline.width * k }
    if (nl.shadow) nl.shadow = { ...nl.shadow, blur: nl.shadow.blur * k, x: nl.shadow.x * k, y: nl.shadow.y * k }
    if (nl.vmask) nl.vmask = { ...nl.vmask, subpaths: scaleSubs(nl.vmask.subpaths, k) }
  } else if (nl.type === 'shape') {
    nl.w *= k; nl.h *= k; nl.strokeWidth *= k; nl.radius *= k
    if (nl.subpaths) nl.subpaths = scaleSubs(nl.subpaths, k)
    if (nl.vmask) nl.vmask = { ...nl.vmask, subpaths: scaleSubs(nl.vmask.subpaths, k) }
  } else if (nl.type === 'raster') { nl.scaleX *= k; nl.scaleY *= k }
  return nl
}

/** Move a layer so its bounding box starts at x, y. */
function moveTo(l: Layer, doc: Doc, x: number, y: number): Layer {
  const b = layerBounds(l, doc)
  return { ...l, x: l.x + (x - b.x), y: l.y + (y - b.y) } as Layer
}

/**
 * Scale a whole piece by k about its own origin and put that origin at (ox, oy), so every layer
 * in a group keeps its place relative to the others.
 */
function placeBlock(ls: Layer[], origin: { x: number; y: number }, k: number, ox: number, oy: number, doc: Doc): Layer[] {
  return ls.map(l => {
    const b = layerBounds(l, doc)
    const s = scaleContent(l, k)
    return moveTo(s, doc, ox + (b.x - origin.x) * k, oy + (b.y - origin.y) * k)
  })
}

/** Crop a layer to a box with a vector mask, unless it already sits inside it. */
function cropTo(l: Layer, doc: Doc, box: Rect): Layer {
  if (l.type === 'adjustment' || (l.type === 'text' && l.onPath)) return l
  const b = layerBounds(l, doc)
  if (b.x >= box.x - 0.5 && b.y >= box.y - 0.5 && b.x + b.w <= box.x + box.w + 0.5 && b.y + b.h <= box.y + box.h + 0.5) return l
  if (l.vmask?.enabled) return l // keep the designer's own mask rather than replacing it
  const n = (x: number, y: number) => ({ x, y, inX: x, inY: y, outX: x, outY: y })
  const rect: SubPath[] = [{ closed: true, nodes: [n(box.x, box.y), n(box.x + box.w, box.y), n(box.x + box.w, box.y + box.h), n(box.x, box.y + box.h)] }]
  return { ...l, vmask: { subpaths: docToVmask(l, rect, doc), enabled: true } } as Layer
}

/** Stretch or cover a panel fill into its slot. Plain rectangles are resized exactly; anything else covers and is cropped. */
function fillInto(b: Block, from: Rect, slot: Rect, doc: Doc): Layer[] {
  const simpleRect = b.layers.length === 1 && b.layers[0].type === 'shape' && b.layers[0].shape === 'rect' && !b.layers[0].rotation && !b.layers[0].subpaths
  if (simpleRect) {
    const l = b.layers[0] as Extract<Layer, { type: 'shape' }>
    return [{ ...l, x: slot.x, y: slot.y, w: slot.w / Math.abs(l.scaleX || 1), h: slot.h / Math.abs(l.scaleY || 1), rev: nextRev() } as Layer]
  }
  const k = Math.max(slot.w / Math.max(1, from.w), slot.h / Math.max(1, from.h))
  const ox = slot.x + (slot.w - from.w * k) / 2, oy = slot.y + (slot.h - from.h * k) / 2
  return placeBlock(b.layers, { x: from.x, y: from.y }, k, ox, oy, doc).map(l => cropTo(l, doc, slot))
}

/** Share out a node's box among its children: fixed panels get what they need, picture panels share the rest. */
function allocate(n: Node, box: Rect, k: number, m: number, T: { w: number; h: number }, out: Map<Panel, Rect>) {
  if (n.kind === 'leaf') { out.set(n.panel, box); return }
  const along = n.kind === 'row' ? 'w' : 'h'
  const sizes = n.kids.map(c => need(c, k, m, T)[along])
  const flex = n.kids.map(c => c.kind === 'leaf' && (c.panel.flexible || !c.panel.content))
  const extra = (along === 'w' ? box.w : box.h) - sizes.reduce((a, b) => a + b, 0)
  const nFlex = flex.filter(Boolean).length
  const sum = sizes.reduce((a, b) => a + b, 0) || 1
  let pos = along === 'w' ? box.x : box.y
  n.kids.forEach((c, i) => {
    const add = nFlex ? (flex[i] ? extra / nFlex : 0) : extra * (sizes[i] / sum)
    const len = sizes[i] + add
    const r = along === 'w' ? { x: pos, y: box.y, w: len, h: box.h } : { x: box.x, y: pos, w: box.w, h: len }
    allocate(c, r, k, m, T, out)
    pos += len
  })
}

export interface Relaid { layers: Layer[]; dropped: string[] }

/**
 * Lay the master board's layers into the target board. Layers keep their group ids and gain
 * `srcId`, so linked formats keep following the master's content. Call `regroup` afterwards to
 * give each board its own groups.
 */
export function relayout(master: Layer[], m: Frame, t: Frame, doc: Doc, groups: Group[], keep?: (p: Panel) => boolean): Relaid {
  const a = analyse(master, m, doc, groups)
  const T = { w: t.width, h: t.height }
  const fresh = (l: Layer) => ({ ...l, id: uid(), frameId: t.id, srcId: l.id, rev: nextRev() } as Layer)
  const placed = new Map<string, Layer>() // master layer id → new layer
  const board: Rect = { x: t.x, y: t.y, w: t.width, h: t.height }

  // Backgrounds cover the whole board (the board clips them).
  for (const b of a.backgrounds) {
    const from = rel(union(b.layers.map(l => layerBounds(l, doc)))!, m)
    const k = Math.max(T.w / Math.max(1, from.w), T.h / Math.max(1, from.h))
    const ox = t.x + (T.w - from.w * k) / 2, oy = t.y + (T.h - from.h * k) / 2
    placeBlock(b.layers.map(fresh), { x: m.x + from.x, y: m.y + from.y }, k, ox, oy, doc).forEach((l, i) => placed.set(b.layers[i].id, l))
  }

  const fit = chooseFit(a, T, keep)
  const dropped = a.panels.filter(p => !fit?.panels.includes(p)).map(p => p.name)
  if (fit) {
    const mg = Math.min(T.w, T.h) * 0.06
    const slots = new Map<Panel, Rect>()
    allocate(fit.tree, board, fit.k, mg, T, slots)
    slots.forEach((slot, p) => {
      for (const b of p.blocks.filter(x => x.kind === 'fill')) {
        const from = { x: m.x + p.box.x, y: m.y + p.box.y, w: p.box.w, h: p.box.h }
        // The fill covers its panel in the master; keep that relationship in the slot.
        const fb = union(b.layers.map(l => layerBounds(l, doc)))!
        const kx = slot.w / from.w, ky = slot.h / from.h
        const target = { x: slot.x + (fb.x - from.x) * kx, y: slot.y + (fb.y - from.y) * ky, w: fb.w * kx, h: fb.h * ky }
        fillInto({ ...b, layers: b.layers.map(fresh) }, fb, p.flexible ? slot : clipRect(target, slot), doc).forEach((l, i) => placed.set(b.layers[i].id, l))
      }
      if (!p.content) return
      const c = p.content, k = fit.k
      // Keep the content where it sat in its panel (left, centred, right; top, middle, bottom).
      const fx = p.box.w - c.w > 1 ? Math.min(1, Math.max(0, (c.x - p.box.x) / (p.box.w - c.w))) : 0.5
      const fy = p.box.h - c.h > 1 ? Math.min(1, Math.max(0, (c.y - p.box.y) / (p.box.h - c.h))) : 0.5
      const ox = slot.x + mg + fx * Math.max(0, slot.w - mg * 2 - c.w * k)
      const oy = slot.y + mg + fy * Math.max(0, slot.h - mg * 2 - c.h * k)
      for (const b of p.blocks.filter(x => x.kind === 'content')) {
        const out = placeBlock(b.layers.map(fresh), { x: m.x + c.x, y: m.y + c.y }, k, ox, oy, doc)
        out.forEach((l, i) => placed.set(b.layers[i].id, l))
      }
    })
  }

  // Adjustments on the master board apply to the new board too.
  const out: Layer[] = []
  for (const l of master) {
    if (l.type === 'adjustment') { out.push({ ...fresh(l), mask: null } as Layer); continue }
    const p = placed.get(l.id)
    if (p) out.push(p)
  }
  return { layers: out, dropped }
}

function clipRect(r: Rect, to: Rect): Rect {
  // A fill slightly short of its panel edge in the master should still reach the slot edge.
  const x0 = r.x - to.x < to.w * 0.03 ? to.x : r.x, y0 = r.y - to.y < to.h * 0.03 ? to.y : r.y
  const x1 = to.x + to.w - (r.x + r.w) < to.w * 0.03 ? to.x + to.w : r.x + r.w
  const y1 = to.y + to.h - (r.y + r.h) < to.h * 0.03 ? to.y + to.h : r.y + r.h
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** Give a board's layers their own copies of the master's groups, so a group never spans two boards. */
export function regroup(layers: Layer[], groups: Group[]): { layers: Layer[]; groups: Group[] } {
  const byId = new Map(groups.map(g => [g.id, g]))
  const map = new Map<string, string>()
  const want = (gid?: string | null) => { let g = gid ? byId.get(gid) : undefined; while (g && !map.has(g.id)) { map.set(g.id, uid()); g = g.parentId ? byId.get(g.parentId) : undefined } }
  layers.forEach(l => want(l.groupId))
  return {
    layers: layers.map(l => (l.groupId ? ({ ...l, groupId: map.get(l.groupId) ?? null } as Layer) : l)),
    groups: groups.filter(g => map.has(g.id)).map(g => ({ ...g, id: map.get(g.id)!, parentId: g.parentId ? map.get(g.parentId) ?? null : null })),
  }
}
