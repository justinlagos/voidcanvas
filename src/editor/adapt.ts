import { layerBounds, layerSize, uid } from './engine'
import { nextRev } from './store'
import type { Doc, Frame, Layer, LayerRole, Rect, TextLayer } from './types'

// Key visual to every format. Each layer has a role (headline, logo, image...). A format is
// laid out from the master by role, not by scaling the whole board, and stays linked:
// content changes on the master flow to every format, while each format keeps its own layout.

export const ROLE_LABEL: Record<LayerRole, string> = {
  background: 'Background', image: 'Image', headline: 'Headline', subhead: 'Subheading', body: 'Body text',
  detail: 'Details', cta: 'Call to action', logo: 'Logo', decoration: 'Decoration',
}

const rel = (b: Rect, f: Frame): Rect => ({ x: b.x - f.x, y: b.y - f.y, w: b.w, h: b.h })

/** Best guess at each layer's role on a board. Roles set by hand win. */
export function inferRoles(layers: Layer[], f: Frame, doc: Doc): Map<string, LayerRole> {
  const out = new Map<string, LayerRole>()
  const onBoard = layers.filter(l => l.frameId === f.id && l.type !== 'adjustment' && l.visible)
  const area = f.width * f.height
  const texts = onBoard.filter(l => l.type === 'text') as TextLayer[]
  const bySize = texts.slice().sort((a, b) => b.fontSize - a.fontSize)
  for (const l of onBoard) {
    if (l.role) { out.set(l.id, l.role); continue }
    const b = rel(layerBounds(l, doc), f)
    const cover = (b.w * b.h) / area
    const nearEdge = Math.min(b.x, b.y, f.width - (b.x + b.w), f.height - (b.y + b.h)) < Math.min(f.width, f.height) * 0.12
    if (l.type === 'raster' || (l.type === 'shape' && cover > 0.85)) {
      if (cover > 0.85) out.set(l.id, 'background')
      else if (/logo|mark|icon|badge/i.test(l.name) || (cover < 0.04 && nearEdge)) out.set(l.id, 'logo')
      else if (l.type === 'raster') out.set(l.id, 'image')
      else out.set(l.id, 'decoration')
      continue
    }
    if (l.type === 'shape' && /logo|brand ?mark|badge|emblem/i.test(l.name)) { out.set(l.id, 'logo'); continue }
    if (l.type === 'shape') {
      // A shape with short text on top of it is a button.
      const hasLabel = texts.some(t => { const tb = rel(layerBounds(t, doc), f); return tb.x >= b.x - 2 && tb.y >= b.y - 2 && tb.x + tb.w <= b.x + b.w + 2 && tb.y + tb.h <= b.y + b.h + 2 && t.text.length < 32 })
      out.set(l.id, hasLabel ? 'cta' : cover > 0.2 ? 'image' : 'decoration')
      continue
    }
    if (l.type === 'text') {
      const onButton = onBoard.some(s => s.type === 'shape' && s.id !== l.id && (() => { const sb = rel(layerBounds(s, doc), f), tb = rel(layerBounds(l, doc), f); return tb.x >= sb.x - 2 && tb.y >= sb.y - 2 && tb.x + tb.w <= sb.x + sb.w + 2 && tb.y + tb.h <= sb.y + sb.h + 2 })())
      const i = bySize.indexOf(l)
      out.set(l.id, onButton ? 'cta' : i === 0 ? 'headline' : i === 1 && l.fontSize > bySize[bySize.length - 1].fontSize * 1.15 ? 'subhead' : l.text.length > 80 ? 'body' : 'detail')
    }
  }
  return out
}

/** Scale a layer's own content (text size, shape size, image scale) by k, keeping its type. */
function scaleLayer(l: Layer, k: number): Layer {
  const nl = { ...l, rev: nextRev() } as Layer
  if (nl.type === 'text') {
    nl.fontSize = Math.max(4, nl.fontSize * k); nl.letterSpacing *= k
    if (nl.boxWidth) nl.boxWidth *= k
    if (nl.onPath) { nl.scaleX *= k; nl.scaleY *= k }
  } else if (nl.type === 'shape') {
    nl.w *= k; nl.h *= k; nl.strokeWidth *= k; nl.radius *= k
    if (nl.subpaths) nl.subpaths = nl.subpaths.map(sp => ({ ...sp, nodes: sp.nodes.map(n => ({ ...n, x: n.x * k, y: n.y * k, inX: n.inX * k, inY: n.inY * k, outX: n.outX * k, outY: n.outY * k })) }))
  } else if (nl.type === 'raster') { nl.scaleX *= k; nl.scaleY *= k }
  return nl
}
function placeAt(l: Layer, doc: Doc, x: number, y: number): Layer {
  const b = layerBounds(l, doc)
  return { ...l, x: l.x + (x - b.x), y: l.y + (y - b.y) } as Layer
}

/** Fill a box with a layer, like CSS object-fit: cover. */
function cover(l: Layer, doc: Doc, box: Rect): Layer {
  const b = layerBounds(l, doc)
  const k = Math.max(box.w / Math.max(1, b.w), box.h / Math.max(1, b.h))
  const s = scaleLayer(l, k), sb = layerBounds(s, doc)
  return placeAt(s, doc, box.x + (box.w - sb.w) / 2, box.y + (box.h - sb.h) / 2)
}
function contain(l: Layer, doc: Doc, box: Rect): Layer {
  const b = layerBounds(l, doc)
  const k = Math.min(box.w / Math.max(1, b.w), box.h / Math.max(1, b.h))
  const s = scaleLayer(l, k), sb = layerBounds(s, doc)
  return placeAt(s, doc, box.x + (box.w - sb.w) / 2, box.y + (box.h - sb.h) / 2)
}

/**
 * Lay the master board's layers into a target board by role.
 * Similar shapes keep their anchors. Much wider boards split into a text column and an image
 * side. Much taller boards stack the image above the text.
 */
export function layoutByRole(master: Layer[], m: Frame, t: Frame, doc: Doc, roles: Map<string, LayerRole>): Layer[] {
  const ma = m.width / m.height, ta = t.width / t.height, ratio = ta / ma
  const minM = Math.min(m.width, m.height), minT = Math.min(t.width, t.height)
  const fitK = Math.min(t.width / m.width, t.height / m.height)
  const out: Layer[] = []
  const fresh = (l: Layer) => ({ ...l, id: uid(), frameId: t.id, srcId: l.id, rev: nextRev() } as Layer)
  const role = (l: Layer) => roles.get(l.id) ?? 'decoration'
  const content = master.filter(l => l.type !== 'adjustment')

  for (const l of master.filter(x => x.type === 'adjustment')) out.push(fresh(l))
  for (const l of content.filter(x => role(x) === 'background')) out.push(cover(fresh(l), doc, { x: t.x, y: t.y, w: t.width, h: t.height }))

  const logos = content.filter(x => role(x) === 'logo')
  const media = content.filter(x => role(x) === 'image')
  const texty = content.filter(x => ['headline', 'subhead', 'body', 'detail', 'cta', 'decoration'].includes(role(x)))

  // Logos keep their corner and margin, sized to the shorter side.
  for (const l of logos) {
    const b = rel(layerBounds(l, doc), m)
    const k = minT / minM
    const s = scaleLayer(fresh(l), k), sb = layerBounds(s, doc)
    const right = b.x + b.w / 2 > m.width / 2, bottom = b.y + b.h / 2 > m.height / 2
    const mx = (right ? m.width - (b.x + b.w) : b.x) / minM * minT, my = (bottom ? m.height - (b.y + b.h) : b.y) / minM * minT
    out.push(placeAt(s, doc, right ? t.x + t.width - mx - sb.w : t.x + mx, bottom ? t.y + t.height - my - sb.h : t.y + my))
  }

  const mode = ratio > 1.45 ? 'wide' : ratio < 0.78 ? 'tall' : 'similar'
  if (mode === 'similar') {
    for (const l of [...media, ...texty]) {
      const b = rel(layerBounds(l, doc), m)
      let s = scaleLayer(fresh(l), fitK), sb = layerBounds(s, doc)
      // Never let a line of type run off the board.
      const room = t.width - minT * 0.1
      if (s.type === 'text' && sb.w > room) { s = scaleLayer(s, room / sb.w); sb = layerBounds(s, doc) }
      // Keep the distance to the nearest edge on each axis, scaled; otherwise keep the relative centre.
      const edgeX = b.x < m.width * 0.12 ? 'l' : m.width - (b.x + b.w) < m.width * 0.12 ? 'r' : 'c'
      const edgeY = b.y < m.height * 0.12 ? 't' : m.height - (b.y + b.h) < m.height * 0.12 ? 'b' : 'c'
      const x = edgeX === 'l' ? t.x + b.x * fitK : edgeX === 'r' ? t.x + t.width - (m.width - b.x - b.w) * fitK - sb.w : t.x + ((b.x + b.w / 2) / m.width) * t.width - sb.w / 2
      const y = edgeY === 't' ? t.y + b.y * fitK : edgeY === 'b' ? t.y + t.height - (m.height - b.y - b.h) * fitK - sb.h : t.y + ((b.y + b.h / 2) / m.height) * t.height - sb.h / 2
      out.push(placeAt(s, doc, x, y))
    }
    return out
  }

  // Split layouts.
  const pad = minT * 0.08
  const mediaBox: Rect = mode === 'wide'
    ? { x: t.x + t.width * 0.52, y: t.y, w: t.width * 0.48, h: t.height }
    : { x: t.x, y: t.y, w: t.width, h: t.height * 0.46 }
  const textBox: Rect = media.length
    ? (mode === 'wide' ? { x: t.x + pad, y: t.y + pad, w: t.width * 0.52 - pad * 1.6, h: t.height - pad * 2 } : { x: t.x + pad, y: t.y + t.height * 0.46 + pad, w: t.width - pad * 2, h: t.height * 0.54 - pad * 2 })
    : { x: t.x + pad, y: t.y + pad, w: t.width - pad * 2, h: t.height - pad * 2 }
  if (media.length) {
    // The largest image fills the media area; any others sit inside it.
    const [main, ...rest] = media.slice().sort((a, b) => { const ab = layerBounds(a, doc), bb = layerBounds(b, doc); return bb.w * bb.h - ab.w * ab.h })
    out.push(cover(fresh(main), doc, mediaBox))
    rest.forEach((l, i) => out.push(contain(fresh(l), doc, { x: mediaBox.x + mediaBox.w * 0.1 + i * 12, y: mediaBox.y + mediaBox.h * 0.1 + i * 12, w: mediaBox.w * 0.4, h: mediaBox.h * 0.4 })))
  }

  // Text stacks in the master's top-to-bottom order, scaled so the stack fits the column.
  const items = texty.map(l => ({ l, b: rel(layerBounds(l, doc), m) })).sort((a, b) => a.b.y - b.b.y)
  if (!items.length) return out
  const x0 = Math.min(...items.map(i => i.b.x)), x1 = Math.max(...items.map(i => i.b.x + i.b.w))
  const y0 = Math.min(...items.map(i => i.b.y)), y1 = Math.max(...items.map(i => i.b.y + i.b.h))
  const cw = Math.max(1, x1 - x0), ch = Math.max(1, y1 - y0)
  // Rows: items that overlap vertically in the master stay on one row (a button beside a price).
  let k = Math.min(textBox.w / cw, textBox.h / ch)
  // Wide banners: do not let type shrink below a third of its master size if the column can take it.
  k = Math.max(k, Math.min(fitK, textBox.h / ch))
  const centred = items.every(i => Math.abs(i.b.x + i.b.w / 2 - m.width / 2) < m.width * 0.08)
  const offY = textBox.y + Math.max(0, (textBox.h - ch * k) / 2)
  for (const it of items) {
    let s = scaleLayer(fresh(it.l), k)
    const sb0 = layerBounds(s, doc)
    if (s.type === 'text' && !s.boxWidth && sb0.w > textBox.w) s = scaleLayer(s, textBox.w / sb0.w)
    // Paragraph boxes take the column's width share.
    if (s.type === 'text' && s.boxWidth) s = { ...s, boxWidth: Math.min(textBox.w, s.boxWidth) } as Layer
    const sb = layerBounds(s, doc)
    const x = centred && mode === 'tall' ? textBox.x + (textBox.w - sb.w) / 2 : textBox.x + (it.b.x - x0) * k
    out.push(placeAt(s, doc, Math.min(x, textBox.x + textBox.w - sb.w), offY + (it.b.y - y0) * k))
  }
  return out
}

const CONTENT_KEYS: Record<string, string[]> = {
  text: ['text', 'fontFamily', 'fontWeight', 'italic', 'color', 'align', 'underline', 'strike', 'caps', 'outline', 'shadow', 'kerning', 'stretch'],
  shape: ['fill', 'stroke', 'strokeAlign', 'strokeCap', 'strokeJoin', 'strokeDash'],
  raster: [],
  adjustment: ['kind', 'values', 'points', 'channelPoints', 'channelLevels', 'bands', 'colors', 'lut', 'look', 'effect', 'effectParams'],
}
const COMMON = ['name', 'visible', 'opacity', 'blend', 'styles', 'fillOpacity', 'role']

/**
 * Push the master's content into every linked format. Text, colours, pictures and styles follow
 * the master; each format keeps its own positions and sizes. New master layers are laid in by
 * role; layers removed from the master are removed from the formats.
 */
export function syncFormats(doc: Doc, layers: Layer[], masterId: string, roles: Map<string, LayerRole>): { layers: Layer[]; changed: number } {
  const m = doc.frames?.find(f => f.id === masterId); if (!m) return { layers, changed: 0 }
  const kids = (doc.frames ?? []).filter(f => f.linkedFrom === masterId)
  const master = layers.filter(l => l.frameId === masterId)
  const byId = new Map(master.map(l => [l.id, l]))
  let changed = 0
  let out = layers.filter(l => !(kids.some(k => k.id === l.frameId) && l.srcId && !byId.has(l.srcId)))
  out = out.map(l => {
    if (!l.srcId || !kids.some(k => k.id === l.frameId)) return l
    const src = byId.get(l.srcId); if (!src || src.type !== l.type) return l
    const patch: Record<string, unknown> = {}
    for (const key of [...COMMON, ...(CONTENT_KEYS[l.type] ?? [])]) if (JSON.stringify((src as any)[key]) !== JSON.stringify((l as any)[key])) patch[key] = (src as any)[key]
    if (src.type === 'raster' && l.type === 'raster' && src.canvas !== l.canvas) {
      // Keep the format's displayed size when the master's picture changes resolution.
      const kx = l.canvas.width / src.canvas.width, ky = l.canvas.height / src.canvas.height
      Object.assign(patch, { canvas: src.canvas, mask: src.mask, scaleX: l.scaleX * kx, scaleY: l.scaleY * ky })
    }
    if (!Object.keys(patch).length) return l
    changed++
    return { ...l, ...patch, rev: nextRev() } as Layer
  })
  // Master layers the formats have not seen yet.
  for (const k of kids) {
    const have = new Set(out.filter(l => l.frameId === k.id).map(l => l.srcId))
    const missing = master.filter(l => !have.has(l.id))
    if (missing.length) { out = out.concat(layoutByRole(missing, m, k, doc, roles)); changed += missing.length }
  }
  return { layers: out, changed }
}

/** Keep layer order sensible: each board's layers stay together, in master order. */
export function orderLikeMaster(layers: Layer[], masterId: string): Layer[] {
  const masterOrder = new Map(layers.filter(l => l.frameId === masterId).map((l, i) => [l.id, i]))
  const byFrame = new Map<string, Layer[]>()
  for (const l of layers) { const k = l.frameId ?? ''; if (!byFrame.has(k)) byFrame.set(k, []); byFrame.get(k)!.push(l) }
  const out: Layer[] = []
  byFrame.forEach(list => {
    const linked = list.every(l => !l.srcId || masterOrder.has(l.srcId))
    if (linked && list.some(l => l.srcId)) list.sort((a, b) => (masterOrder.get(a.srcId ?? '') ?? 999) - (masterOrder.get(b.srcId ?? '') ?? 999))
    out.push(...list)
  })
  return out
}

export const sizeOf = layerSize
