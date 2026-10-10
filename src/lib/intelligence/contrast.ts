// Contrast intelligence for marks. WCAG ratios, judged the way a mark needs judging: every
// colour that carries a real share of the artwork has to hold up, not the average.

import { hexLum, type AssetProfile, type ColorCluster } from './asset'

export type Level = 'good' | 'check' | 'attention'
export const LEVEL_LABEL: Record<Level, string> = { good: 'Pass', check: 'Marginal', attention: 'Fails' }

export const contrastRatio = (a: string, b: string) => { const la = hexLum(a), lb = hexLum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05) }
export const contrastLum = (la: number, lb: number) => (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)

export interface MarkContrast { ratio: number; worst: ColorCluster; level: Level; need: number; why: string }

/**
 * Worst contrast among the colours that make up at least `minShare` of the mark. Fine detail
 * under that share is ignored: a hairline in a third colour does not fail the whole logo.
 * Text-like marks (wordmarks, lockups) are held to 4.5:1; symbols to 3:1 (WCAG non-text).
 */
/**
 * The colours of a mark that decide whether it reads on a background: those that meet it. A colour
 * enclosed by the mark (a dot inside a disc) never touches the background, so it does not count.
 */
export function markColours(p: Pick<AssetProfile, 'colors'>, minShare = 0.08): ColorCluster[] {
  const meets = p.colors.filter(c => c.edge >= minShare && c.share >= 0.03)
  const main = meets.length ? meets : p.colors.filter(c => c.share >= minShare)
  return main.length ? main : p.colors.slice(0, 1)
}

/**
 * The ratio a mark is held to. Wordmarks and lockups read like text: 4.5:1. So does fine line work, since a
 * ratio measured on a hairline overstates how well it reads. Solid symbols are non-text graphics: 3:1.
 */
export function markTarget(p: Pick<AssetProfile, 'kind'> & { minStroke?: number }): { need: number; textLike: boolean; label: string } {
  if (p.kind === 'wordmark' || p.kind === 'lockup') return { need: 4.5, textLike: true, label: 'the target for a wordmark' }
  if (p.minStroke != null && p.minStroke < 0.02) return { need: 4.5, textLike: true, label: 'the target for fine line work' }
  return { need: 3, textLike: false, label: 'the target for a symbol' }
}

export function markContrast(p: Pick<AssetProfile, 'colors' | 'kind'> & { minStroke?: number }, bg: string, minShare = 0.08): MarkContrast {
  const bl = hexLum(bg)
  const list = markColours(p, minShare)
  let worst = list[0], ratio = Infinity
  for (const c of list) { const r = contrastLum(c.luminance, bl); if (r < ratio) { ratio = r; worst = c } }
  const { need, textLike, label } = markTarget(p)
  const level: Level = ratio >= need ? 'good' : ratio >= (textLike ? 3 : 2.2) ? 'check' : 'attention'
  const part = list.length > 1 ? `the ${colourWord(worst)} part` : 'the mark'
  const why = level === 'good'
    ? `${cap(part)} holds at ${ratio.toFixed(1)}:1${list.length > 1 ? ', the lowest of its colours' : ''}.`
    : level === 'check'
      ? `${cap(part)} is ${ratio.toFixed(1)}:1 here, under ${need}:1, ${label}. Fine at large sizes, weak when small.`
      : `${cap(part)} drops to ${ratio.toFixed(1)}:1 on this colour and will disappear.`
  return { ratio, worst, level, need, why }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** A short colour word for a cluster, for sentences: "the dark blue part". */
export function colourWord(c: ColorCluster): string {
  const n = parseInt(c.hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), sat = max === 0 ? 0 : (max - min) / max
  if (c.luminance > 0.85 && sat < 0.1) return 'white'
  if (c.luminance < 0.03) return 'black'
  if (sat < 0.12) return c.luminance > 0.4 ? 'light grey' : 'dark grey'
  const h = hue(r, g, b)
  const name = h < 15 || h >= 345 ? 'red' : h < 40 ? 'orange' : h < 65 ? 'yellow' : h < 160 ? 'green' : h < 200 ? 'teal' : h < 255 ? 'blue' : h < 290 ? 'purple' : h < 345 ? 'pink' : 'red'
  return (c.luminance < 0.12 ? 'dark ' : c.luminance > 0.55 ? 'light ' : '') + name
}
function hue(r: number, g: number, b: number) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  if (!d) return 0
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60; return h
}

/** Contrast of a flat colour against a background, graded like a mark. */
export function flatContrast(hex: string, bg: string, textLike = false): MarkContrast {
  return markContrast({ colors: [{ hex, share: 1, edge: 1, luminance: hexLum(hex), chroma: 0 }], kind: textLike ? 'wordmark' : 'mark' }, bg)
}

// sRGB transfer for one channel: a luminance of a grey and its encoded value, both 0..1.
const encode = (l: number) => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055)
const decode = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))

/**
 * Luminance of a background under a black or white scrim at some opacity. Browsers and canvas blend in
 * encoded sRGB, not in linear light, so the blend is done there: 25% white over black is #404040
 * (luminance 0.05), not a luminance of 0.25.
 */
export function scrimLum(bgLum: number, color: '#000000' | '#ffffff' | string, opacity: number) {
  const over = color === '#ffffff' ? 1 : 0
  return decode(encode(bgLum) * (1 - opacity) + over * opacity)
}

/** The lowest overlay opacity (black or white scrim over `bg`) that brings a mark colour to `need`. Null when even 70% will not do. */
export function scrimFor(markLum: number, bgLum: number, need: number): { color: '#000000' | '#ffffff'; opacity: number } | null {
  // Push the background away from the mark: a dark mark wants a light scrim, a light mark a dark one.
  const color = markLum < 0.18 ? '#ffffff' : markLum > 0.5 ? '#000000' : markLum > bgLum ? '#000000' : '#ffffff'
  for (let a = 0.05; a <= 0.7001; a += 0.05) {
    if (contrastLum(markLum, scrimLum(bgLum, color, a)) >= need) return { color, opacity: +a.toFixed(2) }
  }
  return null
}
