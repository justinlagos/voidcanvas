'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, BoxSelect, Blend, Brush, CircleDashed, Crop, Droplet, Eraser, Hand, Lasso, LassoSelect, Moon, MousePointer2, MousePointerClick, MousePointerSquareDashed, PaintBucket, PenTool, Pipette, Shapes, Sparkle, Sparkles, Stamp, Sun, Type, Wand2, ZoomIn } from 'lucide-react'
import { makeCanvas } from '../engine'
import { useEditor } from '../store'
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
  [{ id: 'pen', label: 'Pen', key: 'P', icon: PenTool }, { id: 'pathselect', label: 'Direct select (edit paths)', key: 'A', icon: MousePointerClick }],
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

export function ToolRail() {
  return (
    <aside aria-label="Tools"
      className="vc-chrome order-last md:order-none shrink-0 flex md:flex-col items-center gap-0.5 px-2 py-1.5 md:py-2 md:w-[50px] overflow-x-auto md:overflow-y-auto md:overflow-x-visible border-t md:border-t-0 md:border-r border-white/[0.06] bg-surface-overlay">
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
