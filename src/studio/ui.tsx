'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { focusRing } from '@/editor/components/ui'

export { focusRing }

/** An object URL for a blob, created and revoked by the same effect (safe under React's double effects in development). */
export function useObjectUrl(blob?: Blob | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) { setUrl(null); return }
    const u = URL.createObjectURL(blob); setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

export function Btn({ children, onClick, primary, subtle, disabled, className = '', title, type = 'button' }: { children: ReactNode; onClick?: () => void; primary?: boolean; subtle?: boolean; disabled?: boolean; className?: string; title?: string; type?: 'button' | 'submit' }) {
  return (
    <button type={type} title={title} onClick={onClick} disabled={disabled}
      className={`h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none ${focusRing} ${primary ? 'bg-white text-void-950 hover:bg-void-100' : subtle ? 'text-void-300 hover:text-white hover:bg-void-800' : 'bg-void-800/80 text-void-100 hover:bg-void-700'} ${className}`}>
      {children}
    </button>
  )
}

export const INPUT = `h-8 px-2.5 rounded-lg bg-void-950 border border-void-800 text-[12.5px] text-void-100 placeholder:text-void-600 ${focusRing}`

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return <div className="flex items-baseline justify-between mb-1.5"><span className="text-[12px] font-semibold text-void-200">{children}</span>{hint && <span className="text-[11.5px] text-void-500">{hint}</span>}</div>
}

export function Panel({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-void-900/60 border border-void-800/80 ${className}`}>
      {title && <div className="flex items-center justify-between px-4 h-11 border-b border-void-800/70"><h3 className="text-[12.5px] font-semibold text-void-100">{title}</h3>{action}</div>}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Overlay({ title, onClose, children, actions }: { title: ReactNode; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', k, true); ref.current?.focus()
    return () => window.removeEventListener('keydown', k, true)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex p-0 sm:p-5" onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" className="flex-1 flex flex-col rounded-none sm:rounded-2xl bg-[#131318] border border-void-800 overflow-hidden outline-none">
        <div className="h-12 shrink-0 flex items-center gap-3 px-4 border-b border-void-800/70">
          <h2 className="text-[14px] font-semibold flex-1 min-w-0 truncate">{title}</h2>
          {actions}
          <button aria-label="Close" onClick={onClose} className={`w-8 h-8 rounded-lg text-void-400 hover:text-white hover:bg-void-800 flex items-center justify-center ${focusRing}`}><X size={16} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-void-700 px-6 py-12 text-center">
      <p className="text-[14.5px] font-medium">{title}</p>
      {children && <p className="mt-1.5 text-[12.5px] text-void-400 max-w-md mx-auto leading-relaxed">{children}</p>}
      {action && <div className="mt-4 flex justify-center gap-2">{action}</div>}
    </div>
  )
}

export function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null
  return <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl bg-white text-void-950 text-[13px] shadow-2xl max-w-[90vw]">{msg}</div>
}
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  const t = useRef<ReturnType<typeof setTimeout>>()
  const show = (m: string) => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(null), 4200) }
  return { msg, show }
}

export const isLight = (hex: string) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) > 150 }
export const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
