// Asset intelligence: what an uploaded picture is, measured from its pixels.
//
// Pure functions over RGBA data so they run in tests and in workers. The DOM wrappers that
// turn a File or a canvas into pixels live in ./dom.ts. Everything here is deterministic;
// nothing is sent anywhere. Every value is a measurement ("detected"), never a brand rule.

export interface Rect { x: number; y: number; w: number; h: number }
export interface ColorCluster {
  hex: string
  /** Share of the solid pixels. */
  share: number
  /** Share of the outline (solid pixels that touch the background). 0 means enclosed by other colours, so it never meets the background. */
  edge: number
  luminance: number
  chroma: number
}
export type Tone = 'light' | 'dark' | 'mid' | 'mixed'
export type AssetKind = 'mark' | 'wordmark' | 'lockup' | 'unknown'

export interface AssetProfile {
  width: number
  height: number
  /** Visible artwork inside the image (alpha over 50%). */
  bounds: Rect
  /** Width over height of the artwork. */
  aspect: number
  /** Any transparent pixels at all (after a flat background was removed). */
  transparent: boolean
  /** Share of the artwork box that is solid (0..1). Low means an open, airy mark. */
  coverage: number
  /** Mean relative luminance of the solid pixels (0..1, WCAG). */
  luminance: number
  tone: Tone
  /** Solid-interior colours, largest area first. Anti-aliased edges never vote. */
  colors: ColorCluster[]
  /** One colour carries the mark. */
  mono: boolean
  /** Any colour with visible chroma (not black, white or grey). */
  chromatic: boolean
  /** Share of all edges that run between two colours inside the mark, rather than around it. High means the meaning sits in colour boundaries, so a flat knockout loses it. */
  internalEdges: number
  /** The two colours that share the most boundary inside the mark, when there is one. */
  boundary: [string, string] | null
  /** Thinnest stroke, as a fraction of the artwork height. Approximate. */
  minStroke: number
  /** Separate solid pieces that are not specks. */
  components: number
  kind: AssetKind
  /** Hex of a flat opaque background that was found and removed (a JPG on white), else null. */
  flatBackground: string | null
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const hex2 = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')
export const rgbHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`
const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
export const lumOf = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
export function hexLum(hex: string) { const n = parseInt(hex.slice(1, 7), 16); return lumOf(n >> 16, (n >> 8) & 255, n & 255) }

/** Nearest-neighbour downsample to at most `max` on the long side. Returns the same buffer when it already fits. */
export function shrink(data: Uint8ClampedArray, w: number, h: number, max = 360): { data: Uint8ClampedArray; w: number; h: number } {
  const k = Math.max(w, h) / max
  if (k <= 1) return { data, w, h }
  const nw = Math.max(1, Math.round(w / k)), nh = Math.max(1, Math.round(h / k))
  const out = new Uint8ClampedArray(nw * nh * 4)
  for (let y = 0; y < nh; y++) {
    const sy = Math.min(h - 1, Math.floor((y + 0.5) * k))
    for (let x = 0; x < nw; x++) {
      const sx = Math.min(w - 1, Math.floor((x + 0.5) * k))
      const s = (sy * w + sx) * 4, d = (y * nw + x) * 4
      out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = data[s + 3]
    }
  }
  return { data: out, w: nw, h: nh }
}

/**
 * A flat opaque background (a JPG on white, a PNG exported on a colour) is detected from the
 * four corners and turned into transparency in place. Returns its hex, or null when the
 * picture is already transparent or the corners disagree.
 */
export function knockOutFlatBackground(data: Uint8ClampedArray, w: number, h: number): string | null {
  const at = (x: number, y: number) => (y * w + x) * 4
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)]
  if (!corners.every(o => data[o + 3] > 250)) return null
  const bg = [0, 1, 2].map(ch => corners.reduce((a, o) => a + data[o + ch], 0) / 4)
  const flat = corners.every(o => Math.abs(data[o] - bg[0]) + Math.abs(data[o + 1] - bg[1]) + Math.abs(data[o + 2] - bg[2]) < 30)
  if (!flat) return null
  // A background must be the majority of the border, not just the corners.
  let border = 0, same = 0
  const test = (o: number) => { border++; if (Math.abs(data[o] - bg[0]) + Math.abs(data[o + 1] - bg[1]) + Math.abs(data[o + 2] - bg[2]) < 30) same++ }
  for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 200))) { test(at(x, 0)); test(at(x, h - 1)) }
  for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 200))) { test(at(0, y)); test(at(w - 1, y)) }
  if (same / border < 0.8) return null
  for (let o = 0; o < data.length; o += 4) {
    const dist = Math.abs(data[o] - bg[0]) + Math.abs(data[o + 1] - bg[1]) + Math.abs(data[o + 2] - bg[2])
    data[o + 3] = Math.round(clamp((dist - 24) / 60, 0, 1) * data[o + 3])
  }
  return rgbHex(bg[0], bg[1], bg[2])
}

/** Artwork bounds: pixels over half opaque. */
export function artworkBounds(data: Uint8ClampedArray, w: number, h: number): Rect {
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  if (x1 < 0) return { x: 0, y: 0, w, h }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/** Measure a picture. Works on a small copy; the caller keeps the original untouched. */
export function profilePixels(src: Uint8ClampedArray, srcW: number, srcH: number, opts: { alreadyKnockedOut?: boolean; flatBackground?: string | null } = {}): AssetProfile {
  const { data, w, h } = shrink(src, srcW, srcH, 360)
  const px = data === src ? new Uint8ClampedArray(src) : data
  const flatBackground = opts.alreadyKnockedOut ? (opts.flatBackground ?? null) : knockOutFlatBackground(px, w, h)
  const b = artworkBounds(px, w, h)
  const at = (x: number, y: number) => (y * w + x) * 4
  const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && px[at(x, y) + 3] >= 250

  // Solid mask: opaque with opaque neighbours on all four sides, so anti-aliasing is left out.
  const solid = new Uint8Array(w * h)
  let solidN = 0, anyTransparent = false
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (px[at(x, y) + 3] < 250) anyTransparent = true
    if (opaque(x, y) && opaque(x - 1, y) && opaque(x + 1, y) && opaque(x, y - 1) && opaque(x, y + 1)) { solid[y * w + x] = 1; solidN++ }
  }
  // A mark drawn with hairlines may have no interior at all: fall back to plain opaque pixels.
  if (solidN < 40) { solidN = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (opaque(x, y)) { solid[y * w + x] = 1; solidN++ } }

  // Colour clusters: quantise, then merge nearby buckets, largest first.
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>()
  let lumSum = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!solid[y * w + x]) continue
    const o = at(x, y), r = px[o], g = px[o + 1], bl = px[o + 2]
    lumSum += lumOf(r, g, bl)
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (bl >> 4)
    const bk = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 }
    bk.r += r; bk.g += g; bk.b += bl; bk.n++; buckets.set(key, bk)
  }
  const sorted = Array.from(buckets.values()).map(bk => ({ r: bk.r / bk.n, g: bk.g / bk.n, b: bk.b / bk.n, n: bk.n })).sort((a, c) => c.n - a.n)
  const clusters: { r: number; g: number; b: number; n: number }[] = []
  for (const bk of sorted) {
    const near = clusters.find(c => Math.abs(c.r - bk.r) + Math.abs(c.g - bk.g) + Math.abs(c.b - bk.b) < 72)
    if (near) { const n = near.n + bk.n; near.r = (near.r * near.n + bk.r * bk.n) / n; near.g = (near.g * near.n + bk.g * bk.n) / n; near.b = (near.b * near.n + bk.b * bk.n) / n; near.n = n }
    else clusters.push({ ...bk })
  }
  const total = Math.max(1, solidN)
  // Which cluster each solid pixel belongs to, for edge counting.
  const label = (o: number) => { let best = 0, bd = Infinity; for (let i = 0; i < clusters.length; i++) { const c = clusters[i]; const d = Math.abs(c.r - px[o]) + Math.abs(c.g - px[o + 1]) + Math.abs(c.b - px[o + 2]); if (d < bd) { bd = d; best = i } } return best }
  let internal = 0, outline = 0
  const edgeOf = new Float64Array(clusters.length)
  const pairs = new Map<string, number>()
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!solid[i]) continue
    const me = label(at(x, y))
    let touches = false
    for (const [nx, ny] of [[x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1]] as const) {
      if (nx >= w || ny >= h || nx < 0 || ny < 0) { touches = true; continue }
      const j = ny * w + nx
      if (!solid[j]) touches = true
      else if (nx > x || ny > y) { const other = label(at(nx, ny)); if (other !== me) { internal++; const k = me < other ? `${me}:${other}` : `${other}:${me}`; pairs.set(k, (pairs.get(k) ?? 0) + 1) } }
    }
    if (touches) { outline++; edgeOf[me]++ }
  }
  const internalEdges = internal + outline ? internal / (internal + outline) : 0
  const topPair = Array.from(pairs.entries()).sort((a, b) => b[1] - a[1])[0]
  const boundary: [string, string] | null = topPair && topPair[1] / Math.max(1, internal + outline) >= 0.04 ? (topPair[0].split(':').map(i => { const c = clusters[+i]; return rgbHex(c.r, c.g, c.b) }) as [string, string]) : null
  const colors: ColorCluster[] = clusters.map((c, i) => ({ hex: rgbHex(c.r, c.g, c.b), share: c.n / total, edge: outline ? edgeOf[i] / outline : 0, luminance: lumOf(c.r, c.g, c.b), chroma: (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255 }))
    .filter(c => c.share >= 0.02).sort((a, c) => c.share - a.share).slice(0, 8)
  if (!colors.length) colors.push({ hex: '#000000', share: 1, edge: 1, luminance: 0, chroma: 0 })

  // Thinnest stroke: chamfer distance to the nearest non-solid pixel, then the low end of the ridge.
  const dist = new Float32Array(w * h)
  const INF = 1e9
  for (let i = 0; i < w * h; i++) dist[i] = solid[i] ? INF : 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!solid[i]) continue; let d = dist[i]; if (x > 0) d = Math.min(d, dist[i - 1] + 1); if (y > 0) d = Math.min(d, dist[i - w] + 1); if (x > 0 && y > 0) d = Math.min(d, dist[i - w - 1] + 1.4); if (x < w - 1 && y > 0) d = Math.min(d, dist[i - w + 1] + 1.4); dist[i] = d }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!solid[i]) continue; let d = dist[i]; if (x < w - 1) d = Math.min(d, dist[i + 1] + 1); if (y < h - 1) d = Math.min(d, dist[i + w] + 1); if (x < w - 1 && y < h - 1) d = Math.min(d, dist[i + w + 1] + 1.4); if (x > 0 && y < h - 1) d = Math.min(d, dist[i + w - 1] + 1.4); dist[i] = d }
  const ridge: number[] = []
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; const d = dist[i]; if (!solid[i] || d >= INF) continue; if (d >= dist[i - 1] && d >= dist[i + 1] && d >= dist[i - w] && d >= dist[i + w]) ridge.push(d) }
  ridge.sort((a, c) => a - c)
  const thin = ridge.length ? ridge[Math.floor(ridge.length * 0.1)] : 1
  const minStroke = clamp(((thin * 2 - 1) + 0.5) / Math.max(1, b.h), 0.002, 1)

  // Connected pieces, ignoring specks under 0.2% of the artwork box.
  const seen = new Uint8Array(w * h)
  const pieces: { n: number; cx: number }[] = []
  const stack: number[] = []
  for (let s = 0; s < w * h; s++) {
    if (!solid[s] || seen[s]) continue
    let n = 0, sx = 0
    stack.push(s); seen[s] = 1
    while (stack.length) {
      const i = stack.pop()!; n++; sx += i % w
      const x = i % w, y = (i / w) | 0
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) { if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx; if (solid[j] && !seen[j]) { seen[j] = 1; stack.push(j) } }
    }
    if (n >= b.w * b.h * 0.002) pieces.push({ n, cx: sx / n })
  }
  const components = Math.max(1, pieces.length)
  const aspect = b.w / Math.max(1, b.h)
  const big = pieces.slice().sort((a, c) => c.n - a.n)[0]
  const bigShare = big ? big.n / total : 1
  const bigAtEnd = big ? (big.cx - b.x) / b.w < 0.3 || (big.cx - b.x) / b.w > 0.7 : false
  let kind: AssetKind = 'unknown'
  if (aspect <= 1.5) kind = 'mark'
  else if (components >= 3 && bigShare >= 0.28 && bigAtEnd) kind = 'lockup'
  else if (aspect >= 2.2 && components >= 3) kind = 'wordmark'
  else if (aspect >= 2.2 && components <= 2 && bigShare > 0.5) kind = 'mark'

  const luminance = lumSum / total
  const light = colors.filter(c => c.luminance >= 0.5).reduce((a, c) => a + c.share, 0)
  const dark = colors.filter(c => c.luminance <= 0.18).reduce((a, c) => a + c.share, 0)
  const tone: Tone = light >= 0.15 && dark >= 0.15 ? 'mixed' : luminance >= 0.5 ? 'light' : luminance <= 0.18 ? 'dark' : 'mid'
  const mono = colors[0].share >= 0.9 || colors.every(c => Math.abs(c.luminance - colors[0].luminance) < 0.06 && Math.abs(c.chroma - colors[0].chroma) < 0.12)
  const chromatic = colors.some(c => c.chroma > 0.12 && c.share >= 0.05)

  return {
    width: srcW, height: srcH,
    bounds: { x: Math.round(b.x * srcW / w), y: Math.round(b.y * srcH / h), w: Math.max(1, Math.round(b.w * srcW / w)), h: Math.max(1, Math.round(b.h * srcH / h)) },
    aspect, transparent: anyTransparent || flatBackground !== null, coverage: total / Math.max(1, b.w * b.h),
    luminance, tone, colors, mono, chromatic, internalEdges, boundary, minStroke, components, kind, flatBackground,
  }
}

/** Plain words for the detection, for a hint under the logo. */
export function describeProfile(p: AssetProfile): string {
  const kind = p.kind === 'mark' ? 'a symbol' : p.kind === 'wordmark' ? 'a wordmark' : p.kind === 'lockup' ? 'a symbol and wordmark lockup' : 'a logo'
  const colour = p.mono ? (p.tone === 'light' ? 'in white' : p.chromatic ? 'in one colour' : 'in one dark colour') : `in ${p.colors.filter(c => c.share >= 0.05).length} colours`
  const bg = p.flatBackground ? ', flat background removed' : p.transparent ? ', transparent' : ''
  return `Detected: ${kind} ${colour}${bg}.`
}
