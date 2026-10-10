import { describe, expect, it } from 'vitest'
import { buildBrand, initialTokens, resolve } from '@/studio/brand/tokens'
import { BODY_KIND_MIN, BODY_PAGE_KINDS, BODY_STRUCTURES, bodyIntro, composeBodyCandidates } from './body-pages'
import { composeClosingCandidates } from './closing'
import { composeBrandDocument } from './document'
import { DIRECTION_FAMILIES, familyById } from './families'
import { lintPasses, lintPage } from './lint'

const brand = buildBrand(resolve({ ...initialTokens(), name: 'Òké Studio', tagline: 'Made with care', brandColor: '#e31f26', personality: 3, salt: 2, layoutSalt: 5 }))

describe('Brand V2 content pages', () => {
  it('composes every content page around its real content, in six structures', () => {
    for (const kind of BODY_PAGE_KINDS) {
      const pages = composeBodyCandidates({ kind, brand, family: familyById('editorial'), seed: 4, pageNo: 3, pageCount: 16 })
      expect(pages.map((p) => p.genome.typeTreatment)).toEqual([...BODY_STRUCTURES])
      for (const page of pages) {
        const bodies = page.nodes.filter((n) => n.t === 'device' && n.kind === 'page-body')
        expect(bodies).toHaveLength(1)
        expect(bodies[0].t === 'device' && bodies[0].params.kind).toBe(kind)
      }
    }
  })

  it('leaves at least three structures that show the content at 85% or more, in every family', () => {
    for (const family of DIRECTION_FAMILIES) for (const kind of BODY_PAGE_KINDS) {
      const viable = composeBodyCandidates({ kind, brand, family, seed: 11, pageNo: 4, pageCount: 16 }).filter((p) => lintPasses(lintPage(p)))
      expect(viable.length, `${family.id} ${kind}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('rejects a box that would shrink the content below 85%', () => {
    const page = composeBodyCandidates({ kind: 'ramps', brand, family: familyById('poster'), seed: 3 })[0]
    const body = page.nodes.find((n) => n.t === 'device')!
    const squeezed = { ...page, nodes: page.nodes.map((n) => (n === body ? { ...n, rect: { ...n.rect, h: BODY_KIND_MIN.ramps.h * 0.7 } } : n)) }
    expect(lintPage(squeezed).some((f) => f.id === 'body-scale' && f.level === 'attention')).toBe(true)
  })

  it('writes one factual intro per page, from the brand, with no em dashes', () => {
    for (const kind of BODY_PAGE_KINDS) {
      const line = bodyIntro(kind, brand)
      expect(line.length).toBeGreaterThan(20)
      expect(line).not.toContain('—')
    }
    expect(bodyIntro('minsize', brand)).toContain(`${brand.logo.minWidth} px`)
    expect(bodyIntro('principles', brand)).toContain('Òké Studio')
  })

  it('closes on the mark, the full brand name and its line', () => {
    const pages = composeClosingCandidates({ brand, family: familyById('quiet-luxury'), seed: 6, logoAspect: 3 })
    expect(pages).toHaveLength(6)
    for (const page of pages) {
      expect(page.nodes.some((n) => n.t === 'logo')).toBe(true)
      const texts = page.nodes.filter((n) => n.t === 'text').map((n) => (n.t === 'text' ? n.text : ''))
      expect(texts).toContain('Òké Studio')
      expect(texts).toContain('Made with care')
      expect(lintPasses(lintPage(page))).toBe(true)
    }
  })

  it('spreads a document across its structures instead of repeating one', () => {
    for (const family of DIRECTION_FAMILIES) for (const seed of [1, 7, 19]) {
      const doc = composeBrandDocument({ brand, family, seed })
      const uses = new Map<string, number>()
      for (const page of doc.pages.slice(1)) uses.set(page.genome.typeTreatment, (uses.get(page.genome.typeTreatment) ?? 0) + 1)
      expect(Math.max(...Array.from(uses.values())), `${family.id} seed ${seed}`).toBeLessThanOrEqual(3)
      for (let i = 2; i < doc.pages.length; i++) expect(doc.pages[i].genome.typeTreatment, `${family.id} seed ${seed} page ${i}`).not.toBe(doc.pages[i - 1].genome.typeTreatment)
    }
  })
})
