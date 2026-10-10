import { describe, expect, it } from 'vitest'
import { chooseFit, type Analysis, type Panel } from '../layout'
import { syncFormats } from '../adapt'
import type { Doc, Layer } from '../types'

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
  it('does not reintroduce layers explicitly excluded from a linked format', () => {
    const source = { id: 'source-copy', name: 'Optional copy', type: 'text',
      frameId: 'master', text: 'Optional' } as unknown as Layer
    const doc = { id: 'test', width: 1080, height: 1080, background: null,
      frames: [
        { id: 'master', name: 'Master', x: 0, y: 0, width: 1080, height: 1080, background: null },
        { id: 'child', name: 'Story', x: 1200, y: 0, width: 1080, height: 1920,
          background: null, linkedFrom: 'master', cascadeExcludedSrcIds: ['source-copy'] },
      ] } as Doc
    const result = syncFormats(doc, [source], 'master', new Map())
    expect(result.changed).toBe(0)
    expect(result.layers).toHaveLength(1)
    expect(result.layers.some(l => l.frameId === 'child')).toBe(false)
  })
})
