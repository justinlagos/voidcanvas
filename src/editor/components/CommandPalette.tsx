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
import { buildActions, prettyKey } from '../actions'

interface Cmd { label: string; hint?: string; group: string; run: () => void }

/** Ctrl+K. Every action in the editor, searchable, so nobody has to hunt through panels. */
export function CommandPalette({ onClose, open }: { onClose: () => void; open: (m: any) => void }) {
  const [q, setQ] = useState('')
  const docRev = useEditor(st => st.docRev)
  const [i, setI] = useState(0)
  const list = useRef<HTMLUListElement>(null)

  const all = useMemo<Cmd[]>(() => {
    const s = () => useEditor.getState()
    const acts = buildActions()
    const groupOf = (id: string) => ({ file: 'File', edit: 'Edit', image: 'Image', adj: 'Adjustment', layer: 'Layer', style: 'Layer style', mask: 'Mask', align: 'Align', dist: 'Align', sel: 'Select', filter: 'Filter', fx: 'Filter', view: 'View', panel: 'Panel', ws: 'Workspace', scale: 'Interface', density: 'Interface', help: 'Help' } as Record<string, string>)[id.split('.')[0]] ?? 'Action'
    return [
      ...TOOLS.map(t => ({ label: t.label.split(':')[0], hint: t.key, group: 'Tool', run: () => s().setTool(t.id) })),
      { label: 'Add text', group: 'Add', run: () => s().addText() },
      { label: 'Add photo, shape or blank layer', group: 'Add', run: () => open('add') },
      ...Object.values(acts).filter(a => !a.enabled || a.enabled()).map(a => ({ label: a.label.replace(/…$/, ''), hint: [prettyKey(a.hotkey ?? a.shortcut), a.keywords].filter(Boolean).join('  ·  ') || undefined, group: groupOf(a.id), run: a.run })),
      ...s().layers.slice().reverse().map(l => ({
        label: l.type === 'text' ? (l.text.split('\n')[0] || 'Text') : l.name,
        hint: l.type, group: 'Go to layer',
        run: () => { s().setActive(l.id); stageApi.fitSelection() },
      })),
    ]
  }, [open, docRev])

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return all.filter(c => words.every(w => (c.label + ' ' + c.group + ' ' + (c.hint ?? '')).toLowerCase().includes(w))).slice(0, 60)
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
