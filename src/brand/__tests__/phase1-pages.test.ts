import { describe, expect, it } from 'vitest'
import { buildBrand, initialTokens, resolve } from '@/studio/brand/tokens'
import {
  composeLegacyClearSpace,
  composeLegacyColour,
  composeLegacyCover,
} from '@/brand/compose/phase1-pages'
import { lint, paintHtml } from '@/brand/compose'

const tokens = initialTokens()
tokens.name = 'Kite Studio'
tokens.tagline = 'Make it visible'
tokens.brandColor = '#e31f26'
tokens.direction = { value: 'graphic', locked: true }
const brand = buildBrand(resolve(tokens))
const env = {
  brand,
  orientation: 'landscape' as const,
  pageNo: 4,
  pageCount: 15,
  year: 2026,
  logoAspect: 1.35,
}

describe('Brand Guidelines V2 Phase 1 page compositions', () => {
  it('expresses the current cover as semantic IR', () => {
    const page = composeLegacyCover(env)
    expect(page.kind).toBe('cover')
    expect(page.genome.compositionId).toBe('legacy/cover/art-direction')
    expect(page.nodes.some((node) => node.id === 'cover-title' && node.t === 'text')).toBe(true)
    expect(page.nodes.some((node) => node.id === 'cover-logo' && node.t === 'logo')).toBe(true)
    expect(page.nodes.some((node) => node.id === 'cover-secondary-block' && node.t === 'frame')).toBe(true)
  })

  it('keeps colour values as structured content instead of page pixels', () => {
    const page = composeLegacyColour(env)
    expect(page.kind).toBe('colour')
    expect(page.nodes.filter((node) => node.id.endsWith('-swatch')).length).toBe(3)
    expect(page.nodes.some((node) => node.t === 'device' && node.kind === 'usage-ratio')).toBe(true)
    const html = paintHtml(page, { brand })
    expect(html).toContain('Colour')
    expect(html).toContain(brand.roles[0].hex)
  })

  it('keeps the clear-space blueprint semantic and tied to the measured mark aspect', () => {
    const page = composeLegacyClearSpace(env)
    expect(page.kind).toBe('clearspace')
    expect(page.genome.parameters?.logoAspect).toBe(1.35)
    expect(page.nodes.some((node) => node.id === 'clearspace-blueprint-panel' && node.t === 'frame')).toBe(true)
    expect(page.nodes.some((node) => node.t === 'device' && node.kind === 'dimension-h')).toBe(true)
    const findings = lint(page, brand)
    expect(findings.some((finding) => finding.code === 'invalid-rect')).toBe(false)
  })
})
