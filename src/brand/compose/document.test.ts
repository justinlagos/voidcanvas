import { describe, expect, it } from 'vitest'
import { buildBrand, initialTokens, resolve } from '@/studio/brand/tokens'
import { familyById } from './families'
import { composeBrandDocument, composeBrandTakes } from './document'
import { samePositionStructureShare } from './genome'

const brand = buildBrand(resolve({
  ...initialTokens(),
  name: 'Òké Studio',
  tagline: 'A system made to move',
  brandColor: '#e31f26',
  personality: 3,
  salt: 4,
  layoutSalt: 2,
}))

const family = familyById('editorial')

describe('Brand V2 document composer', () => {
  it('builds the complete current 16-page guideline through the IR', () => {
    const doc = composeBrandDocument({ brand, family, seed: 10 })
    expect(doc.pages).toHaveLength(16)
    expect(doc.pages[0].kind).toBe('cover')
    expect(doc.pages.at(-1)?.kind).toBe('closing')
    expect(doc.genome.pages).toHaveLength(doc.pages.length)
  })

  it('is deterministic for the same inputs', () => {
    const a = composeBrandDocument({ brand, family, seed: 22 })
    const b = composeBrandDocument({ brand, family, seed: 22 })
    expect(a.genome).toEqual(b.genome)
  })

  it('does not repeat a cover composition inside eight consecutive takes', () => {
    const takes = composeBrandTakes({ brand, family, startSeed: 1, count: 8 })
    const covers = takes.map((take) => take.pages[0].genome.compositionId)
    expect(new Set(covers).size).toBe(8)
  })

  it('uses take history to reduce same-position structure reuse', () => {
    const takes = composeBrandTakes({ brand, family, startSeed: 40, count: 3 })
    const firstVsSecond = samePositionStructureShare(takes[0].genome, takes[1].genome)
    const secondVsThird = samePositionStructureShare(takes[1].genome, takes[2].genome)
    expect(firstVsSecond).toBeLessThan(1)
    expect(secondVsThird).toBeLessThan(1)
  })
})
