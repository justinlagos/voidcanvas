import { describe, expect, it } from 'vitest'
import { buildBrand, initialTokens, resolve } from '@/studio/brand/tokens'
import { brandPaint } from './brand-resolver'
import { composeClearSpace, composeColour, composeCover } from './compat-pages'

const brand = buildBrand(
  resolve({
    ...initialTokens(),
    name: 'Òké',
    tagline: 'Ìmọ̀, azụ, ɓurƙasa',
    brandColor: '#94c11f',
    salt: 3,
    layoutSalt: 2,
  }),
)

const context = {
  brand,
  orientation: 'landscape' as const,
  pageNo: 1,
  pageCount: 15,
  logoAspect: 3.2,
  year: 2026,
}

describe('Brand Guidelines compatibility composers', () => {
  it('resolves semantic Brand paint roles from the existing token system', () => {
    expect(brandPaint(brand, { role: 'brand' })).toBe(brand.roles[0].hex)
    expect(brandPaint(brand, { role: 'brand', step: 700 })).toBe(brand.roles[0].ramp[700])
    expect(brandPaint(brand, { role: 'ink' })).toBe(brand.surfaces.inkOnLight)
    expect(brandPaint(brand, { hex: '#112233' })).toBe('#112233')
  })

  it('composes the cover as semantic IR with the real brand name and logo slot', () => {
    const page = composeCover(context)
    expect(page.kind).toBe('cover')
    expect(page.width).toBe(1600)
    expect(page.height).toBe(900)
    expect(page.genome.compositionId).toContain('compat-cover-')
    expect(page.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ t: 'logo', id: 'primary-logo' }),
        expect.objectContaining({ t: 'text', id: 'brand-name', text: 'Òké' }),
        expect.objectContaining({ t: 'text', id: 'tagline', text: 'Ìmọ̀, azụ, ɓurƙasa' }),
      ]),
    )
  })

  it('keeps colour values as real swatches and copy-ready specification text', () => {
    const page = composeColour({ ...context, pageNo: 7 })
    const swatches = page.nodes.filter((node) => node.t === 'swatch')
    expect(swatches).toHaveLength(3)
    expect(swatches.map((node) => node.t === 'swatch' && node.paint)).toEqual(
      brand.roles.map((role) => ({ hex: role.hex, alpha: undefined })),
    )
    const text = page.nodes
      .filter((node) => node.t === 'text')
      .map((node) => (node.t === 'text' ? node.text : ''))
      .join('\n')
    expect(text).toContain(`HEX ${brand.roles[0].hex.toUpperCase()}`)
    expect(text).toContain('CMYK values are approximate')
  })

  it('derives clear-space geometry from the mark aspect and existing logo rule', () => {
    const page = composeClearSpace({ ...context, pageNo: 4 })
    const logo = page.nodes
      .flatMap((node) => (node.t === 'frame' ? node.children : [node]))
      .find((node) => node.t === 'logo')
    const zone = page.nodes
      .flatMap((node) => (node.t === 'frame' ? node.children : [node]))
      .find((node) => node.t === 'device' && node.kind === 'clearspace-zone')
    expect(logo).toBeTruthy()
    expect(zone).toBeTruthy()
    if (logo?.t === 'logo') expect(logo.rect.w / logo.rect.h).toBeCloseTo(3.2, 4)
    if (zone?.t === 'device') expect(zone.params.unit).toBeGreaterThan(0)
  })
})
