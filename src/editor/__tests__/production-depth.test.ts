import { describe, expect, it } from 'vitest'
import { sampledGradientStops } from '../gradient'
import { renderBudget, visibleTiles } from '../performance'

describe('production depth', () => {
  it('keeps opacity and moves the half-colour point to the requested midpoint', () => {
    const s = sampledGradientStops([
      { position: 0, color: '#000000', opacity: 0.25, midpoint: 0.25 },
      { position: 1, color: '#ffffff', opacity: 1 },
    ])
    expect(s.length).toBeGreaterThan(10)
    expect(s[0].color).toContain('0.25')
    const near = s.reduce((a, b) => Math.abs(b.position - 0.25) < Math.abs(a.position - 0.25) ? b : a)
    expect(near.color).toMatch(/rgba\(12[78],12[78],12[78],/)
  })

  it('reduces interactive memory for huge documents without changing document size', () => {
    const normal = renderBudget(1920, 1080, 2)
    const huge = renderBudget(30000, 20000, 2)
    expect(huge.large).toBe(true)
    expect(huge.overviewMaxEdge).toBeLessThan(normal.overviewMaxEdge)
    expect(huge.sharpMaxPixels).toBeLessThan(normal.sharpMaxPixels)
  })

  it('tiles only the visible document region', () => {
    const tiles = visibleTiles({ x: 900, y: 900, w: 1400, h: 1400 }, 10000, 10000, 1024)
    expect(tiles.length).toBe(9)
    expect(tiles.every(t => t.w <= 1024 && t.h <= 1024)).toBe(true)
  })
})
