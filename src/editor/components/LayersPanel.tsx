'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, ChevronUp, Copy, Folder, FolderPlus, Eye, EyeOff, Lock, SlidersHorizontal, Trash2, Type, Unlock, Combine, Shapes, LayoutGrid } from 'lucide-react'
import { ctx2d, drawLayerContent, layerSize } from '../engine'
import { useEditor } from '../store'
import type { Frame, Layer } from '../types'
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

function HistoryList() {
  const history = useEditor(s => s.history)
  const index = useEditor(s => s.historyIndex)
  return (
    <ol className="flex-1 min-h-[120px] overflow-y-auto px-2 pb-3" aria-label="History, oldest first">
      {history.map((h, i) => (
        <li key={i}>
          <button onClick={() => useEditor.getState().jumpTo(i)} aria-current={i === index}
            className={`w-full flex items-center gap-2.5 px-2.5 h-8 rounded-lg text-left text-[12.5px] ${focusRing} ${i === index ? 'bg-void-800 text-white' : i > index ? 'text-void-600 hover:bg-void-900' : 'text-void-300 hover:bg-void-900'}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === index ? 'bg-[#8b7cff]' : i > index ? 'bg-void-700' : 'bg-void-500'}`} />{h.label}
          </button>
        </li>
      ))}
      <li className="px-2.5 pt-2 text-[12px] text-void-500 leading-relaxed">Click any step to go back to it. The last 40 steps are kept.</li>
    </ol>
  )
}

interface RowCtx {
  layers: Layer[]; activeId: string | null; selectedIds: string[]; groups: any[]; editingMask: boolean
  renaming: string | null; setRenaming: (v: string | null) => void
  dragId: string | null; setDragId: (v: string | null) => void; over: number | null; setOver: (v: number | null) => void
}

function LayerRows({ list, ctx }: { list: Layer[]; ctx: RowCtx }) {
  const s = useEditor.getState()
  const { layers, activeId, selectedIds, groups, editingMask, renaming, setRenaming, dragId, setDragId, over, setOver } = ctx
  return (
    <>
      {[...list].reverse().map((l) => {
        const i = layers.indexOf(l)
        const on = selectedIds.includes(l.id)
        const g = l.groupId ? groups.find(x => x.id === l.groupId) : undefined
        const header = g && list[list.indexOf(l) - 1]?.groupId !== g.id
        const allOn = !!g && layers.filter(x => x.groupId === g.id).every(x => selectedIds.includes(x.id))
        return (
          <Fragment key={l.id}>
          {header && g && (
            <li className={`flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-lg ${allOn ? 'bg-void-800/70' : 'hover:bg-void-900'}`} onClick={() => s.selectGroup(g.id)}>
              <button aria-label={g.visible ? 'Hide group' : 'Show group'} onClick={e => { e.stopPropagation(); s.updateGroup(g.id, { visible: !g.visible }, 'Toggle group') }} className={`w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-md ${focusRing} ${g.visible ? 'text-void-300' : 'text-void-600'} hover:text-white`}>{g.visible ? <Eye size={15} /> : <EyeOff size={15} />}</button>
              <button aria-label={g.collapsed ? 'Expand group' : 'Collapse group'} onClick={e => { e.stopPropagation(); s.updateGroup(g.id, { collapsed: !g.collapsed }) }} className={`w-5 h-7 shrink-0 inline-flex items-center justify-center text-void-400 hover:text-white rounded ${focusRing}`}>{g.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button>
              <Folder size={15} className="shrink-0 text-[#b9afff]" />
              {renaming === g.id ? (
                <input autoFocus defaultValue={g.name} onClick={e => e.stopPropagation()} onBlur={e => { s.updateGroup(g.id, { name: e.target.value.trim() || g.name }); setRenaming(null) }} onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur() }} className={`min-w-0 flex-1 h-7 px-1.5 rounded bg-void-950 border border-void-700 text-[12.5px] ${focusRing}`} />
              ) : <span onDoubleClick={() => setRenaming(g.id)} title="Double-click to rename" className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-void-100">{g.name}</span>}
              <span className="text-[11px] tabular-nums text-void-500 pr-1">{g.opacity < 1 ? `${Math.round(g.opacity * 100)}%` : ''}</span>
            </li>
          )}
          {!(g && g.collapsed) && (
          <li role="option" aria-selected={on} style={g ? { marginLeft: 18 } : undefined} draggable={renaming !== l.id}
            onDragStart={() => setDragId(l.id)} onDragEnd={() => { setDragId(null); setOver(null) }}
            onDragOver={e => { e.preventDefault(); setOver(i) }}
            onDrop={e => { e.preventDefault(); if (dragId && dragId !== l.id) s.moveLayer(dragId, i); setOver(null) }}
            onClick={e => (e.shiftKey || e.metaKey || e.ctrlKey ? s.toggleSelect(l.id) : s.setActive(l.id))}
            className={`group flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-lg cursor-default border ${over === i && dragId ? 'border-[#8b7cff]' : 'border-transparent'} ${on ? 'bg-void-800' : 'hover:bg-void-900'}`}>
            <button aria-label={l.visible ? 'Hide layer' : 'Show layer'} onClick={e => { e.stopPropagation(); s.updateLayer(l.id, { visible: !l.visible }, l.visible ? 'Hide layer' : 'Show layer') }}
              className={`w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-md ${focusRing} ${l.visible ? 'text-void-300' : 'text-void-600'} hover:text-white`}>
              {l.visible ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            <span className={`shrink-0 rounded-md p-[2px] ${l.id === activeId && !editingMask ? 'ring-2 ring-[#8b7cff]' : ''}`}>
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
          )}
          </Fragment>
        )
      })}
    </>
  )
}

export function LayersPanel() {
  const [tab, setTab] = useState<'layers' | 'history'>('layers')
  const layers = useEditor(s => s.layers)
  const doc = useEditor(s => s.doc)
  const activeFrameId = useEditor(s => s.activeFrameId)
  const activeId = useEditor(s => s.activeId)
  const selectedIds = useEditor(s => s.selectedIds)
  const groups = useEditor(s => s.groups)
  const editingMask = useEditor(s => s.editingMask)
  const s = useEditor.getState()
  const [renaming, setRenaming] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const active = layers.find(l => l.id === activeId)
  const idx = layers.findIndex(l => l.id === activeId)

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-3" role="tablist">
          {(['layers', 'history'] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`text-[12px] font-semibold capitalize rounded ${focusRing} ${tab === t ? 'text-void-100' : 'text-void-500 hover:text-void-200'}`}>{t}</button>)}
        </div>
        <div className={`flex items-center -mr-1.5 ${tab === 'history' ? 'invisible' : ''}`}>
          <IconButton label="Bring forward" shortcut="]" disabled={!active || idx === layers.length - 1} onClick={() => active && s.nudgeOrder(active.id, 1)} className="!h-7 !w-7"><ChevronUp size={15} /></IconButton>
          <IconButton label="Send backward" shortcut="[" disabled={!active || idx <= 0} onClick={() => active && s.nudgeOrder(active.id, -1)} className="!h-7 !w-7"><ChevronDown size={15} /></IconButton>
          <IconButton label="Group selected layers" shortcut="Ctrl+G" disabled={selectedIds.length < 2} onClick={() => s.groupSelected()} className="!h-7 !w-7"><FolderPlus size={14} /></IconButton>
          <IconButton label="Merge with the layer below" disabled={!active || idx <= 0} onClick={() => active && s.mergeDown(active.id)} className="!h-7 !w-7"><Combine size={14} /></IconButton>
          <IconButton label="Duplicate" shortcut="Ctrl+J" disabled={!active} onClick={() => active && s.duplicateLayer(active.id)} className="!h-7 !w-7"><Copy size={14} /></IconButton>
          <IconButton label="Delete layer" shortcut="Delete" disabled={!active} onClick={() => s.removeSelected()} className="!h-7 !w-7"><Trash2 size={14} /></IconButton>
        </div>
      </div>

      {tab === 'history' ? <HistoryList /> : (
      <ul className="flex-1 min-h-[120px] overflow-y-auto px-2 pb-3" role="listbox" aria-label="Layers">
        {layers.length === 0 && !doc?.frames?.length && <li className="px-3 py-6 text-[12.5px] leading-relaxed text-void-500">Nothing here yet. Use Add above, drop in a photo, or paste an image. Shift-click layers to select several.</li>}
        {doc?.frames?.length ? (
          [...doc.frames].reverse().map((f: Frame) => {
            const fl = layers.filter(l => l.frameId === f.id)
            const isCol = collapsed.has(f.id)
            const activeB = f.id === activeFrameId
            return (
              <Fragment key={f.id}>
                <li className={`group flex items-center gap-1.5 pl-1 pr-1.5 py-1.5 mt-0.5 rounded-lg ${activeB ? 'bg-[#8b7cff]/15' : 'hover:bg-void-900'}`} onClick={() => s.setActiveFrame(f.id)}>
                  <button aria-label={isCol ? 'Expand board' : 'Collapse board'} onClick={e => { e.stopPropagation(); setCollapsed(c => { const n = new Set(c); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n }) }} className={`w-5 h-7 shrink-0 inline-flex items-center justify-center text-void-400 hover:text-white rounded ${focusRing}`}>{isCol ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button>
                  <LayoutGrid size={15} className={`shrink-0 ${activeB ? 'text-[#b9afff]' : 'text-void-400'}`} />
                  {renaming === f.id ? (
                    <input autoFocus defaultValue={f.name} onClick={e => e.stopPropagation()} onBlur={e => { s.renameFrame(f.id, e.target.value.trim() || f.name); setRenaming(null) }} onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur() }} className={`min-w-0 flex-1 h-7 px-1.5 rounded bg-void-950 border border-void-700 text-[12.5px] ${focusRing}`} />
                  ) : <span onDoubleClick={() => setRenaming(f.id)} title="Double-click to rename" className={`min-w-0 flex-1 truncate text-[12.5px] font-semibold ${activeB ? 'text-white' : 'text-void-200'}`}>{f.name}</span>}
                  <button aria-label="Duplicate board" title="Duplicate board" onClick={e => { e.stopPropagation(); s.duplicateFrame(f.id) }} className={`w-6 h-6 shrink-0 inline-flex items-center justify-center rounded text-void-500 opacity-0 group-hover:opacity-100 hover:text-white ${focusRing}`}><Copy size={12} /></button>
                  <span className="text-[10.5px] tabular-nums text-void-500 pr-0.5">{f.width}×{f.height}</span>
                </li>
                {!isCol && (fl.length ? <LayerRows list={fl} ctx={{ layers, activeId, selectedIds, groups, editingMask, renaming, setRenaming, dragId, setDragId, over, setOver }} /> : <li className="pl-8 py-1.5 text-[12px] text-void-600">Empty board</li>)}
              </Fragment>
            )
          })
        ) : (
          <LayerRows list={layers} ctx={{ layers, activeId, selectedIds, groups, editingMask, renaming, setRenaming, dragId, setDragId, over, setOver }} />
        )}
      </ul>
      )}
    </div>
  )
}
