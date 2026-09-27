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
  it('points every internal link at a real guide, route or topic', () => {
    const slugs = new Set(ARTICLES.map(a => a.slug))
    const goals = new Set(GOALS.map(g => g.id))
    const cats = new Set(ARTICLES.map(a => a.category))
    for (const a of ARTICLES) {
      const text = a.body.map(textOf).join(' ')
      for (const m of Array.from(text.matchAll(/\]\(\/learn\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?/g))) {
        const ok = m[1] === 'do' ? goals.has(m[2]) : m[1] === 'topic' ? cats.has(m[2] as never) : slugs.has(m[1])
        expect(ok, `${a.slug} -> ${m[0]}`).toBe(true)
      }
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
    expect(top('why does my print look different than on screen')[0]).toBe('print-looks-different-from-screen')
    expect(top('design brief example')[0]).toBe('design-brief-example')
    expect(top('how to get client feedback on design')[0]).toBe('get-client-feedback-you-can-act-on')
    expect(top('instagram story safe zone')[0]).toBe('social-media-sizes-and-safe-zones')
    expect(top('social media sizes')).toContain('social-media-sizes-and-safe-zones')
    expect(top('switching from photoshop')[0]).toBe('coming-from-photoshop')
    expect(top('brand colour palette')).toContain('brand-colour-palette-that-passes-contrast')
    expect(top('accessible brand colours')[0]).toBe('brand-colour-palette-that-passes-contrast')
    expect(top('what dpi should a poster be')[0]).toBe('what-dpi-should-a-poster-be')
    expect(top('a2 poster size in pixels')[0]).toBe('what-dpi-should-a-poster-be')
    expect(top('rgb or cmyk for print')[0]).toBe('rgb-or-cmyk-for-print')
    expect(top('poster design rules')[0]).toBe('poster-design-rules')
    expect(top('how big should text be on a poster')[0]).toBe('poster-design-rules')
    expect(top('poster without images')[0]).toBe('design-a-poster-with-no-photo')
    expect(top('offline design software')[0]).toBe('offline-design-software')
    expect(top('what happens to my files if i cancel creative cloud')[0]).toBe('leaving-creative-cloud-checklist')
    expect(top('comic book effect')[0]).toBe('make-a-comic-book-effect')
    expect(top('halftone for screen printing')[0]).toBe('halftone-for-screen-printing-and-dtf')
    expect(top('what lpi for screen printing')[0]).toBe('halftone-for-screen-printing-and-dtf')
    expect(top('open psd file online free')[0]).toBe('open-a-psd-file-online-free')
    expect(top('psd viewer online')[0]).toBe('open-a-psd-file-online-free')
    expect(top('how to fix a blurry image')[0]).toBe('fix-a-blurry-image')
    expect(top('psd not opening')[0]).toBe('psd-will-not-open')
    expect(top('psd to png')[0]).toBe('convert-psd-to-png')
    expect(top('missing font in psd')[0]).toBe('missing-fonts-in-a-psd')
    expect(top('crop image into circle')[0]).toBe('crop-an-image-into-a-circle')
    expect(top('transparent png')[0]).toBe('make-a-transparent-png')
    expect(top('how to outline text')[0]).toBe('outline-text')
    expect(top('curved text')[0]).toBe('put-text-on-a-path')
    expect(top('youtube thumbnail size')[0]).toBe('youtube-thumbnail-size')
    expect(top('file naming convention for designers')[0]).toBe('file-naming-and-versioning-for-design-work')
    expect(top('resize image without losing quality')[0]).toBe('resize-an-image-without-losing-quality')
    expect(top('is my image big enough to print')[0]).toBe('check-if-an-image-is-big-enough-to-print')
    expect(top('instagram photo blurry after upload')[0]).toBe('social-images-blurry-after-upload')
    expect(top('pixelated vs blurry')[0]).toBe('pixelated-or-blurry')
    expect(top('newspaper photo effect')[0]).toBe('make-a-newspaper-photo-effect')
    expect(top('vintage photo effect')[0]).toBe('make-a-vintage-photo-effect')
    expect(top('photo to sketch')[0]).toBe('turn-a-photo-into-a-sketch')
    expect(top('pixel sort')[0]).toBe('pixel-sorting-explained')
    expect(top('film grain effect')[0]).toBe('add-film-grain')
    expect(top('crt effect')[0]).toBe('make-a-crt-effect')
  })
  it('returns nothing for noise', () => {
    expect(searchLearn('zzzz qqqq', index)).toEqual([])
  })
})
