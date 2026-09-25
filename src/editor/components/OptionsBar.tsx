'use client'

import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalDistributeCenter, AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter, Check, MinusSquare, PlusSquare, Square, SquareDot, X } from 'lucide-react'
import { FAMILIES, TOOLS } from './ToolRail'
import * as ops from '../ops'
import * as ai from '../ai-tools'
import { openModal } from '../actions'
import { useEditor } from '../store'
import type { PathOp, SubPath, ToolOptions } from '../types'
import * as pen from '../pen'
import { getSubs, setSubs, stageApi } from './Stage'
import { Floating } from './ColorPicker'
import { useRef, useState } from 'react'
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
  const [more, setMore] = useState(false)
  const moreRef = useRef<HTMLButtonElement>(null)
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
          {/* The four Move settings rarely change, so they live behind one button instead of taking the whole bar. */}
          <div className="relative">
            <button ref={moreRef} onClick={() => setMore(v => !v)} aria-expanded={more} aria-haspopup="menu" className={chip(more)}>Move settings</button>
            {more && (
              <div role="menu" className="absolute left-0 top-full mt-1 z-30 min-w-[260px] p-2 space-y-1.5 rounded-xl bg-[#1d1d23] border border-white/[0.09] shadow-2xl" onPointerLeave={() => setMore(false)}>
          <Check2 on={o.autoSelect !== false} label="Auto-select" onChange={v => set('autoSelect', v)} title="Click picks the layer under the pointer. Off: drag moves the selected layer from anywhere." />
          <select aria-label="Auto-select what" value={o.autoSelectGroup ? 'group' : 'layer'} onChange={e => set('autoSelectGroup', e.target.value === 'group')} className="h-7 px-1.5 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] shrink-0"><option value="layer">Layer</option><option value="group">Group</option></select>
          <Check2 on={o.showTransform !== false} label="Transform controls" onChange={v => set('showTransform', v)} />
          <Check2 on={o.showDistances !== false} label="Distances" onChange={v => set('showDistances', v)} />
              </div>
            )}
          </div>
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

      {(tool === 'pen' || tool === 'curvature' || tool === 'freeform' || tool === 'pathselect') && <PenOptions tool={tool} />}

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

// ─── Pen, Curvature Pen and Direct Selection ───────────────────────

const OPS: { id: PathOp | undefined; label: string; title: string }[] = [
  { id: undefined, label: 'Normal', title: 'Overlapping parts make holes (even-odd)' },
  { id: 'add', label: 'Combine', title: 'New part adds to the shape' },
  { id: 'sub', label: 'Subtract', title: 'New part cuts out of the shape' },
  { id: 'intersect', label: 'Intersect', title: 'Keep only where the new part overlaps' },
  { id: 'xor', label: 'Exclude', title: 'Keep everything except the overlap' },
]

/** Apply an edit to the picked anchor points of the path being edited. */
function editPicks(fn: (subs: SubPath[], picks: { sub: number; idx: number }[]) => SubPath[] | null, label: string, need = 1) {
  const s = useEditor.getState()
  const pp = stageApi.pathPicks()
  if (!pp || pp.picks.length < need) { s.notify(need > 1 ? `Pick ${need} or more points with Direct Select (A) first. Shift-click or drag a box to pick several.` : 'Pick a point with Direct Select (A) first.'); return }
  const next = fn(getSubs(pp.target), pp.picks)
  if (!next) return
  setSubs(pp.target, next); s.commit(label)
}

function PenOptions({ tool }: { tool: string }) {
  const o = useEditor(s => s.options)
  const fg = useEditor(s => s.fg), bg = useEditor(s => s.bg)
  const set = useEditor.getState().setOption
  const mode = o.penMode ?? 'shape'
  const [more, setMore] = useState(false)
  const moreBtn = useRef<HTMLButtonElement>(null)
  const hint = tool === 'pen'
    ? 'Click for corners, drag for curves. Shift keeps 45°, Alt breaks a handle, Space moves the point, Ctrl edits. Click the first point to close.'
    : tool === 'curvature'
      ? 'Click points and the curve flows through them. Double-click or Alt-click for a corner. Drag a point to reshape.'
      : tool === 'freeform'
        ? (o.magnetic ? 'Trace along an edge in the image; the line snaps to it. End where you started to close.' : 'Draw freely. Curves are fitted when you let go. End where you started to close.')
      : 'Drag points, handles or the line itself. Shift-click or drag a box to pick several. Alt-click the line to pick the whole path. Arrows nudge.'
  const run = (f: () => void) => () => { f(); setMore(false) }
  return (
    <>
      {tool !== 'pathselect' && (
        <>
          <span className="flex items-center gap-0.5 shrink-0" role="radiogroup" aria-label="Pen mode">
            <button className={chip(mode === 'shape')} aria-pressed={mode === 'shape'} onClick={() => set('penMode', 'shape')} title="Draw a shape layer with fill and stroke that stays editable">Shape</button>
            <button className={chip(mode === 'path')} aria-pressed={mode === 'path'} onClick={() => set('penMode', 'path')} title="Draw a path in the Paths panel, for selections, masks and strokes">Path</button>
          </span>
          {mode === 'shape' && <>
            <label className="flex items-center gap-1.5 text-[12px] text-void-300 shrink-0 cursor-pointer" title="Fill new shapes with the main colour">
              <input type="checkbox" checked={o.penFill !== false} onChange={e => set('penFill', e.target.checked)} className="accent-[#8b7cff]" />Fill<span className="w-3.5 h-3.5 rounded-sm border border-white/20" style={{ background: fg }} />
            </label>
            <label className="flex items-center gap-1.5 text-[12px] text-void-300 shrink-0" title="Stroke width for new shapes, in the second colour. 0 = no stroke">
              Stroke<span className="w-3.5 h-3.5 rounded-sm border border-white/20" style={{ background: bg }} />
              <input type="number" min={0} max={200} value={o.penStrokeWidth ?? 0} onChange={e => set('penStrokeWidth', Math.max(0, Math.min(200, Number(e.target.value) || 0)))} onKeyDown={e => e.stopPropagation()}
                className={`w-12 h-6 px-1 rounded bg-surface-sunken border border-white/[0.06] text-[12px] tabular-nums text-void-100 ${focusRing}`} /><span className="-ml-1 text-[11.5px] text-void-500">px</span>
            </label>
          </>}
          <label className="flex items-center gap-1.5 text-[12px] text-void-300 shrink-0" title="How the next part combines with the shape. Hold Shift when you start a part to add it to the selected shape.">
            <select value={o.penOp ?? ''} onChange={e => set('penOp', (e.target.value || undefined) as PathOp | undefined)} className={`h-7 px-1.5 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] text-void-100 ${focusRing}`}>
              {OPS.map(x => <option key={x.label} value={x.id ?? ''} title={x.title}>{x.label}</option>)}
            </select>
          </label>
          {tool === 'freeform' && <>
            <Num label="Curve fit" value={o.freeFit ?? 3} min={0.5} max={10} step={0.5} unit="px" onChange={v => set('freeFit', v)} title="Lower follows your hand closely with more points. Higher gives smoother curves with fewer points." />
            <Check2 on={!!o.magnetic} label="Magnetic" onChange={v => set('magnetic', v)} title="Snap to edges in the image as you trace" />
            {o.magnetic && <>
              <Num label="Width" value={o.magWidth ?? 10} min={2} max={60} unit="px" onChange={v => set('magWidth', v)} title="How far from the pointer to look for an edge" />
              <Num label="Contrast" value={o.magContrast ?? 30} min={1} max={100} unit="%" onChange={v => set('magContrast', v)} title="How strong an edge must be to snap to it" />
            </>}
          </>}
          {tool === 'pen' && <Check2 on={o.penAutoAdd !== false} label="Auto add/delete" onChange={v => set('penAutoAdd', v)} title="Hover a segment to add a point, hover a point to remove it" />}
          <Check2 on={o.penRubber !== false} label="Preview" onChange={v => set('penRubber', v)} title="Show the next segment before you click (rubber band)" />
          <Sep />
        </>
      )}
      {tool === 'pathselect' && <>
        <button className={chip(false)} onClick={() => editPicks((subs, picks) => { let x = subs; for (const q of picks) x = x.map((sp, i) => (i === q.sub ? { ...sp, nodes: sp.nodes.map((n, j) => (j === q.idx ? convertNodeTo(sp, j, false) : n)) } : sp)); return x }, 'Corner points')} title="Remove the handles of the picked points">Corner</button>
        <button className={chip(false)} onClick={() => editPicks((subs, picks) => { let x = subs; for (const q of picks) x = x.map((sp, i) => (i === q.sub ? { ...sp, nodes: sp.nodes.map((n, j) => (j === q.idx ? convertNodeTo(sp, j, true) : n)) } : sp)); return x }, 'Smooth points')} title="Give the picked points smooth handles">Smooth</button>
        <Sep />
      </>}
      <span className="text-[12px] text-void-400 shrink-0 max-w-[420px] truncate" title={hint}>{hint}</span>
      <Sep />
      <button className={chip(false)} onClick={() => ops.pathToSelection()} title="Load the path as a selection (Ctrl+Enter)">Selection</button>
      <button className={chip(false)} onClick={() => ops.maskFromPath()} title="Mask the selected layer with the path">Mask</button>
      <button ref={moreBtn} className={chip(more)} aria-expanded={more} onClick={() => setMore(v => !v)}>Path…</button>
      {more && moreBtn.current && (
        <Floating anchor={moreBtn.current.getBoundingClientRect()} side="bottom" onClose={() => setMore(false)} label="Path commands">
          <div className="w-60 p-1.5 text-[12.5px]" role="menu">
            {([
              ['Make shape layer from path', ops.shapeFromPath],
              ['Copy shape outline to Paths panel', ops.pathFromLayer],
              ['Fill path with main colour', () => ops.fillPath(useEditor.getState().fg)],
              ['Stroke path', () => ops.strokePath(useEditor.getState().fg, Math.max(1, Math.round(useEditor.getState().options.size / 4)))],
              ['Stroke path, tapered ends', () => ops.strokePath(useEditor.getState().fg, Math.max(2, Math.round(useEditor.getState().options.size / 3)), true)],
              null,
              ['Join picked end points', () => editPicks((subs, picks) => { const ends = picks.filter(q => !subs[q.sub].closed && (q.idx === 0 || q.idx === subs[q.sub].nodes.length - 1)); if (ends.length !== 2 && !(ends.length === 1 && picks.length === 1)) { useEditor.getState().notify('Pick two end points to join, or one open path to close.'); return null } const [a, b] = ends.length === 2 ? ends : [ends[0], { sub: ends[0].sub, idx: ends[0].idx === 0 ? subs[ends[0].sub].nodes.length - 1 : 0 }]; return pen.joinSubs(subs, a.sub, a.idx === 0 ? 'start' : 'end', b.sub, b.idx === 0 ? 'start' : 'end').subs }, 'Join paths')],
              ['Cut path at picked point', () => editPicks((subs, picks) => pen.cutAt(subs, picks[0].sub, picks[0].idx), 'Cut path')],
              ['Average points horizontally', () => editPicks((subs, picks) => pen.averageNodes(subs, picks, 'h'), 'Average points', 2)],
              ['Average points vertically', () => editPicks((subs, picks) => pen.averageNodes(subs, picks, 'v'), 'Average points', 2)],
              ['Average points (both)', () => editPicks((subs, picks) => pen.averageNodes(subs, picks, 'both'), 'Average points', 2)],
              null,
              ['Close open paths', ops.closeOpenPaths],
              ['Reverse path direction', ops.reversePath],
              ['Simplify (remove extra points)', ops.simplifyPath],
              ['Pathfinder: Unite selected shapes', () => ops.pathfinderSelected('unite')],
              ['Pathfinder: Minus front', () => ops.pathfinderSelected('minusFront')],
              ['Pathfinder: Intersect', () => ops.pathfinderSelected('intersect')],
              ['Pathfinder: Exclude', () => ops.pathfinderSelected('exclude')],
              ['Pathfinder: Divide', () => ops.pathfinderSelected('divide')],
              ['Expand path operations', ops.expandPathOps],
              ['Outline stroke', ops.outlineStroke],
              null,
              ['Set last part to Combine', () => ops.setPathOps('add')],
              ['Set last part to Subtract', () => ops.setPathOps('sub')],
              ['Set last part to Intersect', () => ops.setPathOps('intersect')],
              ['Set last part to Exclude', () => ops.setPathOps('xor')],
              null,
              ['Copy as SVG', ops.copyPathSvg],
              ['Export path as SVG file', ops.exportPathSvg],
            ] as ([string, () => void] | null)[]).map((it, i) => it
              ? <button key={it[0]} role="menuitem" onClick={run(it[1])} className={`w-full text-left px-2.5 h-8 rounded-md text-void-200 hover:bg-void-800 hover:text-white ${focusRing}`}>{it[0]}</button>
              : <div key={'sep' + i} className="my-1 h-px bg-white/[0.06]" />)}
          </div>
        </Floating>
      )}
    </>
  )
}
function convertNodeTo(sp: SubPath, i: number, smooth: boolean) { return pen.convertNode(sp, i, smooth) }
