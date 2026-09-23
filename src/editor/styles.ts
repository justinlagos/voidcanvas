import type { BevelStyle, GlowStyle, GradientOverlayStyle, Layer, LayerStyles, ShadowStyle, StrokeStyle, StyleKind } from './types'

// Layer styles, computed from a layer's silhouette in document space. Everything here is GPU canvas work
// (shadow blur, compositing) plus one cheap alpha pass for spread and stroke, so it runs in every browser,
// including Safari, which has no canvas filter support.

export const STYLE_LABELS: Record<StyleKind, string> = {
  dropShadow: 'Drop shadow', innerShadow: 'Inner shadow', outerGlow: 'Outer glow', innerGlow: 'Inner glow',
  stroke: 'Stroke', colorOverlay: 'Colour overlay', gradientOverlay: 'Gradient overlay', bevel: 'Bevel and emboss',
}
export const STYLE_KINDS: StyleKind[] = ['dropShadow', 'outerGlow', 'bevel', 'innerShadow', 'innerGlow', 'colorOverlay', 'gradientOverlay', 'stroke']
const EXTERIOR: StyleKind[] = ['dropShadow', 'outerGlow']

export function defaultStyle(kind: StyleKind): any {
  switch (kind) {
    case 'dropShadow': return { on: true, opacity: 0.6, blend: 'multiply', color: '#000000', angle: 120, distance: 10, size: 14, spread: 0 } as ShadowStyle
    case 'innerShadow': return { on: true, opacity: 0.5, blend: 'multiply', color: '#000000', angle: 120, distance: 6, size: 10, spread: 0 } as ShadowStyle
    case 'outerGlow': return { on: true, opacity: 0.75, blend: 'screen', color: '#ffe9a8', size: 18, spread: 0 } as GlowStyle
    case 'innerGlow': return { on: true, opacity: 0.75, blend: 'screen', color: '#ffe9a8', size: 14, spread: 0 } as GlowStyle
    case 'stroke': return { on: true, opacity: 1, blend: 'source-over', color: '#000000', size: 4, position: 'outside' } as StrokeStyle
    case 'colorOverlay': return { on: true, opacity: 1, blend: 'source-over', color: '#8b7cff' }
    case 'gradientOverlay': return { on: true, opacity: 1, blend: 'source-over', from: '#000000', to: '#ffffff', angle: 90, scale: 100 } as GradientOverlayStyle
    case 'bevel': return { on: true, opacity: 0.75, blend: 'source-over', size: 8, depth: 100, angle: 120, highlight: '#ffffff', shadow: '#000000', soften: 0 } as BevelStyle
  }
}

export function emptyStyles(): LayerStyles { return { order: [...STYLE_KINDS] } }

export function hasActiveStyles(l: Layer): boolean {
  const st = l.styles
  if (!st) return false
  return STYLE_KINDS.some(k => (st as any)[k]?.on)
}

// ─── Canvas helpers ────────────────────────────────────────────────

function mk(w: number, h: number) { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c }
function cx(c: HTMLCanvasElement) { return c.getContext('2d')! }

/** Solid white silhouette of a canvas's alpha. */
function silhouette(src: HTMLCanvasElement) {
  const c = mk(src.width, src.height), x = cx(c)
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height)
  return c
}
function inverse(sil: HTMLCanvasElement) {
  const c = mk(sil.width, sil.height), x = cx(c)
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'destination-out'; x.drawImage(sil, 0, 0)
  return c
}
/** Blurred, tinted, offset copy using the shadow trick (works where ctx.filter does not). */
function shadowOf(src: HTMLCanvasElement, color: string, blur: number, dx: number, dy: number, alpha = 1) {
  const c = mk(src.width, src.height), x = cx(c)
  const off = src.width + Math.ceil(blur * 3) + 20
  x.shadowColor = withAlpha(color, alpha)
  x.shadowBlur = Math.max(0, blur)
  x.shadowOffsetX = off + dx; x.shadowOffsetY = dy
  x.drawImage(src, -off, 0)
  return c
}
/** Grow (r > 0) or shrink (r < 0) a silhouette by r pixels: blur, then re-threshold the alpha. */
export function morph(sil: HTMLCanvasElement, r: number) {
  if (Math.abs(r) < 0.5) return sil
  const src = r > 0 ? sil : inverse(sil)
  const R = Math.abs(r)
  const b = shadowOf(src, '#ffffff', R * 2, 0, 0)
  const x = cx(b)
  x.globalCompositeOperation = 'source-over'; x.drawImage(src, 0, 0)
  const img = x.getImageData(0, 0, b.width, b.height), d = img.data
  // A blurred straight edge falls to about 2% alpha at distance R when sigma = R/2.
  const lo = 3, hi = 14
  for (let i = 3; i < d.length; i += 4) {
    const a = d[i]
    const v = a <= lo ? 0 : a >= hi ? 255 : ((a - lo) / (hi - lo)) * 255
    d[i - 3] = d[i - 2] = d[i - 1] = 255; d[i] = v
  }
  x.putImageData(img, 0, 0)
  return r > 0 ? b : inverse(b)
}
function tint(sil: HTMLCanvasElement, color: string) {
  const c = mk(sil.width, sil.height), x = cx(c)
  x.drawImage(sil, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height)
  return c
}
function clipTo(c: HTMLCanvasElement, sil: HTMLCanvasElement) { const x = cx(c); x.globalCompositeOperation = 'destination-in'; x.drawImage(sil, 0, 0); x.globalCompositeOperation = 'source-over'; return c }
function minus(c: HTMLCanvasElement, sil: HTMLCanvasElement) { const x = cx(c); x.globalCompositeOperation = 'destination-out'; x.drawImage(sil, 0, 0); x.globalCompositeOperation = 'source-over'; return c }

export function withAlpha(hex: string, a: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function bounds(sil: HTMLCanvasElement) {
  // Coarse bounds from a small copy: good enough to place a gradient.
  const k = Math.min(1, 200 / Math.max(sil.width, sil.height))
  const t = mk(sil.width * k, sil.height * k), x = cx(t); x.drawImage(sil, 0, 0, t.width, t.height)
  const d = x.getImageData(0, 0, t.width, t.height).data
  let x0 = t.width, y0 = t.height, x1 = -1, y1 = -1
  for (let y = 0; y < t.height; y++) for (let xx = 0; xx < t.width; xx++) if (d[(y * t.width + xx) * 4 + 3] > 8) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y }
  if (x1 < 0) return { x: 0, y: 0, w: sil.width, h: sil.height }
  return { x: x0 / k, y: y0 / k, w: (x1 - x0 + 1) / k, h: (y1 - y0 + 1) / k }
}

interface Pass { canvas: HTMLCanvasElement; blend: GlobalCompositeOperation; alpha: number }

/**
 * Draw a styled layer. `content` is the layer's pixels in document space at render scale (mask applied).
 * Exterior effects go straight onto `acc` with their own blend; the rest are built into one canvas that is
 * drawn with the layer's blend mode.
 */
export function drawStyled(acc: CanvasRenderingContext2D, content: HTMLCanvasElement, l: Layer, s: number) {
  const st = l.styles!
  const sil = silhouette(content)
  const order = st.order?.length ? st.order : STYLE_KINDS
  const below: Pass[] = []
  const fill = l.fillOpacity ?? 1

  for (const k of order) {
    const e: any = (st as any)[k]
    if (!e?.on || !EXTERIOR.includes(k)) continue
    if (k === 'dropShadow') {
      const sh = e as ShadowStyle
      const a = (sh.angle * Math.PI) / 180
      const grown = sh.spread > 0 ? morph(sil, (sh.size * sh.spread / 100) * s) : sil
      below.push({ canvas: shadowOf(grown, sh.color, sh.size * s * (1 - sh.spread / 100), -Math.cos(a) * sh.distance * s, Math.sin(a) * sh.distance * s), blend: sh.blend as GlobalCompositeOperation, alpha: sh.opacity })
    } else if (k === 'outerGlow') {
      const g = e as GlowStyle
      const grown = morph(sil, Math.max(1, g.size * (g.spread / 100)) * s)
      const glow = shadowOf(grown, g.color, g.size * s, 0, 0)
      cx(glow).drawImage(tint(grown, g.color), 0, 0)
      below.push({ canvas: minus(glow, sil), blend: g.blend as GlobalCompositeOperation, alpha: g.opacity })
    }
  }

  // Interior: the layer's own pixels (faded by fill), then overlays, glows, shadows and bevel clipped to its shape.
  const inner = mk(content.width, content.height), ix = cx(inner)
  ix.globalAlpha = fill; ix.drawImage(content, 0, 0); ix.globalAlpha = 1
  const put = (c: HTMLCanvasElement, blend: string, alpha: number) => { ix.save(); ix.globalAlpha = alpha; ix.globalCompositeOperation = blend as GlobalCompositeOperation; ix.drawImage(c, 0, 0); ix.restore() }

  for (const k of order) {
    const e: any = (st as any)[k]
    if (!e?.on || EXTERIOR.includes(k)) continue
    if (k === 'colorOverlay') put(tint(sil, e.color), e.blend, e.opacity)
    else if (k === 'gradientOverlay') {
      const g = e as GradientOverlayStyle
      const b = bounds(sil)
      const c = mk(content.width, content.height), x = cx(c)
      const a = (g.angle * Math.PI) / 180, len = (Math.abs(Math.cos(a)) * b.w + Math.abs(Math.sin(a)) * b.h) / 2 * (g.scale / 100)
      const mx = b.x + b.w / 2, my = b.y + b.h / 2
      const grad = x.createLinearGradient(mx - Math.cos(a) * len, my + Math.sin(a) * len, mx + Math.cos(a) * len, my - Math.sin(a) * len)
      grad.addColorStop(0, g.from); grad.addColorStop(1, g.to)
      x.fillStyle = grad; x.fillRect(0, 0, c.width, c.height)
      put(clipTo(c, sil), g.blend, g.opacity)
    } else if (k === 'innerGlow') {
      const g = e as GlowStyle
      const inv = morph(inverse(sil), Math.max(0, g.size * (g.spread / 100)) * s)
      const glow = shadowOf(inv, g.color, g.size * s, 0, 0)
      cx(glow).drawImage(tint(inv, g.color), 0, 0)
      put(clipTo(glow, sil), g.blend, g.opacity)
    } else if (k === 'innerShadow') {
      const sh = e as ShadowStyle
      const a = (sh.angle * Math.PI) / 180
      const inv = inverse(sil)
      const shadow = shadowOf(inv, sh.color, sh.size * s, -Math.cos(a) * sh.distance * s, Math.sin(a) * sh.distance * s)
      put(clipTo(shadow, sil), sh.blend, sh.opacity)
    } else if (k === 'bevel') {
      const bv = e as BevelStyle
      const a = (bv.angle * Math.PI) / 180
      const dist = Math.max(1, bv.size * s * 0.5 * (bv.depth / 100))
      const blur = Math.max(1, (bv.size + bv.soften) * s)
      const inv = inverse(sil)
      // Light from `angle`: the lit rim is where the inverse shape, pushed away from the light, still overlaps.
      const hl = shadowOf(inv, bv.highlight, blur, Math.cos(a) * dist, -Math.sin(a) * dist)
      const sh = shadowOf(inv, bv.shadow, blur, -Math.cos(a) * dist, Math.sin(a) * dist)
      put(clipTo(hl, sil), 'screen', bv.opacity)
      put(clipTo(sh, sil), 'multiply', bv.opacity)
    } else if (k === 'stroke') {
      const sk = e as StrokeStyle
      const size = sk.size * s
      let ring: HTMLCanvasElement
      if (sk.position === 'outside') ring = minus(morph(sil, size), sil)
      else if (sk.position === 'inside') ring = minus(silClone(sil), morph(sil, -size))
      else ring = minus(morph(sil, size / 2), morph(sil, -size / 2))
      put(tint(ring, sk.color), sk.blend === 'source-over' ? 'source-over' : sk.blend, sk.opacity)
    }
  }

  for (const p of below) { acc.save(); acc.globalAlpha *= p.alpha; acc.globalCompositeOperation = p.blend; acc.drawImage(p.canvas, 0, 0); acc.restore() }
  acc.save(); acc.globalCompositeOperation = l.blend; acc.drawImage(inner, 0, 0); acc.restore()
}

function silClone(sil: HTMLCanvasElement) { const c = mk(sil.width, sil.height); cx(c).drawImage(sil, 0, 0); return c }

/** Rough visual extent of a layer's styles in doc pixels, so the renderer knows how far effects reach. */
export function styleReach(l: Layer): number {
  const st = l.styles; if (!st) return 0
  let r = 0
  if (st.dropShadow?.on) r = Math.max(r, st.dropShadow.distance + st.dropShadow.size * 2)
  if (st.outerGlow?.on) r = Math.max(r, st.outerGlow.size * 2.5)
  if (st.stroke?.on && st.stroke.position !== 'inside') r = Math.max(r, st.stroke.size)
  return r
}
