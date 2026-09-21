'use client'

import { useEffect, useState } from 'react'
import { PanelRight, X } from 'lucide-react'
import { blobToCanvas, getBrand, importFiles, openProject, saveProject, takeHandoff } from '../io'
import { useEditor } from '../store'
import type { ToolId } from '../types'
import { AddMenu } from './AddMenu'
import { CommandPalette } from './CommandPalette'
import { BrandKitDialog, ResizeDialog, ShortcutSheet, applyBrand } from './Dialogs'
import { BoardsPanel } from './BoardsPanel'
import { PrivacyPanel } from './PrivacyPanel'
import { initPrivateFromSession, isPrivate } from '../io'
import { ExportDialog } from './ExportDialog'
import { LayersPanel } from './LayersPanel'
import { OptionsBar } from './OptionsBar'
import { PropertiesPanel } from './PropertiesPanel'
import { Stage, isTyping, stageApi } from './Stage'
import { StartScreen } from './StartScreen'
import { TabBar } from './TabBar'
import { useTabs } from '../tabs'
import { ToolRail } from './ToolRail'
import { TopBar } from './TopBar'

const KEYS: Record<string, ToolId> = { v: 'move', b: 'brush', e: 'eraser', s: 'clone', j: 'heal', m: 'marquee', l: 'lasso', w: 'wand', g: 'fill', t: 'text', u: 'shape', i: 'eyedropper', c: 'crop', h: 'hand', z: 'zoom' }

export function EditorShell() {
  const hasDoc = useEditor(s => !!s.doc)
  const toast = useEditor(s => s.toast)
  const busy = useEditor(s => s.busy)
  const dirty = useEditor(s => s.dirty)
  const historyIndex = useEditor(s => s.historyIndex)
  const [modal, setModal] = useState<null | 'add' | 'filters' | 'export' | 'palette' | 'resize' | 'brand' | 'keys' | 'boards' | 'privacy'>(null)
  const [panel, setPanel] = useState(false)
  const [shownToast, setShownToast] = useState<string | null>(null)

  useEffect(() => { (window as any).__voidEditor = useEditor }, [])

  // Brand kit applies to every design. Other parts of the editor open dialogs through a window event.
  const docId = useEditor(s => s.doc?.id)
  useEffect(() => { getBrand().then(applyBrand).catch(() => {}) }, [docId])
  useEffect(() => { useTabs.getState().sync() }, [docId])
  useEffect(() => { initPrivateFromSession() }, [])
  useEffect(() => {
    const open = (e: Event) => setModal((e as CustomEvent).detail as any)
    window.addEventListener('vc:open', open)
    return () => window.removeEventListener('vc:open', open)
  }, [])
  useEffect(() => {
    const up = (e: KeyboardEvent) => { if (e.key === '\\') useEditor.setState({ compare: false }) }
    const blur = () => useEditor.setState({ compare: false })
    window.addEventListener('keyup', up); window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [])

  // Work arriving from Effects or Studio, or a saved design opened from the home screen.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const inbox = q.get('inbox'), project = q.get('project')
    if (inbox || project) window.history.replaceState(null, '', '/editor')
    if (project) { openProject(project); return }
    if (!inbox) return
    takeHandoff(inbox).then(async h => {
      if (!h) return
      const ed = useEditor.getState()
      const canvases = await Promise.all(h.images.map(i => blobToCanvas(i.blob)))
      if (h.boards && h.size && canvases.length > 1) {
        // Each image becomes its own board, each holding one image layer.
        const { buildFramedFromImages } = await import('../io')
        buildFramedFromImages(h.name, canvases, h.images.map(i => i.name), h.size, h.palette)
        ed.notify('Opened as boards. Each page is its own board; drag elements between them.')
        return
      }
      const size = h.size ?? (canvases[0] ? { width: canvases[0].width, height: canvases[0].height } : { width: 1080, height: 1350 })
      ed.newDoc({ name: h.name, ...size, background: h.from === 'studio' ? '#ffffff' : null })
      canvases.forEach((c, i) => useEditor.getState().addImage(c, c.width, c.height, h.images[i].name))
      if (h.palette?.length) { useEditor.setState({ swatches: Array.from(new Set([...h.palette, ...useEditor.getState().swatches])).slice(0, 21), fg: h.palette[0] }) }
      if (h.from === 'studio') ed.notify('Your references are in as layers and the board palette is in your colours.')
    })
  }, [])

  // Autosave
  useEffect(() => {
    if (!dirty || !hasDoc || isPrivate()) return
    const t = setTimeout(() => { saveProject().catch(() => useEditor.getState().notify('Could not save. Your browser storage may be full.')) }, 1800)
    return () => clearTimeout(t)
  }, [dirty, historyIndex, hasDoc])

  useEffect(() => {
    if (!toast) return
    setShownToast(toast.msg)
    const t = setTimeout(() => setShownToast(null), 4200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e as unknown as KeyboardEvent)) return
      const files = Array.from(e.clipboardData?.files ?? []).filter(f => f.type.startsWith('image/'))
      if (files.length) { e.preventDefault(); importFiles(files) }
    }
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || modal) return
      const s = useEditor.getState(); if (!s.doc) return
      const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase()
      const stop = () => e.preventDefault()
      if (k === '\\') { if (!s.compare) useEditor.setState({ compare: true }); return }
      if (e.key === '?') { setModal('keys'); return }
      if (mod && k === 'k') { stop(); setModal('palette'); return }
      if (mod && k === 'g') { stop(); if (e.shiftKey) { const g = s.active()?.groupId; if (g) s.ungroup(g) } else s.groupSelected(); return }
      if (mod && k === 'z') { stop(); e.shiftKey ? s.redo() : s.undo(); return }
      if (mod && k === 'y') { stop(); s.redo(); return }
      if (mod && k === 'j') { stop(); if (s.selection) s.layerFromSelection(false); else if (s.activeId) s.duplicateLayer(s.activeId); return }
      if (mod && k === 'a') { stop(); s.selectAll(); return }
      if (mod && k === 'd') { stop(); s.setSelection(null, 'Deselect'); return }
      if (mod && k === 'i' && e.shiftKey) { stop(); s.invertSelection(); return }
      if (mod && k === 'e') { stop(); setModal('export'); return }
      if (mod && k === 's') { stop(); saveProject().then(() => s.notify('Saved to this device.')); return }
      if (mod && k === '0') { stop(); stageApi.fit(); return }
      if (mod && k === '1') { stop(); stageApi.zoomTo(1); return }
      if (mod && (k === '=' || k === '+')) { stop(); stageApi.zoomBy(1.25); return }
      if (mod && k === '-') { stop(); stageApi.zoomBy(0.8); return }
      if (mod) return
      if (k === 'escape') { if (s.crop) useEditor.setState({ crop: null }); else if (s.selection) s.setSelection(null, 'Deselect'); else if (s.editingMask) s.setEditingMask(false); return }
      if (k === 'enter' && s.crop && s.crop.w > 1) { s.cropTo(s.crop.x, s.crop.y, s.crop.w, s.crop.h); useEditor.setState({ crop: null }); return }
      if (k === 'delete' || k === 'backspace') { stop(); if (s.selection) s.clearSelectionPixels(); else s.removeSelected(); return }
      if (k === 'x') { s.swapColors(); return }
      if (k === 'd') { useEditor.setState({ fg: '#111111', bg: '#ffffff' }); return }
      if (k === '[' || k === ']') {
        if (['brush', 'eraser', 'clone', 'heal'].includes(s.tool)) s.setOption('size', Math.max(1, Math.min(400, Math.round(s.options.size * (k === ']' ? 1.2 : 1 / 1.2)) + (k === ']' ? 1 : -1))))
        else if (s.activeId) s.nudgeOrder(s.activeId, k === ']' ? 1 : -1)
        return
      }
      if (k.startsWith('arrow') && s.selectedIds.length) {
        stop()
        const d = e.shiftKey ? 10 : 1
        const dx = k === 'arrowleft' ? -d : k === 'arrowright' ? d : 0, dy = k === 'arrowup' ? -d : k === 'arrowdown' ? d : 0
        for (const l of s.layers) if (s.selectedIds.includes(l.id) && !l.locked && l.type !== 'adjustment') s.updateLayer(l.id, { x: l.x + dx, y: l.y + dy })
        s.commit('Nudge')
        return
      }
      if (k === 'enter') { const l = s.active(); if (l?.type === 'text') { stop(); useEditor.setState({ editingTextId: l.id, tool: 'move' }) } return }
      if (e.shiftKey && k === 'm') { s.setTool('ellipse'); return }
      if (e.shiftKey && k === 'g') { s.setTool('gradient'); return }
      if (KEYS[k] && !e.altKey) s.setTool(KEYS[k])
    }
    window.addEventListener('keydown', onKey); window.addEventListener('paste', onPaste)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('paste', onPaste) }
  }, [modal])

  return (
    <main className="h-[100dvh] flex flex-col bg-void-950 text-void-100 overflow-hidden">
      <TopBar onExport={() => setModal('export')} onAdd={() => setModal('add')} onSearch={() => setModal('palette')} />
      {hasDoc && <TabBar onNew={() => useEditor.getState().closeDoc()} />}
      {!hasDoc ? <StartScreen /> : (
        <>
          <OptionsBar />
          <div className="flex-1 min-h-0 flex flex-col md:flex-row relative">
            <ToolRail />
            <Stage />
            <button onClick={() => setPanel(true)} aria-label="Open layers and settings" className="md:hidden absolute right-3 top-3 z-10 h-10 px-3 rounded-full bg-void-900/95 border border-void-700 text-[13px] flex items-center gap-2 shadow-lg"><PanelRight size={16} />Layers</button>
            <aside aria-label="Layer settings" className={`${panel ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[288px] shrink-0 absolute md:static inset-x-0 bottom-0 z-20 max-h-[70%] md:max-h-none rounded-t-2xl md:rounded-none border-t md:border-t-0 md:border-l border-void-800/60 bg-[#101014] shadow-2xl md:shadow-none`}>
              <div className="md:hidden flex items-center justify-between px-4 pt-3"><span className="text-[13px] font-semibold">Layers and settings</span><button aria-label="Close panel" onClick={() => setPanel(false)} className="w-9 h-9 flex items-center justify-center text-void-300"><X size={18} /></button></div>
              <div className="overflow-y-auto md:max-h-[58%] shrink md:shrink-0 border-b border-void-800/60"><PropertiesPanel onOpenFilters={() => setModal('filters')} /></div>
              <LayersPanel />
            </aside>
          </div>
        </>
      )}

      {modal === 'add' && hasDoc && <AddMenu onClose={() => setModal(null)} />}
      {modal === 'filters' && hasDoc && <AddMenu filtersOnly onClose={() => setModal(null)} />}
      {modal === 'palette' && hasDoc && <CommandPalette onClose={() => setModal(null)} open={m => setModal(m)} />}
      {modal === 'resize' && hasDoc && <ResizeDialog onClose={() => setModal(null)} />}
      {modal === 'brand' && <BrandKitDialog onClose={() => setModal(null)} />}
      {modal === 'keys' && <ShortcutSheet onClose={() => setModal(null)} />}
      {modal === 'boards' && hasDoc && <BoardsPanel onClose={() => setModal(null)} />}
      {modal === 'privacy' && <PrivacyPanel onClose={() => setModal(null)} />}
      {modal === 'export' && hasDoc && <ExportDialog onClose={() => setModal(null)} />}

      {busy && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55" role="status" aria-live="polite">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[#17171c] border border-void-700 text-[13.5px]"><span className="w-4 h-4 rounded-full border-2 border-[#8b7cff] border-t-transparent animate-spin" />{busy}</div>
        </div>
      )}
      {shownToast && (
        <div role="status" aria-live="polite" className="fixed z-[70] left-1/2 -translate-x-1/2 bottom-16 md:bottom-6 max-w-[92vw] px-4 py-2.5 rounded-xl bg-white text-void-950 text-[13px] font-medium shadow-2xl">{shownToast}</div>
      )}
    </main>
  )
}
