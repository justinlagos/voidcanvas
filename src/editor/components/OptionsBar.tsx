'use client'

import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalDistributeCenter, AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter, Check, MinusSquare, PlusSquare, Square, SquareDot, X } from 'lucide-react'
import { FAMILIES, TOOLS } from './ToolRail'
import * as ops from '../ops'
import * as ai from '../ai-tools'
import { openModal } from '../actions'
import { useEditor } from '../store'
import type { ToolOptions } from '../types'
import { Button, IconButton, focusRing } from './ui'

// The tool options bar, like Photoshop and Photopea: it changes with the tool, and holds the settings
// you reach for most while that tool is in your hand.

function Num({ label, value, min, max, step = 1, unit, onChange, title }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void; title?: string }) {
  return (
    <label className="flex items-center gap-2 shrink-0" title={title}>
      <span className="text-[12px] text-void-400">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="vc-bar w-20" />
      <input type="number" min={min} max={max} value={Math.round(value)} onChange={e => { const v = Number(e.target.value); if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v))) }} onKeyDown={e => e.stopPropagation()}
        className={`w-12 h-6 px-1 rounded bg-surface-sunken border border-white/[0.06] text-[12px] tabular-nums text-void-100 ${focusRing}`} />
      {unit && <span className="-ml-1.5 text-[11.5px] text-void-500">{unit}</span>}
    </label>
  )
}

const chip = (on: boolean) => `h-7 px-2.5 rounded-md text-[12px] shrink-0 ${focusRing} ${on ? 'bg-void-700 text-white' : 'text-void-400 hover:text-white hover:bg-void-800'}`
const Check2 = ({ on, label, onChange, title }: { on: boolean; label: string; onChange: (v: boolean) => void; title?: string }) => (
  <label className="flex items-center gap-1.5 text-[12px] text-void-300 shrink-0 cursor-pointer" title={title}><input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} className="accent-[#8b7cff]" />{label}</label>
)
const Sep = () => <span className="w-px h-5 bg-white/[0.08] shrink-0" />

function SelectionMode() {
  const mode = useEditor(s => s.options.selMode ?? 'new')
  const set = useEditor.getState().setOption
  const modes: { id: NonNullable<ToolOptions['selMode']>; label: string; icon: typeof Square }[] = [
    { id: 'new', label: 'New selection', icon: Square }, { id: 'add', label: 'Add to selection (Shift)', icon: PlusSquare },
    { id: 'sub', label: 'Subtract from selection (Alt)', icon: MinusSquare }, { id: 'intersect', label: 'Intersect with selection', icon: SquareDot },
  ]
  return <span className="flex items-center gap-0.5 shrink-0">{modes.map(m => <IconButton key={m.id} label={m.label} active={mode === m.id} onClick={() => set('selMode', m.id)} className="!h-7 !w-7" tipSide="bottom"><m.icon size={15} /></IconButton>)}</span>
}

function SelectionExtras() {
  const s = useEditor.getState()
  return (
    <>
      <Sep />
      <button className={chip(false)} onClick={() => ai.selectSubject()}>Select subject</button>
      <button className={chip(false)} onClick={() => openModal('selectMask')}>Select and mask…</button>
      {useEditor.getState().selection && <button className={chip(false)} onClick={() => s.setSelection(null, 'Deselect')}>Deselect</button>}
    </>
  )
}

export function OptionsBar() {
  const tool = useEditor(s => s.tool)
  const o = useEditor(s => s.options)
  const crop = useEditor(s => s.crop)
  const selection = useEditor(s => s.selection)
  const editingMask = useEditor(s => s.editingMask)
  const quickMask = useEditor(s => s.quickMask)
  const cloneSource = useEditor(s => s.cloneSource)
  const transform = useEditor(s => s.transform)
  const active = useEditor(s => s.layers.find(l => l.id === s.activeId))
  const count = useEditor(s => s.selectedIds.length)
  const s = useEditor.getState()
  const set = s.setOption
  const def = TOOLS.find(t => t.id === tool)
  const Icon = def?.icon
  const brushy = ['brush', 'eraser', 'clone', 'heal', 'remove', 'dodge', 'burn', 'sponge'].includes(tool)

  if (transform) {
    const modes = ['free', 'skew', 'distort', 'perspective', 'warp'] as const
    return (
      <div className="vc-chrome h-10 shrink-0 flex items-center gap-2 px-3 overflow-x-auto border-b border-white/[0.06] bg-[#111115] text-void-300">
        <span className="text-[12px] font-medium text-void-100 shrink-0">Transform</span>
        {modes.map(m => <button key={m} className={chip(transform.mode === m)} onClick={() => ops.beginTransform(m)}>{m[0].toUpperCase() + m.slice(1)}</button>)}
        <span className="text-[12px] text-void-500 shrink-0">{transform.mode === 'warp' ? 'Drag the grid points to bend the layer.' : transform.mode === 'perspective' ? 'Drag a corner: the opposite corner mirrors it.' : transform.mode === 'skew' ? 'Drag a corner along its edge.' : 'Drag any corner freely. Drag inside to move.'}</span>
        <span className="ml-auto flex items-center gap-2 shrink-0">
          <Button primary onClick={ops.applyTransform} className="!h-7"><Check size={14} />Apply (Enter)</Button>
          <Button onClick={ops.cancelTransform} className="!h-7"><X size={14} />Cancel (Esc)</Button>
        </span>
      </div>
    )
  }

  return (
    <div className="vc-chrome h-10 shrink-0 flex items-center gap-3 px-3 overflow-x-auto no-scrollbar border-b border-white/[0.06] bg-[#111115] text-void-300">
      {Icon && <span className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-white/[0.08] text-void-100" title={def?.label}><Icon size={16} strokeWidth={1.75} /><span className="hidden lg:inline text-[12px]">{def?.label.split(' (')[0]}</span></span>}
      {quickMask && <span className="text-[12px] text-rose-300 shrink-0">Quick mask on: Brush adds, Eraser removes. Press Q when done.</span>}

      {tool === 'move' && (
        <>
          <Check2 on={o.autoSelect !== false} label="Auto-select" onChange={v => set('autoSelect', v)} title="Click picks the layer under the pointer. Off: drag moves the selected layer from anywhere." />
          <select aria-label="Auto-select what" value={o.autoSelectGroup ? 'group' : 'layer'} onChange={e => set('autoSelectGroup', e.target.value === 'group')} className="h-7 px-1.5 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] shrink-0"><option value="layer">Layer</option><option value="group">Group</option></select>
          <Check2 on={o.showTransform !== false} label="Transform controls" onChange={v => set('showTransform', v)} />
          <Check2 on={o.showDistances !== false} label="Distances" onChange={v => set('showDistances', v)} />
          <Sep />
          {([['left', AlignStartVertical, 'Align left'], ['hcenter', AlignCenterVertical, 'Align centres'], ['right', AlignEndVertical, 'Align right'], ['top', AlignStartHorizontal, 'Align tops'], ['vcenter', AlignCenterHorizontal, 'Align middles'], ['bottom', AlignEndHorizontal, 'Align bottoms']] as const).map(([h, I, label]) => (
            <IconButton key={h} label={count > 1 ? label : label + ' to the page'} disabled={!active} onClick={() => s.align(h)} className="!h-7 !w-7" tipSide="bottom"><I size={15} /></IconButton>
          ))}
          <IconButton label="Distribute horizontally" disabled={count < 3} onClick={() => s.distribute('h')} className="!h-7 !w-7" tipSide="bottom"><AlignHorizontalDistributeCenter size={15} /></IconButton>
          <IconButton label="Distribute vertically" disabled={count < 3} onClick={() => s.distribute('v')} className="!h-7 !w-7" tipSide="bottom"><AlignVerticalDistributeCenter size={15} /></IconButton>
          <Sep />
          <button className={chip(false)} disabled={!active} onClick={() => ops.beginTransform('free')} title="Ctrl+T">Transform…</button>
        </>
      )}

      {brushy && (
        <>
          <Num label="Size" value={o.size} min={1} max={1000} unit="px" onChange={v => set('size', v)} />
          {!['heal', 'remove'].includes(tool) && <Num label="Hardness" value={o.hardness * 100} min={0} max={100} unit="%" onChange={v => set('hardness', v / 100)} />}
          {['brush', 'eraser', 'clone'].includes(tool) && <Num label="Opacity" value={o.opacity * 100} min={1} max={100} unit="%" onChange={v => set('opacity', v / 100)} />}
          {['brush', 'eraser', 'clone'].includes(tool) && <Num label="Flow" value={(o.flow ?? 1) * 100} min={1} max={100} unit="%" onChange={v => set('flow', v / 100)} title="How much paint each dab lays down. Low flow builds up as you go over an area." />}
          {['brush', 'eraser'].includes(tool) && <Num label="Smoothing" value={(o.smoothing ?? 0) * 100} min={0} max={100} unit="%" onChange={v => set('smoothing', v / 100)} title="Steadies shaky strokes" />}
          {['dodge', 'burn'].includes(tool) && <>
            <select aria-label="Range" value={o.toneRange ?? 'midtones'} onChange={e => set('toneRange', e.target.value as any)} className="h-7 px-1.5 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] shrink-0"><option value="shadows">Shadows</option><option value="midtones">Midtones</option><option value="highlights">Highlights</option></select>
            <Num label="Exposure" value={(o.exposure ?? 0.5) * 100} min={1} max={100} unit="%" onChange={v => set('exposure', v / 100)} />
          </>}
          {tool === 'sponge' && <>
            <select aria-label="Sponge mode" value={o.spongeMode ?? 'desaturate'} onChange={e => set('spongeMode', e.target.value as any)} className="h-7 px-1.5 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] shrink-0"><option value="desaturate">Desaturate</option><option value="saturate">Saturate</option></select>
            <Num label="Flow" value={(o.exposure ?? 0.5) * 100} min={1} max={100} unit="%" onChange={v => set('exposure', v / 100)} />
          </>}
          <Sep />
          <Check2 on={o.pressureSize !== false} label="Pen size" onChange={v => set('pressureSize', v)} title="Pen pressure changes the size" />
          {['brush', 'eraser'].includes(tool) && <Check2 on={!!o.pressureOpacity} label="Pen opacity" onChange={v => set('pressureOpacity', v)} title="Pen pressure changes the opacity" />}
          {editingMask && <span className="text-[12px] text-accent-light shrink-0">Painting on the mask: Brush shows, Eraser hides.</span>}
          {tool === 'clone' && <span className="text-[12px] text-void-400 shrink-0">{cloneSource ? 'Source set. Alt-click to change it.' : 'Alt-click to choose where to copy from.'}</span>}
          {tool === 'heal' && <span className="text-[12px] text-void-400 shrink-0">Paint over a spot, then let go.</span>}
          {tool === 'remove' && <span className="text-[12px] text-void-400 shrink-0">Paint over what you want gone. It is filled in on your device, free.</span>}
        </>
      )}

      {['marquee', 'ellipse', 'lasso', 'polylasso', 'wand', 'objectselect'].includes(tool) && (
        <>
          <SelectionMode />
          {['marquee', 'ellipse', 'lasso', 'polylasso'].includes(tool) && <Num label="Feather" value={o.feather} min={0} max={200} unit="px" onChange={v => set('feather', v)} />}
          {tool === 'wand' && <>
            <Num label="Tolerance" value={o.tolerance} min={0} max={255} onChange={v => set('tolerance', v)} />
            <Check2 on={o.contiguous} label="Contiguous" onChange={v => set('contiguous', v)} />
            <Check2 on={o.sampleAll !== false} label="Sample all layers" onChange={v => set('sampleAll', v)} />
          </>}
          {tool === 'objectselect' && <span className="text-[12px] text-void-400 shrink-0">Drag a box around an object.</span>}
          <SelectionExtras />
        </>
      )}

      {tool === 'fill' && <>
        <Num label="Tolerance" value={o.tolerance} min={0} max={255} onChange={v => set('tolerance', v)} />
        <Check2 on={o.contiguous} label="Contiguous" onChange={v => set('contiguous', v)} />
        <Num label="Opacity" value={o.opacity * 100} min={1} max={100} unit="%" onChange={v => set('opacity', v / 100)} />
      </>}
      {tool === 'gradient' && <>
        <Num label="Opacity" value={o.opacity * 100} min={1} max={100} unit="%" onChange={v => set('opacity', v / 100)} />
        <span className="text-[12px] text-void-400 shrink-0">Drag to blend from the main colour to the second colour.</span>
      </>}

      {tool === 'shape' && (
        <>
          {(['rect', 'ellipse', 'polygon', 'line'] as const).map(k => (
            <button key={k} className={chip(o.shape === k)} onClick={() => set('shape', k)} aria-pressed={o.shape === k}>{{ rect: 'Rectangle', ellipse: 'Ellipse', polygon: 'Polygon or star', line: 'Line' }[k]}</button>
          ))}
          {o.shape === 'polygon' && <>
            <Num label="Points" value={o.sides ?? 5} min={3} max={40} onChange={v => set('sides', v)} />
            <Num label="Star depth" value={Math.round((1 - (o.star ?? 1)) * 100)} min={0} max={90} unit="%" onChange={v => set('star', 1 - v / 100)} />
          </>}
          <span className="text-[12px] text-void-400 shrink-0">Drag to draw. Shift keeps it even.</span>
        </>
      )}

      {tool === 'text' && (
        <span className="text-[12px] text-void-400 shrink-0">Click for a line of text, or drag a box for a paragraph that wraps. Character and Paragraph panels hold the details.</span>
      )}

      {(tool === 'pen' || tool === 'pathselect') && (
        <>
          <span className="text-[12px] text-void-400 shrink-0">{tool === 'pen' ? 'Click for corners, drag for curves, click the first point to close. Enter or Esc finishes.' : 'Drag points and handles. Alt-click a point to switch corner and curve. Delete removes a point.'}</span>
          <Sep />
          <button className={chip(false)} onClick={() => ops.pathToSelection()}>Selection</button>
          <button className={chip(false)} onClick={() => ops.maskFromPath()}>Mask</button>
          <button className={chip(false)} onClick={() => ops.shapeFromPath()}>Shape</button>
        </>
      )}

      {tool === 'crop' && (
        <>
          {([['Free', null], ['1:1', 1], ['4:5', 0.8], ['16:9', 16 / 9], ['9:16', 9 / 16], ['3:2', 1.5]] as [string, number | null][]).map(([l, a]) => (
            <button key={l} className={chip(o.cropAspect === a)} onClick={() => set('cropAspect', a)} aria-pressed={o.cropAspect === a}>{l}</button>
          ))}
          {crop && crop.w > 1 ? (
            <span className="flex items-center gap-2 shrink-0">
              <span className="text-[12px] tabular-nums text-void-400">{Math.round(crop.w)} × {Math.round(crop.h)}</span>
              <Button primary onClick={() => { s.cropTo(crop.x, crop.y, crop.w, crop.h); useEditor.setState({ crop: null }) }} className="!h-7"><Check size={14} />Apply</Button>
              <Button onClick={() => useEditor.setState({ crop: null })} className="!h-7"><X size={14} />Cancel</Button>
            </span>
          ) : <span className="text-[12px] text-void-400 shrink-0">Drag over the part you want to keep.</span>}
        </>
      )}
      {tool === 'eyedropper' && <span className="text-[12px] text-void-400 shrink-0">Click to pick a colour. Alt-click sets the second colour.</span>}
      {tool === 'hand' && <span className="text-[12px] text-void-400 shrink-0">Drag to move around. Hold Space with any tool to do the same.</span>}
      {tool === 'zoom' && <span className="text-[12px] text-void-400 shrink-0">Click to zoom in. Alt-click to zoom out.</span>}

      {selection && !['marquee', 'ellipse', 'lasso', 'polylasso', 'wand', 'objectselect'].includes(tool) && (
        <span className="ml-auto flex items-center gap-1 shrink-0 pl-4">
          <span className="text-[12px] text-void-500 mr-1">Selection</span>
          <button className={chip(false)} onClick={() => s.layerFromSelection(false)}>Copy to layer</button>
          <button className={chip(false)} onClick={() => { const id = useEditor.getState().activeId; if (id) s.addMask(id, true) }}>Make mask</button>
          <button className={chip(false)} onClick={() => s.invertSelection()}>Invert</button>
          <button className={chip(false)} onClick={() => s.setSelection(null, 'Deselect')}>Deselect</button>
        </span>
      )}
      <span className="sr-only">{FAMILIES.length} tool groups</span>
    </div>
  )
}
