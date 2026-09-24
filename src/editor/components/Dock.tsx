'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Blend, ChevronDown, ChevronRight, CircleDot, Compass, FunctionSquare, History, Info, Layers, Palette, Pilcrow, Route, SlidersHorizontal, SwatchBook, Type, X, ClipboardCheck } from 'lucide-react'
import { PANEL_LABELS } from '../actions'
import { useUi, type DockGroup, type FloatingPanel, type PanelId } from '../ui-store'
import { AdjustmentsPanel, BrandPanel, ChannelsPanel, CharacterPanel, HistoryPanel, InfoPanel, NavigatorPanel, ParagraphPanel, PathsPanel, StylesPanel, SwatchesPanel, BriefPanel } from './panels'
import { LayersPanel } from './LayersPanel'
import { PropertiesPanel } from './PropertiesPanel'
import { Tooltip, focusRing } from './ui'

// A Photopea-style dock: an icon strip for tucked-away panels, and a column of tab groups that can be
// reordered, resized, collapsed, dragged into each other, or pulled out as floating windows.

export const PANEL_ICONS: Record<PanelId, typeof Layers> = {
  properties: SlidersHorizontal, layers: Layers, channels: CircleDot, paths: Route, history: History, swatches: Palette,
  adjustments: Blend, character: Type, paragraph: Pilcrow, info: Info, brand: SwatchBook, navigator: Compass, styles: FunctionSquare, brief: ClipboardCheck,
}

export function PanelBody({ id, onOpenFilters }: { id: PanelId; onOpenFilters: () => void }) {
  switch (id) {
    case 'properties': return <div className="h-full overflow-y-auto"><PropertiesPanel onOpenFilters={onOpenFilters} /></div>
    case 'layers': return <LayersPanel />
    case 'history': return <HistoryPanel />
    case 'channels': return <ChannelsPanel />
    case 'paths': return <PathsPanel />
    case 'swatches': return <div className="h-full overflow-y-auto"><SwatchesPanel /></div>
    case 'adjustments': return <div className="h-full overflow-y-auto"><AdjustmentsPanel /></div>
    case 'character': return <div className="h-full overflow-y-auto"><CharacterPanel /></div>
    case 'paragraph': return <div className="h-full overflow-y-auto"><ParagraphPanel /></div>
    case 'info': return <div className="h-full overflow-y-auto"><InfoPanel /></div>
    case 'navigator': return <div className="h-full overflow-y-auto"><NavigatorPanel /></div>
    case 'brand': return <div className="h-full overflow-y-auto"><BrandPanel /></div>
    case 'styles': return <div className="h-full overflow-y-auto"><StylesPanel /></div>
    case 'brief': return <div className="h-full overflow-y-auto"><BriefPanel /></div>
  }
}

// Drag state shared by all drop targets while a panel tab is being dragged.
let dragging: PanelId | null = null
let dropped = false
let lastPoint = { x: 0, y: 0 }
if (typeof window !== 'undefined') window.addEventListener('dragover', e => { lastPoint = { x: e.clientX, y: e.clientY } })

function Tab({ id, active, onClick }: { id: PanelId; active: boolean; onClick: () => void }) {
  return (
    <button role="tab" aria-selected={active} draggable
      onDragStart={e => { dragging = id; dropped = false; e.dataTransfer.setData('text/vc-panel', id); e.dataTransfer.effectAllowed = 'move' }}
      onDragEnd={() => {
        // Dropped outside any dock target: the panel becomes a floating window where it was let go.
        if (!dropped && dragging) useUi.getState().movePanel(dragging, { float: { x: Math.max(8, lastPoint.x - 60), y: Math.max(48, lastPoint.y - 14) } })
        dragging = null; window.dispatchEvent(new Event('vc:dragend'))
      }}
      onClick={onClick}
      className={`h-7 px-2.5 shrink-0 rounded-md text-[12px] whitespace-nowrap cursor-grab active:cursor-grabbing ${focusRing} ${active ? 'bg-white/[0.07] text-white font-medium' : 'text-void-400 hover:text-void-100'}`}>
      {PANEL_LABELS[id].replace('Colour and swatches', 'Swatches')}
    </button>
  )
}

function useDragActive() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const start = (e: DragEvent) => { if (e.dataTransfer?.types.includes('text/vc-panel')) setOn(true) }
    const end = () => setOn(false)
    window.addEventListener('dragstart', start); window.addEventListener('vc:dragend', end); window.addEventListener('drop', end)
    return () => { window.removeEventListener('dragstart', start); window.removeEventListener('vc:dragend', end); window.removeEventListener('drop', end) }
  }, [])
  return on
}

const accept = (e: React.DragEvent) => e.dataTransfer.types.includes('text/vc-panel')

function Group({ g, index, onOpenFilters, flex }: { g: DockGroup; index: number; onOpenFilters: () => void; flex: number }) {
  const ui = useUi.getState()
  const [hot, setHot] = useState<'tabs' | 'below' | null>(null)
  const drag = useDragActive()
  return (
    <section aria-label={PANEL_LABELS[g.active]} className="relative flex flex-col min-h-0 border-b border-white/[0.06]" style={{ flex: g.collapsed ? '0 0 auto' : `${flex} 1 0` }}>
      <div role="tablist" className={`flex items-center gap-0.5 h-9 shrink-0 px-1.5 bg-surface-raised/60 ${hot === 'tabs' ? 'ring-2 ring-inset ring-accent' : ''}`}
        onDragOver={e => { if (accept(e)) { e.preventDefault(); setHot('tabs') } }} onDragLeave={() => setHot(null)}
        onDrop={e => { if (!accept(e)) return; e.preventDefault(); dropped = true; setHot(null); const p = e.dataTransfer.getData('text/vc-panel') as PanelId; ui.movePanel(p, { group: g.id }) }}>
        <div className="flex items-center gap-0.5 min-w-0 overflow-x-auto no-scrollbar">
          {g.tabs.map(t => <Tab key={t} id={t} active={t === g.active && !g.collapsed} onClick={() => ui.updateGroup(g.id, { active: t, collapsed: false })} />)}
        </div>
        <button aria-label={g.collapsed ? 'Expand' : 'Collapse'} onClick={() => ui.updateGroup(g.id, { collapsed: !g.collapsed })} className={`ml-auto w-6 h-6 shrink-0 inline-flex items-center justify-center rounded text-void-500 hover:text-white ${focusRing}`}>{g.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button>
        <button aria-label={`Tuck ${PANEL_LABELS[g.active]} into the side strip`} title="Tuck into the side strip" onClick={() => ui.closePanel(g.active)} className={`w-6 h-6 shrink-0 inline-flex items-center justify-center rounded text-void-500 hover:text-white ${focusRing}`}><X size={13} /></button>
      </div>
      {!g.collapsed && <div className="flex-1 min-h-0 relative"><PanelBody id={g.active} onOpenFilters={onOpenFilters} /></div>}
      {drag && (
        <div className={`absolute left-0 right-0 bottom-0 h-8 z-10 ${hot === 'below' ? 'bg-accent/30 border-t-2 border-accent' : ''}`}
          onDragOver={e => { if (accept(e)) { e.preventDefault(); setHot('below') } }} onDragLeave={() => setHot(null)}
          onDrop={e => { if (!accept(e)) return; e.preventDefault(); dropped = true; setHot(null); ui.movePanel(e.dataTransfer.getData('text/vc-panel') as PanelId, { newGroupAt: index + 1 }) }} />
      )}
    </section>
  )
}

function Divider({ above, below }: { above: DockGroup; below: DockGroup }) {
  const start = useRef<{ y: number; a: number; b: number; h: number } | null>(null)
  return (
    <div role="separator" aria-orientation="horizontal" className="h-1.5 -my-[3px] relative z-10 cursor-row-resize hover:bg-accent/40 touch-none"
      onPointerDown={e => {
        const sec = (e.currentTarget.previousElementSibling as HTMLElement)?.getBoundingClientRect()
        const next = (e.currentTarget.nextElementSibling as HTMLElement)?.getBoundingClientRect()
        if (!sec || !next) return
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        start.current = { y: e.clientY, a: sec.height, b: next.height, h: sec.height + next.height }
      }}
      onPointerMove={e => {
        const st = start.current; if (!st) return
        const a = Math.max(60, Math.min(st.h - 60, st.a + e.clientY - st.y))
        const total = (above.size ?? 1) + (below.size ?? 1)
        useUi.getState().updateGroup(above.id, { size: (a / st.h) * total })
        useUi.getState().updateGroup(below.id, { size: ((st.h - a) / st.h) * total })
      }}
      onPointerUp={() => { start.current = null }} />
  )
}

function Strip({ onOpenFilters }: { onOpenFilters: () => void }) {
  const strip = useUi(s => s.workspace.strip)
  const flyout = useUi(s => s.flyout)
  const [hot, setHot] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const ui = useUi.getState()
  return (
    <div className={`w-10 shrink-0 flex flex-col items-center gap-0.5 py-1.5 border-l border-white/[0.06] bg-surface-overlay ${hot ? 'ring-2 ring-inset ring-accent' : ''}`}
      onDragOver={e => { if (accept(e)) { e.preventDefault(); setHot(true) } }} onDragLeave={() => setHot(false)}
      onDrop={e => { if (!accept(e)) return; e.preventDefault(); dropped = true; setHot(false); ui.movePanel(e.dataTransfer.getData('text/vc-panel') as PanelId, { strip: true }) }}>
      {strip.map(p => {
        const Icon = PANEL_ICONS[p]
        return (
          <Tooltip key={p} label={PANEL_LABELS[p]} side="left">
            <button aria-label={PANEL_LABELS[p]} aria-pressed={flyout === p} draggable
              onDragStart={e => { dragging = p; dropped = false; e.dataTransfer.setData('text/vc-panel', p) }}
              onDragEnd={() => { if (!dropped && dragging) ui.movePanel(dragging, { float: { x: Math.max(8, lastPoint.x - 60), y: Math.max(48, lastPoint.y - 14) } }); dragging = null; window.dispatchEvent(new Event('vc:dragend')) }}
              onClick={e => { setRect((e.currentTarget as HTMLElement).getBoundingClientRect()); ui.setFlyout(flyout === p ? null : p) }}
              className={`w-8 h-8 inline-flex items-center justify-center rounded-lg ${focusRing} ${flyout === p ? 'bg-accent text-white' : 'text-void-400 hover:text-white hover:bg-void-800'}`}>
              <Icon size={16} strokeWidth={1.75} />
            </button>
          </Tooltip>
        )
      })}
      {flyout && rect && typeof document !== 'undefined' && createPortal(
        <Flyout p={flyout} top={rect.top} right={window.innerWidth - rect.left + 6} onOpenFilters={onOpenFilters} />, document.body)}
    </div>
  )
}

function Flyout({ p, top, right, onOpenFilters }: { p: PanelId; top: number; right: number; onOpenFilters: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const scale = useUi(s => s.uiScale)
  useEffect(() => {
    const down = (e: PointerEvent) => { const t = e.target as HTMLElement; if (ref.current?.contains(t) || t.closest('[aria-label="' + PANEL_LABELS[p] + '"]') || t.closest('[role="dialog"]')) return; useUi.getState().setFlyout(null) }
    const t = setTimeout(() => window.addEventListener('pointerdown', down), 0)
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', down) }
  }, [p])
  const h = Math.min(window.innerHeight - top - 12, 520)
  return (
    <div ref={ref} role="dialog" aria-label={`${PANEL_LABELS[p]} panel`} className="fixed z-[70] w-[300px] flex flex-col rounded-xl bg-surface-overlay border border-white/[0.09] shadow-2xl overflow-hidden" style={{ top: Math.max(8, Math.min(top, window.innerHeight - 280)), right, height: Math.max(260, h), width: 300 * scale }}>
      <div className="flex items-center h-9 px-3 border-b border-white/[0.06] shrink-0">
        <span className="text-[12px] font-semibold text-void-100 flex-1">{PANEL_LABELS[p]}</span>
        <button onClick={() => useUi.getState().movePanel(p, { newGroupAt: 99 })} className="text-[11px] text-void-400 hover:text-white mr-2">Dock</button>
        <button aria-label="Close" onClick={() => useUi.getState().setFlyout(null)} className="text-void-400 hover:text-white"><X size={14} /></button>
      </div>
      <div className="flex-1 min-h-0"><ScaledBody id={p} onOpenFilters={onOpenFilters} /></div>
    </div>
  )
}

/** Panel content with the interface size applied, for windows that live outside the zoomed chrome. */
function ScaledBody({ id, onOpenFilters }: { id: PanelId; onOpenFilters: () => void }) {
  const scale = useUi(s => s.uiScale)
  return <div className="h-full" style={{ zoom: scale, height: `${100 / scale}%` } as any}><PanelBody id={id} onOpenFilters={onOpenFilters} /></div>
}

function Floater({ f, onOpenFilters }: { f: FloatingPanel; onOpenFilters: () => void }) {
  const ui = useUi.getState()
  const move = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null)
  const size = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const [hot, setHot] = useState(false)
  return (
    <div role="dialog" aria-label={`${PANEL_LABELS[f.active]} (floating)`} className="fixed z-[60] flex flex-col rounded-xl bg-surface-overlay border border-white/[0.1] shadow-2xl overflow-hidden" style={{ left: f.x, top: f.y, width: f.w, height: f.h }}>
      <div role="tablist" className={`flex items-center gap-0.5 h-9 px-1.5 bg-surface-raised shrink-0 cursor-move touch-none ${hot ? 'ring-2 ring-inset ring-accent' : ''}`}
        onPointerDown={e => { if ((e.target as HTMLElement).closest('button')) return; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); move.current = { x: e.clientX, y: e.clientY, fx: f.x, fy: f.y } }}
        onPointerMove={e => { const m = move.current; if (m) ui.updateFloat(f.id, { x: Math.max(0, Math.min(window.innerWidth - 80, m.fx + e.clientX - m.x)), y: Math.max(0, Math.min(window.innerHeight - 40, m.fy + e.clientY - m.y)) }) }}
        onPointerUp={() => { move.current = null }}
        onDragOver={e => { if (accept(e)) { e.preventDefault(); setHot(true) } }} onDragLeave={() => setHot(false)}
        onDrop={e => { if (!accept(e)) return; e.preventDefault(); dropped = true; setHot(false); ui.movePanel(e.dataTransfer.getData('text/vc-panel') as PanelId, { floatGroup: f.id }) }}>
        {f.tabs.map(t => <Tab key={t} id={t} active={t === f.active} onClick={() => ui.updateFloat(f.id, { active: t })} />)}
        <button aria-label="Dock this panel" title="Dock" onClick={() => ui.movePanel(f.active, { newGroupAt: 99 })} className="ml-auto text-[11px] text-void-400 hover:text-white px-1">Dock</button>
        <button aria-label="Close panel" onClick={() => ui.closePanel(f.active)} className="w-6 h-6 inline-flex items-center justify-center text-void-400 hover:text-white"><X size={13} /></button>
      </div>
      <div className="flex-1 min-h-0"><ScaledBody id={f.active} onOpenFilters={onOpenFilters} /></div>
      <div aria-hidden className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize touch-none"
        onPointerDown={e => { (e.target as HTMLElement).setPointerCapture(e.pointerId); size.current = { x: e.clientX, y: e.clientY, w: f.w, h: f.h } }}
        onPointerMove={e => { const s0 = size.current; if (s0) ui.updateFloat(f.id, { w: Math.max(220, s0.w + e.clientX - s0.x), h: Math.max(160, s0.h + e.clientY - s0.y) }) }}
        onPointerUp={() => { size.current = null }}>
        <svg viewBox="0 0 16 16" className="w-4 h-4 text-void-600"><path d="M14 6v8H6M14 10v4h-4" stroke="currentColor" fill="none" /></svg>
      </div>
    </div>
  )
}

export function Dock({ onOpenFilters }: { onOpenFilters: () => void }) {
  const ws = useUi(s => s.workspace)
  const hydrated = useUi(s => s.hydrated)
  const ui = useUi.getState()
  const resize = useRef<{ x: number; w: number } | null>(null)
  const drag = useDragActive()
  const [hotEnd, setHotEnd] = useState(false)
  if (!hydrated) return null
  return (
    <div className="vc-chrome hidden md:flex h-full shrink-0">
      <Strip onOpenFilters={onOpenFilters} />
      <div className="relative flex flex-col min-h-0 border-l border-white/[0.06] bg-surface-overlay" style={{ width: ws.dockWidth }}>
        <div role="separator" aria-orientation="vertical" aria-label="Resize panels" className="absolute left-[-3px] top-0 bottom-0 w-1.5 z-20 cursor-col-resize hover:bg-accent/40 touch-none"
          onPointerDown={e => { (e.target as HTMLElement).setPointerCapture(e.pointerId); resize.current = { x: e.clientX, w: ws.dockWidth } }}
          onPointerMove={e => { const r = resize.current; if (r) ui.setWorkspace({ ...useUi.getState().workspace, dockWidth: Math.round(Math.max(240, Math.min(520, r.w - (e.clientX - r.x)))) }) }}
          onPointerUp={() => { resize.current = null }} />
        {ws.groups.map((g, i) => (
          <DockSlot key={g.id} g={g} i={i} next={ws.groups[i + 1]} onOpenFilters={onOpenFilters} />
        ))}
        {!ws.groups.length && <p className="p-4 text-[12.5px] text-void-500">Drag a panel icon from the strip here, or choose Window, Workspace, Reset.</p>}
        <div className={`flex-1 min-h-[24px] ${drag ? 'border-2 border-dashed ' + (hotEnd ? 'border-accent bg-accent/10' : 'border-white/10') : ''}`} style={{ flex: ws.groups.length ? '0 0 24px' : '1 1 auto' }}
          onDragOver={e => { if (accept(e)) { e.preventDefault(); setHotEnd(true) } }} onDragLeave={() => setHotEnd(false)}
          onDrop={e => { if (!accept(e)) return; e.preventDefault(); dropped = true; setHotEnd(false); ui.movePanel(e.dataTransfer.getData('text/vc-panel') as PanelId, { newGroupAt: 99 }) }} />
      </div>
      {typeof document !== 'undefined' && createPortal(<>{ws.floating.map(f => <Floater key={f.id} f={f} onOpenFilters={onOpenFilters} />)}</>, document.body)}
    </div>
  )
}

function DockSlot({ g, i, next, onOpenFilters }: { g: DockGroup; i: number; next?: DockGroup; onOpenFilters: () => void }) {
  return (
    <>
      <Group g={g} index={i} onOpenFilters={onOpenFilters} flex={g.size ?? 1} />
      {next && !g.collapsed && !next.collapsed && <Divider above={g} below={next} />}
    </>
  )
}

/** Phones and small tablets: every panel in one bottom sheet with a tab row. */
export function MobilePanels({ open, onClose, onOpenFilters }: { open: boolean; onClose: () => void; onOpenFilters: () => void }) {
  const [tab, setTab] = useState<PanelId>('layers')
  if (!open) return null
  const tabs: PanelId[] = ['layers', 'properties', 'adjustments', 'character', 'styles', 'history', 'swatches', 'channels', 'paths', 'info']
  return (
    <aside aria-label="Panels" className="md:hidden fixed inset-x-0 bottom-0 z-40 h-[62dvh] flex flex-col rounded-t-2xl border-t border-white/[0.08] bg-surface-overlay shadow-2xl">
      <div className="flex items-center gap-1 px-2 pt-2 pb-1.5 overflow-x-auto no-scrollbar border-b border-white/[0.06]">
        {tabs.map(t => <button key={t} onClick={() => setTab(t)} className={`h-8 px-3 shrink-0 rounded-full text-[12.5px] ${tab === t ? 'bg-white text-void-950' : 'text-void-300 bg-void-900'}`}>{PANEL_LABELS[t].replace('Colour and swatches', 'Colour')}</button>)}
        <button aria-label="Close panels" onClick={onClose} className="ml-auto w-9 h-9 shrink-0 flex items-center justify-center text-void-300"><X size={18} /></button>
      </div>
      <div className="flex-1 min-h-0"><PanelBody id={tab} onOpenFilters={onOpenFilters} /></div>
    </aside>
  )
}
