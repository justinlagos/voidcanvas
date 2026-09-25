'use client'

import { HelpMenu } from '@/components/HelpMenu'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Camera, Check, Copy, Crop, Eclipse, FlipHorizontal, ImageIcon, ImageOff, Layers as LayersIcon, MoreHorizontal, PenLine, Redo2, Share2, Sparkles, Trash2, Type, Undo2, Wand2 } from 'lucide-react'
import { useEditor } from '../store'
import { downloadBlob, exportImage, importFiles, isPrivate } from '../io'
import type { Layer, ShapeLayer, TextLayer, ToolId } from '../types'
import { Stage } from './Stage'
import { LayersPanel } from './LayersPanel'
import { TOOLS } from './ToolRail'
import { removeBackground } from './PropertiesPanel'
import { openModal } from '../actions'
import { Slider } from './ui'
import { FONTS, ensureFont } from '../io'

// The phone Editor. Not the desktop chrome squeezed down: a top bar, the canvas, and five modes along the
// bottom, each opening a short sheet with the controls that matter on a phone. Every desktop tool and panel
// is still reachable (More tools, Layers, the menu through Search), so nothing is lost; it is just further away.

type Mode = 'select' | 'text' | 'image' | 'shape' | 'effects'
const MODES: { id: Mode; label: string; icon: typeof Type }[] = [
  { id: 'select', label: 'Select', icon: Wand2 },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'image', label: 'Image', icon: ImageIcon },
  { id: 'shape', label: 'Shape', icon: Sparkles },
  { id: 'effects', label: 'Effects', icon: Eclipse },
]

/** True below the md breakpoint. Drives which Editor shell renders. */
export function useIsPhone() {
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setPhone(mq.matches); on()
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on)
  }, [])
  return phone
}

const chip = 'h-11 px-3.5 rounded-xl bg-void-900 border border-white/[0.07] text-[13.5px] text-void-100 inline-flex items-center gap-2 active:bg-void-800 disabled:opacity-40 whitespace-nowrap'
const primary = 'h-11 px-4 rounded-xl bg-accent text-white text-[13.5px] font-medium inline-flex items-center gap-2 active:opacity-90'

export function MobileEditor() {
  const doc = useEditor(s => s.doc)
  const name = useEditor(s => s.doc?.name ?? '')
  const canUndo = useEditor(s => s.historyIndex > 0)
  const canRedo = useEditor(s => s.historyIndex < s.history.length - 1)
  const layerCount = useEditor(s => s.layers.length)
  const active = useEditor(s => (s.selectedIds.length === 1 ? s.layers.find(l => l.id === s.activeId) : undefined))
  const editingText = useEditor(s => !!s.editingTextId)
  const tool = useEditor(s => s.tool)
  const [mode, setMode] = useState<Mode | null>(null)
  const [sheet, setSheet] = useState<'layers' | 'export' | null>(null)
  const s = useEditor.getState()

  // Selecting a layer on the canvas opens the Select sheet for it; tapping empty canvas closes sheets.
  // Starts with whatever is selected when the document opens, so opening a photo does not pop the sheet.
  const lastActive = useRef<string | undefined | null>(null)
  useEffect(() => {
    if (lastActive.current === null) { lastActive.current = active?.id; return }
    if (active?.id !== lastActive.current) {
      lastActive.current = active?.id
      if (active && !editingText) setMode('select')
      if (!active && mode === 'select') setMode(null)
    }
  }, [active, editingText, mode])
  // Typing on the canvas: the text bar above the text is enough; keep the bottom clear for the keyboard.
  useEffect(() => { if (editingText) { setMode(null); setSheet(null) } }, [editingText])

  const toggle = (m: Mode) => { setSheet(null); setMode(mode === m ? null : m) }
  const close = () => { setMode(null); setSheet(null) }

  return (
    <div className="flex-1 min-h-0 flex flex-col relative">
      {/* Top bar */}
      <header className="h-12 shrink-0 flex items-center gap-1 px-2 border-b border-white/[0.06] bg-surface-raised">
        <button aria-label="Back to start" onClick={() => s.closeDoc()} className="w-10 h-10 flex items-center justify-center rounded-lg text-void-200 active:bg-void-800"><ArrowLeft size={20} /></button>
        <input aria-label="Design name" value={name} onChange={e => s.setDoc({ name: e.target.value })} onBlur={() => useEditor.setState({ dirty: true })} className="flex-1 min-w-0 h-9 px-2 rounded-md bg-transparent text-[14px] text-void-100 truncate outline-none focus:bg-void-900" />
        <button aria-label="Undo" disabled={!canUndo} onClick={s.undo} className="w-10 h-10 flex items-center justify-center rounded-lg text-void-200 disabled:opacity-30 active:bg-void-800"><Undo2 size={19} /></button>
        <button aria-label="Redo" disabled={!canRedo} onClick={s.redo} className="w-10 h-10 flex items-center justify-center rounded-lg text-void-200 disabled:opacity-30 active:bg-void-800"><Redo2 size={19} /></button>
        <HelpMenu />
        <button onClick={() => { setMode(null); setSheet(sheet === 'export' ? null : 'export') }} className="h-9 px-3 ml-1 rounded-lg bg-white text-void-950 text-[13px] font-medium inline-flex items-center gap-1.5"><Share2 size={15} />Share</button>
      </header>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative flex">
        <Stage />
        {!editingText && (
          <button onClick={() => { setMode(null); setSheet(sheet === 'layers' ? null : 'layers') }} aria-label={`Layers, ${layerCount}`}
            className="absolute right-3 top-3 z-10 h-10 px-3 rounded-full bg-void-950/90 border border-white/[0.1] text-[13px] text-void-100 inline-flex items-center gap-1.5 backdrop-blur">
            <LayersIcon size={15} />{layerCount}
          </button>
        )}
        {tool !== 'move' && !editingText && (
          <div className="absolute left-1/2 -translate-x-1/2 top-3 z-10 h-9 px-3 rounded-full bg-void-950/90 border border-white/[0.1] text-[12.5px] text-void-200 inline-flex items-center gap-2 backdrop-blur">
            {TOOLS.find(t => t.id === tool)?.label ?? tool}
            <button onClick={() => s.setTool('move')} className="h-7 px-2 rounded-full bg-white text-void-950 text-[12px] font-medium">Done</button>
          </div>
        )}
      </div>

      {/* Sheets */}
      {sheet === 'layers' && <Sheet title="Layers" onClose={close} tall><LayersPanel /></Sheet>}
      {sheet === 'export' && <ExportSheet onClose={close} />}
      {mode && !sheet && (
        <Sheet title={MODES.find(m => m.id === mode)!.label} onClose={close}>
          {mode === 'select' && <SelectSheet layer={active} onDone={close} />}
          {mode === 'text' && <TextSheet layer={active?.type === 'text' ? (active as TextLayer) : undefined} onDone={close} />}
          {mode === 'image' && <ImageSheet layer={active} onDone={close} />}
          {mode === 'shape' && <ShapeSheet layer={active?.type === 'shape' ? (active as ShapeLayer) : undefined} onDone={close} />}
          {mode === 'effects' && <EffectsSheet onDone={close} />}
        </Sheet>
      )}

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

function Sheet({ title, onClose, children, tall }: { title: string; onClose: () => void; children: ReactNode; tall?: boolean }) {
  return (
    <section aria-label={title} data-mobile-sheet className={`absolute inset-x-0 bottom-14 z-20 ${tall ? 'h-[60dvh]' : 'max-h-[46dvh]'} flex flex-col rounded-t-2xl border-t border-white/[0.08] bg-surface-overlay shadow-[0_-12px_40px_rgba(0,0,0,0.5)]`}>
      <div className="flex items-center h-10 px-4 shrink-0">
        <span className="text-[12px] uppercase tracking-wider text-void-400">{title}</span>
        <button onClick={onClose} aria-label="Close" className="ml-auto h-8 px-3 rounded-lg text-[13px] text-void-200 active:bg-void-800 inline-flex items-center gap-1"><Check size={15} />Done</button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">{children}</div>
    </section>
  )
}

function Row({ children }: { children: ReactNode }) { return <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-1">{children}</div> }
function Label({ children }: { children: ReactNode }) { return <div className="text-[12px] text-void-400 mt-3 mb-1.5">{children}</div> }

/** What you can do with the selected layer, or with the design when nothing is selected. */
function SelectSheet({ layer, onDone }: { layer?: Layer; onDone: () => void }) {
  const s = useEditor.getState()
  const [more, setMore] = useState(false)
  if (!layer) {
    return (
      <>
        <p className="text-[13.5px] text-void-300 py-2">Tap anything on the canvas to change it. Add something with Text, Image or Shape.</p>
        <MoreTools onPick={onDone} />
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
        {(layer.type === 'raster' || layer.type === 'adjustment') && <button className={chip} onClick={() => openModal('filters')}><Eclipse size={15} />Filters</button>}
        {layer.type === 'shape' && <ColourChip label="Fill" value={(layer as ShapeLayer).fill ?? '#000000'} onChange={v => s.updateLayer(layer.id, { fill: v } as Partial<ShapeLayer>)} />}
        {layer.type === 'text' && <ColourChip label="Colour" value={(layer as TextLayer).color} onChange={v => s.updateLayer(layer.id, { color: v } as Partial<TextLayer>)} />}
        <button className={chip} onClick={() => s.duplicateLayer(layer.id)}><Copy size={15} />Duplicate</button>
        <button className={chip} onClick={() => { s.removeSelected(); onDone() }}><Trash2 size={15} />Delete</button>
      </Row>
      {layer.type !== 'adjustment' && <div className="mt-2"><Slider label="Opacity" value={Math.round(layer.opacity * 100)} min={0} max={100} unit="%" onChange={v => s.updateLayer(layer.id, { opacity: v / 100 })} onCommit={() => s.commit('Opacity')} /></div>}
      <Label>Order</Label>
      <Row>
        <button className={chip} disabled={idx >= s.layers.length - 1} onClick={() => s.moveLayer(layer.id, idx + 1)}>Bring forward</button>
        <button className={chip} disabled={idx <= 0} onClick={() => s.moveLayer(layer.id, idx - 1)}>Send back</button>
        {layer.type !== 'adjustment' && <button className={chip} onClick={() => s.flip(layer.id, 'h')}><FlipHorizontal size={15} />Flip</button>}
        <button className={chip} onClick={() => { s.align('hcenter'); s.align('vcenter') }}>Centre</button>
      </Row>
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
  const add = (box?: boolean) => { const d = s.doc; if (!d) return; box ? s.addText(d.width * 0.1, d.height * 0.4, d.width * 0.8) : s.addText(); onDone() }
  const [fonts, setFonts] = useState<string[]>(FONTS)
  useEffect(() => { const used = Array.from(new Set(useEditor.getState().layers.filter(l => l.type === 'text').map(l => (l as TextLayer).fontFamily))); setFonts(Array.from(new Set([...used, ...FONTS]))) }, [])
  return (
    <>
      <Row>
        <button className={primary} onClick={() => add()}><Type size={15} />Add heading</button>
        <button className={chip} onClick={() => add(true)}>Add paragraph</button>
      </Row>
      {layer && (
        <>
          <Label>Font</Label>
          <Row>
            {fonts.slice(0, 14).map(f => <button key={f} onClick={async () => { await ensureFont(f, layer.fontWeight, layer.italic); s.updateLayer(layer.id, { fontFamily: f }, 'Font') }} className={`${chip} ${layer.fontFamily === f ? '!bg-white !text-void-950' : ''}`} style={{ fontFamily: `"${f}"` }}>{f}</button>)}
          </Row>
          <div className="mt-2"><Slider label="Size" value={Math.round(layer.fontSize)} min={8} max={400} onChange={v => s.updateLayer(layer.id, { fontSize: v })} onCommit={() => s.commit('Size')} /></div>
          <Row>
            {([['Regular', 400], ['Bold', 700]] as [string, number][]).map(([l, w]) => <button key={l} onClick={() => s.updateLayer(layer.id, { fontWeight: w }, 'Weight')} className={`${chip} ${layer.fontWeight === w ? '!bg-white !text-void-950' : ''}`}>{l}</button>)}
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
    const size = Math.round(Math.min(d.width, d.height) * 0.3)
    if (kind === 'line') s.addShape('line', (d.width - size) / 2, d.height / 2 - 3, size, 6)
    else s.addShape(kind, (d.width - size) / 2, (d.height - size) / 2, size, size)
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
      <p className="text-[13px] text-void-400 mt-3">Filters and adjustments go on as their own layers, so you can change or remove them later.</p>
    </>
  )
}

/** Export and share. Uses the phone's share sheet when it can hand over files; otherwise saves a download. */
function ExportSheet({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const doc = useEditor(s => s.doc)
  const [scale, setScale] = useState(1)
  const name = (doc?.name || 'design').replace(/[^\w\- ]+/g, '')
  const make = async (format: 'png' | 'jpeg' | 'pdf') => exportImage({ format, scale, quality: 0.92, transparent: format === 'png' })
  const canShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare
  const share = async (format: 'png' | 'jpeg' | 'pdf') => {
    setBusy('Preparing')
    try {
      const blob = await make(format)
      const ext = format === 'jpeg' ? 'jpg' : format
      const f = new File([blob], `${name}.${ext}`, { type: blob.type })
      if (canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }) }
      else downloadBlob(blob, `${name}.${ext}`)
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
        {[1, 2].map(k => <button key={k} onClick={() => setScale(k)} className={`${chip} ${scale === k ? '!bg-white !text-void-950' : ''}`}>{k}x · {doc ? `${doc.width * k} × ${doc.height * k}` : ''}</button>)}
        <button className={chip} onClick={() => { openModal('export'); onClose() }}>More options</button>
      </Row>
      {isPrivate() && <p className="text-[12.5px] text-void-400 mt-3">Private session: nothing is saved on this phone unless you export it.</p>}
    </Sheet>
  )
}
