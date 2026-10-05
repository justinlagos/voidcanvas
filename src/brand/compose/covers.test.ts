import { describe, expect, it } from 'vitest'
import { buildBrand, initialTokens, resolve } from '@/studio/brand/tokens'
import { familyById } from './families'
import { COVER_COMPOSITIONS, composeCoverCandidates } from './covers'

const brand = buildBrand(resolve({ ...initialTokens(), name: 'Òké Studio', tagline: 'Design for people', brandColor: '#111111', personality: 3, salt: 8 }))

describe('cover compositions', () => {
  it('ships at least eight structurally distinct cover compositions', () => {
    expect(COVER_COMPOSITIONS.length).toBeGreaterThanOrEqual(8)
    expect(new Set(COVER_COMPOSITIONS.map((x) => x.id)).size).toBe(COVER_COMPOSITIONS.length)
  })

  it('produces unique genomes for one brand and seed', () => {
    const pages = composeCoverCandidates({ brand, family: familyById('editorial'), seed: 3, logoAspect: 2.4, deviceAngle: 23 })
    expect(pages).toHaveLength(COVER_COMPOSITIONS.length)
    expect(new Set(pages.map((p) => p.genome.compositionId)).size).toBe(pages.length)
  })

  it('is deterministic for the same inputs', () => {
    const input = { brand, family: familyById('geometric'), seed: 12, logoAspect: 0.9, deviceAngle: 37 }
    const a = composeCoverCandidates(input)
    const b = composeCoverCandidates(input)
    expect(a.map((p) => p.genome)).toEqual(b.map((p) => p.genome))
  })

  it('keeps diagonal motion structurally separate from the vertical split cover', () => {
    const pages = composeCoverCandidates({ brand, family: familyById('soft'), seed: 7, deviceAngle: 23 })
    const diagonal = pages.find((p) => p.genome.compositionId === 'cover-diagonal-motion')
    const split = pages.find((p) => p.genome.compositionId === 'cover-split-field')
    expect(diagonal?.genome.colourBlocking).toBe('banded-flood')
    expect(split?.genome.colourBlocking).toBe('flood')
    expect(diagonal?.nodes.some((n) => n.t === 'frame' && n.id === 'type-band' && n.rect.w === 1600)).toBe(true)
    expect(split?.nodes.some((n) => n.t === 'frame' && n.id === 'field' && n.rect.h === 900)).toBe(true)
  })

  it('never truncates the brand name in the IR', () => {
    const longBrand = buildBrand(resolve({ ...initialTokens(), name: 'Òké International Cultural Design Collective', brandColor: '#111111', salt: 2 }))
    const pages = composeCoverCandidates({ brand: longBrand, family: familyById('poster'), seed: 7 })
    for (const page of pages) {
      const title = page.nodes.find((n) => n.t === 'text' && n.id === 'brand-name')
      expect(title && title.t === 'text' ? title.text : '').toBe(longBrand.name)
      expect(title && title.t === 'text' ? title.fit : '').toBe('shrink')
    }
  })
})
