import { describe, expect, it } from 'vitest'
import { buildBrand, initialTokens, resolve } from '@/studio/brand/tokens'
import { lint, paintHtml, resolvePaint, type Page } from '@/brand/compose'

const brand = buildBrand(resolve({ ...initialTokens(), name: 'Acme', brandColor: '#2155ff' }))

const genome = {
  compositionId: 'test/one',
  grid: '12-column',
  axis: 'left' as const,
  margin: 80,
  typeTreatment: 'quiet',
  colourBlocking: 'none',
  devices: [],
  density: 0.4,
}

const page = (): Page => ({
  kind: 'cover',
  size: { w: 1600, h: 900 },
  background: { role: 'paper' },
  genome,
  nodes: [
    {
      t: 'text',
      id: 'title',
      rect: { x: 100, y: 100, w: 700, h: 120 },
      text: 'Acme <Studio>',
      style: { role: 'display', size: 72, weight: 700, lineHeight: 1 },
      align: 'left',
      color: { role: 'ink' },
      fit: 'shrink',
      source: 'designer',
    },
    {
      t: 'swatch',
      id: 'brand-swatch',
      rect: { x: 100, y: 300, w: 300, h: 200 },
      role: 'brand',
      color: { role: 'brand' },
      specs: ['hex', 'rgb', 'oklch'],
      label: 'Primary',
    },
  ],
})

describe('Brand Guidelines V2 composition IR', () => {
  it('resolves semantic paints through the brand system', () => {
    expect(resolvePaint({ role: 'brand' }, brand)).toBe(brand.roles[0].hex)
    expect(resolvePaint({ role: 'neutral', step: 100 }, brand)).toBe(brand.neutral[100])
    expect(resolvePaint({ hex: '#123456' }, brand)).toBe('#123456')
  })

  it('paints semantic, escaped HTML without losing useful values', () => {
    const html = paintHtml(page(), { brand })
    expect(html).toContain('data-vc-page-kind="cover"')
    expect(html).toContain('data-vc-composition="test/one"')
    expect(html).toContain('Acme &lt;Studio&gt;')
    expect(html).toContain('data-vc-node="swatch"')
    expect(html).toContain(`data-vc-value="${brand.roles[0].hex}"`)
  })

  it('finds geometry, minimum-size and contrast failures before paint', () => {
    const bad = page()
    bad.nodes.push({
      t: 'text',
      id: 'bad-copy',
      rect: { x: 1580, y: 860, w: 100, h: 80 },
      text: 'Too small and off page',
      style: { role: 'body', size: 6 },
      align: 'left',
      color: { hex: '#ffffff' },
      fit: 'wrap',
      source: 'suggested',
    })
    const findings = lint(bad, brand)
    expect(findings.some((f) => f.code === 'outside-page' && f.nodeId === 'bad-copy')).toBe(true)
    expect(findings.some((f) => f.code === 'text-too-small' && f.nodeId === 'bad-copy')).toBe(true)
    expect(findings.some((f) => f.code === 'low-contrast' && f.nodeId === 'bad-copy')).toBe(true)
  })

  it('keeps a clean page free of attention findings', () => {
    expect(lint(page(), brand).filter((finding) => finding.level === 'attention')).toEqual([])
  })
})
