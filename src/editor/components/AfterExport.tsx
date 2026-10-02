'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { alsoNeeded } from '../export'
import { buildActions, openModal } from '../actions'
import { useEditor } from '../store'
import { focusRing } from './ui'
import { track } from '@/lib/analytics'

interface Exported { format: string; boards: string[]; files: number; what: 'boards' | 'selection'; name: string }

/**
 * A small card after an export, in the corner: what else the design probably needs, and ways to use it
 * again. It never blocks anything, goes by itself, and is not shown again until the next export.
 */
export function AfterExport() {
  const [ev, setEv] = useState<Exported | null>(null)
  const [hold, setHold] = useState(false)
  const doc = useEditor(s => s.doc)
  useEffect(() => {
    const h = (e: Event) => setEv((e as CustomEvent<Exported>).detail)
    window.addEventListener('vc:exported', h)
    return () => window.removeEventListener('vc:exported', h)
  }, [])
  useEffect(() => { if (!ev || hold) return; const t = setTimeout(() => setEv(null), 25000); return () => clearTimeout(t) }, [ev, hold])
  // Another design opened: the card was about the last one.
  useEffect(() => { setEv(null) }, [doc?.id])
  if (!ev || !doc) return null

  const fmt = ev.format === 'jpeg' ? 'JPG' : ev.format.toUpperCase()
  const title = ev.files === 1 ? `Exported ${ev.name}` : `Exported ${ev.files} ${fmt}s`
  const next = ev.what === 'selection' ? { others: [], sizes: [], from: null } : alsoNeeded(doc)
  const done = () => setEv(null)
  const chip = `h-7 px-2.5 rounded-lg text-[12px] border border-void-700 bg-void-900 text-void-200 hover:text-white hover:border-void-500 ${focusRing}`
  const use = (what: string) => { track('after_export', { use: what }); done() }

  return (
    <aside aria-label="After export" data-after-export onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)} onFocus={() => setHold(true)}
      className="fixed right-4 bottom-12 z-[80] w-[340px] max-w-[calc(100vw-32px)] rounded-xl bg-[#17171c] border border-void-700 shadow-2xl p-3.5 text-[12.5px]">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></span>
        <p className="flex-1 min-w-0 text-void-100 font-medium truncate" title={title}>{title}</p>
        <button onClick={done} aria-label="Close" className={`w-6 h-6 -mt-0.5 -mr-1 rounded-md text-void-400 hover:text-white flex items-center justify-center ${focusRing}`}><X size={14} /></button>
      </div>
      {(next.others.length > 0 || next.sizes.length > 0) && (
        <div className="mt-3" data-also-needed>
          <p className="text-void-400 mb-1.5">Also needed?</p>
          <div className="flex flex-wrap gap-1.5">
            {next.others.length > 0 && <button className={chip} onClick={() => { use('other-boards'); openModal('export', { boards: next.others }) }}>The other {next.others.length} board{next.others.length === 1 ? '' : 's'}</button>}
            {next.sizes.map(p => (
              <button key={p.id} className={chip} title={`${p.width} × ${p.height}, laid out from this board`} onClick={() => { use('size'); import('../cascade').then(m => m.cascadeToFrames(next.from, [p])) }}>{p.label}</button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3">
        <p className="text-void-400 mb-1.5">Use this again</p>
        <div className="flex flex-wrap gap-1.5">
          <button className={chip} onClick={() => { use('template'); buildActions()['file.template']?.run() }}>Save as template</button>
          <button className={chip} onClick={() => { use('variation'); buildActions()['file.variation']?.run() }}>Duplicate as variation</button>
        </div>
      </div>
    </aside>
  )
}
