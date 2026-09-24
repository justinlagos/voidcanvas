// Mockups drawn on the device: a poster on a wall, a phone, a billboard, a flyer on a desk,
// or your own photo with the design placed by four corners. No stock photos, no uploads.

export type Pt = { x: number; y: number }
export type SceneId = 'wall' | 'phone' | 'billboard' | 'desk' | 'custom'
export const SCENES: { id: SceneId; label: string }[] = [
  { id: 'wall', label: 'Poster on a wall' },
  { id: 'phone', label: 'Phone' },
  { id: 'billboard', label: 'Billboard' },
  { id: 'desk', label: 'Flyer on a desk' },
  { id: 'custom', label: 'Your own photo' },
]

/** Solve the homography that maps the unit square to a quad (tl, tr, br, bl). */
function homography(q: Pt[]) {
  const [p0, p1, p2, p3] = q
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dy1 = p1.y - p2.y, dy2 = p3.y - p2.y
  const sx = p0.x - p1.x + p2.x - p3.x, sy = p0.y - p1.y + p2.y - p3.y
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den
  const a = p1.x - p0.x + g * p1.x, b = p3.x - p0.x + h * p3.x, c = p0.x
  const d = p1.y - p0.y + g * p1.y, e = p3.y - p0.y + h * p3.y, f = p0.y
  return (u: number, v: number): Pt => { const w = g * u + h * v + 1; return { x: (a * u + b * v + c) / w, y: (d * u + e * v + f) / w } }
}

/** Draw `src` into the quad with a triangle mesh (perspective-correct enough at 24 × 24). */
export function drawInQuad(x: CanvasRenderingContext2D, src: CanvasImageSource & { width: number; height: number }, quad: Pt[], N = 24) {
  const H = homography(quad), W = src.width, Hh = src.height
  const tri = (s0: Pt, s1: Pt, s2: Pt, d0: Pt, d1: Pt, d2: Pt) => {
    x.save(); x.beginPath()
    // Grow each triangle a hair so seams do not show.
    const cx = (d0.x + d1.x + d2.x) / 3, cy = (d0.y + d1.y + d2.y) / 3, g = (p: Pt) => ({ x: p.x + (p.x - cx) * 0.02, y: p.y + (p.y - cy) * 0.02 })
    const a = g(d0), b = g(d1), c = g(d2)
    x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.lineTo(c.x, c.y); x.closePath(); x.clip()
    const den = s0.x * (s2.y - s1.y) - s1.x * s2.y + s2.x * s1.y + (s1.x - s2.x) * s0.y
    if (Math.abs(den) < 1e-9) { x.restore(); return }
    const m11 = -(s0.y * (d2.x - d1.x) - s1.y * d2.x + s2.y * d1.x + (s1.y - s2.y) * d0.x) / den
    const m12 = (s1.y * d2.y + s0.y * (d1.y - d2.y) - s2.y * d1.y + (s2.y - s1.y) * d0.y) / den
    const m21 = (s0.x * (d2.x - d1.x) - s1.x * d2.x + s2.x * d1.x + (s1.x - s2.x) * d0.x) / den
    const m22 = -(s1.x * d2.y + s0.x * (d1.y - d2.y) - s2.x * d1.y + (s2.x - s1.x) * d0.y) / den
    const dx = (s0.x * (s2.y * d1.x - s1.y * d2.x) + s0.y * (s1.x * d2.x - s2.x * d1.x) + (s2.x * s1.y - s1.x * s2.y) * d0.x) / den
    const dy = (s0.x * (s2.y * d1.y - s1.y * d2.y) + s0.y * (s1.x * d2.y - s2.x * d1.y) + (s2.x * s1.y - s1.x * s2.y) * d0.y) / den
    x.transform(m11, m12, m21, m22, dx, dy)
    x.drawImage(src, 0, 0)
    x.restore()
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u0 = i / N, v0 = j / N, u1 = (i + 1) / N, v1 = (j + 1) / N
    const s00 = { x: u0 * W, y: v0 * Hh }, s10 = { x: u1 * W, y: v0 * Hh }, s01 = { x: u0 * W, y: v1 * Hh }, s11 = { x: u1 * W, y: v1 * Hh }
    const d00 = H(u0, v0), d10 = H(u1, v0), d01 = H(u0, v1), d11 = H(u1, v1)
    tri(s00, s10, s11, d00, d10, d11); tri(s00, s11, s01, d00, d11, d01)
  }
}

function noise(x: CanvasRenderingContext2D, w: number, h: number, amt: number) {
  const img = x.getImageData(0, 0, w, h), d = img.data
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n }
  x.putImageData(img, 0, 0)
}

/** Fit a design of aspect `a` into a box, returning the quad of the placed rectangle. */
function fitQuad(a: number, cx: number, cy: number, maxW: number, maxH: number, skew = 0): Pt[] {
  let w = maxW, h = w / a; if (h > maxH) { h = maxH; w = h * a }
  const x0 = cx - w / 2, y0 = cy - h / 2
  return [{ x: x0 + skew, y: y0 }, { x: x0 + w - skew * 0.4, y: y0 + skew * 0.3 }, { x: x0 + w - skew * 0.2, y: y0 + h - skew * 0.2 }, { x: x0, y: y0 + h }]
}

export async function renderMockup(scene: SceneId, art: HTMLCanvasElement, custom?: { photo: HTMLCanvasElement | ImageBitmap; quad: Pt[] }): Promise<HTMLCanvasElement> {
  const a = art.width / art.height
  if (scene === 'custom' && custom) {
    const c = document.createElement('canvas'); c.width = custom.photo.width; c.height = custom.photo.height
    const x = c.getContext('2d')!
    x.drawImage(custom.photo, 0, 0)
    x.save(); x.globalCompositeOperation = 'multiply'; drawInQuad(x, art, custom.quad); x.restore()
    // Multiply keeps the photo's light on the art; a soft normal pass keeps the colours.
    x.save(); x.globalAlpha = 0.72; drawInQuad(x, art, custom.quad); x.restore()
    return c
  }
  const W = 1800, H = 1300
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const x = c.getContext('2d')!
  if (scene === 'wall') {
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#d9d2c7'); g.addColorStop(1, '#b9b0a3'); x.fillStyle = g; x.fillRect(0, 0, W, H)
    const r = x.createRadialGradient(W * 0.3, H * 0.2, 50, W * 0.4, H * 0.3, W * 0.9); r.addColorStop(0, 'rgba(255,245,225,0.45)'); r.addColorStop(1, 'rgba(0,0,0,0.25)'); x.fillStyle = r; x.fillRect(0, 0, W, H)
    noise(x, W, H, 14)
    const q = fitQuad(a, W / 2, H * 0.47, W * 0.55, H * 0.78)
    x.save(); x.shadowColor = 'rgba(0,0,0,0.35)'; x.shadowBlur = 40; x.shadowOffsetX = 18; x.shadowOffsetY = 24; x.fillStyle = '#fff'; x.beginPath(); q.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y))); x.closePath(); x.fill(); x.restore()
    drawInQuad(x, art, q)
    x.fillStyle = 'rgba(255,255,240,0.55)'
    for (const p of [q[0], q[1]]) { x.save(); x.translate(p.x, p.y); x.rotate(p === q[0] ? -0.5 : 0.5); x.fillRect(-45, -14, 90, 28); x.restore() }
    const s = x.createLinearGradient(q[0].x, 0, q[1].x, 0); s.addColorStop(0, 'rgba(255,255,255,0.12)'); s.addColorStop(1, 'rgba(0,0,0,0.08)'); x.fillStyle = s; x.beginPath(); q.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y))); x.closePath(); x.fill()
  } else if (scene === 'phone') {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#20212a'); g.addColorStop(1, '#0c0c10'); x.fillStyle = g; x.fillRect(0, 0, W, H)
    const ph = H * 0.86, pw = ph * 0.49, px = W / 2 - pw / 2, py = (H - ph) / 2
    x.save(); x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 60; x.shadowOffsetY = 30; x.fillStyle = '#0a0a0c'; x.beginPath(); x.roundRect(px, py, pw, ph, pw * 0.14); x.fill(); x.restore()
    x.strokeStyle = '#3a3a44'; x.lineWidth = 4; x.beginPath(); x.roundRect(px, py, pw, ph, pw * 0.14); x.stroke()
    const b = pw * 0.035, sx = px + b, sy = py + b, sw = pw - b * 2, sh = ph - b * 2
    x.save(); x.beginPath(); x.roundRect(sx, sy, sw, sh, pw * 0.11); x.clip()
    x.fillStyle = '#000'; x.fillRect(sx, sy, sw, sh)
    const k = Math.min(sw / art.width, (sh * 0.78) / art.height), dw = art.width * k, dh = art.height * k
    x.fillStyle = '#fff'; x.fillRect(sx, sy + sh * 0.1, sw, dh + sh * 0.1)
    x.drawImage(art, sx + (sw - dw) / 2, sy + sh * 0.14, dw, dh)
    x.fillStyle = '#111'; x.font = `600 ${sw * 0.04}px Inter, sans-serif`; x.fillText('yourbrand', sx + sw * 0.05, sy + sh * 0.12)
    x.restore()
    x.fillStyle = '#0a0a0c'; x.beginPath(); x.roundRect(W / 2 - pw * 0.16, py + b + 10, pw * 0.32, pw * 0.08, pw * 0.04); x.fill()
  } else if (scene === 'billboard') {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5b8fd6'); g.addColorStop(0.62, '#c9dcf0'); g.addColorStop(0.62, '#7b776d'); g.addColorStop(1, '#4b4841'); x.fillStyle = g; x.fillRect(0, 0, W, H)
    x.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.ellipse(200 + i * 300, 120 + (i % 3) * 50, 140, 30, 0, 0, Math.PI * 2); x.fill() }
    const q: Pt[] = [{ x: W * 0.16, y: H * 0.14 }, { x: W * 0.86, y: H * 0.19 }, { x: W * 0.86, y: H * 0.52 }, { x: W * 0.16, y: H * 0.55 }]
    x.fillStyle = '#2b2b2f'; for (const px of [W * 0.3, W * 0.7]) x.fillRect(px - 18, H * 0.5, 36, H * 0.4)
    x.fillStyle = '#1b1b1f'; x.beginPath(); x.moveTo(q[0].x - 16, q[0].y - 16); x.lineTo(q[1].x + 16, q[1].y - 16); x.lineTo(q[2].x + 16, q[2].y + 16); x.lineTo(q[3].x - 16, q[3].y + 16); x.closePath(); x.fill()
    // Billboards are wide: fill the board, cropping the art to cover.
    const bw = Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y), bh = Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y)
    const crop = document.createElement('canvas'); crop.width = 1600; crop.height = Math.round(1600 * (bh / bw))
    const cx = crop.getContext('2d')!; const k = Math.max(crop.width / art.width, crop.height / art.height)
    cx.drawImage(art, (crop.width - art.width * k) / 2, (crop.height - art.height * k) / 2, art.width * k, art.height * k)
    drawInQuad(x, crop, q)
    const sh = x.createLinearGradient(0, q[0].y, 0, q[3].y); sh.addColorStop(0, 'rgba(255,255,255,0.1)'); sh.addColorStop(1, 'rgba(0,0,0,0.12)'); x.fillStyle = sh; x.beginPath(); q.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y))); x.closePath(); x.fill()
    noise(x, W, H, 8)
  } else {
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#6b4a33'); g.addColorStop(1, '#3e2a1d'); x.fillStyle = g; x.fillRect(0, 0, W, H)
    x.strokeStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 70; i++) { x.lineWidth = 1 + Math.random() * 3; x.beginPath(); const y = Math.random() * H; x.moveTo(0, y); x.bezierCurveTo(W * 0.3, y + 20, W * 0.6, y - 20, W, y + 10); x.stroke() }
    noise(x, W, H, 10)
    x.save(); x.translate(W / 2, H / 2); x.rotate(-0.06)
    const q0 = fitQuad(a, 0, 0, W * 0.5, H * 0.82)
    x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 30; x.shadowOffsetX = 12; x.shadowOffsetY = 18; x.fillStyle = '#fff'; x.beginPath(); q0.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y))); x.closePath(); x.fill()
    x.shadowColor = 'transparent'; drawInQuad(x, art, q0)
    x.restore()
  }
  return c
}
