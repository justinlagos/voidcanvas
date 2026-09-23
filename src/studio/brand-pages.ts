import type { Brand } from './brand/tokens'
import { recordPage, type RecordedPage } from './brand/record'
import { logoPlacements, markContrast, monoMark, type LogoInfo, type MarkMode } from './brand/logo'
import { loadFont } from './brand/fonts'
import { RAMP_STEPS, contrast, fmtOklch, luminance } from './brand/color'
import { colorSpecLine, toCss } from './brand/export'

const onLight = (hex: string) => luminance(hex) < 0.45

// A guideline is a list of PAGES. Each page is drawn on its own canvas at full size,
// so the deck is real slides and the document is real pages, never one long scroll.
// Three art directions change layout, not just colour, so output feels designed.

export type Orientation = 'landscape' | 'portrait'
export const SIZES = { landscape: { w: 1600, h: 900 }, portrait: { w: 1240, h: 1754 } }


type Ctx = CanvasRenderingContext2D
interface Env { x: Ctx; w: number; h: number; b: Brand; logo: LogoInfo | null; o: Orientation; pageNo: number; pageCount: number }

const clampText = (x: Ctx, s: string, max: number) => { let t = s; while (x.measureText(t).width > max && t.length > 1) t = t.slice(0, -1); return t === s ? s : t.slice(0, -1) + '…' }
function wrap(x: Ctx, text: string, maxW: number): string[] {
  const words = text.split(' '), lines: string[] = []; let line = ''
  for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w } else line = t }
  if (line) lines.push(line); return lines
}
function para(x: Ctx, text: string, px: number, x0: number, y0: number, maxW: number, color: string, font: string, lh = 1.5) {
  x.fillStyle = color; x.font = `${px}px "${font}"`
  let y = y0
  for (const line of wrap(x, text, maxW)) { x.fillText(line, x0, y); y += px * lh }
  return y
}

// Draw the logo, or a neat placeholder mark, into a box. Returns the drawn bounds.
const monoCache = new WeakMap<LogoInfo, Map<string, HTMLCanvasElement>>()
function monoOf(info: LogoInfo, hex: string) {
  let m = monoCache.get(info); if (!m) { m = new Map(); monoCache.set(info, m) }
  if (!m.has(hex)) m.set(hex, monoMark(info, hex))
  return m.get(hex)!
}
function drawMark(e: Env, bx: number, by: number, bw: number, bh: number, onColor: string, invert: boolean | MarkMode = false) {
  const { x, logo, b } = e
  const mode: MarkMode = invert === true ? 'white' : invert === false ? 'original' : invert
  if (logo) {
    const s = Math.min(bw / logo.width, bh / logo.height)
    const lw = logo.width * s, lh = logo.height * s, lx = bx + (bw - lw) / 2, ly = by + (bh - lh) / 2
    const src = mode === 'original' ? logo.img : monoOf(logo, mode === 'white' ? '#ffffff' : b.surfaces.inkOnLight)
    x.drawImage(src, lx, ly, lw, lh)
    return { x: lx, y: ly, w: lw, h: lh }
  }
  const r = Math.min(bw, bh) * 0.32
  const fill = mode === 'white' ? '#ffffff' : mode === 'dark' ? b.surfaces.inkOnLight : onColor
  x.fillStyle = fill
  x.beginPath(); x.arc(bx + bw / 2, by + bh / 2, r, 0, Math.PI * 2); x.fill()
  x.fillStyle = mode === 'original' ? (fill === b.roles[0].hex ? '#ffffff' : b.roles[0].hex) : mode === 'white' ? b.roles[0].hex : '#ffffff'
  x.font = `700 ${r}px "${b.fonts.heading.family}"`; x.textAlign = 'center'; x.textBaseline = 'middle'
  x.fillText((b.name[0] || 'B').toUpperCase(), bx + bw / 2, by + bh / 2 + r * 0.04)
  x.textAlign = 'left'; x.textBaseline = 'alphabetic'
  return { x: bx + bw / 2 - r, y: by + bh / 2 - r, w: r * 2, h: r * 2 }
}
/** Which version of the mark to use on a background: full colour if it clears 3:1, else the better mono. */
function modeFor(e: Env, bg: string): MarkMode {
  if (markContrast(e.logo, e.b.roles[0].hex, bg) >= 3) return 'original'
  return contrast('#ffffff', bg) >= contrast(e.b.surfaces.inkOnLight, bg) ? 'white' : 'dark'
}
/** Aspect of the mark, so layouts can size boxes to it. */
const markAspect = (e: Env) => (e.logo ? e.logo.width / e.logo.height : 1)

function footer(e: Env, dark = false) {
  const { x, w, h, b, pageNo, pageCount } = e
  x.fillStyle = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)'; x.font = `500 ${e.o === 'landscape' ? 18 : 20}px "${b.fonts.body.family}"`
  const m = b.grid.margin
  x.fillText(`${b.name} · Brand guidelines`, m, h - m * 0.5)
  const num = `${String(pageNo).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`
  x.textAlign = 'right'; x.fillText(num, w - m, h - m * 0.5); x.textAlign = 'left'
}

function sectionLabel(e: Env, n: number, label: string, color = 'rgba(0,0,0,0.4)') {
  const { x, b } = e, m = b.grid.margin
  x.fillStyle = color; x.font = `600 ${e.o === 'landscape' ? 20 : 22}px "${b.fonts.body.family}"`
  x.fillText(`${String(n).padStart(2, '0')}  ${label.toUpperCase()}`, m, m + 24)
  x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 1
  x.beginPath(); x.moveTo(m, m + 44); x.lineTo(e.w - m, m + 44); x.stroke()
}

// ─── PAGE TYPES ─────────────────────────────────────────────────────
// Each returns nothing; it draws onto e.x. The builder decides which pages exist.

function pageCover(e: Env) {
  const { x, w, h, b, o } = e
  const p0 = b.palette[0], ink = onLight(p0.hex) ? '#fff' : '#0e0e12'
  x.fillStyle = p0.hex; x.fillRect(0, 0, w, h)
  const m = b.grid.margin

  if (b.direction === 'graphic') {
    // Big offset colour blocks behind the type.
    x.fillStyle = b.palette[1].hex
    x.fillRect(w * 0.66, 0, w * 0.34, h)
    x.fillStyle = b.accent
    x.fillRect(w * 0.66, h * 0.62, w * 0.34, h * 0.38)
  } else if (b.direction === 'systematic') {
    // Faint grid.
    x.strokeStyle = onLight(p0.hex) ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'; x.lineWidth = 1
    for (let i = 1; i < b.grid.cols; i++) { const gx = m + ((w - m * 2) / b.grid.cols) * i; x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, h); x.stroke() }
  }

  drawMark(e, m, m, o === 'landscape' ? 120 : 150, o === 'landscape' ? 120 : 150, ink, modeFor(e, p0.hex))
  x.fillStyle = ink; x.globalAlpha = 0.7
  x.font = `600 ${o === 'landscape' ? 22 : 26}px "${b.fonts.body.family}"`
  x.fillText('BRAND GUIDELINES', m, h * (o === 'landscape' ? 0.52 : 0.58))
  x.globalAlpha = 1
  // Shrink the title to fit the available width instead of clipping it, so short names never truncate.
  const titleMax = w * (b.direction === 'graphic' ? 0.56 : 0.86) - m * 2
  let titleSize = o === 'landscape' ? 150 : 128
  x.font = `700 ${titleSize}px "${b.fonts.heading.family}"`
  while (x.measureText(b.name).width > titleMax && titleSize > 44) { titleSize -= 4; x.font = `700 ${titleSize}px "${b.fonts.heading.family}"` }
  x.fillText(b.name, m, h * (o === 'landscape' ? 0.68 : 0.72))
  if (b.tagline) { x.globalAlpha = 0.85; para(x, b.tagline, o === 'landscape' ? 30 : 34, m, h * (o === 'landscape' ? 0.68 : 0.72) + 60, w * 0.5, ink, b.fonts.body.family); x.globalAlpha = 1 }
  x.globalAlpha = 0.6; x.font = `500 ${o === 'landscape' ? 20 : 22}px "${b.fonts.body.family}"`
  x.fillText(`${b.personality} · ${new Date().getFullYear()}`, m, h - m * 0.7); x.globalAlpha = 1
}

function pagePrinciples(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
  sectionLabel(e, e.pageNo - 1, 'Principles')
  const m = b.grid.margin, top = m + 120
  if (o === 'landscape') {
    const colW = (w - m * 2 - b.grid.gutter * 2) / 3
    b.principles.forEach((p, i) => {
      const cx = m + i * (colW + b.grid.gutter)
      x.fillStyle = b.accent; x.fillRect(cx, top, 48, 6)
      x.fillStyle = '#111'; x.font = `700 ${34}px "${b.fonts.heading.family}"`
      let yy = top + 60; wrap(x, p.title, colW).forEach(l => { x.fillText(l, cx, yy); yy += 40 })
      para(x, p.body, 24, cx, yy + 20, colW, 'rgba(0,0,0,0.6)', b.fonts.body.family)
    })
  } else {
    let yy = top
    b.principles.forEach(p => {
      x.fillStyle = b.accent; x.fillRect(m, yy, 6, 90)
      x.fillStyle = '#111'; x.font = `700 40px "${b.fonts.heading.family}"`; x.fillText(p.title, m + 40, yy + 44)
      yy = para(x, p.body, 26, m + 40, yy + 90, w - m * 2 - 40, 'rgba(0,0,0,0.6)', b.fonts.body.family) + 40
    })
  }
  footer(e)
}

function badge(e: Env, text: string, ok: boolean, rx: number, y: number) {
  const { x, b } = e
  x.font = `600 14px "${b.fonts.mono.family}"`; const bw = x.measureText(text).width + 20
  x.fillStyle = ok ? b.semantic[0].ramp[700] : b.semantic[2].ramp[600]; roundRect(x, rx - bw, y, bw, 26, 13); x.fill()
  x.fillStyle = '#fff'; x.fillText(text, rx - bw + 10, y + 18)
}

function pageLogo(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
  sectionLabel(e, e.pageNo - 1, 'Logo')
  const m = b.grid.margin, top = m + 96, gap = b.grid.gutter
  const cols = o === 'landscape' ? 4 : 2
  const cw = (w - m * 2 - gap * (cols - 1)) / cols
  const ch = o === 'landscape' ? 300 : cw * 0.78
  const places = logoPlacements(b, e.logo)
  places.forEach((p, i) => {
    const bx = m + (i % cols) * (cw + gap), by = top + Math.floor(i / cols) * (ch + 86)
    x.fillStyle = p.bg; roundRect(x, bx, by, cw, ch, Math.min(b.radius, 16)); x.fill()
    if (p.bg === b.surfaces.light) { x.strokeStyle = 'rgba(0,0,0,0.08)'; x.lineWidth = 1; x.stroke() }
    drawMark(e, bx + cw * 0.22, by + ch * 0.22, cw * 0.56, ch * 0.56, b.roles[0].hex, p.mode)
    x.fillStyle = ink(e); x.font = `600 ${o === 'landscape' ? 18 : 20}px "${b.fonts.body.family}"`; x.fillText(p.bgName, bx, by + ch + 32)
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.font = `400 ${o === 'landscape' ? 15 : 17}px "${b.fonts.body.family}"`
    x.fillText(p.mode === 'original' ? 'Full colour' : p.mode === 'white' ? 'Reversed white' : 'Dark mono', bx, by + ch + 56)
    badge(e, `${p.ratio.toFixed(2)}:1`, p.ok, bx + cw, by + ch + 14)
  })
  const rows = Math.ceil(places.length / cols), ry = top + rows * (ch + 86) + 24
  x.fillStyle = ink(e); x.font = `700 ${o === 'landscape' ? 24 : 28}px "${b.fonts.heading.family}"`; x.fillText('Use', m, ry)
  const note = e.logo
    ? 'Use full colour wherever it clears 3:1 against the background. Where it does not, use the version shown. Do not stretch, rotate, recolour outside these versions, or add effects.'
    : 'Add a logo to test it against every background in the palette. Until then this page shows a placeholder mark.'
  para(x, note, o === 'landscape' ? 19 : 22, m, ry + 38, o === 'landscape' ? w * 0.62 : w - m * 2, 'rgba(0,0,0,0.6)', b.fonts.body.family)
  footer(e)
}

function pageLogoHero(e: Env) {
  const { x, w, h, b, o } = e
  const p = logoPlacements(b, e.logo)[1]
  x.fillStyle = p.bg; x.fillRect(0, 0, w, h)
  const lt = onLight(p.bg)
  sectionLabel(e, e.pageNo - 1, 'Logo', lt ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)')
  const bw = w * (o === 'landscape' ? 0.42 : 0.62), bh = h * (o === 'landscape' ? 0.46 : 0.36)
  drawMark(e, (w - bw) / 2, (h - bh) / 2 - h * 0.02, bw, bh, b.roles[0].hex, p.mode)
  x.fillStyle = lt ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)'; x.font = `400 ${o === 'landscape' ? 20 : 24}px "${b.fonts.body.family}"`
  x.textAlign = 'center'; x.fillText(`The primary mark, ${p.mode === 'original' ? 'in full colour' : p.mode === 'white' ? 'reversed' : 'in dark mono'} on brand ${b.roles[0].hex.toUpperCase()}`, w / 2, h - b.grid.margin * 1.4); x.textAlign = 'left'
  footer(e, lt)
}

function pageClearSpace(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
  sectionLabel(e, e.pageNo - 1, 'Clear space and minimum size')
  const m = b.grid.margin, top = m + 90
  const panelW = o === 'landscape' ? w * 0.58 - m : w - m * 2
  const panelH = o === 'landscape' ? h - top - m * 1.3 : h * 0.5
  const px = m, py = top
  // Blueprint panel with a fine grid.
  x.fillStyle = b.neutral[50]; roundRect(x, px, py, panelW, panelH, 12); x.fill()
  x.save(); roundRect(x, px, py, panelW, panelH, 12); x.clip()
  x.strokeStyle = 'rgba(0,0,0,0.05)'; x.lineWidth = 1
  for (let gx = px; gx < px + panelW; gx += 20) { x.beginPath(); x.moveTo(gx + 0.5, py); x.lineTo(gx + 0.5, py + panelH); x.stroke() }
  for (let gy = py; gy < py + panelH; gy += 20) { x.beginPath(); x.moveTo(px, gy + 0.5); x.lineTo(px + panelW, gy + 0.5); x.stroke() }
  // Size the mark so mark + clear space on both sides fills about 70% of the panel.
  const cs = b.logo.clearSpace, ar = markAspect(e)
  const maxH = Math.min(panelH * 0.7 / (1 + 2 * cs), (panelW * 0.8) / (ar + 2 * cs))
  const mh = maxH, mw = mh * ar, u = mh * cs
  const mx = px + (panelW - mw) / 2, my = py + (panelH - mh) / 2
  // Exclusion zone, hatched.
  const zx = mx - u, zy = my - u, zw = mw + u * 2, zh = mh + u * 2
  x.save(); x.beginPath(); x.rect(zx, zy, zw, zh); x.rect(mx, my, mw, mh); x.clip('evenodd')
  x.strokeStyle = b.roles[0].ramp[300]; x.globalAlpha = 0.55; x.lineWidth = 1.5
  for (let d = -zh; d < zw + zh; d += 12) { x.beginPath(); x.moveTo(zx + d, zy); x.lineTo(zx + d - zh, zy + zh); x.stroke() }
  x.restore()
  drawMark(e, mx, my, mw, mh, b.roles[0].hex, modeFor(e, b.neutral[50]))
  // Boundaries.
  x.strokeStyle = b.roles[0].ramp[600]; x.lineWidth = 1.5; x.setLineDash([8, 6]); x.strokeRect(zx, zy, zw, zh); x.setLineDash([])
  x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1; x.strokeRect(mx, my, mw, mh)
  // The x unit on each side.
  const unit = (ux: number, uy: number, uw: number, uh: number) => {
    x.fillStyle = b.roles[0].hex; x.globalAlpha = 0.18; x.fillRect(ux, uy, uw, uh); x.globalAlpha = 1
    x.fillStyle = b.roles[0].ramp[800]; x.font = `italic 600 ${Math.max(14, Math.min(28, u * 0.5))}px "${b.fonts.heading.family}"`
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('x', ux + uw / 2, uy + uh / 2); x.textAlign = 'left'; x.textBaseline = 'alphabetic'
  }
  unit(mx + mw / 2 - u / 2, zy, u, u); unit(mx + mw / 2 - u / 2, my + mh, u, u); unit(zx, my + mh / 2 - u / 2, u, u); unit(mx + mw, my + mh / 2 - u / 2, u, u)
  // Dimension: mark height.
  const dx = zx + zw + 22
  x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 1
  x.beginPath(); x.moveTo(dx, my); x.lineTo(dx, my + mh); x.moveTo(dx - 6, my); x.lineTo(dx + 6, my); x.moveTo(dx - 6, my + mh); x.lineTo(dx + 6, my + mh); x.stroke()
  x.fillStyle = 'rgba(0,0,0,0.6)'; x.font = `500 14px "${b.fonts.mono.family}"`; x.fillText('H', dx + 10, my + mh / 2 + 5)
  x.restore()

  // Rules column.
  const rx = o === 'landscape' ? px + panelW + b.grid.gutter * 2 : m
  const rw = o === 'landscape' ? w - m - rx : w - m * 2
  let ry = o === 'landscape' ? top + 24 : py + panelH + 70
  const rule = (title: string, body: string) => {
    x.fillStyle = ink(e); x.font = `700 ${o === 'landscape' ? 26 : 30}px "${b.fonts.heading.family}"`; x.fillText(title, rx, ry)
    ry = para(x, body, o === 'landscape' ? 18 : 21, rx, ry + 36, rw, 'rgba(0,0,0,0.6)', b.fonts.body.family) + 34
  }
  const frac = cs === 0.25 ? 'a quarter of' : cs === 0.5 ? 'half' : cs === 1 ? 'the full' : `${cs} ×`
  rule('Clear space', `x equals ${frac} the height of the mark (H). Keep at least x clear on every side. Nothing enters the hatched zone: text, images, other logos or the edge of the page.`)
  const mm = (b.logo.minWidth * 25.4) / 96
  rule('Minimum size', `Never smaller than ${b.logo.minWidth}px wide on screen, or ${mm.toFixed(1)}mm in print. Below that, detail is lost.`)
  // Actual-size sample. One page pixel is one CSS pixel on the landscape deck.
  const sw = b.logo.minWidth, sh = sw / ar
  x.strokeStyle = 'rgba(0,0,0,0.12)'; x.strokeRect(rx, ry - 6, sw + 24, sh + 24)
  drawMark(e, rx + 12, ry + 6, sw, sh, b.roles[0].hex, modeFor(e, '#ffffff'))
  x.fillStyle = 'rgba(0,0,0,0.5)'; x.font = `400 15px "${b.fonts.body.family}"`; x.fillText(`${b.logo.minWidth}px, shown at minimum`, rx + sw + 40, ry + 6 + sh / 2 + 5)
  footer(e)
}

const mono = (e: Env) => e.b.fonts.mono.family
const setTrack = (x: Ctx, em: number, px: number) => { (x as unknown as { letterSpacing: string }).letterSpacing = `${(em * px).toFixed(2)}px` }
const ink = (e: Env) => e.b.surfaces.inkOnLight

function pageColour(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
  sectionLabel(e, e.pageNo - 1, 'Colour')
  const m = b.grid.margin, top = m + 96, gap = b.grid.gutter
  const specs = (r: typeof b.roles[number], X: number, Y: number, W: number) => {
    x.fillStyle = ink(e); x.font = `700 ${o === 'landscape' ? 26 : 30}px "${b.fonts.heading.family}"`; x.fillText(r.name, X, Y)
    x.fillStyle = 'rgba(0,0,0,0.55)'; x.font = `400 ${o === 'landscape' ? 17 : 20}px "${b.fonts.body.family}"`
    let yy = para(x, r.usage, o === 'landscape' ? 17 : 20, X, Y + 32, W, 'rgba(0,0,0,0.55)', b.fonts.body.family, 1.4) + 8
    x.fillStyle = ink(e); x.font = `500 ${o === 'landscape' ? 16 : 19}px "${mono(e)}"`
    for (const line of [`HEX ${r.hex.toUpperCase()}`, fmtOklch(r.hex), ...colorSpecLine(r.hex).split('   ')]) { x.fillText(clampText(x, line, W), X, yy); yy += o === 'landscape' ? 26 : 30 }
  }
  if (o === 'landscape') {
    const cw = (w - m * 2 - gap * 2) / 3, sh = 300
    b.roles.forEach((r, i) => {
      const bx = m + i * (cw + gap)
      x.fillStyle = r.hex; roundRect(x, bx, top, cw, sh, Math.min(b.radius, 24)); x.fill()
      x.fillStyle = r.ink; x.font = `600 20px "${b.fonts.body.family}"`; x.fillText(`Aa ${r.name}`, bx + 24, top + sh - 26)
      specs(r, bx, top + sh + 48, cw)
    })
  } else {
    const sw = (w - m * 2) * 0.42, sh = 300
    b.roles.forEach((r, i) => {
      const by = top + i * (sh + 56)
      x.fillStyle = r.hex; roundRect(x, m, by, sw, sh, Math.min(b.radius, 24)); x.fill()
      x.fillStyle = r.ink; x.font = `600 22px "${b.fonts.body.family}"`; x.fillText(`Aa ${r.name}`, m + 24, by + sh - 26)
      specs(r, m + sw + gap * 1.5, by + 34, w - m * 2 - sw - gap * 1.5)
    })
  }
  // usage ratio
  const barH = o === 'landscape' ? 34 : 44, barY = h - m * 1.25 - barH
  x.fillStyle = ink(e); x.font = `700 ${o === 'landscape' ? 20 : 24}px "${b.fonts.heading.family}"`; x.fillText('Usage ratio', m, barY - 16)
  let rx = m; const barW = w - m * 2
  b.ratios.forEach(r => { const seg = (r.pct / 100) * barW; x.fillStyle = r.hex; x.fillRect(rx, barY, seg, barH); if (r.hex === b.surfaces.light) { x.strokeStyle = 'rgba(0,0,0,0.1)'; x.strokeRect(rx + 0.5, barY + 0.5, seg - 1, barH - 1) } x.fillStyle = onLight(r.hex) ? '#fff' : '#111'; x.font = `600 15px "${b.fonts.body.family}"`; if (seg > 70) x.fillText(`${r.name} ${r.pct}%`, rx + 10, barY + barH / 2 + 5); else if (seg > 34) x.fillText(`${r.pct}%`, rx + 6, barY + barH / 2 + 5); rx += seg })
  x.fillStyle = 'rgba(0,0,0,0.4)'; x.font = `400 14px "${b.fonts.body.family}"`
  x.textAlign = 'right'; x.fillText('CMYK values are approximate. Confirm against a printed proof.', w - m, barY - 16); x.textAlign = 'left'
  footer(e)
}

function pageRamps(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
  sectionLabel(e, e.pageNo - 1, 'Tints and shades')
  const m = b.grid.margin, top = m + 96
  const labelW = o === 'landscape' ? 170 : 150, cw = (w - m * 2 - labelW) / 10
  const rowH = o === 'landscape' ? 84 : 110, rowGap = o === 'landscape' ? 26 : 40
  x.fillStyle = 'rgba(0,0,0,0.4)'; x.font = `500 14px "${mono(e)}"`
  RAMP_STEPS.forEach((s, i) => x.fillText(String(s), m + labelW + i * cw + 2, top))
  const rows = [...b.roles.map(r => ({ name: r.name, ramp: r.ramp, src: r.step as number })), { name: 'Neutral', ramp: b.neutral, src: -1 }]
  rows.forEach((row, ri) => {
    const y = top + 16 + ri * (rowH + rowGap)
    x.fillStyle = ink(e); x.font = `600 ${o === 'landscape' ? 20 : 22}px "${b.fonts.body.family}"`; x.fillText(row.name, m, y + rowH / 2 + 7)
    RAMP_STEPS.forEach((s, i) => {
      const hex = row.ramp[s], cx = m + labelW + i * cw
      x.fillStyle = hex; x.fillRect(cx, y, cw - 3, rowH)
      if (s === 50) { x.strokeStyle = 'rgba(0,0,0,0.08)'; x.strokeRect(cx + 0.5, y + 0.5, cw - 4, rowH - 1) }
      x.fillStyle = onLight(hex) ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)'; x.font = `500 ${o === 'landscape' ? 12 : 13}px "${mono(e)}"`
      x.fillText(hex.slice(1).toUpperCase(), cx + 7, y + rowH - 10)
      if (s === row.src) { x.beginPath(); x.arc(cx + 13, y + 14, 5, 0, Math.PI * 2); x.fill() }
    })
  })
  const sy = top + 16 + rows.length * (rowH + rowGap) + 10
  x.fillStyle = ink(e); x.font = `700 ${o === 'landscape' ? 20 : 24}px "${b.fonts.heading.family}"`; x.fillText('Feedback', m, sy)
  const sw = (w - m * 2 - b.grid.gutter * 2) / 3
  b.semantic.forEach((r, i) => {
    const sx = m + i * (sw + b.grid.gutter)
    x.fillStyle = r.hex; roundRect(x, sx, sy + 20, 56, 56, Math.min(b.radius, 12)); x.fill()
    x.fillStyle = ink(e); x.font = `600 18px "${b.fonts.body.family}"`; x.fillText(r.name, sx + 72, sy + 44)
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.font = `400 15px "${mono(e)}"`; x.fillText(r.hex.toUpperCase(), sx + 72, sy + 68)
  })
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.font = `400 15px "${b.fonts.body.family}"`
  para(x, 'Ramps are built in OKLCH, so each step has the same perceived lightness across hues. The dot marks where the source colour sits.', 15, m, h - m * 1.1, w - m * 2, 'rgba(0,0,0,0.45)', b.fonts.body.family)
  footer(e)
}

function pageAccess(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
  sectionLabel(e, e.pageNo - 1, 'Accessible pairings')
  const m = b.grid.margin, top = m + 96, gap = b.grid.gutter * 0.8
  const cols = o === 'landscape' ? 3 : 2, rows = Math.ceil(b.pairs.length / cols)
  const cw = (w - m * 2 - gap * (cols - 1)) / cols
  const ch = (h - top - m * 1.5 - gap * (rows - 1)) / rows
  const pass = b.semantic[0].ramp[700], fail = b.semantic[2].ramp[600]
  b.pairs.forEach((p, i) => {
    const bx = m + (i % cols) * (cw + gap), by = top + Math.floor(i / cols) * (ch + gap)
    const sampleH = ch - 58
    x.save(); roundRect(x, bx, by, cw, ch, Math.min(b.radius, 14)); x.clip()
    x.fillStyle = p.bg; x.fillRect(bx, by, cw, sampleH)
    x.fillStyle = '#fff'; x.fillRect(bx, by + sampleH, cw, 58)
    x.restore()
    x.strokeStyle = 'rgba(0,0,0,0.1)'; roundRect(x, bx, by, cw, ch, Math.min(b.radius, 14)); x.stroke()
    x.fillStyle = p.fg; x.font = `700 ${Math.min(40, sampleH * 0.3)}px "${b.fonts.heading.family}"`; x.fillText('Aa', bx + 22, by + sampleH * 0.48)
    x.font = `400 ${Math.min(18, sampleH * 0.14)}px "${b.fonts.body.family}"`; x.fillText(clampText(x, `${p.fgName} on ${p.bgName}`, cw - 44), bx + 22, by + sampleH * 0.48 + 30)
    const ok = p.ratio >= p.need
    x.fillStyle = ink(e); x.font = `600 17px "${b.fonts.body.family}"`; x.fillText(clampText(x, p.use, cw - 170), bx + 18, by + sampleH + 36)
    const badge = `${p.ratio.toFixed(2)}  ${ok ? p.grade : 'Fail'}`
    x.font = `600 15px "${mono(e)}"`; const bw = x.measureText(badge).width + 22
    x.fillStyle = ok ? pass : fail; roundRect(x, bx + cw - bw - 14, by + sampleH + 15, bw, 30, 15); x.fill()
    x.fillStyle = '#fff'; x.fillText(badge, bx + cw - bw - 3, by + sampleH + 35)
  })
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.font = `400 15px "${b.fonts.body.family}"`
  x.fillText('WCAG 2.2: 4.5:1 for body text, 3:1 for large text and icons, 7:1 for AAA.', m, h - m * 0.95)
  footer(e)
}

function pageType(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
  sectionLabel(e, e.pageNo - 1, 'Typography')
  const m = b.grid.margin, top = m + 110
  const specimen = (fam: string, role: string, X: number, W: number, weight: number) => {
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.font = `600 ${o === 'landscape' ? 18 : 20}px "${b.fonts.body.family}"`; x.fillText(role, X, top)
    x.fillStyle = ink(e); x.font = `${weight} ${o === 'landscape' ? 150 : 170}px "${fam}"`; x.fillText('Aa', X, top + (o === 'landscape' ? 165 : 185))
    x.font = `600 ${o === 'landscape' ? 26 : 30}px "${fam}"`; x.fillText(clampText(x, fam, W), X, top + (o === 'landscape' ? 215 : 245))
    x.fillStyle = 'rgba(0,0,0,0.55)'; x.font = `400 ${o === 'landscape' ? 19 : 22}px "${fam}"`
    let yy = top + (o === 'landscape' ? 256 : 292)
    for (const line of ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789 &@?!%()'] ) { x.fillText(clampText(x, line, W), X, yy); yy += o === 'landscape' ? 30 : 34 }
  }
  const gap = b.grid.gutter * 2
  if (o === 'landscape') {
    const cw = (w - m * 2 - gap) / 2
    specimen(b.fonts.heading.family, 'Headings', m, cw, 700)
    specimen(b.fonts.body.family, 'Body', m + cw + gap, cw, 400)
  } else {
    specimen(b.fonts.heading.family, 'Headings', m, w - m * 2, 700)
    x.save(); x.translate(0, 470); specimen(b.fonts.body.family, 'Body', m, w - m * 2, 400); x.restore()
  }
  const my = o === 'landscape' ? h - m * 2.4 : h - m * 3
  x.strokeStyle = 'rgba(0,0,0,0.1)'; x.beginPath(); x.moveTo(m, my - 44); x.lineTo(w - m, my - 44); x.stroke()
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.font = `600 ${o === 'landscape' ? 16 : 18}px "${b.fonts.body.family}"`; x.fillText('Data and code', m, my - 10)
  x.fillStyle = ink(e); x.font = `400 ${o === 'landscape' ? 22 : 24}px "${mono(e)}"`; x.fillText(clampText(x, `${b.fonts.mono.family}  0123456789  £1,240.50  ${b.roles[0].hex.toUpperCase()}`, w - m * 2), m, my + 26)
  x.fillStyle = 'rgba(0,0,0,0.55)'; para(x, b.fonts.pairing + '.', o === 'landscape' ? 18 : 20, m, my + 66, w - m * 2, 'rgba(0,0,0,0.55)', b.fonts.body.family)
  footer(e)
}

function pageScale(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
  sectionLabel(e, e.pageNo - 1, 'Type scale')
  const m = b.grid.margin, top = m + 100
  x.fillStyle = ink(e); x.font = `700 ${o === 'landscape' ? 26 : 30}px "${b.fonts.heading.family}"`
  x.fillText(`${b.ratioLabel}, ${b.ratio} on a ${b.baseSize}px base`, m, top + 8)
  const labelW = 110
  const cols: [string, number][] = o === 'landscape' ? [['Size', 170], ['Line', 80], ['Track', 100], ['Wt', 50]] : [['Size', 180], ['Line', 70], ['Wt', 50]]
  const specW = cols.reduce((a, c) => a + c[1], 0)
  const colX = (i: number) => w - m - specW + cols.slice(0, i).reduce((a, c) => a + c[1], 0)
  const hy = top + 56
  x.fillStyle = 'rgba(0,0,0,0.4)'; x.font = `600 14px "${b.fonts.body.family}"`
  cols.forEach((c, i) => x.fillText(c[0], colX(i), hy))
  const avail = h - hy - m * 1.2
  const rowOf = (px: number, k: number) => Math.max(40, px * k * 1.12 + 16)
  let k = 1
  for (let i = 0; i < 30 && b.scale.reduce((a, s) => a + rowOf(s.px, k), 0) > avail; i++) k *= 0.95
  let yy = hy + 16
  b.scale.forEach(s => {
    const px = Math.max(s.px * k, Math.min(s.px, 12)), rowH = rowOf(s.px, k)
    x.strokeStyle = 'rgba(0,0,0,0.07)'; x.beginPath(); x.moveTo(m, yy); x.lineTo(w - m, yy); x.stroke()
    const mid = yy + rowH / 2
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.font = `500 15px "${b.fonts.body.family}"`; x.fillText(s.label, m, mid + 5)
    const fam = s.family === 'heading' ? b.fonts.heading.family : b.fonts.body.family
    x.fillStyle = ink(e); x.font = `${s.weight} ${px}px "${fam}"`; setTrack(x, s.tracking, px)
    x.textBaseline = 'middle'; x.fillText(clampText(x, s.px >= 28 ? b.name : b.principles[0].body, w - m * 2 - labelW - specW - 24), m + labelW, mid + px * 0.04); x.textBaseline = 'alphabetic'
    setTrack(x, 0, 0)
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.font = `400 14px "${mono(e)}"`
    const vals = o === 'landscape' ? [`${s.px}px  ${s.rem}rem`, String(s.lineHeight), `${s.tracking}em`, String(s.weight)] : [`${s.px}px  ${s.rem}rem`, String(s.lineHeight), String(s.weight)]
    vals.forEach((v, i) => x.fillText(v, colX(i), mid + 5))
    yy += rowH
  })
  if (k < 0.999) { x.fillStyle = 'rgba(0,0,0,0.4)'; x.font = `400 14px "${b.fonts.body.family}"`; x.textAlign = 'right'; x.fillText(`Samples at ${Math.round(k * 100)}% to fit. Values are actual size.`, w - m, top + 8); x.textAlign = 'left' }
  footer(e)
}

function pageTokens(e: Env) {
  const { x, w, h, b, o } = e
  const bg = b.surfaces.dark
  x.fillStyle = bg; x.fillRect(0, 0, w, h)
  sectionLabel(e, e.pageNo - 1, 'Tokens for developers', 'rgba(255,255,255,0.5)')
  const m = b.grid.margin, top = m + 110
  x.fillStyle = '#fff'; x.font = `700 ${o === 'landscape' ? 40 : 46}px "${b.fonts.heading.family}"`; x.fillText('Build with the same values', m, top)
  para(x, 'Every colour, size and spacing value on these pages ships as CSS variables, a Tailwind theme, design tokens JSON and an Adobe swatch file.', o === 'landscape' ? 19 : 22, m, top + 44, o === 'landscape' ? w * 0.4 : w - m * 2, 'rgba(255,255,255,0.65)', b.fonts.body.family)
  const lines = toCss(b).split('\n').filter(l => !/-(50|100|200|300|400|600|800):/.test(l) && !/--(leading|tracking|weight)-/.test(l))
  const codeX = o === 'landscape' ? w * 0.47 : m, codeY = o === 'landscape' ? top - 20 : top + 170
  const codeW = o === 'landscape' ? w - codeX - m : w - m * 2, codeH = h - codeY - m * 1.4
  x.fillStyle = 'rgba(255,255,255,0.05)'; roundRect(x, codeX, codeY, codeW, codeH, 12); x.fill()
  const lh = o === 'landscape' ? 21 : 25, fs = o === 'landscape' ? 14 : 16
  const maxLines = Math.floor((codeH - 40) / lh)
  x.font = `400 ${fs}px "${mono(e)}"`
  lines.slice(0, maxLines).forEach((l, i) => {
    const y = codeY + 32 + i * lh
    const hex = l.match(/#[0-9a-f]{6}/i)?.[0]
    x.fillStyle = l.startsWith('/*') ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)'
    x.fillText(clampText(x, l, codeW - 70), codeX + 24, y)
    if (hex) { x.fillStyle = hex; roundRect(x, codeX + codeW - 40, y - fs + 2, fs, fs, 3); x.fill() }
  })
  footer(e, true)
}

function pageMockups(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = b.neutrals[0]; x.fillRect(0, 0, w, h)
  sectionLabel(e, e.pageNo - 1, 'In use')
  const m = b.grid.margin, top = m + 100
  const gap = b.grid.gutter
  // Poster + card + UI buttons
  const cols = o === 'landscape' ? [0.34, 0.30, 0.36] : [0.5, 0.5]
  let cx = m
  const areaH = o === 'landscape' ? h - top - m * 1.6 : (h - top - m * 1.6 - gap) / 2
  // Poster
  const pw = (w - m * 2 - gap * (cols.length - 1)) * cols[0]
  mockPoster(e, cx, top, pw, areaH); cx += pw + gap
  // Card
  const cardw = (w - m * 2 - gap * (cols.length - 1)) * cols[1]
  mockCard(e, cx, top, cardw, o === 'landscape' ? areaH : cardw * 0.62); cx += cardw + gap
  // UI
  if (o === 'landscape') { const uiw = (w - m * 2 - gap * 2) * cols[2]; mockUI(e, cx, top, uiw, areaH) }
  else mockUI(e, m, top + areaH + gap, w - m * 2, areaH)
  footer(e)
}

function mockPoster(e: Env, X: number, Y: number, W: number, H: number) {
  const { x, b } = e
  x.fillStyle = b.palette[0].hex; roundRect(x, X, Y, W, H, 14); x.fill()
  const ink = onLight(b.palette[0].hex) ? '#fff' : '#111'
  const pad = W * 0.09
  drawMark(e, X + pad, Y + pad, W * 0.16, W * 0.16, ink, modeFor(e, b.palette[0].hex))
  x.fillStyle = ink; x.font = `700 ${W * 0.13}px "${b.fonts.heading.family}"`
  let yy = Y + H * 0.55; wrap(x, b.principles[0].title, W - pad * 2).forEach(l => { x.fillText(l, X + pad, yy); yy += W * 0.14 })
  x.globalAlpha = 0.8; x.font = `400 ${W * 0.05}px "${b.fonts.body.family}"`; x.fillText(clampText(x, b.tagline || b.name, W - pad * 2), X + pad, yy + 10); x.globalAlpha = 1
  x.fillStyle = b.accent; roundRect(x, X + pad, Y + H - pad - W * 0.13, W * 0.42, W * 0.13, b.radius); x.fill()
  x.fillStyle = onLight(b.accent) ? '#fff' : '#111'; x.font = `600 ${W * 0.05}px "${b.fonts.body.family}"`; x.fillText('Learn more', X + pad + W * 0.06, Y + H - pad - W * 0.045)
}
function mockCard(e: Env, X: number, Y: number, W: number, H: number) {
  const { x, b } = e
  x.fillStyle = '#fff'; roundRect(x, X, Y, W, H, 14); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.08)'; x.lineWidth = 1; x.stroke()
  const pad = W * 0.08
  x.fillStyle = b.palette[1].hex; roundRect(x, X + pad, Y + pad, W - pad * 2, H * 0.42, 10); x.fill()
  x.fillStyle = '#111'; x.font = `700 ${W * 0.075}px "${b.fonts.heading.family}"`; x.fillText(clampText(x, b.name, W - pad * 2), X + pad, Y + H * 0.62)
  x.fillStyle = 'rgba(0,0,0,0.5)'; x.font = `400 ${W * 0.045}px "${b.fonts.body.family}"`
  para(x, b.principles[1].body, W * 0.045, X + pad, Y + H * 0.72, W - pad * 2, 'rgba(0,0,0,0.5)', b.fonts.body.family, 1.4)
}
function mockUI(e: Env, X: number, Y: number, W: number, H: number) {
  const { x, b } = e
  x.fillStyle = '#fff'; roundRect(x, X, Y, W, H, 14); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.08)'; x.lineWidth = 1; x.stroke()
  const pad = W * 0.08, bw = W - pad * 2, bh = Math.min(H * 0.14, 64)
  const btns: [string, string, string][] = [
    ['Primary', b.accent, onLight(b.accent) ? '#fff' : '#111'],
    ['Secondary', b.palette[1].hex, onLight(b.palette[1].hex) ? '#fff' : '#111'],
  ]
  let yy = Y + pad
  btns.forEach(([label, bg, fg]) => { x.fillStyle = bg; roundRect(x, X + pad, yy, bw, bh, b.radius); x.fill(); x.fillStyle = fg; x.font = `600 ${bh * 0.34}px "${b.fonts.body.family}"`; x.textAlign = 'center'; x.fillText(label, X + W / 2, yy + bh * 0.62); x.textAlign = 'left'; yy += bh + pad * 0.5 })
  // outline
  x.strokeStyle = b.accent; x.lineWidth = 2; roundRect(x, X + pad, yy, bw, bh, b.radius); x.stroke()
  x.fillStyle = b.accent; x.font = `600 ${bh * 0.34}px "${b.fonts.body.family}"`; x.textAlign = 'center'; x.fillText('Outline', X + W / 2, yy + bh * 0.62); x.textAlign = 'left'; yy += bh + pad * 0.7
  // swatch chips row
  b.palette.slice(0, 4).forEach((c, i) => { x.fillStyle = c.hex; roundRect(x, X + pad + i * ((bw / 4)), yy, bw / 4 - 8, bh * 0.5, 6); x.fill() })
}

function pageVoice(e: Env) {
  const { x, w, h, b, o } = e
  const dark = b.neutrals[4]; const ink = onLight(dark) ? '#fff' : '#111'
  x.fillStyle = dark; x.fillRect(0, 0, w, h)
  const m = b.grid.margin
  x.fillStyle = ink; x.globalAlpha = 0.5; x.font = `600 ${o === 'landscape' ? 20 : 22}px "${b.fonts.body.family}"`; x.fillText(`${String(e.pageNo - 1).padStart(2, '0')}  VOICE`, m, m + 24); x.globalAlpha = 1
  x.font = `700 ${o === 'landscape' ? 64 : 76}px "${b.fonts.heading.family}"`
  let yy = m + (o === 'landscape' ? 140 : 170); wrap(x, b.voice.tone, w - m * 2).forEach(l => { x.fillText(l, m, yy); yy += (o === 'landscape' ? 70 : 84) })
  yy += 30
  const colW = (w - m * 2 - b.grid.gutter) / 2
  const list = (title: string, items: string[], X: number, accent: string) => {
    x.fillStyle = accent; x.font = `700 ${o === 'landscape' ? 26 : 30}px "${b.fonts.heading.family}"`; x.fillText(title, X, yy)
    let ly = yy + (o === 'landscape' ? 46 : 54)
    x.font = `400 ${o === 'landscape' ? 24 : 28}px "${b.fonts.body.family}"`
    items.forEach(it => { x.fillStyle = ink; x.globalAlpha = 0.85; for (const line of wrap(x, '·  ' + it, colW)) { x.fillText(line, X, ly); ly += (o === 'landscape' ? 36 : 42) } ly += 8 }); x.globalAlpha = 1
  }
  list('Do', b.voice.dos, m, b.semantic[0].ramp[300])
  list("Don't", b.voice.donts, m + colW + b.grid.gutter, b.semantic[2].ramp[300])
  footer(e, onLight(dark))
}

function pageClosing(e: Env) {
  const { x, w, h, b, o } = e
  const p0 = b.palette[2]?.hex ?? b.palette[0].hex, ink = onLight(p0) ? '#fff' : '#111'
  x.fillStyle = p0; x.fillRect(0, 0, w, h)
  const m = b.grid.margin
  drawMark(e, w / 2 - 70, h * 0.32, 140, 140, ink, modeFor(e, p0))
  x.fillStyle = ink; x.textAlign = 'center'
  x.font = `700 ${o === 'landscape' ? 60 : 72}px "${b.fonts.heading.family}"`; x.fillText(b.name, w / 2, h * 0.62)
  x.globalAlpha = 0.75; x.font = `400 ${o === 'landscape' ? 26 : 30}px "${b.fonts.body.family}"`; x.fillText(b.tagline || 'Thank you', w / 2, h * 0.62 + 50); x.globalAlpha = 1
  x.textAlign = 'left'
}

// ─── LAYOUT VARIANTS ───────────────────────────────────────────────

function coverMonolith(e: Env) {
  const { x, w, h, b, o } = e
  const bg = b.surfaces.dark, fg = '#ffffff'
  x.fillStyle = bg; x.fillRect(0, 0, w, h)
  const m = b.grid.margin
  // The name fills the width, set tight, and sits on the bottom margin.
  const name = b.name
  let size = 400
  x.font = `700 ${size}px "${b.fonts.heading.family}"`; setTrack(x, -0.03, size)
  while (x.measureText(name).width > w - m * 2 && size > 60) { size -= 6; x.font = `700 ${size}px "${b.fonts.heading.family}"`; setTrack(x, -0.03, size) }
  x.fillStyle = fg; x.fillText(name, m - size * 0.03, h - m * (o === 'landscape' ? 1.1 : 1.6))
  setTrack(x, 0, 0)
  x.fillStyle = b.roles[0].hex; x.fillRect(m, m, o === 'landscape' ? 120 : 140, 10)
  x.fillStyle = 'rgba(255,255,255,0.7)'; x.font = `500 ${o === 'landscape' ? 22 : 26}px "${b.fonts.body.family}"`
  x.fillText('Brand guidelines', m, m + 56)
  if (b.tagline) para(x, b.tagline, o === 'landscape' ? 26 : 30, m, m + 104, w * 0.45, 'rgba(255,255,255,0.9)', b.fonts.body.family)
  drawMark(e, w - m - (o === 'landscape' ? 110 : 130), m - 10, o === 'landscape' ? 110 : 130, o === 'landscape' ? 110 : 130, b.roles[0].hex, modeFor(e, b.surfaces.dark))
}

function coverCentred(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = b.surfaces.light; x.fillRect(0, 0, w, h)
  const band = o === 'landscape' ? h * 0.1 : h * 0.07
  x.fillStyle = b.roles[0].hex; x.fillRect(0, h - band, w, band)
  const mark = o === 'landscape' ? 210 : 260
  drawMark(e, (w - mark * markAspect(e)) / 2, h * 0.24, mark * markAspect(e), mark, b.roles[0].hex, modeFor(e, '#ffffff'))
  x.textAlign = 'center'; x.fillStyle = ink(e)
  let size = o === 'landscape' ? 96 : 104
  x.font = `700 ${size}px "${b.fonts.heading.family}"`
  while (x.measureText(b.name).width > w * 0.8 && size > 40) { size -= 4; x.font = `700 ${size}px "${b.fonts.heading.family}"` }
  x.fillText(b.name, w / 2, h * 0.24 + mark + size * 1.3)
  x.fillStyle = 'rgba(0,0,0,0.55)'; x.font = `400 ${o === 'landscape' ? 24 : 28}px "${b.fonts.body.family}"`
  x.fillText(b.tagline || 'Brand guidelines', w / 2, h * 0.24 + mark + size * 1.3 + 54)
  x.fillStyle = b.roles[0].ink; x.font = `500 ${o === 'landscape' ? 18 : 20}px "${b.fonts.body.family}"`
  x.fillText(`Brand guidelines, ${new Date().getFullYear()}`, w / 2, h - band / 2 + 6)
  x.textAlign = 'left'
}

function principlesStatements(e: Env) {
  const { x, w, h, b, o } = e
  const n = b.principles.length, bandH = h / n
  const tones = [b.roles[0].ramp[50], b.roles[0].ramp[100], b.roles[0].ramp[200]]
  const m = b.grid.margin
  b.principles.forEach((p, i) => {
    const y = i * bandH
    x.fillStyle = tones[i % tones.length]; x.fillRect(0, y, w, bandH)
    x.fillStyle = b.roles[0].ramp[900]
    const maxW = o === 'landscape' ? w * 0.45 - m : w - m * 2
    let tsize = o === 'landscape' ? 64 : 58
    const fit = () => { x.font = `700 ${tsize}px "${b.fonts.heading.family}"`; setTrack(x, -0.015, tsize) }
    fit(); while (x.measureText(p.title).width > maxW && tsize > 30) { tsize -= 2; fit() }
    if (o === 'landscape') {
      x.fillText(clampText(x, p.title, w * 0.45 - m), m, y + bandH / 2 + tsize * 0.35); setTrack(x, 0, 0)
      para(x, p.body, 24, w * 0.52, y + bandH / 2 - 10, w * 0.48 - m, b.roles[0].ramp[800], b.fonts.body.family, 1.45)
    } else {
      x.fillText(clampText(x, p.title, w - m * 2), m, y + bandH * 0.42); setTrack(x, 0, 0)
      para(x, p.body, 26, m, y + bandH * 0.42 + 56, w - m * 2, b.roles[0].ramp[800], b.fonts.body.family, 1.45)
    }
  })
  x.fillStyle = b.roles[0].ramp[700]; x.font = `600 ${o === 'landscape' ? 20 : 22}px "${b.fonts.body.family}"`
  x.fillText(`${String(e.pageNo - 1).padStart(2, '0')}  PRINCIPLES`, m, m * 0.7)
  footer(e)
}

function colourBands(e: Env) {
  const { x, w, h, b, o } = e
  const bands = [...b.roles.map(r => ({ name: r.name, hex: r.hex, ink: r.ink })), { name: 'Light surface', hex: b.surfaces.light, ink: b.surfaces.inkOnLight }, { name: 'Dark surface', hex: b.surfaces.dark, ink: '#ffffff' }]
  const weights = [3, 2, 1.4, 1.6, 1.4], total = weights.reduce((a, v) => a + v, 0)
  const m = b.grid.margin
  let pos = 0
  bands.forEach((band, i) => {
    const size = (weights[i] / total) * (o === 'landscape' ? w : h)
    const [X, Y, W, H] = o === 'landscape' ? [pos, 0, size, h] : [0, pos, w, size]
    x.fillStyle = band.hex; x.fillRect(X, Y, W, H)
    const pad = o === 'landscape' ? 28 : m
    const ty = o === 'landscape' ? h - m * 1.6 : Y + H - 40
    x.fillStyle = band.ink; x.font = `700 ${o === 'landscape' ? 26 : 32}px "${b.fonts.heading.family}"`
    x.fillText(clampText(x, band.name, W - pad * 2), X + pad, o === 'landscape' ? ty - 96 : Y + 56)
    x.font = `500 ${o === 'landscape' ? 15 : 18}px "${b.fonts.mono.family}"`
    const lines = [band.hex.toUpperCase(), ...colorSpecLine(band.hex).split('   ')]
    lines.forEach((l, li) => x.fillText(clampText(x, l, W - pad * 2), X + pad, o === 'landscape' ? ty - 58 + li * 24 : ty - (lines.length - 1 - li) * 26))
    pos += size
  })
  x.fillStyle = bands[0].ink; x.globalAlpha = 0.75; x.font = `600 ${o === 'landscape' ? 20 : 22}px "${b.fonts.body.family}"`
  x.fillText(`${String(e.pageNo - 1).padStart(2, '0')}  COLOUR`, o === 'landscape' ? 28 : m, m * 0.8); x.globalAlpha = 1
}

function voiceLight(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = b.roles[0].ramp[50]; x.fillRect(0, 0, w, h)
  sectionLabel(e, e.pageNo - 1, 'Voice', b.roles[0].ramp[700])
  const m = b.grid.margin
  x.fillStyle = b.roles[0].ramp[900]; x.font = `700 ${o === 'landscape' ? 72 : 80}px "${b.fonts.heading.family}"`
  let yy = m + (o === 'landscape' ? 170 : 200)
  wrap(x, b.voice.tone, w - m * 2).forEach(l => { x.fillText(l, m, yy); yy += o === 'landscape' ? 80 : 90 })
  yy += 40
  const colW = (w - m * 2 - b.grid.gutter) / 2
  const col = (title: string, items: string[], X: number, mark: string, tone: string) => {
    x.fillStyle = tone; x.font = `700 ${o === 'landscape' ? 26 : 30}px "${b.fonts.heading.family}"`; x.fillText(title, X, yy)
    let ly = yy + 50
    items.forEach(it => {
      x.fillStyle = tone; x.font = `700 22px "${b.fonts.body.family}"`; x.fillText(mark, X, ly)
      x.fillStyle = b.roles[0].ramp[900]; ly = para(x, it, o === 'landscape' ? 23 : 26, X + 34, ly, colW - 34, b.roles[0].ramp[900], b.fonts.body.family, 1.35) + 10
    })
  }
  col('Do', b.voice.dos, m, '+', b.semantic[0].ramp[700])
  col("Don't", b.voice.donts, m + colW + b.grid.gutter, '×', b.semantic[2].ramp[700])
  footer(e)
}

function closingMinimal(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
  const m = b.grid.margin, sz = o === 'landscape' ? 72 : 90
  drawMark(e, m, h - m - sz * 2.6, sz * markAspect(e), sz, b.roles[0].hex, modeFor(e, '#ffffff'))
  x.fillStyle = ink(e); x.font = `700 ${o === 'landscape' ? 44 : 52}px "${b.fonts.heading.family}"`; x.fillText(b.name, m, h - m - sz * 0.9)
  x.fillStyle = 'rgba(0,0,0,0.5)'; x.font = `400 ${o === 'landscape' ? 20 : 24}px "${b.fonts.body.family}"`
  x.fillText(b.tagline || `Brand guidelines, ${new Date().getFullYear()}`, m, h - m - sz * 0.9 + 40)
  x.fillStyle = b.roles[2].hex; x.fillRect(w - m - 12, m, 12, h - m * 2)
}

function roundRect(x: Ctx, X: number, Y: number, W: number, H: number, r: number) { x.beginPath(); x.roundRect(X, Y, W, H, r) }

// ─── BUILD ──────────────────────────────────────────────────────────
// Every page kind has one or more layouts. The outliner decides order, visibility and layout.

export type PageKind = 'cover' | 'principles' | 'logo' | 'clearspace' | 'colour' | 'ramps' | 'access' | 'type' | 'scale' | 'mockups' | 'voice' | 'tokens' | 'closing'
export interface PageSpec { kind: PageKind; variant: number; on: boolean }
type Variant = { label: string; draw: (e: Env) => void }

export const PAGE_DEFS: Record<PageKind, { title: string; variants: Variant[] }> = {
  cover: { title: 'Cover', variants: [{ label: 'Art direction', draw: pageCover }, { label: 'Monolith', draw: coverMonolith }, { label: 'Centred', draw: coverCentred }] },
  principles: { title: 'Principles', variants: [{ label: 'Columns', draw: pagePrinciples }, { label: 'Statements', draw: principlesStatements }] },
  logo: { title: 'Logo', variants: [{ label: 'Backgrounds', draw: pageLogo }, { label: 'Hero', draw: pageLogoHero }] },
  clearspace: { title: 'Clear space', variants: [{ label: 'Blueprint', draw: pageClearSpace }] },
  colour: { title: 'Colour', variants: [{ label: 'Specs', draw: pageColour }, { label: 'Bands', draw: colourBands }] },
  ramps: { title: 'Tints', variants: [{ label: 'Ramps', draw: pageRamps }] },
  access: { title: 'Contrast', variants: [{ label: 'Pairings', draw: pageAccess }] },
  type: { title: 'Typography', variants: [{ label: 'Specimens', draw: pageType }] },
  scale: { title: 'Type scale', variants: [{ label: 'Table', draw: pageScale }] },
  mockups: { title: 'In use', variants: [{ label: 'Mockups', draw: pageMockups }] },
  voice: { title: 'Voice', variants: [{ label: 'Dark', draw: pageVoice }, { label: 'Light', draw: voiceLight }] },
  tokens: { title: 'Tokens', variants: [{ label: 'Code', draw: pageTokens }] },
  closing: { title: 'Close', variants: [{ label: 'Colour', draw: pageClosing }, { label: 'Minimal', draw: closingMinimal }] },
}
export const DEFAULT_PAGES: PageSpec[] = (['cover', 'principles', 'logo', 'clearspace', 'colour', 'ramps', 'access', 'type', 'scale', 'mockups', 'voice', 'tokens', 'closing'] as PageKind[]).map(kind => ({ kind, variant: 0, on: true }))

export async function renderPage(spec: PageSpec, pageNo: number, pageCount: number, brand: Brand, logo: LogoInfo | null, o: Orientation, scale = 1): Promise<HTMLCanvasElement> {
  await Promise.all([loadFont(brand.fonts.heading, [400, 600, 700]), loadFont(brand.fonts.body, [400, 500, 600]), loadFont(brand.fonts.mono, [400, 500, 600])])
  const size = SIZES[o]
  const c = document.createElement('canvas'); c.width = Math.round(size.w * scale); c.height = Math.round(size.h * scale)
  const x = c.getContext('2d')!
  x.scale(scale, scale); x.textBaseline = 'alphabetic'; x.textAlign = 'left'
  const def = PAGE_DEFS[spec.kind], v = def.variants[Math.min(spec.variant, def.variants.length - 1)]
  v.draw({ x, w: size.w, h: size.h, b: brand, logo, o, pageNo, pageCount })
  return c
}

/**
 * Render visible pages one at a time, hand each to `fn`, then release its pixels.
 * Holding every page at print resolution at once can exceed Safari's canvas memory limit.
 */
export async function eachPage(pages: PageSpec[], brand: Brand, logo: LogoInfo | null, o: Orientation, scale: number, fn: (canvas: HTMLCanvasElement, title: string, index: number, count: number) => Promise<void>) {
  const on = pages.filter(p => p.on)
  for (let i = 0; i < on.length; i++) {
    const c = await renderPage(on[i], i + 1, on.length, brand, logo, o, scale)
    try { await fn(c, PAGE_DEFS[on[i].kind].title, i, on.length) } finally { c.width = 0; c.height = 0 }
  }
}

/** Record visible pages as editable items (text, shapes, images) for the Editor. */
export async function recordPages(pages: PageSpec[], brand: Brand, logo: LogoInfo | null, o: Orientation, onPage?: (i: number, n: number) => void): Promise<(RecordedPage & { title: string })[]> {
  await Promise.all([loadFont(brand.fonts.heading, [400, 600, 700]), loadFont(brand.fonts.body, [400, 500, 600]), loadFont(brand.fonts.mono, [400, 500, 600])])
  const size = SIZES[o], on = pages.filter(p => p.on), out: (RecordedPage & { title: string })[] = []
  for (let i = 0; i < on.length; i++) {
    onPage?.(i, on.length)
    const def = PAGE_DEFS[on[i].kind], v = def.variants[Math.min(on[i].variant, def.variants.length - 1)]
    const rec = recordPage(size.w, size.h, x => { x.textBaseline = 'alphabetic'; x.textAlign = 'left'; v.draw({ x, w: size.w, h: size.h, b: brand, logo, o, pageNo: i + 1, pageCount: on.length }) })
    out.push({ ...rec, title: def.title })
    await new Promise(r => setTimeout(r, 0)) // let the progress label paint
  }
  return out
}
