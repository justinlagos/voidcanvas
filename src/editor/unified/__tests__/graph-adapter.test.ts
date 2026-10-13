import { describe, expect, it } from 'vitest'
import { hasCycle, roundTripIds, toNodeRefs, validateRefs } from '../graph-adapter'
import { buildMixedDoc } from '../mixed-media'

describe('B03 graph adapter (no format upgrade)', () => {
  it('maps existing layers/groups/boards with stable ids', () => {
    const { doc, layers, groups } = buildMixedDoc()
    const refs = toNodeRefs(doc, layers, groups)
    expect(refs.map(r => r.nodeId).sort()).toEqual(['board-main', 'img-photo', 'txt-headline', 'vec-badge'].sort())
    expect(roundTripIds(refs)).toEqual(refs.map(r => r.nodeId))
  })
  it('flags dangling parents and duplicates, rejects cycles', () => {
    expect(validateRefs([
      { nodeId: 'A', kind: 'shape', parentId: 'missing', boardId: null, masterNodeId: null, rev: 1, role: null },
    ]).dangling).toEqual(['A->missing'])
    expect(hasCycle([
      { nodeId: 'A', kind: 'group', parentId: 'B', boardId: null, masterNodeId: null, rev: 0, role: null },
      { nodeId: 'B', kind: 'group', parentId: 'A', boardId: null, masterNodeId: null, rev: 0, role: null },
    ])).toBe(true)
  })
})
