// Where the logo works. A meaningful set of backgrounds, the treatment to use on each, and
// a graded verdict with a reason, so the guideline says "use the reversed version here,
// full colour drops to 1.3:1" instead of "good contrast".

import { hexLum, type AssetProfile } from './asset'
import { contrastLum, markContrast, scrimFor, scrimLum, type Level, type MarkContrast } from './contrast'
import { type VariantId } from './logo'

export interface BackgroundSpec { id: string; name: string; hex: string; group: 'neutral' | 'brand' | 'tint' }
export interface VariantSet { id: VariantId; profile: AssetProfile; valid: boolean }
export interface Placement {
  bg: BackgroundSpec
  /** Treatment to use. Full colour wins whenever it clears the target. */
  use: VariantId
  result: MarkContrast
  level: Level
  /** Full colour on its own, for the note "full colour is 1.3:1 here". */
  primary: MarkContrast
  why: string
  /** When nothing clears the target: the lightest scrim that would, and the ratio the mark reaches on it. */
  fix?: { color: string; opacity: number; ratio: number } | null
}

/** Backgrounds a working designer will actually meet. */
export function backgroundSet(b: { primary: string; secondary?: string | null; accent?: string | null; light?: string | null; dark?: string | null; darkest?: string | null; lightest?: string | null; mid?: string | null }): BackgroundSpec[] {
  const out: BackgroundSpec[] = [
    { id: 'white', name: 'White', hex: '#ffffff', group: 'neutral' },
    { id: 'black', name: 'Black', hex: '#000000', group: 'neutral' },
    { id: 'grey', name: 'Neutral grey', hex: '#8a8a8f', group: 'neutral' },
    { id: 'brand', name: 'Brand', hex: b.primary, group: 'brand' },
  ]
  if (b.secondary) out.push({ id: 'secondary', name: 'Secondary', hex: b.secondary, group: 'brand' })
  if (b.accent) out.push({ id: 'accent', name: 'Accent', hex: b.accent, group: 'brand' })
  if (b.light) out.push({ id: 'light', name: 'Light surface', hex: b.light, group: 'tint' })
  if (b.dark) out.push({ id: 'dark', name: 'Dark surface', hex: b.dark, group: 'tint' })
  if (b.lightest) out.push({ id: 'lightest', name: 'Lightest tint', hex: b.lightest, group: 'tint' })
  if (b.mid) out.push({ id: 'mid', name: 'Mid tint', hex: b.mid, group: 'tint' })
  if (b.darkest) out.push({ id: 'darkest', name: 'Darkest shade', hex: b.darkest, group: 'tint' })
  // Drop near-duplicates (a light surface that is white, say).
  const seen = new Set<string>()
  return out.filter(s => { const k = s.hex.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
}

const ORDER: VariantId[] = ['primary', 'reversed', 'mono-dark', 'mono-brand', 'grayscale']

/** Pick the treatment for one background: full colour if it clears the target, else the best valid variant. */
export function placeOn(bg: BackgroundSpec, variants: VariantSet[]): Placement {
  const valid = variants.filter(v => v.valid)
  const by = (id: VariantId) => valid.find(v => v.id === id)
  const primary = by('primary') ?? variants[0]
  const p = markContrast(primary.profile, bg.hex)
  const label = (id: VariantId) => id === 'primary' ? 'full colour' : id === 'reversed' ? 'the reversed version' : id === 'mono-dark' ? 'the mono dark version' : id === 'mono-brand' ? 'the one-colour version' : 'the greyscale version'
  if (p.level === 'good') return { bg, use: 'primary', result: p, level: 'good', primary: p, why: `Full colour. ${p.why}` }
  let best: { id: VariantId; r: MarkContrast } | null = null
  for (const id of ORDER) {
    const v = by(id); if (!v || id === 'primary') continue
    const r = markContrast(v.profile, bg.hex)
    if (!best || r.ratio > best.r.ratio) best = { id, r }
    if (r.level === 'good') { best = { id, r }; break }
  }
  if (best && best.r.level !== 'attention' && best.r.ratio > p.ratio) {
    const why = `Use ${label(best.id)}: full colour is ${p.ratio.toFixed(1)}:1 here${best.r.level === 'good' ? `, ${label(best.id)} holds at ${best.r.ratio.toFixed(1)}:1.` : `; ${label(best.id)} reaches ${best.r.ratio.toFixed(1)}:1, still under ${best.r.need}:1.`}`
    return { bg, use: best.id, result: best.r, level: best.r.level, primary: p, why }
  }
  // Nothing clears it. Say so, and how much scrim would.
  const use = best && best.r.ratio > p.ratio ? best.id : 'primary'
  const r = best && best.r.ratio > p.ratio ? best.r : p
  const s = scrimFor(r.worst.luminance, hexLum(bg.hex), r.need)
  const fix = s ? { ...s, ratio: contrastLum(r.worst.luminance, scrimLum(hexLum(bg.hex), s.color, s.opacity)) } : null
  const why = `No version clears ${r.need}:1 on this colour (${label(use)} reaches ${r.ratio.toFixed(1)}:1).${fix ? ` A ${Math.round(fix.opacity * 100)}% ${fix.color === '#000000' ? 'dark' : 'light'} scrim behind the logo lifts it to ${fix.ratio.toFixed(1)}:1.` : ' Avoid it for the logo.'}`
  return { bg, use, result: r, level: 'attention', primary: p, why, fix }
}

export function placeAll(bgs: BackgroundSpec[], variants: VariantSet[]): Placement[] { return bgs.map(bg => placeOn(bg, variants)) }
