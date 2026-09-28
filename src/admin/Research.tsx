'use client'

// Admin view for the Working Designer Study: choose participants, read answers, play voice notes, see job timing,
// pay people and watch the scorecard. Uses the same admin password as the analytics dashboard.

import Link from 'next/link'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, Play, RefreshCw } from 'lucide-react'
import { QUESTIONS, studyCall } from '@/lib/research'

const PW_KEY = 'vc-admin-pw'
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const store = {
  get() { try { return sessionStorage.getItem(PW_KEY) || localStorage.getItem(PW_KEY) || '' } catch { return '' } },
  set(pw: string) { try { sessionStorage.setItem(PW_KEY, pw) } catch { /* ignore */ } },
  clear() { try { sessionStorage.removeItem(PW_KEY); localStorage.removeItem(PW_KEY) } catch { /* ignore */ } },
}

interface Person {
  id: string; ref: string; name: string; email: string; country: string; role: string; studio_size: string | null; multi_format_job: boolean; jobs_per_month: string | null
  adapted_by: string; tools: string[]; work_type: string | null; source: string | null; qualified: boolean; status: string; invite_deadline: string | null
  consent: Record<string, boolean> | null; interview_done: boolean; job_started: boolean; created_at: string; completed_at: string | null; paid_at: string | null
  payment_ref: string | null; payout_amount: string | null; payout_method: string | null; notes: string | null; ml_subscriber_id: string | null
}
interface Answer { participant_id: string; question: string; body: string | null; audio_path: string | null; audio_seconds: number | null }
interface Job { participant_id: string; job_key: string; started_at: string; delivered_at: string | null; formats: number | null; active_seconds: number | null; usual_minutes: number | null; blocked: string | null; disappointment: string | null; closing_at: string | null }
interface Data { people: Person[]; answers: Answer[]; jobs: Job[]; payouts: { participant_id: string; method: string; details: Record<string, string> }[]; mlErrors: { participant_id: string; ts: string; name: string; props: Record<string, unknown> }[]; mailerlite: boolean }

const ROLE: Record<string, string> = { freelancer: 'Freelancer', studio: 'Studio', agency_lead: 'Agency lead', in_house: 'In-house', student: 'Student', other: 'Other' }
const STATUS_TONE: Record<string, string> = { applied: 'text-void-300', selected: 'text-sky-300', not_selected: 'text-void-500', active: 'text-amber-200', complete: 'text-emerald-300', paid: 'text-emerald-400', withdrawn: 'text-rose-300' }
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '–')
const mins = (s: number | null) => (s == null ? '–' : `${Math.round(s / 60)} min`)

export function ResearchAdmin() {
  const [pw, setPw] = useState<string | null>(null)
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('all')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const admin = async <T,>(op: string, body: Record<string, unknown> = {}, password = pw) => studyCall<T>('admin', { password, op, ...body })
  const load = async (password = pw) => {
    if (!password) return
    setBusy(true); setErr('')
    try { const d = await admin<Data>('list', {}, password); setData(d); setPw(password); store.set(password) }
    catch (e) { const code = (e as Error).message; if (code === 'password') { store.clear(); setPw(null); setErr('That password is not right.') } else setErr('Could not load the study data.') }
    finally { setBusy(false) }
  }
  useEffect(() => { const p = store.get(); if (p) load(p) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (op: string, body: Record<string, unknown>, done: string) => {
    setBusy(true); setMsg('')
    try { const r = await admin<Record<string, number>>(op, body); setMsg(`${done}${r.changed != null ? ` (${r.changed})` : r.synced != null ? ` (${r.synced})` : ''}`); setPicked(new Set()); await load() }
    catch (e) { setMsg(`Failed: ${(e as Error).message}`) } finally { setBusy(false) }
  }

  const s = useMemo(() => {
    if (!data) return null
    const P = data.people.filter(p => p.status !== 'withdrawn')
    const closedJobs = data.jobs.filter(j => j.closing_at && (j.formats ?? 0) >= 3)
    const savings = closedJobs.filter(j => j.usual_minutes && j.active_seconds).map(j => 1 - (j.active_seconds! / 60) / j.usual_minutes!)
    const joined = P.filter(p => ['active', 'complete', 'paid'].includes(p.status))
    const starters = joined.filter(p => p.job_started)
    const finishers = new Set(closedJobs.map(j => j.participant_id))
    const second = Array.from(finishers).filter(id => data.jobs.filter(j => j.participant_id === id && j.delivered_at).length >= 2)
    const very = closedJobs.filter(j => j.disappointment === 'very').length
    return {
      applied: data.people.length, qualified: P.filter(p => p.qualified).length, selected: P.filter(p => p.status !== 'applied' && p.status !== 'not_selected').length,
      joined: joined.length, interview: joined.filter(p => p.interview_done).length, starters: starters.length, finishers: finishers.size,
      medianSaving: median(savings), second: second.length, very, closed: closedJobs.length,
      paid: P.filter(p => p.status === 'paid').length, complete: P.filter(p => p.status === 'complete').length,
      uk: P.filter(p => p.country === 'UK').length, ng: P.filter(p => p.country === 'Nigeria').length,
    }
  }, [data])

  if (!pw || !data) return (
    <main className="min-h-[100dvh] bg-void-950 text-void-100 flex items-center justify-center px-4">
      <form onSubmit={e => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem('pw') as HTMLInputElement).value; load(v) }} className="w-full max-w-sm rounded-2xl bg-[#131318] border border-void-800 p-6">
        <p className="text-[15px] font-semibold mb-4">Working Designer Study</p>
        <label className="block text-[12.5px] text-void-400 mb-1.5" htmlFor="pw">Admin password</label>
        <input id="pw" name="pw" type="password" autoFocus autoComplete="current-password" className={`w-full h-10 rounded-xl bg-void-900 border border-void-800 px-3 text-[14px] ${focus}`} />
        {err && <p className="mt-3 text-[12.5px] text-rose-300">{err}</p>}
        <button disabled={busy} className={`mt-5 w-full h-10 rounded-xl bg-white text-void-950 text-[13.5px] font-medium disabled:opacity-40 ${focus}`}>{busy ? 'Checking' : 'Open'}</button>
      </form>
    </main>
  )

  const rows = data.people.filter(p => filter === 'all' || (filter === 'qualified' ? p.qualified && p.status === 'applied' : p.status === filter))
  const toggle = (id: string) => { const n = new Set(picked); n.has(id) ? n.delete(id) : n.add(id); setPicked(n) }
  const Stat = ({ l, v, sub }: { l: string; v: string | number; sub?: string }) => (
    <div className="rounded-xl bg-[#131318] border border-void-800 px-4 py-3"><div className="text-[11.5px] text-void-400">{l}</div><div className="text-[22px] font-semibold tabular-nums">{v}</div>{sub && <div className="text-[11.5px] text-void-500">{sub}</div>}</div>
  )

  return (
    <main className="min-h-[100dvh] bg-void-950 text-void-100 px-4 sm:px-8 py-6 text-[13.5px]">
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-4"><h1 className="text-[18px] font-semibold">Working Designer Study</h1><Link href="/admin" className="text-void-400 hover:text-white">Analytics</Link></div>
        <div className="flex items-center gap-3">
          {!data.mailerlite && <span className="text-amber-300">MailerLite key missing: emails will not send</span>}
          <button onClick={() => act('resync', {}, 'Resynced with MailerLite')} disabled={busy} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-void-700 hover:border-void-500 ${focus}`}><RefreshCw size={13} />Resync MailerLite</button>
          <button onClick={() => load()} disabled={busy} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-void-700 hover:border-void-500 ${focus}`}>{busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}Refresh</button>
        </div>
      </header>

      {s && (
        <section className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <Stat l="Applied" v={s.applied} sub={`UK ${s.uk} · NG ${s.ng}`} /><Stat l="Qualified" v={s.qualified} /><Stat l="Selected" v={s.selected} /><Stat l="Joined" v={s.joined} />
          <Stat l="Interview done" v={s.interview} sub={pct(s.interview, s.joined)} /><Stat l="Finished a job" v={`${s.finishers}/${s.starters}`} sub={`${pct(s.finishers, s.starters)} of starters · pass 80%`} />
          <Stat l="Median time saved" v={s.medianSaving == null ? '–' : `${Math.round(s.medianSaving * 100)}%`} sub="pass 40%" /><Stat l="Very disappointed" v={pct(s.very, s.closed)} sub={`2nd job: ${s.second} · paid ${s.paid}`} />
        </section>
      )}

      <section className="mt-5 flex flex-wrap items-center gap-2">
        {['all', 'qualified', 'applied', 'selected', 'active', 'complete', 'paid', 'not_selected', 'withdrawn'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`h-8 px-3 rounded-lg border ${filter === f ? 'border-white text-white' : 'border-void-800 text-void-400 hover:text-white'} ${focus}`}>{f === 'qualified' ? 'Qualified, waiting' : f.replace('_', ' ')}</button>
        ))}
        <span className="flex-1" />
        {picked.size > 0 && <>
          <span className="text-void-400">{picked.size} chosen</span>
          <button onClick={() => act('select', { ids: Array.from(picked) }, 'Selected; invitation emails go out')} disabled={busy} className={`h-8 px-3 rounded-lg bg-white text-void-950 font-medium ${focus}`}>Select for study</button>
          <button onClick={() => act('not_select', { ids: Array.from(picked) }, 'Marked not selected; emails go out')} disabled={busy} className={`h-8 px-3 rounded-lg border border-void-700 ${focus}`}>Not selected</button>
          <button onClick={() => act('withdraw', { ids: Array.from(picked) }, 'Withdrawn')} disabled={busy} className={`h-8 px-3 rounded-lg border border-void-700 text-rose-300 ${focus}`}>Withdraw</button>
        </>}
      </section>
      {msg && <p className="mt-3 text-emerald-300" role="status">{msg}</p>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-void-800">
        <table className="w-full min-w-[980px]">
          <thead className="bg-[#131318] text-left text-void-400 text-[12px]"><tr>
            <th className="p-2 w-8"><span className="sr-only">Choose</span></th><th className="p-2">Ref</th><th className="p-2">Name</th><th className="p-2">Country</th><th className="p-2">Role</th><th className="p-2">Qualified</th><th className="p-2">Status</th><th className="p-2">Answers</th><th className="p-2">Job</th><th className="p-2">Applied</th><th className="p-2 w-8" />
          </tr></thead>
          <tbody>
            {rows.map(p => {
              const ans = data.answers.filter(a => a.participant_id === p.id && (a.body || a.audio_path))
              const jobs = data.jobs.filter(j => j.participant_id === p.id)
              const best = jobs.find(j => j.closing_at) || jobs.find(j => j.delivered_at) || jobs[0]
              const pay = data.payouts.find(x => x.participant_id === p.id)
              const mlErr = data.mlErrors.find(e => e.participant_id === p.id && e.name === 'ml.error')
              return (
                <Fragment key={p.id}>
                  <tr className="border-t border-void-800 align-top hover:bg-white/[0.02]">
                    <td className="p-2"><input type="checkbox" aria-label={`Choose ${p.ref}`} checked={picked.has(p.id)} onChange={() => toggle(p.id)} className="accent-[#8b7cff]" /></td>
                    <td className="p-2 tabular-nums text-void-400">{p.ref}</td>
                    <td className="p-2"><div className="text-white">{p.name}</div><div className="text-void-500">{p.email}</div></td>
                    <td className="p-2">{p.country}</td>
                    <td className="p-2">{ROLE[p.role] || p.role}{p.studio_size ? ` (${p.studio_size})` : ''}</td>
                    <td className="p-2">{p.qualified ? <span className="text-emerald-300">Yes</span> : <span className="text-void-500">No</span>}</td>
                    <td className={`p-2 ${STATUS_TONE[p.status]}`}>{p.status.replace('_', ' ')}{mlErr && <div className="text-amber-300 text-[11.5px]">MailerLite error</div>}{pay && p.status === 'complete' && <div className="text-sky-300 text-[11.5px]">Payout details in</div>}</td>
                    <td className="p-2 tabular-nums">{ans.length}/6</td>
                    <td className="p-2">{best ? <>{best.formats ?? '–'} formats · {mins(best.active_seconds)}{best.usual_minutes ? <div className="text-void-500">usual {best.usual_minutes} min</div> : null}</> : <span className="text-void-500">–</span>}</td>
                    <td className="p-2 text-void-400">{new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                    <td className="p-2"><button onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id} aria-label="Details" className={`p-1 rounded hover:bg-white/10 ${focus}`}>{open === p.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button></td>
                  </tr>
                  {open === p.id && <tr className="bg-[#0f0f13]"><td colSpan={11} className="p-4"><Detail p={p} answers={data.answers.filter(a => a.participant_id === p.id)} jobs={jobs} pay={pay} admin={admin} act={act} busy={busy} /></td></tr>}
                </Fragment>
              )
            })}
            {!rows.length && <tr><td colSpan={11} className="p-6 text-center text-void-500">Nobody here yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  )
}

function Detail({ p, answers, jobs, pay, admin, act, busy }: { p: Person; answers: Answer[]; jobs: Job[]; pay?: { method: string; details: Record<string, string> }; admin: <T>(op: string, body?: Record<string, unknown>) => Promise<T>; act: (op: string, body: Record<string, unknown>, done: string) => Promise<void>; busy: boolean }) {
  const [audio, setAudio] = useState<Record<string, string>>({})
  const [amount, setAmount] = useState(p.country === 'Nigeria' ? '' : '£10.00')
  const [method, setMethod] = useState(pay ? ({ uk_bank: 'UK bank transfer', ng_bank: 'Nigerian bank transfer', paypal: 'PayPal' } as Record<string, string>)[pay.method] : '')
  const [ref, setRef] = useState('')
  const [note, setNote] = useState(p.notes || '')
  const play = async (path: string) => { const r = await admin<{ url: string }>('audio', { path }); setAudio(a => ({ ...a, [path]: r.url })) }
  const inp = `h-8 rounded-lg bg-void-900 border border-void-800 px-2.5 ${focus}`
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="space-y-1.5">
        <h3 className="text-white font-semibold">Application</h3>
        <p>Multi-format job in last 30 days: {p.multi_format_job ? 'Yes' : 'No'}</p>
        <p>Adapts formats: {({ me: 'Themselves', junior: 'A junior or colleague', someone_else: 'Someone else' } as Record<string, string>)[p.adapted_by]}</p>
        <p>Jobs a month: {p.jobs_per_month || '–'}</p>
        <p>Tools: {p.tools?.join(', ') || '–'}</p>
        <p>Work: {p.work_type || '–'}</p>
        <p>Source: {p.source || '–'}</p>
        {p.consent && <p>Consent: recording {p.consent.recording ? 'yes' : 'no'} · quotes {p.consent.quotes ? 'yes' : 'no'} · future {p.consent.future ? 'yes' : 'no'}</p>}
        {p.invite_deadline && <p>Invite held until {p.invite_deadline}</p>}
        <div className="pt-2"><textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Private note" className={`w-full rounded-lg bg-void-900 border border-void-800 p-2 ${focus}`} />
          <button onClick={() => act('note', { id: p.id, note }, 'Note saved')} disabled={busy} className={`mt-1 h-7 px-2.5 rounded-lg border border-void-700 ${focus}`}>Save note</button></div>
      </div>
      <div className="space-y-3">
        <h3 className="text-white font-semibold">Answers</h3>
        {QUESTIONS.map(q => {
          const a = answers.find(x => x.question === q.id)
          return (
            <div key={q.id}>
              <div className="text-void-400">{q.title}</div>
              {a?.body && <p className="whitespace-pre-wrap text-void-100">{a.body}</p>}
              {a?.audio_path && (audio[a.audio_path] ? <audio controls src={audio[a.audio_path]} className="mt-1 w-full" /> : <button onClick={() => play(a.audio_path!)} className={`mt-1 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-void-700 ${focus}`}><Play size={12} />Voice note{a.audio_seconds ? ` · ${Math.round(a.audio_seconds / 60 * 10) / 10} min` : ''}</button>)}
              {!a && <p className="text-void-600">Not answered</p>}
            </div>
          )
        })}
      </div>
      <div className="space-y-3">
        <h3 className="text-white font-semibold">Jobs</h3>
        {jobs.length ? jobs.map(j => (
          <div key={j.job_key} className="rounded-lg border border-void-800 p-2.5">
            <div>Started {new Date(j.started_at).toLocaleString('en-GB')}</div>
            <div>{j.delivered_at ? `Delivered ${new Date(j.delivered_at).toLocaleString('en-GB')} · ${j.formats} formats · ${mins(j.active_seconds)} active` : 'Not delivered'}</div>
            {j.usual_minutes && <div>Usually: {j.usual_minutes} min{j.active_seconds ? ` · saved ${Math.round((1 - j.active_seconds / 60 / j.usual_minutes) * 100)}%` : ''}</div>}
            {j.disappointment && <div>Without Studio: {j.disappointment} disappointed</div>}
            {j.blocked && <div className="text-void-300 whitespace-pre-wrap">&ldquo;{j.blocked}&rdquo;</div>}
          </div>
        )) : <p className="text-void-600">No job yet</p>}
        <h3 className="text-white font-semibold pt-2">Payment</h3>
        {p.status === 'paid' && <p className="text-emerald-300">Paid {p.payout_amount} by {p.payout_method}, ref {p.payment_ref}</p>}
        {pay && <pre className="whitespace-pre-wrap rounded-lg bg-void-900 border border-void-800 p-2 text-[12.5px]">{Object.entries(pay.details).map(([k, v]) => `${k}: ${v}`).join('\n')}</pre>}
        {p.status === 'complete' && (
          <div className="flex flex-wrap gap-2 items-center">
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount, e.g. ₦21,000" aria-label="Amount" className={`${inp} w-36`} />
            <input value={method} onChange={e => setMethod(e.target.value)} placeholder="Method" aria-label="Method" className={`${inp} w-40`} />
            <input value={ref} onChange={e => setRef(e.target.value)} placeholder="Payment reference" aria-label="Reference" className={`${inp} w-40`} />
            <button onClick={() => act('mark_paid', { id: p.id, amount, method, ref }, 'Marked paid; payment email goes out')} disabled={busy || !amount || !method || !ref} className={`h-8 px-3 rounded-lg bg-white text-void-950 font-medium disabled:opacity-40 ${focus}`}>Mark paid</button>
          </div>
        )}
        {p.status !== 'paid' && <button onClick={() => { if (window.prompt(`Type DELETE to erase ${p.ref} and all their answers and recordings.`) === 'DELETE') act('delete', { ids: [p.id] }, 'Deleted') }} className="text-rose-300 text-[12.5px] underline underline-offset-2">Delete this person's data</button>}
      </div>
    </div>
  )
}
