// Photo intelligence for logo placement. A photograph is read as a grid of regions, each with
// its tone and how busy it is. A logo goes where it reads: calm, enough contrast, away from
// the busiest region (which is usually the subject). When nothing works, the least destructive
// fix is suggested first: a different treatment, a different corner, then the lightest scrim.

import { contrastLum, markColours, markTarget, scrimFor, scrimLum, type Level } from './contrast'
import { lumOf, shrink, type AssetProfile } from './asset'
import type { VariantSet } from './backgrounds'
import type { VariantId } from './logo'

export interface Region { id: string; x: number; y: number; w: number; h: number; luminance: number; busy: number; hex: string }
export interface PhotoRead {
  width: number; height: number; luminance: number; busy: number; regions: Region[]; subject: string | null
  /** The subject's extent, as fractions of the frame, measured on a finer grid than the regions. */
  subjectBox: { x: number; y: number; w: number; h: number } | null
}

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'centre'
export const CORNERS: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'centre']

/** Read a photo as a 3 × 3 grid. `busy` is the mean absolute difference between neighbouring pixels (0..1). */
export function readPhoto(src: Uint8ClampedArray, srcW: number, srcH: number): PhotoRead {
  const { data, w, h } = shrink(src, srcW, srcH, 240)
  const regions: Region[] = []
  let totalLum = 0, totalBusy = 0
  const G = 3
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    const x0 = Math.floor((gx * w) / G), x1 = Math.floor(((gx + 1) * w) / G), y0 = Math.floor((gy * h) / G), y1 = Math.floor(((gy + 1) * h) / G)
    let lum = 0, busy = 0, n = 0, r = 0, g = 0, b = 0
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const o = (y * w + x) * 4
      const l = lumOf(data[o], data[o + 1], data[o + 2])
      lum += l; r += data[o]; g += data[o + 1]; b += data[o + 2]; n++
      if (x + 1 < x1) { const p = o + 4; busy += (Math.abs(data[o] - data[p]) + Math.abs(data[o + 1] - data[p + 1]) + Math.abs(data[o + 2] - data[p + 2])) / 765 }
      if (y + 1 < y1) { const p = o + w * 4; busy += (Math.abs(data[o] - data[p]) + Math.abs(data[o + 1] - data[p + 1]) + Math.abs(data[o + 2] - data[p + 2])) / 765 }
    }
    n = Math.max(1, n)
    const hex = '#' + [r, g, b].map(v => Math.round(v / n).toString(16).padStart(2, '0')).join('')
    regions.push({ id: `${gx},${gy}`, x: x0 / w, y: y0 / h, w: (x1 - x0) / w, h: (y1 - y0) / h, luminance: lum / n, busy: busy / (n * 2), hex })
    totalLum += lum / n; totalBusy += busy / (n * 2)
  }
  // The subject is usually the busiest region that is not a corner, when it stands out from the rest.
  const mean = totalBusy / regions.length
  const inner = regions.filter(r => !['0,0', '2,0', '0,2', '2,2'].includes(r.id))
  const busiest = inner.slice().sort((a, b) => b.busy - a.busy)[0]
  const subject = busiest && busiest.busy > mean * 1.4 ? busiest.id : null
  // A 12 x 8 grid of busyness; the subject's box is every fine cell nearly as busy as the busiest one.
  let subjectBox: PhotoRead['subjectBox'] = null
  if (subject) {
    const FX = 12, FY = 8, fine: number[] = []
    for (let gy = 0; gy < FY; gy++) for (let gx = 0; gx < FX; gx++) {
      const x0 = Math.floor((gx * w) / FX), x1 = Math.floor(((gx + 1) * w) / FX), y0 = Math.floor((gy * h) / FY), y1 = Math.floor(((gy + 1) * h) / FY)
      let busy = 0, n = 0
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1 - 1; x++) { const o = (y * w + x) * 4, q = o + 4; busy += (Math.abs(data[o] - data[q]) + Math.abs(data[o + 1] - data[q + 1]) + Math.abs(data[o + 2] - data[q + 2])) / 765; n++ }
      fine.push(n ? busy / n : 0)
    }
    const top = Math.max(...fine)
    let minX = FX, minY = FY, maxX = -1, maxY = -1
    fine.forEach((v, i) => { if (v >= top * 0.55) { const gx = i % FX, gy = Math.floor(i / FX); minX = Math.min(minX, gx); minY = Math.min(minY, gy); maxX = Math.max(maxX, gx); maxY = Math.max(maxY, gy) } })
    if (maxX >= 0) subjectBox = { x: minX / FX, y: minY / FY, w: (maxX - minX + 1) / FX, h: (maxY - minY + 1) / FY }
  }
  return { width: srcW, height: srcH, luminance: totalLum / regions.length, busy: mean, regions, subject, subjectBox }
}

/** The 2 × 2 regions a logo in a corner would sit over (about a fifth of the frame), or the centre region. */
export function regionsFor(read: PhotoRead, corner: Corner): Region[] {
  const map: Record<Corner, string[]> = { 'top-left': ['0,0'], 'top-right': ['2,0'], 'bottom-left': ['0,2'], 'bottom-right': ['2,2'], centre: ['1,1'] }
  return read.regions.filter(r => map[corner].includes(r.id))
}

export interface PhotoPlacement {
  corner: Corner
  use: VariantId
  ratio: number
  level: Level
  busy: number
  /** Overall score, higher is better. */
  score: number
  why: string
  /** The target this version is held to: 4.5:1 for a wordmark or lockup, 3:1 for a symbol. */
  need: number
  /** A scrim carries the ratio the mark reaches on it. */
  fix?: { kind: 'scrim'; color: string; opacity: number; ratio: number } | { kind: 'blur' } | null
}

/** Score every corner and treatment; return them best first. `avoid` marks corners the caller has ruled out. */
export function placeOnPhoto(read: PhotoRead, variants: VariantSet[], opts: { corners?: Corner[]; textLike?: boolean } = {}): PhotoPlacement[] {
  const corners = opts.corners ?? CORNERS
  const out: PhotoPlacement[] = []
  const valid = variants.filter(v => v.valid)
  for (const corner of corners) {
    const regs = regionsFor(read, corner)
    const lum = regs.reduce((a, r) => a + r.luminance, 0) / regs.length
    const busy = regs.reduce((a, r) => a + r.busy, 0) / regs.length
    const onSubject = read.subject ? regs.some(r => r.id === read.subject) : false
    let best: PhotoPlacement | null = null
    for (const v of valid) {
      // Measured on the colours that meet the photo, the same way the backgrounds page measures.
      const list = markColours(v.profile)
      const worst = list.reduce((a, c) => (contrastLum(c.luminance, lum) < contrastLum(a.luminance, lum) ? c : a), list[0])
      const ratio = contrastLum(worst.luminance, lum)
      const need = markTarget(v.profile).need
      const level: Level = ratio >= need ? 'good' : ratio >= need * 0.66 ? 'check' : 'attention'
      // Busy backgrounds eat contrast: treat anything over 0.06 as one level worse.
      const lvl: Level = level === 'good' && busy > 0.06 ? 'check' : level
      const score = (lvl === 'good' ? 3 : lvl === 'check' ? 1.5 : 0) - busy * 12 - (onSubject ? 2.5 : 0) - (corner === 'centre' ? 0.6 : 0) + (v.id === 'primary' ? 0.4 : 0) + Math.min(1, ratio / 10)
      // Anything under its target, or on a busy patch, gets the lightest fix that brings it there.
      const fix = ratio < need || busy > 0.09 ? (() => { const s = scrimFor(worst.luminance, lum, need); return s ? { kind: 'scrim' as const, ...s, ratio: contrastLum(worst.luminance, scrimLum(lum, s.color, s.opacity)) } : { kind: 'blur' as const } })() : null
      const cand: PhotoPlacement = { corner, use: v.id, ratio, level: lvl, busy, score, fix, need, why: '' }
      if (!best || cand.score > best.score) best = cand
    }
    if (!best) continue
    const where = corner === 'centre' ? 'the centre' : `the ${corner.replace('-', ' ')}`
    const treat = best.use === 'primary' ? 'Full colour' : best.use === 'reversed' ? 'The reversed logo' : best.use === 'mono-dark' ? 'The mono dark logo' : best.use === 'grayscale' ? 'The greyscale logo' : 'The one-colour logo'
    const tone = lum >= 0.6 ? 'light' : lum <= 0.2 ? 'dark' : 'mid-tone'
    const area = `${where}, a ${tone}${busy > 0.06 ? ', busy' : ', calm'} area`
    best.why = onSubject ? `${cap(where)} is over the subject.`
      : best.fix?.kind === 'scrim' ? `${treat} on a ${Math.round(best.fix.opacity * 100)}% ${best.fix.color === '#000000' ? 'dark' : 'light'} scrim reads at ${best.fix.ratio.toFixed(1)}:1 on ${area}. Without it, ${best.ratio.toFixed(1)}:1.`
        : `${treat} reads at ${best.ratio.toFixed(1)}:1 on ${area}.` + (best.fix ? ' A soft blur behind it would settle it.' : '')
    out.push(best)
  }
  return out.sort((a, b) => b.score - a.score)
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Convenience: contrast of a mark against one flat tone, for Editor checks that sampled the pixels under a layer. */
export function markOnTone(p: AssetProfile, lum: number): { ratio: number; level: Level; need: number } {
  const list = markColours(p)
  const ratio = Math.min(...list.map(c => contrastLum(c.luminance, lum)))
  const need = markTarget(p).need
  return { ratio, need, level: ratio >= need ? 'good' : ratio >= need * 0.66 ? 'check' : 'attention' }
}
