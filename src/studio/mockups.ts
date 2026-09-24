// Photo mockups rendered on the device.
// Each scene is a real photo of a blank surface. The design is warped onto the surface, then the
// photo's own light is laid over it: shadows, folds, paper and fabric colour all come from the photo.
// The same renderer works on the designer's own photo, with the surface found automatically.

export type Pt = { x: number; y: number }
export type Finish = 'print' | 'fabric' | 'screen'
export interface Surface {
  /** Corners as fractions of the photo: top left, top right, bottom right, bottom left. */
  q: [number, number][]
  /** Width over height of the real surface. */
  aspect: number
  finish: Finish
  /** Corner radius as a share of the surface width (phone screens). */
  radius?: number
  /** Part of the design this surface shows, across (0 to 1). Used for spreads. */
  span?: [number, number]
}
export interface Scene { id: string; label: string; group: 'Print' | 'Screen' | 'Outdoor' | 'Merch'; surfaces: Surface[] }

const S = (q: number[][], aspect: number, finish: Finish, extra: Partial<Surface> = {}): Surface => ({ q: q as [number, number][], aspect, finish, ...extra })

export const SCENES: Scene[] = [
  { id: 'wall', label: 'Poster on a street wall', group: 'Outdoor', surfaces: [S([[0.30537, 0.21934], [0.71692, 0.21531], [0.72148, 0.73092], [0.32704, 0.72955]], 0.64, 'print')] },
  { id: 'billboard', label: '48-sheet billboard', group: 'Outdoor', surfaces: [S([[0.20718, 0.24629], [0.8325, 0.07492], [0.83661, 0.5365], [0.20164, 0.59279]], 2, 'print')] },
  { id: 'shelter', label: 'Bus shelter lightbox', group: 'Outdoor', surfaces: [S([[0.37392, 0.2376], [0.67488, 0.25934], [0.6776, 0.64294], [0.37759, 0.66449]], 0.667, 'screen')] },
  { id: 'window', label: 'Shop window poster', group: 'Outdoor', surfaces: [S([[0.2885, 0.10408], [0.7846, 0.17563], [0.7846, 0.76866], [0.2885, 0.83527]], 0.707, 'print')] },
  { id: 'rollup', label: 'Roll-up banner', group: 'Print', surfaces: [S([[0.2747, 0.04193], [0.72277, 0.04215], [0.7243, 0.89741], [0.26811, 0.89836]], 0.425, 'print')] },
  { id: 'desk', label: 'A4 flyer on a desk', group: 'Print', surfaces: [S([[0.29757, 0.14218], [0.64293, 0.08241], [0.70341, 0.8353], [0.34236, 0.88801]], 0.707, 'print')] },
  { id: 'magazine', label: 'Magazine spread', group: 'Print', surfaces: [S([[0.1129, 0.09492], [0.49853, 0.09934], [0.50147, 0.87638], [0.09677, 0.87859]], 0.75, 'print', { span: [0, 0.5] }), S([[0.49853, 0.09934], [0.87977, 0.09272], [0.90616, 0.87196], [0.50147, 0.87638]], 0.75, 'print', { span: [0.5, 1] })] },
  { id: 'cards', label: 'Business cards', group: 'Print', surfaces: [S([[0.5014, 0.13785], [0.84513, 0.29119], [0.79633, 0.61234], [0.45924, 0.44331]], 1.545, 'print'), S([[0.18807, 0.55541], [0.55969, 0.50024], [0.60319, 0.77677], [0.19984, 0.83837]], 1.545, 'print')] },
  { id: 'phone', label: 'Phone in hand', group: 'Screen', surfaces: [S([[0.31537, 0.15179], [0.67441, 0.15179], [0.67118, 0.76747], [0.32799, 0.77294]], 0.46, 'screen', { radius: 0.1 })] },
  { id: 'laptop', label: 'Laptop', group: 'Screen', surfaces: [S([[0.25451, 0.10294], [0.74473, 0.10294], [0.7434, 0.56524], [0.2559, 0.56647]], 1.6, 'screen')] },
  { id: 'tote', label: 'Tote bag', group: 'Merch', surfaces: [S([[0.35, 0.5], [0.67, 0.5], [0.67, 0.78], [0.35, 0.78]], 0.9, 'fabric')] },
  { id: 'tshirt', label: 'T-shirt', group: 'Merch', surfaces: [S([[0.33, 0.3], [0.66, 0.3], [0.66, 0.62], [0.33, 0.62]], 0.83, 'fabric')] },
]

/** Width over height of the whole design a scene shows (a spread shows two pages). */
export const sceneAspect = (s: Scene) => { const f = s.surfaces[0]; return f.span ? f.aspect / (f.span[1] - f.span[0]) : f.aspect }
/** The scene whose surface shape is closest to the design's. */
export function bestScene(aspect: number) {
  return SCENES.reduce((b, s) => (Math.abs(Math.log(sceneAspect(s) / aspect)) < Math.abs(Math.log(sceneAspect(b) / aspect)) ? s : b), SCENES[0])
}

export const sceneUrl = (id: string, thumb = false) => `/mockups/${id}${thumb ? '_t' : ''}.jpg`
const photos = new Map<string, Promise<HTMLImageElement>>()
export function loadScenePhoto(id: string) {
  if (!photos.has(id)) photos.set(id, new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => { photos.delete(id); no(new Error('Could not load the mockup photo')) }; i.src = sceneUrl(id) }))
  return photos.get(id)!
}

// ─── Geometry ─────────────────────────────────────────────────────

/** Matrix that maps the unit square to a quad (tl, tr, br, bl), and its inverse. */
function squareToQuad(q: Pt[]) {
  const [p0, p1, p2, p3] = q
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dy1 = p1.y - p2.y, dy2 = p3.y - p2.y
  const sx = p0.x - p1.x + p2.x - p3.x, sy = p0.y - p1.y + p2.y - p3.y
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den
  return [p1.x - p0.x + g * p1.x, p3.x - p0.x + h * p3.x, p0.x, p1.y - p0.y + g * p1.y, p3.y - p0.y + h * p3.y, p0.y, g, h, 1]
}
function invert3(m: number[]) {
  const [a, b, c, d, e, f, g, h, i] = m
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g
  const det = a * A + b * B + c * C || 1e-12
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det]
}

/** Draw `src` into the quad with a triangle mesh. Kept for quick previews. */
export function drawInQuad(x: CanvasRenderingContext2D, src: CanvasImageSource & { width: number; height: number }, quad: Pt[], N = 24) {
  const m = squareToQuad(quad), W = src.width, Hh = src.height
  const H = (u: number, v: number): Pt => { const w = m[6] * u + m[7] * v + 1; return { x: (m[0] * u + m[1] * v + m[2]) / w, y: (m[3] * u + m[4] * v + m[5]) / w } }
  const tri = (s0: Pt, s1: Pt, s2: Pt, d0: Pt, d1: Pt, d2: Pt) => {
    x.save(); x.beginPath()
    const cx = (d0.x + d1.x + d2.x) / 3, cy = (d0.y + d1.y + d2.y) / 3, gr = (p: Pt) => ({ x: p.x + (p.x - cx) * 0.02, y: p.y + (p.y - cy) * 0.02 })
    const a = gr(d0), b = gr(d1), c = gr(d2)
    x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.lineTo(c.x, c.y); x.closePath(); x.clip()
    const den = s0.x * (s2.y - s1.y) - s1.x * s2.y + s2.x * s1.y + (s1.x - s2.x) * s0.y
    if (Math.abs(den) < 1e-9) { x.restore(); return }
    const m11 = -(s0.y * (d2.x - d1.x) - s1.y * d2.x + s2.y * d1.x + (s1.y - s2.y) * d0.x) / den
    const m12 = (s1.y * d2.y + s0.y * (d1.y - d2.y) - s2.y * d1.y + (s2.y - s1.y) * d0.y) / den
    const m21 = (s0.x * (d2.x - d1.x) - s1.x * d2.x + s2.x * d1.x + (s1.x - s2.x) * d0.x) / den
    const m22 = -(s1.x * d2.y + s0.x * (d1.y - d2.y) - s2.x * d1.y + (s2.x - s1.x) * d0.y) / den
    const dx = (s0.x * (s2.y * d1.x - s1.y * d2.x) + s0.y * (s1.x * d2.x - s2.x * d1.x) + (s2.x * s1.y - s1.x * s2.y) * d0.x) / den
    const dy = (s0.x * (s2.y * d1.y - s1.y * d2.y) + s0.y * (s1.x * d2.y - s2.x * d1.y) + (s2.x * s1.y - s1.x * s2.y) * d0.y) / den
    x.transform(m11, m12, m21, m22, dx, dy); x.drawImage(src, 0, 0); x.restore()
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u0 = i / N, v0 = j / N, u1 = (i + 1) / N, v1 = (j + 1) / N
    const s00 = { x: u0 * W, y: v0 * Hh }, s10 = { x: u1 * W, y: v0 * Hh }, s01 = { x: u0 * W, y: v1 * Hh }, s11 = { x: u1 * W, y: v1 * Hh }
    const d00 = H(u0, v0), d10 = H(u1, v0), d01 = H(u0, v1), d11 = H(u1, v1)
    tri(s00, s10, s11, d00, d10, d11); tri(s00, s11, s01, d00, d11, d01)
  }
}

// ─── Rendering ────────────────────────────────────────────────────

export interface RenderOptions {
  /** Fill crops the design to the surface; fit shows all of it with the surface around it. */
  fit?: 'fill' | 'fit'
  /** Keep things that sit in front of the surface (a hand, a frame) in front of the design. */
  keepFront?: boolean
}

const lumOf = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b

/** Box blur of a single-channel image, in place, radius r (two passes, separable). */
function blur1(a: Float32Array, w: number, h: number, r: number) {
  const t = new Float32Array(a.length), n = r * 2 + 1
  for (let y = 0; y < h; y++) { let s = 0; const o = y * w; for (let x = -r; x <= r; x++) s += a[o + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { t[o + x] = s / n; s += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)] } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { a[y * w + x] = s / n; s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x] } }
}

/**
 * Place the design on every surface of a photo.
 * `photo` is any image; `surfaces` use fractions of it. Returns a canvas the size of the photo.
 */
export function renderOnPhoto(photo: CanvasImageSource & { width: number; height: number }, surfaces: Surface[], art: HTMLCanvasElement, o: RenderOptions = {}): HTMLCanvasElement {
  const W = photo.width, H = photo.height
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.drawImage(photo, 0, 0)
  const img = x.getImageData(0, 0, W, H), P = img.data
  const out = new Uint8ClampedArray(P)
  const ax = art.getContext('2d', { willReadFrequently: true })!
  const A = ax.getImageData(0, 0, art.width, art.height).data, aw = art.width, ah = art.height
  const artAspect = aw / ah

  for (const s of surfaces) {
    const q = s.q.map(([u, v]) => ({ x: u * W, y: v * H }))
    const inv = invert3(squareToQuad(q))
    const minX = Math.max(0, Math.floor(Math.min(...q.map(p => p.x))) - 1), maxX = Math.min(W - 1, Math.ceil(Math.max(...q.map(p => p.x))) + 1)
    const minY = Math.max(0, Math.floor(Math.min(...q.map(p => p.y))) - 1), maxY = Math.min(H - 1, Math.ceil(Math.max(...q.map(p => p.y))) + 1)
    const bw = maxX - minX + 1, bh = maxY - minY + 1
    // Surface size in photo pixels, for smooth edges and rounded corners.
    const lenU = (Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y) + Math.hypot(q[2].x - q[3].x, q[2].y - q[3].y)) / 2
    const lenV = (Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y) + Math.hypot(q[2].x - q[1].x, q[2].y - q[1].y)) / 2

    // Where each photo pixel lands on the surface.
    const U = new Float32Array(bw * bh), V = new Float32Array(bw * bh), inside = new Uint8Array(bw * bh)
    for (let yy = 0; yy < bh; yy++) for (let xx = 0; xx < bw; xx++) {
      const px = minX + xx + 0.5, py = minY + yy + 0.5
      const w = inv[6] * px + inv[7] * py + inv[8]
      const u = (inv[0] * px + inv[1] * py + inv[2]) / w, v = (inv[3] * px + inv[4] * py + inv[5]) / w
      const k = yy * bw + xx; U[k] = u; V[k] = v
      if (u > -0.01 && u < 1.01 && v > -0.01 && v < 1.01) inside[k] = 1
    }

    // The surface's own light: luminance, and the level that counts as its white.
    const L = new Float32Array(bw * bh)
    const hist = new Uint32Array(256); let count = 0
    for (let yy = 0; yy < bh; yy++) for (let xx = 0; xx < bw; xx++) {
      const k = yy * bw + xx, i = ((minY + yy) * W + minX + xx) * 4
      L[k] = lumOf(P[i], P[i + 1], P[i + 2])
      if (inside[k] && U[k] > 0.03 && U[k] < 0.97 && V[k] > 0.03 && V[k] < 0.97) { hist[Math.min(255, L[k] | 0)]++; count++ }
    }
    let acc = 0, ref = 255
    for (let b = 255; b >= 0; b--) { acc += hist[b]; if (acc >= count * 0.03) { ref = Math.max(40, b); break } }
    // Paper white per channel, so a cream tote or warm sunlight tints the print.
    let rr = 0, rg = 0, rb = 0, rn = 0
    for (let yy = 0; yy < bh; yy++) for (let xx = 0; xx < bw; xx++) { const k = yy * bw + xx; if (inside[k] && L[k] >= ref) { const i = ((minY + yy) * W + minX + xx) * 4; rr += P[i]; rg += P[i + 1]; rb += P[i + 2]; rn++ } }
    const white = rn ? [rr / rn, rg / rn, rb / rn] : [ref, ref, ref]

    // Fabric folds bend the print: offsets from the slope of the blurred light.
    let gx: Float32Array | null = null, gy: Float32Array | null = null
    if (s.finish === 'fabric') {
      const Lb = new Float32Array(L); blur1(Lb, bw, bh, Math.max(2, Math.round(lenU / 180)))
      gx = new Float32Array(bw * bh); gy = new Float32Array(bw * bh)
      for (let yy = 1; yy < bh - 1; yy++) for (let xx = 1; xx < bw - 1; xx++) { const k = yy * bw + xx; gx[k] = (Lb[k + 1] - Lb[k - 1]) / ref; gy[k] = (Lb[k + bw] - Lb[k - bw]) / ref }
    }
    // Things in front of the surface differ from its colour: skin, frames, fingers.
    const front = o.keepFront ? new Float32Array(bw * bh) : null
    if (front) {
      for (let k = 0; k < bw * bh; k++) {
        if (!inside[k]) continue
        const i = ((minY + ((k / bw) | 0)) * W + minX + (k % bw)) * 4
        const r = P[i] / white[0], g = P[i + 1] / white[1], b = P[i + 2] / white[2]
        const chroma = Math.max(r, g, b) - Math.min(r, g, b), dark = 1 - L[k] / ref
        front[k] = Math.min(1, Math.max(0, (chroma - 0.12) * 6) + Math.max(0, (dark - 0.62) * 4))
      }
      blur1(front, bw, bh, 1)
    }

    // Design placement on the surface.
    const span = s.span ?? [0, 1], full = s.aspect / (span[1] - span[0])
    const fill = (o.fit ?? (Math.abs(Math.log(artAspect / full)) < 0.15 ? 'fill' : 'fit')) === 'fill'
    // Scale from surface position to design position: under 1 crops, over 1 leaves the surface showing.
    let kx = full / artAspect, ky = 1
    const n = fill ? Math.max(kx, ky) : Math.min(kx, ky); kx /= n; ky /= n
    const rad = (s.radius ?? 0) * lenU
    const disp = s.finish === 'fabric' ? 0.9 : 0

    for (let yy = 0; yy < bh; yy++) for (let xx = 0; xx < bw; xx++) {
      const k = yy * bw + xx
      if (!inside[k]) continue
      let u = U[k], v = V[k]
      // Smooth edge, and rounded corners measured in photo pixels.
      const du = Math.min(u, 1 - u) * lenU, dv = Math.min(v, 1 - v) * lenV
      let cov = Math.min(1, Math.max(0, du + 0.5)) * Math.min(1, Math.max(0, dv + 0.5))
      if (rad > 0 && du < rad && dv < rad) cov *= Math.min(1, Math.max(0, rad - Math.hypot(rad - du, rad - dv) + 0.5))
      if (cov <= 0) continue
      if (gx && gy) { u += gx[k] * disp * 0.02; v += gy[k] * disp * 0.02 }
      // From surface position to design pixel.
      const gu = span[0] + u * (span[1] - span[0])
      const fx = (0.5 + (gu - 0.5) * kx) * aw - 0.5, fy = (0.5 + (v - 0.5) * ky) * ah - 0.5
      let ar = 0, ag = 0, ab = 0, aa = 0
      if (fx > -1 && fy > -1 && fx < aw && fy < ah) {
        const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0
        for (let j = 0; j < 4; j++) {
          const xi = Math.min(aw - 1, Math.max(0, x0 + (j & 1))), yi = Math.min(ah - 1, Math.max(0, y0 + (j >> 1)))
          const wgt = ((j & 1) ? tx : 1 - tx) * ((j >> 1) ? ty : 1 - ty) * ((x0 + (j & 1) < 0 || x0 + (j & 1) >= aw || y0 + (j >> 1) < 0 || y0 + (j >> 1) >= ah) ? 0 : 1)
          const ai = (yi * aw + xi) * 4, al = (A[ai + 3] / 255) * wgt
          ar += A[ai] * al; ag += A[ai + 1] * al; ab += A[ai + 2] * al; aa += al
        }
        if (aa > 0) { ar /= aa; ag /= aa; ab /= aa }
      }
      const pi = ((minY + yy) * W + minX + xx) * 4
      const pr = P[pi], pg = P[pi + 1], pb = P[pi + 2]
      let r: number, g: number, b: number
      if (s.finish === 'screen') {
        // A screen or lightbox gives off its own light; keep a trace of the photo's falloff and glare.
        // Around a design that does not fill it, the screen is dark.
        const sh = 0.8 + 0.2 * Math.min(1.1, L[k] / ref)
        r = ar * aa * sh + 8 * (1 - aa); g = ag * aa * sh + 8 * (1 - aa); b = ab * aa * sh + 10 * (1 - aa)
      } else {
        // Print: ink multiplies with the paper and the light on it.
        const mr = pr / white[0], mg = pg / white[1], mb = pb / white[2]
        const tr = white[0] / 255, tg = white[1] / 255, tb = white[2] / 255
        r = ar * Math.min(1.15, mr) * (0.35 + 0.65 * tr); g = ag * Math.min(1.15, mg) * (0.35 + 0.65 * tg); b = ab * Math.min(1.15, mb) * (0.35 + 0.65 * tb)
        // Blank paper where the design does not cover (fit mode) stays the photo's paper.
      }
      let a = (s.finish === 'screen' ? 1 : aa) * cov
      if (front) a *= 1 - front[k]
      out[pi] = pr + (r - pr) * a; out[pi + 1] = pg + (g - pg) * a; out[pi + 2] = pb + (b - pb) * a
    }
  }
  img.data.set(out); x.putImageData(img, 0, 0)
  return c
}

export async function renderScene(scene: Scene, art: HTMLCanvasElement, o: RenderOptions = {}) {
  const photo = await loadScenePhoto(scene.id)
  return renderOnPhoto(photo, scene.surfaces, art, o)
}

// ─── Finding the surface in the designer's own photo ─────────────────

/**
 * Find the largest bright, plain area (a blank poster, screen or sheet) and return its corners
 * as fractions of the photo. Falls back to a centred box.
 */
export function findSurface(photo: CanvasImageSource & { width: number; height: number }): [number, number][] {
  const k = Math.min(1, 480 / Math.max(photo.width, photo.height))
  const w = Math.max(8, Math.round(photo.width * k)), h = Math.max(8, Math.round(photo.height * k))
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(photo, 0, 0, w, h)
  const d = x.getImageData(0, 0, w, h).data
  const L = new Float32Array(w * h), C = new Float32Array(w * h)
  let max = 0
  for (let i = 0; i < w * h; i++) { const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]; L[i] = lumOf(r, g, b); C[i] = Math.max(r, g, b) - Math.min(r, g, b); if (L[i] > max) max = L[i] }
  const ok = (i: number) => L[i] > max * 0.72 && C[i] < 40
  const seen = new Uint8Array(w * h); let best: number[] = []
  const stack: number[] = []
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || !ok(i)) continue
    const comp: number[] = []; stack.push(i); seen[i] = 1
    while (stack.length) {
      const p = stack.pop()!; comp.push(p); const px = p % w, py = (p / w) | 0
      if (px > 0 && !seen[p - 1] && ok(p - 1)) { seen[p - 1] = 1; stack.push(p - 1) }
      if (px < w - 1 && !seen[p + 1] && ok(p + 1)) { seen[p + 1] = 1; stack.push(p + 1) }
      if (py > 0 && !seen[p - w] && ok(p - w)) { seen[p - w] = 1; stack.push(p - w) }
      if (py < h - 1 && !seen[p + w] && ok(p + w)) { seen[p + w] = 1; stack.push(p + w) }
    }
    // Ignore sky and walls that touch the whole frame edge.
    if (comp.length > best.length && comp.length < w * h * 0.85) best = comp
  }
  if (best.length < w * h * 0.02) return [[0.3, 0.2], [0.7, 0.2], [0.7, 0.8], [0.3, 0.8]]
  let tl = best[0], tr = best[0], br = best[0], bl = best[0]
  const sx = (p: number) => p % w, sy = (p: number) => (p / w) | 0
  for (const p of best) {
    const a = sx(p) + sy(p), b = sx(p) - sy(p)
    if (a < sx(tl) + sy(tl)) tl = p; if (a > sx(br) + sy(br)) br = p
    if (b > sx(tr) - sy(tr)) tr = p; if (b < sx(bl) - sy(bl)) bl = p
  }
  return [tl, tr, br, bl].map(p => [(sx(p) + 0.5) / w, (sy(p) + 0.5) / h] as [number, number])
}

/** Width over height of a quad on a photo, from its average side lengths. */
export function quadAspect(q: [number, number][], W: number, H: number) {
  const p = q.map(([u, v]) => ({ x: u * W, y: v * H }))
  const a = (Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) + Math.hypot(p[2].x - p[3].x, p[2].y - p[3].y)) / 2
  const b = (Math.hypot(p[3].x - p[0].x, p[3].y - p[0].y) + Math.hypot(p[2].x - p[1].x, p[2].y - p[1].y)) / 2
  return a / (b || 1)
}
