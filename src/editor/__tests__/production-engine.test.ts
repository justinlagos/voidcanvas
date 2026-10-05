import { describe, expect, it } from 'vitest'
import { RenderGraph, tileCacheKey } from '../render-graph'
import { TileResidency, renderTileKey } from '../gpu-compositor'

describe('Phase 9 production engine foundations', () => {
  it('invalidates only tiles touched by a changed dependency chain', () => {
    const g = new RenderGraph()
    g.upsert({ id: 'photo', kind: 'layer', rev: 1, bounds: { x: 0, y: 0, w: 900, h: 900 }, deps: [] })
    g.upsert({ id: 'group', kind: 'group', rev: 1, bounds: { x: 0, y: 0, w: 1500, h: 900 }, deps: ['photo'] })
    g.upsert({ id: 'other', kind: 'layer', rev: 1, bounds: { x: 2000, y: 0, w: 500, h: 500 }, deps: [] })
    const dirty = g.dirtyTiles('photo', 3000, 2000, 1024)
    expect(dirty.map(t => t.key).sort()).toEqual(['0:0', '1:0'])
    expect(dirty.every(t => t.reason !== 'other')).toBe(true)
  })

  it('evicts least-recently-used tiles by residency budget', () => {
    const disposed: string[] = []
    const c = new TileResidency<string>(2, Infinity, v => disposed.push(v))
    c.set('a', 'A'); c.set('b', 'B'); expect(c.get('a')).toBe('A')
    c.set('c', 'C')
    expect(c.get('b')).toBeUndefined()
    expect(c.get('a')).toBe('A')
    expect(c.get('c')).toBe('C')
    expect(disposed).toEqual(['B'])
  })

  it('evicts by byte budget as well as tile count', () => {
    const c = new TileResidency<string>(10, 100)
    c.set('a', 'A', 70); c.set('b', 'B', 50)
    expect(c.size).toBe(1)
    expect(c.bytes).toBe(50)
    expect(c.get('b')).toBe('B')
  })

  it('uses one stable key across compositor and scratch tiers', () => {
    const tile = { x: 0, y: 0, w: 1024, h: 1024, key: '0:0' }
    expect(renderTileKey({ projectId: 'p1', tile, scale: 0.5, revision: 7 })).toBe(tileCacheKey('p1', tile, 0.5, 7))
    expect(tileCacheKey('p1', tile, 0.5, 7)).not.toBe(tileCacheKey('p1', tile, 1, 7))
    expect(tileCacheKey('p1', tile, 1, 7)).not.toBe(tileCacheKey('p1', tile, 1, 8))
  })
})
