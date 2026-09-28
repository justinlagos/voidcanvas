import { describe, expect, it } from 'vitest'
import { checkInvariants, type CheckedState } from '../invariants'
import type { Doc, Group, Layer } from '../types'

const layer = (id: string, extra: Partial<Layer> = {}): Layer => ({ id, name: id, type: 'shape', shape: 'rect', w: 10, h: 10, fill: '#000', stroke: null, strokeWidth: 0, radius: 0, visible: true, locked: false, opacity: 1, blend: 'source-over', x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: true, rev: 1, ...extra } as Layer)
const doc = (frames: string[] = []): Doc => ({ id: 'd', name: 'D', width: 100, height: 100, background: null, ...(frames.length ? { frames: frames.map((id, i) => ({ id, name: id, x: i * 200, y: 0, width: 100, height: 100, background: '#fff' })) } : {}) })
const state = (p: Partial<CheckedState>): CheckedState => ({ doc: doc(), layers: [], groups: [], activeId: null, selectedIds: [], activeFrameId: null, history: [1], historyIndex: 0, ...p })

describe('design invariants', () => {
  it('passes a sound design', () => {
    const g: Group = { id: 'g', name: 'G', visible: true, opacity: 1, collapsed: false, parentId: null }
    expect(checkInvariants(state({ doc: doc(['a', 'b']), activeFrameId: 'b', groups: [g], layers: [layer('1', { frameId: 'a' }), layer('2', { frameId: 'a', groupId: 'g' }), layer('3', { frameId: 'b', groupId: 'g' }), layer('4', { clipId: '3', frameId: 'b' })], activeId: '4', selectedIds: ['4'] }))).toEqual([])
  })
  it('finds layers on a board that is gone, and a dead active board', () => {
    const r = checkInvariants(state({ doc: doc(['a']), activeFrameId: 'x', layers: [layer('1', { frameId: 'x' })] }))
    expect(r.some(m => /board that does not exist/.test(m))).toBe(true)
    expect(r).toContain('the active board does not exist')
  })
  it('finds dangling clips, groups and selections', () => {
    const r = checkInvariants(state({ layers: [layer('1', { clipId: 'zz', groupId: 'nope' })], activeId: 'q', selectedIds: ['q'] }))
    expect(r.join('|')).toMatch(/clipped to a layer that does not exist/)
    expect(r.join('|')).toMatch(/group that does not exist/)
    expect(r).toContain('the active layer does not exist')
  })
  it('finds a group split in the stack and duplicate ids', () => {
    const g: Group = { id: 'g', name: 'G', visible: true, opacity: 1, collapsed: false, parentId: null }
    const r = checkInvariants(state({ groups: [g], layers: [layer('1', { groupId: 'g' }), layer('2'), layer('3', { groupId: 'g' }), layer('3')] }))
    expect(r.join('|')).toMatch(/split in the layer stack/)
    expect(r.join('|')).toMatch(/share the id 3/)
  })
  it('finds an undo position outside the history', () => {
    expect(checkInvariants(state({ history: [1, 2], historyIndex: 5 }))).toContain('the undo position is outside the history')
  })
})
