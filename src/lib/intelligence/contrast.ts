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
export function markContrast(p: Pick<AssetProfile, 'colors' | 'kind'>, bg: string, minShare = 0.08): MarkContrast {
  const bl = hexLum(bg)
  // Only colours that meet the background count. A colour enclosed by the mark (a dot inside a disc) never touches it.
  const meets = p.colors.filter(c => c.edge >= minShare && c.share >= 0.03)
  const main = meets.length ? meets : p.colors.filter(c => c.share >= minShare)
  const list = main.length ? main : p.colors.slice(0, 1)
  let worst = list[0], ratio = Infinity
  for (const c of list) { const r = contrastLum(c.luminance, bl); if (r < ratio) { ratio = r; worst = c } }
  const textLike = p.kind === 'wordmark' || p.kind === 'lockup'
  const need = textLike ? 4.5 : 3
  const level: Level = ratio >= need ? 'good' : ratio >= (textLike ? 3 : 2.2) ? 'check' : 'attention'
  const part = list.length > 1 ? `the ${colourWord(worst)} part` : 'the mark'
  const why = level === 'good'
    ? `${cap(part)} holds at ${ratio.toFixed(1)}:1${list.length > 1 ? ', the lowest of its colours' : ''}.`
    : level === 'check'
      ? `${cap(part)} is ${ratio.toFixed(1)}:1 here, under the ${need}:1 ${textLike ? 'text' : 'non-text'} target. Fine at large sizes, weak when small.`
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

/** The lowest overlay opacity (black or white scrim over `bg`) that brings a mark colour to `need`. Null when even 70% will not do. */
export function scrimFor(markLum: number, bgLum: number, need: number): { color: '#000000' | '#ffffff'; opacity: number } | null {
  // Push the background away from the mark: a dark mark wants a light scrim, a light mark a dark one.
  const overlayLum = markLum < 0.18 ? 1 : markLum > 0.5 ? 0 : markLum > bgLum ? 0 : 1
  for (let a = 0.05; a <= 0.7001; a += 0.05) {
    const l = bgLum * (1 - a) + overlayLum * a
    if (contrastLum(markLum, l) >= need) return { color: overlayLum ? '#ffffff' : '#000000', opacity: +a.toFixed(2) }
  }
  return null
}
