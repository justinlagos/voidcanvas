import { describe, expect, it } from 'vitest'
import { buildStageGraph, StageTileEngine } from '../stage-production'
import type { Doc, Group, Layer } from '../types'

const doc: Doc = {
  id: 'doc', name: 'Campaign', width: 3000, height: 2000, background: '#fff',
  frames: [{ id: 'board', name: 'Board', x: 0, y: 0, width: 2000, height: 1200, background: '#fff' }],
}

const raster = (id: string, x: number, groupId: string | null = null): Layer => ({
  id, name: id, type: 'raster', visible: true, locked: false, opacity: 1, blend: 'source-over',
  x, y: 100, scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: true, groupId,
  rev: 1, frameId: 'board', canvas: Object.assign({ width: 400, height: 300 }, {}) as HTMLCanvasElement,
})

describe('Stage production engine', () => {
  it('builds layer → nested group → board → document dependencies', () => {
    const groups: Group[] = [
      { id: 'outer', name: 'Outer', visible: true, opacity: 1, collapsed: false },
      { id: 'inner', name: 'Inner', visible: true, opacity: 1, collapsed: false, parentId: 'outer' },
    ]
    const layers = [raster('photo', 100, 'inner')]
    const { graph } = buildStageGraph(doc, layers, groups)
    expect(graph.affected('photo').map(x => x.id)).toEqual(['photo', 'inner', 'outer', 'board', 'doc'])
  })

  it('keeps unrelated board content out of a local dependency chain', () => {
    const second: Doc = { ...doc, width: 5000, frames: [
      doc.frames![0],
      { id: 'board2', name: 'Board 2', x: 3000, y: 0, width: 1000, height: 1000, background: '#fff' },
    ] }
    const a = raster('a', 100); const b = { ...raster('b', 3100), frameId: 'board2' }
    const { graph } = buildStageGraph(second, [a, b], [])
    expect(graph.affected('a').map(x => x.id)).toEqual(['a', 'board', 'doc'])
    expect(graph.affected('a').some(x => x.id === 'b' || x.id === 'board2')).toBe(false)
  })

  it('uses the document render budget for Stage residency', () => {
    const normal = new StageTileEngine<string>('p', 1920, 1080, 1)
    const huge = new StageTileEngine<string>('p2', 30000, 20000, 2)
    expect(huge.budget.maxResidentTiles).toBeLessThan(normal.budget.maxResidentTiles)
    expect(huge.resident.maxTiles).toBe(huge.budget.maxResidentTiles)
  })

  it('stores and retrieves a resident tile by the shared cache identity', () => {
    const engine = new StageTileEngine<string>('p', 2000, 2000, 1)
    const request = { tile: { x: 0, y: 0, w: 1024, h: 1024, key: '0:0' }, scale: 1, revision: 3 }
    engine.put(request, 'tile', 4)
    expect(engine.get(request)).toBe('tile')
    expect(engine.key(request)).toContain('p:0:0:1000:3')
  })
})
