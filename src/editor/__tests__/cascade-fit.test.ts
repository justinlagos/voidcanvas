import { describe, expect, it } from 'vitest'
import { chooseFit, type Analysis, type Panel } from '../layout'

const panel = (id: string, contentWidth = 800, headline = 100): Panel => ({
  id, name: id, box: { x: 0, y: 0, w: contentWidth, h: 500 },
  content: { x: 0, y: 0, w: contentWidth, h: 500 },
  blocks: [], flexible: false, weight: 1, logo: false, headline,
})
const analysis = (panels: Panel[]): Analysis => ({
  axis: 'x', blocks: [], backgrounds: [], panels,
})

describe('Cascade strict layout policy', () => {
  it('keeps all source panels even when a tiny target makes type unreadable', () => {
    const panels = [panel('Brand'), panel('Offer'), panel('Details')]
    const result = chooseFit(analysis(panels), { w: 140, h: 120 }, undefined, { preserveAll: true })
    expect(result).not.toBeNull()
    expect(result!.panels.map(p => p.id)).toEqual(['Brand', 'Offer', 'Details'])
  })

  it('respects panels a designer explicitly excludes', () => {
    const panels = [panel('Brand'), panel('Offer'), panel('Optional')]
    const result = chooseFit(analysis(panels), { w: 1080, h: 1920 },
      p => p.id !== 'Optional', { preserveAll: true })
    expect(result!.panels.map(p => p.id)).toEqual(['Brand', 'Offer'])
  })

  it('creates layouts for image-only designs instead of silently returning empty', () => {
    const picture = (id: string): Panel => ({
      id, name: id, box: { x: 0, y: 0, w: 400, h: 400 },
      content: null, blocks: [], flexible: true, weight: 0.35, logo: false, headline: 0,
    })
    const result = chooseFit(analysis([picture('Image 1'), picture('Image 2')]),
      { w: 1080, h: 1350 }, undefined, { preserveAll: true })
    expect(result!.panels.map(p => p.id)).toEqual(['Image 1', 'Image 2'])
  })
})
