'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Lock, SlidersHorizontal, Trash2, Type, Unlock, Combine, Shapes } from 'lucide-react'
import { ctx2d, drawLayerContent, layerSize } from '../engine'
import { useEditor } from '../store'
import type { Layer } from '../types'
import { IconButton, focusRing } from './ui'

function Thumb({ layer, mask }: { layer: Layer; mask?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const x = ctx2d(c); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, 36, 36)
    if (mask && layer.mask) {
      x.fillStyle = '#000'; x.fillRect(0, 0, 36, 36)
      const t = document.createElement('canvas'); t.width = 36; t.height = 36
      const tx = t.getContext('2d')!; tx.fillStyle = '#fff'; tx.fillRect(0, 0, 36, 36)
      tx.globalCompositeOperation = 'destination-in'; tx.drawImage(layer.mask, 0, 0, 36, 36)
      x.drawImage(t, 0, 0); return
    }
    if (layer.type === 'adjustment') return
    const { w, h } = layerSize(layer)
    const k = Math.min(36 / w, 36 / h)
    x.translate((36 - w * k) / 2, (36 - h * k) / 2); x.scale(k, k)
    drawLayerContent(x, layer)
  }, [layer, mask])
  return <canvas ref={ref} width={36} height={36} className="w-9 h-9 rounded-[5px]" style={{ background: mask ? '#000' : 'repeating-conic-gradient(#d6d6dc 0% 25%, #fff 0% 50%) 50% / 10px 10px' }} />
}

export function LayersPanel() {
  const layers = useEditor(s => s.layers)
  const activeId = useEditor(s => s.activeId)
  const editingMask = useEditor(s => s.editingMask)
  const s = useEditor.getState()
  const [renaming, setRenaming] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const active = layers.find(l => l.id === activeId)
  const idx = layers.findIndex(l => l.id === activeId)

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h3 className="text-[12px] font-semibold text-void-200">Layers</h3>
        <div className="flex items-center -mr-1.5">
          <IconButton label="Bring forward" shortcut="]" disabled={!active || idx === layers.length - 1} onClick={() => active && s.nudgeOrder(active.id, 1)} className="!h-7 !w-7"><ChevronUp size={15} /></IconButton>
          <IconButton label="Send backward" shortcut="[" disabled={!active || idx <= 0} onClick={() => active && s.nudgeOrder(active.id, -1)} className="!h-7 !w-7"><ChevronDown size={15} /></IconButton>
          <IconButton label="Merge with the layer below" disabled={!active || idx <= 0} onClick={() => active && s.mergeDown(active.id)} className="!h-7 !w-7"><Combine size={14} /></IconButton>
          <IconButton label="Duplicate" shortcut="Ctrl+J" disabled={!active} onClick={() => active && s.duplicateLayer(active.id)} className="!h-7 !w-7"><Copy size={14} /></IconButton>
          <IconButton label="Delete layer" shortcut="Delete" disabled={!active} onClick={() => active && s.removeLayer(active.id)} className="!h-7 !w-7"><Trash2 size={14} /></IconButton>
        </div>
      </div>

      <ul className="flex-1 min-h-[120px] overflow-y-auto px-2 pb-3" role="listbox" aria-label="Layers, top first">
        {layers.length === 0 && <li className="px-3 py-6 text-[12.5px] leading-relaxed text-void-500">Nothing here yet. Use Add above, drop in a photo, or paste an image.</li>}
        {[...layers].reverse().map((l) => {
          const i = layers.indexOf(l)
          const on = l.id === activeId
          return (
            <li key={l.id} role="option" aria-selected={on} draggable={renaming !== l.id}
              onDragStart={() => setDragId(l.id)} onDragEnd={() => { setDragId(null); setOver(null) }}
              onDragOver={e => { e.preventDefault(); setOver(i) }}
              onDrop={e => { e.preventDefault(); if (dragId && dragId !== l.id) s.moveLayer(dragId, i); setOver(null) }}
              onClick={() => s.setActive(l.id)}
              className={`group flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-lg cursor-default border ${over === i && dragId ? 'border-[#8b7cff]' : 'border-transparent'} ${on ? 'bg-void-800' : 'hover:bg-void-900'}`}>
              <button aria-label={l.visible ? 'Hide layer' : 'Show layer'} onClick={e => { e.stopPropagation(); s.updateLayer(l.id, { visible: !l.visible }, l.visible ? 'Hide layer' : 'Show layer') }}
                className={`w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-md ${focusRing} ${l.visible ? 'text-void-300' : 'text-void-600'} hover:text-white`}>
                {l.visible ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <span className={`shrink-0 rounded-md p-[2px] ${on && !editingMask ? 'ring-2 ring-[#8b7cff]' : ''}`} onClick={() => { s.setActive(l.id) }}>
                {l.type === 'adjustment'
                  ? <span className="w-9 h-9 rounded-[5px] bg-void-700 flex items-center justify-center text-void-200"><SlidersHorizontal size={15} /></span>
                  : l.type === 'text' ? <span className="w-9 h-9 rounded-[5px] bg-void-700 flex items-center justify-center text-void-200"><Type size={15} /></span>
                  : l.type === 'shape' ? <span className="w-9 h-9 rounded-[5px] bg-void-700 flex items-center justify-center" style={{ color: l.fill ?? l.stroke ?? '#fff' }}><Shapes size={16} /></span>
                  : <Thumb layer={l} />}
              </span>
              {l.mask && (
                <span title="Mask: click to paint on it" className={`shrink-0 rounded-md p-[2px] cursor-pointer ${on && editingMask ? 'ring-2 ring-[#8b7cff]' : ''} ${l.maskEnabled ? '' : 'opacity-40'}`}
                  onClick={e => { e.stopPropagation(); useEditor.setState({ activeId: l.id, editingMask: true }) }}>
                  <Thumb layer={l} mask />
                </span>
              )}
              {renaming === l.id ? (
                <input autoFocus defaultValue={l.name} onBlur={e => { s.updateLayer(l.id, { name: e.target.value.trim() || l.name }); setRenaming(null) }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur() }}
                  className={`min-w-0 flex-1 h-7 px-1.5 rounded bg-void-950 border border-void-700 text-[12.5px] ${focusRing}`} />
              ) : (
                <span onDoubleClick={() => setRenaming(l.id)} title="Double-click to rename" className={`min-w-0 flex-1 truncate text-[12.5px] ${l.visible ? 'text-void-100' : 'text-void-500'}`}>
                  {l.type === 'text' ? (l.text.split('\n')[0] || 'Text') : l.name}
                </span>
              )}
              <button aria-label={l.locked ? 'Unlock layer' : 'Lock layer'} onClick={e => { e.stopPropagation(); s.updateLayer(l.id, { locked: !l.locked }) }}
                className={`w-6 h-6 shrink-0 inline-flex items-center justify-center rounded ${focusRing} ${l.locked ? 'text-void-200' : 'text-void-700 opacity-0 group-hover:opacity-100 focus:opacity-100'} hover:text-white`}>
                {l.locked ? <Lock size={13} /> : <Unlock size={13} />}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
