import { describe, expect, it } from 'vitest'
import { buildBrand, initialTokens, resolve } from '@/studio/brand/tokens'
import { familyById } from './families'
import { composeInteriorCandidates, INTERIOR_KINDS, INTERIOR_LAYOUTS } from './interiors'

const brand = buildBrand(resolve({
  ...initialTokens(),
  name: 'Òké Studio',
  tagline: 'Designing useful systems',
  brandColor: '#e31f26',
  personality: 3,
  salt: 2,
  layoutSalt: 5,
}))

const family = familyById('editorial')

describe('Brand V2 interior compositions', () => {
  it('offers at least six structures for every interior page kind', () => {
    expect(INTERIOR_LAYOUTS.length).toBeGreaterThanOrEqual(6)
    for (const kind of INTERIOR_KINDS) {
      const pages = composeInteriorCandidates({ kind, brand, family, seed: 4, pageNo: 3, pageCount: 16 })
      expect(pages.length).toBeGreaterThanOrEqual(6)
      expect(new Set(pages.map((page) => page.genome.compositionId)).size).toBe(pages.length)
      expect(pages.every((page) => page.kind === kind)).toBe(true)
    }
  })

  it('keeps brand and section text intact rather than truncating content', () => {
    const pages = composeInteriorCandidates({ kind: 'closing', brand, family, seed: 8, pageNo: 16, pageCount: 16 })
    for (const page of pages) {
      const strings = page.nodes.filter((node) => node.t === 'text').map((node) => node.text)
      expect(strings.some((value) => value.includes('Òké Studio'))).toBe(true)
      expect(strings.join(' ')).not.toContain('...')
    }
  })

  it('is deterministic for the same family and seed', () => {
    const a = composeInteriorCandidates({ kind: 'colour', brand, family, seed: 11 })
    const b = composeInteriorCandidates({ kind: 'colour', brand, family, seed: 11 })
    expect(a.map((page) => page.genome)).toEqual(b.map((page) => page.genome))
  })
})
