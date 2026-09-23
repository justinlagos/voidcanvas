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
}
export type TokKey = { [K in keyof BrandTokens]: BrandTokens[K] extends Tok<unknown> ? K : never }[keyof BrandTokens]

const free = <T,>(value: T): Tok<T> => ({ value, locked: false })
const g = (family: string): FontRef => ({ family, source: 'google' })

export function initialTokens(): BrandTokens {
  return {
    name: '', tagline: '', brandColor: '#3d5afe', personality: 0, salt: 0,
    harmony: free('analogous'), secondary: free('#000000'), accent: free('#000000'), neutralTint: free(0.3),
    heading: free(g('Inter')), body: free(g('Inter')), mono: free(g('JetBrains Mono')),
    scaleRatio: free(1.25), baseSize: free(16),
    direction: free('editorial'), radius: free(8), spaceBase: free(8), gridCols: free(12),
    logoClear: free(0.5), logoMin: free(32),
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
  if (!t.direction.locked) out.direction = free(pick(s('direction'), ['editorial', 'graphic', 'systematic'] as ArtDirection[]))
  if (!t.radius.locked) out.radius = free(pick(s('radius'), personality === 'Playful' ? [12, 18, 999] : personality === 'Technical' || personality === 'Minimal' ? [0, 2, 4] : [4, 8, 12]))
  if (!t.spaceBase.locked) out.spaceBase = free(pick(s('space'), [4, 8]))
  if (!t.gridCols.locked) out.gridCols = free(pick(s('grid'), [12, 12, 6, 8]))
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
  logo: { clearSpace: number; minWidth: number }
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

const VOICE: Record<string, { tone: string; dos: string[]; donts: string[] }> = {
  Bold: { tone: 'Direct, confident, high-energy', dos: ['Make one strong claim per piece', 'Use active verbs', 'Let white space carry weight'], donts: ['Hedge or over-qualify', 'Stack adjectives', 'Bury the message in preamble'] },
  Refined: { tone: 'Measured, precise, quietly premium', dos: ['Choose one accent moment', 'Keep type generous and calm', 'Prefer restraint'], donts: ['Shout', 'Crowd the layout', 'Use more than two type sizes at once'] },
  Playful: { tone: 'Warm, quick, human', dos: ['Write like you talk', 'Use rounded shapes', 'Let colour do the smiling'], donts: ['Force humour', 'Trade clarity for cute', 'Overuse exclamation marks'] },
  Minimal: { tone: 'Clear, spare, functional', dos: ['Remove before adding', 'Trust the grid', 'Let one thing dominate'], donts: ['Decorate', 'Fill every corner', 'Mix more than three tones'] },
  Warm: { tone: 'Approachable, sincere, grounded', dos: ['Speak to one person', 'Use warm neutrals', 'Show real texture'], donts: ['Sound corporate', 'Over-polish', 'Hide behind jargon'] },
  Technical: { tone: 'Exact, credible, unfussy', dos: ['Lead with the fact', 'Use consistent units', 'Label clearly'], donts: ['Overclaim', 'Round away precision', 'Add mood over substance'] },
}
const PRINCIPLES: Record<ArtDirection, [string, string][]> = {
  editorial: [['Clarity first', 'Every layout says one thing clearly before it says anything else.'], ['Confident space', 'White space is a design choice. Let the work breathe.'], ['One accent', 'A single accent per view carries the eye. Never compete.']],
  graphic: [['Bold by default', 'Go large, go graphic. Timid is off-brand.'], ['System, not decoration', 'The grid does the work. Ornament earns its place or leaves.'], ['Human warmth', 'Sharp does not mean cold. Keep it people-first.']],
  systematic: [['Precise', 'Spacing, sizes and ratios are defined, not guessed.'], ['Consistent', 'The same rule everywhere beats a clever exception anywhere.'], ['Legible', 'If it cannot be read at a glance, it is not finished.']],
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
    logo: { clearSpace: t.logoClear.value, minWidth: t.logoMin.value },
    voice: VOICE[personality], principles: PRINCIPLES[t.direction.value].map(([title, body]) => ({ title, body })),
    ratios: [{ hex: roles[0].hex, pct: 60, name: 'Brand' }, { hex: surfaces.light, pct: 25, name: 'Surface' }, { hex: roles[2].hex, pct: 10, name: 'Accent' }, { hex: surfaces.dark, pct: 5, name: 'Dark' }],
    pairs, checks,
    accent: roles[2].hex,
    palette: roles.map(r => ({ name: r.name, hex: r.hex, tints: ([100, 300, 500, 700, 900] as RampStep[]).map(s => r.ramp[s]), onLight: r.ink === '#ffffff' })),
    neutrals: ([50, 200, 500, 800, 900] as RampStep[]).map(s => neutral[s]),
  }
}
export { RAMP_STEPS }
