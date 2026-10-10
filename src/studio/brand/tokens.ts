// The brand is a set of TOKENS. Each token is either locked (the designer set it) or
// free (generated from the seed). "New take" only regenerates free tokens, and each
// token draws from its own seeded stream so locking one never reshuffles the others.

import { RAMP_STEPS, bestInk, contrast, grade, hexToOklch, oklchToHex, ramp, nearestStep, type Grade, type Ramp, type RampStep } from './color'

export type ArtDirection = 'editorial' | 'graphic' | 'systematic'
export type Harmony = 'analogous' | 'complementary' | 'triadic' | 'split'
export interface FontRef { family: string; source: 'google' | 'local' }
export interface Tok<T> { value: T; locked: boolean }

export interface BrandTokens {
  name: string
  tagline: string
  brandColor: string
  personality: number
  salt: number
  /** Bumped by a Variation take: only layout tokens (direction, radius, spacing, grid) redraw from it. */
  layoutSalt?: number
  harmony: Tok<Harmony>
  secondary: Tok<string>
  accent: Tok<string>
  neutralTint: Tok<number>      // 0..1, how much brand hue leaks into greys
  heading: Tok<FontRef>
  body: Tok<FontRef>
  mono: Tok<FontRef>
  scaleRatio: Tok<number>
  baseSize: Tok<number>
  direction: Tok<ArtDirection>
  radius: Tok<number>
  spaceBase: Tok<number>
  gridCols: Tok<number>
  logoClear: Tok<number>        // clear space as a fraction of the mark height
  logoMin: Tok<number>          // minimum on-screen width in px
  logoMinPrint: Tok<number>     // minimum width in print, mm
}
export type TokKey = { [K in keyof BrandTokens]-?: NonNullable<BrandTokens[K]> extends Tok<unknown> ? K : never }[keyof BrandTokens]

const free = <T,>(value: T): Tok<T> => ({ value, locked: false })
const g = (family: string): FontRef => ({ family, source: 'google' })

export function initialTokens(): BrandTokens {
  return {
    name: '', tagline: '', brandColor: '#3d5afe', personality: 0, salt: 0,
    harmony: free('analogous'), secondary: free('#000000'), accent: free('#000000'), neutralTint: free(0.3),
    heading: free(g('Inter')), body: free(g('Inter')), mono: free(g('JetBrains Mono')),
    scaleRatio: free(1.25), baseSize: free(16),
    direction: free('editorial'), radius: free(8), spaceBase: free(8), gridCols: free(12),
    logoClear: free(0.5), logoMin: free(40), logoMinPrint: free(15),
  }
}

// ── seeded streams ──
function rng(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return () => { h += 0x6d2b79f5; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)]

export const HARMONIES: { id: Harmony; label: string; offs: [number, number] }[] = [
  { id: 'analogous', label: 'Analogous', offs: [30, -40] },
  { id: 'complementary', label: 'Complementary', offs: [180, 30] },
  { id: 'triadic', label: 'Triadic', offs: [120, 240] },
  { id: 'split', label: 'Split complement', offs: [150, 210] },
]
export const SCALES = [
  { ratio: 1.2, label: 'Minor third' }, { ratio: 1.25, label: 'Major third' }, { ratio: 1.333, label: 'Perfect fourth' },
  { ratio: 1.414, label: 'Aug. fourth' }, { ratio: 1.5, label: 'Perfect fifth' }, { ratio: 1.618, label: 'Golden ratio' },
] as const
export const scaleLabel = (r: number) => SCALES.find(s => Math.abs(s.ratio - r) < 0.002)?.label ?? `Custom ${r}`

export const PERSONALITIES = ['Bold', 'Refined', 'Playful', 'Minimal', 'Warm', 'Technical'] as const

// Pairings per personality. The generator picks within the personality, so "Refined" never lands on Anton.
const PAIRS: Record<string, [string, string][]> = {
  Bold: [['Archivo Black', 'DM Sans'], ['Bebas Neue', 'Inter'], ['Anton', 'Inter'], ['Space Grotesk', 'Inter']],
  Refined: [['DM Serif Display', 'DM Sans'], ['Playfair Display', 'Lora'], ['Fraunces', 'Inter'], ['Cormorant Garamond', 'Work Sans']],
  Playful: [['Fredoka', 'Nunito'], ['Anton', 'Poppins'], ['Bricolage Grotesque', 'DM Sans'], ['Space Grotesk', 'Nunito']],
  Minimal: [['Inter', 'Inter'], ['Space Grotesk', 'Inter'], ['Manrope', 'Manrope'], ['IBM Plex Sans', 'IBM Plex Sans']],
  Warm: [['Fraunces', 'DM Sans'], ['Lora', 'Source Sans 3'], ['Bricolage Grotesque', 'Nunito'], ['DM Serif Display', 'Work Sans']],
  Technical: [['IBM Plex Sans', 'IBM Plex Sans'], ['Space Grotesk', 'Inter'], ['Manrope', 'Inter'], ['Archivo', 'Inter']],
}
const MONOS = ['JetBrains Mono', 'IBM Plex Mono', 'DM Mono', 'Space Mono']
export const FONT_SUGGESTIONS = Array.from(new Set([...Object.values(PAIRS).flat(2), ...MONOS, 'Montserrat', 'Oswald', 'Syne', 'Instrument Serif', 'Libre Baskerville', 'EB Garamond', 'Outfit', 'Sora'])).sort()

/** Fill every free token from the seed. Locked tokens pass through untouched. */
export function resolve(t: BrandTokens): BrandTokens {
  const key = `${t.brandColor}|${t.name}|${t.personality}|${t.salt}`
  const s = (k: string) => rng(key + ':' + k)
  // Layout tokens also listen to the Variation take, so a variation changes composition and keeps the identity.
  const ls = (k: string) => rng(key + ':' + k + ':' + (t.layoutSalt ?? 0))
  const personality = PERSONALITIES[t.personality % PERSONALITIES.length]
  const [L0, C0, H0] = hexToOklch(t.brandColor)
  const out: BrandTokens = { ...t }

  if (!t.harmony.locked) out.harmony = free(pick(s('harmony'), HARMONIES).id)
  const h = HARMONIES.find(x => x.id === out.harmony.value)!
  const chroma = Math.max(0.06, C0)
  if (!t.secondary.locked) { const r = s('secondary'); out.secondary = free(oklchToHex([Math.min(0.62, Math.max(0.36, L0 + (r() - 0.5) * 0.2)), chroma * (0.7 + r() * 0.3), H0 + h.offs[0] + (r() - 0.5) * 12])) }
  if (!t.accent.locked) { const r = s('accent'); out.accent = free(oklchToHex([0.58 + r() * 0.12, Math.min(0.17, chroma * (0.85 + r() * 0.3)), H0 + h.offs[1] + (r() - 0.5) * 12])) }
  // Generated roles must carry a readable label. Darken or lighten until one ink reaches 4.5:1.
  for (const k of ['secondary', 'accent'] as const) if (!t[k].locked) out[k] = free(readable(out[k].value))
  if (!t.neutralTint.locked) out.neutralTint = free(Math.round((0.15 + s('neutral')() * 0.5) * 100) / 100)

  const pairs = PAIRS[personality]
  const pr = s('fonts'), pair = pick(pr, pairs)
  if (!t.heading.locked) out.heading = free(g(pair[0]))
  if (!t.body.locked) out.body = free(g(pair[1]))
  if (!t.mono.locked) out.mono = free(g(pick(s('mono'), MONOS)))

  const loud = personality === 'Bold' || personality === 'Playful'
  if (!t.scaleRatio.locked) out.scaleRatio = free(pick(s('scale'), loud ? [1.333, 1.414, 1.5, 1.618] : [1.2, 1.25, 1.333]))
  if (!t.baseSize.locked) out.baseSize = free(pick(s('base'), [16, 16, 17, 18]))
  if (!t.direction.locked) out.direction = free(pick(ls('direction'), ['editorial', 'graphic', 'systematic'] as ArtDirection[]))
  if (!t.radius.locked) out.radius = free(pick(ls('radius'), personality === 'Playful' ? [12, 18, 999] : personality === 'Technical' || personality === 'Minimal' ? [0, 2, 4] : [4, 8, 12]))
  if (!t.spaceBase.locked) out.spaceBase = free(pick(ls('space'), [4, 8]))
  if (!t.gridCols.locked) out.gridCols = free(pick(ls('grid'), [12, 12, 6, 8]))
  return out
}

function readable(hex: string) {
  let [L, C, H] = hexToOklch(hex)
  const passes = (h: string) => Math.max(contrast(h, '#ffffff'), contrast(h, '#141418')) >= 4.6
  let cur = hex
  for (let i = 0; i < 20 && !passes(cur); i++) { L += L > 0.62 ? 0.02 : -0.02; cur = oklchToHex([L, C, H]) }
  return cur
}

// ── derived system ──
export interface ColorRole { id: string; name: string; hex: string; ramp: Ramp; step: RampStep; ink: string; usage: string }
export interface TypeStep { label: string; px: number; rem: number; weight: number; lineHeight: number; tracking: number; family: 'heading' | 'body' }
export interface ContrastPair { fg: string; fgName: string; bg: string; bgName: string; ratio: number; grade: Grade; use: string; need: number }
export interface Check { ok: boolean; text: string }

export interface Brand {
  name: string; tagline: string; personality: string; direction: ArtDirection
  roles: ColorRole[]           // brand, secondary, accent
  neutral: Ramp
  semantic: ColorRole[]        // success, warning, error
  surfaces: { light: string; dark: string; inkOnLight: string; inkOnDark: string }
  fonts: { heading: FontRef; body: FontRef; mono: FontRef; pairing: string }
  ratio: number; ratioLabel: string; baseSize: number
  scale: TypeStep[]
  spacing: number[]; radius: number
  grid: { cols: number; gutter: number; margin: number }
  logo: { clearSpace: number; minWidth: number; minPrint: number; sources: { clearSpace: 'suggested' | 'designer'; minWidth: 'suggested' | 'designer'; minPrint: 'suggested' | 'designer' } }
  voice: { tone: string; dos: string[]; donts: string[] }
  principles: { title: string; body: string }[]
  ratios: { hex: string; pct: number; name: string }[]
  pairs: ContrastPair[]
  checks: Check[]
  // Shorthands the page renderer leans on.
  accent: string
  palette: { name: string; hex: string; tints: string[]; onLight: boolean }[]
  neutrals: string[]
}

// Voice and principles. Each personality has a bank; a brand draws its own lines from it by its name, so two
// brands with the same personality rarely share a page of copy. Principles follow the same personality as
// the voice, so the two pages never disagree, and every voice line is about words, not layout.
const VOICE: Record<string, { tone: string[]; dos: string[]; donts: string[] }> = {
  Bold: { tone: ['Direct, confident, energetic', 'Plain, loud, certain', 'Bold, clear, active', 'Sharp, upbeat, decisive', 'Strong, simple, quick'], dos: ['Make one clear claim per piece', 'Use active verbs', 'Put the point in the first line', 'Use numbers when you have them', 'Keep headlines under eight words', 'Say who it is for', 'Use the words readers use', 'End with what to do next'], donts: ['Hedge or over-qualify', 'Stack adjectives', 'Open with preamble', 'Use three words where one will do', 'Bury the call to action', 'Use vague superlatives', 'Write in the passive', 'Add a second message'] },
  Refined: { tone: ['Measured, precise, quietly premium', 'Calm, exact, assured', 'Quiet, exact, considered', 'Composed, careful, understated', 'Polished, spare, sure'], dos: ['Use fewer, exact words', 'Write full, calm sentences', 'Let facts show the quality', 'Name materials and methods', 'Leave the reader room to decide', 'Use precise numbers', 'Prefer nouns to adjectives', 'Write as you would speak to a client'], donts: ['Use exclamation marks', 'Reach for superlatives', 'Pad with filler', 'Use slang', 'Rush to the sale', 'Use trend words', 'Write in capitals', 'Over-explain'] },
  Playful: { tone: ['Warm, quick, human', 'Light, friendly, curious', 'Bright, warm, easy', 'Cheerful, chatty, quick', 'Open, funny, kind'], dos: ['Write like you talk', 'Keep sentences short', 'Use everyday words', 'Ask the reader questions', 'Use contractions', 'Say it the way a friend would', 'Keep paragraphs short', 'Mark small wins'], donts: ['Force a joke', 'Trade clarity for cute', 'Overuse exclamation marks', 'Talk down to people', 'Use in-jokes', 'Use corporate words', 'Shout in capitals', 'Make the reader work to get it'] },
  Minimal: { tone: ['Clear, spare, functional', 'Short, plain, exact', 'Brief, neutral, clear', 'Exact, quiet, useful', 'Lean, direct, calm'], dos: ['Cut every word you can', 'One idea per sentence', 'Use plain labels', 'Write in the present tense', 'Prefer lists to paragraphs', 'Write amounts as numbers', 'Name things the same way each time', 'Put the action in the label'], donts: ['Decorate with adjectives', 'Repeat what the design already shows', 'Use jargon', 'Write long introductions', 'Use capitals for emphasis', 'Use filler words', 'Explain the obvious', 'Use exclamation marks'] },
  Warm: { tone: ['Approachable, sincere, grounded', 'Kind, steady, open', 'Friendly, honest, calm', 'Gentle, clear, personal', 'Welcoming, plain, warm'], dos: ['Speak to one person', 'Use the words customers use', 'Say thank you plainly', 'Explain why', 'Use first names', 'Use we and you', 'Tell short, true stories', 'Say when you do not know'], donts: ['Sound corporate', 'Over-polish', 'Hide behind jargon', 'Promise what you cannot keep', 'Use the passive to dodge blame', 'Use legal language in everyday writing', 'Sound scripted', 'Rush the reader'] },
  Technical: { tone: ['Exact, credible, unfussy', 'Clear, factual, confident', 'Precise, sober, direct', 'Rigorous, plain, specific', 'Careful, exact, measured'], dos: ['Lead with the fact', 'Use consistent units', 'Label clearly', 'Cite the source', 'Define a term the first time', 'Give the method', 'Date the data', 'Use the same names as the product'], donts: ['Overclaim', 'Round away precision', 'Put mood before facts', 'Use undefined acronyms', 'Hide limits in footnotes', 'Use vague words like fast or easy', 'Mix units', 'Bury the number'] },
}
const PRINCIPLES: Record<string, [string, string][]> = {
  Bold: [['Big and clear', 'One message per piece, set large enough to read from across a room.'], ['Strong contrast', 'Type and colour sit on grounds with high contrast. Pale on pale is not used.'], ['Few elements', 'Anything that does not help the message comes out.'], ['Colour first', 'The brand colour leads every layout and covers more of the page than any other.'], ['Short headlines', 'Headlines are a few words long and set in the heading face.'], ['Same place', 'The logo sits in the same corner on every format.'], ['One focal point', 'Each layout has one thing that is clearly the biggest.'], ['Solid colour', 'Large flat areas of the brand colour, not tints or gradients.'], ['Tight crops', 'Images are cropped close to the subject.']],
  Refined: [['Restraint', 'One accent colour per view, and generous space around everything.'], ['Precision', 'Sizes, spacing and alignment follow the system exactly.'], ['Detail', 'Type, images and finishes are checked at full size before anything is released.'], ['Calm pages', 'Each page has one focal point and plenty of empty space.'], ['Fixed scale', 'Two typefaces and a fixed set of sizes. Nothing in between.'], ['Measured colour', 'The palette is used in the proportions shown, with neutrals doing most of the work.'], ['Quiet contrast', 'Contrast comes from size and space before colour.'], ['Fine lines', 'Rules are thin, corners are small, and nothing is outlined twice.'], ['Fewer pieces', 'Fewer pieces, each given more room.']],
  Playful: [['Human first', 'Write and design for one person, in everyday words.'], ['Colour with a job', 'The whole palette is used, and each colour has a purpose.'], ['Clear before clever', 'A joke never gets in the way of the message.'], ['Room to move', 'Shapes and images can tilt and overlap, but text stays straight and readable.'], ['Big headlines', 'Headlines are set large; body text stays plain.'], ['Real moments', 'Photos show people doing things, not posing.'], ['Bright and simple', 'Bright colours on simple shapes, never more than three at once.'], ['Round corners', 'Shapes, buttons and images have rounded corners.'], ['One surprise', 'One unexpected detail per piece, no more.']],
  Minimal: [['Nothing extra', 'Remove anything that does not carry information.'], ['On the grid', 'Every element sits on the grid, on every layout.'], ['Legible', 'If it cannot be read at a glance, it is not finished.'], ['One colour', 'Each view uses the brand colour once, on neutrals.'], ['Quiet type', 'One typeface for headings and one for text, in two or three sizes.'], ['Space first', 'Space separates content. Rules and boxes are used only when space cannot do it.'], ['Neutral ground', 'Neutrals carry the page; colour marks what matters.'], ['Few sizes', 'Three type sizes cover almost everything.'], ['Clear order', 'Size and weight show what to read first.']],
  Warm: [['Approachable', 'Plain words, warm colours and real people.'], ['Consistent', 'The same logo, colours and type every time, so people know it is us.'], ['Honest', 'Photos and claims show things as they are.'], ['Room to breathe', 'Layouts leave space around text and images, so nothing feels crowded.'], ['Natural light', 'Photos are taken in daylight and keep their natural colour.'], ['One small touch', 'A texture or a hand-drawn detail is used once per piece, not everywhere.'], ['Real places', 'Photos are taken where the work happens, with the people who do it.'], ['Soft edges', 'Rounded corners and gentle tones; no hard black.'], ['Easy to reach', 'Every piece says how to get in touch.']],
  Technical: [['Accurate', 'Numbers, units and names are checked and written the same way everywhere.'], ['Structured', 'Information comes in a fixed order: headline, fact, detail.'], ['Legible', 'Data and small text stay readable at the smallest size used.'], ['Evidence', 'Every claim points to a figure, a test or a source.'], ['Labelled', 'Charts, tables and diagrams always have a title and units.'], ['Neutral ground', 'Neutrals carry most pages; the brand colour marks what matters.'], ['Consistent colour', 'Colour codes data the same way in every chart.'], ['Readable tables', 'Numbers are right-aligned and set in the mono face.'], ['Versioned', 'Every document shows its date and version.']],
}

/** A stable choice of `n` lines from a bank, by the brand's name, kept in the bank's order. */
function pickLines<T>(list: readonly T[], n: number, key: string): T[] {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) }
  // mulberry32 from the name's hash: a well-mixed sequence, so similar names do not get the same lines.
  const next = () => { h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const idx = list.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]] }
  return idx.slice(0, n).sort((a, b) => a - b).map(i => list[i])
}
const STEPS: [string, number][] = [['Display', 5], ['H1', 4], ['H2', 3], ['H3', 2], ['H4', 1], ['Body', 0], ['Small', -1], ['Caption', -2]]

export function typeScale(ratio: number, base: number): TypeStep[] {
  return STEPS.map(([label, n]) => {
    // Small steps are floored so steep scales never produce unreadable captions.
    const px = Math.max(n === -1 ? 13 : n === -2 ? 12 : 0, Math.round(base * Math.pow(ratio, n)))
    const lineHeight = px >= 48 ? 1.05 : px >= 32 ? 1.15 : px >= 22 ? 1.25 : px >= 15 ? 1.5 : 1.4
    const tracking = px >= 48 ? -0.025 : px >= 32 ? -0.015 : px >= 22 ? -0.005 : px < 14 ? 0.01 : 0
    return { label, px, rem: +(px / 16).toFixed(3), weight: n >= 3 ? 700 : n >= 1 ? 600 : 400, lineHeight, tracking, family: n >= 1 ? 'heading' : 'body' }
  })
}

export function buildBrand(raw: BrandTokens): Brand {
  const t = resolve(raw)
  const personality = PERSONALITIES[t.personality % PERSONALITIES.length]
  const [, , H0] = hexToOklch(t.brandColor)

  const neutralSeed = oklchToHex([0.6, 0.004 + t.neutralTint.value * 0.03, H0])
  const neutral = ramp(neutralSeed)
  const surfaces = { light: neutral[50], dark: neutral[900], inkOnLight: oklchToHex([0.2, 0.004 + t.neutralTint.value * 0.02, H0]), inkOnDark: '#ffffff' }
  const ink = (bg: string) => bestInk(bg, surfaces.inkOnDark, surfaces.inkOnLight)
  const role = (id: string, name: string, hex: string, usage: string): ColorRole => ({ id, name, hex, ramp: ramp(hex), step: nearestStep(hex), ink: ink(hex), usage })

  const roles = [
    role('brand', 'Brand', t.brandColor, 'Logo, key surfaces, primary moments'),
    role('secondary', 'Secondary', t.secondary.value, 'Supporting blocks, illustration, charts'),
    role('accent', 'Accent', t.accent.value, 'Calls to action and highlights. One per view.'),
  ]
  const sem = (id: string, name: string, h: number, usage: string) => role(id, name, oklchToHex([0.6, 0.16, h]), usage)
  const semantic = [sem('success', 'Success', 150, 'Confirmations'), sem('warning', 'Warning', 75, 'Needs attention'), sem('error', 'Error', 27, 'Failures and destructive actions')]

  const scale = typeScale(t.scaleRatio.value, t.baseSize.value)
  const sb = t.spaceBase.value
  const grid = { cols: t.gridCols.value, gutter: sb * 3, margin: 80 }

  // Contrast pairs the guideline actually recommends.
  const P = (fg: string, fgName: string, bg: string, bgName: string, use: string, need = 4.5): ContrastPair => { const r = contrast(fg, bg); return { fg, fgName, bg, bgName, ratio: r, grade: grade(r), use, need } }
  const pairs: ContrastPair[] = [
    P(surfaces.inkOnLight, 'Ink', surfaces.light, 'Surface light', 'Body text'),
    P(surfaces.inkOnDark, 'White', surfaces.dark, 'Surface dark', 'Body text'),
    P(roles[0].ink, roles[0].ink === '#ffffff' ? 'White' : 'Ink', roles[0].hex, 'Brand', 'Text on brand'),
    P(roles[2].ink, roles[2].ink === '#ffffff' ? 'White' : 'Ink', roles[2].hex, 'Accent', 'Button label'),
    P(roles[1].ink, roles[1].ink === '#ffffff' ? 'White' : 'Ink', roles[1].hex, 'Secondary', 'Text on secondary'),
    P(roles[0].hex, 'Brand', surfaces.light, 'Surface light', 'Brand as text or icon', 3),
    P(roles[2].hex, 'Accent', surfaces.light, 'Surface light', 'Accent links', 4.5),
    P(neutral[600], 'Neutral 600', surfaces.light, 'Surface light', 'Secondary text'),
    P(roles[0].ramp[700], 'Brand 700', roles[0].ramp[50], 'Brand 50', 'Tinted panels'),
  ]

  const checks: Check[] = []
  pairs.forEach(p => checks.push({ ok: p.ratio >= p.need, text: `${p.use}: ${p.fgName} on ${p.bgName} is ${p.ratio.toFixed(2)}:1${p.ratio >= p.need ? '' : `, needs ${p.need}:1`}` }))
  const body = scale.find(s => s.label === 'Body')!
  checks.push({ ok: body.px >= 16, text: `Body size ${body.px}px${body.px >= 16 ? '' : ', under 16px is hard to read on screen'}` })
  checks.push({ ok: contrast(roles[0].hex, roles[2].hex) >= 1.5 || Math.abs(hexToOklch(roles[0].hex)[2] - hexToOklch(roles[2].hex)[2]) > 25, text: 'Accent reads as distinct from brand' })

  const pairing = t.heading.value.family === t.body.value.family
    ? `${t.heading.value.family} throughout, hierarchy carried by weight and size`
    : `${t.heading.value.family} for headings over ${t.body.value.family} for reading`

  return {
    name: t.name || 'Your brand', tagline: t.tagline, personality, direction: t.direction.value,
    roles, neutral, semantic, surfaces,
    fonts: { heading: t.heading.value, body: t.body.value, mono: t.mono.value, pairing },
    ratio: t.scaleRatio.value, ratioLabel: scaleLabel(t.scaleRatio.value), baseSize: t.baseSize.value, scale,
    spacing: [1, 2, 3, 4, 6, 8, 12, 16].map(n => n * sb), radius: t.radius.value, grid,
    logo: { clearSpace: t.logoClear.value, minWidth: t.logoMin.value, minPrint: t.logoMinPrint.value, sources: { clearSpace: t.logoClear.locked ? 'designer' : 'suggested', minWidth: t.logoMin.locked ? 'designer' : 'suggested', minPrint: t.logoMinPrint.locked ? 'designer' : 'suggested' } },
    voice: { tone: pickLines(VOICE[personality].tone, 1, t.name + ':tone')[0], dos: pickLines(VOICE[personality].dos, 3, t.name + ':do'), donts: pickLines(VOICE[personality].donts, 3, t.name + ':dont') }, principles: pickLines(PRINCIPLES[personality], 3, t.name + ':principles').map(([title, body]) => ({ title, body })),
    ratios: [{ hex: roles[0].hex, pct: 60, name: 'Brand' }, { hex: surfaces.light, pct: 25, name: 'Surface' }, { hex: roles[2].hex, pct: 10, name: 'Accent' }, { hex: surfaces.dark, pct: 5, name: 'Dark' }],
    pairs, checks,
    accent: roles[2].hex,
    palette: roles.map(r => ({ name: r.name, hex: r.hex, tints: ([100, 300, 500, 700, 900] as RampStep[]).map(s => r.ramp[s]), onLight: r.ink === '#ffffff' })),
    neutrals: ([50, 200, 500, 800, 900] as RampStep[]).map(s => neutral[s]),
  }
}
export { RAMP_STEPS }
