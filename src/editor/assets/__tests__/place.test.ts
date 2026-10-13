import { describe, expect, it } from 'vitest'
import { coverFit, lineageForLayer } from '../place'

describe('C1.3 placement math', () => {
  it('cover fills and crops the frame box', () => {
    const r = coverFit({ x: 0, y: 0, width: 1080, height: 1350 }, 800, 600, 'cover')
    expect(r.scale).toBeCloseTo(Math.max(1080 / 800, 1350 / 600))
    expect(r.x + 800 * r.scale).toBeGreaterThanOrEqual(1080 - 1)
  })
  it('contain fits inside without cropping', () => {
    const r = coverFit({ x: 0, y: 0, width: 1080, height: 1350 }, 800, 600, 'contain')
    expect(r.scale).toBeCloseTo(Math.min(1080 / 800, 1350 / 600))
    expect(r.x).toBeGreaterThanOrEqual(0)
  })
  it('lineage walks parents to the original', () => {
    const reg = {
      a: { resourceId: 'a', parentId: null },
      b: { resourceId: 'b', parentId: 'a' },
      c: { resourceId: 'c', parentId: 'b' },
    }
    expect(lineageForLayer(reg, 'c')).toEqual(['a', 'b', 'c'])
  })
})
