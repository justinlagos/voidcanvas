/** Texture-preserving translation search. Donors never include another selected removal region. */
function healComponent(
  src: Uint8ClampedArray,
  hole: Uint8ClampedArray,
  excluded: Uint8ClampedArray,
  w: number,
  h: number,
): Uint8ClampedArray | null {
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (hole[(y * w + x) * 4 + 3] > 0) {
        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x)
        y1 = Math.max(y1, y)
      }
  if (x1 < 0) return null
  const bw = x1 - x0 + 1,
    bh = y1 - y0 + 1,
    targets: number[] = []
  let ring: number[] = []
  const step = Math.max(1, Math.floor(Math.sqrt((bw * bh) / 500)))
  for (let y = Math.max(0, y0 - 6); y <= Math.min(h - 1, y1 + 6); y += step)
    for (let x = Math.max(0, x0 - 6); x <= Math.min(w - 1, x1 + 6); x += step) {
      const i = y * w + x
      if (hole[i * 4 + 3]) targets.push(i)
      else if (!excluded[i * 4 + 3] && src[i * 4 + 3] > 200 && (x < x0 || x > x1 || y < y0 || y > y1))
        ring.push(i)
    }
  // A stroke can be wholly inside a larger selection. Its immediate boundary is excluded too;
  // expand to clean context instead of treating the selected lettering as background.
  for (let padding = 12; ring.length < 800 && padding <= Math.max(w, h); padding *= 2) {
    for (let y = Math.max(0, y0 - padding); y <= Math.min(h - 1, y1 + padding); y += step)
      for (let x = Math.max(0, x0 - padding); x <= Math.min(w - 1, x1 + padding); x += step) {
        const i = y * w + x
        if (!excluded[i * 4 + 3] && !hole[i * 4 + 3] && src[i * 4 + 3] > 200) ring.push(i)
      }
  }
  if (ring.length > 800) {
    const k = Math.ceil(ring.length / 800)
    ring = ring.filter((_, i) => i % k === 0)
  }
  // High-contrast text just outside a stroke is not reliable background context. If a
  // dominant background colour exists, score that neighbourhood rather than the lettering.
  const histogram = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (const i of ring) {
    const r = src[i * 4],
      g = src[i * 4 + 1],
      b = src[i * 4 + 2],
      key = (r >> 4) * 256 + (g >> 4) * 16 + (b >> 4),
      bin = histogram.get(key)
    if (bin) bin.n++
    else histogram.set(key, { n: 1, r, g, b })
  }
  let mode: { n: number; r: number; g: number; b: number } | null = null
  for (const bin of Array.from(histogram.values())) if (!mode || bin.n > mode.n) mode = bin
  if (mode && mode.n >= ring.length * 0.35) {
    const centre = mode
    ring = ring.filter(
      (i) =>
        Math.max(
          Math.abs(src[i * 4] - centre.r),
          Math.abs(src[i * 4 + 1] - centre.g),
          Math.abs(src[i * 4 + 2] - centre.b),
        ) <= 48,
    )
  }
  if (!ring.length || !targets.length) return null
  // Robust border ranges avoid favouring a donor that brings bright lettering or a logo into a dark texture.
  const quantile = (c: number, q: number) => {
    const a = ring.map((i) => src[i * 4 + c]).sort((a, b) => a - b)
    return a[Math.floor((a.length - 1) * q)]
  }
  const lo = [0, 1, 2].map((c) => quantile(c, 0.05) - 24),
    hi = [0, 1, 2].map((c) => quantile(c, 0.95) + 24)
  // A summed-area table rejects contaminated donor rectangles before colour scoring.
  const stride = w + 1,
    invalid = new Uint32Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let sum = 0
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      sum += excluded[i + 3] > 0 || src[i + 3] < 200 ? 1 : 0
      invalid[(y + 1) * stride + x + 1] = invalid[y * stride + x + 1] + sum
    }
  }
  const offsets = new Set<string>()
  const add = (dx: number, dy: number) => {
    dx = Math.round(dx)
    dy = Math.round(dy)
    if (dx || dy) offsets.add(`${dx},${dy}`)
  }
  // Close translations are especially useful for repeating lines, fabrics and gradients.
  for (const k of [1, 1.35, 1.8, 2.5])
    for (let d = -72; d <= 72; d += 6) {
      add(d, (bh + 8) * k)
      add(d, -(bh + 8) * k)
      add((bw + 8) * k, d)
      add(-(bw + 8) * k, d)
    }
  for (let dy = -h + bh; dy < h - bh; dy += Math.max(12, Math.floor(h / 18)))
    for (let dx = -w + bw; dx < w - bw; dx += Math.max(12, Math.floor(w / 18))) add(dx, dy)
  let best: { dx: number; dy: number; score: number } | null = null
  const score = (dx: number, dy: number) => {
    if (x0 + dx < 0 || x1 + dx >= w || y0 + dy < 0 || y1 + dy >= h) return Infinity
    const ax = x0 + dx,
      ay = y0 + dy,
      bx = x1 + dx + 1,
      by = y1 + dy + 1
    if (
      invalid[by * stride + bx] -
      invalid[ay * stride + bx] -
      invalid[by * stride + ax] +
      invalid[ay * stride + ax]
    )
      return Infinity
    let cost = 0
    for (const i of targets) {
      const j = i + dy * w + dx
      if (excluded[j * 4 + 3] || src[j * 4 + 3] < 200) return Infinity
      for (let c = 0; c < 3; c++) {
        const v = src[j * 4 + c],
          d = Math.max(0, lo[c] - v, v - hi[c])
        cost += (d * d * 3) / targets.length
      }
    }
    let n = 0
    for (const i of ring) {
      const xx = (i % w) + dx,
        yy = Math.floor(i / w) + dy
      if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue
      const j = yy * w + xx
      if (excluded[j * 4 + 3] || src[j * 4 + 3] < 200) continue
      for (let c = 0; c < 3; c++) {
        const d = src[i * 4 + c] - src[j * 4 + c]
        cost += (d * d) / ring.length
      }
      n++
    }
    return n < ring.length * 0.6 ? Infinity : cost + Math.hypot(dx, dy) * 0.02
  }
  for (const v of Array.from(offsets)) {
    const [dx, dy] = v.split(',').map(Number),
      c = score(dx, dy)
    if (!best || c < best.score) best = { dx, dy, score: c }
  }
  if (!best || !Number.isFinite(best.score)) return null
  // Refine phase locally so periodic textures meet at the edge rather than producing ghosted lines.
  const rough = best
  for (let dy = rough.dy - 6; dy <= rough.dy + 6; dy++)
    for (let dx = rough.dx - 6; dx <= rough.dx + 6; dx++) {
      const c = score(dx, dy)
      if (c < best.score) best = { dx, dy, score: c }
    }
  // Refuse visibly mismatched seams; complex scenes belong to the inpainting workflow.
  if (best.score > 2600) return null
  // Validate every donor pixel, not only the scoring samples.
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = (y * w + x) * 4,
        j = ((y + best.dy) * w + x + best.dx) * 4
      if (hole[i + 3] && (excluded[j + 3] || src[j + 3] < 200)) return null
    }
  const out = new Uint8ClampedArray(src)
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = (y * w + x) * 4,
        a = hole[i + 3] / 255
      if (!a) continue
      const j = ((y + best.dy) * w + x + best.dx) * 4
      for (let c = 0; c < 4; c++) out[i + c] = src[i + c] * (1 - a) + src[j + c] * a
    }
  return out
}

/** Repair each disconnected selection independently while excluding every selected donor. */
export function healPixels(
  src: Uint8ClampedArray,
  hole: Uint8ClampedArray,
  excluded: Uint8ClampedArray,
  w: number,
  h: number,
): Uint8ClampedArray | null {
  if (
    w * h > 32e6 ||
    src.length !== w * h * 4 ||
    hole.length !== src.length ||
    excluded.length !== src.length
  )
    return null
  const seen = new Uint8Array(w * h),
    out = new Uint8ClampedArray(src)
  let count = 0
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || !hole[start * 4 + 3]) continue
    const queue = [start]
    seen[start] = 1
    const component = new Uint8ClampedArray(src.length)
    for (let k = 0; k < queue.length; k++) {
      const i = queue[k]
      component[i * 4 + 3] = hole[i * 4 + 3]
      for (const j of [i % w ? i - 1 : -1, i % w < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j >= 0 && j < w * h && !seen[j] && hole[j * 4 + 3]) {
          seen[j] = 1
          queue.push(j)
        }
      }
    }
    const result = healComponent(src, component, excluded, w, h)
    if (!result) return null
    for (const i of queue) for (let c = 0; c < 4; c++) out[i * 4 + c] = result[i * 4 + c]
    count++
    if (count > 64) return null
  }
  return count ? out : null
}
