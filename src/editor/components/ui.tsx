'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

export const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/** A small styled tooltip that appears after a short hover delay. Shows a label and, optionally, a shortcut keycap. */
export function Tooltip({ label, shortcut, side = 'right', children }: { label: string; shortcut?: string; side?: 'right' | 'top' | 'bottom' | 'left'; children: ReactNode }) {
  const [show, setShow] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const open = () => { timer.current = setTimeout(() => setShow(true), 450) }
  const close = () => { if (timer.current) clearTimeout(timer.current); setShow(false) }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const pos = side === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-2'
    : side === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2'
    : side === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
    : 'top-full left-1/2 -translate-x-1/2 mt-2'
  return (
    <span className="relative inline-flex" onPointerEnter={open} onPointerLeave={close} onPointerDown={close}>
      {children}
      {show && (
        <span role="tooltip" className={`pointer-events-none absolute z-50 whitespace-nowrap flex items-center gap-1.5 px-2 h-7 rounded-lg bg-[#26262e] border border-void-700 shadow-xl text-[12px] text-void-100 ${pos}`}>
          {label}
          {shortcut && <KeyCap>{shortcut}</KeyCap>}
        </span>
      )}
    </span>
  )
}

export function KeyCap({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex items-center h-5 min-w-[18px] px-1 justify-center rounded bg-void-900 border border-void-700 text-[10.5px] font-medium text-void-300">{children}</kbd>
}

export function IconButton({ label, shortcut, active, disabled, onClick, children, className = '', tipSide = 'top' }: {
  label: string; shortcut?: string; active?: boolean; disabled?: boolean; onClick?: () => void; children: ReactNode; className?: string; tipSide?: 'right' | 'top' | 'bottom' | 'left'
}) {
  return (
    <Tooltip label={label} shortcut={shortcut} side={tipSide}>
      <button
        type="button" onClick={onClick} disabled={disabled} aria-label={shortcut ? `${label} (${shortcut})` : label} aria-pressed={active}
        className={`h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg transition-colors ${focusRing} ${
          active ? 'bg-accent text-white' : 'text-void-300 hover:bg-void-800 hover:text-white'
        } disabled:opacity-30 disabled:pointer-events-none ${className}`}
      >
        {children}
      </button>
    </Tooltip>
  )
}

export function Slider({ label, value, min, max, step = 1, unit = '', onChange, onCommit, format }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string
  onChange: (v: number) => void; onCommit?: () => void; format?: (v: number) => string
}) {
  const pct = ((value - min) / (max - min)) * 100
  const scrub = useRef<{ x: number; v: number } | null>(null)
  const snap = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[12px] text-void-400 mb-1">
        <span title="Drag sideways to change. Hold Shift for big steps." className="cursor-ew-resize select-none touch-none"
          onPointerDown={e => { e.preventDefault(); scrub.current = { x: e.clientX, v: value }; (e.target as HTMLElement).setPointerCapture(e.pointerId) }}
          onPointerMove={e => { if (scrub.current) onChange(snap(scrub.current.v + ((e.clientX - scrub.current.x) * (max - min) * (e.shiftKey ? 4 : 1)) / 260)) }}
          onPointerUp={() => { if (scrub.current) { scrub.current = null; onCommit?.() } }}>{label}</span>
        <span className="tabular-nums text-void-200">{format ? format(value) : Math.round(value * 100) / 100}{unit}</span>
      </span>
      <span className="relative block h-4">
        <span className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded bg-void-800" />
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded bg-accent" style={{ width: `${pct}%` }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          onPointerUp={onCommit} onKeyUp={onCommit}
          className="vc-range absolute inset-0"
        />
      </span>
    </label>
  )
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="px-4 py-3 border-b border-white/[0.05]">
      <div className="flex items-center justify-between h-6 mb-2">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-void-500">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ColorField({ label, value, onChange, onCommit, allowNone }: {
  label: string; value: string | null; onChange: (v: string | null) => void; onCommit?: () => void; allowNone?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-void-400">{label}</span>
      <span className="flex items-center gap-1.5">
        {allowNone && (
          <button type="button" onClick={() => { onChange(value ? null : '#111111'); onCommit?.() }} className={`text-[11px] px-2 h-7 rounded-md border border-void-700 text-void-300 hover:text-white ${focusRing}`}>
            {value ? 'Remove' : 'Add'}
          </button>
        )}
        {value !== null && (
          <>
            <input type="color" aria-label={label} value={value} onChange={e => onChange(e.target.value)} onBlur={onCommit} className={`w-7 h-7 rounded-md bg-transparent cursor-pointer ${focusRing}`} />
            <input
              aria-label={`${label} hex`} value={value} spellCheck={false}
              onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { onChange(e.target.value); onCommit?.() } }}
              className={`w-[76px] h-7 px-2 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] font-mono text-void-200 ${focusRing}`}
            />
          </>
        )}
      </span>
    </div>
  )
}

export function Select<T extends string | number>({ label, value, options, onChange }: {
  label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-void-400 shrink-0">{label}</span>
      <select
        value={value} onChange={e => onChange((typeof value === 'number' ? Number(e.target.value) : e.target.value) as T)}
        className={`h-8 min-w-0 flex-1 max-w-[170px] px-2 rounded-md bg-surface-sunken border border-white/[0.06] text-[12.5px] text-void-100 ${focusRing}`}
      >
        {options.map(o => <option key={String(o.id)} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  )
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', k, true)
    ref.current?.focus()
    return () => window.removeEventListener('keydown', k, true)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[2px] p-0 sm:p-6" onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={`w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-md'} max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-[#17171c] border border-void-800 shadow-2xl outline-none`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-void-800/70">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose}><X size={17} /></IconButton>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export function Button({ children, onClick, primary, disabled, className = '', type = 'button' }: {
  children: ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean; className?: string; type?: 'button' | 'submit'
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`h-9 px-3.5 inline-flex items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-colors ${focusRing} disabled:opacity-40 disabled:pointer-events-none ${
        primary ? 'bg-white text-void-950 hover:bg-void-100' : 'bg-void-800/80 text-void-100 hover:bg-void-700'
      } ${className}`}>
      {children}
    </button>
  )
}
