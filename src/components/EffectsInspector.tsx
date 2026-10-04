'use client'

import { useRef } from 'react'
import { ChevronDown, GripVertical, SlidersHorizontal, LocateFixed } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useMovablePanel } from '@/hooks/useMovablePanel'
import { ParamControls } from './ParamControls'
import { effects } from './effect-list'

export function EffectsInspector({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const panel = useRef<HTMLDivElement>(null)
  const bounds = useRef<HTMLDivElement>(null)
  const movable = useMovablePanel(panel, bounds)
  const active = useStore(s => s.activeEffect)
  if (active === 'none') return null
  const effect = effects.find(e => e.id === active)
  return (
    <div ref={bounds} className="hidden lg:block absolute inset-0 pointer-events-none z-20">
      <section ref={panel} data-effects-inspector aria-label={`${effect?.name} controls`}
        style={movable.style} className="pointer-events-auto absolute right-4 top-4 w-80 max-h-[calc(100%-2rem)] flex flex-col rounded-xl border border-void-700 bg-void-950/95 shadow-2xl">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-void-800">
          <button {...movable.handle} aria-label="Move effect controls" title="Drag to move. Arrow keys move; Shift moves faster."
            className="flex flex-1 min-w-0 items-center gap-2 p-1.5 text-void-400 hover:text-white cursor-grab active:cursor-grabbing touch-none rounded focus-visible:ring-2 focus-visible:ring-white"><GripVertical size={16} /><SlidersHorizontal size={14} /><span className="text-sm text-white font-medium truncate">{effect?.name}</span></button>
          <button onClick={movable.reset} aria-label="Reset controls position" title="Reset position" className="p-1.5 text-void-400 hover:text-white rounded"><LocateFixed size={14} /></button>
          <button onClick={() => setOpen(!open)} aria-label={open ? 'Collapse effect controls' : 'Expand effect controls'} aria-expanded={open} className="p-1.5 text-void-400 hover:text-white rounded"><ChevronDown size={16} className={open ? '' : '-rotate-90'} /></button>
        </div>
        {open && <div className="overflow-y-auto overscroll-contain p-3 min-h-0" key={active}><ParamControls /></div>}
      </section>
    </div>
  )
}
