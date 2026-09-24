'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Camera, Contrast, Droplet, Eye, EyeOff, Palette, Pin, Plus, RotateCcw, Sparkles, Strikethrough, Sun, SunMoon, Trash2, Underline, Wand2, X } from 'lucide-react'
import { ctx2d, layerSize, makeCanvas, maskBounds, renderDoc, textLayout } from '../engine'
import { FONTS, ensureFont, getBrand, registerLocalFont, type BrandKit } from '../io'
import * as ops from '../ops'
import { ADJUSTMENT_LABELS, historyMemoryMB, useEditor } from '../store'
import { STYLE_KINDS, STYLE_LABELS, defaultStyle, emptyStyles } from '../styles'
import type { AdjustmentKind, Layer, TextLayer } from '../types'
import { useUi } from '../ui-store'
import { openModal } from '../actions'
import { ColorButton, ColorPicker } from './ColorPicker'
import { stageApi } from './Stage'
import { Button, IconButton, Section, Select, Slider, focusRing } from './ui'

const Empty = ({ children }: { children: React.ReactNode }) => <p className="px-4 py-5 text-[12.5px] leading-relaxed text-void-500">{children}</p>

// ─── History ───────────────────────────────────────────────────────

export function HistoryPanel() {
  const history = useEditor(s => s.history)
  const index = useEditor(s => s.historyIndex)
  const snapshots = useEditor(s => s.snapshots)
  const limit = useUi(s => s.historyLimit)
  const s = useEditor.getState()
  const list = useRef<HTMLOListElement>(null)
  useEffect(() => { list.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' }) }, [index])
  const time = (t?: number) => t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="flex flex-col min-h-0 h-full">
      {snapshots.length > 0 && (
        <ul className="px-2 pt-2 pb-1 border-b border-white/[0.05]" aria-label="Snapshots">
          {snapshots.map((h, i) => (
            <li key={i} className="group flex items-center">
              <button onClick={() => s.restoreSnapshot(i)} className={`flex-1 flex items-center gap-2 px-2.5 h-8 rounded-lg text-left text-[12.5px] text-void-200 hover:bg-void-900 ${focusRing}`}><Pin size={12} className="text-accent-light" />{h.label}<span className="ml-auto text-[11px] text-void-600">{time(h.at)}</span></button>
              <button aria-label={`Delete ${h.label}`} onClick={() => s.deleteSnapshot(i)} className="w-7 h-7 opacity-0 group-hover:opacity-100 text-void-500 hover:text-white"><X size={13} /></button>
            </li>
          ))}
        </ul>
      )}
      <ol ref={list} className="flex-1 min-h-0 overflow-y-auto px-2 py-1.5" aria-label="History, oldest first">
        {history.map((h, i) => (
          <li key={i} className="group flex items-center">
            <button onClick={() => s.jumpTo(i)} aria-current={i === index}
              className={`flex-1 min-w-0 flex items-center gap-2.5 px-2.5 h-8 rounded-lg text-left text-[12.5px] ${focusRing} ${i === index ? 'bg-void-800 text-white' : i > index ? 'text-void-600 hover:bg-void-900' : 'text-void-300 hover:bg-void-900'}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === index ? 'bg-accent' : i > index ? 'bg-void-700' : 'bg-void-500'}`} /><span className="truncate">{h.label}</span>
              <span className="ml-auto text-[10.5px] text-void-600 tabular-nums">{time(h.at)}</span>
            </button>
            {i > 0 && <button aria-label={`Delete step ${h.label}`} title="Delete this step" onClick={() => s.deleteHistoryStep(i)} className="w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-void-500 hover:text-white"><X size={13} /></button>}
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-1 px-3 py-2 border-t border-white/[0.05]">
        <span className="text-[11px] text-void-500 flex-1">{history.length} of {limit} steps · {historyMemoryMB(history)} MB</span>
        <IconButton label="New snapshot" onClick={() => s.takeSnapshot()} className="!h-7 !w-7"><Camera size={14} /></IconButton>
        <IconButton label="History settings" onClick={() => openModal('prefs', { tab: 'history' })} className="!h-7 !w-7"><RotateCcw size={14} /></IconButton>
      </div>
    </div>
  )
}

// ─── Colour and swatches ───────────────────────────────────────────

export function SwatchesPanel() {
  const fg = useEditor(s => s.fg), bg = useEditor(s => s.bg)
  const swatches = useEditor(s => s.swatches)
  const layers = useEditor(s => s.layers)
  const [which, setWhich] = useState<'fg' | 'bg'>('fg')
  const [brand, setBrand] = useState<BrandKit | null>(null)
  useEffect(() => { getBrand().then(setBrand).catch(() => {}) }, [])
  const s = useEditor.getState()
  const docColors = useMemo(() => Array.from(new Set(layers.flatMap(l => l.type === 'text' ? [l.color] : l.type === 'shape' ? [l.fill, l.stroke].filter(Boolean) as string[] : []))).slice(0, 16), [layers])
  const use = (c: string) => (which === 'fg' ? s.setFg(c) : s.setBg(c))
  const row = (title: string, list: string[]) => list.length > 0 && (
    <div className="mt-3">
      <p className="text-[10.5px] uppercase tracking-wide text-void-500 mb-1.5">{title}</p>
      <div className="flex flex-wrap gap-1">{list.map(c => <button key={title + c} aria-label={`Use ${c}`} title={c} onClick={() => use(c)} onContextMenu={e => { e.preventDefault(); useEditor.setState({ swatches: swatches.filter(x => x !== c) }) }} className={`w-6 h-6 rounded-[5px] border border-white/10 ${focusRing}`} style={{ background: c }} />)}</div>
    </div>
  )
  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-3">
        {(['fg', 'bg'] as const).map(k => (
          <button key={k} onClick={() => setWhich(k)} aria-pressed={which === k} className={`flex items-center gap-2 h-8 px-2 rounded-lg text-[12px] ${which === k ? 'bg-void-800 text-white' : 'text-void-400 hover:text-white'} ${focusRing}`}>
            <span className="w-4 h-4 rounded border border-white/20" style={{ background: k === 'fg' ? fg : bg }} />{k === 'fg' ? 'Main' : 'Second'}
          </button>
        ))}
        <button onClick={() => s.addSwatch(which === 'fg' ? fg : bg)} className={`ml-auto h-8 px-2 rounded-lg text-[12px] text-void-400 hover:text-white inline-flex items-center gap-1 ${focusRing}`}><Plus size={13} />Save swatch</button>
      </div>
      <ColorPicker value={which === 'fg' ? fg : bg} onChange={use} />
      {row('Swatches (right-click to remove)', swatches)}
      {row('Used in this design', docColors)}
      {brand && row('Brand kit', brand.colors)}
    </div>
  )
}

// ─── Adjustments ───────────────────────────────────────────────────

const ADJ_ICONS: [AdjustmentKind, typeof Sun][] = [
  ['brightnessContrast', Sun], ['levels', Contrast], ['curves', SunMoon], ['exposure', Sun], ['vibrance', Droplet], ['hueSaturation', Palette],
  ['colorBalance', Palette], ['blackWhite', Contrast], ['photoFilter', Camera], ['channelMixer', Wand2], ['temperature', Sun], ['gradientMap', Sparkles],
  ['posterize', Contrast], ['threshold', Contrast], ['invert', Contrast], ['blur', Droplet],
]
export function AdjustmentsPanel() {
  const s = useEditor.getState()
  return (
    <div className="p-3">
      <p className="text-[12px] text-void-400 mb-2.5">Add an adjustment layer. It changes everything below it and never touches your pixels.</p>
      <div className="grid grid-cols-4 gap-1.5">
        {ADJ_ICONS.map(([k, Icon]) => (
          <button key={k} title={ADJUSTMENT_LABELS[k]} aria-label={ADJUSTMENT_LABELS[k]} onClick={() => s.addAdjustment(k)} className={`flex flex-col items-center justify-center gap-1 h-14 rounded-lg bg-surface-sunken border border-white/[0.05] text-void-300 hover:text-white hover:border-accent/60 ${focusRing}`}>
            <Icon size={16} /><span className="text-[9.5px] leading-tight text-center px-0.5 line-clamp-2">{ADJUSTMENT_LABELS[k]}</span>
          </button>
        ))}
      </div>
      <Button onClick={() => openModal('filters')} className="w-full mt-3">Filter gallery</Button>
    </div>
  )
}

// ─── Character and paragraph ───────────────────────────────────────

function useText(): TextLayer | null {
  return useEditor(s => { const l = s.layers.find(x => x.id === s.activeId); return l?.type === 'text' ? l : null })
}
const NUM = `w-full h-8 px-2 rounded-md bg-surface-sunken border border-white/[0.06] text-[12.5px] tabular-nums ${focusRing}`

function Num({ label, value, onChange, step = 1, min, max, suffix }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-void-500">{label}{suffix ? ` (${suffix})` : ''}</span>
      <input type="number" value={Math.round(value * 100) / 100} step={step} min={min} max={max} onChange={e => { const v = Number(e.target.value); if (Number.isFinite(v)) onChange(v) }} onBlur={() => useEditor.getState().commit('Type')} className={NUM} />
    </label>
  )
}

export function CharacterPanel() {
  const l = useText()
  const [q, setQ] = useState('')
  const s = useEditor.getState()
  if (!l) return <Empty>Select a text layer to change its font, size, spacing and style. Use the Type tool (T) to add one.</Empty>
  const up = (patch: Partial<TextLayer>) => s.updateLayer(l.id, patch)
  const setFont = async (fontFamily: string, fontWeight = l.fontWeight, italic = l.italic) => { await ensureFont(fontFamily, fontWeight, italic); s.updateLayer(l.id, { fontFamily, fontWeight, italic }, 'Font') }
  const all = Array.from(new Set([l.fontFamily, ...FONTS]))
  const shown = q ? all.filter(f => f.toLowerCase().includes(q.toLowerCase())) : all
  const loadFile = () => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.ttf,.otf,.woff,.woff2'
    i.onchange = async () => { const f = i.files?.[0]; if (!f) return; const fam = f.name.replace(/\.[a-z0-9]+$/i, ''); try { await registerLocalFont(fam, f); s.updateLayer(l.id, { fontFamily: fam }, 'Font'); s.notify(`${fam} added. It stays on this device and is saved inside this design.`) } catch { s.notify('That font file could not be read.') } }
    i.click()
  }
  const tog = (on: boolean) => `h-8 flex-1 inline-flex items-center justify-center rounded-md text-[12px] ${focusRing} ${on ? 'bg-void-700 text-white' : 'bg-surface-sunken text-void-400 hover:text-white'}`
  return (
    <div className="p-3 space-y-3">
      <div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search fonts, or type any Google font name" className={`${NUM} mb-1.5`} onKeyDown={e => { if (e.key === 'Enter' && q.trim()) setFont(q.trim()) }} />
        <div className="max-h-40 overflow-y-auto rounded-lg border border-white/[0.05]">
          {shown.map(f => <button key={f} onClick={() => setFont(f)} className={`w-full text-left px-2.5 h-8 text-[13px] ${f === l.fontFamily ? 'bg-accent/20 text-white' : 'text-void-200 hover:bg-white/[0.05]'}`} style={{ fontFamily: `"${f}", Inter` }}>{f}</button>)}
          {q && !shown.length && <button onClick={() => setFont(q.trim())} className="w-full text-left px-2.5 h-8 text-[12.5px] text-accent-light">Use “{q}” from Google Fonts</button>}
        </div>
        <button onClick={loadFile} className="mt-1.5 text-[12px] text-void-400 hover:text-white underline underline-offset-2">Add a font file from this device</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Num label="Size" suffix="px" value={l.fontSize} min={1} onChange={v => up({ fontSize: Math.max(1, v) })} />
        <label className="flex flex-col gap-1"><span className="text-[11px] text-void-500">Weight</span>
          <select value={l.fontWeight} onChange={e => setFont(l.fontFamily, Number(e.target.value))} className={NUM}>
            {[100, 200, 300, 400, 500, 600, 700, 800, 900].map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
        <Num label="Leading" suffix="×" step={0.05} value={l.lineHeight} onChange={v => up({ lineHeight: Math.max(0.5, v) })} />
        <Num label="Tracking" suffix="px" step={0.5} value={l.letterSpacing} onChange={v => up({ letterSpacing: v })} />
        <Num label="Word spacing" suffix="px" value={l.wordSpacing ?? 0} onChange={v => up({ wordSpacing: v })} />
        <Num label="Baseline shift" suffix="px" value={l.baselineShift ?? 0} onChange={v => up({ baselineShift: v })} />
        <Num label="Width" suffix="%" step={12.5} value={l.stretch ?? 100} min={50} max={200} onChange={v => up({ stretch: v })} />
        <label className="flex flex-col gap-1"><span className="text-[11px] text-void-500">Colour</span><span className="flex items-center h-8"><ColorButton label="Text colour" value={l.color} onChange={c => up({ color: c })} onCommit={() => s.commit('Text colour')} /></span></label>
      </div>
      <div className="flex gap-1">
        <button className={tog(l.fontWeight >= 700) + ' font-bold'} onClick={() => setFont(l.fontFamily, l.fontWeight >= 700 ? 400 : 700)} aria-pressed={l.fontWeight >= 700}>B</button>
        <button className={tog(l.italic) + ' italic'} onClick={() => setFont(l.fontFamily, l.fontWeight, !l.italic)} aria-pressed={l.italic}>I</button>
        <button className={tog(!!l.underline)} onClick={() => s.updateLayer(l.id, { underline: !l.underline }, 'Underline')} aria-label="Underline" aria-pressed={!!l.underline}><Underline size={14} /></button>
        <button className={tog(!!l.strike)} onClick={() => s.updateLayer(l.id, { strike: !l.strike }, 'Strikethrough')} aria-label="Strikethrough" aria-pressed={!!l.strike}><Strikethrough size={14} /></button>
        <button className={tog(l.caps === 'all')} onClick={() => s.updateLayer(l.id, { caps: l.caps === 'all' ? 'none' : 'all' }, 'All caps')} aria-pressed={l.caps === 'all'}>TT</button>
        <button className={tog(l.caps === 'small')} onClick={() => s.updateLayer(l.id, { caps: l.caps === 'small' ? 'none' : 'small' }, 'Small caps')} aria-pressed={l.caps === 'small'}>Tt</button>
      </div>
      <label className="flex items-center gap-2 text-[12.5px] text-void-300"><input type="checkbox" checked={l.kerning !== false} onChange={e => s.updateLayer(l.id, { kerning: e.target.checked }, 'Kerning')} />Use the font's kerning</label>
      <p className="text-[11.5px] text-void-500 leading-relaxed">Variable fonts take any weight from 100 to 900, and Width uses the font's width axis when it has one.</p>
    </div>
  )
}

export function ParagraphPanel() {
  const l = useText()
  const s = useEditor.getState()
  if (!l) return <Empty>Select a text layer to set alignment, indents and paragraph spacing. Drag with the Type tool to make a text box that wraps.</Empty>
  const up = (patch: Partial<TextLayer>) => s.updateLayer(l.id, patch)
  const al = (a: TextLayer['align'], Icon: typeof AlignLeft, label: string) => (
    <button aria-label={label} aria-pressed={l.align === a} onClick={() => s.updateLayer(l.id, { align: a }, 'Align text')} className={`h-8 flex-1 inline-flex items-center justify-center rounded-md ${focusRing} ${l.align === a ? 'bg-void-700 text-white' : 'bg-surface-sunken text-void-400 hover:text-white'}`}><Icon size={15} /></button>
  )
  return (
    <div className="p-3 space-y-3">
      <div className="flex gap-1">{al('left', AlignLeft, 'Align left')}{al('center', AlignCenter, 'Centre')}{al('right', AlignRight, 'Align right')}{al('justify', AlignJustify, 'Justify')}</div>
      <label className="flex items-center gap-2 text-[12.5px] text-void-300">
        <input type="checkbox" checked={!!l.boxWidth} onChange={e => s.updateLayer(l.id, { boxWidth: e.target.checked ? Math.max(120, Math.round(layerSize(l).w)) : null }, e.target.checked ? 'Text box' : 'Point text')} />
        Wrap in a text box
      </label>
      <div className="grid grid-cols-2 gap-2">
        {l.boxWidth ? <Num label="Box width" suffix="px" value={l.boxWidth} min={20} onChange={v => up({ boxWidth: Math.max(20, v) })} /> : <span />}
        <Num label="First-line indent" suffix="px" value={l.indent ?? 0} onChange={v => up({ indent: v })} />
        <Num label="Space after paragraph" suffix="px" value={l.spaceAfter ?? 0} onChange={v => up({ spaceAfter: v })} />
      </div>
      {l.align === 'justify' && !l.boxWidth && <p className="text-[11.5px] text-amber-300/80">Justify needs a text box to spread lines across.</p>}
      <p className="text-[11.5px] text-void-500">{textLayout(l).lines.length} lines</p>
    </div>
  )
}

// ─── Info ──────────────────────────────────────────────────────────

export function InfoPanel() {
  const p = useEditor(s => s.pointer)
  const doc = useEditor(s => s.doc)
  const sel = useEditor(s => s.selection)
  const layer = useEditor(s => s.layers.find(l => l.id === s.activeId))
  const docRev = useEditor(s => s.docRev)
  const hist = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const t = setTimeout(() => {
      const c = hist.current; const st = useEditor.getState(); if (!c || !st.doc) return
      const k = Math.min(1, 300 / Math.max(st.doc.width, st.doc.height))
      const small = makeCanvas(st.doc.width * k, st.doc.height * k)
      renderDoc(small, st.doc, st.layers, { groups: st.groups, scale: k, noCache: true })
      const d = ctx2d(small, true).getImageData(0, 0, small.width, small.height).data
      const bins = [new Uint32Array(64), new Uint32Array(64), new Uint32Array(64)]
      for (let i = 0; i < d.length; i += 4) { bins[0][d[i] >> 2]++; bins[1][d[i + 1] >> 2]++; bins[2][d[i + 2] >> 2]++ }
      const max = Math.max(...bins.flatMap(b => Array.from(b)))
      const x = ctx2d(c); x.clearRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'screen'
      ;['#ff4d4d', '#4dff88', '#4d8bff'].forEach((col, ci) => { x.fillStyle = col; x.globalAlpha = 0.75; for (let i = 0; i < 64; i++) { const hgt = (bins[ci][i] / max) * c.height; x.fillRect(i * (c.width / 64), c.height - hgt, c.width / 64 + 0.5, hgt) } })
    }, 250)
    return () => clearTimeout(t)
  }, [docRev])
  if (!doc) return null
  const rgb = p?.rgb
  const hex = rgb ? '#' + rgb.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('') : '—'
  const selB = sel ? maskBounds(sel) : null
  const row = (k: string, v: React.ReactNode) => <div className="flex justify-between text-[12px]"><span className="text-void-500">{k}</span><span className="tabular-nums text-void-200">{v}</span></div>
  return (
    <div className="p-3 space-y-1.5">
      <canvas ref={hist} width={256} height={64} className="w-full h-16 rounded-md bg-black/40 mb-2" aria-label="Histogram" />
      {row('Pointer', p ? `${Math.round(p.x)}, ${Math.round(p.y)} px` : '—')}
      <div className="flex justify-between items-center text-[12px]"><span className="text-void-500">Colour</span><span className="flex items-center gap-2 tabular-nums text-void-200">{rgb && <span className="w-3.5 h-3.5 rounded border border-white/20" style={{ background: hex }} />}{rgb ? `${rgb[0]} ${rgb[1]} ${rgb[2]}` : '—'}</span></div>
      {row('Hex', hex.toUpperCase())}
      {row('Document', `${doc.width} × ${doc.height} px`)}
      {selB && row('Selection', `${selB.w} × ${selB.h} at ${selB.x}, ${selB.y}`)}
      {layer && layer.type !== 'adjustment' && row('Layer', `${Math.round(layerSize(layer, doc).w * Math.abs(layer.scaleX))} × ${Math.round(layerSize(layer, doc).h * Math.abs(layer.scaleY))}`)}
    </div>
  )
}

// ─── Navigator ─────────────────────────────────────────────────────

export function NavigatorPanel() {
  const c = useRef<HTMLCanvasElement>(null)
  const docRev = useEditor(s => s.docRev)
  const view = useEditor(s => s.view)
  const doc = useEditor(s => s.doc)
  useEffect(() => {
    const t = setTimeout(() => {
      const el = c.current; const st = useEditor.getState(); if (!el || !st.doc) return
      const k = Math.min(el.width / st.doc.width, el.height / st.doc.height)
      const small = makeCanvas(st.doc.width * k, st.doc.height * k)
      renderDoc(small, st.doc, st.layers, { groups: st.groups, scale: k, noCache: true })
      const x = ctx2d(el); x.clearRect(0, 0, el.width, el.height); x.drawImage(small, (el.width - small.width) / 2, (el.height - small.height) / 2)
    }, 200)
    return () => clearTimeout(t)
  }, [docRev])
  if (!doc) return null
  const W = 264, H = 170, k = Math.min(W / doc.width, H / doc.height), ox = (W - doc.width * k) / 2, oy = (H - doc.height * k) / 2
  const stage = document.querySelector('[aria-label="Design canvas"]')?.getBoundingClientRect()
  const vw = stage?.width ?? 800, vh = stage?.height ?? 600
  const r = { x: ox + (-view.panX / view.zoom) * k, y: oy + (-view.panY / view.zoom) * k, w: (vw / view.zoom) * k, h: (vh / view.zoom) * k }
  const jump = (e: React.PointerEvent) => {
    const b = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const dx = ((e.clientX - b.left) * (W / b.width) - ox) / k, dy = ((e.clientY - b.top) * (H / b.height) - oy) / k
    useEditor.getState().setView({ panX: vw / 2 - dx * view.zoom, panY: vh / 2 - dy * view.zoom })
  }
  return (
    <div className="p-3">
      <div className="relative w-full cursor-pointer touch-none" style={{ aspectRatio: `${W}/${H}` }} onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); jump(e) }} onPointerMove={e => { if (e.buttons) jump(e) }}>
        <canvas ref={c} width={W} height={H} className="w-full h-full rounded-md bg-black/40" />
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full pointer-events-none"><rect x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke="#ff4d6a" strokeWidth={1.5} /></svg>
      </div>
      <div className="mt-3"><Slider label="Zoom" value={Math.round(view.zoom * 100)} min={2} max={1600} unit="%" onChange={v => stageApi.zoomTo(v / 100)} /></div>
    </div>
  )
}

// ─── Brand ─────────────────────────────────────────────────────────

export function BrandPanel() {
  const [kit, setKit] = useState<BrandKit | null>(null)
  useEffect(() => { getBrand().then(setKit).catch(() => {}) }, [])
  const s = useEditor.getState()
  if (!kit) return null
  const text = s.active()?.type === 'text' ? s.active() as TextLayer : null
  return (
    <div className="p-3 space-y-3">
      <div>
        <p className="text-[10.5px] uppercase tracking-wide text-void-500 mb-1.5">Colours</p>
        {kit.colors.length ? <div className="flex flex-wrap gap-1">{kit.colors.map(c => <button key={c} title={`${c}: click for main colour, Alt-click to apply to the selected layer`} onClick={e => { if (e.altKey) { const l = s.active(); if (l?.type === 'text') s.updateLayer(l.id, { color: c }, 'Brand colour'); else if (l?.type === 'shape') s.updateLayer(l.id, { fill: c }, 'Brand colour') } else s.setFg(c) }} className={`w-7 h-7 rounded-md border border-white/10 ${focusRing}`} style={{ background: c }} />)}</div> : <p className="text-[12px] text-void-500">No brand colours yet.</p>}
      </div>
      <div>
        <p className="text-[10.5px] uppercase tracking-wide text-void-500 mb-1.5">Fonts</p>
        {kit.fonts.length ? kit.fonts.map(f => <button key={f} disabled={!text} onClick={async () => { if (!text) return; await ensureFont(f, text.fontWeight, text.italic); s.updateLayer(text.id, { fontFamily: f }, 'Brand font') }} className="block w-full text-left px-2 h-8 rounded-md text-[13.5px] text-void-200 hover:bg-white/[0.05] disabled:opacity-60" style={{ fontFamily: `"${f}"` }}>{f}</button>) : <p className="text-[12px] text-void-500">No brand fonts yet.</p>}
      </div>
      <Button onClick={() => openModal('brand')} className="w-full">Edit brand kit</Button>
    </div>
  )
}

// ─── Layer styles (quick) ──────────────────────────────────────────

export function StylesPanel() {
  const l = useEditor(s => s.layers.find(x => x.id === s.activeId) ?? null)
  const s = useEditor.getState()
  if (!l || l.type === 'adjustment') return <Empty>Select a layer to add shadows, strokes, glows and overlays. They stay editable and never change the layer's pixels.</Empty>
  const st = l.styles ?? emptyStyles()
  const toggle = (k: typeof STYLE_KINDS[number]) => {
    const cur = (st as any)[k]
    const next = { ...st, [k]: cur ? { ...cur, on: !cur.on } : defaultStyle(k) }
    s.updateLayer(l.id, { styles: next }, (cur?.on ? 'Hide ' : 'Show ') + STYLE_LABELS[k].toLowerCase())
  }
  const PRESETS: { name: string; make: () => any }[] = [
    { name: 'Soft shadow', make: () => ({ ...emptyStyles(), dropShadow: { ...defaultStyle('dropShadow'), opacity: 0.35, distance: 14, size: 30 } }) },
    { name: 'Outline', make: () => ({ ...emptyStyles(), stroke: { ...defaultStyle('stroke'), color: '#ffffff', size: 6 } }) },
    { name: 'Neon', make: () => ({ ...emptyStyles(), outerGlow: { ...defaultStyle('outerGlow'), color: '#ff3bd8', size: 26, opacity: 0.9 }, innerGlow: { ...defaultStyle('innerGlow'), color: '#ffffff', size: 6, opacity: 0.6 } }) },
    { name: 'Emboss', make: () => ({ ...emptyStyles(), bevel: defaultStyle('bevel') }) },
    { name: 'Sticker', make: () => ({ ...emptyStyles(), stroke: { ...defaultStyle('stroke'), color: '#ffffff', size: 10 }, dropShadow: { ...defaultStyle('dropShadow'), opacity: 0.3, distance: 6, size: 12 } }) },
    { name: 'Gradient', make: () => ({ ...emptyStyles(), gradientOverlay: { ...defaultStyle('gradientOverlay'), from: '#8b7cff', to: '#ff5a5f' } }) },
  ]
  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-3 gap-1.5">
        {PRESETS.map(p => <button key={p.name} onClick={() => s.updateLayer(l.id, { styles: p.make() }, 'Style: ' + p.name)} className={`h-9 rounded-lg bg-surface-sunken border border-white/[0.05] text-[11.5px] text-void-200 hover:border-accent/60 ${focusRing}`}>{p.name}</button>)}
      </div>
      <ul className="space-y-0.5">
        {STYLE_KINDS.map(k => {
          const on = !!(st as any)[k]?.on
          return (
            <li key={k} className="flex items-center gap-2">
              <button aria-label={on ? `Hide ${STYLE_LABELS[k]}` : `Show ${STYLE_LABELS[k]}`} onClick={() => toggle(k)} className={`w-7 h-7 inline-flex items-center justify-center rounded ${on ? 'text-white' : 'text-void-600'} hover:text-white`}>{on ? <Eye size={14} /> : <EyeOff size={14} />}</button>
              <button onClick={() => openModal('layerStyle', { focus: k })} className={`flex-1 text-left text-[12.5px] h-7 ${on ? 'text-void-100' : 'text-void-400'} hover:text-white`}>{STYLE_LABELS[k]}</button>
            </li>
          )
        })}
      </ul>
      <Slider label="Fill" value={Math.round((l.fillOpacity ?? 1) * 100)} min={0} max={100} unit="%" onChange={v => s.updateLayer(l.id, { fillOpacity: v / 100 })} onCommit={() => s.commit('Fill opacity')} />
      <div className="flex gap-1.5">
        <Button onClick={() => openModal('layerStyle')} className="flex-1">Edit styles…</Button>
        <IconButton label="Clear layer style" onClick={ops.clearStyle}><Trash2 size={15} /></IconButton>
      </div>
    </div>
  )
}

// ─── Channels ──────────────────────────────────────────────────────

export function ChannelsPanel() {
  const doc = useEditor(s => s.doc)
  const view = useEditor(s => s.viewChannel)
  const docRev = useEditor(s => s.docRev)
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  useEffect(() => {
    const t = setTimeout(() => {
      const st = useEditor.getState(); if (!st.doc) return
      const k = Math.min(1, 48 / Math.max(st.doc.width, st.doc.height))
      const small = makeCanvas(st.doc.width * k, st.doc.height * k)
      renderDoc(small, st.doc, st.layers, { groups: st.groups, scale: k, noCache: true })
      const out: Record<string, string> = { rgb: small.toDataURL() }
      const d = ctx2d(small, true).getImageData(0, 0, small.width, small.height)
      ;(['r', 'g', 'b'] as const).forEach((c, ci) => {
        const g = makeCanvas(small.width, small.height), gx = ctx2d(g), img = gx.createImageData(small.width, small.height)
        for (let i = 0; i < d.data.length; i += 4) { img.data[i] = img.data[i + 1] = img.data[i + 2] = d.data[i + ci]; img.data[i + 3] = 255 }
        gx.putImageData(img, 0, 0); out[c] = g.toDataURL()
      })
      for (const ch of st.doc.channels ?? []) { const g = makeCanvas(small.width, small.height), gx = ctx2d(g); gx.fillStyle = '#000'; gx.fillRect(0, 0, g.width, g.height); const w = makeCanvas(small.width, small.height), wx = ctx2d(w); wx.fillStyle = '#fff'; wx.fillRect(0, 0, w.width, w.height); wx.globalCompositeOperation = 'destination-in'; wx.drawImage(ch.mask, 0, 0, w.width, w.height); gx.drawImage(w, 0, 0); out[ch.id] = g.toDataURL() }
      setThumbs(out)
    }, 300)
    return () => clearTimeout(t)
  }, [docRev])
  if (!doc) return null
  const rows: { id: string; name: string; key?: string }[] = [{ id: 'rgb', name: 'RGB', key: '2' }, { id: 'r', name: 'Red', key: '3' }, { id: 'g', name: 'Green', key: '4' }, { id: 'b', name: 'Blue', key: '5' }, ...(doc.channels ?? []).map(c => ({ id: c.id, name: c.name }))]
  return (
    <div className="flex flex-col h-full">
      <ul className="flex-1 overflow-y-auto p-2">
        {rows.map(r => (
          <li key={r.id} className={`group flex items-center gap-2 px-1.5 py-1 rounded-lg ${view === r.id ? 'bg-void-800' : 'hover:bg-void-900'}`}>
            <button onClick={e => { if (e.ctrlKey || e.metaKey) { if (['rgb', 'r', 'g', 'b'].includes(r.id)) ops.channelAsSelection(r.id as any); else ops.loadChannel(r.id) } else useEditor.setState({ viewChannel: view === r.id && r.id !== 'rgb' ? 'rgb' : r.id, docRev: useEditor.getState().docRev + 1 }) }}
              className="flex-1 flex items-center gap-2 text-left" title="Click to view this channel alone. Ctrl-click to load it as a selection.">
              {thumbs[r.id] ? <img src={thumbs[r.id]} alt="" className="w-9 h-9 rounded object-contain bg-black" /> : <span className="w-9 h-9 rounded bg-void-800" />}
              <span className="text-[12.5px] text-void-100 flex-1">{r.name}</span>
              {r.key && <span className="text-[11px] text-void-600">Ctrl+{r.key}</span>}
            </button>
            {!r.key && <button aria-label={`Delete ${r.name}`} onClick={() => ops.deleteChannel(r.id)} className="w-7 h-7 opacity-0 group-hover:opacity-100 text-void-500 hover:text-white"><Trash2 size={13} /></button>}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-white/[0.05]">
        <span className="text-[11px] text-void-500 flex-1 pl-1">Ctrl-click to load as selection</span>
        <IconButton label="Save selection as channel" onClick={() => ops.saveSelectionAsChannel()} className="!h-7 !w-7"><Plus size={14} /></IconButton>
      </div>
    </div>
  )
}

// ─── Paths ─────────────────────────────────────────────────────────

export function PathsPanel() {
  const doc = useEditor(s => s.doc)
  const active = useEditor(s => s.activePathId)
  const fg = useEditor(s => s.fg)
  const size = useEditor(s => s.options.size)
  const [renaming, setRenaming] = useState<string | null>(null)
  if (!doc) return null
  const paths = doc.paths ?? []
  return (
    <div className="flex flex-col h-full">
      <ul className="flex-1 overflow-y-auto p-2">
        {!paths.length && <li className="px-2 py-4 text-[12.5px] text-void-500 leading-relaxed">No paths yet. Draw one with the Pen tool (P): click for corners, drag for curves, click the first point to close.</li>}
        {paths.map(p => (
          <li key={p.id} className={`group flex items-center gap-2 px-2 h-9 rounded-lg ${active === p.id ? 'bg-void-800' : 'hover:bg-void-900'}`} onClick={e => { if (e.ctrlKey || e.metaKey) ops.pathToSelection(p.id); else useEditor.setState({ activePathId: p.id, docRev: useEditor.getState().docRev + 1 }) }}>
            <svg viewBox={`0 0 ${doc.width} ${doc.height}`} className="w-8 h-8 rounded bg-void-900 shrink-0"><path d={p.subpaths.map(sp => sp.nodes.map((n, i) => i ? `C${sp.nodes[i - 1].outX},${sp.nodes[i - 1].outY} ${n.inX},${n.inY} ${n.x},${n.y}` : `M${n.x},${n.y}`).join(' ') + (sp.closed && sp.nodes.length > 1 ? ` C${sp.nodes[sp.nodes.length - 1].outX},${sp.nodes[sp.nodes.length - 1].outY} ${sp.nodes[0].inX},${sp.nodes[0].inY} ${sp.nodes[0].x},${sp.nodes[0].y}Z` : '')).join(' ')} fill="rgba(255,255,255,0.25)" stroke="#fff" strokeWidth={Math.max(doc.width, doc.height) / 40} /></svg>
            {renaming === p.id
              ? <input autoFocus defaultValue={p.name} onBlur={e => { ops.setPaths(paths.map(x => x.id === p.id ? { ...x, name: e.target.value || x.name } : x), 'Rename path'); setRenaming(null) }} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} className={`${NUM} !h-7`} />
              : <span onDoubleClick={() => setRenaming(p.id)} className="flex-1 truncate text-[12.5px] text-void-100">{p.name}</span>}
            <button aria-label={`Delete ${p.name}`} onClick={e => { e.stopPropagation(); ops.setPaths(paths.filter(x => x.id !== p.id), 'Delete path'); if (active === p.id) useEditor.setState({ activePathId: null }) }} className="w-7 h-7 opacity-0 group-hover:opacity-100 text-void-500 hover:text-white"><Trash2 size={13} /></button>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-1.5 p-2 border-t border-white/[0.05]">
        <Button onClick={() => ops.pathToSelection()} disabled={!active} className="!h-8 !text-[12px]">Make selection</Button>
        <Button onClick={() => ops.shapeFromPath()} disabled={!active} className="!h-8 !text-[12px]">Make shape</Button>
        <Button onClick={() => ops.fillPath(fg)} disabled={!active} className="!h-8 !text-[12px]">Fill with colour</Button>
        <Button onClick={() => ops.strokePath(fg, Math.max(1, Math.round(size / 4)))} disabled={!active} className="!h-8 !text-[12px]">Stroke</Button>
        <Button onClick={() => ops.maskFromPath()} disabled={!active} className="!h-8 !text-[12px]">Layer mask</Button>
        <Button onClick={() => ops.selectionToPath()} className="!h-8 !text-[12px]">From selection</Button>
        <Button onClick={() => ops.duplicatePath()} disabled={!active} className="!h-8 !text-[12px]">Duplicate</Button>
        <Button onClick={() => ops.exportPathSvg()} disabled={!active} className="!h-8 !text-[12px]">Export SVG</Button>
      </div>
    </div>
  )
}

export type { Layer }

// ─── Brief ─────────────────────────────────────────────────────────

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u00c0-\u024f₦£$€@.]+/g, ' ').replace(/\s+/g, ' ').trim()
/** Is this brief item on the design? Long items count when their opening words are there. */
function onDesign(value: string, texts: string[]) {
  const v = norm(value); if (!v) return true
  const probe = v.length > 28 ? v.slice(0, 28).replace(/\s\S*$/, '') : v
  return texts.some(t => t.includes(probe))
}

export function BriefPanel() {
  const brief = useEditor(s => s.doc?.brief)
  const layers = useEditor(s => s.layers)
  const doc = useEditor(s => s.doc)
  const active = useEditor(s => s.layers.find(l => l.id === s.activeId))
  const [draft, setDraft] = useState('')
  const [showText, setShowText] = useState(false)
  if (!doc) return null
  const texts = layers.filter(l => l.type === 'text').map(l => norm((l as TextLayer).text))
  const s = useEditor.getState()

  if (!brief) {
    return (
      <div className="p-3 space-y-2.5">
        <p className="text-[12.5px] text-void-400 leading-relaxed">Paste the client&apos;s brief and VoidCanvas keeps a checklist of what must be on the design, ticking items off as you add them.</p>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.stopPropagation()} rows={6} placeholder="Headline, date, venue, price, contact, what they want people to do…"
          className={`w-full px-2.5 py-2 rounded-lg bg-surface-sunken border border-white/[0.06] text-[12.5px] leading-relaxed text-void-100 placeholder:text-void-600 resize-y ${focusRing}`} />
        <Button primary disabled={draft.trim().length < 10} onClick={async () => { const { readBrief, briefItems } = await import('@/studio/drafts'); const f = readBrief(draft, doc.name); s.setDoc({ brief: { title: doc.name, text: draft.trim(), items: briefItems(f) } }, true) }} className="w-full !h-8 !text-[12.5px]">Make checklist</Button>
      </div>
    )
  }

  const done = brief.items.filter(i => onDesign(i.value, texts)).length
  const place = (value: string, label: string) => {
    s.addText(undefined, undefined, Math.round(doc.width * 0.6))
    const l = s.active(); if (l?.type === 'text') s.updateLayer(l.id, { text: value, name: label }, `Add ${label.toLowerCase()}`)
  }
  const find = (value: string) => {
    const v = norm(value), probe = v.length > 28 ? v.slice(0, 28).replace(/\s\S*$/, '') : v
    const l = layers.find(x => x.type === 'text' && norm(x.text).includes(probe)); if (l) s.setActive(l.id)
  }
  // Contrast of the selected text against the board or page behind it.
  const frame = active && doc.frames?.find(f => f.id === active.frameId)
  const ground = frame?.background ?? doc.background ?? '#ffffff'
  const ratio = active?.type === 'text' && /^#[0-9a-f]{6}$/i.test(active.color) && /^#[0-9a-f]{6}$/i.test(ground) ? contrastRatio(active.color, ground) : null

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-void-100">{done} of {brief.items.length} on the design</span>
        <button onClick={() => setShowText(v => !v)} className={`text-[12px] text-void-400 hover:text-white rounded ${focusRing}`}>{showText ? 'Hide brief' : 'Read brief'}</button>
      </div>
      <div className="h-1.5 rounded-full bg-void-800 overflow-hidden"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${brief.items.length ? (done / brief.items.length) * 100 : 100}%` }} /></div>
      {showText && <p className="text-[12px] text-void-300 leading-relaxed whitespace-pre-wrap bg-surface-sunken rounded-lg p-2.5 max-h-48 overflow-y-auto">{brief.text}</p>}
      <ul className="space-y-1">
        {brief.items.map((it, i) => {
          const ok = onDesign(it.value, texts)
          return (
            <li key={i} className="flex items-start gap-2 rounded-lg px-1.5 py-1.5 hover:bg-void-900">
              <span className={`mt-0.5 w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[10px] ${ok ? 'bg-emerald-400 text-black' : 'border border-void-600'}`}>{ok ? '✓' : ''}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[11px] uppercase tracking-wide text-void-500">{it.label}</span>
                <span className={`block text-[12.5px] leading-snug ${ok ? 'text-void-400' : 'text-void-100'}`}>{it.value}</span>
              </span>
              {ok
                ? <button onClick={() => find(it.value)} className={`text-[11.5px] text-void-400 hover:text-white rounded px-1 ${focusRing}`}>Select</button>
                : <button onClick={() => place(it.value, it.label)} className={`text-[11.5px] text-accent-light hover:text-white rounded px-1 ${focusRing}`}>Add</button>}
            </li>
          )
        })}
      </ul>
      {brief.palette?.length ? (
        <div>
          <span className="block text-[11px] uppercase tracking-wide text-void-500 mb-1.5">Colours (click to use)</span>
          <div className="flex gap-1.5">{brief.palette.map(c => <button key={c.label + c.hex} onClick={() => s.setFg(c.hex)} title={`${c.label} ${c.hex}`} className={`flex-1 h-8 rounded-md border border-white/10 ${focusRing}`} style={{ background: c.hex }} />)}</div>
        </div>
      ) : null}
      {ratio !== null && (
        <p className="text-[12px] text-void-300">Selected text contrast: <span className={ratio >= 4.5 ? 'text-emerald-400' : ratio >= 3 ? 'text-amber-300' : 'text-red-400'}>{ratio.toFixed(1)}:1 {ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'large text only' : 'too low'}</span></p>
      )}
      <button onClick={() => { if (confirm('Remove the brief from this design?')) s.setDoc({ brief: undefined }, true) }} className={`text-[11.5px] text-void-500 hover:text-white rounded ${focusRing}`}>Remove brief</button>
    </div>
  )
}
function contrastRatio(a: string, b: string) {
  const L = (h: string) => { const [r, g, bb] = [1, 3, 5].map(i => { const c = parseInt(h.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }); return 0.2126 * r + 0.7152 * g + 0.0722 * bb }
  const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
