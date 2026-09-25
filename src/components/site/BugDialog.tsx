'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { track } from '@/lib/analytics'
import { BugReportForm } from './BugReportForm'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/** Report a bug without leaving your work. Opened by openBugReport() from any Help menu. Mounted once in the root layout. */
export function BugDialog() {
  const [open, setOpen] = useState<null | { from: string }>(null)
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent).detail || {}; setOpen({ from: location.pathname }); track('bug.open', { trigger: d.trigger || 'menu' }) }
    addEventListener('vc:bug', on); return () => removeEventListener('vc:bug', on)
  }, [])
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(null) } }
    addEventListener('keydown', esc, true)
    return () => { removeEventListener('keydown', esc, true); prev?.focus?.() }
  }, [open])
  if (!open) return null
  return (
    // .lp gives the form its tokens; inside the app the attribute for light is never set, so it is always the dark set.
    <div className="lp fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(null) }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="bug-title" onKeyDown={e => e.stopPropagation()}
        className="w-full sm:max-w-[600px] max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-lp-card border border-lp-line shadow-2xl text-lp-text"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-7 pt-5 pb-3 bg-lp-card">
          <div>
            <h2 id="bug-title" className="text-[20px] font-semibold tracking-tight text-lp-fg">Report a bug</h2>
            <p className="text-[13px] text-lp-dim">Your work stays open. Nothing in it is sent.</p>
          </div>
          <button onClick={() => setOpen(null)} aria-label="Close" className={`w-9 h-9 rounded-full flex items-center justify-center text-lp-dim hover:text-lp-fg hover:bg-lp-panel ${focus}`}><X size={18} /></button>
        </div>
        <div className="px-5 sm:px-7 pb-6"><BugReportForm from={open.from} compact onDone={() => setOpen(null)} /></div>
      </div>
    </div>
  )
}
