import { describe, expect, it } from 'vitest'
import { buildBrand, initialTokens, resolve } from '@/studio/brand/tokens'
import { DEFAULT_PAGES } from '@/studio/brand-pages'
import { composeRuntimePages } from './runtime'

const brand = buildBrand(resolve({ ...initialTokens(), name: 'Runtime Brand', personality: 2, salt: 3, layoutSalt: 1 }))

describe('Brand V2 production composition adapter', () => {
  it('preserves visible page order while composing default pages through the IR', () => {
    const pages = [...DEFAULT_PAGES]
    const result = composeRuntimePages({ brand, logo: null, pages, salt: 3, layoutSalt: 1 })
    const visible = pages.map((p, i) => ({ p, i })).filter(({ p }) => p.on)
    expect(result.irByIndex.size + result.legacyIndexes.size).toBe(visible.length)
    for (const { p, i } of visible) expect(result.irByIndex.get(i)?.kind ?? p.kind).toBe(p.kind)
  })

  it('keeps an explicit non-zero legacy layout choice on the legacy renderer', () => {
    const pages = DEFAULT_PAGES.map((p, i) => i === 1 ? { ...p, variant: 1 } : p)
    const result = composeRuntimePages({ brand, logo: null, pages, salt: 3, layoutSalt: 1 })
    expect(result.legacyIndexes.has(1)).toBe(true)
    expect(result.irByIndex.has(1)).toBe(false)
  })

  it('changes default structural choices when layout salt changes without changing page order', () => {
    const a = composeRuntimePages({ brand, logo: null, pages: DEFAULT_PAGES, salt: 3, layoutSalt: 1 })
    const b = composeRuntimePages({ brand, logo: null, pages: DEFAULT_PAGES, salt: 3, layoutSalt: 9 })
    const aIds = Array.from(a.irByIndex.values()).map((p) => p.genome.compositionId)
    const bIds = Array.from(b.irByIndex.values()).map((p) => p.genome.compositionId)
    expect(aIds.length).toBe(bIds.length)
    expect(aIds.join('|')).not.toBe(bIds.join('|'))
  })
})
