'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { effects } from '@/components/EffectSelector'
import { saveDesign, saveProject } from '../io'
import { uid } from '../engine'
import { ADJUSTMENT_LABELS, useEditor } from '../store'
import type { AdjustmentKind } from '../types'
import { removeBackground } from './PropertiesPanel'
import { stageApi } from './Stage'
import { TOOLS } from './ToolRail'

interface Cmd { label: string; hint?: string; group: string; run: () => void }

/** Ctrl+K. Every action in the editor, searchable, so nobody has to hunt through panels. */
export function CommandPalette({ onClose, open }: { onClose: () => void; open: (m: 'add' | 'export') => void }) {
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const list = useRef<HTMLUListElement>(null)

  const all = useMemo<Cmd[]>(() => {
    const s = () => useEditor.getState()
    const onActive = (fn: (id: string) => void) => () => { const id = s().activeId; if (id) fn(id); else s().notify('Select a layer first.') }
    return [
      ...TOOLS.map(t => ({ label: t.label.split(':')[0], hint: t.key, group: 'Tool', run: () => s().setTool(t.id) })),
      { label: 'Add text', group: 'Add', run: () => s().addText() },
      { label: 'Add photo, shape or blank layer', group: 'Add', run: () => open('add') },
      ...(Object.keys(ADJUSTMENT_LABELS) as AdjustmentKind[]).filter(k => k !== 'voidEffect').map(k => ({ label: ADJUSTMENT_LABELS[k], group: 'Adjustment', run: () => s().addAdjustment(k) })),
      ...effects.filter(e => e.id !== 'none').map(e => ({ label: e.name, hint: e.description, group: 'Filter', run: () => s().addAdjustment('voidEffect', e.id) })),
      { label: 'Remove background', group: 'Layer', run: onActive(id => removeBackground(id)) },
      { label: 'Duplicate layer', hint: 'Ctrl+J', group: 'Layer', run: onActive(id => s().duplicateLayer(id)) },
      { label: 'Delete selected layers', hint: 'Delete', group: 'Layer', run: () => s().removeSelected() },
      { label: 'Group selected layers', hint: 'Ctrl+G', group: 'Layer', run: () => s().groupSelected() },
      { label: 'Add mask', group: 'Layer', run: onActive(id => s().addMask(id, !!s().selection)) },
      { label: 'Merge with layer below', group: 'Layer', run: onActive(id => s().mergeDown(id)) },
      { label: 'Mirror layer', group: 'Layer', run: onActive(id => s().flip(id, 'h')) },
      { label: 'Flip layer upside down', group: 'Layer', run: onActive(id => s().flip(id, 'v')) },
      { label: 'Centre on page', group: 'Layer', run: () => { s().align('hcenter'); s().align('vcenter') } },
      { label: 'Select all', hint: 'Ctrl+A', group: 'Selection', run: () => s().selectAll() },
      { label: 'Deselect', hint: 'Ctrl+D', group: 'Selection', run: () => s().setSelection(null, 'Deselect') },
      { label: 'Invert selection', hint: 'Ctrl+Shift+I', group: 'Selection', run: () => s().invertSelection() },
      { label: 'Export', hint: 'Ctrl+E', group: 'File', run: () => open('export') },
      { label: 'Resize for other formats', hint: 'Instagram, Story, YouTube and more', group: 'File', run: () => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'resize' })) },
      { label: 'Save as template', hint: 'Reuse this layout', group: 'File', run: async () => { const st = s(); if (!st.doc) return; await saveDesign({ ...st.doc, id: uid(), name: st.doc.name + ' template' }, st.layers, st.groups, st.swatches, true); st.notify('Saved as a template. Find it on the start screen under Your templates.') } },
      { label: 'Brand kit', hint: 'Colours, fonts, logos', group: 'File', run: () => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'brand' })) },
      { label: 'Keyboard shortcuts', hint: '?', group: 'Help', run: () => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'keys' })) },
      { label: 'See before (hold \\)', group: 'View', run: () => { useEditor.setState({ compare: true }); setTimeout(() => useEditor.setState({ compare: false }), 1500) } },
      { label: 'Save now', hint: 'Ctrl+S', group: 'File', run: () => saveProject().then(() => s().notify('Saved to this device.')) },
      { label: 'Fit to screen', hint: 'Ctrl+0', group: 'View', run: () => stageApi.fit() },
      { label: 'Zoom to 100%', hint: 'Ctrl+1', group: 'View', run: () => stageApi.zoomTo(1) },
      { label: 'Undo', hint: 'Ctrl+Z', group: 'Edit', run: () => s().undo() },
      { label: 'Redo', hint: 'Ctrl+Shift+Z', group: 'Edit', run: () => s().redo() },
    ]
  }, [open])

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return all.filter(c => words.every(w => (c.label + ' ' + c.group + ' ' + (c.hint ?? '')).toLowerCase().includes(w))).slice(0, 40)
  }, [q, all])
  useEffect(() => setI(0), [q])
  useEffect(() => { list.current?.children[i]?.scrollIntoView({ block: 'nearest' }) }, [i])

  const go = (c?: Cmd) => { if (!c) return; onClose(); c.run() }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/55" onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-label="Search actions" className="w-full max-w-lg rounded-2xl bg-[#17171c] border border-void-700 shadow-2xl overflow-hidden">
        <label className="flex items-center gap-3 px-4 h-13 py-3.5 border-b border-void-800">
          <Search size={16} className="text-void-500 shrink-0" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="What do you want to do? Try “halftone” or “remove background”"
            onKeyDown={e => {
              e.stopPropagation()
              if (e.key === 'Escape') onClose()
              if (e.key === 'ArrowDown') { e.preventDefault(); setI(v => Math.min(shown.length - 1, v + 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setI(v => Math.max(0, v - 1)) }
              if (e.key === 'Enter') go(shown[i])
            }}
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-void-500" />
        </label>
        <ul ref={list} className="max-h-[52vh] overflow-y-auto p-1.5" role="listbox">
          {shown.map((c, n) => (
            <li key={c.group + c.label} role="option" aria-selected={n === i} onPointerEnter={() => setI(n)} onClick={() => go(c)}
              className={`flex items-center gap-3 px-3 h-9 rounded-lg cursor-pointer text-[13px] ${n === i ? 'bg-accent text-white' : 'text-void-200'}`}>
              <span className={`w-20 shrink-0 text-[11.5px] ${n === i ? 'text-white/75' : 'text-void-500'}`}>{c.group}</span>
              <span className="truncate">{c.label}</span>
              {c.hint && <span className={`ml-auto shrink-0 truncate max-w-[45%] text-[11.5px] ${n === i ? 'text-white/75' : 'text-void-500'}`}>{c.hint}</span>}
            </li>
          ))}
          {shown.length === 0 && <li className="px-3 py-5 text-[13px] text-void-500">Nothing matches “{q}”.</li>}
        </ul>
      </div>
    </div>
  )
}
