'use client'

import { useRef, useState } from 'react'
import { GripVertical } from 'lucide-react'
import { useEditor } from '../store'
import { STYLE_KINDS, STYLE_LABELS, defaultStyle, emptyStyles } from '../styles'
import { BLEND_MODES, type LayerStyles, type StyleKind } from '../types'
import { ColorButton } from './ColorPicker'
import { Button, Modal, Select, Slider, focusRing } from './ui'

// Photoshop's Layer Style window, with one fix designers ask for: drag effects to change their order.

export function LayerStyleDialog({ onClose, focus }: { onClose: () => void; focus?: StyleKind }) {
  const layer = useEditor(s => s.layers.find(l => l.id === s.activeId))
  const original = useRef(layer ? { styles: layer.styles ? JSON.parse(JSON.stringify(layer.styles)) : null, opacity: layer.opacity, fill: layer.fillOpacity, blend: layer.blend } : null)
  const [sel, setSel] = useState<StyleKind | 'blend'>(focus ?? 'blend')
  const [dragK, setDragK] = useState<StyleKind | null>(null)
  const s = useEditor.getState()
  if (!layer || layer.type === 'adjustment') return <Modal title="Layer style" onClose={onClose}><p className="p-5 text-[13px] text-void-400">Select an image, text or shape layer first.</p></Modal>
  const st: LayerStyles = layer.styles ?? emptyStyles()
  const order = st.order?.length ? st.order : STYLE_KINDS
  const put = (next: LayerStyles) => s.updateLayer(layer.id, { styles: next })
  const patch = (k: StyleKind, p: any) => put({ ...st, [k]: { ...(defaultStyle(k)), ...((st as any)[k] ?? {}), ...p } })
  const toggle = (k: StyleKind) => { const cur = (st as any)[k]; put({ ...st, [k]: cur ? { ...cur, on: !cur.on } : defaultStyle(k) }); setSel(k) }
  const e: any = sel !== 'blend' ? ((st as any)[sel] ?? defaultStyle(sel)) : null
  const cancel = () => { const o = original.current!; s.updateLayer(layer.id, { styles: o.styles, opacity: o.opacity, fillOpacity: o.fill, blend: o.blend }); onClose() }
  const ok = () => { s.commit('Layer style'); onClose() }
  const reorder = (to: StyleKind) => {
    if (!dragK || dragK === to) return
    const next = order.filter(k => k !== dragK); next.splice(next.indexOf(to), 0, dragK)
    put({ ...st, order: next })
  }
  const blendSel = (v: string, on: (b: any) => void) => <Select label="Blend mode" value={v} options={BLEND_MODES} onChange={on} />
  return (
    <Modal title="Layer style" onClose={cancel} wide preview>
      <div className="flex min-h-[420px]">
        <ul className="w-52 shrink-0 p-2 border-r border-void-800/70 space-y-0.5">
          <li><button onClick={() => setSel('blend')} className={`w-full text-left px-3 h-9 rounded-lg text-[13px] ${sel === 'blend' ? 'bg-void-800 text-white' : 'text-void-300 hover:text-white'}`}>Blending options</button></li>
          {order.map(k => {
            const on = !!(st as any)[k]?.on
            return (
              <li key={k} draggable onDragStart={() => setDragK(k)} onDragOver={ev => { ev.preventDefault(); reorder(k) }} onDragEnd={() => setDragK(null)}
                className={`flex items-center gap-1.5 pl-1 pr-2 h-9 rounded-lg ${sel === k ? 'bg-void-800' : 'hover:bg-void-900'} ${dragK === k ? 'opacity-60' : ''}`}>
                <GripVertical size={13} className="text-void-600 cursor-grab shrink-0" aria-hidden />
                <input type="checkbox" aria-label={`Turn ${STYLE_LABELS[k]} on or off`} checked={on} onChange={() => toggle(k)} className="accent-[#8b7cff]" />
                <button onClick={() => setSel(k)} className={`flex-1 text-left text-[13px] ${on ? 'text-void-100' : 'text-void-400'}`}>{STYLE_LABELS[k]}</button>
              </li>
            )
          })}
          <li className="px-3 pt-2 text-[11px] text-void-600 leading-relaxed">Drag to change the order effects are drawn in.</li>
        </ul>
        <div className="flex-1 p-5 space-y-3.5 overflow-y-auto max-h-[62vh]">
          {sel === 'blend' && <>
            {blendSel(layer.blend, v => s.updateLayer(layer.id, { blend: v }))}
            <Slider label="Opacity" value={Math.round(layer.opacity * 100)} min={0} max={100} unit="%" onChange={v => s.updateLayer(layer.id, { opacity: v / 100 })} />
            <Slider label="Fill opacity" value={Math.round((layer.fillOpacity ?? 1) * 100)} min={0} max={100} unit="%" onChange={v => s.updateLayer(layer.id, { fillOpacity: v / 100 })} />
            <p className="text-[12px] text-void-500">Fill fades the layer itself but keeps its effects, so a stroke or glow can show on its own.</p>
          </>}
          {e && <>
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold">{STYLE_LABELS[sel as StyleKind]}</h3>
              <label className="flex items-center gap-2 text-[12.5px] text-void-300"><input type="checkbox" checked={!!e.on} onChange={() => toggle(sel as StyleKind)} />On</label>
            </div>
            {'color' in e && <div className="flex items-center justify-between"><span className="text-[12px] text-void-400">Colour</span><ColorButton label="Effect colour" value={e.color} onChange={c => patch(sel as StyleKind, { color: c })} /></div>}
            {sel === 'gradientOverlay' && <div className="flex items-center justify-between"><span className="text-[12px] text-void-400">From and to</span><span className="flex gap-2"><ColorButton label="Gradient start" value={e.from} onChange={c => patch('gradientOverlay', { from: c })} /><ColorButton label="Gradient end" value={e.to} onChange={c => patch('gradientOverlay', { to: c })} /></span></div>}
            {sel === 'bevel' && <div className="flex items-center justify-between"><span className="text-[12px] text-void-400">Highlight and shadow</span><span className="flex gap-2"><ColorButton label="Highlight" value={e.highlight} onChange={c => patch('bevel', { highlight: c })} /><ColorButton label="Shadow" value={e.shadow} onChange={c => patch('bevel', { shadow: c })} /></span></div>}
            {blendSel(e.blend, v => patch(sel as StyleKind, { blend: v }))}
            <Slider label="Opacity" value={Math.round(e.opacity * 100)} min={0} max={100} unit="%" onChange={v => patch(sel as StyleKind, { opacity: v / 100 })} />
            {'angle' in e && <Slider label={sel === 'bevel' ? 'Light angle' : 'Angle'} value={e.angle} min={-180} max={180} unit="°" onChange={v => patch(sel as StyleKind, { angle: v })} />}
            {'distance' in e && <Slider label="Distance" value={e.distance} min={0} max={300} unit="px" onChange={v => patch(sel as StyleKind, { distance: v })} />}
            {'spread' in e && <Slider label={sel === 'innerShadow' || sel === 'innerGlow' ? 'Choke' : 'Spread'} value={e.spread} min={0} max={100} unit="%" onChange={v => patch(sel as StyleKind, { spread: v })} />}
            {'size' in e && <Slider label="Size" value={e.size} min={0} max={250} unit="px" onChange={v => patch(sel as StyleKind, { size: v })} />}
            {sel === 'stroke' && <Select label="Position" value={e.position} options={[{ id: 'outside', label: 'Outside' }, { id: 'center', label: 'Centre' }, { id: 'inside', label: 'Inside' }]} onChange={v => patch('stroke', { position: v })} />}
            {sel === 'gradientOverlay' && <Slider label="Scale" value={e.scale} min={10} max={150} unit="%" onChange={v => patch('gradientOverlay', { scale: v })} />}
            {sel === 'bevel' && <>
              <Slider label="Depth" value={e.depth} min={1} max={500} unit="%" onChange={v => patch('bevel', { depth: v })} />
              <Slider label="Soften" value={e.soften} min={0} max={50} unit="px" onChange={v => patch('bevel', { soften: v })} />
            </>}
          </>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-void-800/70">
        <Button onClick={() => put(emptyStyles())}>Clear all</Button>
        <span className="flex gap-2"><Button onClick={cancel}>Cancel</Button><Button primary onClick={ok}>OK</Button></span>
      </div>
      <span className={`sr-only ${focusRing}`} />
    </Modal>
  )
}
