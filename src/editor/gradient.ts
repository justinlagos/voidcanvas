export type GradientKind = 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond'
export interface GradientStop { position: number; color: string }
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
  const stops = (opts.stops?.length ? opts.stops : [{ position: 0, color: opts.from }, { position: 1, color: opts.to }])
    .map(s => ({ ...s, position: Math.max(0, Math.min(1, s.position)) })).sort((a, b) => a.position - b.position)
  const kind = opts.kind ?? 'linear', a = opts.angle * Math.PI / 180
  const ca = Math.cos(a), sa = Math.sin(a), r = Math.max(0.001, opts.radius), aspect = Math.max(0.01, opts.aspect ?? 1)
  // Most gradients stay on the native canvas path, including full-resolution exports.
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
  // A 1D native colour ramp avoids parsing/interpolating colours in the image-sized loop.
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
    t = Math.max(0, Math.min(1, t)); if (opts.reverse) t = 1 - t
    const ci = Math.round(t * 1023) * 4, i = (y * width + x) * 4
    d[i] = colors[ci]; d[i + 1] = colors[ci + 1]; d[i + 2] = colors[ci + 2]; d[i + 3] = colors[ci + 3]
  }
  // drawImage respects opacity, transforms and compositing of the caller; putImageData does not.
  const out = document.createElement('canvas'); out.width = width; out.height = height
  out.getContext('2d')!.putImageData(img, 0, 0); ctx.drawImage(out, 0, 0)
}
