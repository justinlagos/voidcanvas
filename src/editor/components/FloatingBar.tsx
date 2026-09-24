'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Copy, Eclipse, ImageOff, Move, PenLine, Scissors, Trash2 } from 'lucide-react'
import { layerBounds } from '../engine'
import { useEditor } from '../store'
import type { Layer } from '../types'
import { useIsPhone } from './MobileEditor'
import { removeBackground } from './PropertiesPanel'

/** The few most likely next actions, right above the selected layer. Saves a trip to the side panel. */
export function FloatingBar() {
  const layer = useEditor(s => (s.tool === 'move' && s.selectedIds.length === 1 && !s.editingTextId ? s.layers.find(l => l.id === s.activeId) : undefined))
  const doc = useEditor(s => s.doc)
  const view = useEditor(s => s.view)
  const ref = useRef<HTMLDivElement>(null)
  // Phones have the Select sheet instead.
  const phone = useIsPhone()
  // Measured after render so the bar can be kept inside the stage whatever its width.
  const [box, setBox] = useState({ w: 0, stageW: 0, stageH: 0 })
  useLayoutEffect(() => {
    const el = ref.current, stage = el?.parentElement
    if (!el || !stage) return
    const w = el.offsetWidth, stageW = stage.clientWidth, stageH = stage.clientHeight
    if (w !== box.w || stageW !== box.stageW || stageH !== box.stageH) setBox({ w, stageW, stageH })
  })
  if (phone || !layer || !doc || layer.type === 'adjustment' || layer.locked || !layer.visible) return null
  const s = useEditor.getState()
  const b = layerBounds(layer, doc)
  const cx = view.panX + (b.x + b.w / 2) * view.zoom
  const topEdge = view.panY + b.y * view.zoom
  const bottomEdge = view.panY + (b.y + b.h) * view.zoom
  const BAR_H = 44
  const PAD = 8
  // The rotate handle sits ~28px above the layer's top; clear it (handle + gap) so the bar never covers it.
  const ROTATE_CLEAR = 46
  const wantAbove = topEdge - ROTATE_CLEAR - BAR_H
  // If there is no room above (layer near the top of the canvas), drop the bar below the layer instead.
  const placeBelow = wantAbove < PAD
  // Phones: the bar is wider than half the stage, so it docks at the bottom instead of chasing the layer.
  const dock = box.stageW > 0 && box.w > box.stageW * 0.6
  // Clamp so the bar stays inside the stage on every side.
  const half = box.w / 2
  const left = box.stageW ? Math.min(Math.max(cx, half + PAD), box.stageW - half - PAD) : Math.max(150, cx)
  const top = box.stageH ? Math.min(Math.max(PAD, placeBelow ? bottomEdge + 14 : wantAbove), box.stageH - BAR_H - PAD) : Math.max(PAD, placeBelow ? bottomEdge + 14 : wantAbove)
  const style = dock
    ? { left: '50%', bottom: PAD, maxWidth: `calc(100% - ${PAD * 2}px)` }
    : { left, top }
  const btn = 'h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-[12.5px] text-void-100 hover:bg-void-700 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent'
  return (
    <div ref={ref} data-floating className={`absolute z-10 flex items-center gap-0.5 p-1 rounded-xl bg-[#1c1c22] border border-void-700 shadow-xl -translate-x-1/2 ${dock ? 'overflow-x-auto' : ''}`} style={style}>
      {layer.type === 'raster' && <button className={btn} onClick={() => removeBackground(layer.id)}><ImageOff size={14} />Remove background</button>}
      {layer.type === 'raster' && <button className={btn} onClick={() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'filters' }))}><Eclipse size={14} />Filters</button>}
      {layer.type === 'text' && <button className={btn} onClick={() => useEditor.setState({ editingTextId: layer.id })}><PenLine size={14} />Edit text</button>}
      {layer.type === 'text' && <TextQuick layer={layer} />}
      {layer.type !== 'text' && (layer.clipId
        ? <button className={btn} onClick={() => useEditor.getState().releaseClippingMask(layer.id)}><Scissors size={14} />Release clip</button>
        : (useEditor.getState().canClip(layer.id) && <button className={btn} onClick={() => useEditor.getState().createClippingMask(layer.id)}><Scissors size={14} />Clip to below</button>))}
      <button className={btn} aria-label="Centre on page" title="Centre on page" onClick={() => { s.align('hcenter'); s.align('vcenter') }}><Move size={14} /></button>
      <button className={btn} aria-label="Duplicate" title="Duplicate (Ctrl+J)" onClick={() => s.duplicateLayer(layer.id)}><Copy size={14} /></button>
      <button className={btn} aria-label="Delete" title="Delete" onClick={() => s.removeSelected()}><Trash2 size={14} /></button>
    </div>
  )
}

/** Font and colour for a selected text layer, so the two most common changes never need the panel. */
function TextQuick({ layer }: { layer: Extract<Layer, { type: 'text' }> }) {
  const [fonts, setFonts] = useState<string[]>([])
  useEffect(() => { import('../io').then(m => { const used = Array.from(new Set(useEditor.getState().layers.filter(l => l.type === 'text').map(l => (l as Extract<Layer, { type: 'text' }>).fontFamily))); setFonts(Array.from(new Set([...used, ...m.FONTS]))) }) }, [])
  const up = (patch: Partial<Extract<Layer, { type: 'text' }>>, label?: string) => useEditor.getState().updateLayer(layer.id, patch, label)
  const setFont = async (fontFamily: string) => { const { ensureFont } = await import('../io'); await ensureFont(fontFamily, layer.fontWeight, layer.italic); up({ fontFamily }, 'Font') }
  return (
    <>
      <select aria-label="Font" value={layer.fontFamily} onChange={e => setFont(e.target.value)} className="h-8 max-w-[130px] px-2 rounded-lg bg-transparent text-[12.5px] text-void-100 hover:bg-void-700 outline-none" style={{ fontFamily: `"${layer.fontFamily}"` }}>
        {(fonts.length ? fonts : [layer.fontFamily]).map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <button className="h-8 px-2 inline-flex items-center rounded-lg hover:bg-void-700" aria-label="Text colour" title="Colour" onClick={() => {
        const i = document.createElement('input'); i.type = 'color'; i.value = layer.color
        i.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
        i.oninput = () => up({ color: i.value }); i.onchange = () => { up({ color: i.value }, 'Colour'); i.remove() }
        document.body.appendChild(i); i.click()
      }}><span className="w-4 h-4 rounded-full border border-white/30" style={{ background: layer.color }} /></button>
    </>
  )
}
