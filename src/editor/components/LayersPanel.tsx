'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, CornerDownRight, Eye, EyeOff, Folder, FolderPlus, FunctionSquare, LayoutGrid, Link, Lock, LockKeyhole, Move, Paintbrush, Plus, Search, Shapes, SlidersHorizontal, SquareDashedBottom, Trash2, Type, Unlock, X } from 'lucide-react'
import { ctx2d, drawLayerContent, layerSize } from '../engine'
import * as ops from '../ops'
import { ADJUSTMENT_LABELS, groupChain, groupDepth, inGroup, useEditor } from '../store'
import { hasActiveStyles } from '../styles'
import { BLEND_MODES, type AdjustmentKind, type Frame, type Group, type Layer } from '../types'
import { openModal } from '../actions'
import { Floating } from './ColorPicker'
import { IconButton, focusRing } from './ui'

const LABELS: Record<string, string> = { red: '#f25f5c', orange: '#f7a24a', yellow: '#f1d24a', green: '#51c47a', blue: '#4f8ff7', violet: '#9b7cff', gray: '#8a8a95' }

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
  return <canvas ref={ref} width={36} height={36} className="w-8 h-8 rounded-[4px]" style={{ background: mask ? '#000' : 'repeating-conic-gradient(#d6d6dc 0% 25%, #fff 0% 50%) 50% / 8px 8px' }} />
}

type Ctx = {
  layers: Layer[]; activeId: string | null; selectedIds: string[]; groups: Group[]; editingMask: boolean
  renaming: string | null; setRenaming: (v: string | null) => void
  dragId: string | null; setDragId: (v: string | null) => void; over: number | null; setOver: (v: number | null) => void
  filter: (l: Layer) => boolean; menu: (e: React.MouseEvent, id: string) => void
  /** A group or board being dragged, so the bin can take it. Layers use dragId. */
  setCarry: (v: Carry | null) => void
}

type Carry = { kind: 'group' | 'board'; id: string }

/** Row buttons that show on hover or keyboard focus, and always on touch screens where there is no hover. */
const rowAct = `w-6 h-7 shrink-0 inline-flex items-center justify-center rounded ${focusRing} text-void-400 hover:text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100`

/** Deletes one layer, leaving the rest of the selection alone. */
function deleteLayer(id: string) {
  useEditor.setState({ selectedIds: [id], activeId: id })
  useEditor.getState().removeSelected()
}

function LayerRow({ l, ctx, depth }: { l: Layer; ctx: Ctx; depth: number }) {
  const s = useEditor.getState()
  const { layers, activeId, selectedIds, editingMask, renaming, setRenaming, dragId, setDragId, over, setOver } = ctx
  const vmEdit = useEditor(st => st.vmaskEditId)
  const i = layers.indexOf(l)
  const on = selectedIds.includes(l.id)
  const fx = hasActiveStyles(l)
  return (
    <li role="option" aria-selected={on} style={{ paddingLeft: depth * 14 + (l.clipId ? 14 : 0) }} draggable={renaming !== l.id}
      onDragStart={e => { setDragId(l.id); e.dataTransfer.setData('text/vc-layer', l.id); e.dataTransfer.effectAllowed = 'move' }} onDragEnd={() => { setDragId(null); setOver(null) }}
      onDragOver={e => { if (!dragId) return; e.preventDefault(); setOver(i) }}
      onDrop={e => { e.preventDefault(); if (dragId && dragId !== l.id) s.moveLayer(dragId, i); setOver(null) }}
      onClick={e => {
        if ((e.ctrlKey || e.metaKey) && (e.target as HTMLElement).closest('[data-thumb]')) { ops.selectLayerPixels(l.id, e.shiftKey ? 'add' : e.altKey ? 'sub' : 'new'); return }
        if (e.shiftKey && activeId) {
          // Shift selects the range between the active layer and this one.
          const a = layers.findIndex(x => x.id === activeId), b = i
          const ids = layers.slice(Math.min(a, b), Math.max(a, b) + 1).filter(ctx.filter).map(x => x.id)
          useEditor.setState({ selectedIds: ids, activeId: l.id }); return
        }
        if (e.metaKey || e.ctrlKey) s.toggleSelect(l.id); else s.setActive(l.id)
      }}
      onContextMenu={e => ctx.menu(e, l.id)}
      className={`vc-row group relative flex items-center gap-1.5 pr-1.5 py-[3px] rounded-md cursor-default border ${over === i && dragId ? 'border-accent' : 'border-transparent'} ${on ? 'bg-accent/[0.18]' : 'hover:bg-white/[0.04]'}`}>
      {l.label && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full" style={{ background: LABELS[l.label] }} />}
      <button aria-label={l.visible ? 'Hide layer' : 'Show layer'} onClick={e => { e.stopPropagation(); s.updateLayer(l.id, { visible: !l.visible }, l.visible ? 'Hide layer' : 'Show layer') }}
        onPointerDown={e => { if (e.altKey) { e.preventDefault(); e.stopPropagation(); const solo = layers.every(x => x.id === l.id || !x.visible); s.updateLayers(layers.map(x => ({ id: x.id, patch: { visible: solo ? true : x.id === l.id } }))); s.commit('Show only this layer') } }}
        title="Alt-click to show only this layer"
        className={`w-6 h-7 ml-0.5 shrink-0 inline-flex items-center justify-center rounded ${focusRing} ${l.visible ? 'text-void-300' : 'text-void-600'} hover:text-white`}>
        {l.visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
      {l.clipId && <CornerDownRight size={12} className="shrink-0 -ml-1 text-void-500" aria-label="Clipped to layer below" />}
      <span data-thumb title="Ctrl-click to select this layer's pixels" className={`shrink-0 rounded-[5px] p-[2px] ${l.id === activeId && !editingMask ? 'ring-1.5 ring-2 ring-accent' : ''}`}>
        {l.type === 'adjustment'
          ? <span className="w-8 h-8 rounded-[4px] bg-void-700 flex items-center justify-center text-void-200"><SlidersHorizontal size={14} /></span>
          : l.type === 'text' ? <span className="w-8 h-8 rounded-[4px] bg-void-700 flex items-center justify-center text-void-100"><Type size={14} /></span>
          : l.type === 'shape' ? <span className="w-8 h-8 rounded-[4px] bg-void-700 flex items-center justify-center" style={{ color: l.fill ?? l.stroke ?? '#fff' }}><Shapes size={15} /></span>
          : <Thumb layer={l} />}
      </span>
      {l.mask && (
        <span title="Mask. Click to paint on it, Alt-click to view it, Shift-click to turn it off." className={`shrink-0 rounded-[5px] p-[2px] cursor-pointer ${on && editingMask ? 'ring-2 ring-accent' : ''} ${l.maskEnabled ? '' : 'opacity-40'}`}
          onClick={e => { e.stopPropagation(); if (e.shiftKey) { s.updateLayer(l.id, { maskEnabled: !l.maskEnabled }, 'Toggle mask'); return } if (e.altKey) { const st = useEditor.getState(); useEditor.setState({ viewChannel: st.viewChannel === 'mask:' + l.id ? 'rgb' : 'mask:' + l.id, docRev: st.docRev + 1 }); return } useEditor.setState({ activeId: l.id, selectedIds: [l.id], editingMask: true }) }}>
          <Thumb layer={l} mask />
        </span>
      )}
      {l.vmask && (
        <span title="Vector mask. Click to edit its points, Shift-click to turn it off." onClick={e => { e.stopPropagation(); if (e.shiftKey) { s.updateLayer(l.id, { vmask: { ...l.vmask!, enabled: !l.vmask!.enabled } }, 'Toggle vector mask'); return } useEditor.setState({ activeId: l.id, selectedIds: [l.id] }); ops.editVectorMask(l.id) }}
          className={`shrink-0 w-8 h-8 rounded-[4px] bg-void-900 border border-void-700 cursor-pointer ${l.vmask.enabled ? '' : 'opacity-40'} ${vmEdit === l.id ? 'ring-2 ring-accent' : ''}`}>
          <VmaskThumb layer={l} />
        </span>
      )}
      {renaming === l.id ? (
        <input autoFocus defaultValue={l.name} onClick={e => e.stopPropagation()} onBlur={e => { s.updateLayer(l.id, { name: e.target.value.trim() || l.name }, 'Rename layer'); setRenaming(null) }}
          onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur() }}
          className={`min-w-0 flex-1 h-6 px-1.5 rounded bg-surface-sunken border border-white/[0.08] text-[12.5px] ${focusRing}`} />
      ) : (
        <span onDoubleClick={() => setRenaming(l.id)} title="Double-click to rename" className={`min-w-0 flex-1 truncate text-[12.5px] ${l.visible ? 'text-void-100' : 'text-void-500'}`}>
          {l.type === 'text' && l.name === 'Text' ? (l.text.split('\n')[0] || 'Text') : l.name}
        </span>
      )}
      {l.linkId && <Link size={12} className="shrink-0 text-void-400" aria-label="Linked" />}
      {fx && <button onClick={e => { e.stopPropagation(); s.setActive(l.id); openModal('layerStyle') }} className="shrink-0 text-[10.5px] italic font-semibold text-accent-light px-1 rounded hover:bg-white/10" title="Layer style">fx</button>}
      {(l.locked || l.lockPosition || l.lockPixels || l.lockAlpha) ? (
        <button aria-label="Unlock layer" title="Unlock" onClick={e => { e.stopPropagation(); s.updateLayer(l.id, { locked: false, lockPosition: false, lockPixels: false, lockAlpha: false }, 'Unlock layer') }} className={`w-6 h-7 shrink-0 inline-flex items-center justify-center rounded ${focusRing} text-void-300 hover:text-white`}>
          {l.locked ? <Lock size={12} /> : <LockKeyhole size={12} className="opacity-70" />}
        </button>
      ) : (
        <button aria-label="Lock layer" title="Lock" onClick={e => { e.stopPropagation(); s.updateLayer(l.id, { locked: true }, 'Lock layer') }} className={rowAct}><Unlock size={12} /></button>
      )}
      <button aria-label="Delete layer" title="Delete" onClick={e => { e.stopPropagation(); deleteLayer(l.id) }} className={`${rowAct} hover:!text-rose-400`}><Trash2 size={12} /></button>
    </li>
  )
}

function GroupRow({ g, ctx, depth }: { g: Group; ctx: Ctx; depth: number }) {
  const s = useEditor.getState()
  const members = ctx.layers.filter(l => inGroup(l, g.id, ctx.groups))
  const allOn = members.length > 0 && members.every(x => ctx.selectedIds.includes(x.id))
  const locked = members.length > 0 && members.every(x => x.locked)
  return (
    <li className={`group flex items-center gap-1.5 pr-1.5 py-[3px] rounded-md ${allOn ? 'bg-accent/[0.14]' : 'hover:bg-white/[0.04]'}`} style={{ paddingLeft: depth * 14 }} onClick={() => s.selectGroup(g.id)}
      draggable={ctx.renaming !== g.id} onDragStart={e => { ctx.setCarry({ kind: 'group', id: g.id }); e.dataTransfer.setData('text/vc-group', g.id); e.dataTransfer.effectAllowed = 'move' }} onDragEnd={() => ctx.setCarry(null)}
      onContextMenu={e => { const first = members[members.length - 1]; if (first) { s.selectGroup(g.id); ctx.menu(e, first.id) } }}>
      <button aria-label={g.visible ? 'Hide group' : 'Show group'} onClick={e => { e.stopPropagation(); s.updateGroup(g.id, { visible: !g.visible }, 'Toggle group') }} className={`w-6 h-7 ml-0.5 shrink-0 inline-flex items-center justify-center rounded ${focusRing} ${g.visible ? 'text-void-300' : 'text-void-600'} hover:text-white`}>{g.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
      <button aria-label={g.collapsed ? 'Expand group' : 'Collapse group'} onClick={e => { e.stopPropagation(); s.updateGroup(g.id, { collapsed: !g.collapsed }) }} className={`w-4 h-7 shrink-0 inline-flex items-center justify-center text-void-400 hover:text-white rounded ${focusRing}`}>{g.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}</button>
      <Folder size={15} className="shrink-0 text-accent-light" />
      {ctx.renaming === g.id ? (
        <input autoFocus defaultValue={g.name} onClick={e => e.stopPropagation()} onBlur={e => { s.updateGroup(g.id, { name: e.target.value.trim() || g.name }, 'Rename group'); ctx.setRenaming(null) }} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur() }} className={`min-w-0 flex-1 h-6 px-1.5 rounded bg-surface-sunken border border-white/[0.08] text-[12.5px] ${focusRing}`} />
      ) : <span onDoubleClick={() => ctx.setRenaming(g.id)} title="Double-click to rename" className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-void-100">{g.name}</span>}
      <span className="text-[10.5px] tabular-nums text-void-500 pr-1">{g.blend && g.blend !== 'pass' ? BLEND_MODES.find(b => b.id === g.blend)?.label + ' ' : ''}{g.opacity < 1 ? `${Math.round(g.opacity * 100)}%` : ''}</span>
      <button aria-label={locked ? 'Unlock group' : 'Lock group'} title={locked ? 'Unlock everything in this group' : 'Lock everything in this group'} onClick={e => { e.stopPropagation(); s.setGroupLocked(g.id, !locked) }}
        className={locked ? `w-6 h-7 shrink-0 inline-flex items-center justify-center rounded ${focusRing} text-void-300 hover:text-white` : rowAct}>
        {locked ? <Lock size={12} /> : <Unlock size={12} />}
      </button>
      <button aria-label="Delete group" title="Delete the group and its layers" onClick={e => { e.stopPropagation(); s.removeGroup(g.id) }} className={`${rowAct} hover:!text-rose-400`}><Trash2 size={12} /></button>
    </li>
  )
}

/** Rows top first. Group headers appear above the topmost member of each group, at every nesting level. */
function Rows({ list, ctx }: { list: Layer[]; ctx: Ctx }) {
  const out: React.ReactNode[] = []
  const rev = [...list].reverse()
  const opened = new Set<string>()
  for (let k = 0; k < rev.length; k++) {
    const l = rev[k]
    if (!ctx.filter(l)) continue
    const chain = groupChain(l.groupId, ctx.groups).reverse() // outermost first
    let hidden = false
    for (const gid of chain) {
      const g = ctx.groups.find(x => x.id === gid); if (!g) continue
      if (!opened.has(gid)) { opened.add(gid); if (!hidden) out.push(<GroupRow key={'g' + gid} g={g} ctx={ctx} depth={groupDepth(g.parentId, ctx.groups)} />) }
      if (g.collapsed) hidden = true
    }
    if (!hidden) out.push(<LayerRow key={l.id} l={l} ctx={ctx} depth={chain.length} />)
  }
  return <>{out}</>
}

const LOCKS: { key: 'lockAlpha' | 'lockPixels' | 'lockPosition' | 'locked'; label: string; icon: typeof Lock }[] = [
  { key: 'lockAlpha', label: 'Lock transparent pixels (paint only where there is already colour)', icon: SquareDashedBottom },
  { key: 'lockPixels', label: 'Lock image pixels (no painting)', icon: Paintbrush },
  { key: 'lockPosition', label: 'Lock position (no moving)', icon: Move },
  { key: 'locked', label: 'Lock all', icon: Lock },
]

function ContextMenu({ at, id, onClose }: { at: DOMRect; id: string; onClose: () => void }) {
  const s = useEditor.getState()
  const l = s.layers.find(x => x.id === id)
  if (!l) return null
  const item = (label: string, run: () => void, disabled = false) => <button disabled={disabled} onClick={() => { onClose(); run() }} className="w-full text-left px-3 h-8 text-[12.5px] text-void-100 hover:bg-accent hover:text-white disabled:text-void-600 disabled:hover:bg-transparent">{label}</button>
  const sep = <div className="my-1 mx-2 h-px bg-white/[0.07]" />
  return (
    <Floating anchor={at} side="right" onClose={onClose} label="Layer actions">
      <div className="w-56 py-1.5" role="menu">
        {item('Blending options…', () => openModal('layerStyle'), l.type === 'adjustment')}
        {item('Duplicate layer', () => s.duplicateLayer(id))}
        {item('Delete layer', () => s.removeSelected())}
        {item('Rename', () => window.dispatchEvent(new CustomEvent('vc:rename', { detail: id })))}
        {sep}
        {item(l.clipId ? 'Release clipping mask' : 'Create clipping mask', () => (l.clipId ? s.releaseClippingMask(id) : s.createClippingMask(id)), !l.clipId && !s.canClip(id))}
        {item(l.mask ? 'Delete mask' : 'Add mask', () => (l.mask ? s.removeMask(id) : s.addMask(id, !!s.selection)))}
        {item(l.vmask ? 'Delete vector mask' : 'Add vector mask', () => { s.setActive(id); l.vmask ? ops.deleteVectorMask() : ops.addVectorMask(false) }, l.type === 'adjustment')}
        {item('Select layer pixels', () => ops.selectLayerPixels(id), l.type === 'adjustment')}
        {sep}
        {item('Group layers', () => s.groupSelected())}
        {item('Link layers', () => ops.linkSelected())}
        {item('Copy layer style', ops.copyStyle, !l.styles)}
        {item('Paste layer style', ops.pasteStyle)}
        {item('Clear layer style', ops.clearStyle, !l.styles)}
        {sep}
        {item('Rasterize layer', () => ops.rasterizeLayer(id), l.type !== 'text' && l.type !== 'shape')}
        {item('Merge down', () => s.mergeDown(id))}
        {item('Merge visible', ops.mergeVisible)}
        {item('Flatten image', ops.flatten)}
        {sep}
        <div className="flex items-center gap-1.5 px-3 py-1.5">
          <button aria-label="No colour label" onClick={() => { onClose(); s.updateLayer(id, { label: null }, 'Colour label') }} className="w-4 h-4 rounded-full border border-white/30 flex items-center justify-center"><X size={9} /></button>
          {Object.entries(LABELS).map(([k, c]) => <button key={k} aria-label={`${k} label`} onClick={() => { onClose(); s.updateLayer(id, { label: k }, 'Colour label') }} className="w-4 h-4 rounded-full" style={{ background: c }} />)}
        </div>
      </div>
    </Floating>
  )
}

function AddAdjustmentMenu({ at, onClose }: { at: DOMRect; onClose: () => void }) {
  const kinds = Object.keys(ADJUSTMENT_LABELS).filter(k => k !== 'voidEffect' && k !== 'lut' && k !== 'colorMatch') as AdjustmentKind[]
  return (
    <Floating anchor={at} side="left" onClose={onClose} label="New adjustment layer">
      <div className="w-56 py-1.5 max-h-[70vh] overflow-y-auto">
        {kinds.map(k => <button key={k} onClick={() => { onClose(); useEditor.getState().addAdjustment(k) }} className="w-full text-left px-3 h-8 text-[12.5px] text-void-100 hover:bg-accent hover:text-white">{ADJUSTMENT_LABELS[k]}</button>)}
        <div className="my-1 mx-2 h-px bg-white/[0.07]" />
        <button onClick={() => { onClose(); openModal('looks') }} className="w-full text-left px-3 h-8 text-[12.5px] text-void-100 hover:bg-accent hover:text-white">Colour match from a saved look…</button>
        <button onClick={() => { onClose(); openModal('filters') }} className="w-full text-left px-3 h-8 text-[12.5px] text-void-100 hover:bg-accent hover:text-white">Filter gallery…</button>
      </div>
    </Floating>
  )
}

export function LayersPanel() {
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
  const [carry, setCarry] = useState<Carry | null>(null)
  const [binOver, setBinOver] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'all' | Layer['type']>('all')
  const [searching, setSearching] = useState(false)
  const [menu, setMenu] = useState<{ at: DOMRect; id: string } | null>(null)
  const [adj, setAdj] = useState<DOMRect | null>(null)
  const active = layers.find(l => l.id === activeId)
  const grp = active?.groupId ? groups.find(g => g.id === active.groupId) : null
  useEffect(() => { const h = (e: Event) => setRenaming((e as CustomEvent).detail); window.addEventListener('vc:rename', h); return () => window.removeEventListener('vc:rename', h) }, [])

  const filter = (l: Layer) => (kind === 'all' || l.type === kind) && (!q || (l.type === 'text' ? l.text + ' ' + l.name : l.name).toLowerCase().includes(q.toLowerCase()))
  const ctx: Ctx = { layers, activeId, selectedIds, groups, editingMask, renaming, setRenaming, dragId, setDragId, over, setOver, filter, setCarry, menu: (e, id) => { e.preventDefault(); if (!selectedIds.includes(id)) s.setActive(id); setMenu({ at: new DOMRect(e.clientX, e.clientY, 0, 0), id }) } }
  const [head, setHead] = useState(!!active && (active.opacity < 1 || active.blend !== 'source-over' || (active.fillOpacity ?? 1) < 1 || !!(active as any).locked || !!(active as any).lockPixels || !!(active as any).lockPosition || !!(active as any).lockAlpha))
  const lockOn = (k: typeof LOCKS[number]['key']) => !!active && !!(active as any)[k]
  const lockDisabled = !active || active.type === 'adjustment'

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Header: blend mode, opacity, locks, fill. The same controls and order as Photoshop and Photopea.
          Folded away until something is set, so a simple design shows the list and nothing else. */}
      <button onClick={() => setHead(v => !v)} aria-expanded={head} className={`mx-2.5 mt-1.5 h-6 inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-void-500 hover:text-white rounded ${focusRing}`}>
        <ChevronDown size={12} className={head ? '' : '-rotate-90'} />Blend, opacity and locks
      </button>
      {head && <div className="px-2.5 pt-1 pb-1.5 space-y-1.5 border-b border-white/[0.05]">
        <div className="flex items-center gap-1.5">
          <select aria-label="Blend mode" disabled={!active && !grp} value={active?.blend ?? 'source-over'} onChange={e => { const ids = selectedIds.length ? selectedIds : active ? [active.id] : []; s.updateLayers(ids.map(id => ({ id, patch: { blend: e.target.value as any } }))); s.commit('Blend mode') }}
            className={`flex-1 min-w-0 h-7 px-1.5 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] disabled:opacity-40 ${focusRing}`}>
            {BLEND_MODES.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
          <label className="flex items-center gap-1 text-[11.5px] text-void-400">Opacity
            <input aria-label="Opacity" type="number" min={0} max={100} disabled={!active} value={active ? Math.round(active.opacity * 100) : 100}
              onChange={e => { if (!active) return; const v = Math.max(0, Math.min(100, Number(e.target.value))) / 100; s.updateLayers((selectedIds.length ? selectedIds : [active.id]).map(id => ({ id, patch: { opacity: v } }))) }} onBlur={() => s.commit('Opacity')}
              className={`w-[52px] h-7 px-1.5 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] tabular-nums disabled:opacity-40 ${focusRing}`} />
          </label>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11.5px] text-void-500 mr-0.5">Lock</span>
          {LOCKS.map(k => (
            <IconButton key={k.key} label={k.label} active={lockOn(k.key)} disabled={lockDisabled} onClick={() => active && s.updateLayer(active.id, { [k.key]: !lockOn(k.key) } as any, 'Lock')} className="!h-6 !w-6 !rounded"><k.icon size={12} /></IconButton>
          ))}
          <label className="ml-auto flex items-center gap-1 text-[11.5px] text-void-400" title="Fill fades the layer's own pixels but keeps its styles">Fill
            <input aria-label="Fill" type="number" min={0} max={100} disabled={!active || active.type === 'adjustment'} value={active ? Math.round((active.fillOpacity ?? 1) * 100) : 100}
              onChange={e => { if (!active) return; s.updateLayer(active.id, { fillOpacity: Math.max(0, Math.min(100, Number(e.target.value))) / 100 }) }} onBlur={() => s.commit('Fill opacity')}
              className={`w-[52px] h-7 px-1.5 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] tabular-nums disabled:opacity-40 ${focusRing}`} />
          </label>
        </div>
        {grp && (
          <div className="flex items-center gap-1.5 text-[11.5px] text-void-400">
            <Folder size={12} className="text-accent-light" /><span className="truncate flex-1">{grp.name}</span>
            <select aria-label="Group blend" value={grp.blend ?? 'pass'} onChange={e => s.updateGroup(grp.id, { blend: e.target.value as any }, 'Group blend')} className="h-6 px-1 rounded bg-surface-sunken border border-white/[0.06] text-[11.5px]">
              <option value="pass">Pass through</option>{BLEND_MODES.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <input aria-label="Group opacity" type="number" min={0} max={100} value={Math.round(grp.opacity * 100)} onChange={e => s.updateGroup(grp.id, { opacity: Math.max(0, Math.min(100, Number(e.target.value))) / 100 })} onBlur={() => s.commit('Group opacity')} className="w-12 h-6 px-1 rounded bg-surface-sunken border border-white/[0.06] text-[11.5px] tabular-nums" />
          </div>
        )}
        {searching && (
          <div className="flex items-center gap-1.5">
            <select aria-label="Filter by kind" value={kind} onChange={e => setKind(e.target.value as any)} className="h-7 px-1 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px]">
              <option value="all">All</option><option value="raster">Pixels</option><option value="text">Text</option><option value="shape">Shapes</option><option value="adjustment">Adjustments</option>
            </select>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Find a layer" className={`flex-1 min-w-0 h-7 px-2 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] ${focusRing}`} />
            <button aria-label="Close layer search" onClick={() => { setSearching(false); setQ(''); setKind('all') }} className="text-void-400 hover:text-white"><X size={14} /></button>
          </div>
        )}
      </div>}

      <ul className="flex-1 min-h-[80px] overflow-y-auto px-1.5 py-1.5" role="listbox" aria-label="Layers" aria-multiselectable
        onDragOver={e => { if (dragId) e.preventDefault() }} onDrop={e => { e.preventDefault(); if (dragId && over === null) s.moveLayer(dragId, 0) }}>
        {layers.length === 0 && !doc?.frames?.length && <li className="px-3 py-6 text-[12.5px] leading-relaxed text-void-500">Nothing here yet. Use Add above, drop in a photo, or paste an image. Shift-click selects a range, Ctrl-click adds one layer.</li>}
        {doc?.frames?.length ? (
          [...doc.frames].reverse().map((f: Frame) => {
            const fl = layers.filter(l => l.frameId === f.id)
            const isCol = collapsed.has(f.id)
            const activeB = f.id === activeFrameId
            return (
              <Fragment key={f.id}>
                <li className={`group flex items-center gap-1.5 pl-1 pr-1.5 py-1.5 mt-0.5 rounded-md ${activeB ? 'bg-accent-soft' : 'hover:bg-white/[0.04]'}`} onClick={() => s.setActiveFrame(f.id)}
                  draggable={renaming !== f.id} onDragStart={e => { setCarry({ kind: 'board', id: f.id }); e.dataTransfer.setData('text/vc-board', f.id); e.dataTransfer.effectAllowed = 'move' }} onDragEnd={() => setCarry(null)}>
                  <button aria-label={isCol ? 'Expand board' : 'Collapse board'} onClick={e => { e.stopPropagation(); setCollapsed(c => { const n = new Set(c); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n }) }} className={`w-5 h-7 shrink-0 inline-flex items-center justify-center text-void-400 hover:text-white rounded ${focusRing}`}>{isCol ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button>
                  <LayoutGrid size={15} className={`shrink-0 ${activeB ? 'text-accent-light' : 'text-void-400'}`} />
                  {renaming === f.id ? (
                    <input autoFocus defaultValue={f.name} onClick={e => e.stopPropagation()} onBlur={e => { s.renameFrame(f.id, e.target.value.trim() || f.name); setRenaming(null) }} onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur() }} className={`min-w-0 flex-1 h-7 px-1.5 rounded bg-surface-sunken border border-white/[0.08] text-[12.5px] ${focusRing}`} />
                  ) : <span onDoubleClick={() => setRenaming(f.id)} title="Double-click to rename" className={`min-w-0 flex-1 truncate text-[12.5px] font-semibold ${activeB ? 'text-white' : 'text-void-200'}`}>{f.name}</span>}
                  <span className="text-[10.5px] tabular-nums text-void-500 pr-0.5">{f.width}×{f.height}</span>
                  {doc.frames!.length > 1 && <button aria-label={`Delete board ${f.name}`} title="Delete this board and its layers" onClick={e => { e.stopPropagation(); s.removeFrame(f.id) }} className={`${rowAct} hover:!text-rose-400`}><Trash2 size={12} /></button>}
                </li>
                {!isCol && (fl.length ? <Rows list={fl} ctx={ctx} /> : <li className="pl-8 py-1.5 text-[12px] text-void-600">Empty board</li>)}
              </Fragment>
            )
          })
        ) : <Rows list={layers} ctx={ctx} />}
      </ul>

      {/* Footer: link, style, mask, adjustment, group, new layer, delete. */}
      <div className="flex items-center justify-between px-1.5 py-1 border-t border-white/[0.05]">
        <IconButton label="Find layers" onClick={() => setSearching(v => !v)} active={searching} className="!h-7 !w-7"><Search size={14} /></IconButton>
        <div className="flex items-center">
          <IconButton label="Link layers" disabled={!active} onClick={ops.linkSelected} className="!h-7 !w-7"><Link size={14} /></IconButton>
          <IconButton label="Layer style" disabled={!active || active.type === 'adjustment'} onClick={() => openModal('layerStyle')} className="!h-7 !w-7"><FunctionSquare size={14} /></IconButton>
          <IconButton label={active?.mask ? 'Paint on the mask' : 'Add mask'} disabled={!active} onClick={() => { if (!active) return; if (active.mask) useEditor.setState({ editingMask: true }); else s.addMask(active.id, !!s.selection) }} className="!h-7 !w-7">
            <span className="w-3.5 h-3 rounded-[2px] border border-current flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-current" /></span>
          </IconButton>
          <IconButton label="New adjustment layer" onClick={e => setAdj(e.currentTarget.getBoundingClientRect())} className="!h-7 !w-7"><SlidersHorizontal size={14} /></IconButton>
          <IconButton label="New group" shortcut="Ctrl+G" disabled={!active} onClick={() => s.groupSelected()} className="!h-7 !w-7"><FolderPlus size={14} /></IconButton>
          <IconButton label="New layer" shortcut="Ctrl+Shift+N" onClick={() => s.addBlank()} className="!h-7 !w-7"><Plus size={15} /></IconButton>
          {/* The bin also takes drops: drag a layer, a group or a board onto it to delete it. */}
          <div data-bin className={`rounded-lg transition-colors ${binOver ? 'bg-rose-500/25 ring-1 ring-rose-400' : dragId || carry ? 'outline-dashed outline-1 outline-void-500' : ''}`}
            onDragOver={e => { const t = e.dataTransfer.types; if (!(t.includes('text/vc-layer') || t.includes('text/vc-group') || t.includes('text/vc-board'))) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!binOver) setBinOver(true) }}
            onDragLeave={() => setBinOver(false)}
            onDrop={e => {
              e.preventDefault(); e.stopPropagation(); setBinOver(false)
              const layerId = e.dataTransfer.getData('text/vc-layer'), groupId = e.dataTransfer.getData('text/vc-group'), boardId = e.dataTransfer.getData('text/vc-board')
              if (layerId) { if (selectedIds.includes(layerId) && selectedIds.length > 1) s.removeSelected(); else deleteLayer(layerId) }
              else if (groupId) s.removeGroup(groupId)
              else if (boardId) s.removeFrame(boardId)
              setDragId(null); setOver(null); setCarry(null)
            }}>
            <IconButton label={dragId || carry ? 'Drop here to delete' : 'Delete layer'} shortcut={dragId || carry ? undefined : 'Delete'} disabled={!active && !dragId && !carry} onClick={() => s.removeSelected()} className={`!h-7 !w-7 ${binOver ? '!text-rose-300' : ''}`}><Trash2 size={14} /></IconButton>
          </div>
        </div>
      </div>
      {menu && <ContextMenu at={menu.at} id={menu.id} onClose={() => setMenu(null)} />}
      {adj && <AddAdjustmentMenu at={adj} onClose={() => setAdj(null)} />}
    </div>
  )
}

/** Tiny preview of a vector mask: the path, white inside. */
function VmaskThumb({ layer }: { layer: Layer }) {
  const { w, h } = layerSize(layer)
  const d = (layer.vmask?.subpaths ?? []).map(sp => sp.nodes.map((n, i) => i ? `C${sp.nodes[i - 1].outX},${sp.nodes[i - 1].outY} ${n.inX},${n.inY} ${n.x},${n.y}` : `M${n.x},${n.y}`).join(' ') + (sp.closed && sp.nodes.length > 1 ? ` C${sp.nodes[sp.nodes.length - 1].outX},${sp.nodes[sp.nodes.length - 1].outY} ${sp.nodes[0].inX},${sp.nodes[0].inY} ${sp.nodes[0].x},${sp.nodes[0].y}Z` : '')).join(' ')
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet" style={{ background: layer.vmask?.invert ? '#fff' : '#555' }}><path d={d} fill={layer.vmask?.invert ? '#555' : '#fff'} fillRule="evenodd" /></svg>
}
