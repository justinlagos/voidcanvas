'use client'

import Link from 'next/link'
import { useEffect, useId, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { bugDetails, sendBugReport } from '@/lib/analytics'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export const WHERE: [string, string][] = [
  ['editor', 'Editor'], ['studio', 'Studio'], ['effects', 'Effects'], ['tools', 'Quick tools'], ['home', 'Home page'], ['learn', 'Learn or Blog'], ['other', 'Somewhere else'],
]
const SEVERITY: [string, string, string][] = [
  ['blocker', 'Stops my work', 'I cannot finish what I was doing'],
  ['annoying', 'Gets in the way', 'There is a way round it, but it slows me down'],
  ['cosmetic', 'Looks wrong', 'Layout, text or display, nothing is lost'],
]
const FREQUENCY: [string, string][] = [['always', 'Every time'], ['sometimes', 'Sometimes'], ['once', 'Only once']]

/** Guesses the area from a path such as /editor or /tools/halftone. */
export function whereOf(path: string) {
  const p = path.split('/')[1] || ''
  if (['editor', 'studio', 'effects', 'tools'].includes(p)) return p
  if (p === 'learn' || p === 'blog') return 'learn'
  if (p === '') return 'home'
  if (p === 'report-a-bug') return 'editor'
  return 'other'
}

/** The bug report. One required field; everything else helps but is optional. Used on /report-a-bug and in the in-app dialog. */
export function BugReportForm({ from, compact, onDone }: { from?: string; compact?: boolean; onDone?: () => void }) {
  const id = useId()
  const [where, setWhere] = useState('editor')
  const [summary, setSummary] = useState('')
  const [steps, setSteps] = useState('')
  const [expected, setExpected] = useState('')
  const [severity, setSeverity] = useState('annoying')
  const [frequency, setFrequency] = useState('always')
  const [email, setEmail] = useState('')
  const [details, setDetails] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [preview, setPreview] = useState<ReturnType<typeof bugDetails>>(null)
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle')

  useEffect(() => {
    const q = typeof window !== 'undefined' ? new URLSearchParams(location.search).get('from') : null
    setWhere(whereOf(from || q || document.referrer.replace(/^https?:\/\/[^/]+/, '') || location.pathname))
    setPreview(bugDetails())
  }, [from])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!summary.trim() || state === 'sending') return
    setState('sending')
    const ok = await sendBugReport({ summary, steps, expected, where, severity, frequency, email, details }, from)
    setState(ok ? 'done' : 'failed')
  }

  const field = `w-full rounded-xl bg-[var(--lp-field)] border border-lp-line px-3.5 text-[15px] text-lp-text placeholder:text-lp-faint focus:border-lp-faint focus:outline-none ${focus} transition-colors`
  const label = 'block text-[14px] font-medium text-lp-fg'
  const hint = 'mt-0.5 text-[13px] text-lp-dim'

  if (state === 'done') return (
    <div role="status" className="rounded-2xl border border-lp-line bg-lp-card p-6 sm:p-8 text-center">
      <span className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center"><Check size={22} /></span>
      <p className="mt-4 text-[20px] font-semibold tracking-tight text-lp-fg">Thanks. The report is in.</p>
      <p className="mt-2 text-[15px] text-lp-dim max-w-[420px] mx-auto">Every report is read. {email.trim() ? 'We will reply to the email you gave if we need more, or when it is fixed.' : 'You did not leave an email, so we cannot reply, but it will still be looked at.'}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onDone ? <button onClick={onDone} className={`h-10 px-5 rounded-full bg-lp-btn text-lp-btn-fg text-[14px] font-medium ${focus}`}>Back to work</button>
          : <Link href="/editor" className={`h-10 inline-flex items-center px-5 rounded-full bg-lp-btn text-lp-btn-fg text-[14px] font-medium ${focus}`}>Back to Voidcanvas</Link>}
        <button onClick={() => { setSummary(''); setSteps(''); setExpected(''); setState('idle') }} className={`h-10 px-4 rounded-full text-[14px] text-lp-accent hover:text-lp-fg ${focus}`}>Report another</button>
      </div>
    </div>
  )

  return (
    <form onSubmit={submit} className={compact ? 'space-y-5' : 'space-y-7'} aria-label="Report a bug">
      <div className={compact ? 'grid gap-5' : 'grid sm:grid-cols-[1fr_220px] gap-5'}>
        <div>
          <label htmlFor={`${id}-sum`} className={label}>What went wrong? <span className="text-lp-accent">*</span></label>
          <p className={hint}>One line, the way you would tell a friend.</p>
          <input id={`${id}-sum`} value={summary} onChange={e => setSummary(e.target.value)} required maxLength={200} autoFocus={compact} placeholder="Export to PDF downloads a blank page" className={`${field} mt-2 h-11`} />
        </div>
        <div>
          <label htmlFor={`${id}-where`} className={label}>Where?</label>
          <p className={hint}>The part of Voidcanvas.</p>
          <div className="relative mt-2">
            <select id={`${id}-where`} value={where} onChange={e => setWhere(e.target.value)} className={`${field} h-11 appearance-none pr-9`}>
              {WHERE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-lp-dim pointer-events-none" />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-steps`} className={label}>How can we make it happen?</label>
        <p className={hint}>The steps you took, one per line. This is the most useful part of a report.</p>
        <textarea id={`${id}-steps`} value={steps} onChange={e => setSteps(e.target.value)} maxLength={1200} rows={compact ? 3 : 4} placeholder={'1. Opened an A4 flyer\n2. File, Export, PDF\n3. The file opens blank'} className={`${field} mt-2 py-3 resize-y leading-relaxed`} />
      </div>

      <div>
        <label htmlFor={`${id}-exp`} className={label}>What did you expect instead?</label>
        <textarea id={`${id}-exp`} value={expected} onChange={e => setExpected(e.target.value)} maxLength={500} rows={2} placeholder="The flyer, as it looks on the canvas" className={`${field} mt-2 py-3 resize-y leading-relaxed`} />
      </div>

      <fieldset>
        <legend className={label}>How much does it get in the way?</legend>
        <div className="mt-2 grid sm:grid-cols-3 gap-2">
          {SEVERITY.map(([v, l, d]) => (
            <label key={v} className={`relative flex flex-col gap-0.5 rounded-xl border px-3.5 py-3 cursor-pointer transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${severity === v ? 'border-accent bg-accent/10' : 'border-lp-line hover:border-lp-faint'}`}>
              <input type="radio" name={`${id}-sev`} value={v} checked={severity === v} onChange={() => setSeverity(v)} className="sr-only" />
              <span className="text-[14px] font-medium text-lp-fg">{l}</span>
              <span className="text-[12.5px] text-lp-dim leading-snug">{d}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={label}>Does it happen every time?</legend>
        <div className="mt-2 inline-flex flex-wrap p-1 rounded-full bg-lp-panel border border-lp-line">
          {FREQUENCY.map(([v, l]) => (
            <label key={v} className={`h-8 px-4 rounded-full text-[13px] font-medium flex items-center cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${frequency === v ? 'bg-lp-btn text-lp-btn-fg' : 'text-lp-dim hover:text-lp-fg'}`}>
              <input type="radio" name={`${id}-freq`} value={v} checked={frequency === v} onChange={() => setFrequency(v)} className="sr-only" />{l}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${id}-email`} className={label}>Email <span className="font-normal text-lp-dim">(optional)</span></label>
        <p className={hint}>Only if you want to hear back. It is used for this report and nothing else.</p>
        <input id={`${id}-email`} type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={200} placeholder="you@studio.com" className={`${field} mt-2 h-11`} />
      </div>

      <div className="rounded-xl border border-lp-line bg-lp-panel/60">
        <div className="flex items-start gap-3 px-4 py-3">
          <input id={`${id}-det`} type="checkbox" checked={details} onChange={e => setDetails(e.target.checked)} className="mt-1 w-4 h-4 accent-[#8b7cff]" />
          <div className="flex-1 min-w-0">
            <label htmlFor={`${id}-det`} className="text-[14px] font-medium text-lp-fg">Include technical details</label>
            <p className="text-[13px] text-lp-dim">Device, browser, screen size, the last few commands you used and recent error messages. Never your images, file names or anything in your designs.</p>
            <button type="button" onClick={() => setShowDetails(v => !v)} aria-expanded={showDetails} className={`mt-1 text-[13px] text-lp-accent hover:text-lp-fg rounded ${focus}`}>{showDetails ? 'Hide' : 'See'} exactly what is sent</button>
          </div>
        </div>
        {showDetails && preview && (
          <dl className="border-t border-lp-line px-4 py-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-[12.5px] font-mono">
            {Object.entries(preview).map(([k, v]) => <div key={k} className="contents"><dt className="text-lp-faint">{k}</dt><dd className="text-lp-text break-words">{String(v) || 'none'}</dd></div>)}
          </dl>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
        <p className={`text-[13px] ${state === 'failed' ? 'text-rose-400' : 'text-lp-faint'}`} role={state === 'failed' ? 'alert' : undefined}>{state === 'failed' ? 'Could not send. Check your connection and try again.' : 'Your designs are never sent.'}</p>
        <button type="submit" disabled={!summary.trim() || state === 'sending'} aria-busy={state === 'sending'} className={`h-11 px-6 rounded-full bg-lp-btn text-lp-btn-fg text-[15px] font-medium hover:bg-lp-btn-hover disabled:opacity-40 ${focus}`}>{state === 'sending' ? 'Sending…' : 'Send report'}</button>
      </div>
    </form>
  )
}
