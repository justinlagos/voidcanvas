import { describe, expect, it } from 'vitest'
import { buildMixedDoc, consecutiveEditOrder } from '../mixed-media'
import { toNodeRefs, validateRefs } from '../graph-adapter'
import { previewExportMatch } from '../diff-harness'

describe('B04 mixed-media reference (one document, one selection, one undo)', () => {
  it('holds vector + raster(mask) + type with stable ids across save/reopen', () => {
    const { doc, layers, groups } = buildMixedDoc()
    expect(layers.map(l => l.id)).toEqual(consecutiveEditOrder())
    const reopened = JSON.parse(JSON.stringify({ doc, layers, groups }))
    expect(reopened.layers.map((l: { id: string }) => l.id)).toEqual(['vec-badge', 'img-photo', 'txt-headline'])
    expect(validateRefs(toNodeRefs(reopened.doc, reopened.layers, reopened.groups)).dangling).toEqual([])
    expect(layers.find(l => l.id === 'img-photo')).toMatchObject({ hasMask: true, role: 'image' })
  })
  it('renders preview/export consistently in the harness', () => {
    expect(previewExportMatch(
      { boardWidth: 1080, boardHeight: 1350, fxLongSide: 1350, scale: 1, expectedGrain: 10 },
      { boardWidth: 1080, boardHeight: 1350, fxLongSide: 1350, scale: 2, expectedGrain: 10 },
    )).toBe(true)
  })
})
