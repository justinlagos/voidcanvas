import type { Brand } from '@/studio/brand/tokens'
import { composeCoverCandidates } from './covers'
import type { DirectionFamily } from './families'
import { composeInteriorCandidates, INTERIOR_KINDS, type InteriorKind } from './interiors'
import { lintPage } from './lint'
import { createRhythmState } from './rhythm'
import { selectComposition, type CompositionCandidate } from './select'
import type { DocGenome, Page, PageGenome } from './types'

export interface BrandDocumentInput {
  brand: Brand
  family: DirectionFamily
  seed: number
  logoAspect?: number
  deviceAngle?: number
  recentDocuments?: readonly DocGenome[]
  enabledKinds?: readonly InteriorKind[]
}

export interface ComposedBrandDocument {
  pages: Page[]
  genome: DocGenome
  rejected: { kind: string; compositionId: string; reasons: string[] }[]
}

function hashString(value: string) {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function structuralSeed(brand: Brand, seed: number) {
  const identity = [brand.name, brand.roles[0]?.hex ?? '', brand.fonts.heading.family, brand.fonts.body.family].join('|')
  return (seed ^ hashString(identity)) >>> 0
}

function jitter(seed: number, position: number, candidate: number) {
  let x = Math.imul(seed + 1, 0x9e3779b1) ^ Math.imul(position + 7, 0x85ebca6b) ^ Math.imul(candidate + 13, 0xc2b2ae35)
  x ^= x >>> 16
  x = Math.imul(x, 0x7feb352d)
  x ^= x >>> 15
  return (x >>> 0) / 4294967295
}

function familyFit(page: Page, family: DirectionFamily) {
  let score = 0.72
  if (family.axes.includes(page.genome.axis as never)) score += 0.08
  if (family.grids.includes(page.genome.grid as never)) score += 0.08
  const densityMid = (family.density[0] + family.density[1]) / 2
  score += Math.max(0, 0.08 - Math.abs(page.genome.density - densityMid) * 0.08)
  const flood = page.genome.colourBlocking === 'flood'
  const floodMid = (family.colourFlood[0] + family.colourFlood[1]) / 2
  if (flood === (floodMid >= 0.5)) score += 0.04
  return Math.min(1, score)
}

function candidates(pages: readonly Page[], family: DirectionFamily, seed: number, position: number): CompositionCandidate[] {
  return pages.map((page, index) => ({
    page,
    lint: lintPage(page),
    fit: Math.min(1, familyFit(page, family) + jitter(seed, position, index) * 0.06),
  }))
}

function recentAtPosition(documents: readonly DocGenome[], position: number): PageGenome[] {
  return documents.map((doc) => doc.pages[position]).filter((page): page is PageGenome => !!page)
}

export function composeBrandDocument(input: BrandDocumentInput): ComposedBrandDocument {
  const kinds = input.enabledKinds ?? INTERIOR_KINDS
  const pageCount = kinds.length + 1
  const pages: Page[] = []
  const rejected: ComposedBrandDocument['rejected'] = []
  let rhythm = createRhythmState()
  const effectiveSeed = structuralSeed(input.brand, input.seed)

  const coverPages = composeCoverCandidates({
    brand: input.brand,
    family: input.family,
    seed: effectiveSeed,
    logoAspect: input.logoAspect,
    deviceAngle: input.deviceAngle,
  })
  const coverCandidates = candidates(coverPages, input.family, effectiveSeed, 0)
  for (const candidate of coverCandidates) {
    if (candidate.lint.some((finding) => finding.level === 'attention')) {
      rejected.push({ kind: 'cover', compositionId: candidate.page.genome.compositionId, reasons: candidate.lint.filter((f) => f.level === 'attention').map((f) => f.message) })
    }
  }
  const cover = selectComposition({
    candidates: coverCandidates,
    family: input.family,
    rhythm,
    recent: recentAtPosition(input.recentDocuments ?? [], 0),
    recentWindow: 8,
  })
  if (!cover) throw new Error('Brand document composer could not find a valid cover composition.')
  pages.push(cover.candidate.page)
  rhythm = cover.rhythm

  for (let i = 0; i < kinds.length; i++) {
    const kind = kinds[i]
    const position = i + 1
    const pageSeed = (effectiveSeed + position * 37) >>> 0
    const options = composeInteriorCandidates({
      kind,
      brand: input.brand,
      family: input.family,
      seed: pageSeed,
      pageNo: position + 1,
      pageCount,
      deviceAngle: input.deviceAngle,
    })
    const interiorCandidates = candidates(options, input.family, pageSeed, position)
    for (const candidate of interiorCandidates) {
      if (candidate.lint.some((finding) => finding.level === 'attention')) {
        rejected.push({ kind, compositionId: candidate.page.genome.compositionId, reasons: candidate.lint.filter((f) => f.level === 'attention').map((f) => f.message) })
      }
    }
    const selected = selectComposition({
      candidates: interiorCandidates,
      family: input.family,
      rhythm,
      recent: recentAtPosition(input.recentDocuments ?? [], position),
      recentWindow: 8,
    })
    if (!selected) throw new Error(`Brand document composer could not find a valid ${kind} composition.`)
    pages.push(selected.candidate.page)
    rhythm = selected.rhythm
  }

  return {
    pages,
    rejected,
    genome: {
      family: input.family.id,
      parameters: { seed: input.seed, structuralSeed: effectiveSeed, pageCount: pages.length },
      pages: pages.map((page) => page.genome),
    },
  }
}

export function composeBrandTakes(input: Omit<BrandDocumentInput, 'seed' | 'recentDocuments'> & { startSeed: number; count: number }) {
  const docs: ComposedBrandDocument[] = []
  for (let i = 0; i < input.count; i++) {
    docs.push(composeBrandDocument({
      ...input,
      seed: input.startSeed + i,
      recentDocuments: docs.map((doc) => doc.genome),
    }))
  }
  return docs
}
