import { healPixels } from './healing'
import { directionalBlur } from './blur'
import { applyEffect } from '@/lib/effects'
import { FX_WORK, scaleParams } from '@/lib/effect-scale'
import type { AdjustmentLayer, AdjustmentSettings, Doc, Effect, Frame, Group, HueBand, Layer, MaskAt, RasterLayer, Rect, ShapeLayer, SubPath, TextLayer } from './types'
import { drawStyled, hasActiveStyles, withAlpha } from './styles'
import { EFFECT_DEFAULTS, fxKey, fxReach, groupUnits, hasFx, liveFx, maskOf } from './effects'
import { transferStats } from '@/studio/analyze'

// ─── Canvas helpers ────────────────────────────────────────────────

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

export function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = makeCanvas(src.width, src.height)
  c.getContext('2d')!.drawImage(src, 0, 0)
  return c
}

export function ctx2d(c: HTMLCanvasElement, readback = false): CanvasRenderingContext2D {
  return c.getContext('2d', readback ? { willReadFrequently: true } : undefined)!
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

// ─── Layer geometry ────────────────────────────────────────────────

let measureCtx: CanvasRenderingContext2D | null = null

export function fontString(l: TextLayer): string {
  return `${l.italic ? 'italic ' : ''}${l.fontWeight} ${l.fontSize}px "${l.fontFamily}", Inter, system-ui, sans-serif`
}

const STRETCH: [number, string][] = [[50, 'ultra-condensed'], [62.5, 'extra-condensed'], [75, 'condensed'], [87.5, 'semi-condensed'], [100, 'normal'], [112.5, 'semi-expanded'], [125, 'expanded'], [150, 'extra-expanded'], [200, 'ultra-expanded']]

function applyTextStyle(ctx: CanvasRenderingContext2D, l: TextLayer) {
  const c = ctx as any
  if (l.stretch && l.stretch !== 100) {
    const kw = STRETCH.reduce((a, b) => (Math.abs(b[0] - l.stretch!) < Math.abs(a[0] - l.stretch!) ? b : a))[1]
    c.fontStretch = kw
  } else c.fontStretch = 'normal'
  ctx.font = fontString(l)
  c.letterSpacing = `${l.letterSpacing}px`
  c.wordSpacing = `${l.wordSpacing ?? 0}px`
  c.fontKerning = l.kerning === false ? 'none' : 'normal'
  c.fontVariantCaps = l.caps === 'small' ? 'small-caps' : 'normal'
}

export interface TextLine { text: string; width: number; y: number; justify: boolean; first: boolean }
const layoutCache = new Map<string, { lines: TextLine[]; w: number; h: number }>()
// A measurement taken with a stand-in font is wrong once the real font arrives.
if (typeof document !== 'undefined' && document.fonts?.addEventListener) document.fonts.addEventListener('loadingdone', () => layoutCache.clear())
const fontIsReady = (l: TextLayer) => { try { return typeof document === 'undefined' || !document.fonts?.check || document.fonts.check(`${l.italic ? 'italic ' : ''}${l.fontWeight} 16px "${l.fontFamily}"`) } catch { return true } }

/** Lines, positions and size of a text layer. Point text keeps its own line breaks; paragraph text wraps at boxWidth. */
export function textLayout(l: TextLayer): { lines: TextLine[]; w: number; h: number } {
  const key = [l.text, l.fontFamily, l.fontSize, l.fontWeight, l.italic, l.letterSpacing, l.lineHeight, l.boxWidth ?? '', l.caps ?? '', l.kerning ?? '', l.wordSpacing ?? '', l.stretch ?? '', l.indent ?? '', l.spaceAfter ?? ''].join('\u0001')
  const hit = layoutCache.get(key)
  if (hit) return hit
  if (!measureCtx) measureCtx = ctx2d(makeCanvas(1, 1))
  applyTextStyle(measureCtx, l)
  const m = (t: string) => measureCtx!.measureText(t).width
  const src = l.caps === 'all' ? l.text.toUpperCase() : l.text
  const lh = l.fontSize * l.lineHeight
  const indent = l.indent ?? 0, after = l.spaceAfter ?? 0
  const lines: TextLine[] = []
  let y = 0
  const paras = (src || ' ').split('\n')
  paras.forEach((para, pi) => {
    if (!l.boxWidth) {
      lines.push({ text: para, width: m(para || ' '), y, justify: false, first: true }); y += lh
    } else {
      const words = para.split(/(\s+)/).filter(w => w.length)
      let cur = '', first = true
      const avail = () => Math.max(8, l.boxWidth! - 4 - (first ? indent : 0))
      const push = (t: string, last: boolean) => { lines.push({ text: t, width: m(t || ' '), y, justify: !last, first }); y += lh; first = false }
      for (const w of words) {
        const next = cur + w
        if (m(next.trimEnd()) <= avail() || !cur.trim()) {
          // A single word wider than the box is broken by character.
          if (!cur.trim() && m(w) > avail() && w.trim()) {
            let chunk = ''
            for (const ch of w) { if (m(chunk + ch) > avail() && chunk) { push(chunk, false); chunk = '' } chunk += ch }
            cur = chunk
          } else cur = next
        } else { push(cur.trimEnd(), false); cur = w.trimStart() }
      }
      push(cur.trimEnd(), true)
    }
    if (pi < paras.length - 1) y += after
  })
  const w = l.boxWidth ? l.boxWidth : Math.ceil(Math.max(1, ...lines.map(x => x.width)) + indent) + 4
  const out = { lines, w, h: Math.ceil(y) + 4 }
  if (layoutCache.size > 400) layoutCache.clear()
  if (fontIsReady(l)) layoutCache.set(key, out)
  return out
}

/** Width of a run of text set in a text layer's type (font, spacing, caps), in layer pixels. */
export function measureTextIn(l: TextLayer, text: string): number {
  if (!measureCtx) measureCtx = ctx2d(makeCanvas(1, 1))
  applyTextStyle(measureCtx, l)
  return measureCtx.measureText(text).width
}

export function layerSize(l: Layer, doc?: Doc): { w: number; h: number } {
  if (l.type === 'raster') return { w: l.canvas.width, h: l.canvas.height }
  if (l.type === 'text' && l.onPath) return { w: l.onPath.w, h: l.onPath.h }
  if (l.type === 'shape') return { w: l.w, h: l.h }
  if (l.type === 'adjustment') return { w: doc?.width ?? 1, h: doc?.height ?? 1 }
  const t = textLayout(l)
  return { w: t.w, h: t.h }
}

/**
 * Text grows from where its alignment says: left-aligned text from its left edge, centred text from its middle,
 * right-aligned text from its right edge, and every line count from its top. Given a text layer before and after
 * a change that altered its size (typing, font, size, spacing), returns the layer moved so that point stays where
 * it was on the page, turned and flipped layers included. Any other change, or a change that also moved the
 * layer, is returned as it is.
 */
export function keepTextAnchor<T extends Layer>(prev: Layer, next: T): T {
  if (prev.type !== 'text' || next.type !== 'text' || next.onPath || prev.onPath) return next
  if (next.x !== prev.x || next.y !== prev.y) return next
  const a = layerSize(prev), b = layerSize(next)
  if (Math.abs(a.w - b.w) < 1e-6 && Math.abs(a.h - b.h) < 1e-6) return next
  const ax = next.align === 'center' ? 0.5 : next.align === 'right' ? 1 : 0
  // Where the anchor sits from the centre, before and after, in page pixels (scale first, then rotation).
  const vx = next.scaleX * (ax - 0.5) * (a.w - b.w), vy = next.scaleY * -0.5 * (a.h - b.h)
  const c = Math.cos(next.rotation), sn = Math.sin(next.rotation)
  const cx = prev.x + (a.w * prev.scaleX) / 2 + (vx * c - vy * sn)
  const cy = prev.y + (a.h * prev.scaleY) / 2 + (vx * sn + vy * c)
  return { ...next, x: cx - (b.w * next.scaleX) / 2, y: cy - (b.h * next.scaleY) / 2 }
}

/** Local (layer pixel) space to document space. */
export function layerMatrix(l: Layer, doc?: Doc): DOMMatrix {
  const { w, h } = layerSize(l, doc)
  const cx = l.x + (w * l.scaleX) / 2
  const cy = l.y + (h * l.scaleY) / 2
  return new DOMMatrix()
    .translate(cx, cy)
    .rotate((l.rotation * 180) / Math.PI)
    .scale(l.scaleX, l.scaleY)
    .translate(-w / 2, -h / 2)
}

export function docToLocal(l: Layer, x: number, y: number, doc?: Doc) {
  const p = layerMatrix(l, doc).inverse().transformPoint({ x, y })
  return { x: p.x, y: p.y }
}

/** Corner points of the layer box in document space: tl, tr, br, bl. */
export function layerCorners(l: Layer, doc?: Doc) {
  const { w, h } = layerSize(l, doc)
  const m = layerMatrix(l, doc)
  return [[0, 0], [w, 0], [w, h], [0, h]].map(([x, y]) => {
    const p = m.transformPoint({ x, y })
    return { x: p.x, y: p.y }
  })
}

export function layerBounds(l: Layer, doc?: Doc): Rect {
  const pts = layerCorners(l, doc)
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const x = Math.min(...xs), y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

export function isDocAligned(l: Layer, doc: Doc): boolean {
  if (l.type !== 'raster') return false
  return l.x === 0 && l.y === 0 && l.scaleX === 1 && l.scaleY === 1 && l.rotation === 0 &&
    l.canvas.width === doc.width && l.canvas.height === doc.height
}

/** Bake a raster layer's transform so its pixels line up 1:1 with the document. Needed before painting. */
export function rasterizeToDoc(l: RasterLayer, doc: Doc): Pick<RasterLayer, 'canvas' | 'mask' | 'x' | 'y' | 'scaleX' | 'scaleY' | 'rotation'> {
  const m = layerMatrix(l, doc)
  const bake = (src: HTMLCanvasElement) => {
    const c = makeCanvas(doc.width, doc.height)
    const ctx = ctx2d(c)
    ctx.imageSmoothingQuality = 'high'
    ctx.setTransform(m)
    ctx.drawImage(src, 0, 0)
    return c
  }
  return { canvas: bake(l.canvas), mask: l.mask ? bake(localLayerMask(l,doc,l.mask)) : null, x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }
}

/** True when any group around the layer, at any depth, is hidden. */
export function insideHiddenGroup(l: Layer, groups: Group[]): boolean {
  let gid = l.groupId ?? null, guard = 0
  while (gid && guard++ < 64) { const g = groups.find(x => x.id === gid); if (!g) return false; if (!g.visible) return true; gid = g.parentId ?? null }
  return false
}

/** Topmost selectable layer under a document point. */
export function hitLayer(layers: Layer[], x: number, y: number, doc: Doc, groups: Group[] = []): Layer | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i]
    if (!l.visible || l.locked || l.type === 'adjustment' || insideHiddenGroup(l, groups)) continue
    const { w, h } = layerSize(l, doc)
    const p = docToLocal(l, x, y, doc)
    if (p.x < 0 || p.y < 0 || p.x >= w || p.y >= h) continue
    if (l.type === 'raster') {
      const a = ctx2d(l.canvas, true).getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data[3]
      if (a < 8) continue
    }
    return l
  }
  return null
}

// ─── Drawing layer content (local space) ───────────────────────────

export function tracePath(ctx: CanvasRenderingContext2D, subpaths: SubPath[]) {
  for (const sp of subpaths) {
    const n = sp.nodes
    if (!n.length) continue
    ctx.moveTo(n[0].x, n[0].y)
    for (let i = 1; i < n.length; i++) ctx.bezierCurveTo(n[i - 1].outX, n[i - 1].outY, n[i].inX, n[i].inY, n[i].x, n[i].y)
    if (sp.closed && n.length > 1) { const a = n[n.length - 1], b = n[0]; ctx.bezierCurveTo(a.outX, a.outY, b.inX, b.inY, b.x, b.y); ctx.closePath() }
  }
}

export function polygonPoints(l: Pick<ShapeLayer, 'w' | 'h' | 'sides' | 'star'>, inset = 0): { x: number; y: number }[] {
  const n = Math.max(3, Math.round(l.sides ?? 5)), star = l.star ?? 1
  const rx = Math.max(0.5, l.w / 2 - inset), ry = Math.max(0.5, l.h / 2 - inset)
  const pts: { x: number; y: number }[] = []
  const steps = star < 1 ? n * 2 : n
  for (let i = 0; i < steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * Math.PI * 2
    const k = star < 1 && i % 2 ? star : 1
    pts.push({ x: l.w / 2 + Math.cos(a) * rx * k, y: l.h / 2 + Math.sin(a) * ry * k })
  }
  return pts
}

export function drawLayerContent(ctx: CanvasRenderingContext2D, l: Layer, k = 1) {
  if (l.type === 'raster') {
    ctx.drawImage(l.canvas, 0, 0)
  } else if (l.type === 'text' && l.onPath) {
    drawTextOnPath(ctx, l, k)
  } else if (l.type === 'text') {
    applyTextStyle(ctx, l)
    ctx.fillStyle = l.color
    ctx.textBaseline = 'alphabetic'
    const lay = textLayout(l)
    const w = lay.w
    const lh = l.fontSize * l.lineHeight
    const indent = l.indent ?? 0
    const yAt = (y: number) => 2 + y + (lh - l.fontSize) / 2 + l.fontSize * 0.82 - (l.baselineShift ?? 0)
    // Shadow offsets ignore canvas transforms, so scale them by hand (k = on-screen scale of this layer).
    const paint = (fn: (text: string, x: number, y: number) => void) => {
      for (const line of lay.lines) {
        const y = yAt(line.y)
        const ind = line.first ? indent : 0
        if (l.align === 'justify' && line.justify && l.boxWidth) {
          ctx.textAlign = 'left'
          const words = line.text.split(/\s+/).filter(Boolean)
          const widths = words.map(t => ctx.measureText(t).width)
          const gap = words.length > 1 ? (w - 4 - ind - widths.reduce((a, b) => a + b, 0)) / (words.length - 1) : 0
          let x = 2 + ind
          words.forEach((t, i) => { fn(t, x, y); x += widths[i] + gap })
        } else {
          const al = l.align === 'justify' ? 'left' : l.align
          ctx.textAlign = al
          const x = al === 'left' ? 2 + ind : al === 'center' ? w / 2 : w - 2
          fn(line.text, x, y)
        }
      }
    }
    if (l.shadow) { ctx.shadowColor = withAlpha(l.shadow.color, l.shadow.opacity ?? 1); ctx.shadowBlur = l.shadow.blur * k; ctx.shadowOffsetX = l.shadow.x * k; ctx.shadowOffsetY = l.shadow.y * k }
    if (l.outline && l.outline.width > 0) {
      ctx.strokeStyle = l.outline.color; ctx.lineWidth = l.outline.width * 2; ctx.lineJoin = 'round'
      paint((t, x, y) => ctx.strokeText(t, x, y))
      ctx.shadowColor = 'transparent'
    }
    paint((t, x, y) => ctx.fillText(t, x, y))
    ctx.shadowColor = 'transparent'
    if (l.underline || l.strike) {
      const th = Math.max(1, l.fontSize / 16)
      for (const line of lay.lines) {
        if (!line.text.trim()) continue
        const ind = line.first ? indent : 0
        const lw = l.align === 'justify' && line.justify && l.boxWidth ? w - 4 - ind : line.width
        const x0 = l.align === 'center' ? w / 2 - lw / 2 : l.align === 'right' ? w - 2 - lw : 2 + ind
        const base = yAt(line.y)
        if (l.underline) ctx.fillRect(x0, base + l.fontSize * 0.1, lw, th)
        if (l.strike) ctx.fillRect(x0, base - l.fontSize * 0.3, lw, th)
      }
    }
    ctx.textAlign = 'left'
  } else if (l.type === 'shape') {
    const sw = l.stroke ? l.strokeWidth : 0
    ctx.beginPath()
    if (l.shape === 'ellipse') {
      ctx.ellipse(l.w / 2, l.h / 2, Math.max(0.5, l.w / 2 - sw / 2), Math.max(0.5, l.h / 2 - sw / 2), 0, 0, Math.PI * 2)
    } else if (l.shape === 'line') {
      ctx.moveTo(0, l.h / 2); ctx.lineTo(l.w, l.h / 2)
    } else if (l.shape === 'polygon') {
      polygonPoints(l, sw / 2).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath()
    } else if (l.shape === 'path') {
      tracePath(ctx, l.subpaths ?? [])
    } else {
      const r = Math.min(l.radius, l.w / 2, l.h / 2)
      ctx.roundRect(sw / 2, sw / 2, Math.max(1, l.w - sw), Math.max(1, l.h - sw), r)
    }
    const usesOps = l.shape === 'path' && (l.subpaths ?? []).some(sp => sp.op)
    const align = l.shape === 'line' ? 'center' : (l.strokeAlign ?? 'center')
    const strokeStyle = (c: CanvasRenderingContext2D, width: number) => {
      c.strokeStyle = l.stroke!; c.lineWidth = width
      c.lineCap = l.strokeCap ?? 'round'; c.lineJoin = l.strokeJoin ?? 'round'; c.miterLimit = 10
      c.setLineDash(l.strokeDash?.length ? l.strokeDash.map(v => v * sw) : [])
    }
    if (!usesOps && align === 'center') {
      if (l.fill && l.shape !== 'line') { ctx.fillStyle = l.fill; ctx.fill('evenodd') }
      if (l.stroke && sw > 0) { strokeStyle(ctx, sw); ctx.stroke(); ctx.setLineDash([]) }
      return
    }
    // Path operations and inside/outside strokes are built on a scratch canvas in layer space.
    const kk = Math.max(0.05, Math.min(4, k))
    const W = Math.max(1, Math.ceil(l.w * kk)), H = Math.max(1, Math.ceil(l.h * kk))
    const shapeMask = makeCanvas(W, H), sm = ctx2d(shapeMask)
    sm.setTransform(kk, 0, 0, kk, 0, 0)
    if (usesOps) paintPathOps(sm, l.subpaths ?? [])
    else { sm.fillStyle = '#fff'; sm.beginPath(); ctx2dTrace(sm, l); sm.fill('evenodd') }
    const out = makeCanvas(W, H), o = ctx2d(out)
    if (l.fill && l.shape !== 'line') { o.drawImage(shapeMask, 0, 0); o.globalCompositeOperation = 'source-in'; o.fillStyle = l.fill; o.fillRect(0, 0, W, H); o.globalCompositeOperation = 'source-over' }
    if (l.stroke && sw > 0) {
      const st = makeCanvas(W, H), sx = ctx2d(st)
      sx.setTransform(kk, 0, 0, kk, 0, 0); sx.beginPath(); ctx2dTrace(sx, l)
      strokeStyle(sx, align === 'center' ? sw : sw * 2); sx.stroke()
      sx.setTransform(1, 0, 0, 1, 0, 0)
      if (align === 'inside') { sx.globalCompositeOperation = 'destination-in'; sx.drawImage(shapeMask, 0, 0) }
      if (align === 'outside') { sx.globalCompositeOperation = 'destination-out'; sx.drawImage(shapeMask, 0, 0) }
      o.drawImage(st, 0, 0)
    }
    ctx.drawImage(out, 0, 0, l.w, l.h)
  }
}

function ctx2dTrace(c: CanvasRenderingContext2D, l: ShapeLayer) {
  if (l.shape === 'path') { tracePath(c, l.subpaths ?? []); return }
  const sw = l.stroke ? l.strokeWidth : 0
  if (l.shape === 'ellipse') c.ellipse(l.w / 2, l.h / 2, Math.max(0.5, l.w / 2 - sw / 2), Math.max(0.5, l.h / 2 - sw / 2), 0, 0, Math.PI * 2)
  else if (l.shape === 'polygon') { polygonPoints(l, sw / 2).forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath() }
  else if (l.shape === 'line') { c.moveTo(0, l.h / 2); c.lineTo(l.w, l.h / 2) }
  else c.roundRect(sw / 2, sw / 2, Math.max(1, l.w - sw), Math.max(1, l.h - sw), Math.min(l.radius, l.w / 2, l.h / 2))
}

/**
 * Fill subpaths as white, combining each with the ones before it: combine (union), subtract,
 * intersect or exclude. Subpaths with no operation join the one before in an even-odd fill, so
 * a letter O drawn as two rings still gets its hole.
 */
export function paintPathOps(c: CanvasRenderingContext2D, subs: SubPath[]) {
  const W = c.canvas.width, H = c.canvas.height
  const m = c.getTransform()
  // Group runs: a subpath with an op starts a new run; ones without join the current run.
  const runs: { op: NonNullable<SubPath['op']>; subs: SubPath[] }[] = []
  for (const sp of subs) {
    if (!runs.length || sp.op) runs.push({ op: sp.op ?? 'add', subs: [sp] })
    else runs[runs.length - 1].subs.push(sp)
  }
  runs.forEach((r, i) => {
    const t = makeCanvas(W, H), tx = ctx2d(t)
    tx.setTransform(m); tx.fillStyle = '#fff'; tx.beginPath(); tracePath(tx, r.subs); tx.fill('evenodd')
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0)
    c.globalCompositeOperation = i === 0 ? 'source-over' : r.op === 'sub' ? 'destination-out' : r.op === 'intersect' ? 'destination-in' : r.op === 'xor' ? 'xor' : 'source-over'
    c.drawImage(t, 0, 0)
    c.restore()
  })
}

// ─── Adjustments ───────────────────────────────────────────────────

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v)

function lutApply(d: Uint8ClampedArray, lut: Uint8ClampedArray) {
  for (let i = 0; i < d.length; i += 4) { d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]] }
}

export function boxBlur(img: ImageData, radius: number) {
  const r = Math.max(1, Math.round(radius))
  const { width: w, height: h, data } = img
  const tmp = new Uint8ClampedArray(data.length)
  const pass = (src: Uint8ClampedArray, dst: Uint8ClampedArray, horizontal: boolean) => {
    const outer = horizontal ? h : w, inner = horizontal ? w : h
    for (let o = 0; o < outer; o++) {
      const acc = [0, 0, 0, 0]
      const idx = (k: number) => (horizontal ? (o * w + k) : (k * w + o)) * 4
      for (let k = -r; k <= r; k++) { const i = idx(Math.min(inner - 1, Math.max(0, k))); for (let c = 0; c < 4; c++) acc[c] += src[i + c] }
      const n = r * 2 + 1
      for (let k = 0; k < inner; k++) {
        const i = idx(k)
        for (let c = 0; c < 4; c++) dst[i + c] = acc[c] / n
        const add = idx(Math.min(inner - 1, k + r + 1)), sub = idx(Math.max(0, k - r))
        for (let c = 0; c < 4; c++) acc[c] += src[add + c] - src[sub + c]
      }
    }
  }
  for (let n = 0; n < 3; n++) { pass(data, tmp, true); pass(tmp, data, false) }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}
function hue2rgb(p: number, q: number, t: number) {
  if (t < 0) t += 1; if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

export const ADJUSTMENT_DEFAULTS: Record<string, Record<string, number>> = EFFECT_DEFAULTS

export const HUE_BANDS: { id: HueBand; label: string; center: number; swatch: string }[] = [
  { id: 'reds', label: 'Reds', center: 0, swatch: '#ff3b3b' }, { id: 'yellows', label: 'Yellows', center: 60, swatch: '#ffd23b' },
  { id: 'greens', label: 'Greens', center: 120, swatch: '#3bd16b' }, { id: 'cyans', label: 'Cyans', center: 180, swatch: '#3bd8ff' },
  { id: 'blues', label: 'Blues', center: 240, swatch: '#3b6bff' }, { id: 'magentas', label: 'Magentas', center: 300, swatch: '#ff3bd8' },
]

/** Weight of a hue (0..360) for a band: full within 15 degrees, feathered to zero at 45. */
export function bandWeight(hueDeg: number, center: number) {
  let d = Math.abs(hueDeg - center) % 360; if (d > 180) d = 360 - d
  return d <= 15 ? 1 : d >= 45 ? 0 : 1 - (d - 15) / 30
}

const hexRgb = (h: string) => { const n = parseInt(h.replace('#', '').padEnd(6, '0').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }

function levelsLut(black: number, white: number, gamma100: number) {
  const lo = black, hi = Math.max(lo + 1, white), g = 100 / Math.max(10, gamma100)
  const lut = new Uint8ClampedArray(256)
  for (let i = 0; i < 256; i++) lut[i] = clamp255(Math.pow(Math.min(1, Math.max(0, (i - lo) / (hi - lo))), g) * 255)
  return lut
}
function channelLuts(d: Uint8ClampedArray, luts: (Uint8ClampedArray | null)[]) {
  const [r, g, b] = luts
  for (let i = 0; i < d.length; i += 4) { if (r) d[i] = r[d[i]]; if (g) d[i + 1] = g[d[i + 1]]; if (b) d[i + 2] = b[d[i + 2]] }
}

function hslToRgb(h: number, s: number, l: number, out: Uint8ClampedArray, i: number) {
  if (s === 0) { out[i] = out[i + 1] = out[i + 2] = l * 255; return }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  out[i] = hue2rgb(p, q, h + 1 / 3) * 255; out[i + 1] = hue2rgb(p, q, h) * 255; out[i + 2] = hue2rgb(p, q, h - 1 / 3) * 255
}

/** Parse an Adobe/Resolve .cube 3D LUT. */
export function parseCube(text: string, name: string): { size: number; data: number[]; name: string } | null {
  let size = 0; const data: number[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (/^LUT_3D_SIZE/i.test(line)) { size = parseInt(line.split(/\s+/)[1], 10); continue }
    if (/^[A-Z_]/i.test(line)) continue
    const v = line.split(/\s+/).map(Number)
    if (v.length >= 3 && v.every(Number.isFinite)) data.push(v[0], v[1], v[2])
  }
  if (!size || data.length < size * size * size * 3) return null
  return { size, data: data.slice(0, size * size * size * 3), name }
}

/** Smooth tone curve through the control points (monotone cubic, so it never overshoots). */
export function curveLut(points: [number, number][]): Uint8ClampedArray {
  const pts = [...points].sort((a, b) => a[0] - b[0])
  const n = pts.length, lut = new Uint8ClampedArray(256)
  if (n < 2) { for (let i = 0; i < 256; i++) lut[i] = i; return lut }
  const dx: number[] = [], m: number[] = [], t: number[] = new Array(n).fill(0)
  for (let i = 0; i < n - 1; i++) { dx[i] = Math.max(1e-6, pts[i + 1][0] - pts[i][0]); m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i] }
  t[0] = m[0]; t[n - 1] = m[n - 2]
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i] }
  }
  let seg = 0
  for (let x = 0; x < 256; x++) {
    if (x <= pts[0][0]) { lut[x] = pts[0][1]; continue }
    if (x >= pts[n - 1][0]) { lut[x] = pts[n - 1][1]; continue }
    while (seg < n - 2 && x > pts[seg + 1][0]) seg++
    const h = dx[seg], u = (x - pts[seg][0]) / h, u2 = u * u, u3 = u2 * u
    lut[x] = clamp255((2 * u3 - 3 * u2 + 1) * pts[seg][1] + (u3 - 2 * u2 + u) * h * t[seg] + (-2 * u3 + 3 * u2) * pts[seg + 1][1] + (u3 - u2) * h * t[seg + 1])
  }
  return lut
}

function applyBuiltIn(img: ImageData, l: AdjustmentSettings, scale: number) {
  const d = img.data, v = l.values
  switch (l.kind) {
    case 'brightnessContrast': {
      const b = (v.brightness / 100) * 255 * 0.6
      const c = v.contrast / 100
      const f = c >= 0 ? 1 + c * 1.5 : 1 + c
      const lut = new Uint8ClampedArray(256)
      for (let i = 0; i < 256; i++) lut[i] = clamp255((i - 128) * f + 128 + b)
      lutApply(d, lut); break
    }
    case 'levels': {
      lutApply(d, levelsLut(v.black, v.white, v.gamma))
      const cl = l.channelLevels
      if (cl) channelLuts(d, (['r', 'g', 'b'] as const).map(c => cl[c] ? levelsLut(cl[c]![0], cl[c]![1], cl[c]![2]) : null))
      break
    }
    case 'invert': for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2] } break
    case 'blackWhite': {
      const a = v.amount / 100
      for (let i = 0; i < d.length; i += 4) {
        const y = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
        d[i] += (y - d[i]) * a; d[i + 1] += (y - d[i + 1]) * a; d[i + 2] += (y - d[i + 2]) * a
      }
      break
    }
    case 'temperature': {
      const t = v.temperature * 0.6, tint = v.tint * 0.4
      for (let i = 0; i < d.length; i += 4) { d[i] = clamp255(d[i] + t); d[i + 1] = clamp255(d[i + 1] - tint); d[i + 2] = clamp255(d[i + 2] - t) }
      break
    }
    case 'hueSaturation': {
      const dh = v.hue / 360, ds = v.saturation / 100, dl = v.lightness / 100
      if (dh || ds || dl) for (let i = 0; i < d.length; i += 4) {
        let [h, s, li] = rgbToHsl(d[i], d[i + 1], d[i + 2])
        h = (h + dh + 1) % 1
        s = Math.min(1, Math.max(0, ds >= 0 ? s + (1 - s) * ds * (s > 0.02 ? 1 : 0) : s * (1 + ds)))
        li = Math.min(1, Math.max(0, dl >= 0 ? li + (1 - li) * dl : li * (1 + dl)))
        hslToRgb(h, s, li, d, i)
      }
      // Targeted colour bands: each shifts only the hues near its centre, feathered at the edges.
      const bands = l.bands ? HUE_BANDS.filter(b => { const x = l.bands![b.id]; return x && (x.hue || x.saturation || x.lightness) }) : []
      if (bands.length) {
        for (let i = 0; i < d.length; i += 4) {
          let [h, s, li] = rgbToHsl(d[i], d[i + 1], d[i + 2])
          if (s < 0.02) continue
          let changed = false
          for (const b of bands) {
            const w = bandWeight(h * 360, b.center); if (!w) continue
            const x = l.bands![b.id]!
            h = (h + (x.hue / 360) * w + 1) % 1
            const bs = (x.saturation / 100) * w, bl = (x.lightness / 100) * w
            s = Math.min(1, Math.max(0, bs >= 0 ? s + (1 - s) * bs : s * (1 + bs)))
            li = Math.min(1, Math.max(0, bl >= 0 ? li + (1 - li) * bl : li * (1 + bl)))
            changed = true
          }
          if (changed) hslToRgb(h, s, li, d, i)
        }
      }
      break
    }
    case 'curves': {
      lutApply(d, curveLut(l.points ?? [[0, 0], [255, 255]]))
      const cp = l.channelPoints
      if (cp) channelLuts(d, (['r', 'g', 'b'] as const).map(c => cp[c] && cp[c]!.length >= 2 ? curveLut(cp[c]!) : null))
      break
    }
    case 'vibrance': {
      const vib = v.vibrance / 100, sat = v.saturation / 100
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2]
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), cs = (mx - mn) / 255
        const y = r * 0.299 + g * 0.587 + b * 0.114
        const f = 1 + sat + vib * (1 - cs) * (vib > 0 ? 1 : cs + 0.3)
        d[i] = clamp255(y + (r - y) * f); d[i + 1] = clamp255(y + (g - y) * f); d[i + 2] = clamp255(y + (b - y) * f)
      }
      break
    }
    case 'exposure': {
      const k = Math.pow(2, v.exposure / 100), off = v.offset / 100, g = 100 / Math.max(10, v.gamma)
      const lut = new Uint8ClampedArray(256)
      for (let i = 0; i < 256; i++) lut[i] = clamp255(Math.pow(Math.max(0, (i / 255) * k + off), g) * 255)
      lutApply(d, lut); break
    }
    case 'colorBalance': {
      const f = 0.6
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2]
        const L = (Math.max(r, g, b) + Math.min(r, g, b)) / 510
        const wS = Math.max(0, 1 - L * 2) ** 1.2, wH = Math.max(0, L * 2 - 1) ** 1.2, wM = 1 - Math.abs(L * 2 - 1)
        let nr = r + (wS * v.sCR + wM * v.mCR + wH * v.hCR) * f
        let ng = g + (wS * v.sMG + wM * v.mMG + wH * v.hMG) * f
        let nb = b + (wS * v.sYB + wM * v.mYB + wH * v.hYB) * f
        if (v.preserve) {
          const y0 = r * 0.299 + g * 0.587 + b * 0.114, y1 = nr * 0.299 + ng * 0.587 + nb * 0.114, dy = y0 - y1
          nr += dy; ng += dy; nb += dy
        }
        d[i] = clamp255(nr); d[i + 1] = clamp255(ng); d[i + 2] = clamp255(nb)
      }
      break
    }
    case 'channelMixer': {
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2]
        const nr = (r * v.rr + g * v.rg + b * v.rb) / 100
        if (v.mono) { d[i] = d[i + 1] = d[i + 2] = clamp255(nr); continue }
        d[i] = clamp255(nr); d[i + 1] = clamp255((r * v.gr + g * v.gg + b * v.gb) / 100); d[i + 2] = clamp255((r * v.br + g * v.bg + b * v.bb) / 100)
      }
      break
    }
    case 'photoFilter': {
      const [fr, fg, fb] = hexRgb(l.colors?.[0] ?? '#ec8a00'), k = v.density / 100
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2]
        let nr = r + (r * fr / 255 - r) * k, ng = g + (g * fg / 255 - g) * k, nb = b + (b * fb / 255 - b) * k
        if (v.preserve) {
          const y0 = r * 0.299 + g * 0.587 + b * 0.114, y1 = nr * 0.299 + ng * 0.587 + nb * 0.114, q = y1 > 0.5 ? y0 / y1 : 1
          nr *= q; ng *= q; nb *= q
        }
        d[i] = clamp255(nr); d[i + 1] = clamp255(ng); d[i + 2] = clamp255(nb)
      }
      break
    }
    case 'gradientMap': {
      const cols = (l.colors?.length ? l.colors : ['#000000', '#ffffff']).map(hexRgb)
      if (v.reverse) cols.reverse()
      const map = new Uint8ClampedArray(256 * 3)
      for (let t = 0; t < 256; t++) {
        const p = (t / 255) * (cols.length - 1), a = Math.floor(p), bI = Math.min(cols.length - 1, a + 1), f = p - a
        for (let c = 0; c < 3; c++) map[t * 3 + c] = cols[a][c] + (cols[bI][c] - cols[a][c]) * f
      }
      for (let i = 0; i < d.length; i += 4) {
        const y = Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114)
        d[i] = map[y * 3]; d[i + 1] = map[y * 3 + 1]; d[i + 2] = map[y * 3 + 2]
      }
      break
    }
    case 'posterize': {
      const n = Math.max(2, Math.round(v.levels)), lut = new Uint8ClampedArray(256)
      for (let i = 0; i < 256; i++) lut[i] = Math.round(Math.round((i / 255) * (n - 1)) / (n - 1) * 255)
      lutApply(d, lut); break
    }
    case 'threshold': {
      for (let i = 0; i < d.length; i += 4) { const y = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114; d[i] = d[i + 1] = d[i + 2] = y >= v.level ? 255 : 0 }
      break
    }
    case 'colorMatch': {
      if (l.look) transferStats(d, l.look, v.amount / 100)
      break
    }
    case 'lut': {
      const L = l.lut; if (!L) break
      const N = L.size, D = L.data, amt = v.amount / 100
      const at = (r: number, g: number, b: number, c: number) => D[((b * N + g) * N + r) * 3 + c]
      for (let i = 0; i < d.length; i += 4) {
        const fr = (d[i] / 255) * (N - 1), fg = (d[i + 1] / 255) * (N - 1), fb = (d[i + 2] / 255) * (N - 1)
        const r0 = Math.floor(fr), g0 = Math.floor(fg), b0 = Math.floor(fb)
        const r1 = Math.min(N - 1, r0 + 1), g1 = Math.min(N - 1, g0 + 1), b1 = Math.min(N - 1, b0 + 1)
        const tr = fr - r0, tg = fg - g0, tb = fb - b0
        for (let c = 0; c < 3; c++) {
          const c00 = at(r0, g0, b0, c) * (1 - tr) + at(r1, g0, b0, c) * tr
          const c10 = at(r0, g1, b0, c) * (1 - tr) + at(r1, g1, b0, c) * tr
          const c01 = at(r0, g0, b1, c) * (1 - tr) + at(r1, g0, b1, c) * tr
          const c11 = at(r0, g1, b1, c) * (1 - tr) + at(r1, g1, b1, c) * tr
          const val = ((c00 * (1 - tg) + c10 * tg) * (1 - tb) + (c01 * (1 - tg) + c11 * tg) * tb) * 255
          d[i + c] = clamp255(d[i + c] + (val - d[i + c]) * amt)
        }
      }
      break
    }
    case 'blur': {
      const radius = Math.max(0, v.radius * scale * 0.6), strength = Math.max(0, Math.min(1, (v.strength ?? 100) / 100))
      if (!radius || !strength) break
      const original = strength < 1 ? new Uint8ClampedArray(img.data) : null
      if (v.mode === 1 || v.mode === 2) directionalBlur(img, radius, v.angle ?? 0, v.mode === 1 ? 'motion' : 'radial', v.centerX ?? 50, v.centerY ?? 50)
      else blurPremultiplied(img, radius)
      if (original) for (let i = 0; i < img.data.length; i += 4) {
        const aa = original[i + 3] / 255 * (1 - strength), ba = img.data[i + 3] / 255 * strength, alpha = aa + ba
        for (let c = 0; c < 3; c++) img.data[i + c] = alpha ? (original[i + c] * aa + img.data[i + c] * ba) / alpha : 0
        img.data[i + 3] = alpha * 255
      }
      break
    }
  }
}

/** Blur that treats transparency properly: colour is weighted by alpha, so edges fade instead of turning dark. */
export function blurPremultiplied(img: ImageData, radius: number) {
  const d = img.data
  let opaque = true
  for (let i = 3; i < d.length; i += 4) if (d[i] !== 255) { opaque = false; break }
  if (opaque) { boxBlur(img, radius); return }
  for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255; d[i] *= a; d[i + 1] *= a; d[i + 2] *= a }
  boxBlur(img, radius)
  for (let i = 0; i < d.length; i += 4) { const a = d[i + 3]; if (a) { const k = 255 / a; d[i] = d[i] * k; d[i + 1] = d[i + 1] * k; d[i + 2] = d[i + 2] * k } }
}

/** Void effects preview at this working size so the Editor and the Effects tool match. Exports (fullRes) run at the output size with pixel settings scaled up, so they look the same, only sharper. */
const FX_MAX = FX_WORK

const adjCacheById = new Map<string, { key: string; canvas: HTMLCanvasElement }>()
/** Layers with effects, after their effects; and groups drawn as one image, before their opacity. */
const fxCache = new Map<string, { key: string; canvas: HTMLCanvasElement }>()
const groupCache = new Map<string, { key: string; canvas: HTMLCanvasElement }>()
/** Keep drawn layers and groups only while they are this small (pixels), so memory stays in check. */
const CACHE_PX = 12e6

/**
 * Run one adjustment or Void effect over a canvas and return the result (same size). `refLong` is the long side,
 * in document pixels, of what the effect is for (the design, a board, a layer): Void effects preview at a working
 * size of at most FX_MAX over it, and exports (fullRes) run at the output size with their pixel settings scaled
 * to match, so the two look the same. Void effects keep the transparency they were given, so dots, grain and
 * paper stay inside a cut-out.
 */
export function processSettings(src: HTMLCanvasElement, l: AdjustmentSettings, scale: number, fullRes = false, refLong = 0): HTMLCanvasElement {
  const out = makeCanvas(src.width, src.height)
  const octx = ctx2d(out, true)
  if (l.kind === 'voidEffect' && l.effect && l.effectParams) {
    const long = refLong || Math.max(src.width, src.height) / scale
    if (fullRes) {
      const ref = Math.min(FX_MAX, long)
      const k = (scale * long) / ref
      octx.drawImage(src, 0, 0)
      const img = octx.getImageData(0, 0, out.width, out.height)
      octx.putImageData(keepAlpha(img, applyEffect(octx, img, l.effect, scaleParams(l.effect, l.effectParams, k))), 0, 0)
      return out
    }
    // Previews run at the reference size (the thing's long side, at most FX_MAX), as an export of it at 1x does,
    // whatever size it is drawn at: drawn larger, the result is scaled up; drawn smaller (zoomed out, or many
    // boards), the picture is worked up to that size first. Dots, grain and edges then look as they will export.
    // A draft (a thumbnail) runs at the drawn size with its pixel settings scaled down instead: close, and quick.
    const ref = Math.min(FX_MAX, long), drawn = Math.max(1e-6, long * scale)
    const k = fxDraft ? Math.min(1, ref / drawn) : ref / drawn, pk = fxDraft ? Math.min(drawn, ref) / ref : 1
    const work = makeCanvas(Math.max(1, Math.round(src.width * k)), Math.max(1, Math.round(src.height * k)))
    const wctx = ctx2d(work, true)
    wctx.imageSmoothingQuality = 'high'
    wctx.drawImage(src, 0, 0, work.width, work.height)
    const img = wctx.getImageData(0, 0, work.width, work.height)
    wctx.putImageData(keepAlpha(img, applyEffect(wctx, img, l.effect, pk < 0.999 ? scaleParams(l.effect, l.effectParams, pk) : l.effectParams)), 0, 0)
    octx.imageSmoothingQuality = 'high'
    octx.drawImage(work, 0, 0, out.width, out.height)
  } else {
    octx.drawImage(src, 0, 0)
    const img = octx.getImageData(0, 0, out.width, out.height)
    applyBuiltIn(img, l, scale)
    octx.putImageData(img, 0, 0)
  }
  return out
}

/** The effect's colours with the source's transparency. */
function keepAlpha(src: ImageData, out: ImageData): ImageData {
  const a = src.data, b = out.data
  let opaque = true
  for (let i = 3; i < a.length; i += 4) if (a[i] !== 255) { opaque = false; break }
  if (opaque) return out
  for (let i = 3; i < a.length; i += 4) b[i] = a[i]
  return out
}

/** An adjustment layer over what is below it. With a rectangle (its board, in target pixels), only that part is processed. */
function processAdjustment(acc: HTMLCanvasElement, l: AdjustmentLayer, scale: number, fullRes: boolean, refLong: number, rect: { x: number; y: number; w: number; h: number } | null): HTMLCanvasElement {
  if (!rect) return processSettings(acc, l, scale, fullRes, refLong)
  const x = Math.max(0, Math.floor(rect.x)), y = Math.max(0, Math.floor(rect.y))
  const w = Math.min(acc.width, Math.ceil(rect.x + rect.w)) - x, h = Math.min(acc.height, Math.ceil(rect.y + rect.h)) - y
  const out = makeCanvas(acc.width, acc.height)
  if (w <= 0 || h <= 0) return out
  const part = makeCanvas(w, h); ctx2d(part).drawImage(acc, x, y, w, h, 0, 0, w, h)
  ctx2d(out).drawImage(processSettings(part, l, scale, fullRes, refLong), x, y)
  return out
}

/**
 * Run an effect stack over one part of a canvas, in place. Each effect mixes with what it changed by its own
 * strength and blend. `rect` is in canvas pixels; `refLong` is the long side of the target in document pixels.
 */
export function applyFxStack(c: HTMLCanvasElement, rect: { x: number; y: number; w: number; h: number }, list: Effect[] | null | undefined, o: { scale: number; fullRes: boolean; refLong: number; drawMask?: (ctx: CanvasRenderingContext2D, mask: HTMLCanvasElement, at?: MaskAt | null) => void; maskBase?: MaskAt }) {
  const on = liveFx(list); if (!on.length) return
  const x = Math.max(0, Math.floor(rect.x)), y = Math.max(0, Math.floor(rect.y))
  const w = Math.min(c.width, Math.ceil(rect.x + rect.w)) - x, h = Math.min(c.height, Math.ceil(rect.y + rect.h)) - y
  if (w <= 0 || h <= 0) return
  let work = makeCanvas(w, h); ctx2d(work).drawImage(c, x, y, w, h, 0, 0, w, h)
  for (const e of on) {
    const before = work
    const proc = processSettings(before, e, o.scale, o.fullRes, o.refLong)
    const m = maskOf(e) && o.drawMask ? maskOf(e)! : null
    const mAt = { x: (o.maskBase?.x ?? 0) + (e.maskAt?.x ?? 0), y: (o.maskBase?.y ?? 0) + (e.maskAt?.y ?? 0) }
    if (e.opacity >= 0.999 && e.blend === 'source-over') { work = m ? masked(before, proc, m, mAt) : proc; continue }
    const mix = makeCanvas(w, h), mx = ctx2d(mix)
    if (e.blend === 'source-over') {
      // before × (1 − strength) + effect × strength, which also holds where the pixels are see-through.
      mx.globalAlpha = 1 - e.opacity; mx.drawImage(before, 0, 0)
      mx.globalAlpha = e.opacity; mx.globalCompositeOperation = 'lighter'; mx.drawImage(proc, 0, 0)
    } else {
      mx.drawImage(before, 0, 0)
      mx.globalAlpha = e.opacity; mx.globalCompositeOperation = e.blend; mx.drawImage(proc, 0, 0)
      // A blend never adds pixels where there were none.
      mx.globalAlpha = 1; mx.globalCompositeOperation = 'destination-in'; mx.drawImage(before, 0, 0)
    }
    work = m ? masked(before, mix, m, mAt) : mix
  }
  /** The effect only where its mask is: before × (1 − mask) + after × mask. */
  function masked(before: HTMLCanvasElement, after: HTMLCanvasElement, mask: HTMLCanvasElement, at: MaskAt): HTMLCanvasElement {
    const mc = makeCanvas(w, h), mcx = ctx2d(mc)
    mcx.translate(-x, -y); o.drawMask!(mcx, mask, at)
    const outc = makeCanvas(w, h), ox2 = ctx2d(outc)
    ox2.drawImage(before, 0, 0); ox2.globalCompositeOperation = 'destination-out'; ox2.drawImage(mc, 0, 0)
    const put = makeCanvas(w, h), px2 = ctx2d(put)
    px2.drawImage(after, 0, 0); px2.globalCompositeOperation = 'destination-in'; px2.drawImage(mc, 0, 0)
    ox2.globalCompositeOperation = 'lighter'; ox2.drawImage(put, 0, 0)
    return outc
  }
  const cx = ctx2d(c)
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'
  cx.clearRect(x, y, w, h); cx.drawImage(work, x, y)
  cx.restore()
}

/** A number for each canvas, so caches can tell a replaced mask from the same one. */
const canvasIds = new WeakMap<HTMLCanvasElement, number>()
let canvasSeq = 0
export const canvasId = (c: HTMLCanvasElement | null | undefined) => { if (!c) return 0; let n = canvasIds.get(c); if (!n) { n = ++canvasSeq; canvasIds.set(c, n) } return n }

// ─── Compositor ────────────────────────────────────────────────────

export interface LiveStroke {
  layerId: string
  buffer: HTMLCanvasElement
  opacity: number
  mode: 'paint' | 'erase' | 'mask-hide' | 'mask-reveal' | 'overlay'
  /** Foreground luminance: black hides, white reveals, grey sets partial visibility. */
  maskValue?: number
}

export interface RenderOptions {
  scale?: number
  live?: LiveStroke | null
  /** Skip the adjustment cache, e.g. for export at a different scale. */
  noCache?: boolean
  /** Export: run Void effect layers at the output size instead of the preview working size. */
  fullRes?: boolean
  /** With fullRes: the long side of the document the Editor previewed filters over, when one board is rendered as a document of its own. */
  fxLong?: number
  transparent?: boolean
  groups?: Group[]
  /** Override which frames to draw; omit to use doc.frames, pass [] to force flat. */
  frameRects?: Frame[]
  /** Board backgrounds without their drop shadow. The Stage draws its own shadows on the pasteboard. */
  noShadow?: boolean
  /** Treat this group as the root: used when a group is flattened on its own. */
  root?: string | null
  /**
   * Render only this part of the document, in document pixels. The target is sized to the region
   * at the given scale. Used to export one board at its own size and to draw the visible part of
   * the Stage at screen resolution.
   */
  region?: { x: number; y: number; w: number; h: number } | null
  /** Leave every effect stack out (before and after, with all effects switched off). */
  noFx?: boolean
  /** Set on the renders made inside a render (a group drawn as one image): board and design effects run once, at the top. */
  inner?: boolean
  /** Small pictures (thumbnails, choice previews): Void effects run at the drawn size, close to the look but quicker. */
  fxDraft?: boolean
}

/** On while a draft render runs (see RenderOptions.fxDraft). */
let fxDraft = false

export function renderDoc(target: HTMLCanvasElement, doc: Doc, layers: Layer[], opts: RenderOptions = {}) {
  const wasDraft = fxDraft
  fxDraft = wasDraft || !!opts.fxDraft
  // A draft never reads or fills the caches the canvas uses.
  try { renderDocInner(target, doc, layers, fxDraft && !opts.noCache ? { ...opts, noCache: true } : opts) } finally { fxDraft = wasDraft }
}

function renderDocInner(target: HTMLCanvasElement, doc: Doc, layers: Layer[], opts: RenderOptions) {
  const s = opts.scale ?? 1
  const rg = opts.region ?? null
  const ox = rg ? rg.x : 0, oy = rg ? rg.y : 0
  const W = Math.max(1, Math.round((rg ? rg.w : doc.width) * s)), H = Math.max(1, Math.round((rg ? rg.h : doc.height) * s))
  /** Document space to target pixels. */
  const base = () => new DOMMatrix().translate(-ox * s, -oy * s).scale(s, s)
  const R = (x: number, y: number, w: number, h: number): [number, number, number, number] => [(x - ox) * s, (y - oy) * s, w * s, h * s]
  /** Draw a document mask into the target: one mask pixel to one document pixel, its top left at `at`. A mask
   *  made before the design grew keeps its place instead of being stretched, and one that moved with its board
   *  is drawn where the board is now. */
  const drawDocSized = (ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, at?: MaskAt | null) => {
    ctx.drawImage(c, ((at?.x ?? 0) - ox) * s, ((at?.y ?? 0) - oy) * s, c.width * s, c.height * s)
  }
  if (target.width !== W || target.height !== H) { target.width = W; target.height = H }
  const acc = ctx2d(target, true)
  acc.setTransform(1, 0, 0, 1, 0, 0)
  acc.globalAlpha = 1
  acc.globalCompositeOperation = 'source-over'
  acc.clearRect(0, 0, W, H)
  const frames = opts.frameRects === undefined ? doc.frames : opts.frameRects
  if (frames && frames.length) {
    // Artboard mode: each frame is an opaque board floating above the canvas with a soft shadow.
    for (const f of frames) {
      if (opts.transparent) continue
      if (opts.noShadow) { if (f.background) { acc.fillStyle = f.background; acc.fillRect(...R(f.x, f.y, f.width, f.height)) } continue }
      acc.save()
      acc.shadowColor = 'rgba(0,0,0,0.45)'; acc.shadowBlur = 24 * s; acc.shadowOffsetY = 4 * s
      acc.fillStyle = f.background ?? '#ffffff'
      acc.fillRect(...R(f.x, f.y, f.width, f.height))
      acc.restore()
      if (!f.background) { // transparent board: clear the fill we used only to cast the shadow, leave checker to the UI
        acc.clearRect(...R(f.x, f.y, f.width, f.height))
        acc.save(); acc.shadowColor = 'rgba(0,0,0,0.45)'; acc.shadowBlur = 24 * s; acc.shadowOffsetY = 4 * s
        acc.strokeStyle = 'rgba(0,0,0,0.001)'; acc.lineWidth = 1; acc.strokeRect(...R(f.x, f.y, f.width, f.height)); acc.restore()
      }
    }
  } else if (doc.background && !opts.transparent) { acc.fillStyle = doc.background; acc.fillRect(0, 0, W, H) }
  const frameById = new Map((frames ?? []).map(f => [f.id, f]))

  let belowKey = `${W}x${H}@${s}:${ox},${oy}|${opts.fullRes ? 'full' : ''}|${opts.transparent ? '' : doc.background}|${opts.root ?? ''}`
  const noFx = !!opts.noFx
  // Boards clip the layers on them, so a group drawn on its own depends on where they are.
  const boardsKey = (frames ?? []).map(f => `${f.x},${f.y},${f.width},${f.height}`).join(';')
  /** Doc-space rectangle to target pixels, grown by `pad` document pixels and kept inside the target. */
  const targetRect = (b: Rect, pad = 0) => ({ x: (b.x - pad - ox) * s, y: (b.y - pad - oy) * s, w: (b.w + pad * 2) * s, h: (b.h + pad * 2) * s })
  const boundsOf = (list: Layer[]): Rect | null => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const l of list) {
      if (l.type === 'adjustment') { const f = l.frameId ? frameById.get(l.frameId) : null; const b = f ? { x: f.x, y: f.y, w: f.width, h: f.height } : { x: 0, y: 0, w: doc.width, h: doc.height }; x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); continue }
      const b = layerBounds(l, doc); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h)
    }
    return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null
  }
  /** What a run of layers inside a group looks like, for caches: every layer's rev and every group's settings. */
  const runKey = (run: Layer[]) => {
    const seen = new Set<string>(); let k = ''
    for (const x of run) {
      k += `${x.id}:${x.rev},`
      let gid = x.groupId ?? null, n = 0
      while (gid && !seen.has(gid) && n++ < 64) { seen.add(gid); const g = gmap.get(gid); if (!g) break; k += `[${g.id}:${g.visible}:${g.opacity}:${g.blend}:${g.fxExclude ? 1 : 0}:${fxKey(g.effects)}:${g.styles ? JSON.stringify(g.styles) : ''}:${canvasId(g.mask)}:${g.maskAt ? g.maskAt.x + ',' + g.maskAt.y : ''}:${g.maskEnabled}]`; gid = g.parentId ?? null }
    }
    return k
  }
  let liveBelow = false
  const gmap = new Map((opts.groups ?? []).map(g => [g.id, g]))

  /** The group directly inside `container` that holds this layer, or undefined when the layer sits in `container` itself. */
  const childGroup = (l: Layer, container: string | null): Group | undefined => {
    let gid = l.groupId ?? null, prev: Group | undefined, guard = 0
    while (gid && gid !== container && guard++ < 64) {
      const g = gmap.get(gid); if (!g) return prev
      prev = g; gid = g.parentId ?? null
    }
    return gid === container ? prev : undefined
  }

  const drawList = (list: Layer[], container: string | null) => {
    for (let li = 0; li < list.length; li++) {
      const l = list[li]
      const grp = childGroup(l, container)
      if (grp) {
        let end = li
        while (end + 1 < list.length && childGroup(list[end + 1], container)?.id === grp.id) end++
        const run = list.slice(li, end + 1)
        li = end
        if (!grp.visible) { belowKey += `|g${grp.id}:off`; continue }
        const gFx = !noFx && hasFx(grp.effects)
        const gStyled = !noFx && !!grp.styles && hasActiveStyles({ styles: grp.styles } as Layer)
        const gMask = !!grp.mask && grp.maskEnabled !== false
        // An adjustment set to reach only its own group needs the group drawn on its own.
        const gReach = run.some(x => x.type === 'adjustment' && x.visible && x.reach === 'group' && x.groupId === grp.id)
        const isolated = grp.opacity < 1 || (!!grp.blend && grp.blend !== 'pass') || gFx || gStyled || gMask || gReach
        if (isolated) {
          // The group is drawn as one image first, then placed once, so its layers do not show through each other.
          const hasLive = !!opts.live && run.some(x => x.id === opts.live!.layerId)
          if (hasLive) liveBelow = true
          const key = `${belowKey.slice(0, belowKey.indexOf('|'))}|${opts.fullRes ? 'full' : ''}|${boardsKey}|${gFx ? fxKey(grp.effects) : ''}|${gStyled ? JSON.stringify(grp.styles) : ''}|${gMask ? canvasId(grp.mask) + '@' + (grp.maskAt ? grp.maskAt.x + ',' + grp.maskAt.y : '') : ''}|${runKey(run)}`
          const cached = opts.noCache || hasLive ? undefined : groupCache.get(grp.id)
          let tmp: HTMLCanvasElement
          if (cached && cached.key === key) tmp = cached.canvas
          else {
            tmp = makeCanvas(W, H)
            const inner: RenderOptions = { ...opts, scale: s, noCache: true, transparent: true, root: grp.id, frameRects: frames ?? [], inner: true }
            if (!gFx && !gStyled) renderDoc(tmp, doc, run, inner)
            else {
              // Effects run on what the group makes. A child left out draws clean in its place, and the children on
              // either side of it are processed on their own, so an effect never reaches across it.
              const t = ctx2d(tmp)
              const b = boundsOf(run)
              const refLong = b ? Math.max(b.w, b.h) : Math.max(doc.width, doc.height)
              const pad = fxReach(grp.effects)
              for (const u of groupUnits(run, grp.id, opts.groups ?? [])) {
                const seg = makeCanvas(W, H)
                renderDoc(seg, doc, u.layers, inner)
                if (!u.excluded) {
                  if (gFx) { const ub = boundsOf(u.layers); if (ub) applyFxStack(seg, targetRect(ub, pad), grp.effects, { scale: s, fullRes: !!opts.fullRes, refLong, drawMask: drawDocSized }) }
                  if (gStyled) { t.save(); drawStyled(t, seg, { styles: grp.styles, opacity: 1, blend: 'source-over', fillOpacity: 1 } as Layer, s); t.restore(); continue }
                }
                t.drawImage(seg, 0, 0)
              }
            }
            if (gMask) { const t = ctx2d(tmp); t.save(); t.globalCompositeOperation = 'destination-in'; drawDocSized(t, grp.mask!, grp.maskAt); t.restore() }
            if (!opts.noCache && !hasLive && W * H <= CACHE_PX) groupCache.set(grp.id, { key, canvas: tmp })
          }
          acc.save()
          acc.globalAlpha = grp.opacity
          acc.globalCompositeOperation = !grp.blend || grp.blend === 'pass' ? 'source-over' : grp.blend
          acc.drawImage(tmp, 0, 0)
          acc.restore()
          belowKey += `|g${grp.id}:${grp.opacity}:${grp.blend}:` + key.slice(key.indexOf('|'))
        } else drawList(run, grp.id)
        continue
      }
      drawLayer(l, list)
    }
  }

  const drawLayer = (l: Layer, siblings: Layer[]) => {
    if (!l.visible) return
    const live = opts.live && opts.live.layerId === l.id ? opts.live : null
    if (live) liveBelow = true

    if (l.type === 'adjustment') {
      const settingsKey = `${l.kind}|${JSON.stringify(l.values)}|${l.points ? JSON.stringify(l.points) : ''}|${JSON.stringify(l.channelPoints ?? '')}|${JSON.stringify(l.channelLevels ?? '')}|${JSON.stringify(l.bands ?? '')}|${(l.colors ?? []).join(',')}|${l.lut?.name ?? ''}|${l.effect}|${l.effect ? JSON.stringify(l.effectParams) : ''}`
      const key = `${belowKey}#${settingsKey}`
      let processed: HTMLCanvasElement
      // A filter on a board runs over that board only, so the canvas and an export of the board agree.
      const adjBoard = l.frameId ? frameById.get(l.frameId) : undefined
      const cached = opts.noCache ? undefined : adjCacheById.get(l.id)
      if (cached && cached.key === key && !liveBelow) processed = cached.canvas
      else {
        const refLong = adjBoard ? Math.max(adjBoard.width, adjBoard.height) : opts.fxLong || Math.max(doc.width, doc.height)
        processed = processAdjustment(target, l, s, !!opts.fullRes, refLong, adjBoard ? targetRect({ x: adjBoard.x, y: adjBoard.y, w: adjBoard.width, h: adjBoard.height }) : null)
        if (!opts.noCache && !liveBelow) adjCacheById.set(l.id, { key, canvas: processed })
      }
      let draw = processed
      const maskSrc = l.mask && l.maskEnabled ? l.mask : null
      // Clipped to the layer below: only that layer's pixels change.
      const clipBase = l.clipId ? siblings.find(x => x.id === l.clipId) ?? layers.find(x => x.id === l.clipId) : undefined
      const where = maskSrc || (live && live.mode.startsWith('mask')) || (clipBase && clipBase.type !== 'adjustment')
      let amount: HTMLCanvasElement | null = null
      if (where) {
        // How much of the adjustment shows at each pixel: its mask, times the clip base's shape.
        amount = makeCanvas(W, H); const ax = ctx2d(amount)
        if (maskSrc || (live && live.mode.startsWith('mask'))) { const at = maskSrc ? l.maskAt : null; drawDocSized(ax, liveMask(maskSrc ?? fullMask(doc), live, at), at) }
        else { ax.fillStyle = '#fff'; ax.fillRect(0, 0, W, H) }
        if (clipBase && clipBase.type !== 'adjustment') { ax.globalCompositeOperation = 'destination-in'; ax.drawImage(renderLayerAlpha(doc, clipBase, s, rg), 0, 0) }
        draw = cloneCanvas(processed)
        const dctx = ctx2d(draw)
        dctx.globalCompositeOperation = 'destination-in'
        dctx.drawImage(amount, 0, 0)
      }
      acc.save()
      // A filter on a board only changes that board, never the rest of the document.
      if (adjBoard) { acc.beginPath(); acc.rect(...R(adjBoard.x, adjBoard.y, adjBoard.width, adjBoard.height)); acc.clip() }
      if (l.blend === 'source-over') {
        // Normal: the result takes the place of what was there, in proportion. Drawing it over the original instead
        // would make see-through pixels more solid.
        acc.globalAlpha = l.opacity
        acc.globalCompositeOperation = 'destination-out'
        if (amount) acc.drawImage(amount, 0, 0); else { acc.fillStyle = '#000'; acc.fillRect(0, 0, W, H) }
        acc.globalCompositeOperation = 'lighter'
        acc.drawImage(draw, 0, 0)
      } else {
        acc.globalAlpha = l.opacity
        // Other blend modes mix the result with the original.
        acc.globalCompositeOperation = l.blend
        acc.drawImage(draw, 0, 0)
      }
      acc.restore()
    } else {
      const m = layerMatrix(l, doc)
      // Clipping mask: this layer shows only where the base layer is opaque.
      let clipBaseCanvas: HTMLCanvasElement | null = null
      if (l.clipId) {
        const base = siblings.find(x => x.id === l.clipId) ?? layers.find(x => x.id === l.clipId)
        if (base && base.type !== 'adjustment') clipBaseCanvas = renderLayerAlpha(doc, base, s, rg)
      }
      const styled = !noFx && hasActiveStyles(l)
      const fx = !noFx && hasFx(l.effects)
      const fill = l.fillOpacity ?? 1
      const needsTemp = (l.mask && l.maskEnabled) || hasVectorMask(l) || !!live || !!clipBaseCanvas || styled || fx
      acc.save()
      const clipF = l.frameId ? frameById.get(l.frameId) : undefined
      if (clipF) { acc.beginPath(); acc.rect(...R(clipF.x, clipF.y, clipF.width, clipF.height)); acc.clip() }
      acc.globalAlpha = l.opacity * (styled ? 1 : fill)
      acc.globalCompositeOperation = l.blend
      acc.imageSmoothingQuality = 'high'
      acc.setTransform(base().multiply(m))
      if (!needsTemp) drawLayerContent(acc, l, s * Math.abs(l.scaleX))
      else {
        const { w, h } = layerSize(l, doc)
        const tmp = makeCanvas(w, h)
        const t = ctx2d(tmp)
        drawLayerContent(t, l)
        if (live && live.mode === 'paint') { t.globalCompositeOperation = l.lockAlpha ? 'source-atop' : 'source-over'; t.globalAlpha = live.opacity; t.drawImage(live.buffer, 0, 0); t.globalAlpha = 1; t.globalCompositeOperation = 'source-over' }
        if (live && live.mode === 'erase' && !l.lockAlpha) { t.globalCompositeOperation = 'destination-out'; t.globalAlpha = live.opacity; t.drawImage(live.buffer, 0, 0); t.globalAlpha = 1 }
        const maskSrc = l.mask && l.maskEnabled ? l.mask : null
        if (maskSrc || (live && live.mode.startsWith('mask'))) {
          t.globalCompositeOperation = 'destination-in'
          t.drawImage(localLayerMask(l, doc, liveMask(maskSrc ?? fullMaskSized(w, h), live, null, layerMaskMatrix(l,doc).inverse())), 0, 0)
        }
        if (hasVectorMask(l)) { t.globalCompositeOperation = 'destination-in'; t.drawImage(vectorMaskCanvas(l, w, h), 0, 0); t.globalCompositeOperation = 'source-over' }
        if (clipBaseCanvas || styled || fx) {
          // Work in document space: intersect with the clip base, run the layer's effects, then draw with styles.
          acc.restore(); acc.save()
          if (clipF) { acc.beginPath(); acc.rect(...R(clipF.x, clipF.y, clipF.width, clipF.height)); acc.clip() }
          const clipRev = l.clipId ? (layers.find(x => x.id === l.clipId)?.rev ?? 0) : 0
          const fxK = fx ? `${W}x${H}@${s}:${ox},${oy}|${opts.fullRes ? 'full' : ''}|${l.rev}|${clipRev}|${fxKey(l.effects)}` : ''
          const hit = fx && !live && !opts.noCache ? fxCache.get(l.id) : undefined
          let docTmp: HTMLCanvasElement
          if (hit && hit.key === fxK) docTmp = hit.canvas
          else {
            docTmp = makeCanvas(W, H); const dt = ctx2d(docTmp)
            dt.imageSmoothingQuality = 'high'
            dt.setTransform(base().multiply(m))
            dt.drawImage(tmp, 0, 0)
            dt.setTransform(1, 0, 0, 1, 0, 0)
            if (clipBaseCanvas) { dt.globalCompositeOperation = 'destination-in'; dt.drawImage(clipBaseCanvas, 0, 0) }
            if (fx) {
              const b = layerBounds(l, doc)
              applyFxStack(docTmp, targetRect(b, fxReach(l.effects)), l.effects, { scale: s, fullRes: !!opts.fullRes, refLong: Math.max(b.w, b.h), drawMask: drawDocSized, maskBase: { x: l.x, y: l.y } })
              if (!live && !opts.noCache && W * H <= CACHE_PX) fxCache.set(l.id, { key: fxK, canvas: docTmp })
            }
          }
          acc.setTransform(1, 0, 0, 1, 0, 0)
          acc.globalAlpha = l.opacity
          if (styled) drawStyled(acc, docTmp, l, s)
          else { acc.globalAlpha = l.opacity * fill; acc.globalCompositeOperation = l.blend; acc.drawImage(docTmp, 0, 0) }
        } else {
          acc.drawImage(tmp, 0, 0)
        }
      }
      acc.restore()
    }
    belowKey += `|${l.id}:${l.rev}`
  }

  drawList(layers, opts.root ?? null)

  // Board effects run on everything on the board; design effects run last, on each board (or the whole page).
  if (!opts.inner && !noFx) {
    const fullRes = !!opts.fullRes
    for (const f of frames ?? []) if (hasFx(f.effects)) applyFxStack(target, targetRect({ x: f.x, y: f.y, w: f.width, h: f.height }), f.effects, { scale: s, fullRes, refLong: Math.max(f.width, f.height), drawMask: drawDocSized })
    if (hasFx(doc.effects)) {
      if (frames?.length) for (const f of frames) applyFxStack(target, targetRect({ x: f.x, y: f.y, w: f.width, h: f.height }), doc.effects, { scale: s, fullRes, refLong: Math.max(f.width, f.height), drawMask: drawDocSized })
      else applyFxStack(target, targetRect({ x: 0, y: 0, w: doc.width, h: doc.height }), doc.effects, { scale: s, fullRes, refLong: Math.max(doc.width, doc.height), drawMask: drawDocSized })
    }
  }
  // Drop cache entries for layers and groups that no longer exist.
  if (!opts.inner) {
    const ids = new Set(layers.map(l => l.id))
    if (adjCacheById.size > 24) Array.from(adjCacheById.keys()).forEach(k => { if (!ids.has(k)) adjCacheById.delete(k) })
    if (fxCache.size > 24) Array.from(fxCache.keys()).forEach(k => { if (!ids.has(k)) fxCache.delete(k) })
    if (groupCache.size > 24) { const gids = new Set((opts.groups ?? []).map(g => g.id)); Array.from(groupCache.keys()).forEach(k => { if (!gids.has(k)) groupCache.delete(k) }) }
  }
}

/** Render a single layer's pixels onto a full document-size canvas at scale s. Used as a clip base. */
function renderLayerAlpha(doc: Doc, layer: Layer, s: number, rg: RenderOptions['region'] = null): HTMLCanvasElement {
  const W = Math.max(1, Math.round((rg ? rg.w : doc.width) * s)), H = Math.max(1, Math.round((rg ? rg.h : doc.height) * s))
  const c = makeCanvas(W, H); const x = ctx2d(c)
  if (layer.type === 'adjustment') return c // adjustments have no shape to clip to
  const m = layerMatrix(layer, doc)
  x.save(); x.setTransform(new DOMMatrix().translate(-(rg?.x ?? 0) * s, -(rg?.y ?? 0) * s).scale(s, s).multiply(m))
  const { w, h } = layerSize(layer, doc)
  const tmp = makeCanvas(w, h); const t = ctx2d(tmp)
  drawLayerContent(t, layer)
  const maskSrc = layer.mask && layer.maskEnabled ? layer.mask : null
  if (maskSrc) { t.globalCompositeOperation = 'destination-in'; t.drawImage(localLayerMask(layer,doc,maskSrc), 0, 0) }
  if (hasVectorMask(layer)) { t.globalCompositeOperation = 'destination-in'; t.drawImage(vectorMaskCanvas(layer, w, h), 0, 0) }
  x.drawImage(tmp, 0, 0)
  x.restore()
  return c
}

function fullMaskSized(w: number, h: number) {
  const c = makeCanvas(w, h); const x = ctx2d(c); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); return c
}
function fullMask(doc: Doc) { return fullMaskSized(doc.width, doc.height) }
export { fullMaskSized }

/** A mask with the stroke being painted on it. The stroke is in document pixels; the mask's top left is at `at`. */
export function paintMask(mask: HTMLCanvasElement, buffer: HTMLCanvasElement, opacity: number, value: number, transform?: DOMMatrix, at?: MaskAt | null): HTMLCanvasElement {
  const c = cloneCanvas(mask), x = ctx2d(c)
  if (transform) x.setTransform(transform)
  // Alpha masks represent visibility. Interpolate toward the foreground luminance.
  x.globalAlpha = opacity; x.globalCompositeOperation = 'destination-out'
  x.drawImage(buffer, -(at?.x ?? 0), -(at?.y ?? 0))
  if (value > 0) {
    x.globalAlpha = opacity * value; x.globalCompositeOperation = 'lighter'
    x.drawImage(buffer, -(at?.x ?? 0), -(at?.y ?? 0))
  }
  return c
}

function liveMask(mask: HTMLCanvasElement, live: LiveStroke | null, at?: MaskAt | null, transform?: DOMMatrix): HTMLCanvasElement {
  if (!live || !live.mode.startsWith('mask')) return mask
  return paintMask(mask, live.buffer, live.opacity, live.mode === 'mask-hide' ? 0 : live.maskValue ?? 1, transform, at)
}

// ─── Brush ─────────────────────────────────────────────────────────

const tipCache = new Map<string, HTMLCanvasElement>()
export function brushTip(size: number, hardness: number, color: string): HTMLCanvasElement {
  const d = Math.max(1, Math.round(size))
  const key = `${d}|${hardness.toFixed(2)}|${color}`
  const hit = tipCache.get(key)
  if (hit) return hit
  const c = makeCanvas(d + 2, d + 2)
  const x = ctx2d(c)
  const r = d / 2, cx = c.width / 2
  const g = x.createRadialGradient(cx, cx, 0, cx, cx, r)
  const h = Math.min(0.98, Math.max(0, hardness))
  g.addColorStop(0, color); g.addColorStop(h, color)
  g.addColorStop(1, color.length === 7 ? color + '00' : 'rgba(0,0,0,0)')
  x.fillStyle = g
  x.beginPath(); x.arc(cx, cx, r, 0, Math.PI * 2); x.fill()
  if (tipCache.size > 40) tipCache.clear()
  tipCache.set(key, c)
  return c
}

// ─── Flood select (magic wand / bucket) ────────────────────────────

export function floodMask(src: HTMLCanvasElement, sx: number, sy: number, tolerance: number, contiguous: boolean): HTMLCanvasElement {
  const w = src.width, h = src.height
  const d = ctx2d(src, true).getImageData(0, 0, w, h).data
  const out = makeCanvas(w, h)
  const octx = ctx2d(out)
  const o = octx.createImageData(w, h)
  sx = Math.min(w - 1, Math.max(0, Math.floor(sx))); sy = Math.min(h - 1, Math.max(0, Math.floor(sy)))
  const s = (sy * w + sx) * 4
  const r0 = d[s], g0 = d[s + 1], b0 = d[s + 2], a0 = d[s + 3]
  const match = (i: number) =>
    Math.max(Math.abs(d[i] - r0), Math.abs(d[i + 1] - g0), Math.abs(d[i + 2] - b0), Math.abs(d[i + 3] - a0)) <= tolerance
  if (!contiguous) {
    for (let i = 0; i < d.length; i += 4) if (match(i)) { o.data[i] = o.data[i + 1] = o.data[i + 2] = o.data[i + 3] = 255 }
  } else {
    const seen = new Uint8Array(w * h)
    const stack = [sx, sy]
    while (stack.length) {
      const y = stack.pop()!, x0 = stack.pop()!
      let x = x0
      while (x >= 0 && !seen[y * w + x] && match((y * w + x) * 4)) x--
      x++
      let up = false, down = false
      while (x < w && !seen[y * w + x] && match((y * w + x) * 4)) {
        const p = y * w + x
        seen[p] = 1
        o.data[p * 4] = o.data[p * 4 + 1] = o.data[p * 4 + 2] = o.data[p * 4 + 3] = 255
        if (y > 0) { const m = !seen[p - w] && match((p - w) * 4); if (m && !up) { stack.push(x, y - 1); up = true } else if (!m) up = false }
        if (y < h - 1) { const m = !seen[p + w] && match((p + w) * 4); if (m && !down) { stack.push(x, y + 1); down = true } else if (!m) down = false }
        x++
      }
    }
  }
  octx.putImageData(o, 0, 0)
  return out
}

/** One-pixel outline of an alpha mask, for marching ants. */
export function maskEdges(mask: HTMLCanvasElement): HTMLCanvasElement {
  const w = mask.width, h = mask.height
  const d = ctx2d(mask, true).getImageData(0, 0, w, h).data
  const out = makeCanvas(w, h)
  const octx = ctx2d(out)
  const o = octx.createImageData(w, h)
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 127
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!on(x, y)) continue
    if (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1)) {
      const i = (y * w + x) * 4
      o.data[i] = o.data[i + 1] = o.data[i + 2] = o.data[i + 3] = 255
    }
  }
  octx.putImageData(o, 0, 0)
  return out
}

export function maskBounds(mask: HTMLCanvasElement): Rect | null {
  const w = mask.width, h = mask.height
  const d = ctx2d(mask, true).getImageData(0, 0, w, h).data
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

// ─── Heal: patch-based fill ────────────────────────────────────────
// Finds a clean translation whose context and texture phase match the selected hole.
// Selected donors are excluded; exact mask coverage is retained.

export function healRegion(layerCanvas: HTMLCanvasElement, hole: HTMLCanvasElement, excluded = hole): HTMLCanvasElement | null {
  if (layerCanvas.width !== hole.width || layerCanvas.height !== hole.height) return null
  const w = layerCanvas.width, h = layerCanvas.height
  const src = ctx2d(layerCanvas, true).getImageData(0, 0, w, h)
  const result = healPixels(src.data, ctx2d(hole, true).getImageData(0, 0, w, h).data, ctx2d(excluded, true).getImageData(0, 0, w, h).data, w, h)
  if (!result) return null
  const out = makeCanvas(w, h), x = ctx2d(out); src.data.set(result); x.putImageData(src, 0, 0)
  return out
}

// ─── Palette extraction (shared with Studio) ───────────────────────

export function extractPalette(src: CanvasImageSource, count = 6): string[] {
  const c = makeCanvas(64, 64)
  const x = ctx2d(c, true)
  x.drawImage(src, 0, 0, 64, 64)
  const d = x.getImageData(0, 0, 64, 64).data
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>()
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue
    const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4)
    const e = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 }
    e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2]; e.n++
    buckets.set(key, e)
  }
  const sorted = Array.from(buckets.values()).sort((a, b) => b.n - a.n).map(e => [e.r / e.n, e.g / e.n, e.b / e.n])
  const picked: number[][] = []
  for (const col of sorted) {
    if (picked.every(p => Math.abs(p[0] - col[0]) + Math.abs(p[1] - col[1]) + Math.abs(p[2] - col[2]) > 70)) picked.push(col)
    if (picked.length >= count) break
  }
  return picked.map(p => '#' + p.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''))
}

// ─── Dodge, burn, sponge ───────────────────────────────────────────

/** Lighten, darken or change saturation where `stroke` is painted. `amount` 0..1 is the tool's exposure. */
export function toneStroke(src: HTMLCanvasElement, stroke: HTMLCanvasElement, kind: 'dodge' | 'burn' | 'sponge', range: 'shadows' | 'midtones' | 'highlights', amount: number, sponge: 'saturate' | 'desaturate' = 'desaturate'): HTMLCanvasElement {
  const b = maskBounds(stroke)
  const out = cloneCanvas(src)
  if (!b) return out
  const x = ctx2d(out, true)
  const img = x.getImageData(b.x, b.y, b.w, b.h), d = img.data
  const m = ctx2d(stroke, true).getImageData(b.x, b.y, b.w, b.h).data
  for (let i = 0; i < d.length; i += 4) {
    const w = (m[i + 3] / 255) * amount
    if (!w || !d[i + 3]) continue
    const r = d[i], g = d[i + 1], bl = d[i + 2]
    if (kind === 'sponge') {
      const y = r * 0.299 + g * 0.587 + bl * 0.114
      const f = sponge === 'saturate' ? 1 + w * 0.8 : 1 - w * 0.8
      d[i] = clamp255(y + (r - y) * f); d[i + 1] = clamp255(y + (g - y) * f); d[i + 2] = clamp255(y + (bl - y) * f)
      continue
    }
    const L = (r * 0.299 + g * 0.587 + bl * 0.114) / 255
    const rw = range === 'shadows' ? (1 - L) ** 2 : range === 'highlights' ? L * L : 1 - Math.abs(L * 2 - 1) * 0.8
    const k = w * rw * 0.6
    if (kind === 'dodge') { d[i] = r + (255 - r) * k; d[i + 1] = g + (255 - g) * k; d[i + 2] = bl + (255 - bl) * k }
    else { d[i] = r * (1 - k); d[i + 1] = g * (1 - k); d[i + 2] = bl * (1 - k) }
  }
  x.putImageData(img, b.x, b.y)
  return out
}


// ─── Type on a path ────────────────────────────────────────────────

/** Points along the first subpath with their distance from the start, for placing glyphs. */
export function pathPolyline(subs: SubPath[]): { x: number; y: number; d: number }[] {
  const sp = subs[0]; if (!sp || sp.nodes.length < 2) return []
  const n = sp.nodes, segs = sp.closed ? n.length : n.length - 1
  const out: { x: number; y: number; d: number }[] = []
  let d = 0
  for (let i = 0; i < segs; i++) {
    const a = n[i], b = n[(i + 1) % n.length]
    const c = [a.x, a.y, a.outX, a.outY, b.inX, b.inY, b.x, b.y]
    const est = Math.hypot(c[2] - c[0], c[3] - c[1]) + Math.hypot(c[4] - c[2], c[5] - c[3]) + Math.hypot(c[6] - c[4], c[7] - c[5])
    const N = Math.max(8, Math.ceil(est / 2))
    for (let k = i ? 1 : 0; k <= N; k++) {
      const t = k / N, u = 1 - t
      const x = u * u * u * c[0] + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6]
      const y = u * u * u * c[1] + 3 * u * u * t * c[3] + 3 * u * t * t * c[5] + t * t * t * c[7]
      const prev = out[out.length - 1]
      if (prev) d += Math.hypot(x - prev.x, y - prev.y)
      out.push({ x, y, d })
    }
  }
  return out
}
function pointAt(poly: { x: number; y: number; d: number }[], d: number): { x: number; y: number; a: number } | null {
  if (poly.length < 2) return null
  const total = poly[poly.length - 1].d
  if (d < 0 || d > total) return null
  let lo = 0, hi = poly.length - 1
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (poly[mid].d < d) lo = mid; else hi = mid }
  const A = poly[lo], B = poly[hi], t = B.d - A.d ? (d - A.d) / (B.d - A.d) : 0
  return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, a: Math.atan2(B.y - A.y, B.x - A.x) }
}

function drawTextOnPath(ctx: CanvasRenderingContext2D, l: TextLayer, k: number) {
  const tp = l.onPath!
  let poly = pathPolyline(tp.subpaths)
  if (poly.length < 2) return
  if (tp.flip) { const total = poly[poly.length - 1].d; poly = poly.slice().reverse().map(p => ({ ...p, d: total - p.d })) }
  const total = poly[poly.length - 1].d
  applyTextStyle(ctx, l)
  ctx.fillStyle = l.color; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center'
  const text = (l.caps === 'all' ? l.text.toUpperCase() : l.text).replace(/\s*\n\s*/g, ' ')
  const chars = Array.from(text)
  const widths = chars.map(ch => ctx.measureText(ch).width)
  const len = widths.reduce((a, b) => a + b, 0)
  const start = l.align === 'center' ? tp.start - len / 2 : l.align === 'right' ? tp.start - len : tp.start
  const shift = -(l.baselineShift ?? 0)
  const paint = (fn: (ch: string) => void) => {
    let d = start
    chars.forEach((ch, i) => {
      const mid = d + widths[i] / 2
      d += widths[i]
      const at = pointAt(poly, sp(mid, total, tp.subpaths[0]?.closed))
      if (!at || !ch.trim()) return
      ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(at.a); ctx.translate(0, shift)
      fn(ch); ctx.restore()
    })
  }
  if (l.shadow) { ctx.shadowColor = withAlpha(l.shadow.color, l.shadow.opacity ?? 1); ctx.shadowBlur = l.shadow.blur * k; ctx.shadowOffsetX = l.shadow.x * k; ctx.shadowOffsetY = l.shadow.y * k }
  if (l.outline && l.outline.width > 0) { ctx.strokeStyle = l.outline.color; ctx.lineWidth = l.outline.width * 2; ctx.lineJoin = 'round'; paint(ch => ctx.strokeText(ch, 0, 0)); ctx.shadowColor = 'transparent' }
  paint(ch => ctx.fillText(ch, 0, 0))
  ctx.shadowColor = 'transparent'; ctx.textAlign = 'left'
}
/** On a closed path, text that runs past the end wraps round to the start. */
function sp(d: number, total: number, closed?: boolean) { return closed && total > 0 ? ((d % total) + total) % total : d }

// ─── Vector masks ──────────────────────────────────────────────────

/** A vector mask as an alpha canvas in layer-local pixels (w × h). */
export function vectorMaskCanvas(l: Layer, w: number, h: number): HTMLCanvasElement {
  const vm = l.vmask!
  const c = makeCanvas(w, h), x = ctx2d(c)
  paintPathOps(x, vm.subpaths)
  let out = c
  if (vm.feather && vm.feather > 0) {
    const f = makeCanvas(w, h), fx = ctx2d(f)
    fx.filter = `blur(${vm.feather}px)`; fx.drawImage(c, 0, 0); fx.filter = 'none'; out = f
  }
  if (vm.invert) {
    const inv = makeCanvas(w, h), ix = ctx2d(inv)
    ix.fillStyle = '#fff'; ix.fillRect(0, 0, w, h); ix.globalCompositeOperation = 'destination-out'; ix.drawImage(out, 0, 0); out = inv
  }
  return out
}
export const hasVectorMask = (l: Layer) => !!(l.vmask && l.vmask.enabled && l.vmask.subpaths.length)

/** Frozen document transform for an unlinked mask, otherwise the host's live transform. */
export function layerMaskMatrix(l: Layer, doc: Doc): DOMMatrix { return l.maskLinked === false && l.maskMatrix?.length === 6 ? new DOMMatrix(l.maskMatrix) : layerMatrix(l,doc) }
function localLayerMask(l: Layer, doc: Doc, mask: HTMLCanvasElement) {
  if(l.maskLinked!==false || !l.maskMatrix)return mask
  const {w,h}=layerSize(l,doc),c=makeCanvas(w,h),x=ctx2d(c)
  x.setTransform(layerMatrix(l,doc).inverse().multiply(layerMaskMatrix(l,doc)));x.drawImage(mask,0,0);return c
}
