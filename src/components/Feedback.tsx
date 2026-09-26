'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Frown, Meh, MessageSquare, Smile, X } from 'lucide-react'
import { initAnalytics, openFeedback, sendFeedback, track } from '@/lib/analytics'
import { BugDialog } from '@/components/site/BugDialog'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const MOODS = [
  { v: 1 as const, label: 'Not good', Icon: Frown, on: 'bg-rose-500/20 text-rose-300 border-rose-400/50' },
  { v: 2 as const, label: 'It’s okay', Icon: Meh, on: 'bg-amber-500/20 text-amber-200 border-amber-400/50' },
  { v: 3 as const, label: 'Love it', Icon: Smile, on: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50' },
]

let lastView = ''

/** Page views, error capture and the feedback box. Mounted once in the root layout. */
export function Analytics() {
  const path = usePathname() ?? '/'
  useEffect(() => { initAnalytics() }, [])
  useEffect(() => { if (!path.startsWith('/admin') && lastView !== path) { lastView = path; track('page.view') } }, [path])
  return <><FeedbackWidget path={path} /><BugDialog /></>
}

function FeedbackWidget({ path }: { path: string }) {
  const [open, setOpen] = useState<null | { trigger: string; quick: boolean }>(null)
  const [mood, setMood] = useState<1 | 2 | 3 | null>(null)
  const [msg, setMsg] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle')
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail || {}
      setOpen({ trigger: d.trigger || 'button', quick: !!d.quick }); setState('idle'); setMood(null); setMsg(''); setEmail('')
      track('feedback.open', { trigger: d.trigger || 'button' })
    }
    window.addEventListener('vc:feedback', on)
    return () => window.removeEventListener('vc:feedback', on)
  }, [])
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(null) } }
    window.addEventListener('keydown', esc, true)
    return () => window.removeEventListener('keydown', esc, true)
  }, [open])
  useEffect(() => { if (state === 'done') { const t = setTimeout(() => setOpen(null), 2200); return () => clearTimeout(t) } }, [state])

  if (path.startsWith('/admin')) return null
  // Pages with their own bottom action bar (Effects and the quick tools on phones) carry a Feedback entry there instead.
  const [hasBar, setHasBar] = useState(false)
  useEffect(() => {
    const check = () => setHasBar(!!document.querySelector('[data-mobile-actions]') && getComputedStyle(document.querySelector('[data-mobile-actions]')!).display !== 'none')
    check(); const mo = new MutationObserver(check); mo.observe(document.body, { childList: true, subtree: true }); addEventListener('resize', check)
    return () => { mo.disconnect(); removeEventListener('resize', check) }
  }, [path])
  const onSite = /^\/(learn|blog|about|report-a-bug)(\/|$)/.test(path)
  const showButton = path !== '/' && path !== '/s' && !onSite && !path.startsWith('/editor') && !open && !hasBar

  const submit = async () => {
    if (!mood && !msg.trim()) return
    setState('sending')
    setState(await sendFeedback({ mood, message: msg, email, trigger: open?.trigger || 'button' }) ? 'done' : 'failed')
  }
  const pickQuick = (v: 1 | 2 | 3) => { setMood(v); setOpen(o => o && { ...o, quick: false }) }

  return (
    <>
      {showButton && (
        <button onClick={() => openFeedback('button')} aria-label="Send feedback"
          className={`fixed z-40 bottom-4 left-4 flex items-center gap-1.5 h-9 px-3 rounded-full bg-void-900/95 border border-void-700 text-[12.5px] text-void-300 hover:text-white hover:border-void-500 shadow-lg backdrop-blur ${focus}`}
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
          <MessageSquare size={14} />Feedback
        </button>
      )}
      {open && (
        <div ref={box} role="dialog" aria-label="Send feedback" onKeyDown={e => e.stopPropagation()}
          className={`fixed z-[90] ${open.quick ? 'bottom-6 left-1/2 -translate-x-1/2' : 'bottom-4 left-4 right-4 sm:right-auto sm:w-[360px]'} rounded-2xl bg-[#17171c] border border-void-700 shadow-2xl text-void-100`}
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
          {state === 'done' ? (
            <p className="px-5 py-4 text-[13.5px]">Thanks. Every message is read.</p>
          ) : open.quick ? (
            <div className="flex items-center gap-3 pl-4 pr-2 py-2">
              <span className="text-[13px] text-void-200 whitespace-nowrap">How did that go?</span>
              <div className="flex gap-1">
                {MOODS.map(m => <button key={m.v} onClick={() => pickQuick(m.v)} aria-label={m.label} title={m.label} className={`w-9 h-9 rounded-full flex items-center justify-center text-void-300 hover:bg-void-800 hover:text-white ${focus}`}><m.Icon size={20} /></button>)}
              </div>
              <button onClick={() => setOpen(null)} aria-label="Close" className={`w-8 h-8 rounded-full flex items-center justify-center text-void-500 hover:text-white ${focus}`}><X size={15} /></button>
            </div>
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[14px] font-medium">How is Voidcanvas for you?</p>
                <button onClick={() => setOpen(null)} aria-label="Close" className={`w-8 h-8 -mr-1.5 rounded-full flex items-center justify-center text-void-500 hover:text-white ${focus}`}><X size={16} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MOODS.map(m => (
                  <button key={m.v} onClick={() => setMood(mood === m.v ? null : m.v)} aria-pressed={mood === m.v}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[12px] transition-colors ${focus} ${mood === m.v ? m.on : 'border-void-800 bg-void-900 text-void-400 hover:text-white hover:border-void-600'}`}>
                    <m.Icon size={22} />{m.label}
                  </button>
                ))}
              </div>
              <textarea value={msg} onChange={e => setMsg(e.target.value)} maxLength={2000} rows={3} autoFocus
                placeholder={mood === 1 ? 'What went wrong?' : mood === 3 ? 'What do you like? What should we add?' : 'What should we fix or add?'}
                className={`mt-3 w-full resize-none rounded-xl bg-void-900 border border-void-800 px-3 py-2.5 text-[13px] placeholder:text-void-500 ${focus}`} />
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" maxLength={200} placeholder="Email, only if you want a reply"
                className={`mt-2 w-full h-9 rounded-xl bg-void-900 border border-void-800 px-3 text-[13px] placeholder:text-void-500 ${focus}`} />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[11px] text-void-500 leading-snug">Your designs are never sent.</p>
                <button onClick={submit} disabled={state === 'sending' || (!mood && !msg.trim())}
                  className={`h-9 px-4 rounded-xl bg-white text-void-950 text-[13px] font-medium disabled:opacity-40 ${focus}`}>{state === 'sending' ? 'Sending' : 'Send'}</button>
              </div>
              {state === 'failed' && <p className="mt-2 text-[12px] text-rose-300">Could not send. Check your connection and try again.</p>}
            </div>
          )}
        </div>
      )}
    </>
  )
}
