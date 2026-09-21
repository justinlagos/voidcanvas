import { onLight, type Brand } from './brandgen'
import { ensureFont } from '@/editor/io'

// A guideline is a list of PAGES. Each page is drawn on its own canvas at full size,
// so the deck is real slides and the document is real pages, never one long scroll.
// Three art directions change layout, not just colour, so output feels designed.

export type Orientation = 'landscape' | 'portrait'
export const SIZES = { landscape: { w: 1600, h: 900 }, portrait: { w: 1240, h: 1754 } }

export interface PageMeta { title: string; kind: string }

type Ctx = CanvasRenderingContext2D
interface Env { x: Ctx; w: number; h: number; b: Brand; logo: HTMLImageElement | null; o: Orientation; pageNo: number; pageCount: number }

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

// Draw the logo, or a neat placeholder mark, into a box.
function drawMark(e: Env, bx: number, by: number, bw: number, bh: number, onColor: string, invert = false) {
  const { x, logo, b } = e
  if (logo) {
    const s = Math.min(bw / logo.width, bh / logo.height)
    const lw = logo.width * s, lh = logo.height * s
    if (invert) { x.save(); x.filter = 'brightness(0) invert(1)'; x.drawImage(logo, bx + (bw - lw) / 2, by + (bh - lh) / 2, lw, lh); x.restore() }
    else x.drawImage(logo, bx + (bw - lw) / 2, by + (bh - lh) / 2, lw, lh)
  } else {
    const r = Math.min(bw, bh) * 0.32
    x.fillStyle = onColor
    x.beginPath(); x.arc(bx + bw / 2, by + bh / 2, r, 0, Math.PI * 2); x.fill()
    x.fillStyle = invert ? '#fff' : b.palette[0].hex
    x.font = `700 ${r}px "${b.fonts.heading}"`; x.textAlign = 'center'; x.textBaseline = 'middle'
    x.fillText((b.name[0] || 'B').toUpperCase(), bx + bw / 2, by + bh / 2 + r * 0.04)
    x.textAlign = 'left'; x.textBaseline = 'alphabetic'
  }
}

function footer(e: Env) {
  const { x, w, h, b, pageNo, pageCount } = e
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.font = `500 ${e.o === 'landscape' ? 18 : 20}px "${b.fonts.body}"`
  const m = b.grid.margin
  x.fillText(`${b.name} · Brand guidelines`, m, h - m * 0.5)
  const num = `${String(pageNo).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`
  x.textAlign = 'right'; x.fillText(num, w - m, h - m * 0.5); x.textAlign = 'left'
}

function sectionLabel(e: Env, n: number, label: string, color = 'rgba(0,0,0,0.4)') {
  const { x, b } = e, m = b.grid.margin
  x.fillStyle = color; x.font = `600 ${e.o === 'landscape' ? 20 : 22}px "${b.fonts.body}"`
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
    x.fillStyle = b.palette[2]?.hex ?? b.palette[1].hex
    x.fillRect(w * 0.66, 0, w * 0.34, h)
    x.fillStyle = b.accent
    x.fillRect(w * 0.66, h * 0.62, w * 0.34, h * 0.38)
  } else if (b.direction === 'systematic') {
    // Faint grid.
    x.strokeStyle = onLight(p0.hex) ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'; x.lineWidth = 1
    for (let i = 1; i < b.grid.cols; i++) { const gx = m + ((w - m * 2) / b.grid.cols) * i; x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, h); x.stroke() }
  }

  drawMark(e, m, m, o === 'landscape' ? 120 : 150, o === 'landscape' ? 120 : 150, ink)
  x.fillStyle = ink; x.globalAlpha = 0.7
  x.font = `600 ${o === 'landscape' ? 22 : 26}px "${b.fonts.body}"`
  x.fillText('BRAND GUIDELINES', m, h * (o === 'landscape' ? 0.52 : 0.58))
  x.globalAlpha = 1
  // Shrink the title to fit the available width instead of clipping it, so short names never truncate.
  const titleMax = w * (b.direction === 'graphic' ? 0.56 : 0.86) - m * 2
  let titleSize = o === 'landscape' ? 150 : 128
  x.font = `700 ${titleSize}px "${b.fonts.heading}"`
  while (x.measureText(b.name).width > titleMax && titleSize > 44) { titleSize -= 4; x.font = `700 ${titleSize}px "${b.fonts.heading}"` }
  x.fillText(b.name, m, h * (o === 'landscape' ? 0.68 : 0.72))
  if (b.tagline) { x.globalAlpha = 0.85; para(x, b.tagline, o === 'landscape' ? 30 : 34, m, h * (o === 'landscape' ? 0.68 : 0.72) + 60, w * 0.5, ink, b.fonts.body); x.globalAlpha = 1 }
  x.globalAlpha = 0.6; x.font = `500 ${o === 'landscape' ? 20 : 22}px "${b.fonts.body}"`
  x.fillText(`${b.personality} · ${new Date().getFullYear()}`, m, h - m * 0.7); x.globalAlpha = 1
}

function pagePrinciples(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
  sectionLabel(e, 1, 'Principles')
  const m = b.grid.margin, top = m + 120
  if (o === 'landscape') {
    const colW = (w - m * 2 - b.grid.gutter * 2) / 3
    b.principles.forEach((p, i) => {
      const cx = m + i * (colW + b.grid.gutter)
      x.fillStyle = b.accent; x.fillRect(cx, top, 48, 6)
      x.fillStyle = '#111'; x.font = `700 ${34}px "${b.fonts.heading}"`
      let yy = top + 60; wrap(x, p.title, colW).forEach(l => { x.fillText(l, cx, yy); yy += 40 })
      para(x, p.body, 24, cx, yy + 20, colW, 'rgba(0,0,0,0.6)', b.fonts.body)
    })
  } else {
    let yy = top
    b.principles.forEach(p => {
      x.fillStyle = b.accent; x.fillRect(m, yy, 6, 90)
      x.fillStyle = '#111'; x.font = `700 40px "${b.fonts.heading}"`; x.fillText(p.title, m + 40, yy + 44)
      yy = para(x, p.body, 26, m + 40, yy + 90, w - m * 2 - 40, 'rgba(0,0,0,0.6)', b.fonts.body) + 40
    })
  }
  footer(e)
}

function pageLogo(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
  sectionLabel(e, 2, 'Logo')
  const m = b.grid.margin, top = m + 100
  const cols = o === 'landscape' ? 3 : 2
  const gap = b.grid.gutter
  const cw = (w - m * 2 - gap * (cols - 1)) / cols
  const ch = o === 'landscape' ? (h - top - m * 1.6) * 0.62 : cw * 0.8
  const bgs = [
    { bg: '#ffffff', label: 'On white', border: true, invert: false },
    { bg: b.palette[0].hex, label: 'On primary', border: false, invert: onLight(b.palette[0].hex) },
    { bg: b.neutrals[4], label: 'On dark neutral', border: false, invert: onLight(b.neutrals[4]) },
  ].slice(0, cols)
  bgs.forEach((v, i) => {
    const bx = m + i * (cw + gap)
    x.fillStyle = v.bg; roundRect(x, bx, top, cw, ch, 14); x.fill()
    if (v.border) { x.strokeStyle = 'rgba(0,0,0,0.1)'; x.lineWidth = 1; x.stroke() }
    drawMark(e, bx + cw * 0.2, top + ch * 0.2, cw * 0.6, ch * 0.6, v.invert ? '#fff' : b.palette[0].hex, v.invert)
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.font = `500 ${o === 'landscape' ? 18 : 20}px "${b.fonts.body}"`
    x.fillText(v.label, bx, top + ch + 34)
  })
  // Clear space + min size rules
  const ry = top + ch + 90
  x.fillStyle = '#111'; x.font = `700 ${o === 'landscape' ? 24 : 28}px "${b.fonts.heading}"`; x.fillText('Clear space and minimum size', m, ry + 10)
  para(x, `Keep clear space of at least ${b.logo.clearSpace}× the logo height on all sides. Never reproduce the logo below ${b.logo.minWidth}px wide. Do not stretch, rotate, recolour outside the palette, or add effects.`, o === 'landscape' ? 22 : 26, m, ry + 46, w - m * 2, 'rgba(0,0,0,0.6)', b.fonts.body)
  footer(e)
}

function pageColour(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
  sectionLabel(e, 3, 'Colour')
  const m = b.grid.margin, top = m + 100
  const cols = o === 'landscape' ? 4 : 2
  const gap = b.grid.gutter * 0.8
  const cw = (w - m * 2 - gap * (cols - 1)) / cols
  const rows = Math.ceil(b.palette.length / cols)
  const chip = o === 'landscape' ? 200 : 220
  b.palette.forEach((c, i) => {
    const r = Math.floor(i / cols), col = i % cols
    const bx = m + col * (cw + gap), by = top + r * (chip + 120)
    x.fillStyle = c.hex; roundRect(x, bx, by, cw, chip, 12); x.fill()
    x.fillStyle = c.onLight ? '#fff' : '#111'; x.font = `600 ${o === 'landscape' ? 22 : 24}px "${b.fonts.body}"`
    x.fillText(c.name, bx + 20, by + chip - 24)
    x.fillStyle = '#111'; x.font = `500 ${o === 'landscape' ? 20 : 22}px monospace`
    x.fillText(c.hex.toUpperCase(), bx, by + chip + 36)
    // tints
    const tw = cw / c.tints.length
    c.tints.forEach((t, ti) => { x.fillStyle = t; roundRect(x, bx + ti * tw, by + chip + 52, tw - 4, 22, 4); x.fill() })
  })
  const ratioY = top + rows * (chip + 120) + 10
  if (ratioY < h - m * 2.2) {
    x.fillStyle = '#111'; x.font = `700 ${o === 'landscape' ? 24 : 28}px "${b.fonts.heading}"`; x.fillText('Usage ratio', m, ratioY + 10)
    let rx = m; const barY = ratioY + 34, barW = w - m * 2, barH = o === 'landscape' ? 40 : 52
    b.ratios.forEach(r => { const seg = (r.pct / 100) * barW; x.fillStyle = r.hex; x.fillRect(rx, barY, seg, barH); x.fillStyle = onLight(r.hex) ? '#fff' : '#111'; x.font = `600 16px "${b.fonts.body}"`; if (seg > 40) x.fillText(`${r.pct}%`, rx + 8, barY + barH / 2 + 6); rx += seg })
  }
  footer(e)
}

function pageType(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
  sectionLabel(e, 4, 'Typography')
  const m = b.grid.margin, top = m + 110
  // Two big font specimens
  const half = (w - m * 2 - b.grid.gutter) / 2
  const specimen = (fam: string, role: string, bx: number) => {
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.font = `600 ${o === 'landscape' ? 18 : 20}px "${b.fonts.body}"`; x.fillText(role.toUpperCase(), bx, top)
    x.fillStyle = '#111'; x.font = `700 ${o === 'landscape' ? 130 : 150}px "${fam}"`; x.fillText('Aa', bx, top + (o === 'landscape' ? 150 : 170))
    x.font = `500 ${o === 'landscape' ? 26 : 30}px "${fam}"`; x.fillStyle = 'rgba(0,0,0,0.55)'
    x.fillText(fam, bx, top + (o === 'landscape' ? 200 : 230))
    x.font = `400 ${o === 'landscape' ? 18 : 20}px "${fam}"`; x.fillStyle = 'rgba(0,0,0,0.4)'
    x.fillText('ABCDEFGHIJKLM abcdefghijklm 0123456789', bx, top + (o === 'landscape' ? 236 : 270))
  }
  specimen(b.fonts.heading, 'Headings', m)
  specimen(b.fonts.body, 'Body', m + half + b.grid.gutter)
  // Scale ladder
  const scaleTop = top + (o === 'landscape' ? 300 : 340)
  let yy = scaleTop
  b.scale.forEach(s => {
    const useHead = s.label !== 'Body' && s.label !== 'Small'
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.font = `400 ${o === 'landscape' ? 16 : 18}px "${b.fonts.body}"`
    x.fillText(`${s.label} · ${s.px}px · ${s.weight}`, m, yy + 6)
    x.fillStyle = '#111'; x.font = `${s.weight} ${Math.min(s.px * 1.5, o === 'landscape' ? 56 : 66)}px "${useHead ? b.fonts.heading : b.fonts.body}"`
    x.fillText(clampText(x, `${b.name} ${b.principles[0].title}`, w - m * 2 - 240), m + 240, yy + Math.min(s.px * 0.5, 22))
    yy += Math.min(s.px * 1.5, o === 'landscape' ? 56 : 66) + 20
  })
  footer(e)
}

function pageMockups(e: Env) {
  const { x, w, h, b, o } = e
  x.fillStyle = b.neutrals[0]; x.fillRect(0, 0, w, h)
  sectionLabel(e, 5, 'In use')
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
  drawMark(e, X + pad, Y + pad, W * 0.16, W * 0.16, ink, onLight(b.palette[0].hex))
  x.fillStyle = ink; x.font = `700 ${W * 0.13}px "${b.fonts.heading}"`
  let yy = Y + H * 0.55; wrap(x, b.principles[0].title, W - pad * 2).forEach(l => { x.fillText(l, X + pad, yy); yy += W * 0.14 })
  x.globalAlpha = 0.8; x.font = `400 ${W * 0.05}px "${b.fonts.body}"`; x.fillText(clampText(x, b.tagline || b.name, W - pad * 2), X + pad, yy + 10); x.globalAlpha = 1
  x.fillStyle = b.accent; roundRect(x, X + pad, Y + H - pad - W * 0.13, W * 0.42, W * 0.13, b.radius); x.fill()
  x.fillStyle = onLight(b.accent) ? '#fff' : '#111'; x.font = `600 ${W * 0.05}px "${b.fonts.body}"`; x.fillText('Learn more', X + pad + W * 0.06, Y + H - pad - W * 0.045)
}
function mockCard(e: Env, X: number, Y: number, W: number, H: number) {
  const { x, b } = e
  x.fillStyle = '#fff'; roundRect(x, X, Y, W, H, 14); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.08)'; x.lineWidth = 1; x.stroke()
  const pad = W * 0.08
  x.fillStyle = b.palette[1].hex; roundRect(x, X + pad, Y + pad, W - pad * 2, H * 0.42, 10); x.fill()
  x.fillStyle = '#111'; x.font = `700 ${W * 0.075}px "${b.fonts.heading}"`; x.fillText(clampText(x, b.name, W - pad * 2), X + pad, Y + H * 0.62)
  x.fillStyle = 'rgba(0,0,0,0.5)'; x.font = `400 ${W * 0.045}px "${b.fonts.body}"`
  para(x, b.principles[1].body, W * 0.045, X + pad, Y + H * 0.72, W - pad * 2, 'rgba(0,0,0,0.5)', b.fonts.body, 1.4)
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
  btns.forEach(([label, bg, fg]) => { x.fillStyle = bg; roundRect(x, X + pad, yy, bw, bh, b.radius); x.fill(); x.fillStyle = fg; x.font = `600 ${bh * 0.34}px "${b.fonts.body}"`; x.textAlign = 'center'; x.fillText(label, X + W / 2, yy + bh * 0.62); x.textAlign = 'left'; yy += bh + pad * 0.5 })
  // outline
  x.strokeStyle = b.accent; x.lineWidth = 2; roundRect(x, X + pad, yy, bw, bh, b.radius); x.stroke()
  x.fillStyle = b.accent; x.font = `600 ${bh * 0.34}px "${b.fonts.body}"`; x.textAlign = 'center'; x.fillText('Outline', X + W / 2, yy + bh * 0.62); x.textAlign = 'left'; yy += bh + pad * 0.7
  // swatch chips row
  b.palette.slice(0, 4).forEach((c, i) => { x.fillStyle = c.hex; roundRect(x, X + pad + i * ((bw / 4)), yy, bw / 4 - 8, bh * 0.5, 6); x.fill() })
}

function pageVoice(e: Env) {
  const { x, w, h, b, o } = e
  const dark = b.neutrals[4]; const ink = onLight(dark) ? '#fff' : '#111'
  x.fillStyle = dark; x.fillRect(0, 0, w, h)
  const m = b.grid.margin
  x.fillStyle = ink; x.globalAlpha = 0.5; x.font = `600 ${o === 'landscape' ? 20 : 22}px "${b.fonts.body}"`; x.fillText('06  VOICE', m, m + 24); x.globalAlpha = 1
  x.font = `700 ${o === 'landscape' ? 64 : 76}px "${b.fonts.heading}"`
  let yy = m + (o === 'landscape' ? 140 : 170); wrap(x, b.voice.tone, w - m * 2).forEach(l => { x.fillText(l, m, yy); yy += (o === 'landscape' ? 70 : 84) })
  yy += 30
  const colW = (w - m * 2 - b.grid.gutter) / 2
  const list = (title: string, items: string[], X: number, accent: string) => {
    x.fillStyle = accent; x.font = `700 ${o === 'landscape' ? 26 : 30}px "${b.fonts.heading}"`; x.fillText(title, X, yy)
    let ly = yy + (o === 'landscape' ? 46 : 54)
    x.font = `400 ${o === 'landscape' ? 24 : 28}px "${b.fonts.body}"`
    items.forEach(it => { x.fillStyle = ink; x.globalAlpha = 0.85; for (const line of wrap(x, '·  ' + it, colW)) { x.fillText(line, X, ly); ly += (o === 'landscape' ? 36 : 42) } ly += 8 }); x.globalAlpha = 1
  }
  list('Do', b.voice.dos, m, '#4ade80')
  list("Don't", b.voice.donts, m + colW + b.grid.gutter, '#fb7185')
  footer(e)
}

function pageClosing(e: Env) {
  const { x, w, h, b, o } = e
  const p0 = b.palette[2]?.hex ?? b.palette[0].hex, ink = onLight(p0) ? '#fff' : '#111'
  x.fillStyle = p0; x.fillRect(0, 0, w, h)
  const m = b.grid.margin
  drawMark(e, w / 2 - 70, h * 0.32, 140, 140, ink, onLight(p0))
  x.fillStyle = ink; x.textAlign = 'center'
  x.font = `700 ${o === 'landscape' ? 60 : 72}px "${b.fonts.heading}"`; x.fillText(b.name, w / 2, h * 0.62)
  x.globalAlpha = 0.75; x.font = `400 ${o === 'landscape' ? 26 : 30}px "${b.fonts.body}"`; x.fillText(b.tagline || 'Thank you', w / 2, h * 0.62 + 50); x.globalAlpha = 1
  x.textAlign = 'left'
}

function roundRect(x: Ctx, X: number, Y: number, W: number, H: number, r: number) { x.beginPath(); x.roundRect(X, Y, W, H, r) }

// ─── BUILD ──────────────────────────────────────────────────────────

const PAGES: { meta: PageMeta; draw: (e: Env) => void }[] = [
  { meta: { title: 'Cover', kind: 'cover' }, draw: pageCover },
  { meta: { title: 'Principles', kind: 'principles' }, draw: pagePrinciples },
  { meta: { title: 'Logo', kind: 'logo' }, draw: pageLogo },
  { meta: { title: 'Colour', kind: 'colour' }, draw: pageColour },
  { meta: { title: 'Typography', kind: 'type' }, draw: pageType },
  { meta: { title: 'In use', kind: 'mockups' }, draw: pageMockups },
  { meta: { title: 'Voice', kind: 'voice' }, draw: pageVoice },
  { meta: { title: 'Close', kind: 'closing' }, draw: pageClosing },
]

export function pageList(): PageMeta[] { return PAGES.map(p => p.meta) }

export async function renderPage(index: number, brand: Brand, logo: HTMLImageElement | null, o: Orientation, scale = 1): Promise<HTMLCanvasElement> {
  await Promise.all([ensureFont(brand.fonts.heading, 700), ensureFont(brand.fonts.body, 400), ensureFont(brand.fonts.body, 600)])
  const size = SIZES[o]
  const c = document.createElement('canvas'); c.width = size.w * scale; c.height = size.h * scale
  const x = c.getContext('2d')!
  x.scale(scale, scale); x.textBaseline = 'alphabetic'; x.textAlign = 'left'
  PAGES[index].draw({ x, w: size.w, h: size.h, b: brand, logo, o, pageNo: index + 1, pageCount: PAGES.length })
  return c
}

export const PAGE_COUNT = PAGES.length
