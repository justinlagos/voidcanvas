'use client'

import { Copy, Eclipse, ImageOff, Move, PenLine, Scissors, Trash2 } from 'lucide-react'
import { layerBounds } from '../engine'
import { useEditor } from '../store'
import { removeBackground } from './PropertiesPanel'

/** The few most likely next actions, right above the selected layer. Saves a trip to the side panel. */
export function FloatingBar() {
  const layer = useEditor(s => (s.tool === 'move' && s.selectedIds.length === 1 && !s.editingTextId ? s.layers.find(l => l.id === s.activeId) : undefined))
  const doc = useEditor(s => s.doc)
  const view = useEditor(s => s.view)
  if (!layer || !doc || layer.type === 'adjustment' || layer.locked || !layer.visible) return null
  const s = useEditor.getState()
  const b = layerBounds(layer, doc)
  const cx = view.panX + (b.x + b.w / 2) * view.zoom
  const topEdge = view.panY + b.y * view.zoom
  const bottomEdge = view.panY + (b.y + b.h) * view.zoom
  const BAR_H = 44
  // The rotate handle sits ~28px above the layer's top; clear it (handle + gap) so the bar never covers it.
  const ROTATE_CLEAR = 46
  const wantAbove = topEdge - ROTATE_CLEAR - BAR_H
  // If there is no room above (layer near the top of the canvas), drop the bar below the layer instead.
  const placeBelow = wantAbove < 8
  const top = placeBelow ? bottomEdge + 14 : wantAbove
  const btn = 'h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-[12.5px] text-void-100 hover:bg-void-700 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent'
  return (
    <div data-floating className="absolute z-10 flex items-center gap-0.5 p-1 rounded-xl bg-[#1c1c22] border border-void-700 shadow-xl -translate-x-1/2" style={{ left: Math.max(150, cx), top: Math.max(8, top) }}>
      {layer.type === 'raster' && <button className={btn} onClick={() => removeBackground(layer.id)}><ImageOff size={14} />Remove background</button>}
      {layer.type === 'raster' && <button className={btn} onClick={() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'filters' }))}><Eclipse size={14} />Filters</button>}
      {layer.clipId
        ? <button className={btn} onClick={() => useEditor.getState().releaseClippingMask(layer.id)}><Scissors size={14} />Release clip</button>
        : (useEditor.getState().canClip(layer.id) && <button className={btn} onClick={() => useEditor.getState().createClippingMask(layer.id)}><Scissors size={14} />Clip to below</button>)}
      {layer.type === 'text' && <button className={btn} onClick={() => useEditor.setState({ editingTextId: layer.id })}><PenLine size={14} />Edit text</button>}
      <button className={btn} aria-label="Centre on page" title="Centre on page" onClick={() => { s.align('hcenter'); s.align('vcenter') }}><Move size={14} /></button>
      <button className={btn} aria-label="Duplicate" title="Duplicate (Ctrl+J)" onClick={() => s.duplicateLayer(layer.id)}><Copy size={14} /></button>
      <button className={btn} aria-label="Delete" title="Delete" onClick={() => s.removeSelected()}><Trash2 size={14} /></button>
    </div>
  )
}
