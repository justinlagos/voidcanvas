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
  // Double and curly quotes always count. A straight single quote only counts at a word edge, so the apostrophe in "Mama's" never opens a quote.
  const qm = t.match(/[“"]([^"”]{4,70})[”"]|(?:^|[\s(])'([^']{4,70})'(?=$|[\s).,;!?])/)
  const quoted = (qm ? (qm[1] ?? qm[2]) : '').trim()
  // A quote inside "must include ..." is something to print, not the title.
  const quotedIsMust = !!quoted && new RegExp(`\\b(?:include|must|feature|carry|mention|needs? to have)\\b[^.\\n]*${quoted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(t)

  const date = label('date|when|day') || first(new RegExp(`\\b(?:(?:${DAYS}),?\\s+)?(?:\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${MONTHS})|(?:${MONTHS})\\s+\\d{1,2}(?:st|nd|rd|th)?)(?:,?\\s+\\d{4})?\\b|\\b\\d{1,2}[\\/.]\\d{1,2}[\\/.]\\d{2,4}\\b`, 'i'), t)
  const time = label('time') || first(/\b\d{1,2}(?::\d{2})?\s?(?:am|pm)(?:\s?(?:-|–|to)\s?\d{1,2}(?::\d{2})?\s?(?:am|pm))?\b|\b\d{1,2}:\d{2}\b(?:\s?(?:-|–|to)\s?\d{1,2}:\d{2})?/i, t)
  const PLACES = 'shop|store|branch|hall|centre|center|church|cathedral|hotel|arena|stadium|club|bar|lounge|gardens?|park|office|studio|campus|school|mall|plaza|restaurant|cafe|kitchen|market|hq|headquarters|gallery|theatre|theater|cinema|beach|resort|lodge|square'
  const venue = label('venue|where|location|address|at')
    || (t.match(new RegExp(`\\b(?:at|venue:?|location:?)\\s+(?:our\\s+|the\\s+|my\\s+)?((?:[A-Z][\\w'&-]*)(?:\\s+[\\w'&-]+){0,4}?\\s+(?:${PLACES}))\\b`))?.[1] ?? '')
    || (t.match(/\b(?:at|venue:?|location:?)\s+((?:[Tt]he\s+)?[A-Z][\w'&-]*(?:\s+[A-Z0-9][\w'&-]*){0,6})/)?.[1] ?? '')
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
  // Only people count as an audience ("for young professionals", not "for a harvest service").
  const PEOPLE = /\b(people|professionals|students|families|parents|women|men|kids|children|youths?|members|customers|clients|fans|couples|founders|creatives|designers|teens|adults|millennials|gen z|everyone|community|congregation|guests|buyers|homeowners|small businesses|entrepreneurs|elderly|seniors|residents|staff|employees|graduates|mums|mothers|fathers|dads)\b/i
  const audLabel = label('audience|target')
  const audience = audLabel || (Array.from(t.matchAll(/\b(?:for|aimed at|targeting|audience is)\s+([a-z0-9 ,'&-]{4,60}?)(?=[.,;\n]|$)/gi)).map(m => m[1].trim()).find(a => PEOPLE.test(a)) ?? '')
  const feel = FEEL_WORDS.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(lower))

  // Headline: a labelled or quoted line, else the project title, else the first short sentence.
  const sentences = t.split(/(?<=[.!?])\s+|\n+/).map(x => x.trim()).filter(Boolean)
  const titleOk = title && !/^untitled/i.test(title)
  // Things said to the designer, not things to print: deadlines, budgets, requests, delivery notes.
  const isInstruction = (x: string) => /\b(deadline|budget|please|send|drafts?|revert|feedback|asap|urgent|approval|approve|no later|by (?:${DAYS}|${MONTHS}|\d)|we need|i need|can you|could you|we want|i want|we would like|keep it|make it|make sure|use the|use our|attached|see attached|let me know|thanks?|regards)\b/i.test(x)
  // "Flyer for a church harvest thanksgiving" or "We need an Instagram post for our bakery's new sourdough range" describes the job; the subject is the headline.
  const titleCase = (x: string) => x.replace(/(?<![\w'])([a-z])([a-z']*)/g, (_, c1, rest) => c1.toUpperCase() + rest)
  const KINDS = 'flyer|poster|post|banner|graphic|design|artwork|carousel|thumbnail|invite|invitation|card|ad|advert|creative|visual|story|reel|cover|billboard'
  const jobLine = t.match(new RegExp(`^\\s*(?:(?:we|i)\\s+(?:need|want|would like|are looking for|'d like)\\s+|(?:need|want)\\s+)?(?:an?\\s+|the\\s+|some\\s+)?(?:[\\w-]+\\s+){0,2}?(?:${KINDS})s?\\s+(?:for|about|announcing|promoting|to promote|to announce)\\s+(?:an?\\s+|the\\s+|our\\s+|my\\s+)?([^.\\n,]{3,60}?)(?=\\s+(?:at|on|in|from|this|next|by|with|during)\\b|[.,\\n]|$)`, 'im'))
  const fromJob = jobLine ? titleCase(jobLine[1].trim().replace(/^[a-z][\w-]*'s\s+/, '')) : ''
  const jobSentence = jobLine ? jobLine[0].trim() : ''
  const printable = (x: string) => !isInstruction(x) && !(jobSentence && x.includes(jobSentence))
  const headline = label('headline|title|name|event') || (quotedIsMust ? '' : quoted) || (titleOk ? title : '') || fromJob || (sentences.find(x => x.length <= 60 && printable(x) && !/\b(must|need|should)\b/i.test(x)) ?? '').replace(/[.!]$/, '')
  const hl = headline.toLowerCase()
  const feelOnly = (x: string) => x.toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).filter(w => w && !['and', 'a', 'bit', 'but', 'very', 'quite', 'yet', 'with', 'feel', 'vibe', 'tone', 'look', 'it', 'should', 'be'].includes(w)).every(w => FEEL_WORDS.includes(w))
  const subhead = label('subhead|subheading|tagline|strapline|theme')
    || (quoted && quoted.toLowerCase() !== hl ? quoted : '')
    || (sentences.find(x => { const xl = x.toLowerCase(); return printable(x) && !xl.includes(hl) && !hl.includes(xl.replace(/[.]$/, '')) && !feelOnly(x) && x.length > 12 && x.length <= 90 && !/\b(must|need|include|logo|date|price|contact|call|tickets?|free)\b/i.test(x) && !/\d/.test(x) }) ?? '').replace(/[.]$/, '')

  const used = [headline, subhead, date, time, venue, price, cta, contact].map(x => x.toLowerCase()).filter(Boolean)
  const must: string[] = []
  const addMust = (raw: string) => {
    const v = cap(raw.replace(/^[\s,;:]+|[\s,;:.]+$/g, ''))
    if (v.length < 2 || v.length > 120) return
    if (must.some(m => m.toLowerCase() === v.toLowerCase())) return
    must.push(v)
  }
  // Split a list on commas, semicolons and "and", but never inside quotes.
  const splitList = (x: string) => {
    const parts: string[] = []; let cur = '', q = ''
    for (let i = 0; i < x.length; i++) {
      const ch = x[i]
      if (q) { cur += ch; if (ch === q || (q === '“' && ch === '”') || (q === '(' && ch === ')')) q = ''; continue }
      if (ch === '"' || ch === '“' || ch === '(') { q = ch; cur += ch; continue }
      if (ch === ',' || ch === ';') { parts.push(cur); cur = ''; continue }
      if (x.slice(i, i + 5).toLowerCase() === ' and ' ) { parts.push(cur); cur = ''; i += 4; continue }
      cur += ch
    }
    parts.push(cur)
    return parts.map(p => p.trim().replace(/[.\s]+$/, '').replace(/^[“"']|[”"']$/g, '')).filter(Boolean)
  }
  for (const line of t.split(/[\n;]+|(?<=\.)\s+/)) {
    const l = line.trim()
    if (l.length < 6 || l.length > 160) continue
    if (jobSentence && l.includes(jobSentence)) continue
    // "We need an Instagram post" is the job, not something to print.
    if (new RegExp(`\\b(?:need|want|looking for|would like)\\b[^.]{0,24}\\b(?:${KINDS})s?\\b`, 'i').test(l)) continue
    // A list of the formats wanted is a deliverables list, not something to print on the design.
    if (/\b(need|want|require|deliver|send)\b/i.test(l) && /\b(instagram|story|stories|poster|billboard|flyer|banner|reel|thumbnail|deck|slides?|a[345]|post|status)\b/i.test(l)) continue
    // "Must include: X, Y and Z" is a list; each item is its own must-have.
    const listed = l.match(/^(?:it\s+|the\s+\w+\s+)?(?:must|should|needs?\s+to|has\s+to|please)?\s*(?:include|have|show|feature|carry|mention)s?\s*:?\s*(.+)$/i)
    if (listed) { for (const item of splitList(listed[1])) if (item.toLowerCase() !== hl) addMust(item); continue }
    if (!/\b(must|need|should|include|feature|logo|sponsor|partners?|hashtag|disclaimer|terms|dress code|hosted by|powered by|in partnership|speakers?|guest|performing|lineup|featuring)\b/i.test(l)) continue
    if (isInstruction(l) && !/\b(logo|sponsor|hashtag|disclaimer)\b/i.test(l)) continue
    if (used.some(u => l.toLowerCase().includes(u) && u.length > 4)) continue
    addMust(l.replace(/^(?:it\s+)?(?:must|should|needs? to)\s+(?:include|have|show|feature)\s*:?\s*/i, '').replace(/[.]$/, ''))
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
export function wrap(text: string, family: string, weight: number, size: number, width: number, spacing = 0): string[] {
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
export function fit(text: string, family: string, weight: number, width: number, maxSize: number, minSize: number, maxLines: number, spacing = 0) {
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
export async function coverCrop(h: Hero, w: number, hgt: number): Promise<Blob> {
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

export function textItem(name: string, text: string, family: string, weight: number, size: number, color: string, x: number, y: number, width: number, align: 'left' | 'center' | 'right' = 'left', lineHeight = 1.15, letterSpacing = 0): LayeredItem {
  return { kind: 'text', name, text, fontFamily: family, fontSize: Math.round(size), fontWeight: weight, italic: false, color, align, lineHeight, letterSpacing, x: Math.round(x), y: Math.round(y), opacity: 1, boxWidth: Math.round(width) }
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
