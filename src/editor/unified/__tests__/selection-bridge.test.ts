import { describe, expect, it } from 'vitest'
import { layersForSelection, selectionKey, stableSelection, transformPatches } from '../selection-bridge'
import type { Layer } from '../../types'

const layer = (id: string, locked = false): Layer => ({ id, name: id, type: 'shape', x: 1, y: 2, locked } as unknown as Layer)

describe('B02 selection bridge (no parallel store)', () => {
  it('keeps stable identity independent of order source', () => {
    const a = stableSelection(['L1', 'L2'], 'L1', null, 'F1')
    const b = stableSelection(['L2', 'L1'], 'L1', null, 'F1')
    expect(selectionKey(a)).toBe(selectionKey(b))
  })
  it('resolves layers without copying state', () => {
    const layers = [layer('L1'), layer('L2')]
    expect(layersForSelection(layers, stableSelection(['L2'], 'L2', null, null)).map(l => l.id)).toEqual(['L2'])
  })
  it('skips locked layers in transform patches (one undo step by caller)', () => {
    const out = transformPatches([layer('A'), layer('B', true)], 5, -3)
    expect(out.map(o => o.id)).toEqual(['A'])
    expect(out[0].patch).toMatchObject({ x: 6, y: -1 })
  })
})
