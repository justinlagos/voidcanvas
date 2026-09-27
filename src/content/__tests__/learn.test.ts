import { describe, expect, it } from 'vitest'
import { ARTICLES, GOALS, danglingSlugs, goalIndex, learnIndex } from '@/content/learn/index'
import { textOf, answerOf, metaDescription } from '@/content/util'
import { searchGoals, searchLearn } from '@/content/learn/search'

describe('Learn content', () => {
  it('has unique slugs', () => {
    const seen = new Set<string>()
    for (const a of ARTICLES) { expect(seen.has(a.slug), a.slug).toBe(false); seen.add(a.slug) }
  })
  it('links only to guides and goals that exist', () => {
    expect(danglingSlugs()).toEqual([])
  })
  it('contains no em dashes or en dashes used as punctuation', () => {
    for (const a of ARTICLES) {
      const text = [a.title, a.summary, a.description ?? '', ...a.body.map(textOf), ...(a.answers ?? [])].join('\n')
      expect(text.includes('—'), `${a.slug} has an em dash`).toBe(false)
      expect(/\s–\s/.test(text), `${a.slug} uses an en dash as punctuation`).toBe(false)
    }
    for (const g of GOALS) expect([g.answer, g.blurb, g.product.text].join(' ').includes('—'), g.id).toBe(false)
  })
  it('gives every cornerstone a quick answer and a product paragraph', () => {
    for (const a of ARTICLES.filter(x => x.role === 'cornerstone' && x.published)) {
      expect(answerOf(a.body), `${a.slug} answer`).toBeTruthy()
      expect(a.body.some(b => b.t === 'product'), `${a.slug} product`).toBe(true)
    }
  })
  it('keeps meta descriptions under 160 characters', () => {
    for (const a of ARTICLES) expect(metaDescription(a.description ?? a.summary).length, a.slug).toBeLessThanOrEqual(160)
  })
  it('points every internal link at a real guide', () => {
    const slugs = new Set(ARTICLES.map(a => a.slug))
    for (const a of ARTICLES) {
      const text = a.body.map(textOf).join(' ')
      for (const m of Array.from(text.matchAll(/\]\(\/learn\/([a-z0-9-]+)/g))) expect(slugs.has(m[1]), `${a.slug} -> ${m[1]}`).toBe(true)
    }
  })
  it('routes every goal through at least three guides', () => {
    for (const g of GOALS) expect(g.steps.length, g.id).toBeGreaterThanOrEqual(3)
  })
})

describe('Learn search', () => {
  const index = learnIndex()
  const top = (q: string, n = 3) => searchLearn(q, index).slice(0, n).map(h => h.slug)
  it('understands problem phrasings through the concept map', () => {
    expect(top('blurry image')).toContain('image-resolution-explained')
    expect(top('my print came out blurry')[0]).toBe('printed-design-looks-blurry')
    expect(top('photoshop masks')).toContain('masks')
  })
  it('answers the five persona searches', () => {
    expect(searchGoals('I want to learn graphic design', goalIndex())[0]?.id).toBe('learn-design')
    expect(top('I want to learn graphic design', 5)).toContain('typography-fundamentals')
    expect(top('how do I edit a psd without photoshop')[0]).toBe('edit-a-psd-without-photoshop')
    expect(top('how do I create a halftone effect')[0]).toBe('make-a-halftone-portrait')
    expect(top('how do I manage a client design project')[0]).toBe('run-a-client-design-project')
    expect(top('how do I create a consistent brand', 5)).toContain('keep-a-brand-consistent')
    expect(top('why does my print look blurry')[0]).toBe('printed-design-looks-blurry')
    expect(top('how to make a risograph effect')[0]).toBe('make-a-risograph-effect')
    expect(top("photo editor that doesn't upload your photos")[0]).toBe('photo-editor-that-does-not-upload')
  })
  it('matches by exact feature and reference terms', () => {
    expect(top('instagram post size')).toContain('size-presets')
    expect(top('keyboard shortcuts')[0]).toBe('keyboard-shortcuts')
    expect(top('remove background')[0]).toBe('remove-background')
    expect(top('bleed')).toContain('how-much-bleed')
    expect(top('how much bleed do i need')[0]).toBe('how-much-bleed')
    expect(top('what is a print ready pdf')[0]).toBe('what-is-a-print-ready-pdf')
    expect(top('how to make a duotone')[0]).toBe('make-a-duotone-image')
    expect(top('dither effect')[0]).toBe('dither-effect-explained')
    expect(top('glitch effect online')[0]).toBe('glitch-effect-explained')
  })
  it('returns nothing for noise', () => {
    expect(searchLearn('zzzz qqqq', index)).toEqual([])
  })
})
