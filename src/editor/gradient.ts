export type GradientKind = 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond'
export interface GradientStop { position: number; color: string; opacity?: number; midpoint?: number }
export const GRADIENT_TYPES: { id: GradientKind; label: string }[] = [
  { id: 'linear', label: 'Linear' }, { id: 'radial', label: 'Radial / circle' },
  { id: 'angle', label: 'Angular' }, { id: 'reflected', label: 'Reflected' }, { id: 'diamond', label: 'Diamond' },
]
export const GRADIENT_PRESETS = [
  { name: 'Monochrome', colors: ['#000000', '#ffffff'] },
  { name: 'Ocean', colors: ['#072c50', '#087e8b', '#b5ffe1'] },
  { name: 'Sunset', colors: ['#51233e', '#e65c43', '#ffd280'] },
  { name: 'Forest', colors: ['#143d2a', '#649b53', '#e3edb7'] },
  { name: 'Copper', colors: ['#38211c', '#b97045', '#f2d8bb'] },
]

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const hex = (c: string) => {
  const s = c.replace('#', '')
  const x = s.length === 3 ? s.split('').map(v => v + v).join('') : s.slice(0, 6).padEnd(6, '0')
  return [parseInt(x.slice(0, 2), 16) || 0, parseInt(x.slice(2, 4), 16) || 0, parseInt(x.slice(4, 6), 16) || 0]
}
const css = (a: number[], alpha: number) => `rgba(${Math.round(a[0])},${Math.round(a[1])},${Math.round(a[2])},${clamp01(alpha)})`

/** Expand midpoint/opacity-aware stops to a CanvasGradient-friendly sampled list. */
export function sampledGradientStops(input: GradientStop[]): GradientStop[] {
  const src = input.map(s => ({ ...s, position: clamp01(s.position), opacity: clamp01(s.opacity ?? 1), midpoint: clamp01(s.midpoint ?? 0.5) })).sort((a, b) => a.position - b.position)
  if (src.length < 2) return src
  const out: GradientStop[] = []
  for (let i = 0; i < src.length - 1; i++) {
    const a = src[i], b = src[i + 1], ca = hex(a.color), cb = hex(b.color), mid = Math.max(0.05, Math.min(0.95, a.midpoint ?? 0.5))
    const steps = 16
    for (let n = 0; n < steps; n++) {
      const q = n / steps
      // Piecewise curve guarantees that the 50% colour lands at the chosen midpoint.
      const t = q <= mid ? 0.5 * q / mid : 0.5 + 0.5 * (q - mid) / (1 - mid)
      const rgb = ca.map((v, k) => v + (cb[k] - v) * t)
      const alpha = (a.opacity ?? 1) + ((b.opacity ?? 1) - (a.opacity ?? 1)) * t
      out.push({ position: a.position + (b.position - a.position) * q, color: css(rgb, alpha) })
    }
  }
  const z = src[src.length - 1]
  out.push({ position: z.position, color: css(hex(z.color), z.opacity ?? 1) })
  return out
}

/** Shared geometry for the painted tool and editable overlays. Radius is in output pixels. */
export function gradientPosition(kind: GradientKind, dx: number, dy: number, radius: number, angle: number, aspect = 1): number {
  const a = angle * Math.PI / 180, r = Math.max(0.001, radius)
  const x = (dx * Math.cos(a) - dy * Math.sin(a)) / r
  const y = (dx * Math.sin(a) + dy * Math.cos(a)) / r / Math.max(0.01, aspect)
  if (kind === 'radial') return Math.hypot(x, y)
  if (kind === 'reflected') return Math.abs(x)
  if (kind === 'diamond') return Math.abs(x) + Math.abs(y)
  if (kind === 'angle') return ((Math.atan2(y, x) / (2 * Math.PI)) + 1) % 1
  return (x + 1) / 2
}

export function paintGradient(ctx: CanvasRenderingContext2D, width: number, height: number, opts: {
  kind?: GradientKind; from: string; to: string; stops?: GradientStop[]; reverse?: boolean;
  x: number; y: number; radius: number; angle: number; aspect?: number;
}) {
  const raw = (opts.stops?.length ? opts.stops : [{ position: 0, color: opts.from }, { position: 1, color: opts.to }])
  const stops = sampledGradientStops(raw)
  const kind = opts.kind ?? 'linear', a = opts.angle * Math.PI / 180
  const ca = Math.cos(a), sa = Math.sin(a), r = Math.max(0.001, opts.radius), aspect = Math.max(0.01, opts.aspect ?? 1)
  if (kind !== 'diamond' && !(kind === 'radial' && aspect !== 1)) {
    const native = kind === 'radial' ? ctx.createRadialGradient(opts.x, opts.y, 0, opts.x, opts.y, r)
      : kind === 'angle' ? ctx.createConicGradient(-a, opts.x, opts.y)
      : ctx.createLinearGradient(opts.x - ca * r, opts.y + sa * r, opts.x + ca * r, opts.y - sa * r)
    const list = opts.reverse ? stops.map(s => ({ position: 1 - s.position, color: s.color })).reverse() : stops
    if (kind === 'reflected') {
      for (const s of [...list].reverse()) native.addColorStop((1 - s.position) / 2, s.color)
      for (const s of list) native.addColorStop((1 + s.position) / 2, s.color)
    } else for (const s of list) native.addColorStop(s.position, s.color)
    ctx.fillStyle = native; ctx.fillRect(0, 0, width, height); return
  }
  const ramp = document.createElement('canvas'); ramp.width = 1024; ramp.height = 1
  const rx = ramp.getContext('2d', { willReadFrequently: true })!
  const grad = rx.createLinearGradient(0, 0, 1023, 0)
  for (const s of stops) grad.addColorStop(s.position, s.color)
  rx.fillStyle = grad; rx.fillRect(0, 0, 1024, 1)
  const colors = rx.getImageData(0, 0, 1024, 1).data
  const img = ctx.createImageData(width, height), d = img.data
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const dx = x - opts.x, dy = y - opts.y
    const u = (dx * ca - dy * sa) / r, v = (dx * sa + dy * ca) / r / aspect
    let t = kind === 'radial' ? Math.hypot(u, v) : kind === 'diamond' ? Math.abs(u) + Math.abs(v)
      : kind === 'reflected' ? Math.abs(u) : kind === 'angle' ? (Math.atan2(v, u) / (2 * Math.PI) + 1) % 1 : (u + 1) / 2
    t = clamp01(t); if (opts.reverse) t = 1 - t
    const ci = Math.round(t * 1023) * 4, i = (y * width + x) * 4
    d[i] = colors[ci]; d[i + 1] = colors[ci + 1]; d[i + 2] = colors[ci + 2]; d[i + 3] = colors[ci + 3]
  }
  const out = document.createElement('canvas'); out.width = width; out.height = height
  out.getContext('2d')!.putImageData(img, 0, 0); ctx.drawImage(out, 0, 0)
}
