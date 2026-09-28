import type { Brand, Check } from './tokens'
import type { AssetProfile } from '@/lib/intelligence/asset'
import { markContrast as markContrastOf, type Level } from '@/lib/intelligence/contrast'
import { planVariants, variantProfile, type VariantId, type VariantPlan } from '@/lib/intelligence/logo'
import { backgroundSet, placeAll, type Placement } from '@/lib/intelligence/backgrounds'
import { analyseLogoFile, recolourCanvas } from '@/lib/intelligence/dom'
import { grayscalePixels } from '@/lib/intelligence/logo'

// A logo is measured once when it is added (src/lib/intelligence): trimmed to its visible
// pixels, knocked out if it sat on a flat background, its colours read from solid pixels,
// its shape classed. The guideline then knows which versions can honestly be derived, where
// each one works, and what to suggest for clear space and minimum size.

/** How the mark is drawn on a page. Maps one to one onto the brand's logo variants. */
export type MarkMode = 'original' | 'white' | 'dark' | 'brand' | 'grayscale'
export const MODE_OF: Record<VariantId, MarkMode> = { primary: 'original', reversed: 'white', 'mono-dark': 'dark', 'mono-brand': 'brand', grayscale: 'grayscale' }
export const VARIANT_OF: Record<MarkMode, VariantId> = { original: 'primary', white: 'reversed', dark: 'mono-dark', brand: 'mono-brand', grayscale: 'grayscale' }
export const MODE_LABEL: Record<MarkMode, string> = { original: 'Full colour', white: 'Reversed white', dark: 'Dark mono', brand: 'One colour', grayscale: 'Greyscale' }

export interface LogoInfo {
  img: HTMLCanvasElement        // trimmed, transparent background: the primary
  width: number; height: number
  color: string                 // the main colour of the mark
  colors: { hex: string; share: number }[]
  knockedOut: boolean           // a flat background was removed
  svg: string | null            // original SVG source, kept for the HTML handoff
  fileName: string
  profile: AssetProfile
}

export async function analyseLogo(file: File): Promise<LogoInfo> {
  const a = await analyseLogoFile(file)
  const p = a.profile
  return { img: a.canvas, width: a.width, height: a.height, color: p.colors[0]?.hex ?? '#000000', colors: p.colors.map(c => ({ hex: c.hex, share: c.share })), knockedOut: !!p.flatBackground, svg: a.svg, fileName: a.fileName, profile: p }
}

/** Designer decisions that sit on top of the analysis. Saved with the draft and the client brand. */
export interface LogoDecisions {
  /** Derived variants the designer switched off. */
  off: VariantId[]
  /** Treatment chosen by hand per background id. */
  backgrounds: Record<string, VariantId>
}
export const NO_DECISIONS: LogoDecisions = { off: [], backgrounds: {} }

/** Variants with their validity, honouring the designer's switches. */
export function logoVariants(b: Pick<Brand, 'surfaces' | 'roles'>, info: LogoInfo | null, d: LogoDecisions = NO_DECISIONS): (VariantPlan & { profile: AssetProfile })[] {
  if (!info) return []
  return planVariants(info.profile, b.surfaces.inkOnLight, b.roles[0].hex).map(pl => ({ ...pl, valid: pl.valid && !d.off.includes(pl.id), profile: variantProfile(info.profile, pl) }))
}

/** Worst contrast among the colours of the mark that meet the background. A placeholder mark uses the brand colour. */
export function markContrast(info: LogoInfo | null, fallback: string, bg: string): number {
  if (!info) return markContrastOf({ colors: [{ hex: fallback, share: 1, edge: 1, luminance: lum(fallback), chroma: 0 }], kind: 'mark' }, bg).ratio
  return markContrastOf(info.profile, bg).ratio
}
const lum = (hex: string) => { const n = parseInt(hex.slice(1, 7), 16); const f = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }; return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255) }

const grayCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>()
/** A flat single-colour version of the mark, for reversed and mono use. Alpha is kept, so it is only honest when the plan says so. */
export function monoMark(info: LogoInfo, hex: string): HTMLCanvasElement { return recolourCanvas(info.img, hex) }
export function grayMark(info: LogoInfo): HTMLCanvasElement {
  let g = grayCache.get(info.img)
  if (!g) {
    const x = info.img.getContext('2d', { willReadFrequently: true })!
    const px = grayscalePixels(x.getImageData(0, 0, info.width, info.height).data)
    g = document.createElement('canvas'); g.width = info.width; g.height = info.height
    const id = g.getContext('2d')!.createImageData(info.width, info.height); id.data.set(px); g.getContext('2d')!.putImageData(id, 0, 0)
    grayCache.set(info.img, g)
  }
  return g
}

export interface LogoPlacement {
  id: string; bg: string; bgName: string
  mode: MarkMode
  ratio: number; originalRatio: number
  ok: boolean; level: Level; why: string
  fix?: { color: string; opacity: number; ratio: number } | null
  /** Chosen by the designer rather than suggested. */
  designer: boolean
}

/** Backgrounds a working designer meets, from the palette. */
export function brandBackgrounds(b: Brand) {
  return backgroundSet({ primary: b.roles[0].hex, secondary: b.roles[1]?.hex, accent: b.roles[2]?.hex, light: b.surfaces.light, dark: b.surfaces.dark, lightest: b.roles[0].ramp[100], mid: b.roles[0].ramp[400], darkest: b.roles[0].ramp[900] })
}

/** For each background, which version of the logo to use, how well it holds and why. */
export function logoPlacements(b: Brand, info: LogoInfo | null, d: LogoDecisions = NO_DECISIONS): LogoPlacement[] {
  const bgs = brandBackgrounds(b)
  if (!info) {
    // Placeholder mark: brand colour, judged as a symbol.
    const fake = { colors: [{ hex: b.roles[0].hex, share: 1, edge: 1, luminance: lum(b.roles[0].hex), chroma: 0.5 }], kind: 'mark' as const }
    return bgs.map(bg => { const r = markContrastOf(fake, bg.hex); const white = markContrastOf({ ...fake, colors: [{ ...fake.colors[0], hex: '#ffffff', luminance: 1 }] }, bg.hex); const dark = markContrastOf({ ...fake, colors: [{ ...fake.colors[0], hex: b.surfaces.inkOnLight, luminance: lum(b.surfaces.inkOnLight) }] }, bg.hex)
      if (r.level === 'good') return { id: bg.id, bg: bg.hex, bgName: bg.name, mode: 'original' as MarkMode, ratio: r.ratio, originalRatio: r.ratio, ok: true, level: 'good' as Level, why: r.why, designer: false }
      const best = white.ratio >= dark.ratio ? { m: 'white' as MarkMode, r: white } : { m: 'dark' as MarkMode, r: dark }
      return { id: bg.id, bg: bg.hex, bgName: bg.name, mode: best.m, ratio: best.r.ratio, originalRatio: r.ratio, ok: best.r.level !== 'attention', level: best.r.level, why: best.r.why, designer: false } })
  }
  const variants = logoVariants(b, info, d).map(v => ({ id: v.id, valid: v.valid, profile: v.profile }))
  const placed = placeAll(bgs, variants)
  return placed.map((p: Placement) => {
    const chosen = d.backgrounds[p.bg.id]
    if (chosen && variants.some(v => v.id === chosen && v.valid)) {
      const r = markContrastOf(variants.find(v => v.id === chosen)!.profile, p.bg.hex)
      return { id: p.bg.id, bg: p.bg.hex, bgName: p.bg.name, mode: MODE_OF[chosen], ratio: r.ratio, originalRatio: p.primary.ratio, ok: r.level !== 'attention', level: r.level, why: `Set by you. ${r.why}`, designer: true }
    }
    return { id: p.bg.id, bg: p.bg.hex, bgName: p.bg.name, mode: MODE_OF[p.use], ratio: p.result.ratio, originalRatio: p.primary.ratio, ok: p.level !== 'attention', level: p.level, why: p.why, fix: p.fix, designer: false }
  })
}

export function logoChecks(b: Brand, info: LogoInfo | null, d: LogoDecisions = NO_DECISIONS): Check[] {
  if (!info) return [{ ok: true, text: 'Logo contrast: add a logo to check it against the palette' }]
  // A background the guideline has an answer for (a version, or a scrim) is not an issue; only one with no answer is.
  return logoPlacements(b, info, d).map(p => ({ ok: p.level !== 'attention' || !!p.fix, text: `Logo on ${p.bgName.toLowerCase()}: ${p.why}` }))
}

export const toDataUrl = (c: HTMLCanvasElement) => c.toDataURL('image/png')
