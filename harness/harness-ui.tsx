// C1 UI evidence harness: mounts the REAL production components (Stage with
// FloatingBar, PropertiesPanel with C1 sections, AssetTray) against the REAL
// store/history/persistence modules, in a REAL browser. Only the host chrome
// (Next.js app shell) is replaced by this thin page.
import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { useEditor } from '@/editor/store'
import { Stage } from '@/editor/components/Stage'
import { PropertiesPanel } from '@/editor/components/PropertiesPanel'
import { AssetTray } from '@/editor/components/AssetTray'

function Host() {
  useEffect(() => {
    useEditor.getState().newDoc({ name: 'C1 UI evidence', width: 1080, height: 1350, background: '#ffffff' })
    ;(window as unknown as { __c1uiReady?: boolean }).__c1uiReady = true
  }, [])
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0c0c0e', color: '#eee' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', minHeight: 0 }} id="stage-host">
        <Stage />
      </div>
      <div style={{ width: 340, borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <PropertiesPanel onOpenFilters={() => {}} />
        </div>
        <div style={{ height: 320, borderTop: '1px solid #333', overflowY: 'auto' }}>
          <AssetTray />
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Host />)

// Test hooks: same shape as the production __vcAssets surface.
import { buildVoidFile, openVoidBytes, exportBoards } from '@/editor/io'
const b64encode = (buf: Uint8Array): string => {
  let s = ''
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i])
  return btoa(s)
}
const b64decode = (b64: string): Uint8Array => {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}
;(window as unknown as { __vcAssets?: unknown }).__vcAssets = {
  op: async (name: string, ...args: never[]) =>
    ((await import('@/editor/assets/ops')) as unknown as Record<string, (...a: never[]) => unknown>)[name](...args),
  saveVoid: async () => {
    const f = await buildVoidFile()
    if (!f) return null
    const buf = new Uint8Array(await f.blob.arrayBuffer())
    return { b64: b64encode(buf), len: buf.length }
  },
  openVoid: async (b64: string) => openVoidBytes(b64decode(b64)),
  exportBoard: async (format: 'png' | 'pdf') => {
    const st = useEditor.getState()
    const ids = st.doc?.frames?.length ? st.doc.frames.map(f => f.id) : ['__doc']
    const { blob } = await exportBoards({ boardIds: [ids[0]], format, scale: 1, quality: format === 'png' ? 1 : 0.92, transparent: false })
    const buf = new Uint8Array(await blob.arrayBuffer())
    return { b64: b64encode(buf), len: buf.length }
  },
  state: () => {
    const st = useEditor.getState()
    return {
      assets: Object.values((st.doc?.assets ?? {}) as Record<string, { resourceId: string; parentId: string | null; title: string }>),
      layers: st.layers.map(l => ({
        id: l.id, type: l.type, name: l.name,
        x: l.x, y: l.y,
        scaleX: (l as { scaleX?: number }).scaleX, scaleY: (l as { scaleY?: number }).scaleY, rotation: (l as { rotation?: number }).rotation,
        emptyFrame: !!(l as { emptyFrame?: boolean }).emptyFrame,
        assetId: (l as { asset?: { id?: string } }).asset?.id ?? null,
        assetParent: (l as { asset?: { parentId?: string } }).asset?.parentId ?? null,
        hasMask: !!l.mask,
        effects: (l.effects ?? []).map(e => ({ id: e.id, kind: e.kind })),
        text: (l as { text?: string }).text ?? null,
      })),
      history: st.history.map(h => h.label), historyIndex: st.historyIndex,
    }
  },
}
;(window as unknown as { __voidEditor?: unknown }).__voidEditor = useEditor
