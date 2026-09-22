'use client'

import { ArrowLeftRight, Check, X } from 'lucide-react'
import { useEditor } from '../store'
import { Button, focusRing } from './ui'

function Num({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 shrink-0">
      <span className="text-[12px] text-void-400">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="vc-bar w-24" />
      <span className="w-10 text-[12px] tabular-nums text-void-200">{Math.round(value)}{unit}</span>
    </label>
  )
}

const chip = (on: boolean) => `h-7 px-2.5 rounded-md text-[12px] shrink-0 ${focusRing} ${on ? 'bg-void-700 text-white' : 'text-void-400 hover:text-white hover:bg-void-800'}`

const HINTS: Record<string, string> = {
  move: 'Click a layer to select it. Drag to move, use the handles to resize or rotate.',
  text: 'Click where you want the text.',
  eyedropper: 'Click anywhere to pick up that colour.',
  hand: 'Drag to move around. Tip: hold Space with any tool.',
  zoom: 'Click to zoom in. Hold Alt to zoom out.',
  lasso: 'Draw around the area. Shift adds, Alt removes.',
  marquee: 'Drag to select. Shift adds, Alt removes. Click once to deselect.',
  ellipse: 'Drag to select. Shift adds, Alt removes. Click once to deselect.',
  gradient: 'Drag to draw a blend from the main colour to the second colour.',
}

export function OptionsBar() {
  const tool = useEditor(s => s.tool)
  const o = useEditor(s => s.options)
  const crop = useEditor(s => s.crop)
  const selection = useEditor(s => s.selection)
  const editingMask = useEditor(s => s.editingMask)
  const cloneSource = useEditor(s => s.cloneSource)
  const s = useEditor.getState()
  const set = s.setOption

  const fg = useEditor(st => st.fg), bg = useEditor(st => st.bg)
  const brushy = ['brush', 'eraser', 'clone', 'heal'].includes(tool)
  return (
    <div className="h-11 shrink-0 flex items-center gap-4 px-3 md:px-4 overflow-x-auto border-b border-void-800/60 bg-[#101014] text-void-300">
      <div className="flex items-center gap-1 shrink-0 pr-3 border-r border-void-800">
        <input type="color" aria-label="Main colour" title="Main colour: used by brush, fill, text and shapes" value={fg} onChange={e => s.setFg(e.target.value)} onBlur={e => s.addSwatch(e.target.value)} className={`w-7 h-7 rounded-md cursor-pointer bg-transparent ${focusRing}`} />
        <button aria-label="Swap colours" title="Swap colours (X)" onClick={s.swapColors} className={`w-6 h-7 inline-flex items-center justify-center text-void-500 hover:text-white rounded ${focusRing}`}><ArrowLeftRight size={13} /></button>
        <input type="color" aria-label="Second colour" title="Second colour: the end of gradients" value={bg} onChange={e => s.setBg(e.target.value)} className={`w-6 h-6 rounded-md cursor-pointer bg-transparent ${focusRing}`} />
      </div>
      {brushy && (
        <>
          <Num label="Size" value={o.size} min={1} max={400} unit="px" onChange={v => set('size', v)} />
          {tool !== 'heal' && <Num label="Softness" value={(1 - o.hardness) * 100} min={0} max={100} unit="%" onChange={v => set('hardness', 1 - v / 100)} />}
          {tool !== 'heal' && <Num label="Strength" value={o.opacity * 100} min={1} max={100} unit="%" onChange={v => set('opacity', v / 100)} />}
          {editingMask && <span className="text-[12px] text-accent-light shrink-0">Painting on the mask: Brush shows, Eraser hides.</span>}
          {tool === 'clone' && <span className="text-[12px] text-void-400 shrink-0">{cloneSource ? 'Source set. Alt-click to change it.' : 'Alt-click to choose where to copy from.'}</span>}
          {tool === 'heal' && <span className="text-[12px] text-void-400 shrink-0">Paint over a spot, then let go.</span>}
        </>
      )}
      {(tool === 'wand' || tool === 'fill') && (
        <>
          <Num label="Tolerance" value={o.tolerance} min={0} max={255} onChange={v => set('tolerance', v)} />
          <button className={chip(o.contiguous)} onClick={() => set('contiguous', !o.contiguous)} aria-pressed={o.contiguous}>Connected areas only</button>
        </>
      )}
      {tool === 'shape' && (['rect', 'ellipse', 'line'] as const).map(k => (
        <button key={k} className={chip(o.shape === k)} onClick={() => set('shape', k)} aria-pressed={o.shape === k}>{k === 'rect' ? 'Rectangle' : k === 'ellipse' ? 'Ellipse' : 'Line'}</button>
      ))}
      {tool === 'shape' && <span className="text-[12px] text-void-400 shrink-0">Drag to draw, or click to drop one in.</span>}
      {tool === 'crop' && (
        <>
          {([['Free', null], ['1:1', 1], ['4:5', 0.8], ['16:9', 16 / 9], ['9:16', 9 / 16], ['3:2', 1.5]] as [string, number | null][]).map(([l, a]) => (
            <button key={l} className={chip(o.cropAspect === a)} onClick={() => set('cropAspect', a)} aria-pressed={o.cropAspect === a}>{l}</button>
          ))}
          {crop && crop.w > 1 ? (
            <span className="flex items-center gap-2 shrink-0">
              <span className="text-[12px] tabular-nums text-void-400">{Math.round(crop.w)} × {Math.round(crop.h)}</span>
              <Button primary onClick={() => { s.cropTo(crop.x, crop.y, crop.w, crop.h); useEditor.setState({ crop: null }) }}><Check size={15} />Apply crop</Button>
              <Button onClick={() => useEditor.setState({ crop: null })}><X size={15} />Cancel</Button>
            </span>
          ) : <span className="text-[12px] text-void-400 shrink-0">Drag over the part you want to keep.</span>}
        </>
      )}
      {HINTS[tool] && <span className="text-[12px] text-void-400 shrink-0">{HINTS[tool]}</span>}

      {selection && (
        <span className="ml-auto flex items-center gap-1.5 shrink-0 pl-4">
          <span className="text-[12px] text-void-500 mr-1">Selection</span>
          <button className={chip(false)} onClick={() => s.layerFromSelection(false)}>Copy to layer</button>
          <button className={chip(false)} onClick={() => s.layerFromSelection(true)}>Cut to layer</button>
          <button className={chip(false)} onClick={() => s.fillSelection(useEditor.getState().fg)}>Fill</button>
          <button className={chip(false)} onClick={() => { const id = useEditor.getState().activeId; if (id) s.addMask(id, true) }}>Make mask</button>
          <button className={chip(false)} onClick={s.invertSelection}>Invert</button>
          <button className={chip(false)} onClick={() => s.setSelection(null, 'Deselect')}>Deselect</button>
        </span>
      )}
    </div>
  )
}
