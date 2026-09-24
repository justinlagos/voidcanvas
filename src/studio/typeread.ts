// Reads the type in a reference, on the device: finds the biggest line of lettering, measures
// its strokes, width, slant, contrast and serifs, sorts it into a class and suggests close
// Google fonts. It does not name the exact font; it tells you what kind of face it is.

export interface TypeRead {
  v: 1
  found: boolean
  cls?: string
  /** One line a designer would say. */
  summary?: string
  weight?: 'Light' | 'Regular' | 'Bold' | 'Black'
  width?: 'Condensed' | 'Normal' | 'Wide'
  italic?: boolean
  caps?: boolean
  contrast?: 'Low' | 'Medium' | 'High'
  serifs?: 'None' | 'Bracketed' | 'Slab' | 'Hairline'
  suggestions?: { family: string; weight: number }[]
  /** The line that was read, as fractions of the image. */
  box?: { x: number; y: number; w: number; h: number }
  sure?: 'rough' | 'fair' | 'good'
}

interface Comp { x0: number; y0: number; x1: number; y1: number; n: number }

/**
 * Read the type in an image. With `crop` (fractions of the image), only that area is read,
 * scaled up so small lettering is big enough to measure.
 */
export async function readType(blob: Blob, crop?: { x: number; y: number; w: number; h: number }): Promise<TypeRead> {
  const bmp = await createImageBitmap(blob)
  const sx = crop ? crop.x * bmp.width : 0, sy = crop ? crop.y * bmp.height : 0
  const sw = crop ? Math.max(4, crop.w * bmp.width) : bmp.width, sh = crop ? Math.max(4, crop.h * bmp.height) : bmp.height
  // Pad a crop so letters touching its edge are still whole glyphs.
  const pad = crop ? Math.round(Math.max(sw, sh) * 0.04) + 4 : 0
  const k = crop ? Math.min(4, 1100 / Math.max(sw, sh)) : Math.min(1, 1400 / Math.max(sw, sh))
  const W = Math.max(16, Math.round(sw * k) + pad * 2), H = Math.max(16, Math.round(sh * k) + pad * 2)
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.drawImage(bmp, sx - pad / k, sy - pad / k, sw + (pad * 2) / k, sh + (pad * 2) / k, 0, 0, W, H)
  const iw = bmp.width, ih = bmp.height
  bmp.close()
  // In a crop the letters are big, so the background is judged over a wider area.
  const r = readTypePixels(x.getImageData(0, 0, W, H).data, W, H, crop ? 1 / 5 : 1 / 30)
  if (r.box && crop) {
    // Back to fractions of the whole image.
    const ox = sx - pad / k, oy = sy - pad / k
    r.box = { x: (ox + (r.box.x * W) / k) / iw, y: (oy + (r.box.y * H) / k) / ih, w: (r.box.w * W) / k / iw, h: (r.box.h * H) / k / ih }
  }
  return r
}

export function readTypePixels(d: Uint8ClampedArray, W: number, H: number, window = 1 / 30): TypeRead {
  const N = W * H
  const G = new Float32Array(N)
  for (let i = 0; i < N; i++) G[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]
  // Local mean with an integral image.
  const I = new Float64Array((W + 1) * (H + 1))
  for (let y = 0; y < H; y++) { let s = 0; for (let x = 0; x < W; x++) { s += G[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + s } }
  const r = Math.max(12, Math.round(Math.max(W, H) * window))
  const M = new Float32Array(N)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(W, x + r + 1), y1 = Math.min(H, y + r + 1)
    M[y * W + x] = (I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0))
  }

  let best: { line: Comp[]; mask: Uint8Array; score: number } | null = null
  // Dark letters on light, then light letters on dark.
  for (const dark of [true, false]) {
    const mask = new Uint8Array(N)
    for (let i = 0; i < N; i++) { const dv = dark ? M[i] - G[i] : G[i] - M[i]; if (dv > 18) mask[i] = 1 }
    // Label on an opened copy so thin lines crossing the letters do not join them up.
    const comps = components(open1(mask, W, H), W, H)
    const glyphs = comps.filter(cp => {
      const w = cp.x1 - cp.x0 + 1, h = cp.y1 - cp.y0 + 1, fill = cp.n / (w * h)
      return h >= 14 && h < H * 0.5 && w >= 3 && w < h * 4 && fill > 0.08 && fill < 0.92 && cp.x0 > 0 && cp.y0 > 0 && cp.x1 < W - 1 && cp.y1 < H - 1
    })
    for (const line of lines(glyphs)) {
      const q = lineQuality(line, mask, G, M, W)
      if (q.score <= 0) continue
      if (!best || q.score > best.score) best = { line, mask, score: q.score }
    }
  }
  if (!best) return { v: 1, found: false }
  return measure(best.line, best.mask, W, H)
}

function components(mask: Uint8Array, W: number, H: number): Comp[] {
  const seen = new Uint8Array(mask.length), out: Comp[] = [], st: number[] = []
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || seen[i]) continue
    const c: Comp = { x0: W, y0: H, x1: 0, y1: 0, n: 0 }
    st.push(i); seen[i] = 1
    while (st.length) {
      const p = st.pop()!, x = p % W, y = (p / W) | 0
      c.n++
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const q = ny * W + nx; if (mask[q] && !seen[q]) { seen[q] = 1; st.push(q) }
      }
    }
    if (c.n > 25) out.push(c)
  }
  return out
}

/**
 * How much a line looks like lettering rather than texture: letters share a baseline,
 * have even strokes, and stand out clearly from what is behind them.
 */
function lineQuality(line: Comp[], mask: Uint8Array, G: Float32Array, M: Float32Array, W: number) {
  const hs = line.map(g => g.y1 - g.y0 + 1).sort((a, b) => a - b), h = hs[hs.length >> 1]
  const bottoms = line.map(g => g.y1).sort((a, b) => a - b), base = bottoms[bottoms.length >> 1]
  const onBase = line.filter(g => Math.abs(g.y1 - base) <= Math.max(2, h * 0.1)).length / line.length
  const strokes: number[] = []; let diff = 0, n = 0
  for (const g of line) {
    const runs: number[] = []
    for (const f of [0.3, 0.5, 0.7]) {
      const y = Math.round(g.y0 + (g.y1 - g.y0) * f); let run = 0
      for (let x = g.x0; x <= g.x1 + 1; x++) { const i = y * W + x; if (x <= g.x1 && mask[i]) { run++; diff += Math.abs(G[i] - M[i]); n++ } else { if (run >= Math.max(2, (g.y1 - g.y0) * 0.04)) runs.push(run); run = 0 } }
    }
    if (runs.length) { runs.sort((a, b) => a - b); strokes.push(runs[Math.floor(runs.length * 0.25)]) }
  }
  const mean = strokes.reduce((a, b) => a + b, 0) / Math.max(1, strokes.length)
  const cv = Math.sqrt(strokes.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, strokes.length)) / Math.max(1, mean)
  const contrast = n ? diff / n : 0
  const even = line.filter(g => { const gh = g.y1 - g.y0 + 1; return gh > h * 0.45 && gh < h * 1.9 }).length / line.length
  const fills = line.map(g => g.n / ((g.x1 - g.x0 + 1) * (g.y1 - g.y0 + 1))).sort((a, b) => a - b), fillMed = fills[fills.length >> 1]
  if (even < 0.55 || fillMed > 0.85 || onBase < 0.5 || cv > 0.8 || contrast < 28 || line.length < 3) return { score: 0 }
  const score = h * h * Math.min(line.length, 8) * onBase * onBase * even * (cv < 0.45 ? 1 : 0.6) * Math.min(1.5, contrast / 50)
  return { score, h, onBase, cv, contrast }
}

/** Group glyphs into lines: similar height, same band, close together. */
function lines(gs: Comp[]): Comp[][] {
  const sorted = [...gs].sort((a, b) => a.x0 - b.x0)
  const open: Comp[][] = []
  for (const g of sorted) {
    const h = g.y1 - g.y0 + 1, cy = (g.y0 + g.y1) / 2
    let home: Comp[] | null = null
    for (const l of open) {
      const last = l[l.length - 1], lh = last.y1 - last.y0 + 1, lcy = (last.y0 + last.y1) / 2
      const gap = g.x0 - last.x1
      if (h / lh > 0.5 && h / lh < 2 && Math.abs(cy - lcy) < Math.max(h, lh) * 0.45 && gap > -lh * 0.2 && gap < Math.max(h, lh) * 1.1) { home = l; break }
    }
    if (home) home.push(g); else open.push([g])
  }
  return open.filter(l => l.length >= 3)
}

function measure(line: Comp[], mask: Uint8Array, W: number, H: number): TypeRead {
  const x0 = Math.min(...line.map(g => g.x0)), y0 = Math.min(...line.map(g => g.y0)), x1 = Math.max(...line.map(g => g.x1)), y1 = Math.max(...line.map(g => g.y1))
  const bw = x1 - x0 + 3, bh = y1 - y0 + 3
  // Measure on the original mask (hairlines intact), inside each glyph's box, with a 1px border.
  const m = new Uint8Array(bw * bh)
  for (const g of line) for (let y = g.y0; y <= g.y1; y++) for (let x = g.x0; x <= g.x1; x++) if (mask[y * W + x]) m[(y - y0 + 1) * bw + (x - x0 + 1)] = 1
  const hs = line.map(g => g.y1 - g.y0 + 1).sort((a, b) => a - b)
  const hMax = hs[hs.length - 1]
  const caps = hs.filter(h => h > hMax * 0.86).length / hs.length > 0.72
  const bases = line.map(g => g.y1).sort((a, b) => a - b), base = bases[bases.length >> 1]
  const tops = line.map(g => g.y0).sort((a, b) => a - b)
  // Height of the small letters (or capitals when set in capitals).
  const xh = caps ? hs[hs.length >> 1] : Math.max(4, base - tops[Math.floor(tops.length * 0.7)])
  const onBase = line.filter(g => Math.abs(g.y1 - base) <= xh * 0.08)
  const at = (x: number, y: number) => m[(y - y0 + 1) * bw + (x - x0 + 1)]

  // Stems: horizontal runs across the middle of each letter. Bars and bowls: vertical runs down its centre.
  const stems: number[] = [], bars: number[] = []
  for (const g of onBase) {
    const gw = g.x1 - g.x0 + 1
    for (const f of [0.35, 0.5, 0.65]) {
      const y = Math.round(base - xh * f); let run = 0
      for (let x = g.x0; x <= g.x1 + 1; x++) { if (x <= g.x1 && at(x, y)) run++; else { if (run && run < gw * 0.6) stems.push(run); run = 0 } }
    }
    for (const f of [0.4, 0.5, 0.6]) {
      const x = Math.round(g.x0 + gw * f); let run = 0
      for (let y = Math.round(base - xh); y <= base + 1; y++) { if (y <= base && at(x, y)) run++; else { if (run && run < xh * 0.45) bars.push(run); run = 0 } }
    }
  }
  const med = (v: number[]) => { if (!v.length) return 0; const t = [...v].sort((a, b) => a - b); return t[t.length >> 1] }
  const stroke = Math.max(1, med(stems)), thin = Math.max(1, Math.min(med(bars) || stroke, stroke))
  const contrastR = stroke / thin
  const weightR = stroke / xh / (caps ? 1 : 1.35)

  // Width of the letters against their height.
  const ws = onBase.filter(g => caps || g.y0 >= base - xh * 1.1).map(g => (g.x1 - g.x0 + 1) / xh).sort((a, b) => a - b)
  const widthR = ws.length ? ws[ws.length >> 1] : 0.7
  const wideR = ws.length ? ws[Math.floor(ws.length * 0.8)] : 0.8

  // Slant: how far the stems lean between two heights.
  const slopes: number[] = []
  {
    const yl = Math.round(base - xh * 0.25), yu = Math.round(base - xh * 0.75)
    for (const g of onBase) {
      const runs = (y: number) => { const out: number[] = []; let st = -1; for (let x = g.x0; x <= g.x1 + 1; x++) { const on = x <= g.x1 && at(x, y); if (on && st < 0) st = x; if (!on && st >= 0) { if (x - st >= stroke * 0.5 && x - st <= stroke * 1.8) out.push((st + x - 1) / 2); st = -1 } } return out }
      const lo = runs(yl), hi = runs(yu)
      for (const c of lo) { let bestD = Infinity, bc = 0; for (const d of hi) if (Math.abs(d - c) < bestD) { bestD = Math.abs(d - c); bc = d } if (bestD < xh * 0.35) slopes.push((bc - c) / (yl - yu)) }
    }
  }
  const bestS = med(slopes)
  const italic = slopes.length >= 3 && Math.abs(bestS) >= 0.07

  // Serifs: feet on the baseline that stick out on both sides of the stem above them.
  let feet = 0, tested = 0; const footT: number[] = []
  const sw = stroke
  for (const g of onBase) {
    const runsAt = (y: number) => { const out: [number, number][] = []; let st = -1; for (let x = g.x0; x <= g.x1 + 1; x++) { const on = x <= g.x1 && at(x, y); if (on && st < 0) st = x; if (!on && st >= 0) { out.push([st, x - 1]); st = -1 } } return out }
    const ya = Math.round(base - xh * 0.3)
    const up = runsAt(ya).filter(([a, b]) => b - a + 1 <= sw * 1.7 && b - a + 1 >= sw * 0.5)
    if (!up.length) continue
    tested++
    // The widest of the bottom few rows, so hairline feet are caught.
    let hit = false
    for (const [a, b] of up) {
      let best = 0
      for (let y = base; y >= base - Math.max(2, Math.round(xh * 0.06)); y--) {
        const foot = runsAt(y).find(([c, d]) => c <= a + 1 && d >= b - 1)
        if (foot && a - foot[0] >= sw * 0.35 && foot[1] - b >= sw * 0.35) best = Math.max(best, 1)
      }
      if (best) {
        hit = true
        let t = 0; for (let y = base + 2; y > ya; y--) { const rr = runsAt(y).find(([c, d]) => c <= a && d >= b); if (rr && rr[1] - rr[0] > (b - a) + sw * 0.6) t++ }
        footT.push(t)
      }
    }
    if (hit) feet++
  }
  const serifShare = tested ? feet / tested : 0
  const footThick = med(footT) / Math.max(1, thin)
  const serif = tested >= 2 && serifShare > 0.3
  // Joined letters: few, wide pieces for the length of the line.
  const conn = line.filter(g => (g.x1 - g.x0 + 1) / xh > 1.8).length / line.length
  const script = !caps && (conn > 0.3 || (italic && conn > 0.15))

  // Narrow letters look heavier at the same stroke, so weigh strokes against letter width there.
  const narrow = widthR < (caps ? 0.56 : 0.66)
  const wv = narrow ? weightR / Math.max(0.3, widthR) * 0.42 : weightR
  const weight: TypeRead['weight'] = wv < 0.1 ? 'Light' : wv < 0.17 ? 'Regular' : wv < 0.25 ? 'Bold' : 'Black'
  const width: TypeRead['width'] = narrow ? 'Condensed' : widthR > (caps ? 0.9 : 1.15) ? 'Wide' : 'Normal'
  const contrast: TypeRead['contrast'] = contrastR > 2.6 ? 'High' : contrastR > 1.55 ? 'Medium' : 'Low'
  const serifs: TypeRead['serifs'] = contrastR > 3 && !script ? 'Hairline' : !serif ? 'None' : contrast === 'High' ? 'Hairline' : contrast === 'Low' && footThick > 0.6 ? 'Slab' : 'Bracketed'
  const w = weight === 'Light' ? 300 : weight === 'Regular' ? 400 : weight === 'Bold' ? 700 : 900
  const geometric = wideR > (caps ? 1.05 : 1.2)
  const hMed = xh
  let cls: string, sug: [string, number][]
  if (script) { cls = 'Script'; sug = weight === 'Bold' || weight === 'Black' ? [['Pacifico', 400], ['Yellowtail', 400], ['Kaushan Script', 400]] : [['Dancing Script', 500], ['Great Vibes', 400], ['Satisfy', 400]] }
  else if (serifs === 'Hairline') { cls = 'High-contrast serif (Didone)'; sug = [['Playfair Display', w], ['Bodoni Moda', w], ['DM Serif Display', 400]] }
  else if (serifs === 'Slab') { cls = 'Slab serif'; sug = [['Roboto Slab', w], ['Zilla Slab', Math.min(700, w)], ['Arvo', w >= 700 ? 700 : 400]] }
  else if (serif || (italic && contrastR > 1.75)) { cls = serif ? 'Serif' : 'Italic serif'; sug = weight === 'Bold' || weight === 'Black' ? [['Fraunces', w], ['Lora', 700], ['Libre Baskerville', 700]] : [['Lora', w], ['EB Garamond', w], ['Libre Caslon Text', 400]] }
  else if (width === 'Condensed') { cls = 'Condensed sans'; sug = weight === 'Bold' || weight === 'Black' ? [['Bebas Neue', 400], ['Anton', 400], ['Oswald', 700]] : [['Oswald', w], ['Bebas Neue', 400], ['Barlow Condensed', w]] }
  else if (contrastR > 1.6) { cls = 'Humanist sans'; sug = [['Source Sans 3', w], ['Open Sans', w], ['Nunito Sans', w]] }
  else if (width === 'Wide' || geometric) { cls = 'Geometric sans'; sug = [['Poppins', w], ['Montserrat', w], ['Outfit', w]] }
  else { cls = 'Neutral sans'; sug = weight === 'Black' ? [['Archivo Black', 400], ['Inter', 900], ['Poppins', 900]] : [['Inter', w], ['Poppins', w], ['Work Sans', w]] }

  const parts = [weight, width !== 'Normal' && !cls.toLowerCase().includes(width.toLowerCase()) ? width.toLowerCase() : '', italic && !script && !cls.startsWith('Italic') ? 'italic' : '', cls.toLowerCase()].filter(Boolean)
  const summary = `${parts.join(' ').replace(/^./, s => s.toUpperCase())}${caps ? ', set in capitals' : ''}${contrast === 'High' && serifs !== 'Hairline' ? ', strong thick-thin contrast' : ''}.`
  const sure: TypeRead['sure'] = hMed < 22 || line.length < 4 ? 'rough' : hMed < 40 ? 'fair' : 'good'
  return {
    v: 1, found: true, cls, summary, weight, width, italic, caps, contrast, serifs,
    suggestions: sug.map(([family, weight]) => ({ family, weight })),
    box: { x: x0 / W, y: y0 / H, w: (x1 - x0 + 1) / W, h: (y1 - y0 + 1) / H }, sure,
  }
}

/** Erode then dilate by one pixel (3 × 3). */
function open1(m: Uint8Array, W: number, H: number) {
  const e = new Uint8Array(m.length), o = new Uint8Array(m.length)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; e[i] = m[i] & m[i - 1] & m[i + 1] & m[i - W] & m[i + W] & m[i - W - 1] & m[i - W + 1] & m[i + W - 1] & m[i + W + 1] }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; o[i] = e[i] | e[i - 1] | e[i + 1] | e[i - W] | e[i + W] | e[i - W - 1] | e[i - W + 1] | e[i + W - 1] | e[i + W + 1] }
  return o
}

