'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PanelRight } from 'lucide-react'
import { blobToCanvas, flushSave, getBrand, hasUnsaved, importFiles, openProject, saveProject, startAutosave, takeHandoff } from '../io'
import { checkInvariants } from '../invariants'
import { useEditor, ADJUSTMENT_LABELS } from '../store'
import { AddMenu } from './AddMenu'
import { CommandPalette } from './CommandPalette'
import { BrandKitDialog, ResizeDialog, ShortcutSheet, applyBrand } from './Dialogs'
import { BoardsPanel } from './BoardsPanel'
import { PrivacyPanel } from './PrivacyPanel'
import { AccountPanel } from '@/components/account/AccountPanel'
import { Modal } from './ui'
import { initPrivateFromSession, isPrivate } from '../io'
import { ExportDialog } from './ExportDialog'
import { OptionsBar } from './OptionsBar'
import { Stage, isTyping, stageApi } from './Stage'
import { StartScreen } from './StartScreen'
import { TabBar } from './TabBar'
import { useTabs } from '../tabs'
import { frameForLayer } from '../frames'
import { SIZE_PRESETS } from '../presets'
import { FloatingTools, TOOL_KEYS, ToolRail, cycleFamily, toggleQuickMask } from './ToolRail'
import { CanvasMenu, MenuBar } from './MenuBar'
import { bucket, perf, setSessionSnapshot, track } from '@/lib/analytics'
import { StatusBar } from './StatusBar'
import { Dock, MobilePanels } from './Dock'
import { AiInfoDialog, CanvasSizeDialog, ColorRangeDialog, FillDialog, GuideLayoutDialog, ImageSizeDialog, ImportReportDialog, LooksDialog, MissingFontsDialog, ModifySelectionDialog, NameDialog, NewGuideDialog, PreferencesDialog, StrokeDialog, VersionsDialog, fontAvailable } from './MoreDialogs'
import { LayerStyleDialog } from './LayerStyleDialog'
import { SelectMask } from './SelectMask'
import { useDesktop } from '../useDesktop'
import { selectionTargetsNow } from '../actions'
import { buildActions, canvasMenu, resolveAction, type MenuItem, eventCombo, internalClip, isOwnLayerPicture, noteDuplicate, normCombo, pasteInPlace, pasteLayers, selectAllLayers, smartDuplicate } from '../actions'
import { asOneStep, groupChain, inGroup, selectionUnits } from '../store'
import { useUi } from '../ui-store'
import { useComments } from '../comments'
import { effectLabel, newEffect, type FxTarget } from '../effects'
import { recallView } from '../viewmemory'
import type { Effect } from '../types'
import { FxScopeDialog } from './FxScopeDialog'
import { MobileEditor, useIsPhone } from './MobileEditor'
import { AfterExport } from './AfterExport'
import { touchCanvas } from '../touch'
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
  // Usage: how long the Editor took to be ready, and how big the open design is for the session summary
  // (layer and board counts in buckets, never names or content).
  useEffect(() => {
    perf('editor.ready', performance.now())
    setSessionSnapshot(() => {
      const st = useEditor.getState()
      return st.doc ? { layers: bucket(st.layers.length), boards: bucket(st.doc.frames?.length ?? 0), phone: touchCanvas.phone } : { layers: '0', boards: '0', phone: touchCanvas.phone }
    })
    return () => setSessionSnapshot(null)
  }, [])
  const phone = useIsPhone()
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
  // A finger as the main pointer (phones and tablets): bigger rows and controls, and no pull-to-refresh.
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)'); const on = () => setCoarse(mq.matches); on()
    mq.addEventListener('change', on)
    const root = document.documentElement, prev = root.style.overscrollBehavior
    root.style.overscrollBehavior = 'none'
    return () => { mq.removeEventListener('change', on); root.style.overscrollBehavior = prev }
  }, [])
  const [shownToast, setShownToast] = useState<string | null>(null)
  const ui = useUi()

  useEffect(() => { useUi.getState().hydrate(); startAutosave() }, [])
  useEffect(() => {
    const w = window as any
    w.__voidEditor = useEditor; w.__voidUi = useUi
    // Browser checks (e2e/trust.mjs) read the design's rules and the save state through these.
    w.__vcCheck = () => checkInvariants(useEditor.getState())
    w.__vcSave = { flush: flushSave, unsaved: hasUnsaved }
    w.__vcComments = useComments
    // Effects checks (e2e/effects-scope.mjs): the design as the canvas previews it (at `scale`, as when zoomed out
    // or with many boards) against the export, board by board. Both are shrunk to 64 px wide and compared: the mean
    // difference per channel (0 to 255), and the worst 8 x 8 block.
    w.__vcParity = async (o: { frame?: string; scale?: number; images?: boolean } = {}) => {
      const [{ renderDoc, makeCanvas }, io] = await Promise.all([import('../engine'), import('../io')])
      const st = useEditor.getState(); if (!st.doc) return null
      const f = o.frame ? st.doc.frames?.find(x => x.id === o.frame) ?? null : null
      const r = f ? { x: f.x, y: f.y, w: f.width, h: f.height } : { x: 0, y: 0, w: st.doc.width, h: st.doc.height }
      const sc = o.scale ?? 1
      const whole = makeCanvas(1, 1)
      renderDoc(whole, st.doc, st.layers, { groups: st.groups, scale: sc, noShadow: true, noCache: true })
      const exp = io.renderFrame(f ? f.id : '__doc', 1)!
      const bw = 64, bh = Math.max(8, Math.round((64 * r.h) / r.w))
      const small = (c: HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number) => { const t = makeCanvas(bw, bh); const x = t.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, bw, bh); x.imageSmoothingQuality = 'high'; x.drawImage(c, sx, sy, sw, sh, 0, 0, bw, bh); return x.getImageData(0, 0, bw, bh).data }
      const a = small(whole, r.x * sc, r.y * sc, r.w * sc, r.h * sc), b = small(exp, 0, 0, exp.width, exp.height)
      let d = 0; for (let i = 0; i < a.length; i++) if (i % 4 !== 3) d += Math.abs(a[i] - b[i])
      let worst = 0
      for (let by = 0; by < bh; by += 8) for (let bx = 0; bx < bw; bx += 8) {
        let s = 0, n = 0
        for (let y = by; y < Math.min(bh, by + 8); y++) for (let x = bx; x < bx + 8; x++) { const i = (y * bw + x) * 4; s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); n += 3 }
        worst = Math.max(worst, s / n)
      }
      if (o.images) { const c = makeCanvas(r.w * sc, r.h * sc); c.getContext('2d')!.drawImage(whole, r.x * sc, r.y * sc, r.w * sc, r.h * sc, 0, 0, r.w * sc, r.h * sc); return { mean: d / ((a.length / 4) * 3), worst, preview: c.toDataURL(), exported: exp.toDataURL() } }
      return { mean: d / ((a.length / 4) * 3), worst }
    }
    w.__vcFx = { newEffect }
    // A board as export draws it, as a data URL (export tests compare files with it).
    w.__vcFrame = async (id: string, scale = 1) => (await import('../io')).renderFrame(id, scale)?.toDataURL() ?? null
    // Pixels of the design as drawn (for effect checks), at scale 1, as RGBA arrays per rectangle.
    w.__vcPixels = async (rect: { x: number; y: number; w: number; h: number }, o: { noFx?: boolean } = {}) => {
      const { renderDoc, makeCanvas } = await import('../engine')
      const st = useEditor.getState(); if (!st.doc) return null
      const c = makeCanvas(1, 1)
      renderDoc(c, st.doc, st.layers, { groups: st.groups, scale: 1, noShadow: true, noCache: true, noFx: o.noFx })
      return Array.from(c.getContext('2d')!.getImageData(rect.x, rect.y, rect.w, rect.h).data)
    }
  }, [])

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
  useEffect(() => { if (!isPrivate()) { writeSession(tabs.map(t => ({ id: t.id, name: t.name })), docId ?? null); rememberOpen(tabs, docId ?? null) } }, [tabs, docId])
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') flushSave() }
    const leave = () => { flushSave(); markSessionClean() }
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
    const inbox = q.get('inbox'), project = q.get('project'), preset = q.get('preset')
    if (inbox || project || preset) window.history.replaceState(null, '', '/editor')
    if (project) {
      // From a client comment in Studio: open the design on the layer it is about, with the comments showing.
      const layer = q.get('layer'), comments = q.get('comments')
      openProject(project, false, q.get('from') || 'link').then(ok => {
        if (!ok) { useEditor.getState().notify('That design is not on this device any more.'); return }
        if (comments) useUi.getState().showPanel('comments')
        const s = useEditor.getState(), l = layer ? s.layers.find(x => x.id === layer) : null
        // After the design's remembered view and selection are put back, so this selection wins.
        if (l) setTimeout(() => { const st = useEditor.getState(); if (l.frameId) st.setActiveFrame(l.frameId); st.setActive(l.id); stageApi.fitFrame() }, 250)
        else if (layer) s.notify('The layer that comment was about is no longer in the design.')
      })
      return
    }
    // A Learn guide or the size calculator can open the Editor straight onto a preset (/editor?preset=a5).
    if (preset && !inbox) {
      const p = SIZE_PRESETS.find(x => x.id === preset)
      if (p && !useEditor.getState().doc) { track('doc.new', { preset: p.label.slice(0, 40), w: p.width, h: p.height, from: 'link' }); useEditor.getState().newDoc({ width: p.width, height: p.height, background: '#ffffff', name: p.label }) }
      return
    }
    if (!inbox) {
      // A reload, or coming back to this tab: reopen the designs that were open, at the one you were on.
      const was = openAtStart; openAtStart = null
      if (was?.active && !useEditor.getState().doc && !isPrivate()) {
        useTabs.setState({ tabs: was.tabs })
        openProject(was.active, false, 'reload').then(ok => { if (!ok) { useTabs.setState({ tabs: [] }); rememberOpen([], null) } else { track('doc.resume', { how: 'reload', tabs: was.tabs.length }); import('../versions').then(m => m.clearSession()).catch(() => {}) } })
      }
      return
    }
    takeHandoff(inbox).then(async h => {
      if (!h) return
      track('doc.import', { kind: 'from-' + h.from, count: h.images?.length ?? 0 })
      const ed = useEditor.getState()
      // From the Effects page: its effects go onto what was selected in the design open in this tab.
      if (h.addEffects) {
        const { projectId, effects: list } = h.addEffects
        const wasOpen = useEditor.getState().doc?.id === projectId
        if (!wasOpen && !(await openProject(projectId, false, 'effects'))) { ed.notify('That design is not on this device any more.'); return }
        const st = useEditor.getState()
        const sel = (wasOpen ? st.selectedIds : recallView(projectId)?.sel ?? []).filter(id => st.layers.some(l => l.id === id))
        if (sel.length) useEditor.setState({ selectedIds: sel, activeId: sel[sel.length - 1] })
        const fx = effectsFrom(list)
        let targets = sel.length ? selectionTargetsNow() : []
        let where = targets.length === 1 ? nameOf(targets[0]) : `${targets.length} layers`
        if (!targets.length) {
          const f = st.activeFrameId ? st.doc?.frames?.find(x => x.id === st.activeFrameId) : null
          targets = [(f ? { type: 'board', id: f.id } : { type: 'doc' }) as FxTarget]
          where = f ? `the board “${f.name}”` : 'the whole design'
        }
        useEditor.getState().addEffect(targets, fx, fx.length > 1 ? 'Add effects' : `Add ${fxNames(fx)}`.toLowerCase().replace(/^add/, 'Add'))
        if (targets.length === 1 && targets[0].type === 'layer') useEditor.setState({ activeId: targets[0].id, selectedIds: [targets[0].id] })
        useUi.getState().showPanel('properties')
        ed.notify(`Added ${fxNames(fx)} to ${where}. Change ${fx.length > 1 ? 'them' : 'it'} under Effects in Properties.`)
        return
      }
      // Jobs: open the job's design and build or update its formats.
      if (h.openProject) {
        const ok = await openProject(h.openProject, false, 'studio')
        if (!ok) { ed.notify('That design is no longer on this device.'); return }
        if (h.formats?.length) await ops.buildFormats(h.formats, null, !!h.rebuildFormats, h.masterDeliverableId)
        if (h.syncFormats) await ops.syncFormats()
        if (h.brief) {
          // Details changed in Studio's brief (the date, venue, price …) follow into every board.
          const r = ops.applyBrief(h.brief)
          if (r.layers) useEditor.getState().notify(`The brief changed: ${r.keys.join(', ')} updated in ${r.layers} text layer${r.layers === 1 ? '' : 's'} on ${r.boards} board${r.boards === 1 ? '' : 's'}.`)
          showBriefPanel()
        }
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
      const live = h.liveEffects ?? (h.liveEffect ? [h.liveEffect] : [])
      if (live.length) {
        // The effects sit on the photo itself, so anything added on top later stays clean.
        const st = useEditor.getState(), photo = st.active()
        if (photo && photo.type !== 'adjustment') {
          const fx = effectsFrom(live)
          st.addEffect([{ type: 'layer', id: photo.id }], fx, fx.length > 1 ? 'Add effects' : 'Add effect')
          useEditor.setState({ activeId: photo.id, selectedIds: [photo.id] })
          ed.notify(`${fxNames(fx).replace(/^./, c => c.toUpperCase())} ${fx.length > 1 ? 'are' : 'is'} on the photo layer. Change ${fx.length > 1 ? 'them' : 'it'} under Effects in Properties.`)
        }
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

  // Count edits for automatic versions. Saving itself runs in io.ts (startAutosave).
  useEffect(() => { if (dirty && hasDoc) noteEdit() }, [dirty, historyIndex, hasDoc])

  useEffect(() => {
    if (!toast) return
    setShownToast(toast.msg)
    const t = setTimeout(() => setShownToast(null), 4200)
    return () => clearTimeout(t)
  }, [toast])

  const actions = useMemo(() => buildActions(), [])
  // Browser checks run menu commands by name (e2e/editing.mjs).
  useEffect(() => { (window as any).__vcRun = (id: string) => { const a = resolveAction(actions, id); if (a && (!a.enabled || a.enabled())) a.run() } }, [actions])
  // Right click on the canvas.
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent).detail; setCtxMenu({ x: d.x, y: d.y, items: canvasMenu(d.under ?? []) }) }
    window.addEventListener('vc:canvasmenu', on)
    return () => window.removeEventListener('vc:canvasmenu', on)
  }, [])
  const closeCtx = useCallback(() => setCtxMenu(null), [])
  // "One image or each layer?" for spatial effects on groups, and adjustment layers above a selection.
  const [fxAsk, setFxAsk] = useState<{ targets: FxTarget[]; fx: Effect } | null>(null)
  useEffect(() => {
    const ask = (e: Event) => setFxAsk((e as CustomEvent).detail)
    const above = (e: Event) => {
      const fx: Effect = (e as CustomEvent).detail?.fx; if (!fx) return
      asOneStep(() => {
        const s = useEditor.getState()
        const units = selectionUnits(s.layers, s.groups, s.selectedIds, s.isolatedGroupId)
        let gid = units.length === 1 ? units[0].group : null
        if (!gid) { s.groupSelected(); gid = useEditor.getState().active()?.groupId ?? null }
        if (!gid) return
        const st = useEditor.getState()
        const members = st.layers.filter(l => inGroup(l, gid!, st.groups))
        st.setActive(members[members.length - 1].id)
        st.addAdjustment(fx.kind, fx.effect)
        const adj = useEditor.getState().active()
        if (adj?.type !== 'adjustment') return
        const { id: _i, on: _o, link: _l, unknown: _u, opacity, blend, ...settings } = fx
        useEditor.getState().updateLayer(adj.id, { ...settings, groupId: gid, reach: 'group', name: adj.name } as any)
        useEditor.getState().commit(`Add ${adj.name.toLowerCase()} above`)
      })
    }
    window.addEventListener('vc:fxscope', ask); window.addEventListener('vc:fxlayerabove', above)
    return () => { window.removeEventListener('vc:fxscope', ask); window.removeEventListener('vc:fxlayerabove', above) }
  }, [])
  useDesktop(actions)
  // An account is optional; if this device is signed in, settings sync starts here.
  useEffect(() => { import('@/lib/account').then(m => m.initAccount()).catch(() => {}) }, [])
  const hotkeys = useMemo(() => {
    const m = new Map<string, () => void>()
    for (const a of Object.values(actions)) {
      const run = () => { if (!a.enabled || a.enabled()) a.run() }
      if (a.hotkey) m.set(normCombo(a.hotkey), run)
      // In a browser tab some keys belong to the browser (Ctrl+T, Ctrl+Shift+N); these have a second key.
      if (a.webHotkey && !(typeof window !== 'undefined' && (window as any).voidDesktop)) m.set(normCombo(a.webHotkey), run)
    }
    return m
  }, [actions])
  // Shortcuts the older key handler runs directly still count as using that command.
  const shortcutIds = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of Object.values(actions)) if (a.shortcut && !a.hotkey) m.set(normCombo(a.shortcut), a.id)
    return m
  }, [actions])
  // Count tool picks (rail clicks and single-key shortcuts alike) as commands named tool.<id>.
  useEffect(() => useEditor.subscribe((st, prev) => { if (st.tool !== prev.tool && st.doc) track('action', { id: 'tool.' + st.tool }) }), [])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e as unknown as KeyboardEvent)) return
      const files = Array.from(e.clipboardData?.files ?? []).filter(f => f.type.startsWith('image/'))
      const ed = useEditor.getState()
      if (!files.length) {
        // Text from anywhere pastes as a text layer; SVG code pastes as a picture.
        const text = e.clipboardData?.getData('text/plain')?.trim()
        if (!text || !ed.doc) return
        e.preventDefault()
        if (/^<svg[\s>]/i.test(text) || /^<\?xml[\s\S]*<svg/i.test(text)) { importFiles([new File([text], 'Pasted SVG.svg', { type: 'image/svg+xml' })]).then(() => useEditor.getState().notify('The SVG came in as a picture. Its shapes are not editable paths.')); return }
        const v = stageApi.viewRect()
        ed.addText(v ? v.x + v.w * 0.2 : undefined, v ? v.y + v.h * 0.4 : undefined, text.length > 40 ? (v ? v.w * 0.6 : null) : null)
        const t = useEditor.getState().active()
        if (t?.type === 'text') { ed.updateLayer(t.id, { text: text.slice(0, 5000), name: text.split('\n')[0].slice(0, 40) || 'Text' }, 'Paste text'); useEditor.setState({ editingTextId: null }) }
        return
      }
      e.preventDefault()
      if (!ed.doc) { importFiles(files); return }
      // Copied from this design: paste the layers (still editable), or the pixels back in place.
      const clip = internalClip()
      createImageBitmap(files[0]).then(b => {
        if (isOwnLayerPicture(b.width, b.height)) pasteLayers(false, stageApi.viewRect())
        else if (clip && b.width === clip.canvas.width && b.height === clip.canvas.height) pasteInPlace()
        else importFiles(files)
      }).catch(() => importFiles(files))
    }
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || modal) return
      // Keys inside an open menu move through the menu, not the design.
      if ((e.target as HTMLElement | null)?.closest?.('[role=menu]')) return
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
      const sid = shortcutIds.get(combo); if (sid) track('action', { id: sid, via: 'key' })

      if (k === '\\') { if (!s.compare) useEditor.setState({ compare: true }); return }
      if (e.key === '?') { setModal('keys'); return }
      if (mod && k === 'k') { stop(); setModal('palette'); return }
      if (mod && e.altKey && k === 'g') { stop(); const a = s.active(); if (a?.clipId) s.releaseClippingMask(a.id); else if (a && s.canClip(a.id)) s.createClippingMask(a.id); return }
      if (mod && k === 'g') { stop(); if (e.shiftKey) { const g = s.active()?.groupId; if (g) s.ungroup(g) } else s.groupSelected(); return }
      if (mod && k === 'z') { stop(); e.shiftKey ? s.redo() : s.undo(); return }
      if (mod && k === 'y') { stop(); s.redo(); return }
      if (mod && k === 'j') { stop(); if (s.selection) s.layerFromSelection(false); else if (s.selectedIds.length) { const src = s.layers.filter(l => s.selectedIds.includes(l.id)).map(l => l.id); noteDuplicate(s.duplicateSelected({ dx: 16, dy: 16 }), src) } return }
      // Ctrl+A: every pixel with a pixel tool in hand, every layer otherwise (Alt+Ctrl+A is always layers).
      if (mod && k === 'a') { stop(); if (['move', 'text', 'shape', 'hand', 'zoom', 'eyedropper'].includes(s.tool) && !e.altKey) selectAllLayers(); else s.selectAll(); return }
      // Ctrl+D: deselect pixels when there is a selection; otherwise duplicate, and again repeats the last move.
      if (mod && k === 'd') { stop(); if (s.selection) s.setSelection(null, 'Deselect'); else if (s.selectedIds.length) smartDuplicate(); return }
      if (mod && k === 'i' && e.shiftKey) { stop(); s.invertSelection(); return }
      if (mod && k === 'e') { stop(); setModal('export'); return }
      if (mod && k === 's') { stop(); import('../disk').then(m => m.saveNow()); return }
      if (mod && k === '0') { stop(); stageApi.fit(); return }
      if (mod && k === '1') { stop(); stageApi.zoomTo(1); return }
      if (mod && (k === '=' || k === '+')) { stop(); stageApi.zoomBy(1.25); return }
      if (mod && k === '-') { stop(); stageApi.zoomBy(0.8); return }
      if (mod) return
      if (k === 'escape') {
        if (s.crop) useEditor.setState({ crop: null }); else if (s.quickMask) toggleQuickMask(); else if (s.selection) s.setSelection(null, 'Deselect'); else if (s.editingMask) s.setEditingMask(false); else if (s.viewChannel !== 'rgb') useEditor.setState({ viewChannel: 'rgb', docRev: s.docRev + 1 })
        else if (s.selectedIds.length) {
          // Up a level: from a layer to the group it is in, from a group to its parent group, then nothing.
          const sel = s.layers.filter(l => s.selectedIds.includes(l.id))
          const whole = (gid: string) => s.layers.filter(l => inGroup(l, gid, s.groups)).every(l => s.selectedIds.includes(l.id))
          const chains = sel.map(l => groupChain(l.groupId, s.groups))
          const common = chains[0].filter(g => chains.every(c => c.includes(g)))
          const blocked = s.isolatedGroupId ? [s.isolatedGroupId, ...groupChain(s.isolatedGroupId, s.groups)] : []
          const up = common.find(g => !whole(g) && !blocked.includes(g))
          if (up) s.selectGroup(up); else if (s.isolatedGroupId) s.setIsolated(null); else s.setActive(null)
        } else if (s.isolatedGroupId) s.setIsolated(null)
        return
      }
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
        const u = useUi.getState()
        const d = e.shiftKey ? (u.bigNudge || 10) : (u.nudge || 1)
        const dx = k === 'arrowleft' ? -d : k === 'arrowright' ? d : 0, dy = k === 'arrowup' ? -d : k === 'arrowdown' ? d : 0
        // Linked layers come along, as they do when dragging.
        const links = new Set(s.layers.filter(l => s.selectedIds.includes(l.id) && l.linkId).map(l => l.linkId))
        const moving = s.layers.filter(l => (s.selectedIds.includes(l.id) || (l.linkId && links.has(l.linkId))) && !l.locked && !l.lockPosition && l.type !== 'adjustment')
        s.updateLayers(moving.map(l => ({ id: l.id, patch: { x: l.x + dx, y: l.y + dy } })))
        // Nudged across a board edge: the layer now belongs to the board it sits on.
        const doc = useEditor.getState().doc
        if (doc?.frames?.length) for (const l of useEditor.getState().layers) if (moving.some(m => m.id === l.id)) { const f = frameForLayer(doc, l); if (f && f.id !== l.frameId) s.reassignLayerFrame(l.id, f.id) }
        // Presses in quick succession make one undo step.
        s.commit('Nudge', { merge: 1000 })
        return
      }
      if (k === 'enter') {
        // A whole group selected: Enter goes inside it and selects its top layer. One text layer: edit it.
        if (s.selectedIds.length > 1) {
          const sel = s.layers.filter(l => s.selectedIds.includes(l.id))
          const g = groupChain(sel[0].groupId, s.groups).find(gid => s.layers.filter(l => inGroup(l, gid, s.groups)).every(l => s.selectedIds.includes(l.id)) && sel.every(l => inGroup(l, gid, s.groups)))
          // One level in: the group or layer directly inside it, at the top of the stack.
          if (g) { stop(); const top = sel[sel.length - 1]; const chain = groupChain(top.groupId, s.groups), at = chain.indexOf(g); if (at > 0) s.selectGroup(chain[at - 1]); else s.setActive(top.id); return }
        }
        const l = s.active(); if (l?.type === 'text') { stop(); useEditor.setState({ editingTextId: l.id, tool: 'move' }) } return
      }
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
    <main className={`h-[100dvh] flex flex-col bg-void-950 text-void-100 overflow-hidden ${ui.density === 'compact' ? 'vc-compact' : ''} ${ui.touchMode || coarse ? 'vc-touch' : ''}`} style={{ ['--vc-ui-scale' as any]: ui.uiScale }}>
      {!(phone && hasDoc) && <MenuBar onExport={() => setModal('export')} onAdd={() => setModal('add')} onSearch={() => setModal('palette')} />}
      {hasDoc && !phone && <div className="vc-chrome"><TabBar onNew={() => useEditor.getState().closeDoc()} /></div>}
      {!hasDoc ? <StartScreen /> : phone ? <MobileEditor /> : (
        <>
          <OptionsBar />
          <div className="flex-1 min-h-0 flex flex-col md:flex-row relative">
            <ToolRail />
            <div data-tool-host className="relative flex-1 min-w-0 min-h-0 flex">
              <Stage />
              <FloatingTools />
            </div>
            <button onClick={() => setPanel(true)} aria-label="Open panels" className="md:hidden absolute right-3 top-3 z-10 h-10 px-3 rounded-full bg-void-900/95 border border-void-700 text-[13px] flex items-center gap-2 shadow-lg"><PanelRight size={16} />Layers</button>
            <Dock onOpenFilters={openFilters} />
            <MobilePanels open={panel} onClose={() => setPanel(false)} onOpenFilters={openFilters} />
          </div>
          <StatusBar />
        </>
      )}

      {fxAsk && hasDoc && <FxScopeDialog targets={fxAsk.targets} fx={fxAsk.fx} onClose={() => setFxAsk(null)} />}
      {ctxMenu && hasDoc && !phone && <CanvasMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onDone={closeCtx} />}
      {m === 'add' && hasDoc && <AddMenu onClose={close} />}
      {m === 'filters' && hasDoc && <AddMenu filtersOnly onClose={close} />}
      {m === 'palette' && hasDoc && <CommandPalette onClose={close} open={x => setModal(x)} />}
      {m === 'resize' && hasDoc && <ResizeDialog onClose={close} />}
      {m === 'brand' && <BrandKitDialog onClose={close} />}
      {m === 'keys' && <ShortcutSheet onClose={close} />}
      {m === 'boards' && hasDoc && <BoardsPanel onClose={close} />}
      {m === 'privacy' && <PrivacyPanel onClose={close} />}
      {m === 'account' && <Modal title="Account and sync" onClose={close}><AccountPanel /></Modal>}
      {m === 'export' && hasDoc && <ExportDialog onClose={close} boards={modal?.props?.boards} />}
      {m === 'imageSize' && hasDoc && <ImageSizeDialog onClose={close} />}
      {m === 'canvasSize' && hasDoc && <CanvasSizeDialog onClose={close} aiFill={modal?.props?.aiFill} />}
      {m === 'guideLayout' && hasDoc && <GuideLayoutDialog onClose={close} />}
      {m === 'newGuide' && hasDoc && <NewGuideDialog onClose={close} />}
      {m === 'saveWorkspace' && <NameDialog onClose={close} title="Save workspace" label="Workspace name" placeholder="My layout" initial={useUi.getState().workspace.name === 'Essentials' ? '' : useUi.getState().workspace.name} onSubmit={n => useUi.getState().saveWorkspaceAs(n)} />}
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
      {hasDoc && !phone && <AfterExport />}
      {shownToast && (
        <div role="status" aria-live="polite" className={`fixed z-[95] left-1/2 -translate-x-1/2 ${phone && hasDoc ? 'top-[calc(60px+env(safe-area-inset-top))]' : 'bottom-16 md:bottom-10'} max-w-[92vw] px-4 py-2.5 rounded-xl bg-white text-void-950 text-[13px] font-medium shadow-2xl`}>{shownToast}</div>
      )}
    </main>
  )
}

export { readCrashedSession }

// The designs open in this browser tab, kept for the length of the tab (a reload reopens them).
const OPEN_KEY = 'vc-open'
function rememberOpen(tabs: { id: string; name: string }[], active: string | null) {
  try { sessionStorage.setItem(OPEN_KEY, JSON.stringify({ tabs: tabs.map(t => ({ id: t.id, name: t.name })), active })) } catch { /* ignore */ }
}
function recallOpen(): { tabs: { id: string; name: string }[]; active: string | null } | null {
  try { const raw = sessionStorage.getItem(OPEN_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}
/** Read once when the page loads, before this page writes its own list; used at most once, and only when
 *  this load is a reload or a return with Back/Forward. Going to /editor afresh shows the start screen. */
const navType = typeof performance !== 'undefined' ? (performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined)?.type : undefined
let openAtStart = typeof window !== 'undefined' && (navType === 'reload' || navType === 'back_forward') ? recallOpen() : null

/** Effects page settings as editable effects. */
function effectsFrom(list: { effect: string; params: Record<string, number | string> }[]): Effect[] {
  return list.map(x => { const e = newEffect('voidEffect', x.effect as any); e.effectParams = { ...e.effectParams!, ...x.params } as any; return e })
}
function fxNames(fx: Effect[]): string {
  const n = fx.map(e => effectLabel(e, ADJUSTMENT_LABELS))
  return n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : n[0] ?? ''
}
function nameOf(t: FxTarget): string {
  const s = useEditor.getState()
  if (t.type === 'layer') return `“${s.layers.find(l => l.id === t.id)?.name ?? 'the layer'}”`
  if (t.type === 'group') return `the group “${s.groups.find(g => g.id === t.id)?.name ?? ''}”`
  return 'the design'
}
