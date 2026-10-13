import React, { createElement } from 'react'
;(globalThis as never as { React: unknown }).React = React
// NOTE: zustand's useSyncExternalStore returns the creation-time snapshot
// during renderToString, so the hook subscription is exercised in the browser
// (standard behaviour the whole app relies on). Here we derive the binding
// from live getState() and render the real View, then drive the real store.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import { useEditor } from '../../store'
import { describeSelection } from '../binding-describe'
import { commitOpacityEdit, UnifiedContextView } from '../UnifiedContextSection'
import type { Doc, Layer } from '../../types'

vi.mock('../flags', () => ({ unifiedEnabled: () => true, unifiedSnapshot: () => ({ enabled: true }) }))

const shape = (id: string, opacity = 1): Layer => ({
  id, name: id, type: 'shape', shape: 'rect', visible: true, locked: false, opacity,
  blend: 'source-over', x: 10, y: 10, scaleX: 1, scaleY: 1, rotation: 0,
  mask: null, maskEnabled: true, rev: 1, w: 100, h: 50, fill: '#111', stroke: null, strokeWidth: 0, radius: 0,
} as unknown as Layer)

const text = (id: string): Layer => ({
  id, name: id, type: 'text', text: 'Hi', visible: true, locked: false, opacity: 1,
  blend: 'source-over', x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0,
  mask: null, maskEnabled: true, rev: 1, fontFamily: 'Arial', fontSize: 16, fontWeight: 400,
  italic: false, color: '#000', align: 'left', lineHeight: 1, letterSpacing: 0,
} as unknown as Layer)

const doc: Doc = { id: 'd', name: 't', width: 800, height: 600, background: '#fff' }

function liveBinding() {
  const st = useEditor.getState()
  const active = st.layers.find(l => l.id === st.activeId) ?? null
  return {
    desc: describeSelection({
      layers: st.layers, selectedIds: st.selectedIds, activeId: st.activeId, keyObjectId: st.keyObjectId,
      frameId: st.activeFrameId, boardCount: st.doc?.frames?.length ?? 0,
      inGroup: !!active?.groupId, editingMask: st.editingMask,
      editingText: st.editingTextId === st.activeId, tool: st.tool,
    }),
    opacity: active?.opacity ?? 1,
  }
}

beforeEach(() => {
  useEditor.setState({
    doc, layers: [shape('S1'), text('T1')], groups: [], activeId: 'S1', selectedIds: ['S1'],
    tool: 'move', editingMask: false, editingTextId: null, history: [], historyIndex: -1,
  } as never)
  useEditor.getState().commit('Open') // baseline snapshot, as loadProject/newDoc do
})

describe('B.1 panel integration (live store, real transactions)', () => {
  it('renders shape context from the real selection', () => {
    const { desc, opacity } = liveBinding()
    const html = renderToString(createElement(UnifiedContextView, { binding: { enabled: true, ...desc, edit: () => undefined, select: () => undefined }, opacity, onOpacity: () => undefined }))
    expect(html).toContain('data-kind="shape"')
    expect(html).toContain('unified-cap-transform')
  })
  it('switching to text changes context without resetting document/history', () => {
    useEditor.getState().setActive('T1')
    const { desc } = liveBinding()
    const html = renderToString(createElement(UnifiedContextView, { binding: { enabled: true, ...desc, edit: () => undefined, select: () => undefined }, opacity: 1, onOpacity: () => undefined }))
    expect(html).toContain('data-kind="text"')
    expect(html).toContain('unified-cap-character')
    expect(useEditor.getState().doc?.id).toBe('d')
  })
  it('opacity edits commit through the shared transaction system with undo/redo', () => {
    commitOpacityEdit('S1', 40)
    expect(useEditor.getState().layers.find(l => l.id === 'S1')?.opacity).toBeCloseTo(0.4)
    const { desc } = liveBinding()
    const html = renderToString(createElement(UnifiedContextView, { binding: { enabled: true, ...desc, edit: () => undefined, select: () => undefined }, opacity: 0.4, onOpacity: () => undefined }))
    expect(html).toContain('value="40"')
    useEditor.getState().undo()
    expect(useEditor.getState().layers.find(l => l.id === 'S1')?.opacity).toBe(1)
    useEditor.getState().redo()
    expect(useEditor.getState().layers.find(l => l.id === 'S1')?.opacity).toBeCloseTo(0.4)
  })
})
