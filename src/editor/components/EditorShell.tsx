'use client'

import { useEffect, useMemo, useState } from 'react'
import { PanelRight } from 'lucide-react'
import { blobToCanvas, getBrand, importFiles, openProject, saveProject, takeHandoff } from '../io'
import { useEditor } from '../store'
import { AddMenu } from './AddMenu'
import { CommandPalette } from './CommandPalette'
import { BrandKitDialog, ResizeDialog, ShortcutSheet, applyBrand } from './Dialogs'
import { BoardsPanel } from './BoardsPanel'
import { PrivacyPanel } from './PrivacyPanel'
import { initPrivateFromSession, isPrivate } from '../io'
import { ExportDialog } from './ExportDialog'
import { OptionsBar } from './OptionsBar'
import { Stage, isTyping, stageApi } from './Stage'
import { StartScreen } from './StartScreen'
import { TabBar } from './TabBar'
import { useTabs } from '../tabs'
import { TOOL_KEYS, ToolRail, cycleFamily, toggleQuickMask } from './ToolRail'
import { MenuBar } from './MenuBar'
import { StatusBar } from './StatusBar'
import { Dock, MobilePanels } from './Dock'
import { AiInfoDialog, CanvasSizeDialog, ColorRangeDialog, FillDialog, GuideLayoutDialog, ImageSizeDialog, ImportReportDialog, LooksDialog, MissingFontsDialog, ModifySelectionDialog, NewGuideDialog, PreferencesDialog, StrokeDialog, VersionsDialog, fontAvailable } from './MoreDialogs'
import { LayerStyleDialog } from './LayerStyleDialog'
import { SelectMask } from './SelectMask'
import { buildActions, eventCombo, internalClip, normCombo, pasteInPlace } from '../actions'
import { useUi } from '../ui-store'
import * as ops from '../ops'
import { markSessionClean, noteEdit, readCrashedSession, startAutoVersions, writeSession } from '../versions'

type ModalState = { name: string; props?: any } | null

/** Dock the Brief panel at the top of the first panel group and show it. */
function showBriefPanel() {
  const ui = useUi.getState(); const g = ui.workspace.groups[0]
  if (g && !ui.workspace.groups.some(x => x.tabs.includes('brief'))) ui.movePanel('brief', { group: g.id, index: 0 })
  useUi.getState().showPanel('brief')
}

// Test hook for browser checks in development only.
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') { (window as any).__ve = useEditor; (window as any).__ops = ops }

export function EditorShell() {
  const hasDoc = useEditor(s => !!s.doc)
  const toast = useEditor(s => s.toast)
  const busy = useEditor(s => s.busy)
  const dirty = useEditor(s => s.dirty)
  const historyIndex = useEditor(s => s.historyIndex)
  const [modal, setModalState] = useState<ModalState>(null)
  const [queue, setQueue] = useState<NonNullable<ModalState>[]>([])
  // Automatic dialogs (import report, missing fonts) wait their turn instead of replacing each other.
  const setModal = (m: string | ModalState) => {
    const next = typeof m === 'string' ? { name: m } : m
    if (next && ['importReport', 'missingFonts'].includes(next.name)) setModalState(cur => { if (cur) { setQueue(q => [...q, next]); return cur } return next })
    else setModalState(next)
  }
  const [panel, setPanel] = useState(false)
  const [shownToast, setShownToast] = useState<string | null>(null)
  const ui = useUi()

  useEffect(() => { useUi.getState().hydrate() }, [])
  useEffect(() => { (window as any).__voidEditor = useEditor; (window as any).__voidUi = useUi }, [])

  const docId = useEditor(s => s.doc?.id)
  useEffect(() => { getBrand().then(applyBrand).catch(() => {}) }, [docId])
  useEffect(() => { useTabs.getState().sync() }, [docId])
  useEffect(() => { initPrivateFromSession() }, [])
  useEffect(() => startAutoVersions(), [])
  // Opened from the installed app (file handler): bring the files straight in.
  useEffect(() => {
    const lq = (window as any).launchQueue
    if (!lq?.setConsumer) return
    lq.setConsumer(async (p: any) => { const files = await Promise.all((p.files ?? []).map((h: any) => h.getFile())); if (files.length) importFiles(files as File[]) })
  }, [])

  // Fonts: load what the design uses, then warn about any that are nowhere to be found.
  useEffect(() => {
    if (!docId) return
    let live = true
    import('../io').then(m => m.ensureDocFonts()).then(() => {
      if (!live) return
      const fams = Array.from(new Set(useEditor.getState().layers.filter(l => l.type === 'text').map(l => (l as any).fontFamily as string)))
      const missing = fams.filter(f => !fontAvailable(f))
      if (missing.length) setModal({ name: 'missingFonts', props: { fonts: missing } })
    }).catch(() => {})
    return () => { live = false }
  }, [docId])

  // Crash recovery marker: records open designs; marked clean when the tab closes normally.
  const tabs = useTabs(s => s.tabs)
  useEffect(() => { if (!isPrivate()) writeSession(tabs.map(t => ({ id: t.id, name: t.name })), docId ?? null) }, [tabs, docId])
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden' && useEditor.getState().dirty && !isPrivate()) saveProject().catch(() => {}) }
    const leave = () => markSessionClean()
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', leave)
    return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', leave); markSessionClean() }
  }, [])

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
      // Jobs: open the job's design and build or update its formats.
      if (h.openProject) {
        const ok = await openProject(h.openProject)
        if (!ok) { ed.notify('That design is no longer on this device.'); return }
        if (h.formats?.length) await ops.buildFormats(h.formats, null, !!h.rebuildFormats, h.masterDeliverableId)
        if (h.syncFormats) await ops.syncFormats()
        if (h.brief) { useEditor.getState().setDoc({ brief: h.brief }); showBriefPanel() }
        useEditor.setState({ dirty: true }); await saveProject().catch(() => {})
        return
      }
      const tagJob = () => {
        if (!h.job) return
        const d = useEditor.getState().doc; if (!d) return
        useEditor.setState({ doc: { ...d, id: h.job.docId ?? d.id, jobId: h.job.id, brandId: h.job.brandId ?? null }, dirty: true })
        const oldId = d.id, newId = h.job.docId ?? d.id
        if (oldId !== newId) useTabs.setState(t => ({ tabs: t.tabs.filter(x => x.id !== newId).map(x => (x.id === oldId ? { ...x, id: newId } : x)), activeId: newId }))
      }
      if (h.fonts) { useEditor.setState({ brandFont: h.fonts.display } as any); import('../io').then(m => { m.ensureFont(h.fonts!.display, 700); m.ensureFont(h.fonts!.body, 400) }) }
      // A brief from Studio travels with the design as a checklist.
      const applyBrief = () => { if (h.brief) { useEditor.getState().setDoc({ brief: h.brief }); useEditor.setState({ dirty: true }); showBriefPanel() } }
      if (h.layered?.length && h.size) {
        const { buildFramedFromLayered } = await import('../io')
        await buildFramedFromLayered(h.name, h.layered, h.size, h.palette)
        tagJob(); applyBrief()
        ed.notify(h.brief ? 'Your drafts are open as boards. Keep the one you like, delete the rest. The Brief panel ticks off what is on the design.' : 'Opened as editable boards. Double-click any text to edit it; shapes and colours are real layers.')
        return
      }
      const canvases = await Promise.all(h.images.map(i => blobToCanvas(i.blob)))
      if (h.boards && h.size && canvases.length > 1) {
        const { buildFramedFromImages } = await import('../io')
        buildFramedFromImages(h.name, canvases, h.images.map(i => i.name), h.size, h.palette)
        ed.notify('Opened as boards. Each page is its own board; drag elements between them.')
        return
      }
      const size = h.size ?? (canvases[0] ? { width: canvases[0].width, height: canvases[0].height } : { width: 1080, height: 1350 })
      ed.newDoc({ name: h.name, ...size, background: h.from === 'studio' ? '#ffffff' : null })
      canvases.forEach((c, i) => useEditor.getState().addImage(c, c.width, c.height, h.images[i].name))
      if (h.liveEffect) {
        const st = useEditor.getState()
        st.addAdjustment('voidEffect', h.liveEffect.effect as any)
        const fl = st.active()
        if (fl && fl.type === 'adjustment') st.updateLayer(fl.id, { effectParams: { ...(fl.effectParams ?? {}), ...h.liveEffect.params } } as any)
        ed.notify('Added as a live filter layer. Adjust it any time in the layers panel.')
      }
      if (h.look) {
        const st = useEditor.getState()
        st.addAdjustment('colorMatch')
        const fl = st.active()
        if (fl && fl.type === 'adjustment') st.updateLayer(fl.id, { look: { name: h.look.name, mean: h.look.mean, std: h.look.std }, name: `Look: ${h.look.name}` } as any)
        if (h.look.grain > 1.4) { st.addAdjustment('voidEffect', 'grain' as any); const g = useEditor.getState().active(); if (g?.type === 'adjustment') st.updateLayer(g.id, { effectParams: { ...(g.effectParams ?? {}), intensity: Math.min(60, Math.round(h.look.grain * 12)) }, name: 'Grain (from the reference)' } as any) }
        ed.notify('The look is on its own layer. Lower Strength in Properties to blend it, or hide it to compare.')
      }
      if (h.palette?.length) { useEditor.setState({ swatches: Array.from(new Set([...h.palette, ...useEditor.getState().swatches])).slice(0, 21), fg: h.palette[0] }) }
      tagJob(); applyBrief()
      if (h.from === 'studio' && !h.look) ed.notify(h.job ? 'Key visual started with the job\'s palette, type and brief. Design it here, then build every format from the job in Studio.' : 'Your references are in as layers and the board palette is in your colours.')
    })
  }, [])

  // Autosave, and count edits for automatic versions.
  useEffect(() => {
    if (!dirty || !hasDoc) return
    noteEdit()
    if (isPrivate()) return
    const t = setTimeout(() => { saveProject().catch(() => useEditor.getState().notify('Could not save. Your browser storage may be full.')) }, 1800)
    return () => clearTimeout(t)
  }, [dirty, historyIndex, hasDoc])

  useEffect(() => {
    if (!toast) return
    setShownToast(toast.msg)
    const t = setTimeout(() => setShownToast(null), 4200)
    return () => clearTimeout(t)
  }, [toast])

  const actions = useMemo(() => buildActions(), [])
  const hotkeys = useMemo(() => {
    const m = new Map<string, () => void>()
    for (const a of Object.values(actions)) if (a.hotkey) m.set(normCombo(a.hotkey), () => { if (!a.enabled || a.enabled()) a.run() })
    return m
  }, [actions])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e as unknown as KeyboardEvent)) return
      const files = Array.from(e.clipboardData?.files ?? []).filter(f => f.type.startsWith('image/'))
      if (!files.length) return
      e.preventDefault()
      // Copied from this design: paste it back in place instead of in the middle.
      const clip = internalClip()
      if (clip && useEditor.getState().doc) {
        createImageBitmap(files[0]).then(b => { if (b.width === clip.canvas.width && b.height === clip.canvas.height) pasteInPlace(); else importFiles(files) }).catch(() => importFiles(files))
        return
      }
      importFiles(files)
    }
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || modal) return
      const s = useEditor.getState(); if (!s.doc) return
      const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase()
      const stop = () => e.preventDefault()

      // A transform session owns Enter and Escape.
      if (s.transform) {
        if (k === 'enter') { stop(); ops.applyTransform(); return }
        if (k === 'escape') { stop(); ops.cancelTransform(); return }
      }
      if (k === 'enter' && !mod && stageApi.enter()) { stop(); return }
      if (k === 'escape' && stageApi.escape()) { stop(); return }
      if ((k === 'delete' || k === 'backspace') && ['pathselect', 'pen', 'curvature'].includes(s.tool) && stageApi.deleteNode()) { stop(); return }
      if (mod && k === 'a' && ['pathselect', 'pen', 'curvature'].includes(s.tool) && stageApi.selectAllNodes()) { stop(); return }
      if (!mod && k.startsWith('arrow')) { const d = e.shiftKey ? 10 : 1; if (stageApi.nudgeNodes(k === 'arrowleft' ? -d : k === 'arrowright' ? d : 0, k === 'arrowup' ? -d : k === 'arrowdown' ? d : 0)) { stop(); return } }

      // Channel shortcuts: Ctrl+2 composite, Ctrl+3/4/5 red, green, blue.
      if (mod && !e.shiftKey && !e.altKey && ['2', '3', '4', '5'].includes(e.key)) { stop(); useEditor.setState({ viewChannel: ({ '2': 'rgb', '3': 'r', '4': 'g', '5': 'b' } as Record<string, string>)[e.key], docRev: s.docRev + 1 }); return }

      const combo = eventCombo(e)
      const hk = hotkeys.get(combo)
      if (hk) { stop(); hk(); return }

      if (k === '\\') { if (!s.compare) useEditor.setState({ compare: true }); return }
      if (e.key === '?') { setModal('keys'); return }
      if (mod && k === 'k') { stop(); setModal('palette'); return }
      if (mod && e.altKey && k === 'g') { stop(); const a = s.active(); if (a?.clipId) s.releaseClippingMask(a.id); else if (a && s.canClip(a.id)) s.createClippingMask(a.id); return }
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
      if (k === 'escape') { if (s.crop) useEditor.setState({ crop: null }); else if (s.quickMask) toggleQuickMask(); else if (s.selection) s.setSelection(null, 'Deselect'); else if (s.editingMask) s.setEditingMask(false); else if (s.viewChannel !== 'rgb') useEditor.setState({ viewChannel: 'rgb', docRev: s.docRev + 1 }); return }
      if (k === 'enter' && s.crop && s.crop.w > 1) { s.cropTo(s.crop.x, s.crop.y, s.crop.w, s.crop.h); useEditor.setState({ crop: null }); return }
      if (k === 'delete' || k === 'backspace') { stop(); if (s.selection) s.clearSelectionPixels(); else s.removeSelected(); return }
      if (k === 'x') { s.swapColors(); return }
      if (k === 'd' && !e.shiftKey) { useEditor.setState({ fg: '#111111', bg: '#ffffff' }); return }
      if (k === 'q') { toggleQuickMask(); return }
      if (k === '[' || k === ']') {
        if (['brush', 'eraser', 'clone', 'heal', 'remove', 'dodge', 'burn', 'sponge'].includes(s.tool)) s.setOption('size', Math.max(1, Math.min(1000, Math.round(s.options.size * (k === ']' ? 1.2 : 1 / 1.2)) + (k === ']' ? 1 : -1))))
        else if (s.activeId) s.nudgeOrder(s.activeId, k === ']' ? 1 : -1)
        return
      }
      // Number keys set brush or layer opacity, like Photoshop: 1 = 10%, 0 = 100%.
      if (/^[0-9]$/.test(e.key) && !e.shiftKey && !e.altKey) {
        const v = e.key === '0' ? 1 : Number(e.key) / 10
        if (['brush', 'eraser', 'clone', 'fill', 'gradient'].includes(s.tool)) s.setOption('opacity', v)
        else if (s.activeId) { s.updateLayers(s.selectedIds.map(id => ({ id, patch: { opacity: v } }))); s.commit('Opacity') }
        return
      }
      if (k.startsWith('arrow') && s.selectedIds.length) {
        stop()
        const d = e.shiftKey ? 10 : 1
        const dx = k === 'arrowleft' ? -d : k === 'arrowright' ? d : 0, dy = k === 'arrowup' ? -d : k === 'arrowdown' ? d : 0
        for (const l of s.layers) if (s.selectedIds.includes(l.id) && !l.locked && !l.lockPosition && l.type !== 'adjustment') s.updateLayer(l.id, { x: l.x + dx, y: l.y + dy })
        s.commit('Nudge')
        return
      }
      if (k === 'enter') { const l = s.active(); if (l?.type === 'text') { stop(); useEditor.setState({ editingTextId: l.id, tool: 'move' }) } return }
      if (!e.shiftKey && e.code === 'Digit2') return
      if (e.shiftKey && e.code === 'Digit2') { stop(); stageApi.fitSelection(); return }
      if (e.shiftKey && e.code === 'Digit1') { stop(); stageApi.fitFrame(); return }
      if (e.altKey) return
      const letter = e.code.startsWith('Key') ? e.code.slice(3).toLowerCase() : k
      if (TOOL_KEYS[letter]) { const t = e.shiftKey ? cycleFamily(letter) : TOOL_KEYS[letter]; if (t) s.setTool(t) }
    }
    window.addEventListener('keydown', onKey); window.addEventListener('paste', onPaste)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('paste', onPaste) }
  }, [modal, hotkeys])

  const openFilters = () => setModal('filters')
  const close = () => { setModalState(queue[0] ?? null); setQueue(q => q.slice(1)) }
  const m = modal?.name
  return (
    <main className={`h-[100dvh] flex flex-col bg-void-950 text-void-100 overflow-hidden ${ui.density === 'compact' ? 'vc-compact' : ''} ${ui.touchMode ? 'vc-touch' : ''}`} style={{ ['--vc-ui-scale' as any]: ui.uiScale }}>
      <MenuBar onExport={() => setModal('export')} onAdd={() => setModal('add')} onSearch={() => setModal('palette')} />
      {hasDoc && <div className="vc-chrome"><TabBar onNew={() => useEditor.getState().closeDoc()} /></div>}
      {!hasDoc ? <StartScreen /> : (
        <>
          <OptionsBar />
          <div className="flex-1 min-h-0 flex flex-col md:flex-row relative">
            <ToolRail />
            <Stage />
            <button onClick={() => setPanel(true)} aria-label="Open panels" className="md:hidden absolute right-3 top-3 z-10 h-10 px-3 rounded-full bg-void-900/95 border border-void-700 text-[13px] flex items-center gap-2 shadow-lg"><PanelRight size={16} />Layers</button>
            <Dock onOpenFilters={openFilters} />
            <MobilePanels open={panel} onClose={() => setPanel(false)} onOpenFilters={openFilters} />
          </div>
          <StatusBar />
        </>
      )}

      {m === 'add' && hasDoc && <AddMenu onClose={close} />}
      {m === 'filters' && hasDoc && <AddMenu filtersOnly onClose={close} />}
      {m === 'palette' && hasDoc && <CommandPalette onClose={close} open={x => setModal(x)} />}
      {m === 'resize' && hasDoc && <ResizeDialog onClose={close} />}
      {m === 'brand' && <BrandKitDialog onClose={close} />}
      {m === 'keys' && <ShortcutSheet onClose={close} />}
      {m === 'boards' && hasDoc && <BoardsPanel onClose={close} />}
      {m === 'privacy' && <PrivacyPanel onClose={close} />}
      {m === 'export' && hasDoc && <ExportDialog onClose={close} />}
      {m === 'imageSize' && hasDoc && <ImageSizeDialog onClose={close} />}
      {m === 'canvasSize' && hasDoc && <CanvasSizeDialog onClose={close} aiFill={modal?.props?.aiFill} />}
      {m === 'guideLayout' && hasDoc && <GuideLayoutDialog onClose={close} />}
      {m === 'newGuide' && hasDoc && <NewGuideDialog onClose={close} />}
      {m === 'fill' && hasDoc && <FillDialog onClose={close} />}
      {m === 'stroke' && hasDoc && <StrokeDialog onClose={close} />}
      {m === 'modify' && hasDoc && <ModifySelectionDialog onClose={close} kind={modal?.props?.kind ?? 'feather'} />}
      {m === 'colorRange' && hasDoc && <ColorRangeDialog onClose={close} />}
      {m === 'prefs' && <PreferencesDialog onClose={close} tab={modal?.props?.tab} />}
      {m === 'aiInfo' && <AiInfoDialog onClose={close} />}
      {m === 'versions' && hasDoc && <VersionsDialog onClose={close} />}
      {m === 'layerStyle' && hasDoc && <LayerStyleDialog onClose={close} focus={modal?.props?.focus} />}
      {m === 'selectMask' && hasDoc && <SelectMask onClose={close} />}
      {m === 'missingFonts' && hasDoc && <MissingFontsDialog onClose={close} fonts={modal?.props?.fonts ?? []} />}
      {m === 'importReport' && <ImportReportDialog onClose={close} report={modal?.props} />}
      {m === 'looks' && hasDoc && <LooksDialog onClose={close} />}

      {busy && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55" role="status" aria-live="polite">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[#17171c] border border-void-700 text-[13.5px]"><span className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />{busy}</div>
        </div>
      )}
      {shownToast && (
        <div role="status" aria-live="polite" className="fixed z-[95] left-1/2 -translate-x-1/2 bottom-16 md:bottom-10 max-w-[92vw] px-4 py-2.5 rounded-xl bg-white text-void-950 text-[13px] font-medium shadow-2xl">{shownToast}</div>
      )}
    </main>
  )
}

export { readCrashedSession }
