import { beforeEach, describe, expect, it } from 'vitest'
import { staleRefsPatch, useEditor } from '../store'
import type { Doc, Group, Layer } from '../types'

const layer = (id: string, extra: Partial<Layer> = {}): Layer => ({ id, name: id, type: 'shape', shape: 'rect', w: 10, h: 10, fill: '#000', stroke: null, strokeWidth: 0, radius: 0, visible: true, locked: false, opacity: 1, blend: 'source-over', x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: true, rev: 1, ...extra } as Layer)
const doc = (frames: string[] = []): Doc => ({ id: 'd', name: 'D', width: 100, height: 100, background: null, ...(frames.length ? { frames: frames.map((id, i) => ({ id, name: id, x: i * 200, y: 0, width: 100, height: 100, background: '#fff' })) } : {}) })
const group = (id: string): Group => ({ id, name: id, visible: true, opacity: 1, collapsed: false, parentId: null })

const base = (p: Partial<Parameters<typeof staleRefsPatch>[0]> = {}) => ({ doc: doc(['f1']), layers: [layer('A', { frameId: 'f1' }), layer('B', { frameId: 'f1' })], groups: [] as Group[], selectedIds: ['A', 'B'], activeId: 'B', keyObjectId: null, isolatedGroupId: null, editingTextId: null, activeFrameId: 'f1', drawInsideId: null, refineLayerId: null, ...p })

describe('staleRefsPatch', () => {
  it('returns null when every reference is live', () => {
    expect(staleRefsPatch(base())).toBeNull()
  })
  it('drops a deleted selected layer and keeps the rest in order', () => {
    const p = staleRefsPatch(base({ layers: [layer('A', { frameId: 'f1' })] }))
    expect(p?.selectedIds).toEqual(['A'])
    expect(p?.activeId).toBe('A')
  })
  it('clears the active layer and key object when the selection empties', () => {
    const p = staleRefsPatch(base({ layers: [], selectedIds: ['A'], activeId: 'A', keyObjectId: 'A' }))
    expect(p).toMatchObject({ selectedIds: [], activeId: null, keyObjectId: null })
  })
  it('clears a key object that is no longer selected', () => {
    expect(staleRefsPatch(base({ selectedIds: ['A'], activeId: 'A', keyObjectId: 'B' }))?.keyObjectId).toBeNull()
  })
  it('clears deleted raster refine, draw-inside and text edit targets', () => {
    const p = staleRefsPatch(base({ layers: [], refineLayerId: 'R', drawInsideId: 'R', editingTextId: 'T' }))
    expect(p).toMatchObject({ refineLayerId: null, drawInsideId: null, editingTextId: null })
  })
  it('clears an isolated group that no longer exists', () => {
    expect(staleRefsPatch(base({ isolatedGroupId: 'G' }))?.isolatedGroupId).toBeNull()
    expect(staleRefsPatch(base({ isolatedGroupId: 'G', groups: [group('G')] }))).toBeNull()
  })
  it('moves a removed board to the first remaining board', () => {
    expect(staleRefsPatch(base({ activeFrameId: 'gone' }))?.activeFrameId).toBe('f1')
    expect(staleRefsPatch(base({ activeFrameId: 'gone', doc: doc() }))?.activeFrameId).toBeNull()
  })
})

describe('useEditor writes reconcile selection', () => {
  beforeEach(() => {
    useEditor.setState({ ...base(), history: [], historyIndex: -1, snapshots: [], dirty: false } as any)
  })

  it('an external setState that removes a selected layer leaves no phantom selection', () => {
    useEditor.setState({ layers: [layer('A', { frameId: 'f1' })] } as any)
    const s = useEditor.getState()
    expect(s.selectedIds).toEqual(['A'])
    expect(s.activeId).toBe('A')
  })

  it('removeLayer through an action drops the removed layer from selection', () => {
    useEditor.getState().removeLayer('B')
    const s = useEditor.getState()
    expect(s.layers.map(l => l.id)).toEqual(['A'])
    expect(s.selectedIds).toEqual(['A'])
    expect(s.activeId).toBe('A')
  })

  it('leaves selection alone when an unrelated field changes', () => {
    const before = useEditor.getState().selectedIds
    useEditor.setState({ tool: 'brush' } as any)
    expect(useEditor.getState().selectedIds).toBe(before)
  })
})
