'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, BookOpen, Bug, Camera, Check, ChevronRight, Clock, Copy, Crop, Download, Eclipse, Eye, FlipHorizontal, FolderPlus, History, ImageIcon, ImageOff, LayoutGrid, Layers as LayersIcon, Lock, MessageSquare, MoreHorizontal, PenLine, Pilcrow, Redo2, Scaling, Search, Settings, Share2, Shield, SlidersHorizontal, Sparkles, SquareStack, Trash2, Type, Undo2, Unlock, User, Wand2, X } from 'lucide-react'
import { useEditor } from '../store'
import { downloadBlob, exportImage, importFiles, isPrivate, trackExport } from '../io'
import type { Layer, ShapeLayer, TextLayer, ToolId } from '../types'
import { Stage } from './Stage'
import { LayersPanel } from './LayersPanel'
import { PropertiesPanel, removeBackground } from './PropertiesPanel'
import { TOOLS } from './ToolRail'
import { buildActions, openModal } from '../actions'
import { PanelBody } from './Dock'
import { Slider } from './ui'
import { FONTS, ensureFont } from '../io'
import * as ops from '../ops'
import { touchCanvas } from '../touch'
import type { PanelId } from '../ui-store'

// The phone Editor: a top bar, the canvas, and five modes along the bottom. Selecting something turns the
// Select sheet into its inspector (every setting the desktop Properties panel has). A long press opens the
// actions for what is under the finger. More holds everything else: boards, versions, resize, panels, help.

type Mode = 'select' | 'text' | 'image' | 'shape' | 'effects'
const MODES: { id: Mode; label: string; icon: typeof Type }[] = [
  { id: 'select', label: 'Select', icon: Wand2 },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'image', label: 'Image', icon: ImageIcon },
  { id: 'shape', label: 'Shape', icon: Sparkles },
  { id: 'effects', label: 'Effects', icon: Eclipse },
]
type SheetId = 'layers' | 'export' | 'more' | 'context' | { panel: PanelId; title: string }

/**
 * The phone shell: narrow screens, and any touch screen whose short side is under 600 px, in either
 * orientation (a phone turned sideways keeps its layout). Tablets keep the desktop layout, with touch mode on.
 */
export function useIsPhone() {
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const qs = ['(max-width: 767px)', '(pointer: coarse) and (max-width: 599px)', '(pointer: coarse) and (max-height: 599px)'].map(q => window.matchMedia(q))
    const on = () => setPhone(qs.some(m => m.matches)); on()
    qs.forEach(m => m.addEventListener('change', on)); return () => qs.forEach(m => m.removeEventListener('change', on))
  }, [])
  return phone
}

const chip = 'h-11 px-3.5 rounded-xl bg-void-900 border border-white/[0.07] text-[13.5px] text-void-100 inline-flex items-center gap-2 active:bg-void-800 disabled:opacity-40 whitespace-nowrap'
const primary = 'h-11 px-4 rounded-xl bg-accent text-white text-[13.5px] font-medium inline-flex items-center gap-2 active:opacity-90 whitespace-nowrap'
const pill = 'absolute left-1/2 -translate-x-1/2 top-3 z-10 min-h-9 px-2 py-1 rounded-full bg-void-950/90 border border-white/[0.1] text-[12.5px] text-void-200 inline-flex items-center gap-2 backdrop-blur max-w-[calc(100%-24px)]'
const pillBtn = 'h-8 px-3 rounded-full text-[12.5px] font-medium'

export function MobileEditor() {
  const doc = useEditor(s => s.doc)
  const name = useEditor(s => s.doc?.name ?? '')
  const canUndo = useEditor(s => s.historyIndex > 0)
  const canRedo = useEditor(s => s.historyIndex < s.history.length - 1)
  const layerCount = useEditor(s => s.layers.length)
  const selCount = useEditor(s => s.selectedIds.length)
  const active = useEditor(s => (s.selectedIds.length >= 1 ? s.layers.find(l => l.id === s.activeId) : undefined))
  const editingText = useEditor(s => !!s.editingTextId)
  const tool = useEditor(s => s.tool)
  const crop = useEditor(s => s.crop)
  const transform = useEditor(s => !!s.transform)
  const dirty = useEditor(s => s.dirty)
  const [mode, setMode] = useState<Mode | null>(null)
  const [sheet, setSheet] = useState<SheetId | null>(null)
  const [several, setSeveral] = useState(false)
  const [context, setContext] = useState<{ id: string; under: string[] } | null>(null)
  const s = useEditor.getState()

  // The canvas behaves for fingers while this shell is shown.
  useEffect(() => { touchCanvas.phone = true; return () => { touchCanvas.phone = false; touchCanvas.several = false } }, [])
  useEffect(() => { touchCanvas.several = several }, [several])

  // Selecting a layer on the canvas opens the Select sheet for it; clearing the selection closes it.
  // Starts with whatever is selected when the document opens, so opening a photo does not pop the sheet.
  const lastActive = useRef<string | undefined | null>(null)
  useEffect(() => {
    if (lastActive.current === null) { lastActive.current = active?.id; return }
    if (active?.id !== lastActive.current) {
      lastActive.current = active?.id
      if (active && !editingText && !several && sheet !== 'layers') { setSheet(null); setMode('select') }
      if (!active && mode === 'select') setMode(null)
    }
  }, [active, editingText, mode, several, sheet])
  // Typing on the canvas: the text bar is enough; keep the bottom clear for the keyboard.
  useEffect(() => { if (editingText) { setMode(null); setSheet(null) } }, [editingText])
  // A long press anywhere (canvas or Layers list) opens that layer's actions.
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent).detail as { id: string; under?: string[] }; setContext({ id: d.id, under: d.under ?? [d.id] }); setMode(null); setSheet('context') }
    window.addEventListener('vc:longpress', on); return () => window.removeEventListener('vc:longpress', on)
  }, [])

  const toggle = (m: Mode) => { setSheet(null); setMode(mode === m ? null : m) }
  const close = () => { setMode(null); setSheet(null) }
  const openSheet = (id: SheetId) => { setMode(null); setSheet(cur => (typeof cur === 'string' && cur === id ? null : id)) }
  const back = async () => { const { flushSave } = await import('../io'); await flushSave(); useEditor.getState().closeDoc() }

  return (
    <div className="flex-1 min-h-0 flex flex-col relative" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      {/* Top bar */}
      <header className="shrink-0 flex items-center gap-1 px-2 border-b border-white/[0.06] bg-surface-raised" style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 48 }}>
        <button aria-label="Back to start" onClick={back} className="w-10 h-10 flex items-center justify-center rounded-lg text-void-200 active:bg-void-800"><ArrowLeft size={20} /></button>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <input aria-label="Design name" value={name} onChange={e => s.setDoc({ name: e.target.value })} onBlur={() => useEditor.setState({ dirty: true })} className="min-w-0 h-7 px-2 rounded-md bg-transparent text-[14px] text-void-100 truncate outline-none focus:bg-void-900" />
          <span data-save-state aria-live="polite" className="px-2 -mt-0.5 text-[10.5px] leading-none text-void-500 inline-flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isPrivate() ? 'bg-accent' : dirty ? 'bg-amber-400' : 'bg-emerald-500'}`} />{isPrivate() ? 'Private, not saved' : dirty ? 'Saving' : 'Saved'}
          </span>
        </div>
        <button aria-label="Undo" disabled={!canUndo} onClick={s.undo} className="w-10 h-10 flex items-center justify-center rounded-lg text-void-200 disabled:opacity-30 active:bg-void-800"><Undo2 size={19} /></button>
        <button aria-label="Redo" disabled={!canRedo} onClick={s.redo} className="w-10 h-10 flex items-center justify-center rounded-lg text-void-200 disabled:opacity-30 active:bg-void-800"><Redo2 size={19} /></button>
        <button aria-label="More" onClick={() => openSheet('more')} className="w-10 h-10 flex items-center justify-center rounded-lg text-void-200 active:bg-void-800"><MoreHorizontal size={20} /></button>
        <button onClick={() => openSheet('export')} className="h-9 px-3 ml-0.5 rounded-lg bg-white text-void-950 text-[13px] font-medium inline-flex items-center gap-1.5"><Share2 size={15} />Share</button>
      </header>

      {/* Canvas, with its pills and the sheets that sit on it */}
      <div className="flex-1 min-h-0 relative flex">
        <Stage />
        {!editingText && !several && (
          <button onClick={() => openSheet('layers')} aria-label={`Layers, ${layerCount}`}
            className="absolute right-3 top-3 z-10 h-10 px-3 rounded-full bg-void-950/90 border border-white/[0.1] text-[13px] text-void-100 inline-flex items-center gap-1.5 backdrop-blur">
            <LayersIcon size={15} />{layerCount}
          </button>
        )}
        {several && !editingText && (
          <div className={pill} role="status">
            <span className="pl-1.5">{selCount} selected · tap to add or remove</span>
            <button onClick={() => { setSeveral(false); setMode('select') }} className={`${pillBtn} bg-white text-void-950`}>Done</button>
          </div>
        )}
        {!several && tool === 'crop' && !editingText && (
          <div className={pill} data-crop-pill>
            {crop && crop.w > 1 ? (
              <>
                <span className="pl-1.5 tabular-nums">{Math.round(crop.w)} × {Math.round(crop.h)}</span>
                <button onClick={() => { useEditor.setState({ crop: null }); s.setTool('move') }} className={`${pillBtn} bg-void-800 text-void-100`}>Cancel</button>
                <button onClick={() => { const c = useEditor.getState().crop; if (c) s.cropTo(c.x, c.y, c.w, c.h); useEditor.setState({ crop: null }); s.setTool('move') }} className={`${pillBtn} bg-accent text-white`}>Apply</button>
              </>
            ) : (
              <>
                <CropAspect />
                <button onClick={() => s.setTool('move')} className={`${pillBtn} bg-void-800 text-void-100`}>Cancel</button>
              </>
            )}
          </div>
        )}
        {!several && transform && (
          <div className={pill} data-transform-pill>
            <span className="pl-1.5">Drag the corners</span>
            <button onClick={() => ops.cancelTransform()} className={`${pillBtn} bg-void-800 text-void-100`}>Cancel</button>
            <button onClick={() => ops.applyTransform()} className={`${pillBtn} bg-accent text-white`}>Apply</button>
          </div>
        )}
        {!several && !transform && tool !== 'move' && tool !== 'crop' && !editingText && (
          <div className={pill}>
            <span className="pl-1.5">{TOOLS.find(t => t.id === tool)?.label ?? tool}</span>
            <button onClick={() => s.setTool('move')} className={`${pillBtn} bg-white text-void-950`}>Done</button>
          </div>
        )}

        {sheet === 'layers' && (
          <Sheet title="Layers" onClose={close} tall action={<button onClick={() => { setSeveral(v => !v); }} className={`h-8 px-3 rounded-lg text-[13px] ${several ? 'bg-accent text-white' : 'text-void-200 active:bg-void-800'}`}>{several ? 'Selecting several' : 'Select several'}</button>}>
            <div className="-mx-4 h-full"><LayersPanel /></div>
          </Sheet>
        )}
        {sheet === 'export' && <ExportSheet onClose={close} />}
        {sheet === 'more' && <MoreSheet onClose={close} openPanel={(panel, title) => setSheet({ panel, title })} />}
        {sheet === 'context' && context && <ContextSheet ctx={context} onClose={close} onInspect={() => { setSheet(null); setMode('select') }} onSeveral={() => { setSheet(null); setMode(null); setSeveral(true) }} />}
        {sheet && typeof sheet === 'object' && (
          <Sheet title={sheet.title} onClose={close} tall>
            <div className="vc-phone-panel -mx-4 h-full"><PanelBody id={sheet.panel} onOpenFilters={() => openModal('filters')} /></div>
          </Sheet>
        )}
        {mode && !sheet && (
          <Sheet title={mode === 'select' && selCount > 1 ? `${selCount} layers` : MODES.find(m => m.id === mode)!.label} onClose={close} peek={mode === 'select' && !!active}>
            {mode === 'select' && <SelectSheet layer={active} count={selCount} onDone={close} onSeveral={() => { setMode(null); setSeveral(true) }} />}
            {mode === 'text' && <TextSheet layer={active?.type === 'text' && selCount === 1 ? (active as TextLayer) : undefined} onDone={close} />}
            {mode === 'image' && <ImageSheet layer={selCount === 1 ? active : undefined} onDone={close} />}
            {mode === 'shape' && <ShapeSheet layer={active?.type === 'shape' && selCount === 1 ? (active as ShapeLayer) : undefined} onDone={close} />}
            {mode === 'effects' && <EffectsSheet onDone={close} />}
          </Sheet>
        )}
      </div>

      {/* Mode bar */}
      {!editingText && !!doc && (
        <nav aria-label="Modes" className="shrink-0 grid grid-cols-5 border-t border-white/[0.06] bg-surface-raised" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => toggle(m.id)} aria-pressed={mode === m.id} className={`h-14 flex flex-col items-center justify-center gap-0.5 text-[11px] ${mode === m.id ? 'text-white' : 'text-void-400'}`}>
              <span className={`w-9 h-7 rounded-lg flex items-center justify-center ${mode === m.id ? 'bg-accent text-white' : ''}`}><m.icon size={18} /></span>{m.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

/**
 * A sheet over the bottom of the canvas. It sits on the mode bar, never under it. A `peek` sheet starts low so
 * the design stays in view while you work on it; the arrow opens it taller, and scrolling inside shows the rest.
 */
function Sheet({ title, onClose, children, tall, peek, action }: { title: string; onClose: () => void; children: ReactNode; tall?: boolean; peek?: boolean; action?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const size = peek ? (open ? 'h-[min(66dvh,100%)]' : 'max-h-[min(36dvh,100%)]') : tall ? 'h-[min(62dvh,100%)]' : 'max-h-[min(50dvh,100%)]'
  return (
    <section aria-label={title} data-mobile-sheet data-sheet-size={peek ? (open ? 'tall' : 'peek') : tall ? 'tall' : 'short'} className={`absolute inset-x-0 bottom-0 z-20 ${size} flex flex-col rounded-t-2xl border-t border-white/[0.08] bg-surface-overlay shadow-[0_-12px_40px_rgba(0,0,0,0.5)]`}>
      <div className="flex items-center h-11 px-4 shrink-0 gap-2">
        <span className="text-[12px] uppercase tracking-wider text-void-400 truncate">{title}</span>
        <span className="ml-auto" />
        {action}
        {peek && <button onClick={() => setOpen(v => !v)} aria-label={open ? 'Show less' : 'Show all settings'} aria-expanded={open} className="h-8 w-9 rounded-lg text-void-200 active:bg-void-800 inline-flex items-center justify-center"><ChevronRight size={17} className={open ? 'rotate-90' : '-rotate-90'} /></button>}
        <button onClick={onClose} aria-label="Close" className="h-8 px-3 rounded-lg text-[13px] text-void-200 active:bg-void-800 inline-flex items-center gap-1"><Check size={15} />Done</button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
    </section>
  )
}

function Row({ children }: { children: ReactNode }) { return <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-1">{children}</div> }
function Label({ children }: { children: ReactNode }) { return <div className="text-[12px] text-void-400 mt-3 mb-1.5">{children}</div> }

function CropAspect() {
  const a = useEditor(s => s.options.cropAspect)
  const set = (v: number | null) => useEditor.getState().setOption('cropAspect', v)
  return (
    <span className="flex items-center gap-1 overflow-x-auto no-scrollbar">
      <span className="pl-1.5 pr-1 whitespace-nowrap">Drag to crop</span>
      {([['Free', null], ['1:1', 1], ['4:5', 0.8], ['16:9', 16 / 9]] as [string, number | null][]).map(([l, v]) => (
        <button key={l} onClick={() => set(v)} aria-pressed={a === v} className={`h-7 px-2 rounded-full text-[12px] ${a === v ? 'bg-white text-void-950' : 'text-void-300'}`}>{l}</button>
      ))}
    </span>
  )
}

/** The selected layer's inspector, the actions for several layers, or the design when nothing is selected. */
function SelectSheet({ layer, count, onDone, onSeveral }: { layer?: Layer; count: number; onDone: () => void; onSeveral: () => void }) {
  const s = useEditor.getState()
  const [more, setMore] = useState(false)
  if (!layer) {
    return (
      <>
        <p className="text-[13.5px] text-void-300 py-2">Tap anything on the canvas to change it. Hold a finger on it for more. Add something with Text, Image or Shape.</p>
        <Row><button className={chip} onClick={onSeveral}><SquareStack size={15} />Select several</button></Row>
        <div className="vc-phone-panel -mx-4 mt-2"><PropertiesPanel onOpenFilters={() => openModal('filters')} /></div>
        <MoreTools onPick={onDone} />
      </>
    )
  }
  if (count > 1) {
    return (
      <>
        <Row>
          <button className={primary} onClick={() => s.groupSelected()}><FolderPlus size={15} />Group</button>
          <button className={chip} onClick={() => { for (const id of [...useEditor.getState().selectedIds]) useEditor.getState().duplicateLayer(id) }}><Copy size={15} />Duplicate</button>
          <button className={chip} onClick={() => { s.removeSelected(); onDone() }}><Trash2 size={15} />Delete</button>
          <button className={chip} onClick={onSeveral}><SquareStack size={15} />Add more</button>
        </Row>
        <Slider label="Opacity of all" value={Math.round(layer.opacity * 100)} min={0} max={100} unit="%" onChange={v => { const st = useEditor.getState(); st.updateLayers(st.selectedIds.map(id => ({ id, patch: { opacity: v / 100 } }))) }} onCommit={() => s.commit('Opacity')} />
        <div className="vc-phone-panel -mx-4 mt-2"><PropertiesPanel onOpenFilters={() => openModal('filters')} /></div>
      </>
    )
  }
  const idx = s.layers.findIndex(l => l.id === layer.id)
  return (
    <>
      <Row>
        {layer.type === 'text' && <button className={primary} onClick={() => { useEditor.setState({ editingTextId: layer.id }); onDone() }}><PenLine size={15} />Edit text</button>}
        {layer.type === 'raster' && <button className={primary} onClick={() => { s.setTool('crop'); onDone() }}><Crop size={15} />Crop</button>}
        {layer.type === 'raster' && <button className={chip} onClick={() => { removeBackground(layer.id); onDone() }}><ImageOff size={15} />Remove background</button>}
        {layer.type === 'raster' && <button className={chip} onClick={() => openModal('filters')}><Eclipse size={15} />Filters</button>}
        <button className={chip} onClick={() => s.duplicateLayer(layer.id)}><Copy size={15} />Duplicate</button>
        <button className={chip} onClick={() => { s.removeSelected(); onDone() }}><Trash2 size={15} />Delete</button>
      </Row>
      <Row>
        <button className={chip} disabled={idx >= s.layers.length - 1} onClick={() => s.moveLayer(layer.id, idx + 1)}>Bring forward</button>
        <button className={chip} disabled={idx <= 0} onClick={() => s.moveLayer(layer.id, idx - 1)}>Send back</button>
        {layer.type !== 'adjustment' && <button className={chip} onClick={() => s.flip(layer.id, 'h')}><FlipHorizontal size={15} />Flip</button>}
        {layer.type !== 'adjustment' && <button className={chip} onClick={() => { s.align('hcenter'); s.align('vcenter') }}>Centre</button>}
        {layer.type !== 'adjustment' && <button className={chip} onClick={() => { ops.beginTransform('free'); onDone() }}><Scaling size={15} />Transform</button>}
        <button className={chip} onClick={onSeveral}><SquareStack size={15} />Select several</button>
      </Row>
      {/* Everything the desktop Properties panel has: filter settings, text, shape, shadow, mask, blend, position. */}
      <div className="vc-phone-panel -mx-4 mt-2" data-phone-inspector><PropertiesPanel onOpenFilters={() => openModal('filters')} /></div>
      <button onClick={() => setMore(v => !v)} className="mt-3 h-9 text-[13px] text-void-300 inline-flex items-center gap-1"><MoreHorizontal size={15} />{more ? 'Fewer tools' : 'More tools'}</button>
      {more && <MoreTools onPick={onDone} />}
    </>
  )
}

/** Every desktop tool, one tap each. Picking one closes the sheet and shows a Done pill on the canvas. */
function MoreTools({ onPick }: { onPick: () => void }) {
  const s = useEditor.getState()
  const hide = new Set<ToolId>(['move', 'text', 'shape', 'hand', 'zoom'])
  return (
    <div className="grid grid-cols-4 gap-2 mt-2">
      {TOOLS.filter(t => !hide.has(t.id)).map(t => (
        <button key={t.id} onClick={() => { s.setTool(t.id); onPick() }} className="h-16 rounded-xl bg-void-900 border border-white/[0.07] flex flex-col items-center justify-center gap-1 text-[11px] text-void-200 active:bg-void-800">
          <t.icon size={18} /><span className="truncate max-w-full px-1">{t.label.replace(/ \(.*\)$/, '')}</span>
        </button>
      ))}
    </div>
  )
}

function ColourChip({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  return (
    <label className={`${chip} cursor-pointer`}>
      <span className="w-5 h-5 rounded-full border border-white/30" style={{ background: value }} />{label}
      <input type="color" value={value} onChange={e => onChange(e.target.value)} onBlur={() => useEditor.getState().commit('Colour')} className="sr-only" />
    </label>
  )
}

function TextSheet({ layer, onDone }: { layer?: TextLayer; onDone: () => void }) {
  const s = useEditor.getState()
  const add = (box?: boolean) => { const d = s.doc; if (!d) return; const f = d.frames?.find(x => x.id === s.activeFrameId) ?? d.frames?.[0]; const b = f ? { x: f.x, y: f.y, w: f.width, h: f.height } : { x: 0, y: 0, w: d.width, h: d.height }; box ? s.addText(b.x + b.w * 0.1, b.y + b.h * 0.4, b.w * 0.8) : s.addText(); onDone() }
  const [fonts, setFonts] = useState<string[]>(FONTS)
  const [q, setQ] = useState('')
  useEffect(() => { const used = Array.from(new Set(useEditor.getState().layers.filter(l => l.type === 'text').map(l => (l as TextLayer).fontFamily))); setFonts(Array.from(new Set([...used, ...FONTS]))) }, [])
  const shown = q ? fonts.filter(f => f.toLowerCase().includes(q.toLowerCase())) : fonts
  return (
    <>
      <Row>
        <button className={primary} onClick={() => add()}><Type size={15} />Add heading</button>
        <button className={chip} onClick={() => add(true)}>Add paragraph</button>
      </Row>
      {layer && (
        <>
          <div className="flex items-center gap-2 mt-3 mb-1.5">
            <span className="text-[12px] text-void-400">Font</span>
            <input aria-label="Find a font" value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${fonts.length} fonts`} className="ml-auto h-8 w-40 px-2.5 rounded-lg bg-void-900 border border-white/[0.07] text-[13px] text-void-100 outline-none" />
          </div>
          <Row>
            {shown.map(f => <button key={f} onClick={async () => { await ensureFont(f, layer.fontWeight, layer.italic); s.updateLayer(layer.id, { fontFamily: f }, 'Font') }} className={`${chip} ${layer.fontFamily === f ? '!bg-white !text-void-950' : ''}`} style={{ fontFamily: `"${f}"` }}>{f}</button>)}
            {!shown.length && <span className="text-[13px] text-void-500 py-3">No font called that. Add your own from More, then Character.</span>}
          </Row>
          <div className="mt-2"><Slider label="Size" value={Math.round(layer.fontSize)} min={8} max={400} onChange={v => s.updateLayer(layer.id, { fontSize: v })} onCommit={() => s.commit('Size')} /></div>
          <div className="mt-2"><Slider label="Line height" value={Math.round(layer.lineHeight * 100) / 100} min={0.7} max={2.5} step={0.05} onChange={v => s.updateLayer(layer.id, { lineHeight: v })} onCommit={() => s.commit('Line height')} /></div>
          <div className="mt-2"><Slider label="Letter spacing" value={layer.letterSpacing} min={-20} max={100} onChange={v => s.updateLayer(layer.id, { letterSpacing: v })} onCommit={() => s.commit('Letter spacing')} /></div>
          <Row>
            {([['Light', 300], ['Regular', 400], ['Medium', 500], ['Bold', 700], ['Black', 900]] as [string, number][]).map(([l, w]) => <button key={l} onClick={() => { s.updateLayer(layer.id, { fontWeight: w }, 'Weight'); ensureFont(layer.fontFamily, w, layer.italic).then(() => useEditor.setState(st => ({ docRev: st.docRev + 1 }))).catch(() => {}) }} className={`${chip} ${layer.fontWeight === w ? '!bg-white !text-void-950' : ''}`}>{l}</button>)}
          </Row>
          <Row>
            {(['left', 'center', 'right'] as const).map(a => <button key={a} onClick={() => s.updateLayer(layer.id, { align: a }, 'Align')} className={`${chip} ${layer.align === a ? '!bg-white !text-void-950' : ''}`}>{a[0].toUpperCase() + a.slice(1)}</button>)}
            <ColourChip label="Colour" value={layer.color} onChange={v => s.updateLayer(layer.id, { color: v })} />
          </Row>
        </>
      )}
    </>
  )
}

function ImageSheet({ layer, onDone }: { layer?: Layer; onDone: () => void }) {
  const s = useEditor.getState()
  const file = useRef<HTMLInputElement>(null), cam = useRef<HTMLInputElement>(null)
  const pick = async (f: File | undefined) => { if (!f) return; await importFiles([f]); onDone() }
  return (
    <>
      <Row>
        <button className={primary} onClick={() => file.current?.click()}><ImageIcon size={15} />Add photo</button>
        <button className={chip} onClick={() => cam.current?.click()}><Camera size={15} />Camera</button>
        {layer?.type === 'raster' && <button className={chip} onClick={() => { s.setTool('crop'); onDone() }}><Crop size={15} />Crop</button>}
        {layer?.type === 'raster' && <button className={chip} onClick={() => { removeBackground(layer.id); onDone() }}><ImageOff size={15} />Remove background</button>}
        {layer?.type === 'raster' && <button className={chip} onClick={() => s.flip(layer.id, 'h')}><FlipHorizontal size={15} />Flip</button>}
      </Row>
      <input ref={file} type="file" accept="image/*,.psd,.pdf,.void" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
      {!layer && <p className="text-[13px] text-void-400 mt-3">Photos, PSDs and PDFs open as layers. Everything stays on this phone.</p>}
    </>
  )
}

function ShapeSheet({ layer, onDone }: { layer?: ShapeLayer; onDone: () => void }) {
  const s = useEditor.getState()
  const add = (kind: ShapeLayer['shape']) => {
    const d = s.doc; if (!d) return
    const f = d.frames?.find(x => x.id === s.activeFrameId) ?? d.frames?.[0]
    const b = f ? { x: f.x, y: f.y, w: f.width, h: f.height } : { x: 0, y: 0, w: d.width, h: d.height }
    const size = Math.round(Math.min(b.w, b.h) * 0.3)
    if (kind === 'line') s.addShape('line', b.x + (b.w - size) / 2, b.y + b.h / 2 - 3, size, 6)
    else s.addShape(kind, b.x + (b.w - size) / 2, b.y + (b.h - size) / 2, size, size)
    onDone()
  }
  return (
    <>
      <Row>
        {([['rect', 'Rectangle'], ['ellipse', 'Circle'], ['line', 'Line'], ['polygon', 'Polygon']] as [ShapeLayer['shape'], string][]).map(([k, l]) => <button key={k} className={chip} onClick={() => add(k)}>{l}</button>)}
      </Row>
      {layer && (
        <Row>
          <ColourChip label="Fill" value={layer.fill ?? '#000000'} onChange={v => s.updateLayer(layer.id, { fill: v } as Partial<ShapeLayer>)} />
          <ColourChip label="Stroke" value={layer.stroke ?? '#000000'} onChange={v => s.updateLayer(layer.id, { stroke: v } as Partial<ShapeLayer>)} />
        </Row>
      )}
    </>
  )
}

function EffectsSheet({ onDone }: { onDone: () => void }) {
  return (
    <>
      <Row>
        <button className={primary} onClick={() => { openModal('filters'); onDone() }}><Eclipse size={15} />Filters</button>
        <button className={chip} onClick={() => { openModal('add', { tab: 'adjust' }); onDone() }}>Adjustments</button>
      </Row>
      <p className="text-[13px] text-void-400 mt-3">Filters and adjustments go on as their own layers, so you can change or remove them later. Tap one on the canvas or in Layers to change its settings.</p>
    </>
  )
}

/** Long press: what can be done with the layer under the finger. */
function ContextSheet({ ctx, onClose, onInspect, onSeveral }: { ctx: { id: string; under: string[] }; onClose: () => void; onInspect: () => void; onSeveral: () => void }) {
  const layer = useEditor(s => s.layers.find(l => l.id === ctx.id))
  const layers = useEditor(s => s.layers)
  const actions = useMemo(() => buildActions(), [])
  if (!layer) return null
  const s = useEditor.getState()
  const run = (id: string) => { const a = actions[id]; if (a && (!a.enabled || a.enabled())) a.run() }
  const below = ctx.under.filter(id => id !== ctx.id).map(id => layers.find(l => l.id === id)).filter(Boolean) as Layer[]
  const item = 'w-full h-12 px-1 flex items-center gap-3 text-left text-[14px] text-void-100 active:bg-void-800 rounded-lg'
  return (
    <Sheet title={layer.name} onClose={onClose}>
      <div className="flex flex-col">
        <button className={item} onClick={onInspect}><SlidersHorizontal size={17} className="text-void-400" />Settings</button>
        <button className={item} onClick={() => { s.duplicateLayer(layer.id); onClose() }}><Copy size={17} className="text-void-400" />Duplicate</button>
        <button className={item} onClick={() => { s.updateLayer(layer.id, { locked: !layer.locked }, layer.locked ? 'Unlock layer' : 'Lock layer'); onClose() }}>{layer.locked ? <Unlock size={17} className="text-void-400" /> : <Lock size={17} className="text-void-400" />}{layer.locked ? 'Unlock' : 'Lock'}</button>
        <button className={item} onClick={() => { s.updateLayer(layer.id, { visible: false }, 'Hide layer'); onClose() }}><Eye size={17} className="text-void-400" />Hide</button>
        <button className={item} onClick={onSeveral}><SquareStack size={17} className="text-void-400" />Select several</button>
        <button className={item} onClick={() => { run('style.copy'); onClose() }}><Copy size={17} className="text-void-400" />Copy style</button>
        <button className={item} onClick={() => { run('style.paste'); onClose() }}><Sparkles size={17} className="text-void-400" />Paste style</button>
        <button className={item} onClick={() => { run('layer.front'); onClose() }}><ChevronRight size={17} className="text-void-400 -rotate-90" />Bring to front</button>
        <button className={item} onClick={() => { run('layer.back'); onClose() }}><ChevronRight size={17} className="text-void-400 rotate-90" />Send to back</button>
        {below.slice(0, 3).map(l => <button key={l.id} className={item} onClick={() => { s.setActive(l.id); onInspect() }}><LayersIcon size={17} className="text-void-400" /><span className="truncate">Select underneath: {l.name}</span></button>)}
        <button className={`${item} !text-rose-300`} onClick={() => { s.setActive(layer.id); s.removeSelected(); onClose() }}><Trash2 size={17} />Delete</button>
      </div>
    </Sheet>
  )
}

/** Everything that is not a mode: boards, versions, resize, templates, files, panels, help and settings. */
function MoreSheet({ onClose, openPanel }: { onClose: () => void; openPanel: (id: PanelId, title: string) => void }) {
  const actions = useMemo(() => buildActions(), [])
  const hasBrief = useEditor(s => !!s.doc?.brief)
  const hasJob = useEditor(s => !!s.doc?.jobId)
  const run = (id: string) => { const a = actions[id]; if (a && (!a.enabled || a.enabled())) { onClose(); a.run() } }
  const item = 'w-full h-12 px-1 flex items-center gap-3 text-left text-[14px] text-void-100 active:bg-void-800 rounded-lg'
  const Item = ({ icon: I, label, onClick }: { icon: typeof Type; label: string; onClick: () => void }) => <button className={item} onClick={onClick}><I size={17} className="text-void-400" /><span className="flex-1">{label}</span><ChevronRight size={15} className="text-void-600" /></button>
  return (
    <Sheet title="More" onClose={onClose} tall>
      <Label>Design</Label>
      <Item icon={Search} label="Search every action" onClick={() => { onClose(); openModal('palette') }} />
      <Item icon={LayoutGrid} label="Boards" onClick={() => run('file.boards')} />
      <Item icon={Scaling} label="Resize for other formats" onClick={() => run('file.resize')} />
      <Item icon={Clock} label="Version history" onClick={() => run('file.versions')} />
      <Item icon={Check} label="Save a version" onClick={() => run('file.version')} />
      <Item icon={SquareStack} label="Save as template" onClick={() => run('file.template')} />
      <Item icon={Download} label="Download the design file (.void)" onClick={() => run('file.void')} />
      <Item icon={Sparkles} label="Brand kit" onClick={() => run('edit.brand')} />
      <Label>Panels</Label>
      <Item icon={History} label="History" onClick={() => openPanel('history', 'History')} />
      <Item icon={Type} label="Character" onClick={() => openPanel('character', 'Character')} />
      <Item icon={Pilcrow} label="Paragraph" onClick={() => openPanel('paragraph', 'Paragraph')} />
      {hasBrief && <Item icon={Check} label="Brief" onClick={() => openPanel('brief', 'Brief')} />}
      {hasJob && <Item icon={MessageSquare} label="Client comments" onClick={() => openPanel('comments', 'Comments')} />}
      <Item icon={Shield} label="Brand checks" onClick={() => openPanel('brand', 'Brand')} />
      <Label>Help and settings</Label>
      <Item icon={BookOpen} label="Learn Voidcanvas" onClick={() => run('help.learn')} />
      <Item icon={MessageSquare} label="Send feedback" onClick={() => run('help.feedback')} />
      <Item icon={Bug} label="Report a bug" onClick={() => run('help.bug')} />
      <Item icon={Settings} label="Preferences" onClick={() => run('edit.prefs')} />
      <Item icon={User} label="Account and sync" onClick={() => run('edit.account')} />
      <Item icon={Shield} label="Your privacy" onClick={() => run('help.privacy')} />
      <button className={`${item} text-void-500`} onClick={onClose}><X size={17} />Close</button>
    </Sheet>
  )
}

/** Export and share. Uses the phone's share sheet when it can hand over files; otherwise saves a download. */
function ExportSheet({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const doc = useEditor(s => s.doc)
  const board = useEditor(s => s.doc?.frames?.find(f => f.id === s.activeFrameId) ?? s.doc?.frames?.[0] ?? null)
  const W = board?.width ?? doc?.width ?? 0, H = board?.height ?? doc?.height ?? 0
  const [scale, setScale] = useState(1)
  const name = (doc?.name || 'design').replace(/[^\w\- ]+/g, '')
  const make = async (format: 'png' | 'jpeg' | 'pdf') => exportImage({ format, scale, quality: 0.92, transparent: false })
  const canShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare
  const share = async (format: 'png' | 'jpeg' | 'pdf') => {
    setBusy('Preparing')
    try {
      const blob = await make(format)
      const ext = format === 'jpeg' ? 'jpg' : format
      const f = new File([blob], `${name}.${ext}`, { type: blob.type })
      if (canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); trackExport(f.name, blob, { scale, via: 'share' }) }
      else downloadBlob(blob, `${name}.${ext}`, { scale, via: 'phone' })
      import('../versions').then(m => m.saveVersion('Exported', true)).catch(() => {})
      onClose()
    } catch (e) { if ((e as Error)?.name !== 'AbortError') useEditor.getState().notify('Could not export. Try again.') }
    finally { setBusy(null) }
  }
  return (
    <Sheet title="Share" onClose={onClose}>
      <Row>
        <button className={primary} disabled={!!busy} onClick={() => share('png')}><Share2 size={15} />{busy ?? (canShare ? 'Share PNG' : 'Save PNG')}</button>
        <button className={chip} disabled={!!busy} onClick={() => share('jpeg')}>JPG</button>
        <button className={chip} disabled={!!busy} onClick={() => share('pdf')}>PDF</button>
      </Row>
      <Label>Size</Label>
      <Row>
        {[1, 2].map(k => <button key={k} onClick={() => setScale(k)} className={`${chip} ${scale === k ? '!bg-white !text-void-950' : ''}`}>{k}x · {W * k} × {H * k}</button>)}
        <button className={chip} onClick={() => { openModal('export'); onClose() }}>More options</button>
      </Row>
      {isPrivate() && <p className="text-[12.5px] text-void-400 mt-3">Private session: nothing is saved on this phone unless you export it.</p>}
    </Sheet>
  )
}
