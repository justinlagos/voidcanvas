// Turns a page's canvas drawing into editable layers.
//
// The page renderers draw with the normal 2D canvas API. Here they draw into a recording
// context instead: every call is inspected and, where the Editor has a matching layer type,
// emitted as a text, shape or image item. Calls with no editable equivalent (hatching,
// dashed guides, multi-segment paths, clipped fills) are replayed into an image buffer that
// becomes one image layer at the right place in the stack. The same renderer drives the
// preview, the PDFs and the Editor, so the three can never drift apart.

export interface TextItem { kind: 'text'; name: string; text: string; fontFamily: string; fontSize: number; fontWeight: number; italic: boolean; color: string; align: 'left' | 'center' | 'right'; lineHeight: number; letterSpacing: number; x: number; y: number; opacity: number }
export interface ShapeItem { kind: 'shape'; name: string; shape: 'rect' | 'ellipse' | 'line'; x: number; y: number; w: number; h: number; fill: string | null; stroke: string | null; strokeWidth: number; radius: number; rotation: number; opacity: number }
export interface ImageItem { kind: 'image'; name: string; canvas: HTMLCanvasElement; x: number; y: number; scaleX: number; scaleY: number; opacity: number }
export type Item = TextItem | ShapeItem | ImageItem
export interface RecordedPage { background: string | null; items: Item[] }

type PathOp = { op: string; args: any[]; m: DOMMatrix }
interface Clip { ops: PathOp[]; rule?: CanvasFillRule }
// Text items carry their baselines so wrapped lines can be merged into one paragraph layer.
interface TextMeta { item: TextItem; first: number; last: number; spacing: number; anchor: number; lines: number }

const K = 2 // image buffers are recorded at 2x so they stay sharp when zoomed in the Editor
const PATH_OPS = ['moveTo', 'lineTo', 'rect', 'roundRect', 'arc', 'arcTo', 'ellipse', 'closePath', 'quadraticCurveTo', 'bezierCurveTo']
const STYLE_KEYS = ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit', 'font', 'textAlign', 'textBaseline', 'direction', 'globalAlpha', 'globalCompositeOperation', 'filter', 'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'imageSmoothingEnabled', 'imageSmoothingQuality', 'letterSpacing', 'lineDashOffset'] as const

/** Hex plus alpha from any canvas colour string the context hands back. */
function splitColor(c: string): { hex: string; alpha: number } | null {
  if (c.startsWith('#')) return c.length === 9 ? { hex: c.slice(0, 7), alpha: parseInt(c.slice(7), 16) / 255 } : { hex: c, alpha: 1 }
  const m = c.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/)
  if (!m) return null
  const h = (v: string) => Math.round(Math.min(255, Math.max(0, parseFloat(v)))).toString(16).padStart(2, '0')
  const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
  return { hex: `#${h(m[1])}${h(m[2])}${h(m[3])}`, alpha: a }
}

function parseFont(f: string): { family: string; size: number; weight: number; italic: boolean } | null {
  const m = f.match(/^(.*?)(\d+(?:\.\d+)?)px(?:\s*\/\s*\S+)?\s+(.+)$/)
  if (!m) return null
  const pre = m[1].toLowerCase()
  const w = pre.match(/\b([1-9]00)\b/)?.[1]
  const weight = w ? +w : /\bbold\b/.test(pre) ? 700 : 400
  const family = m[3].split(',')[0].trim().replace(/^["']|["']$/g, '')
  return { family, size: +m[2], weight, italic: /\bitalic\b/.test(pre) }
}

const affineOk = (m: DOMMatrix) => Math.abs(m.b) < 1e-6 && Math.abs(m.c) < 1e-6 && m.a > 0 && m.d > 0

export function recordPage(W: number, H: number, draw: (ctx: CanvasRenderingContext2D) => void): RecordedPage {
  const baseCanvas = document.createElement('canvas'); baseCanvas.width = W; baseCanvas.height = H
  const base = baseCanvas.getContext('2d')!
  const buf = document.createElement('canvas'); buf.width = W * K; buf.height = H * K
  const bx = buf.getContext('2d', { willReadFrequently: true })!
  let bufDirty = false
  const items: Item[] = []
  let lastText: TextMeta | null = null

  let path: PathOp[] = []
  let clips: Clip[] = []
  const clipStack: Clip[][] = []

  const snapshot = () => {
    const st: Record<string, any> = {}
    for (const k of STYLE_KEYS) st[k] = (base as any)[k]
    return { st, m: base.getTransform(), dash: base.getLineDash(), clips: clips.slice(), path: path.slice() }
  }
  type Snap = ReturnType<typeof snapshot>

  const buildPath = (c: CanvasRenderingContext2D, ops: PathOp[]) => {
    for (const p of ops) { c.setTransform(new DOMMatrix([K, 0, 0, K, 0, 0]).multiply(p.m)); (c as any)[p.op](...p.args) }
  }
  // Replay a call we cannot express as a layer into the image buffer, with the exact state it had.
  const replay = (s: Snap, call: (c: CanvasRenderingContext2D) => void) => {
    bx.save()
    for (const cl of s.clips) { bx.beginPath(); buildPath(bx, cl.ops); cl.rule ? bx.clip(cl.rule) : bx.clip() }
    for (const k of STYLE_KEYS) { try { (bx as any)[k] = s.st[k] } catch { /* unsupported in this browser */ } }
    bx.setLineDash(s.dash)
    bx.beginPath(); buildPath(bx, s.path)
    bx.setTransform(new DOMMatrix([K, 0, 0, K, 0, 0]).multiply(s.m))
    call(bx)
    bx.restore()
    bufDirty = true; lastText = null
  }
  const flush = () => {
    if (!bufDirty) return
    bufDirty = false
    const d = bx.getImageData(0, 0, buf.width, buf.height).data
    let x0 = buf.width, y0 = buf.height, x1 = -1, y1 = -1
    for (let y = 0; y < buf.height; y++) {
      const row = y * buf.width * 4
      for (let x = 0; x < buf.width; x++) if (d[row + x * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    }
    if (x1 >= 0) {
      const c = document.createElement('canvas'); c.width = x1 - x0 + 1; c.height = y1 - y0 + 1
      c.getContext('2d')!.drawImage(buf, x0, y0, c.width, c.height, 0, 0, c.width, c.height)
      items.push({ kind: 'image', name: 'Graphic', canvas: c, x: x0 / K, y: y0 / K, scaleX: 1 / K, scaleY: 1 / K, opacity: 1 })
    }
    bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, buf.width, buf.height)
  }
  const emit = (it: Item) => { flush(); items.push(it); if (it.kind !== 'text') lastText = null }

  // A vector item may be emitted only if no active clip would cut it.
  const clipAllows = (s: Snap, x: number, y: number, w: number, h: number) => {
    for (const cl of s.clips) {
      if (cl.ops.length !== 1 || cl.rule === 'evenodd') return false
      const p = cl.ops[0]
      if (p.op !== 'rect' && p.op !== 'roundRect') return false
      if (!affineOk(p.m)) return false
      const cx = p.m.a * p.args[0] + p.m.e, cy = p.m.d * p.args[1] + p.m.f, cw = p.m.a * p.args[2], ch = p.m.d * p.args[3]
      if (x < cx - 0.5 || y < cy - 0.5 || x + w > cx + cw + 0.5 || y + h > cy + ch + 0.5) return false
      const r = p.op === 'roundRect' ? (typeof p.args[4] === 'number' ? p.args[4] : 0) * p.m.a : 0
      if (r > 0.5) { // stay clear of the rounded corners
        const inCorner = (px: number, py: number) => (px < cx + r || px > cx + cw - r) && (py < cy + r || py > cy + ch - r)
        if (inCorner(x, y) || inCorner(x + w, y) || inCorner(x, y + h) || inCorner(x + w, y + h)) return false
      }
    }
    return true
  }
  const plain = (s: Snap) => s.st.globalCompositeOperation === 'source-over' && (s.st.filter === 'none' || !s.st.filter) && affineOk(s.m) && !(s.st.shadowBlur > 0 || s.st.shadowOffsetX || s.st.shadowOffsetY) && !s.dash.length
  const colorOf = (v: unknown) => (typeof v === 'string' ? splitColor(v) : null)
  const T = (s: Snap, x: number, y: number) => ({ x: s.m.a * x + s.m.e, y: s.m.d * y + s.m.f })

  const fillRect = (x: number, y: number, w: number, h: number) => {
    const s = snapshot(), col = colorOf(s.st.fillStyle)
    if (w < 0) { x += w; w = -w } if (h < 0) { y += h; h = -h }
    const p = T(s, x, y), pw = w * s.m.a, ph = h * s.m.d
    if (col && plain(s) && clipAllows(s, p.x, p.y, pw, ph)) emit({ kind: 'shape', name: 'Rectangle', shape: 'rect', x: p.x, y: p.y, w: pw, h: ph, fill: col.hex, stroke: null, strokeWidth: 0, radius: 0, rotation: 0, opacity: s.st.globalAlpha * col.alpha })
    else replay(s, c => c.fillRect(x, y, w, h))
  }
  const strokeBox = (s: Snap, x: number, y: number, w: number, h: number, r: number, fallback: (c: CanvasRenderingContext2D) => void) => {
    const col = colorOf(s.st.strokeStyle), lw = s.st.lineWidth * s.m.a
    const p = T(s, x, y), pw = w * s.m.a, ph = h * s.m.d
    const bx0 = p.x - lw / 2, by0 = p.y - lw / 2, bw = pw + lw, bh = ph + lw
    if (col && plain(s) && clipAllows(s, bx0, by0, bw, bh)) emit({ kind: 'shape', name: 'Outline', shape: 'rect', x: bx0, y: by0, w: bw, h: bh, fill: null, stroke: col.hex, strokeWidth: lw, radius: r * s.m.a, rotation: 0, opacity: s.st.globalAlpha * col.alpha })
    else replay(s, fallback)
  }
  const strokeRect = (x: number, y: number, w: number, h: number) => { const s = snapshot(); strokeBox(s, x, y, w, h, 0, c => c.strokeRect(x, y, w, h)) }

  // Is the current path one simple shape?
  const single = (ops: PathOp[]) => {
    const real = ops.filter(o => o.op !== 'closePath')
    if (real.length === 1 && (real[0].op === 'rect' || real[0].op === 'roundRect') && affineOk(real[0].m)) {
      const [x, y, w, h, r] = real[0].args
      return { type: 'rect' as const, x, y, w, h, r: typeof r === 'number' ? r : Array.isArray(r) && typeof r[0] === 'number' ? r[0] : 0, m: real[0].m }
    }
    if (real.length === 1 && real[0].op === 'arc' && affineOk(real[0].m)) {
      const [cx, cy, r, a0, a1] = real[0].args
      if (Math.abs(Math.abs(a1 - a0) - Math.PI * 2) < 1e-3) return { type: 'circle' as const, cx, cy, r, m: real[0].m }
    }
    if (real.length === 2 && real[0].op === 'moveTo' && real[1].op === 'lineTo' && affineOk(real[0].m)) {
      return { type: 'line' as const, a: real[0].args, b: real[1].args, m: real[0].m }
    }
    return null
  }

  const fill = (...args: any[]) => {
    const s = snapshot(), col = colorOf(s.st.fillStyle), sh = single(s.path)
    const rule = args.find(a => typeof a === 'string') as CanvasFillRule | undefined
    if (col && plain(s) && sh && rule !== 'evenodd') {
      if (sh.type === 'rect') {
        const x = sh.m.a * sh.x + sh.m.e, y = sh.m.d * sh.y + sh.m.f, w = sh.w * sh.m.a, h = sh.h * sh.m.d
        if (clipAllows(s, x, y, w, h)) return emit({ kind: 'shape', name: sh.r ? 'Rounded rectangle' : 'Rectangle', shape: 'rect', x, y, w, h, fill: col.hex, stroke: null, strokeWidth: 0, radius: sh.r * sh.m.a, rotation: 0, opacity: s.st.globalAlpha * col.alpha })
      }
      if (sh.type === 'circle') {
        const r = sh.r * sh.m.a, x = sh.m.a * sh.cx + sh.m.e - r, y = sh.m.d * sh.cy + sh.m.f - r
        if (clipAllows(s, x, y, r * 2, r * 2)) return emit({ kind: 'shape', name: 'Circle', shape: 'ellipse', x, y, w: r * 2, h: r * 2, fill: col.hex, stroke: null, strokeWidth: 0, radius: 0, rotation: 0, opacity: s.st.globalAlpha * col.alpha })
      }
    }
    replay(s, c => (rule ? c.fill(rule) : c.fill()))
  }
  const stroke = () => {
    const s = snapshot(), col = colorOf(s.st.strokeStyle), sh = single(s.path)
    if (col && plain(s) && sh) {
      if (sh.type === 'rect') {
        const m = sh.m
        return strokeBox({ ...s, m }, sh.x, sh.y, sh.w, sh.h, sh.r, c => c.stroke())
      }
      if (sh.type === 'line') {
        const m = sh.m, ax = m.a * sh.a[0] + m.e, ay = m.d * sh.a[1] + m.f, bxp = m.a * sh.b[0] + m.e, byp = m.d * sh.b[1] + m.f
        const len = Math.hypot(bxp - ax, byp - ay), lw = Math.max(1, s.st.lineWidth * m.a)
        const mx = (ax + bxp) / 2, my = (ay + byp) / 2
        if (len > 0.5 && clipAllows(s, Math.min(ax, bxp) - lw, Math.min(ay, byp) - lw, Math.abs(bxp - ax) + lw * 2, Math.abs(byp - ay) + lw * 2))
          return emit({ kind: 'shape', name: 'Line', shape: 'line', x: mx - len / 2, y: my - lw / 2, w: len, h: lw, fill: null, stroke: col.hex, strokeWidth: lw, radius: 0, rotation: Math.atan2(byp - ay, bxp - ax), opacity: s.st.globalAlpha * col.alpha })
      }
    }
    replay(s, c => c.stroke())
  }

  const fillText = (text: string, x: number, y: number, maxWidth?: number) => {
    const s = snapshot(), col = colorOf(s.st.fillStyle), f = parseFont(s.st.font)
    if (!text || !col || !f || !plain(s) || maxWidth != null) return replay(s, c => (maxWidth != null ? c.fillText(text, x, y, maxWidth) : c.fillText(text, x, y)))
    const k = s.m.a, fs = f.size * k
    const ls = parseFloat(String(s.st.letterSpacing)) * k || 0
    const align: TextItem['align'] = s.st.textAlign === 'center' ? 'center' : s.st.textAlign === 'right' || s.st.textAlign === 'end' ? 'right' : 'left'
    // Where the alphabetic baseline sits, whatever baseline the page drew with.
    let baseline = y
    if (s.st.textBaseline !== 'alphabetic') {
      const a1 = base.measureText(text).actualBoundingBoxAscent
      base.save(); base.textBaseline = 'alphabetic'; const a0 = base.measureText(text).actualBoundingBoxAscent; base.restore()
      baseline = y - a1 + a0
    }
    const p = T(s, x, baseline)
    // Merge with the previous line when it continues the same paragraph.
    const prev = lastText
    if (prev && !bufDirty && items[items.length - 1] === prev.item) {
      const it = prev.item, gap = p.y - prev.last
      const same = it.fontFamily === f.family && it.fontSize === fs && it.fontWeight === f.weight && it.italic === f.italic && it.color === col.hex && it.align === align && Math.abs(it.letterSpacing - ls) < 0.01 && Math.abs(it.opacity - s.st.globalAlpha * col.alpha) < 0.01 && Math.abs(prev.anchor - p.x) < 0.5
      const fits = prev.lines > 1 ? Math.abs(gap - prev.spacing) < 0.6 : gap > fs * 0.9 && gap < fs * 2.2
      if (same && fits) {
        prev.spacing = gap; prev.last = p.y; prev.lines++
        it.text += '\n' + text
        it.lineHeight = gap / fs
        place(it, prev)
        return
      }
    }
    const it: TextItem = { kind: 'text', name: text.trim().slice(0, 40) || 'Text', text, fontFamily: f.family, fontSize: fs, fontWeight: f.weight, italic: f.italic, color: col.hex, align, lineHeight: 1.2, letterSpacing: ls, x: 0, y: 0, opacity: s.st.globalAlpha * col.alpha }
    const meta: TextMeta = { item: it, first: p.y, last: p.y, spacing: fs * 1.2, anchor: p.x, lines: 1 }
    place(it, meta)
    emit(it)
    lastText = meta
  }
  // Position the Editor's text box so its first baseline and anchor land exactly where the page drew them.
  const place = (it: TextItem, meta: TextMeta) => {
    base.save()
    base.setTransform(1, 0, 0, 1, 0, 0)
    base.font = `${it.italic ? 'italic ' : ''}${it.fontWeight} ${it.fontSize}px "${it.fontFamily}", Inter, system-ui, sans-serif`
    ;(base as any).letterSpacing = `${it.letterSpacing}px`
    let mw = 1
    for (const line of it.text.split('\n')) mw = Math.max(mw, base.measureText(line || ' ').width)
    base.restore()
    const w = Math.ceil(mw) + 4, lh = it.fontSize * it.lineHeight
    it.x = it.align === 'left' ? meta.anchor - 2 : it.align === 'center' ? meta.anchor - w / 2 : meta.anchor - w + 2
    it.y = meta.first - 2 - (lh - it.fontSize) / 2 - it.fontSize * 0.82
  }

  const drawImage = (img: CanvasImageSource, ...a: number[]) => {
    const s = snapshot()
    const iw = (img as any).width as number, ih = (img as any).height as number
    if ((a.length === 2 || a.length === 4) && plain(s) && iw && ih) {
      const [dx, dy] = a, dw = a.length === 4 ? a[2] : iw, dh = a.length === 4 ? a[3] : ih
      const p = T(s, dx, dy), pw = dw * s.m.a, ph = dh * s.m.d
      if (clipAllows(s, p.x, p.y, pw, ph)) {
        const c = document.createElement('canvas'); c.width = iw; c.height = ih
        c.getContext('2d')!.drawImage(img, 0, 0)
        return emit({ kind: 'image', name: 'Logo', canvas: c, x: p.x, y: p.y, scaleX: pw / iw, scaleY: ph / ih, opacity: s.st.globalAlpha })
      }
    }
    replay(s, c => (c.drawImage as any)(img, ...a))
  }

  const own: Record<string, any> = {
    fillRect, strokeRect, fill, stroke, fillText, drawImage,
    strokeText: (t: string, x: number, y: number) => { const s = snapshot(); replay(s, c => c.strokeText(t, x, y)) },
    clearRect: (x: number, y: number, w: number, h: number) => { const s = snapshot(); replay({ ...s, st: { ...s.st, globalCompositeOperation: 'source-over' } }, c => c.clearRect(x, y, w, h)) },
    beginPath: () => { path = []; base.beginPath() },
    clip: (...args: any[]) => { const rule = args.find(x => typeof x === 'string') as CanvasFillRule | undefined; clips = [...clips, { ops: path.slice(), rule }]; (base.clip as any)(...args) },
    save: () => { clipStack.push(clips); base.save() },
    restore: () => { clips = clipStack.pop() ?? []; base.restore() },
    reset: () => { path = []; clips = []; clipStack.length = 0; (base as any).reset?.() },
  }
  for (const op of PATH_OPS) own[op] = (...args: any[]) => { path.push({ op, args, m: base.getTransform() }); (base as any)[op](...args) }

  const ctx = new Proxy(base, {
    get(t, k) { if (typeof k === 'string' && k in own) return own[k]; const v = Reflect.get(t, k); return typeof v === 'function' ? v.bind(t) : v },
    set(t, k, v) { return Reflect.set(t, k, v) },
  }) as CanvasRenderingContext2D

  draw(ctx)
  flush()

  // A first shape covering the whole page is the board background, not a layer.
  let background: string | null = null
  const first = items[0]
  if (first && first.kind === 'shape' && first.shape === 'rect' && first.fill && !first.stroke && first.opacity >= 0.999 && first.x <= 0.5 && first.y <= 0.5 && first.w >= W - 0.5 && first.h >= H - 0.5) { background = first.fill; items.shift() }
  baseCanvas.width = 0; buf.width = 0
  return { background, items }
}
