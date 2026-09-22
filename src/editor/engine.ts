import { applyEffect } from '@/lib/effects'
import type { AdjustmentLayer, Doc, Frame, Group, Layer, RasterLayer, Rect, TextLayer } from './types'

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

function applyTextStyle(ctx: CanvasRenderingContext2D, l: TextLayer) {
  ctx.font = fontString(l)
  ;(ctx as any).letterSpacing = `${l.letterSpacing}px`
}

export function layerSize(l: Layer, doc?: Doc): { w: number; h: number } {
  if (l.type === 'raster') return { w: l.canvas.width, h: l.canvas.height }
  if (l.type === 'shape') return { w: l.w, h: l.h }
  if (l.type === 'adjustment') return { w: doc?.width ?? 1, h: doc?.height ?? 1 }
  if (!measureCtx) measureCtx = ctx2d(makeCanvas(1, 1))
  applyTextStyle(measureCtx, l)
  const lines = (l.text || ' ').split('\n')
  let w = 1
  for (const line of lines) w = Math.max(w, measureCtx.measureText(line || ' ').width)
  return { w: Math.ceil(w) + 4, h: Math.ceil(lines.length * l.fontSize * l.lineHeight) + 4 }
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
  return { canvas: bake(l.canvas), mask: l.mask ? bake(l.mask) : null, x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }
}

/** Topmost selectable layer under a document point. */
export function hitLayer(layers: Layer[], x: number, y: number, doc: Doc, groups: Group[] = []): Layer | null {
  const hidden = new Set(groups.filter(g => !g.visible).map(g => g.id))
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i]
    if (!l.visible || l.locked || l.type === 'adjustment' || (l.groupId && hidden.has(l.groupId))) continue
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

export function drawLayerContent(ctx: CanvasRenderingContext2D, l: Layer, k = 1) {
  if (l.type === 'raster') {
    ctx.drawImage(l.canvas, 0, 0)
  } else if (l.type === 'text') {
    applyTextStyle(ctx, l)
    ctx.fillStyle = l.color
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = l.align
    const { w } = layerSize(l)
    const lh = l.fontSize * l.lineHeight
    const ax = l.align === 'left' ? 2 : l.align === 'center' ? w / 2 : w - 2
    const lines = l.text.split('\n')
    const yAt = (i: number) => 2 + i * lh + (lh - l.fontSize) / 2 + l.fontSize * 0.82
    // Shadow offsets ignore canvas transforms, so scale them by hand (k = on-screen scale of this layer).
    if (l.shadow) { ctx.shadowColor = l.shadow.color; ctx.shadowBlur = l.shadow.blur * k; ctx.shadowOffsetX = l.shadow.x * k; ctx.shadowOffsetY = l.shadow.y * k }
    if (l.outline && l.outline.width > 0) {
      ctx.strokeStyle = l.outline.color; ctx.lineWidth = l.outline.width * 2; ctx.lineJoin = 'round'
      lines.forEach((line, i) => ctx.strokeText(line, ax, yAt(i)))
      ctx.shadowColor = 'transparent'
    }
    lines.forEach((line, i) => ctx.fillText(line, ax, yAt(i)))
    ctx.shadowColor = 'transparent'
  } else if (l.type === 'shape') {
    const sw = l.stroke ? l.strokeWidth : 0
    ctx.beginPath()
    if (l.shape === 'ellipse') {
      ctx.ellipse(l.w / 2, l.h / 2, Math.max(0.5, l.w / 2 - sw / 2), Math.max(0.5, l.h / 2 - sw / 2), 0, 0, Math.PI * 2)
    } else if (l.shape === 'line') {
      ctx.moveTo(0, l.h / 2); ctx.lineTo(l.w, l.h / 2)
    } else {
      const r = Math.min(l.radius, l.w / 2, l.h / 2)
      ctx.roundRect(sw / 2, sw / 2, Math.max(1, l.w - sw), Math.max(1, l.h - sw), r)
    }
    if (l.fill && l.shape !== 'line') { ctx.fillStyle = l.fill; ctx.fill() }
    if (l.stroke && sw > 0) { ctx.strokeStyle = l.stroke; ctx.lineWidth = sw; ctx.lineCap = 'round'; ctx.stroke() }
  }
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

export const ADJUSTMENT_DEFAULTS: Record<string, Record<string, number>> = {
  brightnessContrast: { brightness: 0, contrast: 0 },
  hueSaturation: { hue: 0, saturation: 0, lightness: 0 },
  levels: { black: 0, white: 255, gamma: 100 },
  temperature: { temperature: 0, tint: 0 },
  blackWhite: { amount: 100 },
  invert: {},
  blur: { radius: 8 },
  curves: {},
  voidEffect: {},
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

function applyBuiltIn(img: ImageData, l: AdjustmentLayer, scale: number) {
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
      const lo = v.black, hi = Math.max(lo + 1, v.white), g = 100 / Math.max(10, v.gamma)
      const lut = new Uint8ClampedArray(256)
      for (let i = 0; i < 256; i++) lut[i] = clamp255(Math.pow(Math.min(1, Math.max(0, (i - lo) / (hi - lo))), g) * 255)
      lutApply(d, lut); break
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
      for (let i = 0; i < d.length; i += 4) {
        let [h, s, li] = rgbToHsl(d[i], d[i + 1], d[i + 2])
        h = (h + dh + 1) % 1
        s = Math.min(1, Math.max(0, ds >= 0 ? s + (1 - s) * ds * (s > 0.02 ? 1 : 0) : s * (1 + ds)))
        li = Math.min(1, Math.max(0, dl >= 0 ? li + (1 - li) * dl : li * (1 + dl)))
        if (s === 0) { d[i] = d[i + 1] = d[i + 2] = li * 255; continue }
        const q = li < 0.5 ? li * (1 + s) : li + s - li * s, p = 2 * li - q
        d[i] = hue2rgb(p, q, h + 1 / 3) * 255; d[i + 1] = hue2rgb(p, q, h) * 255; d[i + 2] = hue2rgb(p, q, h - 1 / 3) * 255
      }
      break
    }
    case 'curves': lutApply(d, curveLut(l.points ?? [[0, 0], [255, 255]])); break
    case 'blur': boxBlur(img, Math.max(1, v.radius * scale * 0.6)); break
  }
}

/** Void effects always run at this working size so preview, export and the Effects tool all match. */
const FX_MAX = 1200

const adjCacheById = new Map<string, { key: string; canvas: HTMLCanvasElement }>()

function processAdjustment(acc: HTMLCanvasElement, l: AdjustmentLayer, scale: number): HTMLCanvasElement {
  const out = makeCanvas(acc.width, acc.height)
  const octx = ctx2d(out, true)
  if (l.kind === 'voidEffect' && l.effect && l.effectParams) {
    const k = Math.min(1, FX_MAX / Math.max(acc.width, acc.height))
    const work = makeCanvas(acc.width * k, acc.height * k)
    const wctx = ctx2d(work, true)
    wctx.drawImage(acc, 0, 0, work.width, work.height)
    const img = wctx.getImageData(0, 0, work.width, work.height)
    wctx.putImageData(applyEffect(wctx, img, l.effect, l.effectParams), 0, 0)
    octx.imageSmoothingQuality = 'high'
    octx.drawImage(work, 0, 0, out.width, out.height)
  } else {
    octx.drawImage(acc, 0, 0)
    const img = octx.getImageData(0, 0, out.width, out.height)
    applyBuiltIn(img, l, scale)
    octx.putImageData(img, 0, 0)
  }
  return out
}

// ─── Compositor ────────────────────────────────────────────────────

export interface LiveStroke {
  layerId: string
  buffer: HTMLCanvasElement
  opacity: number
  mode: 'paint' | 'erase' | 'mask-hide' | 'mask-reveal'
}

export interface RenderOptions {
  scale?: number
  live?: LiveStroke | null
  /** Skip the adjustment cache, e.g. for export at a different scale. */
  noCache?: boolean
  transparent?: boolean
  groups?: Group[]
  /** Override which frames to draw; omit to use doc.frames, pass [] to force flat. */
  frameRects?: Frame[]
}

export function renderDoc(target: HTMLCanvasElement, doc: Doc, layers: Layer[], opts: RenderOptions = {}) {
  const s = opts.scale ?? 1
  const W = Math.max(1, Math.round(doc.width * s)), H = Math.max(1, Math.round(doc.height * s))
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
      acc.save()
      acc.shadowColor = 'rgba(0,0,0,0.45)'; acc.shadowBlur = 24 * s; acc.shadowOffsetY = 4 * s
      acc.fillStyle = f.background ?? '#ffffff'
      acc.fillRect(f.x * s, f.y * s, f.width * s, f.height * s)
      acc.restore()
      if (!f.background) { // transparent board: clear the fill we used only to cast the shadow, leave checker to the UI
        acc.clearRect(f.x * s, f.y * s, f.width * s, f.height * s)
        // re-cast shadow via a thin frame so an empty transparent board still floats
        acc.save(); acc.shadowColor = 'rgba(0,0,0,0.45)'; acc.shadowBlur = 24 * s; acc.shadowOffsetY = 4 * s
        acc.strokeStyle = 'rgba(0,0,0,0.001)'; acc.lineWidth = 1; acc.strokeRect(f.x * s, f.y * s, f.width * s, f.height * s); acc.restore()
      }
    }
  } else if (doc.background && !opts.transparent) { acc.fillStyle = doc.background; acc.fillRect(0, 0, W, H) }
  const frameById = new Map((frames ?? []).map(f => [f.id, f]))

  let belowKey = `${W}x${H}|${opts.transparent ? '' : doc.background}`
  let liveBelow = false

  const gmap = new Map((opts.groups ?? []).map(g => [g.id, g]))
  for (let li = 0; li < layers.length; li++) {
    const l = layers[li]
    const grp = l.groupId ? gmap.get(l.groupId) : undefined
    if (grp && !grp.visible) { belowKey += `|g${grp.id}:off`; continue }
    if (grp && grp.opacity < 1) {
      // A faded group is flattened first, then drawn once, so its layers do not show through each other.
      let end = li
      while (end + 1 < layers.length && layers[end + 1].groupId === grp.id) end++
      const run = layers.slice(li, end + 1)
      const tmp = makeCanvas(W, H)
      renderDoc(tmp, doc, run.map(x => ({ ...x, groupId: null } as Layer)), { scale: s, live: opts.live, noCache: true, transparent: true })
      if (opts.live && run.some(x => x.id === opts.live!.layerId)) liveBelow = true
      acc.globalAlpha = grp.opacity; acc.drawImage(tmp, 0, 0); acc.globalAlpha = 1
      belowKey += `|g${grp.id}:${grp.opacity}:` + run.map(x => `${x.id}:${x.rev}`).join(',')
      li = end
      continue
    }
    if (!l.visible) continue
    const live = opts.live && opts.live.layerId === l.id ? opts.live : null
    if (live) liveBelow = true

    if (l.type === 'adjustment') {
      const settingsKey = `${l.kind}|${JSON.stringify(l.values)}|${l.points ? JSON.stringify(l.points) : ''}|${l.effect}|${l.effect ? JSON.stringify(l.effectParams) : ''}`
      const key = `${belowKey}#${settingsKey}`
      let processed: HTMLCanvasElement
      const cached = opts.noCache ? undefined : adjCacheById.get(l.id)
      if (cached && cached.key === key && !liveBelow) processed = cached.canvas
      else {
        processed = processAdjustment(target, l, s)
        if (!opts.noCache && !liveBelow) adjCacheById.set(l.id, { key, canvas: processed })
      }
      let draw = processed
      const maskSrc = l.mask && l.maskEnabled ? l.mask : null
      if (maskSrc || (live && live.mode.startsWith('mask'))) {
        draw = cloneCanvas(processed)
        const dctx = ctx2d(draw)
        const m = liveMask(maskSrc ?? fullMask(doc), live)
        dctx.globalCompositeOperation = 'destination-in'
        dctx.drawImage(m, 0, 0, W, H)
      }
      acc.save()
      // A filter on a board only changes that board, never the rest of the document.
      const adjFrame = l.frameId ? frameById.get(l.frameId) : undefined
      if (adjFrame) { acc.beginPath(); acc.rect(adjFrame.x * s, adjFrame.y * s, adjFrame.width * s, adjFrame.height * s); acc.clip() }
      acc.globalAlpha = l.opacity
      // An adjustment replaces what is below it, so blend modes other than normal are drawn over the original.
      acc.globalCompositeOperation = l.blend
      acc.drawImage(draw, 0, 0)
      acc.restore()
    } else {
      const m = layerMatrix(l, doc)
      // Clipping mask: this layer shows only where the base layer (directly below) is opaque.
      let clipBaseCanvas: HTMLCanvasElement | null = null
      if (l.clipId) {
        // Base is the layer named by clipId (the nearest non-clipped layer below). Supports a run of clipped layers sharing one base.
        const base = layers.find(x => x.id === l.clipId)
        if (base && base.type !== 'adjustment') clipBaseCanvas = renderLayerAlpha(doc, base, s)
      }
      const needsTemp = (l.mask && l.maskEnabled) || !!live || !!clipBaseCanvas
      acc.save()
      const clipF = l.frameId ? frameById.get(l.frameId) : undefined
      if (clipF) { acc.beginPath(); acc.rect(clipF.x * s, clipF.y * s, clipF.width * s, clipF.height * s); acc.clip() }
      acc.globalAlpha = l.opacity
      acc.globalCompositeOperation = l.blend
      acc.imageSmoothingQuality = 'high'
      acc.setTransform(new DOMMatrix().scale(s, s).multiply(m))
      if (!needsTemp) drawLayerContent(acc, l, s * Math.abs(l.scaleX))
      else {
        const { w, h } = layerSize(l, doc)
        const tmp = makeCanvas(w, h)
        const t = ctx2d(tmp)
        drawLayerContent(t, l)
        if (live && live.mode === 'paint') { t.globalAlpha = live.opacity; t.drawImage(live.buffer, 0, 0); t.globalAlpha = 1 }
        if (live && live.mode === 'erase') { t.globalCompositeOperation = 'destination-out'; t.globalAlpha = live.opacity; t.drawImage(live.buffer, 0, 0); t.globalAlpha = 1 }
        const maskSrc = l.mask && l.maskEnabled ? l.mask : null
        if (maskSrc || (live && live.mode.startsWith('mask'))) {
          t.globalCompositeOperation = 'destination-in'
          t.drawImage(liveMask(maskSrc ?? fullMaskSized(w, h), live), 0, 0)
        }
        if (clipBaseCanvas) {
          // The clip base is in document space; composite the layer into doc space, then intersect with the base alpha.
          acc.restore(); acc.save()
          if (clipF) { acc.beginPath(); acc.rect(clipF.x * s, clipF.y * s, clipF.width * s, clipF.height * s); acc.clip() }
          const docTmp = makeCanvas(W, H); const dt = ctx2d(docTmp)
          dt.setTransform(new DOMMatrix().scale(s, s).multiply(m))
          dt.drawImage(tmp, 0, 0)
          dt.setTransform(1, 0, 0, 1, 0, 0)
          dt.globalCompositeOperation = 'destination-in'
          dt.drawImage(clipBaseCanvas, 0, 0)
          acc.setTransform(1, 0, 0, 1, 0, 0)
          acc.globalAlpha = l.opacity
          acc.globalCompositeOperation = l.blend
          acc.drawImage(docTmp, 0, 0)
        } else {
          acc.drawImage(tmp, 0, 0)
        }
      }
      acc.restore()
    }
    belowKey += `|${l.id}:${l.rev}`
  }
  // Drop cache entries for layers that no longer exist.
  if (adjCacheById.size > 24) {
    const ids = new Set(layers.map(l => l.id))
    Array.from(adjCacheById.keys()).forEach(k => { if (!ids.has(k)) adjCacheById.delete(k) })
  }
}

/** Render a single layer's pixels onto a full document-size canvas at scale s. Used as a clip base. */
function renderLayerAlpha(doc: Doc, layer: Layer, s: number): HTMLCanvasElement {
  const W = Math.round(doc.width * s), H = Math.round(doc.height * s)
  const c = makeCanvas(W, H); const x = ctx2d(c)
  if (layer.type === 'adjustment') return c // adjustments have no shape to clip to
  const m = layerMatrix(layer, doc)
  x.save(); x.setTransform(new DOMMatrix().scale(s, s).multiply(m))
  const { w, h } = layerSize(layer, doc)
  const tmp = makeCanvas(w, h); const t = ctx2d(tmp)
  drawLayerContent(t, layer)
  const maskSrc = layer.mask && layer.maskEnabled ? layer.mask : null
  if (maskSrc) { t.globalCompositeOperation = 'destination-in'; t.drawImage(maskSrc, 0, 0) }
  x.drawImage(tmp, 0, 0)
  x.restore()
  return c
}

function fullMaskSized(w: number, h: number) {
  const c = makeCanvas(w, h); const x = ctx2d(c); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); return c
}
function fullMask(doc: Doc) { return fullMaskSized(doc.width, doc.height) }
export { fullMaskSized }

function liveMask(mask: HTMLCanvasElement, live: LiveStroke | null): HTMLCanvasElement {
  if (!live || !live.mode.startsWith('mask')) return mask
  const c = cloneCanvas(mask)
  const x = ctx2d(c)
  x.globalAlpha = live.opacity
  x.globalCompositeOperation = live.mode === 'mask-hide' ? 'destination-out' : 'source-over'
  x.drawImage(live.buffer, 0, 0)
  return c
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
// Finds the nearby patch whose surroundings best match the hole's surroundings,
// colour-corrects it and blends it in with a feathered edge.

export function healRegion(layerCanvas: HTMLCanvasElement, hole: HTMLCanvasElement): HTMLCanvasElement | null {
  const b = maskBounds(hole)
  if (!b) return null
  const W = layerCanvas.width, H = layerCanvas.height
  const size = Math.max(b.w, b.h)
  const pad = Math.max(6, Math.round(size * 0.35))
  const R: Rect = { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), w: 0, h: 0 }
  R.w = Math.min(W, b.x + b.w + pad) - R.x
  R.h = Math.min(H, b.y + b.h + pad) - R.y
  if (R.w * R.h > 1_400_000) return null

  const src = ctx2d(layerCanvas, true).getImageData(0, 0, W, H).data
  const hm = ctx2d(hole, true).getImageData(R.x, R.y, R.w, R.h).data
  const step = Math.max(1, Math.round(size / 60))

  let best: { dx: number; dy: number; score: number } | null = null
  const dists = [1.15, 1.8, 2.6, 3.6]
  for (const k of dists) for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2
    const dx = Math.round(Math.cos(ang) * (size + pad) * k), dy = Math.round(Math.sin(ang) * (size + pad) * k)
    if (R.x + dx < 0 || R.y + dy < 0 || R.x + R.w + dx > W || R.y + R.h + dy > H) continue
    let sum = 0, n = 0, bad = false
    for (let y = 0; y < R.h && !bad; y += step) for (let x = 0; x < R.w; x += step) {
      if (hm[(y * R.w + x) * 4 + 3] > 8) continue
      const t = ((R.y + y) * W + R.x + x) * 4, s = ((R.y + y + dy) * W + R.x + x + dx) * 4
      if (src[s + 3] < 200 && src[t + 3] >= 200) { bad = true; break }
      const dr = src[t] - src[s], dg = src[t + 1] - src[s + 1], db = src[t + 2] - src[s + 2]
      sum += dr * dr + dg * dg + db * db; n++
    }
    if (bad || !n) continue
    const score = sum / n + k * 12
    if (!best || score < best.score) best = { dx, dy, score }
  }
  if (!best) return null

  // Mean colour difference over the ring.
  const mean = [0, 0, 0]; let n = 0
  for (let y = 0; y < R.h; y += step) for (let x = 0; x < R.w; x += step) {
    if (hm[(y * R.w + x) * 4 + 3] > 8) continue
    const t = ((R.y + y) * W + R.x + x) * 4, s = ((R.y + y + best.dy) * W + R.x + x + best.dx) * 4
    mean[0] += src[t] - src[s]; mean[1] += src[t + 1] - src[s + 1]; mean[2] += src[t + 2] - src[s + 2]; n++
  }
  if (n) { mean[0] /= n; mean[1] /= n; mean[2] /= n }

  const patch = makeCanvas(R.w, R.h)
  const pctx = ctx2d(patch, true)
  const pimg = pctx.createImageData(R.w, R.h)
  for (let y = 0; y < R.h; y++) for (let x = 0; x < R.w; x++) {
    const s = ((R.y + y + best.dy) * W + R.x + x + best.dx) * 4, o = (y * R.w + x) * 4
    pimg.data[o] = clamp255(src[s] + mean[0]); pimg.data[o + 1] = clamp255(src[s + 1] + mean[1])
    pimg.data[o + 2] = clamp255(src[s + 2] + mean[2]); pimg.data[o + 3] = src[s + 3]
  }
  pctx.putImageData(pimg, 0, 0)

  // Feathered version of the hole: grow it slightly, then blur.
  const feather = makeCanvas(R.w, R.h)
  const fctx = ctx2d(feather, true)
  const grow = Math.max(1, Math.round(pad * 0.25))
  for (let a = 0; a < 8; a++) fctx.drawImage(hole, -R.x + Math.cos(a * Math.PI / 4) * grow, -R.y + Math.sin(a * Math.PI / 4) * grow)
  fctx.drawImage(hole, -R.x, -R.y)
  const fimg = fctx.getImageData(0, 0, R.w, R.h)
  boxBlur(fimg, Math.max(1, pad * 0.22))
  fctx.putImageData(fimg, 0, 0)

  pctx.globalCompositeOperation = 'destination-in'
  pctx.drawImage(feather, 0, 0)

  const out = cloneCanvas(layerCanvas)
  ctx2d(out).drawImage(patch, R.x, R.y)
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
