import { beforeEach, describe, expect, it } from 'vitest'
import { staleRefsPatch, useEditor } from '../store'
import type { Doc, Group, Layer } from '../types'

const layer = (id: string, extra: Partial<Layer> = {}): Layer => ({ id, name: id, type: 'shape', shape: 'rect', w: 10, h: 10, fill: '#000', stroke: null, strokeWidth: 0, radius: 0, visible: true, locked: false, opacity: 1, blend: 'source-over', x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: true, rev: 1, ...extra } as Layer)
const rasterLayer = (id: string, extra: Partial<Layer> = {}): Layer => ({ id, name: id, type: 'raster', canvas: { width: 10, height: 10 } as unknown as HTMLCanvasElement, visible: true, locked: false, opacity: 1, blend: 'source-over', x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: true, rev: 1, ...extra } as Layer)
const doc = (frames: string[] = []): Doc => ({ id: 'd', name: 'D', width: 100, height: 100, background: null, ...(frames.length ? { frames: frames.map((id, i) => ({ id, name: id, x: i * 200, y: 0, width: 100, height: 100, background: '#fff' })) } : {}) })
const group = (id: string, parentId: string | null = null): Group => ({ id, name: id, visible: true, opacity: 1, collapsed: false, parentId })

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
  it('clears refineLayerId when the target layer becomes locked, pixel-locked, or non-raster', () => {
    expect(staleRefsPatch(base({ layers: [rasterLayer('R')], selectedIds: ['R'], activeId: 'R', refineLayerId: 'R' }))).toBeNull()
    expect(staleRefsPatch(base({ layers: [rasterLayer('R', { locked: true })], selectedIds: ['R'], activeId: 'R', refineLayerId: 'R' }))?.refineLayerId).toBeNull()
    expect(staleRefsPatch(base({ layers: [rasterLayer('R', { lockPixels: true })], selectedIds: ['R'], activeId: 'R', refineLayerId: 'R' }))?.refineLayerId).toBeNull()
    expect(staleRefsPatch(base({ layers: [layer('R', { type: 'shape' })], selectedIds: ['R'], activeId: 'R', refineLayerId: 'R' }))?.refineLayerId).toBeNull()
  })
  it('clears transform, vmaskEditId, and activePathId when their targets are gone', () => {
    const p = staleRefsPatch({
      ...base({ layers: [layer('A')] }),
      transform: { layerId: 'GONE', mode: 'free', quad: [], grid: null, origin: [] },
      vmaskEditId: 'GONE',
      activePathId: 'p-gone',
    })
    expect(p).toMatchObject({ transform: null, vmaskEditId: null, activePathId: null })
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

describe('useEditor writes reconcile selection across live editor operations', () => {
  beforeEach(() => {
    useEditor.setState({ ...base(), history: [], historyIndex: -1, snapshots: [], dirty: false } as any)
    useEditor.getState().commit('Initial')
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

  it('handles multi-selection, grouping, nested grouping, ungrouping and undo/redo cleanly', () => {
    useEditor.setState({
      layers: [layer('A', { frameId: 'f1' }), layer('B', { frameId: 'f1' }), layer('C', { frameId: 'f1' })],
      selectedIds: ['A', 'B'],
      activeId: 'B',
      keyObjectId: 'A',
    } as any)
    useEditor.getState().groupSelected()
    const afterGroup = useEditor.getState()
    expect(afterGroup.groups.length).toBe(1)
    const g1 = afterGroup.groups[0].id
    expect(afterGroup.selectedIds).toEqual(['A', 'B'])
    expect(afterGroup.keyObjectId).toBe('A')

    // Nest g1 and C into an outer group
    useEditor.setState({ selectedIds: ['A', 'B', 'C'], activeId: 'C' } as any)
    useEditor.getState().groupSelected()
    const afterNest = useEditor.getState()
    expect(afterNest.groups.length).toBe(2)
    const outer = afterNest.groups.find(g => g.id !== g1)!
    expect(afterNest.groups.find(g => g.id === g1)?.parentId).toBe(outer.id)

    // Isolate inner group then ungroup it: isolatedGroupId must clear automatically
    useEditor.getState().setIsolated(g1)
    expect(useEditor.getState().isolatedGroupId).toBe(g1)
    useEditor.getState().ungroup(g1)
    expect(useEditor.getState().isolatedGroupId).toBeNull()

    // Undo restores g1; redo removes it again without leaving dangling selection
    useEditor.getState().undo()
    expect(useEditor.getState().groups.some(g => g.id === g1)).toBe(true)
    useEditor.getState().redo()
    expect(useEditor.getState().groups.some(g => g.id === g1)).toBe(false)
  })

  it('reconciles C3 refineLayerId when target is locked or document switches', () => {
    useEditor.setState({
      layers: [rasterLayer('R1', { frameId: 'f1' }), layer('A', { frameId: 'f1' })],
      selectedIds: ['R1'],
      activeId: 'R1',
      refineLayerId: 'R1',
    } as any)
    expect(useEditor.getState().refineLayerId).toBe('R1')

    // Locking the raster layer automatically exits refine mode via reconciliation
    useEditor.getState().updateLayer('R1', { locked: true }, 'Lock raster')
    expect(useEditor.getState().refineLayerId).toBeNull()

    // Unlock and re-enter, then switch documents
    useEditor.getState().updateLayer('R1', { locked: false }, 'Unlock raster')
    useEditor.getState().setRefine('R1')
    expect(useEditor.getState().refineLayerId).toBe('R1')
    useEditor.getState().loadProject(doc(['f2']), [layer('X', { frameId: 'f2' })])
    expect(useEditor.getState().refineLayerId).toBeNull()
    expect(useEditor.getState().selectedIds).toEqual(['X'])
    expect(useEditor.getState().activeId).toBe('X')
  })

  it('preserves surviving selection across applyBoards (Cascade / variant resync) and drops removed layers', () => {
    useEditor.setState({
      selectedIds: ['A', 'B'],
      activeId: 'B',
      keyObjectId: 'A',
    } as any)
    const d2 = doc(['f1', 'f2'])
    // Suppose B was on a board that got replaced, while A survived and C was added on f2
    useEditor.getState().applyBoards(d2, [layer('A', { frameId: 'f1' }), layer('C', { frameId: 'f2' })], [], 'Cascade', 'f1')
    const s = useEditor.getState()
    expect(s.selectedIds).toEqual(['A'])
    expect(s.activeId).toBe('A')
    expect(s.keyObjectId).toBe('A')
    expect(s.activeFrameId).toBe('f1')
  })

  it('leaves selection alone when an unrelated field changes', () => {
    const before = useEditor.getState().selectedIds
    useEditor.setState({ tool: 'brush' } as any)
    expect(useEditor.getState().selectedIds).toBe(before)
  })
})
