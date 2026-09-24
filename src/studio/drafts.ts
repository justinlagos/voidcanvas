import type { LayeredItem, LayeredPage } from '@/editor/io'

// Studio's engine: read a brief into fields, give the palette jobs (background, text, accent)
// with contrast checked, pick a type pairing, and lay out three editable first drafts.
// All local, all deterministic, so it works offline and costs nothing.

// ─── Reading the brief ─────────────────────────────────────────────

export interface BriefFields {
  headline: string
  subhead: string
  date: string
  time: string
  venue: string
  price: string
  cta: string
  contact: string
  audience: string
  feel: string[]
  /** Everything else the client said must be on it. */
  must: string[]
}
export const EMPTY_FIELDS: BriefFields = { headline: '', subhead: '', date: '', time: '', venue: '', price: '', cta: '', contact: '', audience: '', feel: [], must: [] }

const FEEL_WORDS = ['bold', 'playful', 'premium', 'luxury', 'minimal', 'clean', 'warm', 'friendly', 'modern', 'retro', 'vintage', 'fun', 'serious', 'calm', 'energetic', 'elegant', 'edgy', 'corporate', 'youthful', 'trustworthy', 'bright', 'dark', 'soft', 'vibrant', 'classy', 'festive', 'natural', 'techy', 'professional', 'loud', 'rich', 'cultural', 'afro', 'urban']
const MONTHS = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?'
const DAYS = 'mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?'
const CTA_VERBS = ['get tickets', 'buy tickets', 'book now', 'book a', 'register', 'rsvp', 'sign up', 'join us', 'join', 'shop now', 'order now', 'order', 'call now', 'call', 'visit', 'apply', 'learn more', 'download', 'subscribe', 'donate', 'enrol', 'enroll', 'dm', 'send a dm', 'whatsapp', 'reserve', 'pre-order', 'preorder', 'attend', 'watch']

const cap = (s: string) => s.replace(/^\s*[-*•]\s*/, '').replace(/\s+/g, ' ').trim().replace(/^./, c => c.toUpperCase())
const first = (re: RegExp, t: string) => { const m = t.match(re); return m ? m[0].trim() : '' }

export function readBrief(text: string, title = ''): BriefFields {
  const t = text.trim()
  const lower = t.toLowerCase()
  // Labelled lines win ("Headline: ...", "Date - ...").
  const label = (names: string) => { const m = t.match(new RegExp(`^\\s*(?:${names})\\s*[:\\-–]\\s*(.+)$`, 'im')); return m ? m[1].trim() : '' }
  const quoted = first(/[“"']([^"”']{4,70})[”"']/, t).replace(/^[“"']|[”"']$/g, '')

  const date = label('date|when|day') || first(new RegExp(`\\b(?:(?:${DAYS}),?\\s+)?(?:\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${MONTHS})|(?:${MONTHS})\\s+\\d{1,2}(?:st|nd|rd|th)?)(?:,?\\s+\\d{4})?\\b|\\b\\d{1,2}[\\/.]\\d{1,2}[\\/.]\\d{2,4}\\b`, 'i'), t)
  const time = label('time') || first(/\b\d{1,2}(?::\d{2})?\s?(?:am|pm)(?:\s?(?:-|–|to)\s?\d{1,2}(?::\d{2})?\s?(?:am|pm))?\b|\b\d{1,2}:\d{2}\b(?:\s?(?:-|–|to)\s?\d{1,2}:\d{2})?/i, t)
  const venue = label('venue|where|location|address|at') || (t.match(/\b(?:at|venue:?|location:?)\s+((?:[Tt]he\s+)?[A-Z][\w'&-]*(?:\s+[A-Z0-9][\w'&-]*){0,6})/)?.[1] ?? '')
  const price = label('price|cost|tickets?|fee|entry') || first(/(?:₦|N|NGN|£|\$|€|GHS|KES)\s?\d[\d,]*(?:\.\d{2})?(?:k)?\b|\b\d[\d,]*\s?(?:naira|pounds|dollars)\b|\bfree\s+(?:entry|admission|to attend)\b|\bfree\b/i, t)
  const phone = first(/(?:\+\d{1,3}[\s-]?)?\(?0?\d{3,4}\)?[\s-]?\d{3}[\s-]?\d{3,4}\b/, t)
  const email = first(/[\w.+-]+@[\w-]+\.[\w.]+/, t)
  const url = first(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:com|ng|co\.uk|org|net|io|app|africa|co)(?:\/\S*)?\b/i, t.replace(email, ''))
  const handle = first(/(?:^|\s)@[a-z0-9_.]{2,30}\b/i, t.replace(email, ''))
  const contact = label('contact|call|phone|web|website|handle') || [url, handle.trim(), phone, email].filter(Boolean).slice(0, 2).join('  ·  ')

  let cta = label('cta|call to action|button')
  if (!cta) {
    const v = CTA_VERBS.find(w => new RegExp(`\\b${w}\\b`, 'i').test(lower))
    if (v) {
      const m = t.match(new RegExp(`\\b${v}\\b[^.\\n,;]{0,24}`, 'i'))
      cta = cap((m?.[0] ?? v).replace(/\s+(?:on|at|via|by|before)\s.*$/i, ''))
      // Contact details belong in the contact line, not on the button.
      if (/[\d@]|\.[a-z]{2,}/i.test(cta)) cta = cap(v === 'call' ? 'Call us' : v)
    }
  }
  const audRaw = label('audience|for|target') || (t.match(/\b(?:for|aimed at|targeting|audience is)\s+([a-z0-9 ,'&-]{4,60}?)(?=[.,;\n]|$)/i)?.[1]?.trim() ?? '')
  // Only people count as an audience ("for young professionals", not "for a harvest service").
  const audience = /\b(people|professionals|students|families|parents|women|men|kids|children|youths?|members|customers|clients|fans|couples|founders|creatives|designers|teens|adults|millennials|gen z|everyone|community|congregation|guests|buyers|homeowners|small businesses|entrepreneurs)\b/i.test(audRaw) ? audRaw : ''
  const feel = FEEL_WORDS.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(lower))

  // Headline: a labelled or quoted line, else the project title, else the first short sentence.
  const sentences = t.split(/(?<=[.!?])\s+|\n+/).map(x => x.trim()).filter(Boolean)
  const titleOk = title && !/^untitled/i.test(title)
  // "Flyer for a church harvest thanksgiving" describes the job; the event is the headline.
  const titleCase = (x: string) => x.replace(/\b([a-z])([a-z']*)/g, (_, c1, rest) => c1.toUpperCase() + rest)
  const jobLine = t.match(/^\s*(?:an?\s+)?(?:flyer|poster|post|banner|graphic|design|artwork|carousel|thumbnail|invite|invitation|card|ad|advert)s?\s+(?:for|about|announcing|promoting)\s+(?:an?\s+|the\s+|our\s+|my\s+)?([^.\n]{3,60})/i)
  const fromJob = jobLine ? titleCase(jobLine[1].trim()) : ''
  const headline = label('headline|title|name|event') || quoted || (titleOk ? title : '') || fromJob || (sentences.find(x => x.length <= 60 && !/\b(must|need|should|please|we want|i want)\b/i.test(x)) ?? '').replace(/[.!]$/, '')
  const hl = headline.toLowerCase()
  const subhead = label('subhead|subheading|tagline|strapline|theme') || (sentences.find(x => { const xl = x.toLowerCase(); return !xl.includes(hl) && !hl.includes(xl.replace(/[.]$/, '')) && !(jobLine && x.includes(jobLine[0].trim())) && !x.toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).filter(w => w && !['and', 'a', 'bit', 'but', 'very', 'quite', 'yet', 'with', 'feel', 'vibe', 'tone', 'look'].includes(w)).every(w => FEEL_WORDS.includes(w)) && x.length > 12 && x.length <= 90 && !/\b(must|need|include|logo|date|price|contact|call|tickets?|free)\b/i.test(x) && !/\d/.test(x) }) ?? '').replace(/[.]$/, '')

  const used = [headline, subhead, date, time, venue, price, cta, contact].map(x => x.toLowerCase()).filter(Boolean)
  const must: string[] = []
  for (const line of t.split(/[\n;]+|(?<=\.)\s+/)) {
    const l = line.trim()
    if (l.length < 6 || l.length > 120) continue
    if (!/\b(must|need|should|include|feature|logo|sponsor|partners?|hashtag|disclaimer|terms|dress code|hosted by|powered by|in partnership|speakers?|guest|performing|lineup|featuring)\b/i.test(l)) continue
    if (used.some(u => l.toLowerCase().includes(u) && u.length > 4)) continue
    must.push(cap(l.replace(/^(?:it\s+)?(?:must|should|needs? to)\s+(?:include|have|show|feature)\s*:?\s*/i, '').replace(/[.]$/, '')))
  }
  return { headline: cap(headline), subhead: cap(subhead), date: cap(date), time, venue: cap(venue), price: price.replace(/^n(?=\d)/i, '₦'), cta, contact, audience: cap(audience), feel, must: must.slice(0, 5) }
}

// ─── Colour jobs and contrast ──────────────────────────────────────

const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const lum = (h: string) => { const [r, g, b] = rgb(h).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
export const contrast = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
const sat = (h: string) => { const [r, g, b] = rgb(h).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx }
const mix = (a: string, b: string, t: number) => '#' + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('')

export interface Roles { bg: string; text: string; accent: string; onAccent: string; muted: string; ratios: { text: number; accent: number; onAccent: number } }

/** Give colours jobs. Dark, bold or premium briefs get a dark ground; the rest a light one. */
export function paletteRoles(palette: string[], feel: string[], darkPref?: boolean): Roles {
  const pal = palette.length ? palette : ['#111111', '#f5f3ee', '#e4572e']
  const wantsDark = darkPref ?? feel.some(f => ['dark', 'premium', 'luxury', 'edgy', 'bold', 'rich', 'techy', 'urban'].includes(f))
  const byLum = pal.slice().sort((a, b) => lum(a) - lum(b))
  let bg = wantsDark ? byLum[0] : byLum[byLum.length - 1]
  // Push the ground far enough from mid-grey that text can sit on it.
  if (wantsDark && lum(bg) > 0.08) bg = mix(bg, '#000000', 0.55)
  if (!wantsDark && lum(bg) < 0.6) bg = mix(bg, '#ffffff', 0.75)
  const pickText = () => { const c = pal.slice().sort((a, b) => contrast(b, bg) - contrast(a, bg))[0]; return contrast(c, bg) >= 7 ? c : wantsDark ? '#ffffff' : '#111111' }
  const text = pickText()
  // Accent: the most saturated colour that still reads on the ground (3:1 for large text and shapes).
  const accents = pal.filter(c => c !== bg && c !== text).sort((a, b) => sat(b) - sat(a))
  let accent = accents.find(c => contrast(c, bg) >= 3) ?? accents[0] ?? (wantsDark ? '#ffcf3f' : '#e4572e')
  for (let i = 0; i < 6 && contrast(accent, bg) < 3; i++) accent = mix(accent, wantsDark ? '#ffffff' : '#000000', 0.2)
  const onAccent = contrast('#ffffff', accent) >= contrast('#111111', accent) ? '#ffffff' : '#111111'
  const muted = mix(text, bg, 0.35)
  return { bg, text, accent, onAccent, muted, ratios: { text: contrast(text, bg), accent: contrast(accent, bg), onAccent: contrast(onAccent, accent) } }
}
export const grade = (r: number) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA large' : 'Fails')

// ─── Type pairing ──────────────────────────────────────────────────

export interface FontPair { id: string; label: string; display: string; displayWeight: number; body: string; bodyWeight: number; caps: boolean }
export const FONT_PAIRS: FontPair[] = [
  { id: 'geo', label: 'Confident sans', display: 'Montserrat', displayWeight: 700, body: 'Inter', bodyWeight: 400, caps: false },
  { id: 'poster', label: 'Loud poster', display: 'Anton', displayWeight: 400, body: 'DM Sans', bodyWeight: 400, caps: true },
  { id: 'block', label: 'Heavy block', display: 'Archivo Black', displayWeight: 400, body: 'Inter', bodyWeight: 400, caps: false },
  { id: 'editorial', label: 'Editorial serif', display: 'Playfair Display', displayWeight: 700, body: 'DM Sans', bodyWeight: 400, caps: false },
  { id: 'soft', label: 'Warm serif', display: 'Fraunces', displayWeight: 700, body: 'Inter', bodyWeight: 400, caps: false },
  { id: 'friendly', label: 'Friendly rounded', display: 'Poppins', displayWeight: 700, body: 'Poppins', bodyWeight: 400, caps: false },
  { id: 'condensed', label: 'Tall condensed', display: 'Bebas Neue', displayWeight: 400, body: 'Space Grotesk', bodyWeight: 400, caps: true },
  { id: 'tech', label: 'Tech grotesk', display: 'Space Grotesk', displayWeight: 700, body: 'Space Grotesk', bodyWeight: 400, caps: false },
]
export function pickPair(feel: string[]): FontPair {
  const has = (...w: string[]) => w.some(x => feel.includes(x))
  if (has('premium', 'luxury', 'elegant', 'classy')) return FONT_PAIRS[3]
  if (has('warm', 'natural', 'soft', 'calm')) return FONT_PAIRS[4]
  if (has('playful', 'fun', 'youthful', 'friendly', 'festive')) return FONT_PAIRS[5]
  if (has('loud', 'energetic', 'urban', 'edgy')) return FONT_PAIRS[1]
  if (has('bold', 'vibrant', 'afro', 'cultural')) return FONT_PAIRS[2]
  if (has('retro', 'vintage')) return FONT_PAIRS[6]
  if (has('techy', 'modern')) return FONT_PAIRS[7]
  return FONT_PAIRS[0]
}

// ─── Layout ────────────────────────────────────────────────────────

let measureCtx: CanvasRenderingContext2D | null = null
function ctx() { if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')!; return measureCtx }
function wrap(text: string, family: string, weight: number, size: number, width: number, spacing = 0): string[] {
  const c = ctx(); c.font = `${weight} ${size}px "${family}", sans-serif`
  const out: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const trial = line ? `${line} ${word}` : word
      if (c.measureText(trial).width + trial.length * spacing > width * 0.96 && line) { out.push(line); line = word } else line = trial
    }
    out.push(line)
  }
  return out
}
/** Largest size (down to min) at which the text fits in the box within maxLines. */
function fit(text: string, family: string, weight: number, width: number, maxSize: number, minSize: number, maxLines: number, spacing = 0) {
  for (let s = maxSize; s >= minSize; s -= Math.max(1, Math.round(s * 0.04))) {
    const lines = wrap(text, family, weight, s, width, spacing * s)
    const longest = Math.max(...lines.map(l => { const c = ctx(); c.font = `${weight} ${s}px "${family}", sans-serif`; return c.measureText(l).width }))
    if (lines.length <= maxLines && longest <= width * 0.92) return { size: s, lines }
  }
  return { size: minSize, lines: wrap(text, family, weight, minSize, width, spacing * minSize) }
}

export interface Hero { blob: Blob; width: number; height: number }
export interface DraftInput { fields: BriefFields; roles: Roles; pair: FontPair; size: { width: number; height: number }; hero?: Hero | null; refs?: Hero[]; palette: string[]; brief: string; title: string }

/** Crop an image to fill a box (object-fit: cover) and return it as a blob sized for the box. */
async function coverCrop(h: Hero, w: number, hgt: number): Promise<Blob> {
  const bmp = await createImageBitmap(h.blob)
  const k = Math.max(w / bmp.width, hgt / bmp.height)
  const sw = w / k, sh = hgt / k, sx = (bmp.width - sw) / 2, sy = (bmp.height - sh) / 2
  const scale = Math.min(1, 2400 / Math.max(w, hgt))
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(hgt * scale))
  const x = c.getContext('2d')!; x.imageSmoothingQuality = 'high'; x.drawImage(bmp, sx, sy, sw, sh, 0, 0, c.width, c.height)
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('crop'))), 'image/jpeg', 0.9))
}

type Box = { x: number; y: number; w: number; h: number }
const upper = (s: string, on: boolean) => (on ? s.toUpperCase() : s)

function textItem(name: string, text: string, family: string, weight: number, size: number, color: string, x: number, y: number, width: number, align: 'left' | 'center' | 'right' = 'left', lineHeight = 1.15, letterSpacing = 0): LayeredItem {
  return { kind: 'text', name, text, fontFamily: family, fontSize: Math.round(size), fontWeight: weight, italic: false, color, align, lineHeight, letterSpacing, x: Math.round(x), y: Math.round(y), opacity: 1, boxWidth: Math.round(width) }
}

/** Stack the brief's pieces into a column. Returns the items and the height used. */
function column(inp: DraftInput, box: Box, align: 'left' | 'center', scale: { head: number; minHead: number; body: number }, colors: { head: string; body: string; muted: string }): { items: LayeredItem[]; bottom: number } {
  const { fields: f, pair } = inp
  const items: LayeredItem[] = []
  let y = box.y
  const ax = box.x
  const detail = [f.date, f.time, f.venue].filter(Boolean).join('  ·  ')
  if (f.headline) {
    const txt = upper(f.headline, pair.caps)
    const r = fit(txt, pair.display, pair.displayWeight, box.w, scale.head, scale.minHead, 4, pair.caps ? 0.01 : -0.01)
    items.push(textItem('Headline', txt, pair.display, pair.displayWeight, r.size, colors.head, ax, y, box.w, align, pair.caps ? 0.95 : 1.05, pair.caps ? 0.01 * r.size : -0.01 * r.size))
    y += r.lines.length * r.size * (pair.caps ? 0.95 : 1.05) + scale.body * 1.2
  }
  if (f.subhead) {
    const r = fit(f.subhead, pair.body, pair.bodyWeight, box.w, scale.body * 1.35, scale.body, 3)
    items.push(textItem('Subheading', f.subhead, pair.body, pair.bodyWeight, r.size, colors.body, ax, y, box.w, align, 1.35))
    y += r.lines.length * r.size * 1.35 + scale.body * 1.4
  }
  if (detail) {
    const lines = wrap(detail, pair.body, 700, scale.body, box.w)
    items.push(textItem('Date, time and place', detail, pair.body, 700, scale.body, colors.head, ax, y, box.w, align, 1.35))
    y += lines.length * scale.body * 1.35 + scale.body * 0.8
  }
  f.must.forEach((m, i) => {
    const lines = wrap(m, pair.body, pair.bodyWeight, scale.body * 0.85, box.w)
    items.push(textItem(`Must include ${i + 1}`, m, pair.body, pair.bodyWeight, scale.body * 0.85, colors.muted, ax, y, box.w, align, 1.35))
    y += lines.length * scale.body * 0.85 * 1.35 + scale.body * 0.4
  })
  return { items, bottom: y }
}

function ctaItems(inp: DraftInput, x: number, y: number, align: 'left' | 'center', maxW: number, body: number, fill: string, ink: string): { items: LayeredItem[]; h: number } {
  const { fields: f, pair } = inp
  const items: LayeredItem[] = []
  let h = 0
  if (f.cta) {
    const label = upper(f.cta, true)
    const c = ctx(); c.font = `700 ${body}px "${pair.body}", sans-serif`
    const tw = Math.min(maxW - body * 2.4, c.measureText(label).width + label.length * body * 0.04)
    const bw = tw + body * 2.4, bh = body * 2.6
    const bx = align === 'center' ? x + (maxW - bw) / 2 : x
    items.push({ kind: 'shape', name: 'Button', shape: 'rect', x: Math.round(bx), y: Math.round(y), w: Math.round(bw), h: Math.round(bh), fill, stroke: null, strokeWidth: 0, radius: Math.round(bh / 2), rotation: 0, opacity: 1 })
    items.push({ ...textItem('Button label', label, pair.body, 700, body, ink, bx + body * 1.2, y + (bh - body * 1.2) / 2, tw + 2, 'left', 1.2, body * 0.04), boxWidth: undefined } as LayeredItem)
    h = bh
  }
  if (f.price) {
    const py = y + (h ? h + body * 0.9 : 0)
    items.push(textItem('Price', f.price, pair.display, pair.displayWeight, body * 1.6, fill, x, py, maxW, align, 1.1))
    h = py - y + body * 1.8
  }
  return { items, h }
}

/** Three layout directions for the same brief, as editable pages. */
export async function buildDrafts(inp: DraftInput): Promise<LayeredPage[]> {
  const { size, roles: r, fields: f, pair } = inp
  const W = size.width, H = size.height, short = Math.min(W, H), wide = W / H > 1.4
  const m = Math.round(short * 0.075)
  const body = Math.max(14, Math.round(short * 0.028))
  const pages: LayeredPage[] = []
  const hasText = !!(f.headline || f.subhead || f.must.length)
  const fields = hasText ? f : { ...f, headline: inp.title && !/^untitled/i.test(inp.title) ? inp.title : 'Your headline here', subhead: f.subhead || 'A short line that says what this is and why it matters.' }
  const I = { ...inp, fields }

  // 1. Centred: type-led, calm, everything on the middle axis.
  {
    const items: LayeredItem[] = []
    const colW = W - m * 2
    let k = 1
    let col = column(I, { x: m, y: 0, w: colW, h: H }, 'center', { head: short * (wide ? 0.13 : 0.15), minHead: short * 0.06, body }, { head: r.text, body: r.text, muted: r.muted })
    let cta = ctaItems(I, m, 0, 'center', colW, body, r.accent, r.onAccent)
    for (let i = 0; i < 8 && col.bottom + body * 1.2 + cta.h > H - m * 2 - body * 3; i++) {
      k *= 0.9; const b2 = Math.max(11, body * k)
      col = column(I, { x: m, y: 0, w: colW, h: H }, 'center', { head: short * (wide ? 0.13 : 0.15) * k, minHead: short * 0.04, body: b2 }, { head: r.text, body: r.text, muted: r.muted })
      cta = ctaItems(I, m, 0, 'center', colW, b2, r.accent, r.onAccent)
    }
    const total = col.bottom + (cta.h ? body * 1.2 + cta.h : 0)
    const top = Math.max(m, (H - total) / 2 - body)
    items.push({ kind: 'shape', name: 'Accent bar', shape: 'rect', x: Math.round(W / 2 - short * 0.05), y: Math.round(top - body * 2.2), w: Math.round(short * 0.1), h: Math.max(4, Math.round(short * 0.008)), fill: r.accent, stroke: null, strokeWidth: 0, radius: 2, rotation: 0, opacity: 1 })
    for (const it of col.items) items.push({ ...it, y: it.y + top } as LayeredItem)
    for (const it of cta.items) items.push({ ...it, y: it.y + top + col.bottom + body * 1.2 } as LayeredItem)
    if (fields.contact) items.push(textItem('Contact', fields.contact, pair.body, pair.bodyWeight, body * 0.85, r.muted, m, H - m - body, colW, 'center', 1.2))
    pages.push({ name: 'Draft A · Centred', background: r.bg, items })
  }

  // 2. Split: image on one side (or a colour field), type on the other.
  {
    const items: LayeredItem[] = []
    const portrait = H >= W
    const img: Box = portrait ? { x: 0, y: 0, w: W, h: Math.round(H * 0.5) } : { x: Math.round(W * 0.5), y: 0, w: Math.round(W * 0.5), h: H }
    if (inp.hero) items.push({ kind: 'image', name: 'Hero image', blob: await coverCrop(inp.hero, img.w, img.h), x: img.x, y: img.y, scaleX: img.w / Math.max(1, Math.round(img.w * Math.min(1, 2400 / Math.max(img.w, img.h)))), scaleY: img.h / Math.max(1, Math.round(img.h * Math.min(1, 2400 / Math.max(img.w, img.h)))), opacity: 1 })
    else items.push({ kind: 'shape', name: 'Image area (drop a photo here)', shape: 'rect', x: img.x, y: img.y, w: img.w, h: img.h, fill: r.accent, stroke: null, strokeWidth: 0, radius: 0, rotation: 0, opacity: 1 })
    const tb: Box = portrait ? { x: m, y: img.h + m * 0.8, w: W - m * 2, h: H - img.h - m * 1.8 } : { x: m, y: m, w: W * 0.5 - m * 1.6, h: H - m * 2 }
    // Shrink the type until the column, button and price fit above the contact line.
    const limit = H - m * 0.7 - body * 2.2
    let k = 1, col = column(I, tb, 'left', { head: short * (portrait ? 0.1 : 0.12), minHead: short * 0.05, body: (portrait ? body : body * 0.9) }, { head: r.text, body: r.text, muted: r.muted })
    let cta = ctaItems(I, tb.x, col.bottom + body * 0.6, 'left', tb.w, portrait ? body : body * 0.9, r.accent, r.onAccent)
    for (let i = 0; i < 8 && col.bottom + body * 0.6 + cta.h > limit; i++) {
      k *= 0.9
      const b2 = Math.max(11, (portrait ? body : body * 0.9) * k)
      col = column(I, tb, 'left', { head: short * (portrait ? 0.1 : 0.12) * k, minHead: short * 0.04, body: b2 }, { head: r.text, body: r.text, muted: r.muted })
      cta = ctaItems(I, tb.x, col.bottom + b2 * 0.6, 'left', tb.w, b2, r.accent, r.onAccent)
    }
    items.push(...col.items)
    items.push(...cta.items)
    if (fields.contact) items.push(textItem('Contact', fields.contact, pair.body, pair.bodyWeight, body * 0.8, r.muted, tb.x, H - m * 0.7 - body, tb.w, 'left', 1.2))
    pages.push({ name: 'Draft B · Split', background: r.bg, items })
  }

  // 3. Poster: huge headline on a solid accent ground, details in a band.
  {
    const items: LayeredItem[] = []
    const ground = r.accent, ink = r.onAccent
    const inner = W - m * 2
    const head = upper(fields.headline, true)
    const hf = fit(head, pair.display, pair.displayWeight, inner, short * 0.24, short * 0.08, 4, 0)
    const band = Math.round(Math.max(body * 6, H * 0.2))
    let y = m
    if (fields.subhead) { const lines = wrap(upper(fields.subhead, true), pair.body, 700, body * 0.8, inner, body * 0.1); items.push(textItem('Kicker', upper(fields.subhead, true), pair.body, 700, body * 0.8, ink, m, y, inner, 'left', 1.3, body * 0.1)); y += lines.length * body * 1.05 + body }
    const headH = hf.lines.length * hf.size * 0.92
    const hy = Math.max(y, (H - band - headH) / 2)
    items.push(textItem('Headline', head, pair.display, pair.displayWeight, hf.size, ink, m, hy, inner, 'left', 0.92, 0))
    items.push({ kind: 'shape', name: 'Details band', shape: 'rect', x: 0, y: H - band, w: W, h: band, fill: r.bg, stroke: null, strokeWidth: 0, radius: 0, rotation: 0, opacity: 1 })
    const detail = [fields.date, fields.time, fields.venue].filter(Boolean).join('  ·  ') || fields.must[0] || ''
    const bandTop = H - band + body * 1.2
    if (detail) { items.push(textItem('Date, time and place', detail, pair.body, 700, body, r.text, m, bandTop, inner * 0.62, 'left', 1.35)) }
    if (fields.contact) items.push(textItem('Contact', fields.contact, pair.body, pair.bodyWeight, body * 0.8, r.muted, m, H - body * 1.9, inner * 0.62, 'left', 1.2))
    const cta = ctaItems({ ...I, fields: { ...fields, price: '' } }, W - m - inner * 0.34, bandTop, 'left', inner * 0.34, body * 0.9, r.accent, r.onAccent)
    items.push(...cta.items)
    if (fields.price) items.push(textItem('Price', fields.price, pair.display, pair.displayWeight, body * 1.5, r.text, W - m - inner * 0.34, bandTop + (cta.h ? cta.h + body * 0.6 : 0), inner * 0.34, 'left', 1.1))
    pages.push({ name: 'Draft C · Poster', background: ground, items })
  }
  return pages
}

/** A one-page moodboard to send the client for sign-off before design starts. */
export async function buildMoodboard(inp: DraftInput, roleNames = true): Promise<LayeredPage> {
  const W = 1920, H = 1080, m = 64
  const { roles: r, pair, fields: f } = inp
  const items: LayeredItem[] = []
  items.push(textItem('Title', inp.title || 'Moodboard', pair.display, pair.displayWeight, 64, r.text, m, m, 760, 'left', 1.05))
  const briefShort = inp.brief.length > 420 ? inp.brief.slice(0, 417) + '…' : inp.brief
  if (briefShort) items.push(textItem('Brief', briefShort, pair.body, 400, 20, r.muted, m, m + 100, 760, 'left', 1.45))
  const facts = [f.audience && `For: ${f.audience}`, f.feel.length && `Feel: ${f.feel.join(', ')}`, `Type: ${pair.display} with ${pair.body}`].filter(Boolean).join('\n')
  items.push(textItem('Direction', facts, pair.body, 700, 20, r.text, m, 560, 760, 'left', 1.6))
  // Palette with jobs.
  const chips: [string, string][] = roleNames ? [['Background', r.bg], ['Text', r.text], ['Accent', r.accent], ['Muted', r.muted]] : []
  for (const c of inp.palette) if (!chips.some(x => x[1].toLowerCase() === c.toLowerCase())) chips.push(['', c])
  chips.slice(0, 8).forEach(([name, hex], i) => {
    const x = m + i * 96
    items.push({ kind: 'shape', name: `Swatch ${hex}`, shape: 'rect', x, y: 700, w: 84, h: 84, fill: hex, stroke: contrast(hex, r.bg) < 1.3 ? r.muted : null, strokeWidth: 1, radius: 12, rotation: 0, opacity: 1 })
    items.push(textItem(`Label ${hex}`, `${name ? name + '\n' : ''}${hex.toUpperCase()}`, pair.body, 400, 13, r.muted, x, 792, 90, 'left', 1.3))
  })
  items.push(textItem('Type specimen', 'Aa', pair.display, pair.displayWeight, 120, r.text, m, 860, 300, 'left', 1))
  // References on the right, in a simple grid.
  const refs = (inp.refs ?? []).slice(0, 6)
  const gx = 900, gw = W - gx - m, cols = refs.length > 4 ? 3 : refs.length > 1 ? 2 : 1, gap = 16
  const cw = Math.floor((gw - gap * (cols - 1)) / cols), rows = Math.ceil(refs.length / cols) || 1, ch = Math.floor((H - m * 2 - gap * (rows - 1)) / rows)
  for (let i = 0; i < refs.length; i++) {
    const x = gx + (i % cols) * (cw + gap), y = m + Math.floor(i / cols) * (ch + gap)
    const blob = await coverCrop(refs[i], cw, ch)
    const k = Math.min(1, 2400 / Math.max(cw, ch))
    items.push({ kind: 'image', name: `Reference ${i + 1}`, blob, x, y, scaleX: cw / Math.max(1, Math.round(cw * k)), scaleY: ch / Math.max(1, Math.round(ch * k)), opacity: 1 })
  }
  return { name: 'Moodboard', background: r.bg, items }
}

/** Draw a page to a canvas, for previews in Studio and for the moodboard PNG. */
export async function renderPage(page: LayeredPage, size: { width: number; height: number }, maxW: number): Promise<HTMLCanvasElement> {
  const k = Math.min(1, maxW / size.width)
  const c = document.createElement('canvas'); c.width = Math.round(size.width * k); c.height = Math.round(size.height * k)
  const x = c.getContext('2d')!
  x.scale(k, k)
  x.fillStyle = page.background ?? '#ffffff'; x.fillRect(0, 0, size.width, size.height)
  for (const it of page.items) {
    x.globalAlpha = it.opacity
    if (it.kind === 'shape') {
      x.fillStyle = it.fill ?? 'transparent'
      x.beginPath()
      if (it.shape === 'ellipse') x.ellipse(it.x + it.w / 2, it.y + it.h / 2, it.w / 2, it.h / 2, 0, 0, Math.PI * 2)
      else x.roundRect(it.x, it.y, it.w, it.h, Math.min(it.radius, it.w / 2, it.h / 2))
      if (it.fill) x.fill()
      if (it.stroke && it.strokeWidth) { x.strokeStyle = it.stroke; x.lineWidth = it.strokeWidth; x.stroke() }
    } else if (it.kind === 'image') {
      const bmp = await createImageBitmap(it.blob)
      x.drawImage(bmp, it.x, it.y, bmp.width * it.scaleX, bmp.height * it.scaleY)
    } else {
      x.fillStyle = it.color; x.font = `${it.italic ? 'italic ' : ''}${it.fontWeight} ${it.fontSize}px "${it.fontFamily}", sans-serif`
      x.textBaseline = 'top'
      const w = it.boxWidth ?? 0
      x.textAlign = it.align
      const ax = it.align === 'center' ? it.x + w / 2 : it.align === 'right' ? it.x + w : it.x
      const lines = w ? wrap(it.text, it.fontFamily, it.fontWeight, it.fontSize, w / 0.96, it.letterSpacing) : it.text.split('\n')
      lines.forEach((line, i) => x.fillText(line, ax, it.y + i * it.fontSize * it.lineHeight + it.fontSize * (it.lineHeight - 1) / 2))
      x.textAlign = 'left'
    }
    x.globalAlpha = 1
  }
  return c
}

/** The checklist the Editor's Brief panel keeps. */
export function briefItems(f: BriefFields): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = []
  const add = (label: string, value: string) => { if (value.trim()) out.push({ label, value: value.trim() }) }
  add('Headline', f.headline); add('Subheading', f.subhead); add('Date', f.date); add('Time', f.time); add('Venue', f.venue)
  add('Price', f.price); add('Call to action', f.cta); add('Contact', f.contact)
  f.must.forEach(m => add('Must include', m))
  return out
}
