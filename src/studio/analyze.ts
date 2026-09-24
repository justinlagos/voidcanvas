// Reference intelligence: what a senior art director would say about an image, measured.
// Runs on the device in a few tens of milliseconds on a downscaled copy.

export interface RefAnalysis {
  v: 1
  palette: { hex: string; share: number; role: string }[]
  hist: number[]
  meanL: number
  key: 'low' | 'mid' | 'high'
  contrast: number
  contrastLabel: 'soft' | 'medium' | 'hard'
  temp: { a: number; b: number; label: string }
  chroma: number
  satLabel: 'muted' | 'natural' | 'vivid'
  light: { angle: number; strength: number; label: string }
  focal: { x: number; y: number }
  thirds: string
  negative: number
  lines: { h: number; v: number; d: number; label: string }
  symmetry: number
  sharpness: number
  grain: number
  /** 32 × 32 saliency map, 0..1, row by row. */
  saliency: number[]
  lab: { mean: [number, number, number]; std: [number, number, number] }
  recipe: string[]
  /** The lettering in the reference, read when the reference is first opened. */
  type?: import('./typeread').TypeRead
}

// ─── Colour maths ──────────────────────────────────────────────────

const srgb = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const R = srgb(r), G = srgb(g), B = srgb(b)
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883
  const fx = f(X), fy = f(Y), fz = f(Z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}
export function labToRgb(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200
  const inv = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787)
  const X = inv(fx) * 0.95047, Y = inv(fy), Z = inv(fz) * 1.08883
  const lin = [X * 3.2406 + Y * -1.5372 + Z * -0.4986, X * -0.9689 + Y * 1.8758 + Z * 0.0415, X * 0.0557 + Y * -0.204 + Z * 1.057]
  return lin.map(v => { const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(c * 255))) }) as [number, number, number]
}
const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')

// ─── Analysis ──────────────────────────────────────────────────────

export async function analyzeImage(blob: Blob): Promise<RefAnalysis> {
  const bmp = await createImageBitmap(blob)
  const k = Math.min(1, 200 / Math.max(bmp.width, bmp.height))
  const W = Math.max(8, Math.round(bmp.width * k)), H = Math.max(8, Math.round(bmp.height * k))
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.drawImage(bmp, 0, 0, W, H)
  return analyzePixels(x.getImageData(0, 0, W, H).data, W, H)
}

export function analyzePixels(d: Uint8ClampedArray, W: number, H: number): RefAnalysis {
  const N = W * H
  const L = new Float32Array(N), A = new Float32Array(N), B = new Float32Array(N)
  for (let i = 0, p = 0; p < N; i += 4, p++) { const lab = rgbToLab(d[i], d[i + 1], d[i + 2]); L[p] = lab[0]; A[p] = lab[1]; B[p] = lab[2] }

  // Tone.
  const hist = new Array(32).fill(0)
  let sumL = 0, sumA = 0, sumB = 0, sumC = 0
  for (let p = 0; p < N; p++) { hist[Math.min(31, Math.floor(L[p] / 100 * 32))]++; sumL += L[p]; sumA += A[p]; sumB += B[p]; sumC += Math.hypot(A[p], B[p]) }
  const meanL = sumL / N, meanA = sumA / N, meanB = sumB / N, chroma = sumC / N
  let vL = 0, vA = 0, vB = 0
  for (let p = 0; p < N; p++) { vL += (L[p] - meanL) ** 2; vA += (A[p] - meanA) ** 2; vB += (B[p] - meanB) ** 2 }
  const std: [number, number, number] = [Math.sqrt(vL / N), Math.sqrt(vA / N), Math.sqrt(vB / N)]
  const sorted = Array.from(L).sort((a, b) => a - b)
  const p5 = sorted[Math.floor(N * 0.05)], p95 = sorted[Math.floor(N * 0.95)]
  const contrast = p95 - p5
  const key = meanL < 38 ? 'low' : meanL > 64 ? 'high' : 'mid'
  const contrastLabel = contrast < 45 ? 'soft' : contrast < 75 ? 'medium' : 'hard'
  const tempLabel = meanB > 8 ? 'warm' : meanB > 3 ? 'slightly warm' : meanB < -6 ? 'cool' : meanB < -2 ? 'slightly cool' : 'neutral'
  const tint = meanA > 5 ? ', magenta tint' : meanA < -5 ? ', green tint' : ''
  const satLabel = chroma < 12 ? 'muted' : chroma < 30 ? 'natural' : 'vivid'

  // Light direction: where the bright mass sits relative to the centre.
  let lx = 0, ly = 0, lw = 0
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { const v = Math.max(0, L[y * W + xx] - meanL); lx += v * (xx / W - 0.5); ly += v * (y / H - 0.5); lw += v }
  const ldx = lw ? lx / lw : 0, ldy = lw ? ly / lw : 0, strength = Math.min(1, Math.hypot(ldx, ldy) * 5)
  const angle = Math.atan2(ldy, ldx)
  const dirWord = () => {
    const v = ldy < -0.03 ? 'top' : ldy > 0.03 ? 'bottom' : '', h = ldx < -0.03 ? 'left' : ldx > 0.03 ? 'right' : ''
    return v && h ? `${v} ${h}` : v || h || 'centre'
  }
  const lightLabel = strength < 0.15 ? 'even, flat light' : `light from the ${dirWord()}${strength > 0.5 ? ', strong' : ''}`

  // Gradients: edges, lines, sharpness.
  const mag = new Float32Array(N)
  let gh = 0, gv = 0, gd = 0, lapSum = 0, lapSq = 0, lapN = 0
  const lapFlat: number[] = []
  for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) {
    const i = y * W + xx
    const gx = L[i + 1] - L[i - 1], gy = L[i + W] - L[i - W]
    const m = Math.hypot(gx, gy); mag[i] = m
    if (m > 6) { const t = Math.abs(Math.atan2(gy, gx)); const ang = t > Math.PI / 2 ? Math.PI - t : t; if (ang < Math.PI / 8) gv += m; else if (ang > (3 * Math.PI) / 8) gh += m; else gd += m }
    const lap = 4 * L[i] - L[i - 1] - L[i + 1] - L[i - W] - L[i + W]
    lapSum += lap; lapSq += lap * lap; lapN++
    if (m < 3) lapFlat.push(Math.abs(lap))
  }
  const gt = gh + gv + gd || 1
  const lines = { h: gh / gt, v: gv / gt, d: gd / gt, label: '' }
  lines.label = lines.d > 0.45 ? 'diagonal, dynamic lines' : lines.h > lines.v * 1.4 ? 'horizontal lines, calm and wide' : lines.v > lines.h * 1.4 ? 'vertical lines, upright and tall' : 'balanced horizontals and verticals'
  const sharpness = lapN ? Math.sqrt(lapSq / lapN - (lapSum / lapN) ** 2) : 0
  lapFlat.sort((a, b) => a - b)
  const grain = lapFlat.length ? lapFlat[Math.floor(lapFlat.length / 2)] : 0

  // Saliency: centre-surround colour contrast plus edges, on a 32 × 32 grid.
  const G = 32, cell = new Float32Array(G * G * 3), cnt = new Float32Array(G * G), edge = new Float32Array(G * G)
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
    const gi = Math.min(G - 1, Math.floor((y / H) * G)) * G + Math.min(G - 1, Math.floor((xx / W) * G)), i = y * W + xx
    cell[gi * 3] += L[i]; cell[gi * 3 + 1] += A[i]; cell[gi * 3 + 2] += B[i]; cnt[gi]++; edge[gi] += mag[i]
  }
  for (let g = 0; g < G * G; g++) { const n = cnt[g] || 1; cell[g * 3] /= n; cell[g * 3 + 1] /= n; cell[g * 3 + 2] /= n; edge[g] /= n }
  const sal = new Float32Array(G * G)
  let smax = 0
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    let sL = 0, sA = 0, sB = 0, sn = 0
    for (let yy = Math.max(0, gy - 6); yy <= Math.min(G - 1, gy + 6); yy++) for (let x2 = Math.max(0, gx - 6); x2 <= Math.min(G - 1, gx + 6); x2++) { const j = yy * G + x2; sL += cell[j * 3]; sA += cell[j * 3 + 1]; sB += cell[j * 3 + 2]; sn++ }
    const g = gy * G + gx
    const dc = Math.hypot(cell[g * 3] - sL / sn, (cell[g * 3 + 1] - sA / sn) * 1.5, (cell[g * 3 + 2] - sB / sn) * 1.5)
    // A mild centre bias, as the eye has.
    const cb = 1 - 0.35 * Math.hypot(gx / G - 0.5, gy / G - 0.5)
    sal[g] = (dc + edge[g] * 1.2) * cb
    smax = Math.max(smax, sal[g])
  }
  for (let g = 0; g < G * G; g++) sal[g] = smax ? sal[g] / smax : 0
  const thr = Array.from(sal).sort((a, b) => b - a)[Math.floor(G * G * 0.06)]
  let fx = 0, fy = 0, fw = 0
  for (let g = 0; g < G * G; g++) if (sal[g] >= thr) { fx += sal[g] * ((g % G) + 0.5) / G; fy += sal[g] * (Math.floor(g / G) + 0.5) / G; fw += sal[g] }
  const focal = { x: fw ? fx / fw : 0.5, y: fw ? fy / fw : 0.5 }
  const thirdsPts = [[1 / 3, 1 / 3], [2 / 3, 1 / 3], [1 / 3, 2 / 3], [2 / 3, 2 / 3]]
  const dThird = Math.min(...thirdsPts.map(([a, b]) => Math.hypot(focal.x - a, focal.y - b)))
  const dCentre = Math.hypot(focal.x - 0.5, focal.y - 0.5)
  const thirds = dCentre < 0.08 ? 'subject centred' : dThird < 0.1 ? 'subject on a thirds point' : focal.y < 0.3 ? 'subject high in the frame' : focal.y > 0.7 ? 'subject low in the frame' : 'subject off the grid'
  const negative = Array.from(sal).filter((v, g) => v < 0.18 && edge[g] < 4).length / (G * G)

  // Symmetry, left against mirrored right.
  let sd = 0
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W / 2; xx++) sd += Math.abs(L[y * W + xx] - L[y * W + (W - 1 - xx)])
  const symmetry = Math.max(0, 1 - sd / (H * (W / 2)) / 25)

  // Palette with proportions: k-means in Lab.
  const palette = kmeansPalette(L, A, B, N, 6)

  const recipe = [
    `${key === 'low' ? 'Low-key' : key === 'high' ? 'High-key' : 'Mid-key'} exposure, ${contrastLabel} contrast`,
    `${tempLabel[0].toUpperCase()}${tempLabel.slice(1)} colour${tint}, ${satLabel} saturation`,
    `${lightLabel[0].toUpperCase()}${lightLabel.slice(1)}`,
    `${thirds[0].toUpperCase()}${thirds.slice(1)}, ${Math.round(negative * 100)}% negative space`,
    `${lines.label[0].toUpperCase()}${lines.label.slice(1)}${symmetry > 0.75 ? ', near-symmetrical' : ''}`,
    `${sharpness > 18 ? 'Crisp detail' : sharpness > 9 ? 'Moderate detail' : 'Soft focus'}${grain > 2.2 ? ', visible grain' : grain > 1.2 ? ', light grain' : ', clean'}`,
  ]
  return {
    v: 1, palette, hist: hist.map(h => h / N), meanL, key, contrast, contrastLabel, temp: { a: meanA, b: meanB, label: tempLabel + tint }, chroma, satLabel,
    light: { angle, strength, label: lightLabel }, focal, thirds, negative, lines, symmetry, sharpness, grain,
    saliency: Array.from(sal).map(v => Math.round(v * 100) / 100), lab: { mean: [meanL, meanA, meanB], std }, recipe,
  }
}

function kmeansPalette(L: Float32Array, A: Float32Array, B: Float32Array, N: number, K: number) {
  const step = Math.max(1, Math.floor(N / 6000))
  const pts: number[][] = []
  for (let p = 0; p < N; p += step) pts.push([L[p], A[p], B[p]])
  // k-means++ start.
  const cents: number[][] = [pts[Math.floor(pts.length / 2)]]
  const d2 = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  while (cents.length < K) {
    let best = pts[0], bd = -1
    for (const q of pts) { const m = Math.min(...cents.map(c => d2(q, c))); if (m > bd) { bd = m; best = q } }
    cents.push([...best])
  }
  const asg = new Int32Array(pts.length)
  for (let it = 0; it < 10; it++) {
    const acc = cents.map(() => [0, 0, 0, 0])
    pts.forEach((q, i) => { let bi = 0, bd = Infinity; cents.forEach((c, j) => { const dd = d2(q, c); if (dd < bd) { bd = dd; bi = j } }); asg[i] = bi; const a = acc[bi]; a[0] += q[0]; a[1] += q[1]; a[2] += q[2]; a[3]++ })
    acc.forEach((a, j) => { if (a[3]) cents[j] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]] })
  }
  const counts = cents.map((_, j) => 0); asg.forEach(j => counts[j]++)
  let out = cents.map((c, j) => ({ lab: c, share: counts[j] / pts.length })).filter(x => x.share > 0.01)
  // Merge near-duplicates (ΔE < 10).
  out.sort((a, b) => b.share - a.share)
  const merged: typeof out = []
  for (const x of out) { const m = merged.find(y => Math.sqrt(d2(x.lab, y.lab)) < 10); if (m) m.share += x.share; else merged.push({ ...x }) }
  const withChroma = merged.map(x => ({ ...x, c: Math.hypot(x.lab[1], x.lab[2]) }))
  const accent = withChroma.filter(x => x.share < 0.25).sort((a, b) => b.c - a.c)[0]
  return withChroma.map(x => {
    const [r, g, b] = labToRgb(x.lab[0], x.lab[1], x.lab[2])
    const role = x === withChroma[0] ? 'dominant' : x === accent && x.c > 25 ? 'accent' : x.lab[0] < 25 ? 'shadow' : x.lab[0] > 85 ? 'highlight' : 'supporting'
    return { hex: hex(r, g, b), share: Math.round(x.share * 1000) / 1000, role }
  })
}

/** Reinhard colour transfer in Lab: make `src` pixels carry the target's mean and spread. */
export function transferStats(d: Uint8ClampedArray, target: { mean: number[]; std: number[] }, amount = 1) {
  const n = d.length / 4
  const labs = new Float32Array(n * 3)
  const mean = [0, 0, 0], sq = [0, 0, 0]
  for (let i = 0, p = 0; i < d.length; i += 4, p++) { const l = rgbToLab(d[i], d[i + 1], d[i + 2]); labs[p * 3] = l[0]; labs[p * 3 + 1] = l[1]; labs[p * 3 + 2] = l[2]; for (let c = 0; c < 3; c++) { mean[c] += l[c]; sq[c] += l[c] * l[c] } }
  const std = [0, 1, 2].map(c => { mean[c] /= n; return Math.sqrt(Math.max(1e-6, sq[c] / n - mean[c] * mean[c])) })
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const out = [0, 1, 2].map(c => (labs[p * 3 + c] - mean[c]) * (target.std[c] / std[c]) + target.mean[c])
    const [r, g, b] = labToRgb(out[0], out[1], out[2])
    d[i] += (r - d[i]) * amount; d[i + 1] += (g - d[i + 1]) * amount; d[i + 2] += (b - d[i + 2]) * amount
  }
}
