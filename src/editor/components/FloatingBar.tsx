'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Copy, Eclipse, ImageOff, MoreHorizontal, Move, PenLine, Scissors, Trash2 } from 'lucide-react'
import { layerBounds } from '../engine'
import { useEditor } from '../store'
import { setFontNow } from '../ops'
import type { Layer } from '../types'
import { useIsPhone } from './MobileEditor'
import { removeBackground } from './PropertiesPanel'

/** The few most likely next actions, right above the selected layer. Saves a trip to the side panel. */
export function FloatingBar() {
  const layer = useEditor(s => (s.tool === 'move' && s.selectedIds.length === 1 && !s.editingTextId ? s.layers.find(l => l.id === s.activeId) : undefined))
  const doc = useEditor(s => s.doc)
  const view = useEditor(s => s.view)
  const ref = useRef<HTMLDivElement>(null)
  const phone = useIsPhone()
  const [box, setBox] = useState({ w: 0, stageW: 0, stageH: 0 })
  const [more, setMore] = useState(false)
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
  const BAR_H = 44, PAD = 8, ROTATE_CLEAR = 46
  const wantAbove = topEdge - ROTATE_CLEAR - BAR_H
  const placeBelow = wantAbove < PAD
  const dock = box.stageW > 0 && box.w > box.stageW * 0.6
  const half = box.w / 2
  const left = box.stageW ? Math.min(Math.max(cx, half + PAD), box.stageW - half - PAD) : Math.max(150, cx)
  const top = box.stageH ? Math.min(Math.max(PAD, placeBelow ? bottomEdge + 14 : wantAbove), box.stageH - BAR_H - PAD) : Math.max(PAD, placeBelow ? bottomEdge + 14 : wantAbove)
  const style = dock ? { left: '50%', bottom: PAD, maxWidth: `calc(100% - ${PAD * 2}px)` } : { left, top }
  const btn = 'h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-[12.5px] text-void-100 hover:bg-void-700 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent'
  const item = 'w-full h-8 px-3 inline-flex items-center gap-2 text-[12.5px] text-void-100 hover:bg-accent hover:text-white whitespace-nowrap'
  return <>
    {layer.styles?.gradientOverlay?.on && <GradientHandles layer={layer} />}
    <div ref={ref} data-floating className={`absolute z-10 flex items-center gap-0.5 p-1 rounded-xl bg-[#1c1c22] border border-void-700 shadow-xl -translate-x-1/2 ${dock ? 'overflow-x-auto' : ''}`} style={style}>
      {layer.type === 'raster' && <button className={btn} onClick={() => removeBackground(layer.id)}><ImageOff size={14} />Remove background</button>}
      {layer.type === 'raster' && <button className={btn} onClick={() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'filters' }))}><Eclipse size={14} />Filters</button>}
      {layer.type === 'text' && <button className={btn} onClick={() => useEditor.setState({ editingTextId: layer.id })}><PenLine size={14} />Edit text</button>}
      {layer.type === 'text' && <TextQuick layer={layer} />}
      <div className="relative">
        <button className={btn} aria-label="More" aria-haspopup="menu" aria-expanded={more} onClick={() => setMore(v => !v)}><MoreHorizontal size={14} /></button>
        {more && <div role="menu" className="absolute left-0 top-full mt-1 z-20 min-w-[180px] py-1 rounded-xl bg-[#1c1c22] border border-void-700 shadow-xl" onPointerLeave={() => setMore(false)}>
          <button role="menuitem" className={item} onClick={() => { s.align('hcenter'); s.align('vcenter'); setMore(false) }}><Move size={14} />Centre on page</button>
          <button role="menuitem" className={item} onClick={() => { s.duplicateLayer(layer.id); setMore(false) }}><Copy size={14} />Duplicate</button>
          {layer.type !== 'text' && (layer.clipId ? <button role="menuitem" className={item} onClick={() => { useEditor.getState().releaseClippingMask(layer.id); setMore(false) }}><Scissors size={14} />Release clip</button> : (useEditor.getState().canClip(layer.id) && <button role="menuitem" className={item} onClick={() => { useEditor.getState().createClippingMask(layer.id); setMore(false) }}><Scissors size={14} />Clip to below</button>))}
          <button role="menuitem" className={`${item} text-red-300`} onClick={() => { s.removeSelected(); setMore(false) }}><Trash2 size={14} />Delete</button>
        </div>}
      </div>
    </div>
  </>
}

/** Centre and radius/angle handles for the selected live gradient overlay. */
function GradientHandles({ layer }: { layer: Layer }) {
  const doc = useEditor(s => s.doc)!, view = useEditor(s => s.view)
  const b = layerBounds(layer, doc), g = layer.styles!.gradientOverlay!
  const center = { x: b.x + b.w * (g.centerX ?? 50) / 100, y: b.y + b.h * (g.centerY ?? 50) / 100 }
  const radius = Math.max(24 / view.zoom, Math.max(b.w, b.h) / 2 * (g.scale ?? 100) / 100)
  const a = (g.angle ?? 0) * Math.PI / 180
  const end = { x: center.x + Math.cos(a) * radius, y: center.y - Math.sin(a) * radius }
  const sx = (x: number) => view.panX + x * view.zoom, sy = (y: number) => view.panY + y * view.zoom
  const patch = (p: Partial<typeof g>) => useEditor.getState().updateLayer(layer.id, { styles: { ...layer.styles!, gradientOverlay: { ...g, ...p } } })
  const drag = (kind: 'center' | 'end') => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId)
    const stage = e.currentTarget.parentElement?.parentElement
    const move = (ev: PointerEvent) => {
      const r = stage?.getBoundingClientRect(); if (!r) return
      const x = (ev.clientX - r.left - view.panX) / view.zoom, y = (ev.clientY - r.top - view.panY) / view.zoom
      if (kind === 'center') patch({ centerX: Math.max(-100, Math.min(200, 50 + (x - (b.x + b.w / 2)) / Math.max(1, b.w) * 100)), centerY: Math.max(-100, Math.min(200, 50 + (y - (b.y + b.h / 2)) / Math.max(1, b.h) * 100)) })
      else { const dx = x - center.x, dy = y - center.y; patch({ angle: Math.atan2(-dy, dx) * 180 / Math.PI, scale: Math.max(1, Math.min(300, Math.hypot(dx, dy) / Math.max(1, Math.max(b.w, b.h) / 2) * 100)) }) }
    }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); useEditor.getState().commit('Gradient placement') }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up, { once: true })
  }
  return <div className="absolute inset-0 z-[9] pointer-events-none" data-gradient-handles>
    <svg className="absolute inset-0 w-full h-full overflow-visible"><line x1={sx(center.x)} y1={sy(center.y)} x2={sx(end.x)} y2={sy(end.y)} stroke="#fff" strokeOpacity=".7" strokeWidth="1" strokeDasharray="4 3" /></svg>
    <button aria-label="Move gradient centre" onPointerDown={drag('center')} className="pointer-events-auto absolute w-4 h-4 rounded-full border-2 border-white bg-accent shadow -translate-x-1/2 -translate-y-1/2" style={{ left: sx(center.x), top: sy(center.y) }} />
    <button aria-label="Change gradient angle and scale" onPointerDown={drag('end')} className="pointer-events-auto absolute w-4 h-4 rounded-full border-2 border-white bg-void-900 shadow -translate-x-1/2 -translate-y-1/2" style={{ left: sx(end.x), top: sy(end.y) }} />
  </div>
}

function TextQuick({ layer }: { layer: Extract<Layer, { type: 'text' }> }) {
  const [fonts, setFonts] = useState<string[]>([])
  useEffect(() => { import('../io').then(m => { const used = Array.from(new Set(useEditor.getState().layers.filter(l => l.type === 'text').map(l => (l as Extract<Layer, { type: 'text' }>).fontFamily))); setFonts(Array.from(new Set([...used, ...m.FONTS]))) }) }, [])
  const up = (patch: Partial<Extract<Layer, { type: 'text' }>>, label?: string) => useEditor.getState().updateLayer(layer.id, patch, label)
  const setFont = (fontFamily: string) => setFontNow(layer.id, { fontFamily }, 'Font')
  return <>
    <select aria-label="Font" value={layer.fontFamily} onChange={e => setFont(e.target.value)} className="h-8 max-w-[130px] px-2 rounded-lg bg-transparent text-[12.5px] text-void-100 hover:bg-void-700 outline-none" style={{ fontFamily: `"${layer.fontFamily}"` }}>{(fonts.length ? fonts : [layer.fontFamily]).map(f => <option key={f} value={f}>{f}</option>)}</select>
    <button className="h-8 px-2 inline-flex items-center rounded-lg hover:bg-void-700" aria-label="Text colour" title="Colour" onClick={() => { const i = document.createElement('input'); i.type = 'color'; i.value = layer.color; i.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'; i.oninput = () => up({ color: i.value }); i.onchange = () => { up({ color: i.value }, 'Colour'); i.remove() }; document.body.appendChild(i); i.click() }}><span className="w-4 h-4 rounded-full border border-white/30" style={{ background: layer.color }} /></button>
  </>
}
