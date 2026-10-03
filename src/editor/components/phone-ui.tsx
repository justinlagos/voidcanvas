'use client'

import { useState, type ReactNode } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { useEditor } from '../store'

// Pieces the phone Editor is built from: sheets over the canvas, rows of chips, labels and colour chips.

export const chip = 'h-11 px-3.5 rounded-xl bg-void-900 border border-white/[0.07] text-[13.5px] text-void-100 inline-flex items-center gap-2 active:bg-void-800 disabled:opacity-40 whitespace-nowrap'
export const primary = 'h-11 px-4 rounded-xl bg-accent text-white text-[13.5px] font-medium inline-flex items-center gap-2 active:opacity-90 whitespace-nowrap'

/**
 * A sheet over the bottom of the canvas. It sits on the mode bar, never under it. A `peek` sheet starts low so
 * the design stays in view while you work on it; the arrow opens it taller, and scrolling inside shows the rest.
 */
export function Sheet({ title, onClose, children, tall, peek, action }: { title: string; onClose: () => void; children: ReactNode; tall?: boolean; peek?: boolean; action?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const size = peek ? (open ? 'h-[min(66dvh,100%)]' : 'max-h-[min(36dvh,100%)]') : tall ? 'h-[min(62dvh,100%)]' : 'max-h-[min(50dvh,100%)]'
  return (
    <section aria-label={title} data-mobile-sheet data-sheet-size={peek ? (open ? 'tall' : 'peek') : tall ? 'tall' : 'short'} className={`absolute inset-x-0 bottom-0 z-20 ${size} flex flex-col rounded-t-2xl border-t border-white/[0.08] bg-surface-overlay shadow-[0_-12px_40px_rgba(0,0,0,0.5)]`}>
      <div className="flex items-center h-11 px-4 shrink-0 gap-2">
        <span className="text-[12px] uppercase tracking-wider text-void-400 truncate">{title}</span>
        <span className="ml-auto" />
        {action}
        {peek && <button onClick={() => setOpen(v => !v)} aria-label={open ? 'Show less' : 'Show all settings'} aria-expanded={open} className="h-8 w-9 rounded-lg text-void-200 active:bg-void-800 inline-flex items-center justify-center"><ChevronRight size={17} className={open ? 'rotate-90' : '-rotate-90'} /></button>}
        <button onClick={onClose} aria-label="Close" className="h-8 px-3 rounded-lg text-[13px] text-void-200 active:bg-void-800 inline-flex items-center gap-1"><Check size={15} />Done</button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
    </section>
  )
}

export function Row({ children }: { children: ReactNode }) { return <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-1">{children}</div> }
export function Label({ children }: { children: ReactNode }) { return <div className="text-[12px] text-void-400 mt-3 mb-1.5">{children}</div> }

export function ColourChip({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  return (
    <label className={`${chip} cursor-pointer`}>
      <span className="w-5 h-5 rounded-full border border-white/30" style={{ background: value }} />{label}
      <input type="color" value={value} onChange={e => onChange(e.target.value)} onBlur={() => useEditor.getState().commit('Colour')} className="sr-only" />
    </label>
  )
}

