// Generative brand guideline. Given a name, a seed colour and a logo, it derives a full
// system (palette with tints, accessible text pairings, type scale, spacing, voice) and
// picks a layout personality from a seeded RNG, so no two guidelines come out identical.

export interface BrandInput { name: string; tagline?: string; seed: string; personality: number; industry?: string; logo?: Blob | null }

export type ArtDirection = 'editorial' | 'graphic' | 'systematic'

export interface Brand {
  name: string; tagline: string
  direction: ArtDirection
  ratios: { hex: string; pct: number }[]
  palette: { name: string; hex: string; tints: string[]; onLight: boolean }[]
  neutrals: string[]
  fonts: { heading: string; body: string; pairing: string }
  scale: { label: string; px: number; weight: number }[]
  spacing: number[]
  radius: number
  voice: { tone: string; words: string[]; dos: string[]; donts: string[] }
  logo: { clearSpace: number; minWidth: number }
  personality: string
  accent: string
  grid: { cols: number; gutter: number; margin: number }
  principles: { title: string; body: string }[]
}

// ── seeded RNG so a given seed always rebuilds the same brand ──
function rng(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return () => { h += 0x6d2b79f5; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

// ── colour maths ──
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(h / 6) * 360, s, l]
}
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360; s = Math.min(1, Math.max(0, s)); l = Math.min(1, Math.max(0, l))
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')
}
function lum(hex: string) {
  const c = [1, 3, 5].map(i => { const v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export const onLight = (hex: string) => lum(hex) < 0.45
const tints = (h: number, s: number, l: number) => [0.94, 0.82, 0.64, l, Math.max(0.12, l - 0.22)].map(t => hslToHex(h, s * (t > l ? 0.7 : 1), t))

// Harmony strategies, chosen by personality, so palettes differ in structure not just hue.
const HARMONIES = [
  { id: 'analogous', offs: [0, 30, -30, 60] },
  { id: 'complementary', offs: [0, 180, 30, 210] },
  { id: 'triadic', offs: [0, 120, 240, 60] },
  { id: 'split', offs: [0, 150, 210, 30] },
]
const NAMES = ['Primary', 'Secondary', 'Accent', 'Highlight']

const FONT_SETS = [
  { heading: 'Space Grotesk', body: 'Inter', pairing: 'Geometric and neutral: modern, confident, tech-leaning' },
  { heading: 'Fraunces', body: 'Inter', pairing: 'Characterful serif over a clean sans: editorial with warmth' },
  { heading: 'Archivo Black', body: 'DM Sans', pairing: 'Heavy display over a soft sans: bold and friendly' },
  { heading: 'Playfair Display', body: 'Lora', pairing: 'Serif on serif: classic, premium, considered' },
  { heading: 'Bebas Neue', body: 'Inter', pairing: 'Tall condensed caps over a workhorse sans: loud and direct' },
  { heading: 'DM Serif Display', body: 'DM Sans', pairing: 'Elegant serif with a matched sans: refined and calm' },
  { heading: 'Anton', body: 'Poppins', pairing: 'Impact display over a rounded sans: energetic, youthful' },
]
const PERSONALITIES = ['Bold', 'Refined', 'Playful', 'Minimal', 'Warm', 'Technical']
const VOICE: Record<string, { tone: string; words: string[]; dos: string[]; donts: string[] }> = {
  Bold: { tone: 'Direct, confident, high-energy', words: ['Say it plainly', 'Lead with the point', 'Short sentences'], dos: ['Make one strong claim per piece', 'Use active verbs', 'Let whitespace carry weight'], donts: ['Hedge or over-qualify', 'Stack adjectives', 'Bury the message in preamble'] },
  Refined: { tone: 'Measured, precise, quietly premium', words: ['Considered', 'Understated', 'Exact'], dos: ['Choose one accent moment', 'Keep type generous and calm', 'Prefer restraint'], donts: ['Shout', 'Crowd the layout', 'Use more than two type sizes at once'] },
  Playful: { tone: 'Warm, quick-witted, human', words: ['Friendly', 'Light', 'A wink, not a joke'], dos: ['Write like you talk', 'Use rounded shapes', 'Let colour do the smiling'], donts: ['Force humour', 'Be cute at the cost of clarity', 'Overuse exclamation marks'] },
  Minimal: { tone: 'Clear, spare, functional', words: ['Only what is needed', 'Plain', 'Quiet'], dos: ['Remove before adding', 'Trust the grid', 'Let one thing dominate'], donts: ['Decorate', 'Fill every corner', 'Mix more than three tones'] },
  Warm: { tone: 'Approachable, sincere, grounded', words: ['Human', 'Honest', 'Close'], dos: ['Speak to one person', 'Use warm neutrals', 'Show real texture'], donts: ['Sound corporate', 'Over-polish', 'Hide behind jargon'] },
  Technical: { tone: 'Exact, credible, unfussy', words: ['Specific', 'Evidenced', 'Structured'], dos: ['Lead with the fact', 'Use consistent units', 'Label clearly'], donts: ['Overclaim', 'Round away precision', 'Add mood over substance'] },
}

export const b = <T,>(a: T[]) => a

export function generateBrand(input: BrandInput): Brand {
  const r = rng(input.seed + input.name + input.personality)
  const [h0, s0, l0] = hexToHsl(input.seed)
  const harmony = HARMONIES[Math.floor(r() * HARMONIES.length)]
  const satBase = Math.min(0.9, Math.max(0.45, s0 * (0.8 + r() * 0.5)))
  const palette = harmony.offs.map((off, i) => {
    const h = h0 + off + (r() - 0.5) * 10
    const l = i === 0 ? Math.min(0.55, Math.max(0.32, l0)) : 0.4 + r() * 0.25
    const s = i === 2 || i === 3 ? Math.min(0.95, satBase + 0.1) : satBase
    const hex = hslToHex(h, s, l)
    return { name: NAMES[i], hex, tints: tints(h, s, l), onLight: onLight(hex) }
  })
  const neutralHue = h0
  const neutrals = [0.97, 0.9, 0.6, 0.28, 0.12].map(t => hslToHex(neutralHue, 0.06 + r() * 0.05, t))
  const personality = PERSONALITIES[input.personality % PERSONALITIES.length]
  const fonts = FONT_SETS[Math.floor(r() * FONT_SETS.length)]

  const ratio = [1.2, 1.25, 1.333, 1.414][Math.floor(r() * 4)]
  const bodyPx = 16
  const steps = [['Display', 4], ['H1', 3], ['H2', 2], ['H3', 1], ['Body', 0], ['Small', -1]] as const
  const scale = steps.map(([label, step]) => ({ label, px: Math.round(bodyPx * Math.pow(ratio, step)), weight: step >= 2 ? 700 : step >= 1 ? 600 : 400 }))

  const spaceBase = [4, 8][Math.floor(r() * 2)]
  const spacing = [1, 2, 3, 5, 8].map(n => spaceBase * n)
  const radius = [0, 4, 10, 18][Math.floor(r() * 4)]
  const voice = VOICE[personality]

  const direction: ArtDirection = (['editorial', 'graphic', 'systematic'] as ArtDirection[])[Math.floor(r() * 3)]
  const ratios = [
    { hex: palette[0].hex, pct: 60 }, { hex: neutrals[0], pct: 25 }, { hex: palette[2]?.hex ?? palette[1].hex, pct: 10 }, { hex: neutrals[4], pct: 5 },
  ]
  const grid = { cols: [12, 12, 6, 8][Math.floor(r() * 4)], gutter: spaceBase * (r() > 0.5 ? 3 : 2), margin: [64, 80, 96][Math.floor(r() * 3)] }
  const PRIN: [string, string][][] = [
    [['Clarity first', 'Every layout should say one thing clearly before it says anything else.'], ['Confident space', 'White space is a design choice. Let the work breathe.'], ['One accent', 'A single accent colour per view carries the eye. Never compete.']],
    [['Bold by default', 'Go large, go graphic. Timid is off-brand.'], ['System, not decoration', 'The grid does the work. Ornament earns its place or leaves.'], ['Human warmth', 'Sharp does not mean cold. Keep it people-first.']],
    [['Precise', 'Specifics over vibes. Spacing, sizes and ratios are defined, not guessed.'], ['Consistent', 'The same rule everywhere beats a clever exception anywhere.'], ['Legible', 'If it cannot be read at a glance, it is not finished.']],
  ]
  const principles = PRIN[['editorial', 'graphic', 'systematic'].indexOf(direction)].map(([title, body]) => ({ title, body }))
  return {
    name: input.name || 'Your brand', tagline: input.tagline || '',
    direction, ratios, grid, principles,
    palette, neutrals, fonts, scale, spacing, radius, voice,
    logo: { clearSpace: 1 + Math.round(r()), minWidth: [24, 32, 40][Math.floor(r() * 3)] },
    personality, accent: palette[2]?.hex ?? palette[0].hex,
  }
}
