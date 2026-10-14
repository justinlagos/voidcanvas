import { describe, expect, it } from 'vitest'
import { layersForSelection, reconcileSelection, selectionKey, stableSelection, transformPatches } from '../selection-bridge'
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
  it('drops selected ids whose layers were deleted and keeps the survivors in order', () => {
    const sel = stableSelection(['L3', 'L1', 'GONE'], 'GONE', 'L3', null)
    const out = reconcileSelection(sel, [layer('L1'), layer('L3')])
    expect(out.ids).toEqual(['L3', 'L1'])
    expect(out.activeId).toBeNull()
    expect(out.keyObjectId).toBe('L3')
  })
  it('clears a frame id that no longer exists and keeps a live one', () => {
    const layers = [layer('L1')]
    expect(reconcileSelection(stableSelection(['L1'], 'L1', null, 'F9'), layers, ['F1']).frameId).toBeNull()
    expect(reconcileSelection(stableSelection(['L1'], 'L1', null, 'F1'), layers, ['F1']).frameId).toBe('F1')
  })
  it('returns the same object when the selection is already valid', () => {
    const sel = stableSelection(['L1'], 'L1', null, null)
    expect(reconcileSelection(sel, [layer('L1')])).toBe(sel)
  })
  it('clears everything when the document has no layers left', () => {
    const out = reconcileSelection(stableSelection(['L1', 'L2'], 'L2', 'L1', 'F1'), [])
    expect(out).toEqual({ ids: [], activeId: null, keyObjectId: null, frameId: null })
  })
  it('skips locked layers in transform patches (one undo step by caller)', () => {
    const out = transformPatches([layer('A'), layer('B', true)], 5, -3)
    expect(out.map(o => o.id)).toEqual(['A'])
    expect(out[0].patch).toMatchObject({ x: 6, y: -1 })
  })
})
