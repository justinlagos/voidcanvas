import { describe, expect, it } from 'vitest'
import { DEFAULT_PAGES, PAGE_DEFS } from '../../brand-pages'
import { initialTokens } from '../tokens'

describe('Brand Guidelines V2 Phase 0 structural baseline', () => {
  it('records the current page-kind and composition ceiling before the IR migration', () => {
    const kinds = Object.keys(PAGE_DEFS)
    const variants = Object.values(PAGE_DEFS).map((d) => d.variants.length)

    expect(kinds).toHaveLength(16)
    expect(variants.reduce((sum, n) => sum + n, 0)).toBe(23)
    expect(variants.filter((n) => n === 1)).toHaveLength(10)
    expect(DEFAULT_PAGES).toHaveLength(15)
    expect(DEFAULT_PAGES.every((p) => p.variant === 0 && p.on)).toBe(true)
  })

  it('records the three current art directions and default-blue achromatic fallback', () => {
    const tokens = initialTokens()
    expect(tokens.direction.value).toBe('editorial')
    expect(tokens.brandColor).toBe('#3d5afe')
  })
})
