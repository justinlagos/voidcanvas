import { describe, expect, it } from 'vitest'
import { lintPage, lintPasses } from './lint'
import { paintHtml, type HtmlResolver } from './paint-html'
import type { Page } from './types'

const page: Page = {
  kind: 'cover',
  width: 1600,
  height: 900,
  background: { hex: '#ffffff' },
  genome: {
    compositionId: 'baseline-cover',
    grid: '12-col',
    axis: 'left',
    marginRatio: 0.06,
    typeTreatment: 'display-left',
    colourBlocking: 'none',
    devices: [],
    density: 0.4,
    parameters: {},
  },
  nodes: [
    {
      t: 'text',
      id: 'name',
      rect: { x: 100, y: 160, w: 900, h: 180 },
      style: { family: 'heading', size: 96, weight: 700, lineHeight: 1.05 },
      text: 'Òké & Co',
      align: 'left',
      color: { hex: '#111111' },
      fit: 'shrink',
      source: 'designer',
    },
  ],
}

const htmlResolver: HtmlResolver = {
  colour: (paint) => ('hex' in paint ? paint.hex : '#000000'),
  font: () => 'Inter',
}

describe('Brand Guidelines layout IR', () => {
  it('renders semantic, escaped HTML with composition metadata', () => {
    const html = paintHtml(page, htmlResolver)
    expect(html).toContain('data-brand-page="cover"')
    expect(html).toContain('data-composition="baseline-cover"')
    expect(html).toContain('Òké &amp; Co')
    expect(html).toContain('data-source="designer"')
  })

  it('passes a clean layout and preserves explicit glyph checks', () => {
    const findings = lintPage(page, {
      textContrast: () => 12,
      glyphsLoaded: () => true,
    })
    expect(lintPasses(findings)).toBe(true)
  })

  it('rejects page overflow, small text, low contrast and fallback glyphs', () => {
    const bad: Page = {
      ...page,
      nodes: [
        {
          t: 'text',
          id: 'bad-copy',
          rect: { x: 1590, y: 890, w: 100, h: 50 },
          style: { family: 'body', size: 6, weight: 400, lineHeight: 1.4 },
          text: 'Ọ̀nà ɓ ɗ ƙ',
          align: 'left',
          color: { hex: '#777777' },
          fit: 'wrap',
          source: 'suggested',
        },
      ],
    }
    const findings = lintPage(bad, {
      textContrast: () => 2.1,
      glyphsLoaded: () => false,
    })
    expect(lintPasses(findings)).toBe(false)
    expect(findings.map((f) => f.id)).toEqual(
      expect.arrayContaining(['bounds', 'min-type-size', 'contrast', 'font-fallback']),
    )
  })
})