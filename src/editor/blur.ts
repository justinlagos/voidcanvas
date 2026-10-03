/** Directional / zoom blur in premultiplied alpha. Transparent pixels cannot introduce dark halos. */
export function directionalBlur(img: ImageData, radius: number, angle: number, mode: 'motion' | 'radial', centerX = 50, centerY = 50) {
  if (radius <= 0) return
  const { width: w, height: h, data: d } = img, src = new Uint8ClampedArray(d)
  const a = angle * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a)
  const cx = w * centerX / 100, cy = h * centerY / 100
  const n = Math.min(48, Math.max(3, Math.ceil(radius) * 2 + 1))
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let red = 0, green = 0, blue = 0, alpha = 0
    for (let s = 0; s < n; s++) {
      const t = s / (n - 1) - 0.5
      const sx = mode === 'motion' ? x + dx * radius * t : x + (x - cx) * radius / Math.max(w, h) * t
      const sy = mode === 'motion' ? y + dy * radius * t : y + (y - cy) * radius / Math.max(w, h) * t
      const ix = Math.max(0, Math.min(w - 1, Math.round(sx))), iy = Math.max(0, Math.min(h - 1, Math.round(sy)))
      const i = (iy * w + ix) * 4, al = src[i + 3] / 255
      red += src[i] * al; green += src[i + 1] * al; blue += src[i + 2] * al; alpha += al
    }
    const i = (y * w + x) * 4
    d[i] = alpha ? red / alpha : 0; d[i + 1] = alpha ? green / alpha : 0; d[i + 2] = alpha ? blue / alpha : 0; d[i + 3] = alpha / n * 255
  }
}
