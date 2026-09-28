// Logo variants, derived from the original artwork only where the result is honest.
//
// A knockout (every pixel one colour, alpha kept) is a real reversed or mono logo when the
// mark is one colour already, or when its colours only meet the background. When the meaning
// lives in boundaries between colours (a dot inside a disc, a two-tone wordmark), a flat
// knockout melts it into a blob, so it is refused with a reason. Greyscale keeps boundaries
// and is always offered. The original file is never altered.

import { hexLum, rgbHex, type AssetProfile, type ColorCluster } from './asset'
import { colourWord } from './contrast'

export type VariantId = 'primary' | 'reversed' | 'mono-dark' | 'mono-brand' | 'grayscale'
export const VARIANT_LABEL: Record<VariantId, string> = { primary: 'Primary', reversed: 'Reversed', 'mono-dark': 'Mono dark', 'mono-brand': 'One colour', grayscale: 'Greyscale' }
export const VARIANT_USE: Record<VariantId, string> = {
  primary: 'Full colour, the default wherever it clears the background',
  reversed: 'White, for dark backgrounds and photography',
  'mono-dark': 'One dark colour, for light backgrounds where full colour fails, faxes and stamps',
  'mono-brand': 'Brand colour only, for tinted surfaces',
  grayscale: 'Tonal, for newsprint and single-ink print',
}

export interface VariantPlan { id: VariantId; valid: boolean; reason: string; fill?: string; derived: boolean }

/** Which variants can honestly be made from this artwork, and why not otherwise. */
export function planVariants(p: AssetProfile, ink = '#111111', brand?: string | null): VariantPlan[] {
  const main = p.colors.filter(c => c.share >= 0.05)
  const knockoutOk = p.mono || p.internalEdges < 0.12
  const named = (hex: string) => { const c = p.colors.find(x => x.hex === hex); return c ? colourWord(c) : 'a colour' }
  const pair = p.boundary ? `${named(p.boundary[0])} and ${named(p.boundary[1])}` : main.length >= 2 ? `${colourWord(main[0])} and ${colourWord(main[1])}` : 'its colours'
  const refuse = `A flat one-colour version would lose the detail between ${pair}. Ask for the client's reversed artwork, or keep full colour on a holding shape.`
  const isWhite = p.mono && p.tone === 'light' && !p.chromatic
  const plans: VariantPlan[] = [{ id: 'primary', valid: true, reason: isWhite ? 'The file is white already: it is the reversed version. Add the full-colour artwork if there is one.' : 'As supplied.', derived: false }]
  plans.push({ id: 'reversed', valid: knockoutOk, reason: knockoutOk ? (isWhite ? 'Same as the file.' : 'Safe: the mark reads as a silhouette.') : refuse, fill: '#ffffff', derived: !isWhite })
  plans.push({ id: 'mono-dark', valid: knockoutOk, reason: knockoutOk ? 'Safe: the mark reads as a silhouette.' : refuse, fill: ink, derived: true })
  if (brand && brand.toLowerCase() !== ink.toLowerCase()) plans.push({ id: 'mono-brand', valid: knockoutOk, reason: knockoutOk ? 'Safe: the mark reads as a silhouette.' : refuse, fill: brand, derived: true })
  // Greyscale: refuse only when two main colours land on the same grey.
  // Compare in gamma space, where grey values are seen: under about 23 levels apart is one grey to the eye.
  const greys = main.map(c => toGamma(c.luminance))
  let clash: [ColorCluster, ColorCluster] | null = null
  for (let i = 0; i < main.length && !clash; i++) for (let j = i + 1; j < main.length; j++) if (Math.abs(greys[i] - greys[j]) < 0.09) { clash = [main[i], main[j]]; break }
  const chromaticMulti = p.chromatic && !p.mono
  if (chromaticMulti) plans.push({ id: 'grayscale', valid: !clash, reason: clash ? `${cap(colourWord(clash[0]))} and ${colourWord(clash[1])} become the same grey, so the mark loses its shape.` : 'Keeps every boundary as a tone.', derived: true })
  return plans
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)

/** Recolour every pixel, keeping alpha. */
export function knockoutPixels(src: Uint8ClampedArray, hex: string): Uint8ClampedArray {
  const n = parseInt(hex.slice(1, 7), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255
  const out = new Uint8ClampedArray(src.length)
  for (let o = 0; o < src.length; o += 4) { out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = src[o + 3] }
  return out
}
/** Luminance-preserving grey, keeping alpha. */
export function grayscalePixels(src: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length)
  for (let o = 0; o < src.length; o += 4) { const v = Math.round(0.2126 * src[o] + 0.7152 * src[o + 1] + 0.0722 * src[o + 2]); out[o] = v; out[o + 1] = v; out[o + 2] = v; out[o + 3] = src[o + 3] }
  return out
}

/** The profile a derived variant would have, without re-measuring pixels. */
export function variantProfile(p: AssetProfile, plan: VariantPlan): AssetProfile {
  if (plan.id === 'primary') return p
  if (plan.id === 'grayscale') {
    const colors = p.colors.map(c => { const v = Math.round(toGamma(c.luminance) * 255); return { ...c, hex: rgbHex(v, v, v), chroma: 0 } })
    return { ...p, colors, chromatic: false }
  }
  const hex = plan.fill ?? '#000000', lum = hexLum(hex)
  const n = parseInt(hex.slice(1, 7), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255
  return { ...p, colors: [{ hex, share: 1, edge: 1, luminance: lum, chroma: (Math.max(r, g, b) - Math.min(r, g, b)) / 255 }], mono: true, chromatic: (Math.max(r, g, b) - Math.min(r, g, b)) / 255 > 0.12, luminance: lum, tone: lum >= 0.5 ? 'light' : lum <= 0.18 ? 'dark' : 'mid', internalEdges: 0, boundary: null }
}
