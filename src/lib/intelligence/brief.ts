// Checking a brief before the work starts: what is missing, what contradicts itself, and the sizes it
// asks for. Everything here is plain reading of the client's words, so it runs offline and is the same
// every time. Each finding quotes the words it came from, so the designer can see why it was raised.

export interface BriefFieldsLike { headline: string; date: string; time: string; venue: string; price: string; cta: string; contact: string }

export type IssueKind = 'missing' | 'conflict' | 'past' | 'weekday' | 'deadline'
export interface BriefIssue {
  id: string
  kind: IssueKind
  /** The question to put to the client, in plain words. */
  question: string
  /** The words in the brief it came from, when there are any. */
  quote?: string
}

export interface BriefSize {
  label: string
  width: number
  height: number
  /** Print sizes, in millimetres. */
  mm?: { w: number; h: number }
  /** A known format this size matches. */
  presetId?: string
  quote: string
}

export interface BriefDate { day: number; month: number; year: number | null; weekday: number | null; text: string; index: number; deadline: boolean }

export interface BriefCheck { issues: BriefIssue[]; sizes: BriefSize[]; dates: BriefDate[]; deadline: Date | null; event: boolean }

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const MONTHS = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?'
const DAYS = 'mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?'
const monthOf = (s: string) => MONTH_NAMES.findIndex(m => m.startsWith(s.toLowerCase().slice(0, 3)))
const dayOf = (s: string) => DAY_NAMES.findIndex(d => d.startsWith(s.toLowerCase().slice(0, 3)))
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Every date written in the brief, in the order they appear. Numeric dates are read day first (12/10/2026 is 12 October). */
export function datesIn(text: string): BriefDate[] {
  const out: BriefDate[] = []
  const re = new RegExp(
    `(?:\\b(${DAYS})\\.?,?\\s+(?:the\\s+)?)?` +
    `(?:\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTHS})\\.?|\\b(${MONTHS})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b)` +
    `(?:,?\\s+(\\d{4}))?` +
    `|\\b(\\d{1,2})[\\/.](\\d{1,2})[\\/.](\\d{2,4})\\b`,
    'gi')
  for (const m of Array.from(text.matchAll(re))) {
    let day: number, month: number, year: number | null = null
    if (m[7]) { day = +m[7]; month = +m[8] - 1; year = +m[9] < 100 ? 2000 + +m[9] : +m[9] }
    else { day = +(m[2] ?? m[5]); month = monthOf(m[3] ?? m[4]); year = m[6] ? +m[6] : null }
    if (!(day >= 1 && day <= 31) || !(month >= 0 && month <= 11)) continue
    // "May" on its own is also a word; only a number next to it makes it a date, which the pattern needs.
    const weekday = m[1] ? dayOf(m[1]) : null
    const index = m.index ?? 0
    out.push({ day, month, year, weekday, text: m[0].trim(), index, deadline: isDeadline(text, index) })
  }
  return out
}

/** Is the date at `index` the date the files are due, rather than the date of the thing itself? */
function isDeadline(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 48), index)
  const sentence = before.split(/[.!?\n]/).pop() ?? ''
  // Only words about the files count: "Register by 10 October" is part of the message, not the deadline;
  // "We need an IG post and a story by 5 October" is about the files.
  if (/\bby\s*(?:on\s+|the\s+)?(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s*)?$/i.test(sentence) && /\b(need|want|send|deliver|ready|files?|drafts?|artwork|designs?|finals?|approval)\b/i.test(sentence)) return true
  return /\b(deadline|due(?: date)?|deliver(?:y|ed)?(?: by)?|needs? (?:it|them|this|these|everything|the (?:files|designs?|artwork|flyers?|posters?|work))?\s*(?:ready\s*)?by|needed by|no later than|send (?:it|them|the files|drafts?)(?: over)?(?: by)?|ready by|files by|drafts? by|approval by)\s*[:\-–]?\s*(?:on\s+|the\s+)?(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s*)?$/i.test(sentence)
}

/** The full date a written date most likely means: its own year, or the next time it comes round (a date up to 60 days ago counts as this year, so a date that has just passed is caught). */
export function resolveDate(d: Pick<BriefDate, 'day' | 'month' | 'year'>, today: Date): Date {
  if (d.year) return new Date(d.year, d.month, d.day)
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const cand = new Date(t0.getFullYear(), d.month, d.day)
  return cand.getTime() < t0.getTime() - 60 * 864e5 ? new Date(t0.getFullYear() + 1, d.month, d.day) : cand
}

const fmt = (d: Date, withYear = true) => `${d.getDate()} ${cap(MONTH_NAMES[d.getMonth()])}${withYear ? ' ' + d.getFullYear() : ''}`
const fmtDay = (d: Date) => `${cap(DAY_NAMES[d.getDay()])} ${fmt(d)}`

const PRICE_RE = /(?:₦|\bN(?=\d)|\bNGN\s?|£|\$|€|\bGHS\s?|\bKES\s?)\s?(\d[\d,]*(?:\.\d{2})?)(k)?\b|\b(\d[\d,]*)\s?(naira|pounds|dollars)\b/gi
const TIERS = /\b(regular|vip|vvip|early ?bird|table|couple|students?|adults?|child(?:ren)?|kids|single|double|gold|silver|platinum|standard|premium|general|gate|at the door|advance|per person|each|members?|non-members?|groups?)\b/i

const SIZE_UNITS: Record<string, number> = { mm: 1, cm: 10, in: 25.4, inch: 25.4, inches: 25.4, '"': 25.4, ft: 304.8, feet: 304.8 }
const PAPER: Record<string, [number, number]> = { A0: [841, 1189], A1: [594, 841], A2: [420, 594], A3: [297, 420], A4: [210, 297], A5: [148, 210], A6: [105, 148] }

/** Sizes named in the brief: pixel sizes ("1080x1350"), print sizes ("85 x 200 cm") and paper sizes ("A3 poster"). */
export function sizesIn(text: string, presets: { id: string; width: number; height: number; mm?: { w: number; h: number } }[] = []): BriefSize[] {
  const out: BriefSize[] = []
  const add = (s: BriefSize) => { if (!out.some(o => o.width === s.width && o.height === s.height)) out.push(s) }
  for (const m of Array.from(text.matchAll(/\b(\d{2,5}(?:\.\d+)?)\s?(?:x|×|by)\s?(\d{2,5}(?:\.\d+)?)\s?(px|pixels?|mm|cm|inch(?:es)?|"|ft|feet)?/gi))) {
    const a = +m[1], b = +m[2], unit = (m[3] ?? '').toLowerCase()
    if (!unit || unit.startsWith('px') || unit.startsWith('pixel')) {
      if (a < 16 || b < 16 || a > 20000 || b > 20000 || (!unit && (a < 100 || b < 100))) continue
      const p = presets.find(x => !x.mm && x.width === a && x.height === b)
      add({ label: `${a} × ${b}`, width: a, height: b, presetId: p?.id, quote: m[0].trim() })
    } else {
      const k = SIZE_UNITS[unit.replace(/\s/g, '')] ?? 1, w = Math.round(a * k * 10) / 10, h = Math.round(b * k * 10) / 10
      const p = presets.find(x => x.mm && Math.abs(x.mm.w - w) < 2 && Math.abs(x.mm.h - h) < 2)
      add({ label: `${m[1]} × ${m[2]} ${unit}`, width: Math.round((w / 25.4) * 300), height: Math.round((h / 25.4) * 300), mm: { w, h }, presetId: p?.id, quote: m[0].trim() })
    }
  }
  for (const m of Array.from(text.matchAll(/\b([Aa])([0-6])\b(\s+(?:poster|flyer|leaflet|handbill|size|paper|sheet|portrait|landscape))?/g))) {
    // "A3", or "a3 poster"; a lone lower-case "a1" is more often a word than a size.
    if (m[1] === 'a' && !m[3]) continue
    const [w, h] = PAPER['A' + m[2]]
    const p = presets.find(x => x.mm && Math.abs(x.mm.w - w) < 1 && Math.abs(x.mm.h - h) < 1)
    add({ label: `A${m[2]}`, width: Math.round((w / 25.4) * 300), height: Math.round((h / 25.4) * 300), mm: { w, h }, presetId: p?.id, quote: m[0].trim() })
  }
  return out
}

/** Formats a brief names by kind ("an IG post and a story"), as preset ids. */
export function formatsIn(brief: string): string[] {
  const t = brief.toLowerCase(), out: string[] = []
  const add = (id: string, re: RegExp) => { if (re.test(t) && !out.includes(id)) out.push(id) }
  add('ig-post', /\b(instagram|ig|feed post|social post|carousel)\b/)
  add('story', /\b(story|stories|reel|status)\b/)
  add('wa-status', /\bwhatsapp\b/)
  add('a4', /\b(a4|flyer|handbill)\b/)
  add('a3', /\b(a3|poster)\b/)
  add('rollup', /\b(roll ?-?up|pull ?-?up|standee)\b/)
  add('billboard-48', /\b(billboard|48 ?-?sheet|hoarding)\b/)
  add('yt', /\b(youtube|thumbnail)\b/)
  add('x-post', /\b(twitter|x post|tweet)\b/)
  add('li', /\blinkedin\b/)
  add('fb-cover', /\bfacebook\b/)
  add('email', /\b(email|newsletter|mailer)\b/)
  add('web', /\b(website|web banner|hero|landing)\b/)
  add('slide', /\b(slide|deck|presentation)\b/)
  add('card', /\b(business card|complimentary card)\b/)
  return out
}

const EVENT = /\b(event|night|party|concert|show|launch|service|conference|workshop|festival|wedding|meet-?up|seminar|gala|ceremony|summit|exhibition|fair|expo|dinner|brunch|class|webinar|tour|match|screening|open day|opening|harvest|crusade|convention|retreat|hangout|celebration|anniversary|birthday|graduation|tickets?|rsvp|doors open|live at|performing)\b/i

/**
 * What is worth asking the client before starting: details that are missing, and details that contradict
 * each other or the calendar. `today` is passed in so the same brief always gives the same answer in tests.
 */
export function briefCheck(fields: BriefFieldsLike, text: string, today: Date, o: { hasBrand?: boolean } = {}): BriefCheck {
  const t = text.trim()
  const issues: BriefIssue[] = []
  const dates = datesIn(t)
  const eventDates = dates.filter(d => !d.deadline)
  const deadlineDate = dates.find(d => d.deadline) ?? null
  const event = EVENT.test(t) || !!fields.time || !!fields.venue
  const sizes = sizesIn(t)
  if (t.length < 12) return { issues, sizes, dates, deadline: null, event }

  // Missing details.
  const miss = (id: string, question: string) => issues.push({ id, kind: 'missing', question })
  if (event && !eventDates.length && !fields.date) miss('date', 'What is the date of the event?')
  if (event && !fields.time) miss('time', 'What time does it start, and when does it end?')
  if (event && !fields.venue) miss('venue', 'Where is it happening? The venue name, and the address if it should be on the design.')
  if (!fields.cta) miss('cta', 'What should people do when they see it: buy tickets, book, call, visit, order?')
  if (!fields.contact) miss('contact', 'How should people reach you: a phone number, website, email or social handle?')
  if (!sizes.length && !formatsIn(t).length) miss('formats', 'Which formats and sizes do you need? For example an Instagram post (1080 × 1350), a story and an A3 poster.')
  if (!o.hasBrand && !/\blogos?\b|\bbrand(?:ing| kit| guide)?\b/i.test(t)) miss('logo', 'Should your logo be on it? Please send it as an SVG, or a PNG with a transparent background.')
  if (!deadlineDate && !/\b(deadline|asap|urgent|today|tomorrow|this week|next week|end of (?:the )?(?:day|week|month))\b/i.test(t)) miss('deadline', 'When do you need the final files?')

  // Two different dates for the thing itself. A range ("12 to 14 October") is one event.
  const distinct: BriefDate[] = []
  for (const d of eventDates) {
    const r = resolveDate(d, today)
    if (distinct.some(x => resolveDate(x, today).getTime() === r.getTime())) continue
    const prev = distinct[distinct.length - 1]
    const between = prev ? t.slice(prev.index + prev.text.length, d.index) : ''
    if (prev && /^\s*(?:-|–|to|till|until|through|and)\s*$/i.test(between)) continue
    distinct.push(d)
  }
  if (distinct.length > 1) {
    const [a, b] = distinct.map(d => resolveDate(d, today))
    issues.push({ id: 'dates', kind: 'conflict', question: `The brief gives two dates, ${fmtDay(a)} and ${fmtDay(b)}. Which one is the event?`, quote: `${distinct[0].text} … ${distinct[1].text}` })
  }

  // A weekday that does not match its date, and a date that has passed.
  for (const d of eventDates) {
    const r = resolveDate(d, today)
    if (d.weekday !== null && r.getDay() !== d.weekday) {
      issues.push({ id: 'weekday-' + d.index, kind: 'weekday', question: `The brief says ${cap(DAY_NAMES[d.weekday])} ${fmt(r, false)}, but ${fmt(r)} is a ${cap(DAY_NAMES[r.getDay()])}. Which is right, the day or the date?`, quote: d.text })
    }
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (r.getTime() < t0.getTime()) issues.push({ id: 'past-' + d.index, kind: 'past', question: `${fmt(r)} has already passed. Is the date right?`, quote: d.text })
  }

  // Files due after the thing they are for.
  if (deadlineDate && distinct.length) {
    const due = resolveDate(deadlineDate, today), when = resolveDate(distinct[0], today)
    if (due.getTime() > when.getTime()) issues.push({ id: 'deadline-after', kind: 'deadline', question: `The files are due on ${fmt(due)}, after the event on ${fmt(when)}. When do you need them?`, quote: deadlineDate.text })
  }

  // Two different prices with nothing to say they are different tickets.
  const prices = Array.from(t.matchAll(PRICE_RE)).map(m => ({ raw: m[0].trim(), value: parseFloat((m[1] ?? m[3]).replace(/,/g, '')) * (m[2] ? 1000 : 1), index: m.index ?? 0 }))
  const uniq = prices.filter((p, i) => prices.findIndex(q => q.value === p.value) === i)
  if (uniq.length > 1) {
    const near = (p: { index: number }) => TIERS.test(t.slice(Math.max(0, p.index - 30), p.index + 40))
    if (!uniq.every(near)) issues.push({ id: 'prices', kind: 'conflict', question: `The brief gives two prices, ${uniq[0].raw} and ${uniq[1].raw}. Which one goes on the design, or are they for different tickets?`, quote: `${uniq[0].raw} … ${uniq[1].raw}` })
  }

  return { issues, sizes, dates, deadline: deadlineDate ? resolveDate(deadlineDate, today) : null, event }
}

/** The questions as a short, plain email the designer can paste. */
export function questionsEmail(issues: BriefIssue[], o: { client?: string; job?: string } = {}): string {
  const hi = o.client ? `Hi ${o.client},` : 'Hi,'
  const about = o.job ? ` for ${o.job}` : ''
  const lines = issues.map((x, i) => `${i + 1}. ${x.question}`)
  return `${hi}\n\nThanks for the brief${about}. Before I start, a few quick questions:\n\n${lines.join('\n')}\n\nThanks!`
}
