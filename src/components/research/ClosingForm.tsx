'use client'

// The three closing questions, asked when a participant downloads the delivery package in research mode.
// Used inside Studio (as a panel over the job) and on /research/closing as a fallback.

import { useId, useState } from 'react'
import { CLOSING_DISAPPOINTMENT, studyCall, studyErrorText, type StudyView } from '@/lib/research'
import { Button, Choice, Notice, field, hint, label } from './ui'

export function ClosingForm({ token, job, formats, onDone, tone = 'site' }: { token: string; job: string; formats?: number; onDone: (v: StudyView) => void; tone?: 'site' | 'app' }) {
  const id = useId()
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [blocked, setBlocked] = useState('')
  const [dis, setDis] = useState<'very' | 'somewhat' | 'not' | ''>('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const total = (Number(hours) || 0) * 60 + (Number(minutes) || 0)
  const ready = total > 0 && dis

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready) { setErr('Please answer the first and last questions.'); return }
    setBusy(true); setErr(null)
    try {
      const r = await studyCall<{ view: StudyView }>('closing', { token, job, usualMinutes: total, blocked, disappointment: dis })
      onDone(r.view)
    } catch (e2) { setErr(studyErrorText(e2)) } finally { setBusy(false) }
  }

  const num = `${field} h-11 !w-24 text-center tabular-nums`
  return (
    <form onSubmit={submit} className={`space-y-7 ${tone === 'app' ? 'text-left' : ''}`}>
      {formats != null && <p className="text-[14px] text-lp-dim">Delivery package downloaded with {formats} format{formats === 1 ? '' : 's'}. Three short questions to finish your study job.</p>}
      <fieldset>
        <legend className={label}>1. The way you normally work, how long would adapting and delivering this job usually take you?</legend>
        <p className={hint}>From approved key visual to files delivered. A rough estimate is fine.</p>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <input id={`${id}-h`} aria-label="Hours" inputMode="numeric" value={hours} onChange={e => setHours(e.target.value.replace(/\D/g, '').slice(0, 3))} className={num} placeholder="0" />
          <label htmlFor={`${id}-h`} className="text-[14.5px] text-lp-text">hours</label>
          <input id={`${id}-m`} aria-label="Minutes" inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value.replace(/\D/g, '').slice(0, 2))} className={num} placeholder="0" />
          <label htmlFor={`${id}-m`} className="text-[14.5px] text-lp-text">minutes</label>
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${id}-b`} className={label}>2. What slowed you down or got in your way in Studio? <span className="font-normal text-lp-dim">(optional)</span></label>
        <textarea id={`${id}-b`} value={blocked} onChange={e => setBlocked(e.target.value)} rows={3} maxLength={4000} className={`${field} mt-2 py-3 leading-relaxed`} placeholder="Anything that was missing, confusing or slower than your usual way." />
      </div>
      <fieldset>
        <legend className={label}>3. How would you feel if you could no longer use Voidcanvas Studio?</legend>
        <Choice name={`${id}-d`} value={dis} onChange={setDis} columns={3} options={CLOSING_DISAPPOINTMENT as [typeof dis & string, string][]} />
      </fieldset>
      {err && <Notice kind="error">{err}</Notice>}
      <Button type="submit" busy={busy} disabled={!ready}>Send answers</Button>
    </form>
  )
}
