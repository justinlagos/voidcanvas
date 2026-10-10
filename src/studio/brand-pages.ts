import type { Brand } from './brand/tokens'
import { recordPage, type RecordedPage } from './brand/record'
import { MODE_LABEL, MODE_OF, NO_DECISIONS, grayMark, logoPlacements, logoVariants, markContrast, monoMark, type LogoDecisions, type LogoInfo, type MarkMode } from './brand/logo'
import { placeOn } from '@/lib/intelligence/backgrounds'
import { markTarget } from '@/lib/intelligence/contrast'
import { strokeAt } from '@/lib/intelligence/brand'
import { loadFont } from './brand/fonts'
import { RAMP_STEPS, contrast, fmtOklch, luminance } from './brand/color'
import { colorSpecLine, toCss } from './brand/export'
import { BODY_KIND_MIN } from '@/brand/compose/body-pages'
import { markOnTone, placeOnPhoto, readPhoto, regionsFor, type Corner, type PhotoPlacement } from '@/lib/intelligence/photo'

const onLight = (hex: string) => luminance(hex) < 0.45

// A guideline is a list of PAGES. Each page is drawn on its own canvas at full size,
// so the deck is real slides and the document is real pages, never one long scroll.
// Three art directions change layout, not just colour, so output feels designed.

export type Orientation = 'landscape' | 'portrait'
export const SIZES = { landscape: { w: 1600, h: 900 }, portrait: { w: 1240, h: 1754 } }


type Ctx = CanvasRenderingContext2D
interface Env { x: Ctx; w: number; h: number; b: Brand; logo: LogoInfo | null; o: Orientation; pageNo: number; pageCount: number; d: LogoDecisions; photos: GuidePhoto[]; block?: boolean }

/**
 * A page's content can also be drawn as a block: just the content, filling a box another layout
 * provides (the V2 compositions). In block mode there is no page background, section label or
 * footer, and no page margins; w and h are the box. Drawn as a full page, nothing changes.
 */
function frame(e: Env, top: number, blockTop = 0) { return e.block ? { m: 0, top: blockTop } : { m: e.b.grid.margin, top: e.b.grid.margin + top } }
function paper(e: Env, fill: string) { if (e.block) return; e.x.fillStyle = fill; e.x.fillRect(0, 0, e.w, e.h) }

/** A photograph of the brand in use, decoded, for the photography page. */
export interface GuidePhoto { id: string; name: string; img: HTMLCanvasElement }

const clampText = (x: Ctx, s: string, max: number) => { let t = s; while (x.measureText(t).width > max && t.length > 1) t = t.slice(0, -1); return t === s ? s : t.slice(0, -1) + '…' }
/** As many whole words as fit, with no ellipsis: a specimen line is cut cleanly, the way type samples are. */
const fitWords = (x: Ctx, s: string, max: number) => {
  if (x.measureText(s).width <= max) return s
  const words = s.replace(/[.,;:]$/, '').split(' ')
  while (words.length > 1 && x.measureText(words.join(' ')).width > max) words.pop()
  return words.length > 1 ? words.join(' ').replace(/[.,;:]$/, '') : clampText(x, s, max)
}
/** Set a label's font, shrinking it until the text fits (down to a floor). Only then is the text shortened. */
function fitLabel(x: Ctx, s: string, max: number, size: number, weight: number | string, family: string, floor = 11) {
  let px = size; x.font = `${weight} ${px}px "${family}"`
  while (x.measureText(s).width > max && px > floor) { px -= 0.5; x.font = `${weight} ${px}px "${family}"` }
  return clampText(x, s, max)
}
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
/** The mark's pixels for a treatment. */
function markCanvas(e: Env, mode: MarkMode): HTMLCanvasElement {
  const { logo, b } = e
  if (!logo) throw new Error('no logo')
  if (mode === 'original') return logo.img
  if (mode === 'grayscale') return grayMark(logo)
  return monoOf(logo, mode === 'white' ? '#ffffff' : mode === 'brand' ? b.roles[0].hex : b.surfaces.inkOnLight)
}
function drawMark(e: Env, bx: number, by: number, bw: number, bh: number, onColor: string, invert: boolean | MarkMode = false) {
  const { x, logo, b } = e
  const mode: MarkMode = invert === true ? 'white' : invert === false ? 'original' : invert
  if (logo) {
    const s = Math.min(bw / logo.width, bh / logo.height)
    const lw = logo.width * s, lh = logo.height * s, lx = bx + (bw - lw) / 2, ly = by + (bh - lh) / 2
    x.drawImage(markCanvas(e, mode), lx, ly, lw, lh)
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
/** Which version of the mark to use on a background: full colour wherever it clears the target, else the best version that can honestly be made. */
function modeFor(e: Env, bg: string): MarkMode {
  if (!e.logo) { if (markContrast(null, e.b.roles[0].hex, bg) >= 3) return 'original'; return contrast('#ffffff', bg) >= contrast(e.b.surfaces.inkOnLight, bg) ? 'white' : 'dark' }
  // A palette background the designer decided on keeps that decision.
  const decided = logoPlacements(e.b, e.logo, e.d).find(p => p.bg.toLowerCase() === bg.toLowerCase() && p.designer)
  if (decided) return decided.mode
  const variants = logoVariants(e.b, e.logo, e.d).map(v => ({ id: v.id, valid: v.valid, profile: v.profile }))
  return MODE_OF[placeOn({ id: 'x', name: '', hex: bg, group: 'neutral' }, variants).use]
}

/**
 * How the mark goes on a colour: the version that reads there and, when no version does, a plate of the
 * light surface behind it, in the version that reads on that plate.
 */
export function markTreatment(b: Brand, logo: LogoInfo | null, d: LogoDecisions, bg: string): { mode: MarkMode; backing: { color: string; opacity: number } | null } {
  if (!logo) return { mode: markContrast(null, b.roles[0].hex, bg) >= 3 ? 'original' : contrast('#ffffff', bg) >= contrast(b.surfaces.inkOnLight, bg) ? 'white' : 'dark', backing: null }
  const decided = logoPlacements(b, logo, d).find(p => p.bg.toLowerCase() === bg.toLowerCase() && p.designer)
  if (decided) return { mode: decided.mode, backing: null }
  const variants = logoVariants(b, logo, d).map(v => ({ id: v.id, valid: v.valid, profile: v.profile }))
  const p = placeOn({ id: 'x', name: '', hex: bg, group: 'neutral' }, variants)
  if (p.level !== 'attention') return { mode: MODE_OF[p.use], backing: null }
  // On a flat colour a translucent scrim reads as a sticker, so the mark goes on a plate of the light surface.
  const plate = placeOn({ id: 'plate', name: '', hex: b.surfaces.light, group: 'neutral' }, variants)
  return { mode: MODE_OF[plate.use], backing: { color: b.surfaces.light, opacity: 1 } }
}

/** The contrast ratio of the mark in one version on a colour, measured the way the backgrounds page measures. */
function markContrastOf(e: Env, mode: MarkMode, bg: string) {
  if (!e.logo) return 0
  const v = logoVariants(e.b, e.logo, e.d).find(q => MODE_OF[q.id] === mode) ?? logoVariants(e.b, e.logo, e.d)[0]
  return placeOn({ id: 'x', name: '', hex: bg, group: 'neutral' }, [{ id: v.id, valid: true, profile: v.profile }]).result.ratio
}

/** The bounds a mark of this aspect takes inside a box, centred. */
function markBounds(e: Env, bx: number, by: number, bw: number, bh: number) {
  const ar = markAspect(e), s = Math.min(bw / ar, bh), w = s * ar
  return { x: bx + (bw - w) / 2, y: by + (bh - s) / 2, w, h: s }
}

/**
 * Draw the mark on a colour, in the version that reads there, with a plate behind it when needed. With
 * `inset`, a plate sits inside the box with the mark left-aligned in it, so the plate's edge lines up with
 * whatever the box lines up with.
 */
function drawMarkOn(e: Env, bx: number, by: number, bw: number, bh: number, bg: string, inset = false) {
  const t = markTreatment(e.b, e.logo, e.d, bg)
  if (t.backing && inset) {
    // The plate keeps the brand's clear space around the mark.
    const ar = markAspect(e), cs = e.b.logo.clearSpace
    const s = Math.min(bw / (ar + 2 * cs), bh / (1 + 2 * cs)), pad = Math.max(8, s * cs), mw = s * ar
    const mx = bx + pad, my = by + (bh - s) / 2
    e.x.save(); e.x.globalAlpha = t.backing.opacity; e.x.fillStyle = t.backing.color
    roundRect(e.x, bx, my - pad, mw + pad * 2, s + pad * 2, Math.min(e.b.radius, 12)); e.x.fill(); e.x.restore()
    return drawMark(e, mx, my, mw, s, e.b.roles[0].hex, t.mode)
  }
  if (t.backing) {
    const r = markBounds(e, bx, by, bw, bh), pad = Math.max(8, r.h * e.b.logo.clearSpace)
    e.x.save(); e.x.globalAlpha = t.backing.opacity; e.x.fillStyle = t.backing.color
    roundRect(e.x, r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2, Math.min(e.b.radius, 12)); e.x.fill(); e.x.restore()
  }
  return drawMark(e, bx, by, bw, bh, e.b.roles[0].hex, t.mode)
}
/** Aspect of the mark, so layouts can size boxes to it. */
const markAspect = (e: Env) => (e.logo ? e.logo.width / e.logo.height : 1)

function footer(e: Env, dark = false) {
  if (e.block) return
  const { x, w, h, b, pageNo, pageCount } = e
  x.fillStyle = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)'; x.font = `500 ${e.o === 'landscape' ? 18 : 20}px "${b.fonts.body.family}"`
  const m = b.grid.margin
  x.fillText(`${b.name} · Brand guidelines`, m, h - m * 0.5)
  const num = `${String(pageNo).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`
  x.textAlign = 'right'; x.fillText(num, w - m, h - m * 0.5); x.textAlign = 'left'
}

function sectionLabel(e: Env, n: number, label: string, color = 'rgba(0,0,0,0.4)') {
  if (e.block) return
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

  drawMarkOn(e, m, m, o === 'landscape' ? 120 : 150, o === 'landscape' ? 120 : 150, p0.hex)
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
  paper(e, '#fff')
  sectionLabel(e, e.pageNo - 1, 'Principles')
  const { m, top } = frame(e, 120)
  let bottom = top
  if (o === 'landscape') {
    // In a box the columns get wider gutters, and the body is set clearly smaller than the titles.
    const gutter = e.block ? b.grid.gutter * 2.5 : b.grid.gutter, bodySize = e.block ? 20 : 24
    const colW = (w - m * 2 - gutter * 2) / 3
    // One title size for all three, as large as the longest word in any of them allows.
    x.font = `700 34px "${b.fonts.heading.family}"`
    const longest = Math.max(...b.principles.flatMap(p => p.title.split(' ').map(word => x.measureText(word).width)))
    const ts = longest > colW ? Math.max(18, 34 * colW / longest) : 34
    x.font = `700 ${ts}px "${b.fonts.heading.family}"`
    const titleLines = b.principles.map(p => wrap(x, p.title, colW))
    // Bodies start on one shared line, below the tallest title.
    const bodyY = top + 60 + Math.max(...titleLines.map(l => l.length)) * ts * 1.18 + 20
    b.principles.forEach((p, i) => {
      const cx = m + i * (colW + gutter)
      x.fillStyle = b.accent; x.fillRect(cx, top, 48, 6)
      x.fillStyle = '#111'; x.font = `700 ${ts}px "${b.fonts.heading.family}"`
      titleLines[i].forEach((l, k) => x.fillText(l, cx, top + 60 + k * ts * 1.18))
      bottom = Math.max(bottom, para(x, p.body, bodySize, cx, bodyY, colW, 'rgba(0,0,0,0.6)', b.fonts.body.family))
    })
  } else {
    let yy = top
    b.principles.forEach(p => {
      x.fillStyle = b.accent; x.fillRect(m, yy, 6, 90)
      x.fillStyle = '#111'; x.font = `700 40px "${b.fonts.heading.family}"`; x.fillText(p.title, m + 40, yy + 44)
      yy = para(x, p.body, 26, m + 40, yy + 90, w - m * 2 - 40, 'rgba(0,0,0,0.6)', b.fonts.body.family) + 40
    })
    bottom = yy
  }
  footer(e)
  return bottom
}

function badge(e: Env, text: string, ok: boolean, rx: number, y: number) {
  const { x, b } = e
  x.font = `600 14px "${b.fonts.mono.family}"`; const bw = x.measureText(text).width + 20
  x.fillStyle = ok ? b.semantic[0].ramp[700] : b.semantic[2].ramp[600]; roundRect(x, rx - bw, y, bw, 26, 13); x.fill()
  x.fillStyle = '#fff'; x.fillText(text, rx - bw + 10, y + 18)
}

function pageLogo(e: Env) {
  const { x, w, h, b, o } = e
  paper(e, '#fff')
  sectionLabel(e, e.pageNo - 1, 'Logo on backgrounds')
  const { m, top } = frame(e, 84), gap = b.grid.gutter * 0.8
  const places = logoPlacements(b, e.logo, e.d)
  const cols = o === 'landscape' ? 5 : 3, rows = Math.ceil(places.length / cols)
  const cw = (w - m * 2 - gap * (cols - 1)) / cols
  const labelH = o === 'landscape' ? 66 : 74
  const plateTreatment = markTreatment(b, e.logo, e.d, b.surfaces.light), plateRatio = markContrastOf(e, plateTreatment.mode, b.surfaces.light)
  const plates = places.filter(p => p.level === 'attention').map(p => p.bgName.toLowerCase())
  // When the tiles cannot hold the mark at its minimum width, the page says so rather than breaking its own rule silently.
  const arN = markAspect(e), reduced = !!e.logo && b.logo.minWidth > Math.min(cw * 0.86, (o === 'landscape' ? 210 : cw * 0.8) * 0.84 * arN)
  const note = e.logo
    ? `Use full colour wherever it reaches ${markTarget(e.logo.profile).need}:1 (${markTarget(e.logo.profile).label}). On the other colours, use the version shown. Each ratio is measured on the part of the mark that touches the background.${plates.length ? ` No version reads on ${plates.slice(0, 3).join(', ')}${plates.length > 3 ? ' and others' : ''}, so there the mark sits on a plate of the light surface.` : ''}${reduced ? ` The tiles show the mark smaller than its ${b.logo.minWidth} px minimum; the minimum applies to real use.` : ''}${places.some(p => !p.designer) ? ' Suggested from the artwork until the brand confirms them.' : ''}`
    : 'Add a logo to test it against every background in the palette. Until then this page shows a placeholder mark.'
  const noteSize = o === 'landscape' ? 15 : 18
  // As a block the box can be narrower than a page, so the note's real height is measured and kept free.
  let noteRoom = o === 'landscape' ? 70 : 90
  if (e.block) { x.font = `${noteSize}px "${b.fonts.body.family}"`; noteRoom = 46 + wrap(x, note, w - m * 2).length * noteSize * 1.4 }
  const maxRowH = (h - top - m * 1.9 - noteRoom) / rows
  const ch = Math.min(o === 'landscape' ? 210 : cw * 0.8, maxRowH - labelH)
  places.forEach((p, i) => {
    const bx = m + (i % cols) * (cw + gap), by = top + Math.floor(i / cols) * (ch + labelH)
    x.fillStyle = p.bg; roundRect(x, bx, by, cw, ch, Math.min(b.radius, 14)); x.fill()
    if (luminance(p.bg) > 0.8) { x.strokeStyle = 'rgba(0,0,0,0.08)'; x.lineWidth = 1; x.stroke() }
    // A failing cell shows the fix the guideline suggests: the lightest scrim that would work, or a holding shape.
    // Tall marks get more of the tile's height, wide ones more of its width.
    // Never shown below the brand's own minimum width when the tile has the room.
    const ar = markAspect(e), mw = Math.max(cw * (ar > 3 ? 0.72 : 0.56), Math.min(cw * 0.86, b.logo.minWidth))
    const mh = Math.max(ch * (ar < 0.9 ? 0.66 : 0.52), Math.min(ch * 0.84, b.logo.minWidth / ar))
    // Where no version reads, the mark goes on an opaque plate of the light surface, in the version that
    // reads on the plate: a deliberate holding shape, not a translucent scrim that looks like a disabled state.
    const plated = !!e.logo && p.level === 'attention'
    const mode = plated ? plateTreatment.mode : p.mode
    if (plated) {
      const r = markBounds(e, bx + (cw - mw) / 2, by + (ch - mh) / 2, mw, mh), pad = Math.min(cw * 0.08, ch * 0.1)
      x.fillStyle = b.surfaces.light; roundRect(x, Math.max(bx + 6, r.x - pad), Math.max(by + 6, r.y - pad), Math.min(cw - 12, r.w + pad * 2), Math.min(ch - 12, r.h + pad * 2), Math.min(b.radius, 8)); x.fill()
    }
    drawMark(e, bx + (cw - mw) / 2, by + (ch - mh) / 2, mw, mh, b.roles[0].hex, mode)
    // The badge is measured first and the name takes the rest of the row, so neither covers the other.
    // On a plate the line below already says so, so the badge carries the ratio alone.
    const lvl = plated ? '' : p.level === 'good' ? ' Pass' : p.level === 'check' ? ' Marginal' : ' Fails'
    const badge = `${(plated ? plateRatio : p.ratio).toFixed(1)}:1${lvl}`
    x.font = `600 12px "${b.fonts.mono.family}"`; const badgeW = x.measureText(badge).width + 16
    x.fillStyle = ink(e); x.fillText(fitLabel(x, p.bgName, cw - badgeW - 10, o === 'landscape' ? 15 : 17, 600, b.fonts.body.family, 12), bx, by + ch + 26)
    x.fillStyle = 'rgba(0,0,0,0.5)'
    const sub = plated ? `${MODE_LABEL[mode]} on a plate` : p.level === 'attention' ? 'Avoid' : MODE_LABEL[p.mode]
    x.fillText(fitLabel(x, sub + (p.designer ? ' · set by you' : ''), cw - 4, o === 'landscape' ? 13 : 15, 400, b.fonts.body.family), bx, by + ch + 46)
    badgeLevel(e, badge, plated ? (plateRatio >= (e.logo ? markTarget(e.logo.profile).need : 3) ? 'good' : 'check') : p.level, bx + cw, by + ch + 8)
  })
  const ry = top + rows * (ch + labelH) + 18
  x.fillStyle = ink(e); x.font = `700 ${o === 'landscape' ? 20 : 24}px "${b.fonts.heading.family}"`; x.fillText('Use', m, ry)
  para(x, note, noteSize, m, ry + 28, w - m * 2, 'rgba(0,0,0,0.6)', b.fonts.body.family, 1.4)
  footer(e)
}

function badgeLevel(e: Env, text: string, level: 'good' | 'check' | 'attention', rx: number, y: number) {
  const { x, b } = e
  x.font = `600 12px "${b.fonts.mono.family}"`; const bw = x.measureText(text).width + 16
  x.fillStyle = level === 'good' ? b.semantic[0].ramp[700] : level === 'check' ? b.semantic[1].ramp[700] : b.semantic[2].ramp[600]; roundRect(x, rx - bw, y, bw, 22, 11); x.fill()
  x.fillStyle = '#fff'; x.fillText(text, rx - bw + 8, y + 15)
}

function pageLogoHero(e: Env) {
  const { x, w, h, b, o } = e
  const places = logoPlacements(b, e.logo, e.d)
  const p = places.find(q => q.id === 'brand') ?? places[0]
  x.fillStyle = p.bg; x.fillRect(0, 0, w, h)
  const lt = onLight(p.bg)
  sectionLabel(e, e.pageNo - 1, 'Logo', lt ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)')
  const bw = w * (o === 'landscape' ? 0.42 : 0.62), bh = h * (o === 'landscape' ? 0.46 : 0.36)
  if (p.level === 'attention' && p.fix) { x.fillStyle = p.fix.color; x.globalAlpha = p.fix.opacity; roundRect(x, (w - bw) / 2 - 60, (h - bh) / 2 - h * 0.02 - 40, bw + 120, bh + 80, 24); x.fill(); x.globalAlpha = 1 }
  drawMark(e, (w - bw) / 2, (h - bh) / 2 - h * 0.02, bw, bh, b.roles[0].hex, p.mode)
  x.fillStyle = lt ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)'; x.font = `400 ${o === 'landscape' ? 20 : 24}px "${b.fonts.body.family}"`
  x.textAlign = 'center'; x.fillText(`The primary mark, ${MODE_LABEL[p.mode].toLowerCase()} on brand ${b.roles[0].hex.toUpperCase()}${p.level === 'attention' && p.fix ? `, on a ${Math.round(p.fix.opacity * 100)}% scrim` : ''}`, w / 2, h - b.grid.margin * 1.4); x.textAlign = 'left'
  footer(e, lt)
}

function pageClearSpace(e: Env) {
  const { x, w, h, b, o } = e
  paper(e, '#fff')
  sectionLabel(e, e.pageNo - 1, 'Clear space')
  const { m, top } = frame(e, 90)
  const panelW = o === 'landscape' ? w * 0.58 - m : w - m * 2
  const panelH = o === 'landscape' ? h - top - m * 1.3 : h * 0.44
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
    ry = para(x, body, o === 'landscape' ? 18 : 21, rx, ry + 36, rw, 'rgba(0,0,0,0.6)', b.fonts.body.family) + 30
  }
  const frac = cs === 0.25 ? 'a quarter of' : cs === 0.5 ? 'half' : cs === 1 ? 'the full' : `${cs} ×`
  const src = b.logo.sources.clearSpace === 'designer' ? 'Set by the brand.' : 'Suggested from the shape of the mark; confirm it with the client.'
  rule('Clear space', `x equals ${frac} the height of the mark (H). Keep at least x clear on every side. Nothing enters the hatched zone: text, images, other logos or the edge of the page. ${src}`)

  // Correct and incorrect, side by side: the mark with its space, then a headline crowding it.
  const exW = (rw - 20) / 2, exH = Math.min(o === 'landscape' ? 150 : 200, h - ry - m * 1.6)
  if (exH > 80) {
    const draw = (ex: number, bad: boolean) => {
      x.fillStyle = bad ? b.semantic[2].ramp[50] : b.semantic[0].ramp[50]; roundRect(x, ex, ry, exW, exH, 10); x.fill()
      const lh = Math.min(exH * 0.34, (exW * (bad ? 0.48 : 0.62)) / ar), lw = lh * ar, lx = ex + (bad ? 16 : exW * 0.5 - lw / 2), ly = ry + exH * 0.5 - lh / 2
      drawMark(e, lx, ly, lw, lh, b.roles[0].hex, modeFor(e, bad ? b.semantic[2].ramp[50] : b.semantic[0].ramp[50]))
      if (bad) {
        // A headline sitting inside the clear space.
        x.fillStyle = ink(e)
        x.fillText(fitLabel(x, b.name || 'Headline', exW - lw - 28, Math.round(lh * 0.55), 700, b.fonts.heading.family, 9), lx + lw + 6, ly + lh * 0.72)
      } else {
        x.strokeStyle = b.semantic[0].ramp[400]; x.setLineDash([5, 4]); x.lineWidth = 1; x.strokeRect(lx - lh * cs, ly - lh * cs, lw + lh * cs * 2, lh + lh * cs * 2); x.setLineDash([])
      }
      x.fillStyle = bad ? b.semantic[2].ramp[700] : b.semantic[0].ramp[700]; x.font = `600 14px "${b.fonts.body.family}"`
      x.fillText(bad ? 'Incorrect: crowded' : 'Correct', ex + 12, ry + exH - 12)
    }
    draw(rx, false); draw(rx + exW + 20, true)
  }
  footer(e)
}

/** Minimum size: the mark at its minimum, then smaller, so the loss of detail is seen rather than described. */
function pageMinSize(e: Env) {
  const { x, w, h, b, o } = e
  paper(e, '#fff')
  sectionLabel(e, e.pageNo - 1, 'Minimum size')
  const { m, top } = frame(e, 110), ar = markAspect(e)
  const minW = b.logo.minWidth, minMm = b.logo.minPrint
  // Samples at actual size on the deck (one page pixel is one CSS pixel at 1600 wide): 2× minimum, minimum, half, quarter.
  const steps = [{ k: 2, label: `${minW * 2} px` }, { k: 1, label: `${minW} px, the minimum` }, { k: 0.5, label: `${Math.round(minW / 2)} px, too small` }, { k: 0.25, label: `${Math.round(minW / 4)} px` }]
  const srcW = b.logo.sources.minWidth === 'designer' ? 'Set by the brand.' : 'Suggested from the thinnest stroke in the artwork.'
  // The stroke numbers only mean something when the mark has strokes thin enough to lose.
  const fine = e.logo ? strokeAt(e.logo.profile, minW / 2) < 3 : false
  const srcP = b.logo.sources.minPrint === 'designer' ? 'Set by the brand.' : fine || !e.logo ? 'Suggested so the thinnest stroke prints at 0.3 mm or more.' : 'Suggested for a mark with no fine detail.'
  const screenNote = !e.logo ? '' : fine
    ? ` At ${minW} px the thinnest stroke is about ${strokeAt(e.logo.profile, minW).toFixed(1)} px; at ${Math.round(minW / 2)} px it drops to ${strokeAt(e.logo.profile, minW / 2).toFixed(1)} px and fine detail goes.`
    : ''
  const rules = [
    ['On screen', `Never narrower than ${minW} px. ${b.logo.sources.minWidth === 'designer' ? srcW : fine || !e.logo ? srcW : 'The mark has no fine detail to lose; below this width it is simply too small to notice.'}${screenNote}`],
    ['In print', `Never narrower than ${minMm} mm. ${srcP}${e.logo && e.logo.profile.minStroke < 0.03 ? ' The mark has fine detail: a simplified version for very small sizes (favicons, stamps) is worth asking for.' : ''}`],
  ] as const
  // In a box the two rules sit side by side under the samples, so the content spans the box's width.
  const ruleSize = o === 'landscape' ? 18 : 21, ruleW = e.block ? (w - b.grid.gutter * 2) / 2 : o === 'landscape' ? w * 0.6 : w - m * 2
  let cx = m
  const rowY = top + 10
  let maxH = o === 'landscape' ? 260 : 300
  if (e.block) {
    // A tall mark's samples give way to the rules below them.
    x.font = `${ruleSize}px "${b.fonts.body.family}"`
    const rulesH = Math.max(...rules.map(([, body]) => 36 + wrap(x, body, ruleW).length * ruleSize * 1.5))
    maxH = Math.max(110, Math.min(420, h - rowY - 84 - rulesH))
  }
  let tallest = 110
  steps.forEach(st => {
    const sw = Math.min(minW * st.k, w * 0.3), sh = sw / ar
    // In a box every tile takes the full row height, so the row reads as one band rather than ragged boxes.
    const boxW = Math.max(sw + 40, 150), boxH = e.block ? maxH : Math.min(maxH, Math.max(sh + 40, 110))
    if (cx + boxW > w - m) return
    // In a box, a sample that cannot show at its true size is left out rather than spilling over its tile.
    if (e.block && st.k !== 1 && sh + 40 > maxH) return
    tallest = Math.max(tallest, boxH)
    x.fillStyle = b.neutral[50]; roundRect(x, cx, rowY, boxW, boxH, 10); x.fill()
    x.strokeStyle = 'rgba(0,0,0,0.08)'; x.lineWidth = 1; x.stroke()
    drawMark(e, cx + (boxW - sw) / 2, rowY + (boxH - sh) / 2, sw, sh, b.roles[0].hex, modeFor(e, b.neutral[50]))
    x.fillStyle = st.k < 1 ? b.semantic[2].ramp[700] : ink(e)
    x.fillText(fitLabel(x, st.label, boxW, 15, st.k === 1 ? 600 : 400, b.fonts.body.family), cx, rowY + boxH + 26)
    cx += boxW + b.grid.gutter
  })
  // The mark rendered at its minimum width, then enlarged pixel for pixel, so the loss of detail shows.
  // The whole mark always fits the tile; the enlargement is the largest whole number that allows it.
  if (e.logo) {
    const zx = cx + 20, zw = e.block ? w - m - zx : Math.min(w - m - zx, 420), zh = tallest
    const pw = Math.max(1, Math.round(minW)), ph = Math.max(1, Math.round(minW / ar))
    const k = Math.min(6, Math.floor(Math.min((zw - 28) / pw, (zh - 28) / ph)))
    if (zw > 160 && k >= 2) {
      const small = document.createElement('canvas'); small.width = pw; small.height = ph
      const sx = small.getContext('2d')!; sx.imageSmoothingQuality = 'high'
      drawMark({ ...e, x: sx }, 0, 0, pw, ph, b.roles[0].hex, modeFor(e, b.neutral[50]))
      x.fillStyle = b.neutral[50]; roundRect(x, zx, rowY, zw, zh, 10); x.fill()
      x.strokeStyle = 'rgba(0,0,0,0.08)'; x.lineWidth = 1; x.stroke()
      x.imageSmoothingEnabled = false
      x.drawImage(small, Math.round(zx + (zw - pw * k) / 2), Math.round(rowY + (zh - ph * k) / 2), pw * k, ph * k)
      x.imageSmoothingEnabled = true
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillText(fitLabel(x, `The minimum, enlarged ${k} times`, zw, 15, 400, b.fonts.body.family), zx, rowY + zh + 26)
    }
  }
  let ry = rowY + tallest + 84
  const rule = (title: string, body: string, X: number, Y: number) => {
    x.fillStyle = ink(e); x.font = `700 ${o === 'landscape' ? 26 : 30}px "${b.fonts.heading.family}"`; x.fillText(title, X, Y)
    return para(x, body, ruleSize, X, Y + 36, ruleW, 'rgba(0,0,0,0.6)', b.fonts.body.family)
  }
  if (e.block) {
    const y0 = ry
    ry = Math.max(...rules.map(([title, body], i) => rule(title, body, m + i * (ruleW + b.grid.gutter * 2), y0)))
  } else {
    for (const [title, body] of rules) ry = rule(title, body, m, ry) + 30
    ry -= 30
  }
  footer(e)
  return ry
}

/** Misuse: the real logo, mistreated, so the rules are seen. Every example is made from the artwork. */
function pageMisuse(e: Env) {
  const { x, w, h, b, o } = e
  paper(e, '#fff')
  sectionLabel(e, e.pageNo - 1, 'Do not')
  const { m, top } = frame(e, 84), gap = b.grid.gutter * 0.8
  const cols = o === 'landscape' ? 4 : 2, rows = o === 'landscape' ? 2 : 4
  const cw = (w - m * 2 - gap * (cols - 1)) / cols
  const ch = (h - top - m * 1.5 - gap * (rows - 1) - 34 * rows) / rows
  const ar = markAspect(e)
  const light = b.neutral[50]
  const bad = b.semantic[2].ramp[600]
  // The mark at a share of the cell's height, but never wider than the cell allows.
  const fit = (k: number, maxW = 0.78) => { const lh = Math.min(ch * k, (cw * maxW) / ar); return { lh, lw: lh * ar } }
  const cells: { label: string; draw: (cx: number, cy: number) => void }[] = [
    { label: 'Stretch or squash it', draw: (cx, cy) => { x.fillStyle = light; roundRect(x, cx, cy, cw, ch, 10); x.fill(); const lh = fit(0.4, 0.6).lh, lw = Math.min(cw * 0.9, lh * ar * 1.7), sx = lw / (lh * ar); x.save(); roundRect(x, cx, cy, cw, ch, 10); x.clip(); x.translate(cx + cw / 2 - lw / 2, cy + ch / 2 - lh / 2); x.scale(sx, 1); drawMark(e, 0, 0, lh * ar, lh, b.roles[0].hex, modeFor(e, light)); x.restore() } },
    { label: 'Rotate it', draw: (cx, cy) => { x.fillStyle = light; roundRect(x, cx, cy, cw, ch, 10); x.fill(); const { lh, lw } = fit(0.38, 0.7); x.save(); x.translate(cx + cw / 2, cy + ch / 2); x.rotate(-0.28); drawMark(e, -lw / 2, -lh / 2, lw, lh, b.roles[0].hex, modeFor(e, light)); x.restore() } },
    { label: 'Recolour it', draw: (cx, cy) => { x.fillStyle = light; roundRect(x, cx, cy, cw, ch, 10); x.fill(); const { lh, lw } = fit(0.4); if (e.logo) x.drawImage(monoOf(e.logo, b.semantic[1].hex), cx + cw / 2 - lw / 2, cy + ch / 2 - lh / 2, lw, lh); else drawMark(e, cx + cw / 2 - lw / 2, cy + ch / 2 - lh / 2, lw, lh, b.semantic[1].hex, 'original') } },
    { label: 'Put it on a low-contrast colour', draw: (cx, cy) => { const bg = e.logo ? (e.logo.profile.luminance > 0.5 ? b.neutral[100] : b.neutral[700]) : b.roles[0].ramp[600]; x.fillStyle = bg; roundRect(x, cx, cy, cw, ch, 10); x.fill(); const { lh, lw } = fit(0.4); drawMark(e, cx + cw / 2 - lw / 2, cy + ch / 2 - lh / 2, lw, lh, b.roles[0].hex, 'original') } },
    { label: 'Crop it', draw: (cx, cy) => { x.fillStyle = light; roundRect(x, cx, cy, cw, ch, 10); x.fill(); const lh = ch * 0.5, lw = lh * ar; x.save(); roundRect(x, cx, cy, cw, ch, 10); x.clip(); drawMark(e, cx + cw * 0.55 - lw / 2, cy + ch / 2 - lh / 2, lw * 1.6, lh * 1.6, b.roles[0].hex, modeFor(e, light)); x.restore() } },
    { label: 'Crowd it', draw: (cx, cy) => { x.fillStyle = light; roundRect(x, cx, cy, cw, ch, 10); x.fill(); const { lh, lw } = fit(0.34, 0.5); drawMark(e, cx + 14, cy + ch / 2 - lh / 2, lw, lh, b.roles[0].hex, modeFor(e, light)); x.fillStyle = ink(e); x.fillText(fitLabel(x, b.name || 'Headline', cw - lw - 40, Math.round(lh * 0.5), 700, b.fonts.heading.family, 9), cx + 14 + lw + 4, cy + ch / 2 + lh * 0.2) } },
    { label: 'Add effects', draw: (cx, cy) => { x.fillStyle = light; roundRect(x, cx, cy, cw, ch, 10); x.fill(); const { lh, lw } = fit(0.4, 0.7); x.save(); x.shadowColor = 'rgba(0,0,0,0.55)'; x.shadowBlur = 18; x.shadowOffsetX = 8; x.shadowOffsetY = 10; drawMark(e, cx + cw / 2 - lw / 2, cy + ch / 2 - lh / 2, lw, lh, b.roles[0].hex, modeFor(e, light)); x.restore() } },
    { label: 'Place it over busy imagery', draw: (cx, cy) => { x.save(); roundRect(x, cx, cy, cw, ch, 10); x.clip(); const tones = [b.roles[0].ramp[300], b.roles[1].ramp[500], b.neutral[800], b.roles[2].ramp[400], b.neutral[200]]; let i = 0; for (let yy = cy; yy < cy + ch; yy += 22) for (let xx = cx; xx < cx + cw; xx += 26) { x.fillStyle = tones[(i++ * 7) % tones.length]; x.fillRect(xx, yy, 26, 22) } x.restore(); const { lh, lw } = fit(0.4); drawMark(e, cx + cw / 2 - lw / 2, cy + ch / 2 - lh / 2, lw, lh, b.roles[0].hex, 'original') } },
  ]
  cells.forEach((c, i) => {
    const cx = m + (i % cols) * (cw + gap), cy = top + Math.floor(i / cols) * (ch + gap + 34)
    c.draw(cx, cy)
    // A quiet red cross marks each one.
    x.strokeStyle = bad; x.lineWidth = 2; x.beginPath(); x.moveTo(cx + cw - 26, cy + 10); x.lineTo(cx + cw - 10, cy + 26); x.moveTo(cx + cw - 10, cy + 10); x.lineTo(cx + cw - 26, cy + 26); x.stroke()
    x.fillStyle = ink(e); x.fillText(fitLabel(x, c.label, cw, o === 'landscape' ? 15 : 17, 500, b.fonts.body.family), cx, cy + ch + 24)
  })
  footer(e)
}

/** Where each photo's logo went on the last photography page drawn, for checks. */
export let lastPhotoPlan: { name: string; suggested: { corner: Corner; use: string; lum: number }; avoid: { corner: Corner; use: string; why: string } }[] = []

/** A photo cropped to fill a box, as its own canvas (so its pixels can be read, and it goes to the Editor as an image). */
function coverCrop(img: HTMLCanvasElement, w: number, h: number, name: string): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h))
  const k = Math.max(c.width / img.width, c.height / img.height), sw = c.width / k, sh = c.height / k
  const x = c.getContext('2d')!; x.imageSmoothingQuality = 'high'
  x.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, c.width, c.height)
  ;(c as unknown as { __vcName: string }).__vcName = name
  return c
}
const CORNER_WORDS: Record<Corner, string> = { 'top-left': 'top left', 'top-right': 'top right', 'bottom-left': 'bottom left', 'bottom-right': 'bottom right', centre: 'centre' }

/**
 * Photography: each photo with the logo where it reads (the calm corner, the version that holds up there, a
 * scrim only when needed), beside the placement to avoid (over the subject, or the busy corner).
 */
function pagePhoto(e: Env) {
  const { x, w, h, b, o } = e
  paper(e, '#fff')
  sectionLabel(e, e.pageNo - 1, 'On photography')
  const { m, top } = frame(e, 84), gap = b.grid.gutter
  const good = b.semantic[0].ramp[600], bad = b.semantic[2].ramp[600]
  const photos = e.photos.slice(0, 3)
  lastPhotoPlan = []
  if (!photos.length) {
    para(x, 'Add up to three photos of the brand in use under Identity, Photography. This page then shows where the logo sits on each, and where it should not.', o === 'landscape' ? 22 : 24, m, top + 40, Math.min(w - m * 2, 900), ink(e), b.fonts.body.family)
    footer(e); return
  }
  // Landscape: a column per photo, suggested above and avoid below. Portrait: a row per photo, side by side.
  const n = photos.length, labelH = o === 'landscape' ? 64 : 70
  const cols = o === 'landscape' ? n : 2, rows = o === 'landscape' ? 2 : n
  const cw = (w - m * 2 - gap * (cols - 1)) / cols
  const ch = (h - top - m * 1.4 - (gap + labelH) * rows + gap) / rows
  const variants = e.logo ? logoVariants(b, e.logo, e.d).map(v => ({ id: v.id, valid: v.valid, profile: v.profile })) : []
  photos.forEach((ph, i) => {
    const cells = o === 'landscape'
      ? [{ cx: m + i * (cw + gap), cy: top }, { cx: m + i * (cw + gap), cy: top + ch + labelH + gap }]
      : [{ cx: m, cy: top + i * (ch + labelH + gap) }, { cx: m + cw + gap, cy: top + i * (ch + labelH + gap) }]
    const crop = coverCrop(ph.img, cw, ch, ph.name || 'Photo')
    const data = crop.getContext('2d')!.getImageData(0, 0, crop.width, crop.height).data
    const read = readPhoto(data, crop.width, crop.height)
    const four: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    // With no logo yet, the corner is still chosen from the photo: calm and away from the subject.
    const plan = variants.length ? placeOnPhoto(read, variants, { corners: [...four, 'centre'] }) : four.map(c => ({ corner: c, use: 'primary', ratio: 0, level: 'good', busy: regionsFor(read, c)[0].busy, score: -regionsFor(read, c)[0].busy, why: '', need: 3, fix: null } as PhotoPlacement)).sort((a, b2) => b2.score - a.score)
    const best = plan.filter(p => p.corner !== 'centre')[0] ?? plan[0]
    const worst = read.subject === '1,1' ? plan.find(p => p.corner === 'centre') ?? plan[plan.length - 1] : plan.filter(p => p.corner !== 'centre').slice(-1)[0]
    const lumAt = (c: Corner) => { const r = regionsFor(read, c); return r.reduce((a, q) => a + q.luminance, 0) / r.length }
    // The version to avoid is the logo as supplied, dropped in the wrong place.
    const primary = variants.find(v => v.id === 'primary') ?? variants[0]
    const badRead = primary ? markOnTone(primary.profile, lumAt(worst.corner)) : null
    const avoidWhy = worst.corner === 'centre' ? 'Over the subject: the logo fights the picture.' : worst.busy > 0.06 ? `The ${CORNER_WORDS[worst.corner]} is busy, so the logo gets lost.` : badRead && badRead.level !== 'good' ? `Only ${badRead.ratio.toFixed(1)}:1 on the ${CORNER_WORDS[worst.corner]}: too little contrast.` : `The ${CORNER_WORDS[worst.corner]} works less well than the ${CORNER_WORDS[best.corner]}.`
    lastPhotoPlan.push({ name: ph.name, suggested: { corner: best.corner, use: best.use, lum: lumAt(best.corner) }, avoid: { corner: worst.corner, use: 'primary', why: avoidWhy } })

    // When no version reads on the photo, even with a scrim, the mark goes on a plate of the light surface.
    const reads = !e.logo || best.ratio >= best.need || best.fix?.kind === 'scrim'
    // The plate is whichever surface, light or dark, the mark reads on better.
    const plateBg = e.logo && markContrastOf(e, markTreatment(b, e.logo, e.d, b.surfaces.dark).mode, b.surfaces.dark) > markContrastOf(e, markTreatment(b, e.logo, e.d, b.surfaces.light).mode, b.surfaces.light) ? b.surfaces.dark : b.surfaces.light
    const plateMode = markTreatment(b, e.logo, e.d, plateBg).mode
    let shownW = 0
    const place = (cell: { cx: number; cy: number }, p: PhotoPlacement, mode: MarkMode, scrim: boolean, plate = false) => {
      const { cx, cy } = cell
      x.save(); roundRect(x, cx, cy, cw, ch, 10); x.clip()
      x.drawImage(crop, cx, cy, cw, ch)
      // Sized by area, so a tall or a wide mark carries the same visual weight as a square one.
      const short = Math.min(cw, ch), ar = markAspect(e), area = (short * 0.22) ** 2 * 1.4
      let lw = Math.sqrt(area * ar), lh = lw / ar
      if (lh > short * 0.36) { lh = short * 0.36; lw = lh * ar }
      if (lw > cw * 0.42) { lw = cw * 0.42; lh = lw / ar }
      // Not below the brand's minimum width, as far as the photo allows.
      if (lw < b.logo.minWidth) { lw = Math.min(b.logo.minWidth, cw * 0.42); lh = lw / ar; if (lh > short * 0.62) { lh = short * 0.62; lw = lh * ar } }
      const padFor = (w2: number, h2: number) => Math.max(short * 0.1, Math.min(h2, w2) * 0.6, 24)
      const at = (w2: number, h2: number) => {
        const pd = padFor(w2, h2)
        return {
          x: p.corner === 'centre' ? cx + cw / 2 - w2 / 2 : p.corner.endsWith('left') ? cx + pd : cx + cw - pd - w2,
          y: p.corner === 'centre' ? cy + ch / 2 - h2 / 2 : p.corner.startsWith('top') ? cy + pd : cy + ch - pd - h2,
        }
      }
      // A suggested placement never crosses the subject: the mark gets smaller until it clears it.
      const sb = scrim ? read.subjectBox : null
      if (sb && p.corner !== 'centre') {
        const sx0 = cx + sb.x * cw - 10, sy0 = cy + sb.y * ch - 10, sx1 = cx + (sb.x + sb.w) * cw + 10, sy1 = cy + (sb.y + sb.h) * ch + 10
        for (let i = 0; i < 60; i++) {
          const q = at(lw, lh)
          if (q.x + lw < sx0 || q.x > sx1 || q.y + lh < sy0 || q.y > sy1) break
          lw *= 0.95; lh *= 0.95
        }
      }
      shownW = lw
      const pad = padFor(lw, lh), { x: lx, y: ly } = at(lw, lh)
      if (scrim && p.fix?.kind === 'scrim' && p.corner !== 'centre') {
        // Just enough scrim: full strength under the whole logo, then fading out from its corner.
        const gx0 = p.corner.endsWith('left') ? cx : cx + cw, gy0 = p.corner.startsWith('top') ? cy : cy + ch
        const reach = Math.hypot(pad + lw, pad + lh) + 6, radius = reach * 1.7
        const g = x.createRadialGradient(gx0, gy0, 0, gx0, gy0, radius)
        const c = p.fix.color === '#000000' ? '0,0,0' : '255,255,255'
        g.addColorStop(0, `rgba(${c},${p.fix.opacity})`); g.addColorStop(reach / radius, `rgba(${c},${p.fix.opacity})`); g.addColorStop(1, `rgba(${c},0)`)
        x.fillStyle = g; x.fillRect(cx, cy, cw, ch)
      }
      if (plate) {
        const r = markBounds(e, lx, ly, lw, lh), pp = Math.max(10, Math.min(r.w, r.h) * 0.3)
        x.fillStyle = plateBg; roundRect(x, r.x - pp, r.y - pp, r.w + pp * 2, r.h + pp * 2, Math.min(b.radius, 12)); x.fill()
      }
      drawMark(e, lx, ly, lw, lh, b.roles[0].hex, plate ? plateMode : mode)
      x.restore()
    }
    place(cells[0], best, e.logo ? MODE_OF[best.use as keyof typeof MODE_OF] : lumAt(best.corner) < 0.4 ? 'white' : 'original', true, !reads)
    const suggestedW = shownW
    place(cells[1], worst, 'original', false)
    // Labels: Suggested with the reason, and a red cross on the one to avoid.
    const small = o === 'landscape' ? 14 : 16
    const label = (cell: { cx: number; cy: number }, title: string, why: string, colour: string) => {
      x.fillStyle = colour; x.font = `600 ${small + 1}px "${b.fonts.body.family}"`; x.fillText(title, cell.cx, cell.cy + ch + 24)
      x.fillStyle = 'rgba(0,0,0,0.55)'
      // Two lines: the type gets smaller before anything is cut.
      let fs = small; x.font = `400 ${fs}px "${b.fonts.body.family}"`
      while (wrap(x, why, cw).length > 2 && fs > 11) { fs -= 0.5; x.font = `400 ${fs}px "${b.fonts.body.family}"` }
      const lines = wrap(x, why, cw); lines.slice(0, 2).forEach((line, k) => x.fillText(k === 1 && lines.length > 2 ? clampText(x, line + '…', cw) : line, cell.cx, cell.cy + ch + 24 + (fs + 6) * (k + 1)))
    }
    const bestWhy = best.why || `The ${CORNER_WORDS[best.corner]} is the calmest part of the photo.`
    // Suggested means it reads: on the photo as it is, on a scrim, or on a plate when nothing else will do.
    const onPlate = e.logo ? markContrastOf(e, plateMode, plateBg) : 0
    const plateHolds = onPlate >= best.need
    const plateWhy = `No version reads on this photo by itself, so the mark sits on a plate of the ${plateBg === b.surfaces.dark ? 'dark' : 'light'} surface in the ${CORNER_WORDS[best.corner]}, at ${onPlate.toFixed(1)}:1.${plateHolds ? '' : ` That is still under ${best.need}:1: a one-colour version of the logo would do better on photos.`}`
    // Shown below its minimum (the calm area is too small for it at full size): say so, and do not call it Suggested.
    const small2 = !!e.logo && suggestedW < b.logo.minWidth - 0.5
    const sizeWhy = small2 ? ` Shown at ${Math.round(suggestedW)} px to stay clear of the subject; at its ${b.logo.minWidth} px minimum it needs a photo with more calm space.` : ''
    const ok = (reads || plateHolds) && !small2
    label(cells[0], ok ? 'Suggested' : 'Best available, still weak', (reads ? bestWhy : plateWhy) + sizeWhy, ok ? good : b.semantic[1].ramp[700])
    label(cells[1], 'Avoid', avoidWhy, bad)
    const bx = cells[1].cx, by = cells[1].cy
    x.strokeStyle = bad; x.lineWidth = 3; x.beginPath(); x.moveTo(bx + cw - 30, by + 12); x.lineTo(bx + cw - 12, by + 30); x.moveTo(bx + cw - 12, by + 12); x.lineTo(bx + cw - 30, by + 30); x.stroke()
  })
  footer(e)
}

const mono = (e: Env) => e.b.fonts.mono.family
const setTrack = (x: Ctx, em: number, px: number) => { (x as unknown as { letterSpacing: string }).letterSpacing = `${(em * px).toFixed(2)}px` }
const ink = (e: Env) => e.b.surfaces.inkOnLight

function pageColour(e: Env) {
  const { x, w, h, b, o } = e
  paper(e, '#fff')
  sectionLabel(e, e.pageNo - 1, 'Colour')
  const { m, top } = frame(e, 96), gap = b.grid.gutter
  const specs = (r: typeof b.roles[number], X: number, Y: number, W: number) => {
    x.fillStyle = ink(e); x.font = `700 ${o === 'landscape' ? 26 : 30}px "${b.fonts.heading.family}"`; x.fillText(r.name, X, Y)
    x.fillStyle = 'rgba(0,0,0,0.55)'; x.font = `400 ${o === 'landscape' ? 17 : 20}px "${b.fonts.body.family}"`
    let yy = para(x, r.usage, o === 'landscape' ? 17 : 20, X, Y + 32, W, 'rgba(0,0,0,0.55)', b.fonts.body.family, 1.4) + 8
    x.fillStyle = ink(e); x.font = `500 ${o === 'landscape' ? 16 : 19}px "${mono(e)}"`
    for (const line of [`HEX ${r.hex.toUpperCase()}`, fmtOklch(r.hex), ...colorSpecLine(r.hex).split('   ')]) { x.fillText(clampText(x, line, W), X, yy); yy += o === 'landscape' ? 26 : 30 }
  }
  if (o === 'landscape') {
    // In a box, the swatches take the height the specs and usage bar leave, so nothing floats.
    const cw = (w - m * 2 - gap * 2) / 3, sh = e.block ? Math.max(220, Math.min(440, h - 350)) : 300
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
  const barH = o === 'landscape' ? 34 : 44, barY = e.block ? h - barH - 22 : h - m * 1.25 - barH
  x.fillStyle = ink(e); x.font = `700 ${o === 'landscape' ? 20 : 24}px "${b.fonts.heading.family}"`; x.fillText('Usage ratio', m, barY - 16)
  let rx = m; const barW = w - m * 2
  b.ratios.forEach(r => {
    const seg = (r.pct / 100) * barW; x.fillStyle = r.hex; x.fillRect(rx, barY, seg, barH)
    if (r.hex === b.surfaces.light) { x.strokeStyle = 'rgba(0,0,0,0.1)'; x.strokeRect(rx + 0.5, barY + 0.5, seg - 1, barH - 1) }
    x.font = `600 15px "${b.fonts.body.family}"`
    const label = `${r.name} ${r.pct}%`
    if (seg > x.measureText(label).width + 20) { x.fillStyle = onLight(r.hex) ? '#fff' : '#111'; x.fillText(label, rx + 10, barY + barH / 2 + 5) }
    else {
      // Too narrow to hold its label: the label sits under the bar, ending where the segment ends.
      x.fillStyle = 'rgba(0,0,0,0.6)'; x.font = `500 13px "${b.fonts.body.family}"`; x.textAlign = 'right'; x.fillText(label, rx + seg, barY + barH + 17); x.textAlign = 'left'
    }
    rx += seg
  })
  x.fillStyle = 'rgba(0,0,0,0.4)'; x.font = `400 14px "${b.fonts.body.family}"`
  x.textAlign = 'right'; x.fillText('CMYK values are approximate. Confirm against a printed proof.', w - m, barY - 16); x.textAlign = 'left'
  footer(e)
}

function pageRamps(e: Env) {
  const { x, w, h, b, o } = e
  paper(e, '#fff')
  sectionLabel(e, e.pageNo - 1, 'Tints and shades')
  const { m, top } = frame(e, 96, 14)
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
  const rampNote = 'Ramps are built in OKLCH, so each step has the same perceived lightness across hues. The dot marks the step closest to the source colour.'
  // In a box the note's last line sits on the bottom edge, however many lines it wraps to.
  const noteLines = wrap(x, rampNote, w - m * 2).length
  para(x, rampNote, 15, m, e.block ? h - 8 - (noteLines - 1) * 22.5 : h - m * 1.1, w - m * 2, 'rgba(0,0,0,0.45)', b.fonts.body.family)
  footer(e)
}

function pageAccess(e: Env) {
  const { x, w, h, b, o } = e
  paper(e, '#fff')
  sectionLabel(e, e.pageNo - 1, 'Accessible pairings')
  const { m, top } = frame(e, 96), gap = b.grid.gutter * 0.8
  const cols = o === 'landscape' ? 3 : 2, rows = Math.ceil(b.pairs.length / cols)
  const cw = (w - m * 2 - gap * (cols - 1)) / cols
  const ch = (h - top - (e.block ? 34 : m * 1.5) - gap * (rows - 1)) / rows
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
    x.fillText(fitLabel(x, `${p.fgName} on ${p.bgName}`, cw - 44, Math.min(18, sampleH * 0.14), 400, b.fonts.body.family), bx + 22, by + sampleH * 0.48 + 30)
    const ok = p.ratio >= p.need
    const badge = `${p.ratio.toFixed(2)}  ${ok ? p.grade : 'Fail'}`
    x.font = `600 15px "${mono(e)}"`; const bw = x.measureText(badge).width + 22
    // A use that does not fit on one line at full size takes two lines, rather than being set smaller.
    x.fillStyle = ink(e); x.font = `600 17px "${b.fonts.body.family}"`
    const useW = cw - bw - 42
    if (x.measureText(p.use).width <= useW) x.fillText(p.use, bx + 18, by + sampleH + 36)
    else {
      x.font = `600 15px "${b.fonts.body.family}"`
      const ls = wrap(x, p.use, useW)
      if (ls.length <= 2) ls.forEach((l, k) => x.fillText(l, bx + 18, by + sampleH + 26 + k * 19))
      else x.fillText(fitLabel(x, p.use, useW, 17, 600, b.fonts.body.family), bx + 18, by + sampleH + 36)
    }
    x.font = `600 15px "${mono(e)}"`
    x.fillStyle = ok ? pass : fail; roundRect(x, bx + cw - bw - 14, by + sampleH + 15, bw, 30, 15); x.fill()
    x.fillStyle = '#fff'; x.fillText(badge, bx + cw - bw - 3, by + sampleH + 35)
  })
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.font = `400 15px "${b.fonts.body.family}"`
  x.fillText('WCAG 2.2: 4.5:1 for body text, 3:1 for large text and icons, 7:1 for AAA.', m, e.block ? h - 8 : h - m * 0.95)
  footer(e)
}

function pageType(e: Env) {
  const { x, w, h, b, o } = e
  paper(e, '#fff')
  sectionLabel(e, e.pageNo - 1, 'Typography')
  const { m, top } = frame(e, 110, 20)
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
  const my = e.block ? h - 104 : o === 'landscape' ? h - m * 2.4 : h - m * 3
  x.strokeStyle = 'rgba(0,0,0,0.1)'; x.beginPath(); x.moveTo(m, my - 44); x.lineTo(w - m, my - 44); x.stroke()
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.font = `600 ${o === 'landscape' ? 16 : 18}px "${b.fonts.body.family}"`; x.fillText('Data and code', m, my - 10)
  x.fillStyle = ink(e); x.font = `400 ${o === 'landscape' ? 22 : 24}px "${mono(e)}"`; x.fillText(clampText(x, `${b.fonts.mono.family}  0123456789  £1,240.50  ${b.roles[0].hex.toUpperCase()}`, w - m * 2), m, my + 26)
  x.fillStyle = 'rgba(0,0,0,0.55)'; para(x, b.fonts.pairing + '.', o === 'landscape' ? 18 : 20, m, my + 66, w - m * 2, 'rgba(0,0,0,0.55)', b.fonts.body.family)
  footer(e)
}

function pageScale(e: Env) {
  const { x, w, h, b, o } = e
  paper(e, '#fff')
  sectionLabel(e, e.pageNo - 1, 'Type scale')
  const { m, top } = frame(e, 100, 26)
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
    x.textBaseline = 'middle'; x.fillText(fitWords(x, s.px >= 28 ? b.name : b.principles[0].body, w - m * 2 - labelW - specW - 24), m + labelW, mid + px * 0.04); x.textBaseline = 'alphabetic'
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
  // In block mode the code sits on its own dark panel filling the box; the layout supplies the heading.
  if (e.block) { x.fillStyle = bg; roundRect(x, 0, 0, w, h, Math.min(b.radius, 16)); x.fill() } else { x.fillStyle = bg; x.fillRect(0, 0, w, h) }
  sectionLabel(e, e.pageNo - 1, 'Tokens for developers', 'rgba(255,255,255,0.5)')
  const { m, top } = frame(e, 110)
  if (!e.block) {
    x.fillStyle = '#fff'; x.font = `700 ${o === 'landscape' ? 40 : 46}px "${b.fonts.heading.family}"`; x.fillText('Build with the same values', m, top)
    para(x, 'Every colour, size and spacing value on these pages ships as CSS variables, a Tailwind theme, design tokens JSON and an Adobe swatch file.', o === 'landscape' ? 19 : 22, m, top + 44, o === 'landscape' ? w * 0.4 : w - m * 2, 'rgba(255,255,255,0.65)', b.fonts.body.family)
  }
  const all = toCss(b).split('\n').filter(l => !/-(50|100|200|300|400|600|800):/.test(l) && !/--(leading|tracking|weight)-/.test(l))
  const codeX = e.block ? 0 : o === 'landscape' ? w * 0.47 : m, codeY = e.block ? 0 : o === 'landscape' ? top - 20 : top + 170
  const codeW = e.block ? w : o === 'landscape' ? w - codeX - m : w - m * 2, codeH = e.block ? h : h - codeY - m * 1.4
  x.fillStyle = 'rgba(255,255,255,0.05)'; roundRect(x, codeX, codeY, codeW, codeH, 12); x.fill()
  const lh = o === 'landscape' ? 21 : 25, fs = o === 'landscape' ? 14 : 16
  const maxLines = Math.floor((codeH - 40) / lh)
  // When the file is longer than the panel, the fonts come first, then as many colours as fit, then a
  // note of what is left and the closing brace, so the excerpt still reads as a complete file.
  let lines = all
  if (all.length > maxLines) {
    const close = all.lastIndexOf('}'), head = all.slice(0, all.findIndex(l => l.trim().startsWith('--')))
    const body = all.slice(head.length, close < 0 ? undefined : close)
    const fonts = body.filter(l => /--font-/.test(l)), rest = body.filter(l => !/--font-/.test(l))
    const room = Math.max(0, maxLines - head.length - fonts.length - 2)
    const shown = [...fonts, ...rest.slice(0, room)]
    lines = [...head, ...shown, `  /* ${body.length - shown.length} more in the CSS file */`, '}']
  }
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
  paper(e, b.neutrals[0])
  sectionLabel(e, e.pageNo - 1, 'In use')
  const { m, top } = frame(e, 100)
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

/** A colour from a role's ramp that reads on `bg` at `need`: the role's own colour, else the nearest step away from the background. */
function readableOn(role: Brand['roles'][number], bg: string, need = 4.5) {
  if (contrast(role.hex, bg) >= need) return role.hex
  const steps = onLight(bg) ? ([400, 300, 200, 100, 50] as const) : ([600, 700, 800, 900] as const)
  for (const s of steps) if (contrast(role.ramp[s], bg) >= need) return role.ramp[s]
  return contrast('#111111', bg) >= contrast('#ffffff', bg) ? '#111111' : '#ffffff'
}

function mockPoster(e: Env, X: number, Y: number, W: number, H: number) {
  const { x, b } = e
  const bg = b.roles[0].hex, ink = b.roles[0].ink
  x.fillStyle = bg; roundRect(x, X, Y, W, H, 14); x.fill()
  const pad = W * 0.09
  // The mark by area, in the version that reads on the brand colour (with a scrim or plate if none does).
  const ar = markAspect(e)
  // A wide mark may take a little of the side margin to reach its minimum width.
  let lw = Math.min(W - Math.max(W * 0.05, Math.min(pad, (W - b.logo.minWidth) / 2)) * 2, Math.max(Math.sqrt((W * 0.2) ** 2 * ar), b.logo.minWidth)), lh = lw / ar
  if (lh > H * 0.3) { lh = H * 0.3; lw = lh * ar }
  // On a plate, the plate's edge takes the text margin and the box grows so the mark keeps its size.
  const plated = !!markTreatment(b, e.logo, e.d, bg).backing
  const csP = b.logo.clearSpace
  if (plated) drawMarkOn(e, X + pad, Y + pad, Math.min(W - pad * 2, lw + lh * csP * 2), lh * (1 + csP * 2), bg, true)
  else drawMarkOn(e, X + pad, Y + pad, lw, lh, bg)
  // The headline is set as large as its longest word allows, so a long word never runs off the poster.
  let hs = W * 0.13
  x.fillStyle = ink; x.font = `700 ${hs}px "${b.fonts.heading.family}"`
  const longest = Math.max(...b.principles[0].title.split(' ').map(word => x.measureText(word).width))
  if (longest > W - pad * 2) { hs *= (W - pad * 2) / longest; x.font = `700 ${hs}px "${b.fonts.heading.family}"` }
  let yy = Y + H * 0.55; wrap(x, b.principles[0].title, W - pad * 2).forEach(l => { x.fillText(l, X + pad, yy); yy += hs * 1.08 })
  x.globalAlpha = 0.86; x.fillText(fitLabel(x, b.tagline || b.name, W - pad * 2, W * 0.05, 400, b.fonts.body.family), X + pad, yy + 10); x.globalAlpha = 1
  // The call to action uses the accent with its own ink: a pairing the contrast page approves.
  x.fillStyle = b.roles[2].hex; roundRect(x, X + pad, Y + H - pad - W * 0.13, W * 0.42, W * 0.13, b.radius); x.fill()
  x.fillStyle = b.roles[2].ink; x.fillText(fitLabel(x, 'Learn more', W * 0.32, W * 0.05, 600, b.fonts.body.family), X + pad + W * 0.06, Y + H - pad - W * 0.045)
}
function mockCard(e: Env, X: number, Y: number, W: number, H: number) {
  const { x, b } = e
  x.fillStyle = '#fff'; roundRect(x, X, Y, W, H, 14); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.08)'; x.lineWidth = 1; x.stroke()
  const pad = W * 0.08, iw = W - pad * 2
  // The image takes whatever the caption leaves, so the card has no empty lower half.
  x.font = `400 ${W * 0.045}px "${b.fonts.body.family}"`
  const capH = W * 0.2 + wrap(x, b.principles[1].body, iw).length * W * 0.045 * 1.4 + pad * 0.4
  const ih = Math.max(H * 0.4, H - pad * 2 - capH)
  // The brand's own photo when there is one; otherwise the secondary colour holds the image's place.
  const photo = e.photos[0]
  x.save(); roundRect(x, X + pad, Y + pad, iw, ih, 10); x.clip()
  if (photo) x.drawImage(coverCrop(photo.img, iw, ih, photo.name || 'Photo'), X + pad, Y + pad, iw, ih)
  else { x.fillStyle = b.roles[1].hex; x.fillRect(X + pad, Y + pad, iw, ih) }
  x.restore()
  const ty = Y + pad + ih + W * 0.12
  x.fillStyle = b.surfaces.inkOnLight; x.fillText(fitLabel(x, b.name, iw, W * 0.075, 700, b.fonts.heading.family), X + pad, ty)
  para(x, b.principles[1].body, W * 0.045, X + pad, ty + W * 0.08, iw, 'rgba(0,0,0,0.62)', b.fonts.body.family, 1.4)
}
function mockUI(e: Env, X: number, Y: number, W: number, H: number) {
  const { x, b } = e
  x.fillStyle = '#fff'; roundRect(x, X, Y, W, H, 14); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.08)'; x.lineWidth = 1; x.stroke()
  const pad = W * 0.08, bw = W - pad * 2
  // The app bar grows to hold the mark at its minimum width, up to a point; past that the name is set instead.
  const arU = markAspect(e)
  let navH = Math.max(Math.min(H * 0.11, 64) * 0.5, b.logo.minWidth / arU), navW = navH * arU
  if (navW > bw) { navW = bw; navH = navW / arU }
  // A wide mark takes the bar's width; the menu icon is left out rather than crowded.
  const menu = navW <= bw - 70
  const markFits = !e.logo || (navW >= b.logo.minWidth - 0.5 && navH <= 72)
  const plateNav = !!markTreatment(b, e.logo, e.d, b.roles[0].hex).backing
  const hb = markFits ? Math.max(Math.min(H * 0.11, 64), navH / 0.55, plateNav ? navH + 2 * Math.max(8, navH * b.logo.clearSpace) + 28 : 0) : Math.min(H * 0.11, 64)
  // Control height is worked out from the card, so the panel is filled top to bottom rather than half empty.
  const bh = Math.max(34, Math.min(72, (H - hb - pad * 4.85 - 22) / 6.72))
  const font = (px: number, wt = 600) => { x.font = `${wt} ${px}px "${b.fonts.body.family}"` }
  // An app bar in the brand colour, with the mark in the version that reads there.
  x.save(); roundRect(x, X, Y, W, H, 14); x.clip(); x.fillStyle = b.roles[0].hex; x.fillRect(X, Y, W, hb); x.restore()
  if (markFits) drawMarkOn(e, X + pad, Y + (hb - navH) / 2, navW, navH, b.roles[0].hex)
  else {
    // A bar this size would show the mark below its minimum, so the name is set in the heading face instead.
    x.fillStyle = b.roles[0].ink; x.fillText(fitLabel(x, b.name, bw * 0.62, hb * 0.36, 700, b.fonts.heading.family), X + pad, Y + hb * 0.63)
  }
  if (menu || !markFits) { x.fillStyle = b.roles[0].ink; for (let i = 0; i < 3; i++) x.fillRect(X + W - pad - 22, Y + hb / 2 - 7 + i * 6, 22, 2) }
  let yy = Y + hb + pad * 0.8
  // A sign-up panel: heading, a field, the three buttons. Every text and background pair is one the contrast page passes.
  x.fillStyle = b.surfaces.inkOnLight; x.fillText(fitLabel(x, `Join ${b.name}`, bw, Math.min(30, bh * 0.5), 700, b.fonts.heading.family), X + pad, yy + bh * 0.42); yy += bh * 0.75
  x.fillStyle = 'rgba(0,0,0,0.62)'; font(Math.min(15, bh * 0.28), 500); x.fillText('Email address', X + pad, yy + 6); yy += 14
  x.strokeStyle = b.neutral[300]; x.lineWidth = 1.5; roundRect(x, X + pad, yy, bw, bh * 0.82, Math.min(b.radius, 10)); x.stroke()
  x.fillStyle = 'rgba(0,0,0,0.45)'; font(Math.min(16, bh * 0.3), 400); x.fillText('name@example.com', X + pad + 14, yy + bh * 0.52); yy += bh * 0.82 + pad * 0.6
  const btns: [string, string, string][] = [
    ['Primary', b.roles[2].hex, b.roles[2].ink],
    ['Secondary', b.roles[1].hex, b.roles[1].ink],
  ]
  btns.forEach(([label, bg, fg]) => { x.fillStyle = bg; roundRect(x, X + pad, yy, bw, bh, b.radius); x.fill(); x.fillStyle = fg; font(bh * 0.34); x.textAlign = 'center'; x.fillText(label, X + W / 2, yy + bh * 0.62); x.textAlign = 'left'; yy += bh + pad * 0.45 })
  // Outline: the accent's border, with text in the darkest step of the accent that still reads on white.
  x.strokeStyle = b.roles[2].hex; x.lineWidth = 2; roundRect(x, X + pad, yy, bw, bh, b.radius); x.stroke()
  x.fillStyle = readableOn(b.roles[2], '#ffffff'); font(bh * 0.34); x.textAlign = 'center'; x.fillText('Outline', X + W / 2, yy + bh * 0.62); x.textAlign = 'left'; yy += bh + pad * 0.6
  if (yy + 20 < Y + H - pad) {
    x.fillStyle = 'rgba(0,0,0,0.62)'
    x.fillText(fitLabel(x, 'By joining you agree to the terms.', bw, Math.min(14, bh * 0.26), 400, b.fonts.body.family), X + pad, yy + 8)
    yy += 8 + pad * 0.8
  }
  // A confirmation on the dark surface, with the success colour as its signal.
  const th = bh * 1.35
  if (yy + th < Y + H - pad * 0.6) {
    const ty = yy
    x.fillStyle = b.surfaces.dark; roundRect(x, X + pad, ty, bw, th, Math.min(b.radius, 12)); x.fill()
    x.fillStyle = readableOn(b.semantic[0], b.surfaces.dark, 3); x.beginPath(); x.arc(X + pad + th * 0.32, ty + th * 0.36, th * 0.08, 0, Math.PI * 2); x.fill()
    x.fillStyle = b.surfaces.inkOnDark; x.fillText(fitLabel(x, 'Saved', bw * 0.6, bh * 0.3, 600, b.fonts.body.family), X + pad + th * 0.5, ty + th * 0.43)
    x.globalAlpha = 0.78; x.fillText(fitLabel(x, 'You can change this in Settings.', bw - th * 0.7, bh * 0.24, 400, b.fonts.body.family), X + pad + th * 0.5, ty + th * 0.74); x.globalAlpha = 1
  }
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
  drawMarkOn(e, w / 2 - 70, h * 0.32, 140, 140, p0)
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
  paper(e, b.roles[0].ramp[50])
  sectionLabel(e, e.pageNo - 1, 'Voice', b.roles[0].ramp[700])
  const { m } = frame(e, 0)
  // In a box the page title is the largest type; the tone line sits one step below it.
  const toneSize = e.block ? 44 : o === 'landscape' ? 72 : 80
  x.fillStyle = b.roles[0].ramp[900]; x.font = `700 ${toneSize}px "${b.fonts.heading.family}"`
  let yy = e.block ? 44 : m + (o === 'landscape' ? 170 : 200)
  wrap(x, b.voice.tone, w - m * 2).forEach(l => { x.fillText(l, m, yy); yy += Math.round(toneSize * 1.11) })
  yy += e.block ? 30 : 40
  const colW = (w - m * 2 - b.grid.gutter) / 2
  let bottom = yy
  const col = (title: string, items: string[], X: number, mark: string, tone: string) => {
    x.fillStyle = tone; x.font = `700 ${o === 'landscape' ? 26 : 30}px "${b.fonts.heading.family}"`; x.fillText(title, X, yy)
    let ly = yy + 50
    items.forEach(it => {
      x.fillStyle = tone; x.font = `700 22px "${b.fonts.body.family}"`; x.fillText(mark, X, ly)
      x.fillStyle = b.roles[0].ramp[900]; ly = para(x, it, o === 'landscape' ? 23 : 26, X + 34, ly, colW - 34, b.roles[0].ramp[900], b.fonts.body.family, 1.35) + 10
    })
    bottom = Math.max(bottom, ly - 10)
  }
  col('Do', b.voice.dos, m, '+', b.semantic[0].ramp[700])
  col("Don't", b.voice.donts, m + colW + b.grid.gutter, '×', b.semantic[2].ramp[700])
  footer(e)
  return bottom
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

export type PageKind = 'cover' | 'principles' | 'logo' | 'clearspace' | 'minsize' | 'misuse' | 'photo' | 'colour' | 'ramps' | 'access' | 'type' | 'scale' | 'mockups' | 'voice' | 'tokens' | 'closing'
export interface PageSpec { kind: PageKind; variant: number; on: boolean }
/** A layout. In block mode, kinds whose content does not fill its box return where their content ends. */
type Variant = { label: string; draw: (e: Env) => void | number }

export const PAGE_DEFS: Record<PageKind, { title: string; variants: Variant[] }> = {
  cover: { title: 'Cover', variants: [{ label: 'Art direction', draw: pageCover }, { label: 'Monolith', draw: coverMonolith }, { label: 'Centred', draw: coverCentred }] },
  principles: { title: 'Principles', variants: [{ label: 'Columns', draw: pagePrinciples }, { label: 'Statements', draw: principlesStatements }] },
  logo: { title: 'Logo', variants: [{ label: 'Backgrounds', draw: pageLogo }, { label: 'Hero', draw: pageLogoHero }] },
  clearspace: { title: 'Clear space', variants: [{ label: 'Blueprint', draw: pageClearSpace }] },
  minsize: { title: 'Minimum size', variants: [{ label: 'Steps', draw: pageMinSize }] },
  misuse: { title: 'Do not', variants: [{ label: 'Grid', draw: pageMisuse }] },
  photo: { title: 'On photography', variants: [{ label: 'Pairs', draw: pagePhoto }] },
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
export const DEFAULT_PAGES: PageSpec[] = (['cover', 'principles', 'logo', 'clearspace', 'minsize', 'misuse', 'colour', 'ramps', 'access', 'type', 'scale', 'mockups', 'voice', 'tokens', 'closing'] as PageKind[]).map(kind => ({ kind, variant: 0, on: true }))

/**
 * Pages whose real content can be drawn as a block inside another layout, and the smallest box (in page
 * units) each lays out in without crowding. A smaller box draws the content scaled down to fit, never squashed.
 */
export const BODY_MIN = BODY_KIND_MIN
export type BodyKind = keyof typeof BODY_MIN
export const isBodyKind = (kind: string): kind is BodyKind => kind in BODY_MIN

/** How much a box would scale a page's content down: 1 when the box is at least the content's minimum. */
export function bodyScale(kind: BodyKind, box: { w: number; h: number }) {
  const min = BODY_MIN[kind]
  return Math.min(1, box.w / min.w, box.h / min.h)
}

/** Which layout of a page kind is drawn as its block. Voice uses its light layout, since the dark one sets white text. */
const BODY_VARIANT: Partial<Record<BodyKind, number>> = { voice: 1 }

/**
 * Kinds whose content is a column of type rather than something that fills its box. In a box taller than
 * they need, typographic ones are set larger (up to `grow`), then the content is placed `place` of the
 * way down the space left, so it never floats at the top of a mostly empty box. Minimum size never
 * grows: its samples are drawn at their true pixel size.
 */
const BODY_FLOW: Partial<Record<BodyKind, { grow: number; place: number }>> = {
  principles: { grow: 1.3, place: 0.42 },
  voice: { grow: 1.3, place: 0.42 },
  minsize: { grow: 1, place: 0.42 },
}

let scratch: Ctx | null = null
function measureCtx(): Ctx {
  if (!scratch) { const c = document.createElement('canvas'); c.width = 1; c.height = 1; scratch = c.getContext('2d')! }
  return scratch
}

/** Draw a page's real content into a box on any page. Fonts must already be loaded. Returns the scale used. */
export function drawPageBody(kind: BodyKind, x: Ctx, box: { x: number; y: number; w: number; h: number }, input: { brand: Brand; logo: LogoInfo | null; pageNo: number; pageCount: number; decisions?: LogoDecisions; photos?: GuidePhoto[] }) {
  const variant = PAGE_DEFS[kind].variants[BODY_VARIANT[kind] ?? 0]
  const env = (ctx: Ctx, s: number): Env => ({ x: ctx, w: box.w / s, h: box.h / s, b: input.brand, logo: input.logo, o: 'landscape', pageNo: input.pageNo, pageCount: input.pageCount, d: input.decisions ?? NO_DECISIONS, photos: input.photos ?? [], block: true })
  // Where the content ends at a scale, measured on a scratch canvas so nothing is drawn or recorded twice.
  const extent = (s: number) => {
    const m = measureCtx(); m.save(); m.textBaseline = 'alphabetic'; m.textAlign = 'left'
    const end = variant.draw(env(m, s)); m.restore()
    return typeof end === 'number' ? end : box.h / s
  }
  let s = bodyScale(kind, box), offset = 0
  const flow = BODY_FLOW[kind]
  if (flow) {
    let end = extent(s)
    if (flow.grow > 1 && end * s < box.h * 0.8) {
      // Grow towards 85% of the box, in steps, and stop at the largest size that still fits. These kinds
      // are columns of text that rewrap to any width, so growing never pushes them out sideways.
      for (let t = Math.min(flow.grow, (box.h * 0.85) / end); t > s + 0.02; t -= 0.05) {
        const e2 = extent(t)
        if (e2 * t <= box.h * 0.92) { s = t; end = e2; break }
      }
    }
    offset = Math.max(0, (box.h / s - end) * flow.place)
  }
  x.save()
  x.translate(box.x, box.y + offset * s); x.scale(s, s)
  x.textBaseline = 'alphabetic'; x.textAlign = 'left'
  variant.draw(env(x, s))
  x.restore()
  return s
}

export async function renderPage(spec: PageSpec, pageNo: number, pageCount: number, brand: Brand, logo: LogoInfo | null, o: Orientation, scale = 1, d: LogoDecisions = NO_DECISIONS, photos: GuidePhoto[] = []): Promise<HTMLCanvasElement> {
  await Promise.all([loadFont(brand.fonts.heading, [400, 600, 700]), loadFont(brand.fonts.body, [400, 500, 600]), loadFont(brand.fonts.mono, [400, 500, 600])])
  const size = SIZES[o]
  const c = document.createElement('canvas'); c.width = Math.round(size.w * scale); c.height = Math.round(size.h * scale)
  const x = c.getContext('2d')!
  x.scale(scale, scale); x.textBaseline = 'alphabetic'; x.textAlign = 'left'
  const def = PAGE_DEFS[spec.kind], v = def.variants[Math.min(spec.variant, def.variants.length - 1)]
  v.draw({ x, w: size.w, h: size.h, b: brand, logo, o, pageNo, pageCount, d, photos })
  return c
}

/**
 * Render visible pages one at a time, hand each to `fn`, then release its pixels.
 * Holding every page at print resolution at once can exceed Safari's canvas memory limit.
 */
export async function eachPage(pages: PageSpec[], brand: Brand, logo: LogoInfo | null, o: Orientation, scale: number, fn: (canvas: HTMLCanvasElement, title: string, index: number, count: number) => Promise<void>, d: LogoDecisions = NO_DECISIONS, photos: GuidePhoto[] = []) {
  const on = pages.filter(p => p.on)
  for (let i = 0; i < on.length; i++) {
    const c = await renderPage(on[i], i + 1, on.length, brand, logo, o, scale, d, photos)
    try { await fn(c, PAGE_DEFS[on[i].kind].title, i, on.length) } finally { c.width = 0; c.height = 0 }
  }
}

/** Record one page with its fixed layout as editable items. Fonts must already be loaded. */
export function recordLegacyPage(spec: PageSpec, pageNo: number, pageCount: number, brand: Brand, logo: LogoInfo | null, o: Orientation, d: LogoDecisions = NO_DECISIONS, photos: GuidePhoto[] = []): RecordedPage & { title: string } {
  const size = SIZES[o], def = PAGE_DEFS[spec.kind], v = def.variants[Math.min(spec.variant, def.variants.length - 1)]
  const rec = recordPage(size.w, size.h, x => { x.textBaseline = 'alphabetic'; x.textAlign = 'left'; v.draw({ x, w: size.w, h: size.h, b: brand, logo, o, pageNo, pageCount, d, photos }) })
  return { ...rec, title: def.title }
}

/** Record visible pages as editable items (text, shapes, images) for the Editor. */
export async function recordPages(pages: PageSpec[], brand: Brand, logo: LogoInfo | null, o: Orientation, onPage?: (i: number, n: number) => void, d: LogoDecisions = NO_DECISIONS, photos: GuidePhoto[] = []): Promise<(RecordedPage & { title: string })[]> {
  await Promise.all([loadFont(brand.fonts.heading, [400, 600, 700]), loadFont(brand.fonts.body, [400, 500, 600]), loadFont(brand.fonts.mono, [400, 500, 600])])
  const on = pages.filter(p => p.on), out: (RecordedPage & { title: string })[] = []
  for (let i = 0; i < on.length; i++) {
    onPage?.(i, on.length)
    out.push(recordLegacyPage(on[i], i + 1, on.length, brand, logo, o, d, photos))
    await new Promise(r => setTimeout(r, 0)) // let the progress label paint
  }
  return out
}
