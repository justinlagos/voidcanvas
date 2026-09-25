'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, BoxSelect, ChevronDown, ChevronUp, GripHorizontal, PanelLeft, Blend, Brush, CircleDashed, Crop, Droplet, Eraser, Hand, Lasso, LassoSelect, Moon, MousePointer2, MousePointerClick, MousePointerSquareDashed, PaintBucket, PenTool, Pipette, Spline, PenLine, Shapes, Sparkle, Sparkles, Stamp, Sun, Type, Wand2, ZoomIn } from 'lucide-react'
import { makeCanvas } from '../engine'
import { useEditor } from '../store'
import { useUi } from '../ui-store'
import type { ToolId } from '../types'
import { ColorPopover, Floating } from './ColorPicker'
import { KeyCap, Tooltip, focusRing } from './ui'

export interface ToolDef { id: ToolId; label: string; key: string; icon: typeof Brush; hint?: string }

/** Tools in families, like Photoshop and Photopea: one slot on the rail, the rest in a flyout. */
export const FAMILIES: ToolDef[][] = [
  [{ id: 'move', label: 'Move and resize', key: 'V', icon: MousePointer2 }],
  [{ id: 'marquee', label: 'Rectangle select', key: 'M', icon: BoxSelect }, { id: 'ellipse', label: 'Ellipse select', key: 'Shift+M', icon: CircleDashed }],
  [{ id: 'lasso', label: 'Lasso', key: 'L', icon: Lasso }, { id: 'polylasso', label: 'Polygonal lasso', key: 'Shift+L', icon: LassoSelect, hint: 'Click point to point. Double-click or click the first point to close.' }],
  [{ id: 'objectselect', label: 'Object select', key: 'W', icon: MousePointerSquareDashed, hint: 'Drag a box around an object. It finds the edges for you, on your device.' }, { id: 'wand', label: 'Magic wand', key: 'Shift+W', icon: Wand2 }],
  [{ id: 'crop', label: 'Crop', key: 'C', icon: Crop }],
  [{ id: 'eyedropper', label: 'Eyedropper', key: 'I', icon: Pipette }],
  [{ id: 'heal', label: 'Spot heal', key: 'J', icon: Sparkles }, { id: 'remove', label: 'Remove object', key: 'Shift+J', icon: Sparkle, hint: 'Paint over something to remove it. Runs on your device.' }],
  [{ id: 'brush', label: 'Brush', key: 'B', icon: Brush }],
  [{ id: 'clone', label: 'Clone stamp', key: 'S', icon: Stamp }],
  [{ id: 'eraser', label: 'Eraser', key: 'E', icon: Eraser }],
  [{ id: 'gradient', label: 'Gradient', key: 'G', icon: Blend }, { id: 'fill', label: 'Paint bucket', key: 'Shift+G', icon: PaintBucket }],
  [{ id: 'dodge', label: 'Dodge (lighten)', key: 'O', icon: Sun }, { id: 'burn', label: 'Burn (darken)', key: 'Shift+O', icon: Moon }, { id: 'sponge', label: 'Sponge (saturation)', key: 'Shift+O', icon: Droplet }],
  [{ id: 'pen', label: 'Pen', key: 'P', icon: PenTool, hint: 'Click for corners, drag for curves. Hover a path to add or remove points.' }, { id: 'curvature', label: 'Curvature pen', key: 'Shift+P', icon: Spline, hint: 'Click points and the curve flows through them. Double-click for a corner.' }, { id: 'freeform', label: 'Freeform pen', key: 'Shift+P', icon: PenLine, hint: 'Draw freely; smooth curves are fitted when you let go. Turn on Magnetic to trace edges in a photo.' }, { id: 'pathselect', label: 'Direct select (edit paths)', key: 'A', icon: MousePointerClick }],
  [{ id: 'text', label: 'Type', key: 'T', icon: Type, hint: 'Click for a line of text. Drag a box for a paragraph.' }],
  [{ id: 'shape', label: 'Shape', key: 'U', icon: Shapes }],
  [{ id: 'hand', label: 'Hand', key: 'H', icon: Hand }],
  [{ id: 'zoom', label: 'Zoom', key: 'Z', icon: ZoomIn }],
]
export const TOOLS: ToolDef[] = FAMILIES.flat()
const DIVIDER_AFTER = new Set([0, 4, 5, 11, 14])

/** Single-key shortcuts, with Shift to cycle through a family (Shift+L goes lasso, polygonal lasso...). */
export const TOOL_KEYS: Record<string, ToolId> = { v: 'move', m: 'marquee', l: 'lasso', w: 'objectselect', c: 'crop', i: 'eyedropper', j: 'heal', b: 'brush', s: 'clone', e: 'eraser', g: 'gradient', o: 'dodge', p: 'pen', a: 'pathselect', t: 'text', u: 'shape', h: 'hand', z: 'zoom' }
export function cycleFamily(key: string) {
  const first = TOOL_KEYS[key]; if (!first) return null
  const fam = FAMILIES.find(f => f.some(t => t.id === first)); if (!fam) return null
  const cur = useEditor.getState().tool
  const i = fam.findIndex(t => t.id === cur)
  // Shift+key from another tool goes to the second tool in the family; inside the family it cycles.
  if (i < 0) return (fam[1] ?? fam[0]).id
  return fam[(i + 1) % fam.length].id
}

function Slot({ fam }: { fam: ToolDef[] }) {
  const tool = useEditor(s => s.tool)
  const [last, setLast] = useState(fam[0].id)
  const [open, setOpenRect] = useState<DOMRect | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const setOpen = (v: boolean) => setOpenRect(v && btn.current ? btn.current.getBoundingClientRect() : null)
  const press = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => { if (fam.some(t => t.id === tool)) setLast(tool) }, [tool, fam])
  const cur = fam.find(t => t.id === last) ?? fam[0]
  const on = fam.some(t => t.id === tool)
  const Icon = cur.icon
  return (
    <div className="relative" onPointerDown={e => e.stopPropagation()}>
      <Tooltip label={cur.label} shortcut={cur.key} side="right">
        <button ref={btn} type="button" aria-label={`${cur.label} (${cur.key})`} aria-pressed={on} aria-haspopup={fam.length > 1 ? 'menu' : undefined}
          onClick={() => useEditor.getState().setTool(cur.id)}
          onContextMenu={e => { if (fam.length > 1) { e.preventDefault(); setOpen(true) } }}
          onPointerDown={() => { if (fam.length > 1) press.current = setTimeout(() => setOpen(true), 420) }}
          onPointerUp={() => { if (press.current) clearTimeout(press.current) }}
          onPointerLeave={() => { if (press.current) clearTimeout(press.current) }}
          className={`vc-tool relative h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg transition-colors ${focusRing} ${on ? 'bg-accent text-white' : 'text-void-300 hover:bg-void-800 hover:text-white'}`}>
          <Icon size={18} strokeWidth={1.75} />
          {fam.length > 1 && <span aria-hidden className={`absolute right-[3px] bottom-[3px] w-0 h-0 border-l-[4px] border-l-transparent border-b-[4px] ${on ? 'border-b-white/80' : 'border-b-void-500'}`} />}
        </button>
      </Tooltip>
      {open && (
        <Floating anchor={open} side="right" onClose={() => setOpen(false)} label={`${fam[0].label} tools`}>
        <div role="menu" className="w-60 py-1">
          {fam.map(t => (
            <button key={t.id} role="menuitemradio" aria-checked={tool === t.id} onClick={() => { useEditor.getState().setTool(t.id); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-3 h-9 text-left text-[13px] ${tool === t.id ? 'text-white bg-accent/20' : 'text-void-200 hover:bg-white/[0.05]'} ${focusRing}`}>
              <t.icon size={16} strokeWidth={1.75} /><span className="flex-1">{t.label}</span><KeyCap>{t.key}</KeyCap>
            </button>
          ))}
        </div>
        </Floating>
      )}
    </div>
  )
}

function ColorChips() {
  const fg = useEditor(s => s.fg), bg = useEditor(s => s.bg)
  const [edit, setEdit] = useState<null | 'fg' | 'bg'>(null)
  const box = useRef<HTMLDivElement>(null)
  const s = useEditor.getState()
  return (
    <div ref={box} className="relative hidden md:block w-10 h-11 mt-1 shrink-0" onPointerDown={e => e.stopPropagation()}>
      <button aria-label="Second colour" title="Second colour (used for gradients and erasing to background)" onClick={() => setEdit('bg')}
        className={`absolute right-0 bottom-0 w-6 h-6 rounded-[5px] border border-white/25 shadow ${focusRing}`} style={{ background: bg }} />
      <button aria-label="Main colour" title="Main colour" onClick={() => setEdit('fg')}
        className={`absolute left-0 top-0 w-6 h-6 rounded-[5px] border border-white/40 shadow-md ${focusRing}`} style={{ background: fg }} />
      <button aria-label="Swap colours (X)" title="Swap colours (X)" onClick={s.swapColors} className="absolute right-0 top-0 w-3.5 h-3.5 text-void-400 hover:text-white"><ArrowLeftRight size={10} /></button>
      <button aria-label="Reset to black and white (D)" title="Reset to black and white (D)" onClick={() => useEditor.setState({ fg: '#111111', bg: '#ffffff' })} className="absolute left-0 bottom-0 w-3.5 h-3.5 flex items-end">
        <span className="relative w-3 h-3"><span className="absolute left-0 top-0 w-2 h-2 bg-black border border-white/60" /><span className="absolute right-0 bottom-0 w-2 h-2 bg-white border border-black/40" /></span>
      </button>
      {edit && (
        <ColorPopover value={edit === 'fg' ? fg : bg} title={edit === 'fg' ? 'Main colour' : 'Second colour'} anchor={box.current!.getBoundingClientRect()} side="right"
          onChange={v => (edit === 'fg' ? s.setFg(v) : s.setBg(v))} onClose={() => { s.addSwatch(edit === 'fg' ? useEditor.getState().fg : useEditor.getState().bg); setEdit(null) }} />
      )}
    </div>
  )
}

function QuickMaskToggle() {
  const on = useEditor(s => s.quickMask)
  return (
    <Tooltip label={on ? 'Leave quick mask' : 'Quick mask: paint your selection'} shortcut="Q" side="right">
      <button aria-label="Quick mask (Q)" aria-pressed={on} onClick={() => toggleQuickMask()}
        className={`hidden md:inline-flex mt-1 h-8 w-9 items-center justify-center rounded-lg ${focusRing} ${on ? 'bg-rose-500/80 text-white' : 'text-void-400 hover:bg-void-800 hover:text-white'}`}>
        <span className={`w-4 h-3.5 rounded-[3px] border ${on ? 'border-white' : 'border-current'} flex items-center justify-center`}><span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-white' : 'bg-current'}`} /></span>
      </button>
    </Tooltip>
  )
}

export function toggleQuickMask() {
  const s = useEditor.getState(); if (!s.doc) return
  if (!s.quickMask) {
    // Start from the current selection, or from nothing selected.
    if (!s.selection) { useEditor.setState({ selection: makeCanvas(s.doc.width, s.doc.height), selRev: s.selRev + 1 }) }
    useEditor.setState({ quickMask: true, tool: 'brush', editingMask: false })
    s.notify('Quick mask: Brush adds to the selection, Eraser removes. Press Q to finish.')
  } else {
    useEditor.setState({ quickMask: false })
    s.commit('Quick mask')
  }
}

const TOOL = 38 // one tool cell, px, including its gap

/** The tool panel. Docked on the left edge by default. Drag its grip onto the canvas to float it; a floating
 *  panel moves anywhere, reshapes from one tall column to one long row by its corner, collapses to the current
 *  tool, and docks again from its header or Window > Floating tools. */
function useWide() {
  const [wide, setWide] = useState(false)
  useEffect(() => { const mq = matchMedia('(min-width: 768px)'); const on = () => setWide(mq.matches); on(); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on) }, [])
  return wide
}

export function ToolRail() {
  const tb = useUi(s => s.toolbar)
  const hydrated = useUi(s => s.hydrated)
  const wide = useWide()
  // Floating: the panel is drawn over the canvas by FloatingTools instead.
  if (hydrated && wide && tb.float) return null
  return (
    <aside aria-label="Tools"
      className="vc-chrome order-last md:order-none shrink-0 flex md:flex-col items-center gap-0.5 px-2 py-1.5 md:py-2 md:w-[50px] overflow-x-auto md:overflow-y-auto md:overflow-x-visible border-t md:border-t-0 md:border-r border-white/[0.06] bg-surface-overlay">
      {wide && <DetachGrip />}
      {FAMILIES.map((fam, i) => (
        <span key={fam[0].id} className="contents">
          <Slot fam={fam} />
          {DIVIDER_AFTER.has(i) && <span className="shrink-0 md:w-6 md:h-px w-px h-6 bg-void-800 mx-0.5 md:my-1" />}
        </span>
      ))}
      <span className="shrink-0 md:w-6 md:h-px w-px h-6 bg-void-800 mx-0.5 md:my-1" />
      <ColorChips />
      <QuickMaskToggle />
    </aside>
  )
}

/** Grip at the top of the docked rail. Drag it out onto the canvas (or double-click it) to float the tools there. */
function DetachGrip() {
  const start = useRef<{ x: number; y: number } | null>(null)
  const detach = (clientX: number, clientY: number) => {
    const host = document.querySelector('[data-tool-host]')?.getBoundingClientRect()
    const t = useUi.getState().toolbar
    useUi.getState().setPref('toolbar', { ...t, float: true, collapsed: false, x: Math.max(8, clientX - (host?.left ?? 0) - 20), y: Math.max(8, clientY - (host?.top ?? 0) - 10) })
  }
  return (
    <Tooltip label="Drag onto the canvas to float the tools" side="right">
      <button type="button" aria-label="Float the tools" onDoubleClick={() => detach(80, 120)}
        onPointerDown={e => { e.stopPropagation(); start.current = { x: e.clientX, y: e.clientY }; (e.target as HTMLElement).setPointerCapture(e.pointerId) }}
        onPointerMove={e => { const s0 = start.current; if (s0 && Math.hypot(e.clientX - s0.x, e.clientY - s0.y) > 14) { start.current = null; detach(e.clientX, e.clientY) } }}
        onPointerUp={() => { start.current = null }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); detach(80, 120) } }}
        className={`shrink-0 w-9 h-4 mb-1 flex items-center justify-center rounded cursor-grab active:cursor-grabbing text-void-600 hover:text-void-300 hover:bg-white/[0.04] ${focusRing}`}>
        <GripHorizontal size={14} />
      </button>
    </Tooltip>
  )
}

/** Mounted inside the canvas area. Draws nothing unless the tools are floating on a wide screen. */
export function FloatingTools() {
  const wide = useWide()
  const float = useUi(s => s.toolbar.float && s.hydrated)
  return wide && float ? <FloatingToolsPanel /> : null
}

function FloatingToolsPanel() {
  const tb = useUi(s => s.toolbar)
  const tool = useEditor(s => s.tool)
  const box = useRef<HTMLDivElement>(null)
  const set = (patch: Partial<typeof tb>) => useUi.getState().setPref('toolbar', { ...useUi.getState().toolbar, ...patch })
  const [live, setLive] = useState<{ x: number; y: number; cols: number } | null>(null)
  const pos = live ?? tb
  const cols = Math.max(1, Math.min(FAMILIES.length, pos.cols))
  const active = TOOLS.find(t => t.id === tool) ?? TOOLS[0]

  // Keep the panel inside the canvas area when the window or the dock changes size.
  useEffect(() => {
    const fit = () => {
      const host = box.current?.parentElement?.getBoundingClientRect(), me = box.current?.getBoundingClientRect(); if (!host || !me) return
      const x = Math.max(4, Math.min(tb.x, host.width - me.width - 4)), y = Math.max(4, Math.min(tb.y, host.height - me.height - 4))
      if (x !== tb.x || y !== tb.y) set({ x, y })
    }
    fit(); addEventListener('resize', fit); return () => removeEventListener('resize', fit)
  }, [tb.x, tb.y, tb.cols, tb.collapsed]) // eslint-disable-line react-hooks/exhaustive-deps

  const drag = (e: React.PointerEvent, kind: 'move' | 'shape') => {
    if (e.button !== 0) return
    e.preventDefault(); e.stopPropagation()
    const el = box.current!, host = el.parentElement!.getBoundingClientRect(), me = el.getBoundingClientRect()
    const sx = e.clientX, sy = e.clientY, ox = tb.x, oy = tb.y, ow = me.width
    let last = { x: tb.x, y: tb.y, cols: tb.cols }
    const mv = (ev: PointerEvent) => {
      if (kind === 'move') last = { ...last, x: Math.max(4, Math.min(host.width - me.width - 4, ox + ev.clientX - sx)), y: Math.max(4, Math.min(host.height - 40, oy + ev.clientY - sy)) }
      else last = { ...last, cols: Math.max(1, Math.min(FAMILIES.length, Math.round((ow + ev.clientX - sx - 12) / TOOL))) }
      setLive(last)
    }
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); setLive(null); set(last) }
    addEventListener('pointermove', mv); addEventListener('pointerup', up)
  }

  return (
    <div ref={box} role="toolbar" aria-label="Tools" onPointerDown={e => e.stopPropagation()}
      className="vc-chrome absolute z-20 rounded-xl bg-surface-overlay/95 backdrop-blur border border-white/[0.09] shadow-[0_14px_40px_rgba(0,0,0,0.5)] select-none"
      style={{ left: pos.x, top: pos.y }}>
      <div className="flex items-center gap-0.5 h-6 px-1 border-b border-white/[0.06]">
        <span onPointerDown={e => drag(e, 'move')} onDoubleClick={() => set({ collapsed: !tb.collapsed })} title="Drag to move. Double-click to collapse."
          className="flex-1 min-w-[18px] h-full flex items-center justify-center cursor-grab active:cursor-grabbing text-void-600 hover:text-void-300"><GripHorizontal size={13} /></span>
        <button type="button" aria-label={tb.collapsed ? 'Expand the tools' : 'Collapse the tools'} title={tb.collapsed ? 'Expand' : 'Collapse'} onClick={() => set({ collapsed: !tb.collapsed })}
          className={`w-5 h-5 rounded flex items-center justify-center text-void-400 hover:text-white hover:bg-white/[0.06] ${focusRing}`}>{tb.collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}</button>
        <button type="button" aria-label="Dock the tools" title="Dock on the left" onClick={() => set({ float: false, collapsed: false })}
          className={`w-5 h-5 rounded flex items-center justify-center text-void-400 hover:text-white hover:bg-white/[0.06] ${focusRing}`}><PanelLeft size={12} /></button>
      </div>
      {tb.collapsed ? (
        <div className="p-1.5 flex justify-center"><Slot fam={FAMILIES.find(f => f.some(t => t.id === active.id)) ?? FAMILIES[0]} /></div>
      ) : (
        <div className="relative p-1.5">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, 36px)` }}>
            {FAMILIES.map(fam => <Slot key={fam[0].id} fam={fam} />)}
          </div>
          <div className={`flex items-center gap-2 mt-1.5 pt-1.5 border-t border-white/[0.06] ${cols === 1 ? 'flex-col' : ''}`}>
            <ColorChips />
            <QuickMaskToggle />
          </div>
          <span onPointerDown={e => drag(e, 'shape')} title="Drag to reshape: one column, a grid, or one row"
            className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-[3px] text-void-600 hover:text-void-300">
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden><path d="M7 1L1 7M7 4L4 7" stroke="currentColor" strokeWidth="1.2" /></svg>
          </span>
        </div>
      )}
    </div>
  )
}
