import type { DocGenome, PageGenome } from './types'

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

function jaccard(a: readonly string[], b: readonly string[]) {
  const aa = new Set(a), bb = new Set(b)
  const union = new Set(a.concat(b))
  if (!union.size) return 0
  let shared = 0
  for (const x of Array.from(aa)) if (bb.has(x)) shared++
  return 1 - shared / union.size
}

function paramDistance(a: Record<string, number | string | boolean>, b: Record<string, number | string | boolean>) {
  const keys = new Set(Object.keys(a).concat(Object.keys(b)))
  if (!keys.size) return 0
  let sum = 0
  for (const k of Array.from(keys)) {
    const av = a[k], bv = b[k]
    if (typeof av === 'number' && typeof bv === 'number') {
      const scale = Math.max(1, Math.abs(av), Math.abs(bv))
      sum += Math.min(1, Math.abs(av - bv) / scale)
    } else sum += av === bv ? 0 : 1
  }
  return sum / keys.size
}

export function pageGenomeDistance(a: PageGenome, b: PageGenome) {
  let d = 0
  d += (a.compositionId === b.compositionId ? 0 : 1) * 0.6
  d += (a.grid === b.grid ? 0 : 1) * 0.12
  d += (a.axis === b.axis ? 0 : 1) * 0.1
  d += Math.min(1, Math.abs(a.marginRatio - b.marginRatio) / 0.15) * 0.08
  d += (a.typeTreatment === b.typeTreatment ? 0 : 1) * 0.1
  d += (a.colourBlocking === b.colourBlocking ? 0 : 1) * 0.1
  d += jaccard(a.devices, b.devices) * 0.08
  d += Math.abs(a.density - b.density) * 0.05
  d += paramDistance(a.parameters, b.parameters) * 0.07
  return clamp01(d)
}

export function documentGenomeDistance(a: DocGenome, b: DocGenome) {
  const family = a.family === b.family ? 0 : 0.24
  const n = Math.max(a.pages.length, b.pages.length)
  if (!n) return family
  let pages = 0
  for (let i = 0; i < n; i++) {
    const ap = a.pages[i], bp = b.pages[i]
    pages += ap && bp ? pageGenomeDistance(ap, bp) : 1
  }
  const sequence = pages / n
  return clamp01(family + sequence * 0.8 + paramDistance(a.parameters, b.parameters) * 0.04)
}

export function samePositionStructureShare(a: DocGenome, b: DocGenome) {
  const n = Math.max(a.pages.length, b.pages.length)
  if (!n) return 1
  let same = 0
  for (let i = 0; i < n; i++) {
    const ap = a.pages[i], bp = b.pages[i]
    if (ap && bp && ap.compositionId === bp.compositionId) same++
  }
  return same / n
}

export function structureSignature(doc: DocGenome) {
  return doc.pages.map((p) => p.compositionId).join('|')
}

export function recentCompositionPenalty(candidate: PageGenome, recent: readonly PageGenome[], window = 8) {
  const slice = recent.slice(-Math.max(0, window))
  const lastSame = slice.slice().reverse().findIndex((g) => g.compositionId === candidate.compositionId)
  if (lastSame < 0) return 0
  return Math.max(0.15, 1 - lastSame / Math.max(1, window))
}
