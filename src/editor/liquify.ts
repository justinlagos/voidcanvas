export interface LiquifyDab {
  x: number
  y: number
  dx: number
  dy: number
  radius: number
  strength: number
  mode: 'push' | 'pinch' | 'bloat' | 'restore'
}
/** Compose inverse displacement fields, then sample the untouched source once. */
export function liquifyPixels(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  strokes: LiquifyDab[],
): Uint8ClampedArray {
  const mapX = new Float32Array(w * h),
    mapY = new Float32Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      mapX[i] = x
      mapY[i] = y
    }
  const sample = (a: Float32Array, x: number, y: number) => {
    x = Math.max(0, Math.min(w - 1, x))
    y = Math.max(0, Math.min(h - 1, y))
    const xx = Math.floor(x),
      yy = Math.floor(y),
      fx = x - xx,
      fy = y - yy
    return (
      a[yy * w + xx] * (1 - fx) * (1 - fy) +
      a[yy * w + Math.min(w - 1, xx + 1)] * fx * (1 - fy) +
      a[Math.min(h - 1, yy + 1) * w + xx] * (1 - fx) * fy +
      a[Math.min(h - 1, yy + 1) * w + Math.min(w - 1, xx + 1)] * fx * fy
    )
  }
  for (const d of strokes) {
    const cx = d.x * w,
      cy = d.y * h,
      r = Math.max(1, d.radius * Math.min(w, h)),
      x0 = Math.max(0, Math.floor(cx - r)),
      y0 = Math.max(0, Math.floor(cy - r)),
      x1 = Math.min(w - 1, Math.ceil(cx + r)),
      y1 = Math.min(h - 1, Math.ceil(cy + r)),
      bw = x1 - x0 + 1,
      bh = y1 - y0 + 1,
      nx = new Float32Array(bw * bh),
      ny = new Float32Array(bw * bh)
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x,
          k = (y - y0) * bw + x - x0,
          t = Math.hypot(x - cx, y - cy) / r,
          f = t < 1 ? Math.pow(1 - t * t, 2) * d.strength : 0
        let sx = x,
          sy = y
        if (d.mode === 'restore') {
          nx[k] = mapX[i] * (1 - f) + x * f
          ny[k] = mapY[i] * (1 - f) + y * f
          continue
        }
        if (d.mode === 'push') {
          sx -= d.dx * w * f
          sy -= d.dy * h * f
        } else {
          const sign = d.mode === 'pinch' ? 1 : -1
          sx += (x - cx) * f * 0.15 * sign
          sy += (y - cy) * f * 0.15 * sign
        }
        nx[k] = sample(mapX, sx, sy)
        ny[k] = sample(mapY, sx, sy)
      }
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x,
          k = (y - y0) * bw + x - x0
        mapX[i] = nx[k]
        mapY[i] = ny[k]
      }
  }
  const out = new Uint8ClampedArray(src.length)
  for (let i = 0; i < w * h; i++) {
    const x = Math.max(0, Math.min(w - 1, mapX[i])),
      y = Math.max(0, Math.min(h - 1, mapY[i])),
      xx = Math.floor(x),
      yy = Math.floor(y),
      fx = x - xx,
      fy = y - yy
    const ids = [
        yy * w + xx,
        yy * w + Math.min(w - 1, xx + 1),
        Math.min(h - 1, yy + 1) * w + xx,
        Math.min(h - 1, yy + 1) * w + Math.min(w - 1, xx + 1),
      ],
      weight = [(1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy]
    let alpha = 0
    const color = [0, 0, 0]
    for (let j = 0; j < 4; j++) {
      const a = (src[ids[j] * 4 + 3] / 255) * weight[j]
      alpha += a
      for (let c = 0; c < 3; c++) color[c] += src[ids[j] * 4 + c] * a
    }
    for (let c = 0; c < 3; c++) out[i * 4 + c] = alpha ? color[c] / alpha : 0
    out[i * 4 + 3] = alpha * 255
  }
  return out
}
