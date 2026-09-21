'use client'

import { X, Plus } from 'lucide-react'
import { useEditor } from '../store'
import { useTabs } from '../tabs'
import { focusRing } from './ui'

export function TabBar({ onNew }: { onNew: () => void }) {
  const tabs = useTabs(s => s.tabs)
  const activeId = useTabs(s => s.activeId)
  const docName = useEditor(s => s.doc?.name)
  if (tabs.length <= 1) return null
  return (
    <div className="h-9 shrink-0 flex items-stretch gap-0.5 px-2 bg-void-950 border-b border-void-800/60 overflow-x-auto">
      {tabs.map(t => {
        const on = t.id === activeId
        return (
          <div key={t.id} className={`group flex items-center gap-2 pl-3 pr-1.5 rounded-t-lg text-[12.5px] shrink-0 max-w-[180px] ${on ? 'bg-[#101014] text-void-100' : 'text-void-400 hover:text-white'}`}>
            <button onClick={() => useTabs.getState().switchTo(t.id)} className={`truncate py-1 ${focusRing}`}>{on ? (docName ?? t.name) : t.name}</button>
            <button aria-label={`Close ${t.name}`} onClick={() => { if (confirm(`Close “${t.name}”? It is saved to this device.`)) useTabs.getState().close(t.id) }}
              className={`w-5 h-5 shrink-0 inline-flex items-center justify-center rounded ${on ? 'text-void-400' : 'text-void-600 opacity-0 group-hover:opacity-100'} hover:text-white hover:bg-void-800 ${focusRing}`}><X size={13} /></button>
          </div>
        )
      })}
      <button aria-label="New design" onClick={onNew} className={`w-8 shrink-0 inline-flex items-center justify-center text-void-400 hover:text-white ${focusRing}`}><Plus size={15} /></button>
    </div>
  )
}
