'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowDownRight, Bug, ArrowUpRight, CheckCircle2, Frown, Info, KeyRound, Lightbulb, LogOut, Meh, RefreshCw, Smile, XCircle } from 'lucide-react'
import { AI_LABEL, AREA_LABEL, FORMAT_LABEL, IMPORT_LABEL, change, changePassword, fmtPct, loadDashboard, pct, place, setFeedbackStatus, type Dash, type FeedbackRow } from './data'
import { buildInsights, type Tone } from './insights'
import { DailyBars, Funnel, Heatmap, Ranked } from './charts'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const PW_KEY = 'vc-admin-pw'
const PERIODS = [{ d: 1, l: 'Today', s: '1d' }, { d: 7, l: '7 days', s: '7d' }, { d: 30, l: '30 days', s: '30d' }, { d: 90, l: '90 days', s: '90d' }]
const METRICS = [
  { k: 'visitors', l: 'Visitors' }, { k: 'new_visitors', l: 'New visitors' }, { k: 'sessions', l: 'Visits' },
  { k: 'started', l: 'Designs started' }, { k: 'exports', l: 'Exports' }, { k: 'errors', l: 'Errors' }, { k: 'feedback', l: 'Feedback' },
] as const

const store = {
  get() { try { return sessionStorage.getItem(PW_KEY) || localStorage.getItem(PW_KEY) || '' } catch { return '' } },
  set(pw: string, remember: boolean) { try { sessionStorage.setItem(PW_KEY, pw); if (remember) localStorage.setItem(PW_KEY, pw) } catch { /* ignore */ } },
  clear() { try { sessionStorage.removeItem(PW_KEY); localStorage.removeItem(PW_KEY) } catch { /* ignore */ } },
}

function Card({ title, sub, children, className = '', right }: { title: string; sub?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`rounded-2xl bg-[#131318] border border-void-800/80 p-4 sm:p-5 min-w-0 ${className}`}>
      <header className="flex items-start justify-between gap-3 mb-4">
        <div><h2 className="text-[14px] font-semibold text-void-50">{title}</h2>{sub && <p className="text-[12px] text-void-500 mt-0.5">{sub}</p>}</div>
        {right}
      </header>
      {children}
    </section>
  )
}

function Delta({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  const c = change(cur, prev)
  if (c === null) return <span className="text-[11.5px] text-void-500">new</span>
  if (Math.abs(c) < 0.005) return <span className="text-[11.5px] text-void-500">no change</span>
  const up = c > 0; const good = invert ? !up : up
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return <span className={`inline-flex items-center gap-0.5 text-[11.5px] tabular-nums ${good ? 'text-emerald-400' : 'text-rose-400'}`}><Icon size={13} />{fmtPct(Math.abs(c))}</span>
}

function Kpi({ label, value, foot }: { label: string; value: string; foot?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#131318] border border-void-800/80 px-4 py-3.5 min-w-0">
      <p className="text-[12px] text-void-400 truncate">{label}</p>
      <p className="mt-1 text-[26px] leading-none font-semibold tracking-tight tabular-nums text-void-50">{value}</p>
      <div className="mt-2 h-4 text-[11.5px] text-void-500 truncate">{foot}</div>
    </div>
  )
}

const TONE: Record<Tone, { Icon: any; cls: string; label: string }> = {
  good: { Icon: CheckCircle2, cls: 'text-emerald-400', label: 'Good' },
  warn: { Icon: AlertTriangle, cls: 'text-amber-300', label: 'Watch' },
  bad: { Icon: XCircle, cls: 'text-rose-400', label: 'Fix' },
  info: { Icon: Info, cls: 'text-sky-300', label: 'Note' },
}
const MOOD = { 1: { Icon: Frown, l: 'Not good', cls: 'text-rose-300' }, 2: { Icon: Meh, l: 'It’s okay', cls: 'text-amber-200' }, 3: { Icon: Smile, l: 'Love it', cls: 'text-emerald-300' } } as const

function secs(s: number) { if (!s) return '0s'; const m = Math.floor(s / 60); return m ? `${m}m ${Math.round(s % 60)}s` : `${Math.round(s)}s` }
function ago(ts: string) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000
  if (d < 60) return 'just now'; if (d < 3600) return `${Math.floor(d / 60)}m ago`; if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function Login({ onOk }: { onOk: (pw: string, d: Dash) => void }) {
  const [pw, setPw] = useState(''); const [remember, setRemember] = useState(false)
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { const d = await loadDashboard(pw, 30); store.set(pw, remember); onOk(pw, d) }
    catch (x) { const m = (x as Error).message; setErr(m === 'wrong_password' ? 'That password is not right.' : m === 'locked' ? 'Too many wrong tries. Wait 15 minutes.' : 'Could not reach the server.') }
    finally { setBusy(false) }
  }
  return (
    <main className="min-h-[100dvh] bg-void-950 text-void-100 flex items-center justify-center px-4">
      <form onSubmit={go} className="w-full max-w-sm rounded-2xl bg-[#131318] border border-void-800 p-6">
        <div className="flex items-center gap-2.5 mb-5"><span className="w-7 h-7 bg-white rounded-md flex items-center justify-center text-void-950 font-bold text-sm">V</span><span className="text-[15px] font-semibold">Voidcanvas analytics</span></div>
        <label className="block text-[12.5px] text-void-400 mb-1.5" htmlFor="pw">Password</label>
        <input id="pw" type="password" autoFocus value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password"
          className={`w-full h-10 rounded-xl bg-void-900 border border-void-800 px-3 text-[14px] ${focus}`} />
        <label className="mt-3 flex items-center gap-2 text-[12.5px] text-void-400"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="w-4 h-4 accent-[#8b7cff]" />Remember on this device</label>
        {err && <p className="mt-3 text-[12.5px] text-rose-300">{err}</p>}
        <button disabled={busy || !pw} className={`mt-5 w-full h-10 rounded-xl bg-white text-void-950 text-[13.5px] font-medium disabled:opacity-40 ${focus}`}>{busy ? 'Checking' : 'Open dashboard'}</button>
      </form>
    </main>
  )
}

export function Dashboard() {
  const [pw, setPw] = useState<string | null>(null)
  const [data, setData] = useState<Dash | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [metric, setMetric] = useState<(typeof METRICS)[number]['k']>('visitors')
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [fbFilter, setFbFilter] = useState<'all' | 'new' | 'bug' | 1 | 2 | 3>('all')
  const [showTable, setShowTable] = useState(false)
  const [booting, setBooting] = useState(true)

  // Human names for command ids, straight from the editor's action list, so the dashboard never drifts from the app.
  useEffect(() => {
    Promise.all([import('@/editor/actions'), import('@/components/EffectSelector'), import('@/editor/components/ToolRail')]).then(([a, e, r]) => {
      const m: Record<string, string> = {}
      for (const [id, act] of Object.entries(a.buildActions())) m[id] = act.label
      for (const fx of e.effects) m[fx.id] = fx.name
      for (const tl of r.TOOLS) m['tool.' + tl.id] = `${tl.label} tool`
      setLabels(m)
    }).catch(() => {})
  }, [])

  const load = useCallback(async (p: string, d: number) => {
    setLoading(true); setErr('')
    try { setData(await loadDashboard(p, d)) }
    catch (x) { const m = (x as Error).message; if (m === 'wrong_password') { store.clear(); setPw(null) } else setErr(m === 'locked' ? 'Locked for 15 minutes after wrong passwords.' : 'Could not load. Check your connection.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { const p = store.get(); if (p) { setPw(p); load(p, days).finally(() => setBooting(false)) } else setBooting(false) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!pw) return; const t = setInterval(() => load(pw, days), 5 * 60 * 1000); return () => clearInterval(t) }, [pw, days, load])

  const insights = useMemo(() => (data ? buildInsights(data, labels) : []), [data, labels])

  if (booting) return <main className="min-h-[100dvh] bg-void-950" />
  if (!pw || !data) return <Login onOk={(p, d) => { setPw(p); setData(d); setDays(30) }} />

  const t = data.totals, f = data.funnel
  const exportRate = pct(f.exported, f.sessions)
  const returnRate = pct(data.retention.came_back, data.retention.cohort)
  const pick = (d: number) => { setDays(d); load(pw, d) }
  const updateStatus = async (row: FeedbackRow, status: FeedbackRow['status']) => {
    setData({ ...data, feedback: data.feedback.map(x => (x.id === row.id ? { ...x, status } : x)) })
    try { await setFeedbackStatus(pw, row.id, status) } catch { /* shown on next refresh */ }
  }
  const fb = data.feedback.filter(x => fbFilter === 'all' ? true : fbFilter === 'new' ? x.status === 'new' : fbFilter === 'bug' ? x.context?.kind === 'bug' : x.mood === fbFilter)
  const used = new Set(data.actions.map(a => a.id))
  const unused = Object.keys(labels).filter(k => k.includes('.') && !used.has(k) && !/^(scale|density|ws|panel|fx)\./.test(k))
  const exportsByFormat = Object.entries(data.exports.reduce<Record<string, number>>((m, e) => { const k = FORMAT_LABEL[e.format] || e.format.toUpperCase(); m[k] = (m[k] || 0) + e.n; return m }, {})).sort((a, b) => b[1] - a[1])
  const devTotal = data.devices.reduce((s, x) => s + x.n, 0) || 1
  const tzTotal = data.timezones.reduce((s, x) => s + x.n, 0) || 1
  const moodTotal = data.feedback_moods['1'] + data.feedback_moods['2'] + data.feedback_moods['3']
  const periodLabel = PERIODS.find(p => p.d === days)?.l.toLowerCase() || `${days} days`

  return (
    <main className="min-h-[100dvh] bg-void-950 text-void-100">
      <header className="sticky top-0 z-20 bg-void-950/90 backdrop-blur border-b border-void-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <span className="w-7 h-7 bg-white rounded-md flex items-center justify-center text-void-950 font-bold text-sm shrink-0">V</span>
          <h1 className="text-[15px] font-semibold truncate">Analytics</h1>
          <div className="ml-auto flex items-center gap-1 rounded-lg bg-void-900 p-0.5 border border-void-800">
            {PERIODS.map(p => <button key={p.d} onClick={() => pick(p.d)} aria-pressed={days === p.d} className={`px-2 sm:px-2.5 h-7 rounded-md text-[12px] ${focus} ${days === p.d ? 'bg-void-700 text-white' : 'text-void-400 hover:text-white'}`}><span className="sm:hidden">{p.s}</span><span className="hidden sm:inline whitespace-nowrap">{p.l}</span></button>)}
          </div>
          <button onClick={() => load(pw, days)} aria-label="Refresh" title={`Updated ${ago(data.generated_at)}`} className={`w-8 h-8 rounded-lg flex items-center justify-center text-void-400 hover:text-white hover:bg-void-900 ${focus}`}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={() => { store.clear(); setPw(null); setData(null) }} aria-label="Sign out" className={`w-8 h-8 rounded-lg flex items-center justify-center text-void-400 hover:text-white hover:bg-void-900 ${focus}`}><LogOut size={15} /></button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {err && <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-[13px] text-rose-200">{err}</p>}

        <p className="text-[13px] text-void-400">Today so far: <b className="text-void-100 font-medium tabular-nums">{data.today.visitors}</b> visitors, <b className="text-void-100 font-medium tabular-nums">{data.today.sessions}</b> visits, <b className="text-void-100 font-medium tabular-nums">{data.today.exports}</b> exports. Days run midnight to midnight UK time.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Visitors" value={t.visitors.toLocaleString()} foot={<><Delta cur={t.visitors} prev={t.visitors_prev} /> <span>vs previous</span></>} />
          <Kpi label="Visits" value={t.sessions.toLocaleString()} foot={<><Delta cur={t.sessions} prev={t.sessions_prev} /> <span>{t.new_visitors} first-timers</span></>} />
          <Kpi label="Exports" value={t.exports.toLocaleString()} foot={<><Delta cur={t.exports} prev={t.exports_prev} /> <span>vs previous</span></>} />
          <Kpi label="Visits that export" value={fmtPct(exportRate)} foot="the success number" />
          <Kpi label="New visitors who came back" value={data.retention.cohort ? fmtPct(returnRate) : 'n/a'} foot={`${data.retention.came_back} of ${data.retention.cohort}`} />
          <Kpi label="Typical visit length" value={secs(t.median_session_sec)} foot="median" />
          <Kpi label="Errors" value={t.errors.toLocaleString()} foot={<><Delta cur={t.errors} prev={t.errors_prev} invert /> <span>{data.event_users['error'] || 0} people</span></>} />
          <Kpi label="Feedback" value={t.feedback.toLocaleString()} foot={`${data.feedback.filter(x => x.status === 'new').length} unread`} />
        </div>

        <Card title="What the numbers say" sub={`Worked out from ${periodLabel}. Most important first.`} right={<Lightbulb size={16} className="text-accent-light" />}>
          {insights.length ? (
            <ul className="divide-y divide-void-800/70">
              {insights.map((i, n) => { const T = TONE[i.tone]; return (
                <li key={n} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <T.Icon size={17} className={`mt-0.5 shrink-0 ${T.cls}`} aria-hidden />
                  <div className="min-w-0"><p className="text-[13.5px] text-void-50"><span className={`mr-2 text-[11px] font-semibold uppercase tracking-wide ${T.cls}`}>{T.label}</span>{i.title}</p><p className="text-[12.5px] text-void-400 mt-0.5 leading-relaxed">{i.detail}</p></div>
                </li>
              ) })}
            </ul>
          ) : <p className="text-[13px] text-void-500">No data yet. Visit the live site once and refresh.</p>}
        </Card>

        <Card title="Day by day" sub="Hover a bar for the exact number"
          right={<button onClick={() => setShowTable(!showTable)} className={`text-[12px] text-void-400 hover:text-white ${focus}`}>{showTable ? 'Show chart' : 'Show table'}</button>}>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {METRICS.map(m => <button key={m.k} onClick={() => setMetric(m.k)} aria-pressed={metric === m.k} className={`px-2.5 h-7 rounded-full text-[12px] border ${focus} ${metric === m.k ? 'bg-white text-void-950 border-white' : 'border-void-800 text-void-400 hover:text-white'}`}>{m.l}</button>)}
          </div>
          {showTable ? (
            <div className="overflow-x-auto max-h-80"><table className="w-full text-[12.5px] tabular-nums">
              <thead className="text-void-500 text-left sticky top-0 bg-[#131318]"><tr><th className="py-1.5 pr-3 font-normal">Day</th>{METRICS.map(m => <th key={m.k} className="py-1.5 px-2 font-normal text-right">{m.l}</th>)}</tr></thead>
              <tbody>{[...data.daily].reverse().map(r => <tr key={r.dt} className="border-t border-void-800/60"><td className="py-1.5 pr-3 text-void-300">{r.dt}</td>{METRICS.map(m => <td key={m.k} className="py-1.5 px-2 text-right text-void-100">{(r as any)[m.k]}</td>)}</tr>)}</tbody>
            </table></div>
          ) : <DailyBars rows={data.daily.map(r => ({ dt: r.dt, v: (r as any)[metric] as number }))} label={METRICS.find(m => m.k === metric)!.l} />}
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="From arrival to export" sub="How many visits reach each step">
            <Funnel steps={[{ label: 'Arrived', v: f.sessions }, { label: 'Opened a tool', v: f.used_tool }, { label: 'Started a design or loaded an image', v: f.made_something }, { label: 'Exported something', v: f.exported }]} />
          </Card>
          <Card title="Where people spend time" sub="Visits that opened each part">
            <Ranked rows={data.areas.map(a => ({ key: a.area, label: AREA_LABEL[a.area] || a.area, v: a.sessions, sub: `${a.visitors} people` }))} />
          </Card>

          <Card title="Commands used" sub="From menus, the command palette and shortcuts">
            <Ranked rows={data.actions.map(a => ({ key: a.id, label: labels[a.id] || a.id, v: a.n, sub: `${a.users}p` }))} empty="No commands used yet" />
            {unused.length > 0 && data.funnel.sessions >= 5 && (
              <details className="mt-3 text-[12.5px]"><summary className="cursor-pointer text-void-400 hover:text-white">{unused.length} commands nobody used in this period</summary>
                <p className="mt-2 text-void-400 leading-relaxed">{unused.map(k => labels[k]).join(', ')}</p></details>
            )}
          </Card>
          <Card title="Effects" sub="Picked in Effects, the single tools and Filter menu">
            <Ranked rows={[...data.effects.map(e => ({ key: 'e' + e.id, label: labels[e.id] || e.id, v: e.n, sub: `${e.users}p` })), ...data.actions.filter(a => a.id.startsWith('fx.')).map(a => ({ key: a.id, label: `${labels[a.id] || a.id} (Editor filter)`, v: a.n, sub: `${a.users}p` }))].sort((a, b) => b.v - a.v)} empty="No effects used yet" />
          </Card>

          <Card title="What people export" sub="File types downloaded or copied">
            <Ranked rows={exportsByFormat.map(([k, v]) => ({ key: k, label: k, v }))} empty="No exports yet" />
          </Card>
          <Card title="What people bring in" sub="Files opened and work passed between tools">
            <Ranked rows={[...data.imports.map(i => ({ key: i.kind, label: IMPORT_LABEL[i.kind] || i.kind, v: i.n })), ...(data.event_counts['doc.new'] ? [{ key: 'new', label: 'Blank design from a size preset', v: data.event_counts['doc.new'] }] : []), ...(data.event_counts['doc.open'] ? [{ key: 'open', label: 'Reopened a saved design', v: data.event_counts['doc.open'] }] : [])].sort((a, b) => b.v - a.v)} empty="Nothing opened yet" />
          </Card>

          <Card title="On-device AI" sub="Runs, failures and typical time on real devices">
            {data.ai.length ? (
              <table className="w-full text-[12.5px] tabular-nums">
                <thead className="text-void-500 text-left"><tr><th className="pb-2 font-normal">Tool</th><th className="pb-2 font-normal text-right">Runs</th><th className="pb-2 font-normal text-right">Failed</th><th className="pb-2 font-normal text-right">Typical time</th></tr></thead>
                <tbody>{data.ai.map(a => { const fr = pct(a.failed, a.n); return (
                  <tr key={a.tool} className="border-t border-void-800/60"><td className="py-2 pr-2 text-void-100">{AI_LABEL[a.tool] || a.tool}</td><td className="py-2 text-right">{a.n}</td><td className={`py-2 text-right ${fr > 0.15 ? 'text-rose-300' : 'text-void-200'}`}>{fmtPct(fr)}</td><td className="py-2 text-right">{a.median_ms ? `${(a.median_ms / 1000).toFixed(1)}s` : 'n/a'}</td></tr>
                ) })}</tbody>
              </table>
            ) : <p className="text-[13px] text-void-500 py-6 text-center">No AI runs yet</p>}
            <p className="mt-3 text-[12px] text-void-500">Model downloads accepted: {data.event_counts['ai.download'] || 0}. Declined: {data.event_counts['ai.declined'] || 0}.</p>
          </Card>
          <Card title="Errors" sub="Grouped by message. Fix the top one first.">
            {data.errors_top.length ? (
              <ul className="space-y-2.5">
                {data.errors_top.map((e, i) => (
                  <li key={i} className="text-[12.5px]"><p className="text-void-100 font-mono text-[12px] break-words">{e.msg}</p>
                    <p className="text-void-500 mt-0.5">{e.n} times · {e.users} {e.users === 1 ? 'person' : 'people'} · {AREA_LABEL[e.area || ''] || e.area} · last {ago(e.last)}</p></li>
                ))}
              </ul>
            ) : <p className="text-[13px] text-void-500 py-6 text-center">No errors. Good.</p>}
          </Card>

          <Card title="Devices and browsers" sub="People, not visits">
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['desktop', 'mobile', 'tablet'].map(k => { const n = data.devices.find(x => x.device === k)?.n || 0; return (
                <div key={k} className="rounded-xl bg-void-900 px-3 py-2.5"><p className="text-[11.5px] text-void-500 capitalize">{k}</p><p className="text-[18px] font-semibold tabular-nums">{fmtPct(n / devTotal)}</p><p className="text-[11px] text-void-500 tabular-nums">{n}</p></div>
              ) })}
            </div>
            <Ranked rows={data.browsers.map(b => ({ key: b.browser + b.os, label: `${b.browser} on ${b.os}`, v: b.n }))} max={6} />
          </Card>
          <Card title="Where people are and how they found you" sub="Location from device time zone. Source from the referring site or ?utm_source=">
            <Ranked rows={data.timezones.map(z => ({ key: z.tz, label: place(z.tz), v: z.n, sub: fmtPct(z.n / tzTotal) }))} max={6} />
            <div className="h-px bg-void-800/70 my-4" />
            <Ranked rows={data.referrers.map(r => ({ key: r.source, label: r.source === 'direct' ? 'Direct or unknown' : r.source, v: r.n }))} max={6} empty="No visits yet" />
          </Card>
        </div>

        <Card title="When people use it" sub="Visits by weekday and hour, Lagos time (UK summer time is the same hour)">
          <Heatmap cells={data.hours} />
        </Card>

        <Card title="Feedback" sub={moodTotal ? `${data.feedback_moods['3']} Love it · ${data.feedback_moods['2']} It’s okay · ${data.feedback_moods['1']} Not good` : 'Nothing yet. People send it from the Feedback button or Help menu.'}>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {([['all', 'All'], ['new', 'Unread'], ['bug', 'Bug reports'], [1, 'Not good'], [2, 'It’s okay'], [3, 'Love it']] as const).map(([k, l]) => (
              <button key={String(k)} onClick={() => setFbFilter(k)} aria-pressed={fbFilter === k} className={`px-2.5 h-7 rounded-full text-[12px] border ${focus} ${fbFilter === k ? 'bg-white text-void-950 border-white' : 'border-void-800 text-void-400 hover:text-white'}`}>{l}</button>
            ))}
          </div>
          {fb.length ? (
            <ul className="divide-y divide-void-800/70">
              {fb.map(x => { const M = x.mood ? MOOD[x.mood] : null; return (
                <li key={x.id} className={`py-3 flex gap-3 ${x.status === 'done' ? 'opacity-50' : ''}`}>
                  <span className={`mt-0.5 shrink-0 ${x.context?.kind === 'bug' ? 'text-rose-300' : M ? M.cls : 'text-void-500'}`} title={x.context?.kind === 'bug' ? 'Bug report' : M?.l}>{x.context?.kind === 'bug' ? <Bug size={18} /> : M ? <M.Icon size={18} /> : <Info size={18} />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] text-void-50 whitespace-pre-wrap break-words">{x.message || <span className="text-void-500">{M ? M.l : 'No message'}, no comment</span>}</p>
                    <p className="text-[11.5px] text-void-500 mt-1">{ago(x.ts)} · {AREA_LABEL[x.area || ''] || x.area} · {x.context?.device} {x.context?.browser}{x.context?.tz ? ` · ${place(x.context.tz)}` : ''}{x.context?.trigger === 'after-export' ? ' · asked after export' : ''}{x.context?.kind === 'bug' ? ` · bug: ${x.context.severity || '?'}, ${x.context.frequency || '?'}${x.context.os ? `, ${x.context.os}` : ''}${x.context.screen ? ` ${x.context.screen}` : ''}` : ''}{x.context?.recent ? ` · last used: ${String(x.context.recent).split(',').map((k: string) => labels[k] || k).join(', ')}` : ''}</p>
                    {x.context?.kind === 'bug' && x.context?.errors && <p className="mt-1 text-[11.5px] font-mono text-rose-300/80 break-words">Errors: {String(x.context.errors)}</p>}
                    {x.email && <a href={`mailto:${x.email}?subject=${encodeURIComponent('Your Voidcanvas feedback')}`} className="text-[12px] text-accent-light hover:text-white">Reply to {x.email}</a>}
                  </div>
                  <div className="flex gap-1 shrink-0 self-start">
                    {x.status === 'new' && <button onClick={() => updateStatus(x, 'read')} className={`h-7 px-2 rounded-md text-[11.5px] border border-void-700 text-void-300 hover:text-white ${focus}`}>Read</button>}
                    {x.status !== 'done' ? <button onClick={() => updateStatus(x, 'done')} className={`h-7 px-2 rounded-md text-[11.5px] border border-void-700 text-void-300 hover:text-white ${focus}`}>Done</button>
                      : <button onClick={() => updateStatus(x, 'read')} className={`h-7 px-2 rounded-md text-[11.5px] text-void-400 hover:text-white ${focus}`}>Reopen</button>}
                  </div>
                </li>
              ) })}
            </ul>
          ) : <p className="text-[13px] text-void-500 py-4 text-center">Nothing here</p>}
        </Card>

        <footer className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-8 text-[12px] text-void-500">
          <span>{t.all_time_visitors.toLocaleString()} people have used Voidcanvas since tracking started. Anonymous counts only, no images or file names. Refreshes every 5 minutes.</span>
          <PasswordChange pw={pw} onChanged={p => { setPw(p); store.set(p, !!(() => { try { return localStorage.getItem(PW_KEY) } catch { return null } })()) }} />
        </footer>
      </div>
    </main>
  )
}

function PasswordChange({ pw, onChanged }: { pw: string; onChanged: (p: string) => void }) {
  const [open, setOpen] = useState(false); const [next, setNext] = useState(''); const [msg, setMsg] = useState('')
  if (!open) return <button onClick={() => setOpen(true)} className={`inline-flex items-center gap-1.5 hover:text-white ${focus}`}><KeyRound size={13} />Change password</button>
  return (
    <form className="flex items-center gap-2" onSubmit={async e => { e.preventDefault(); try { await changePassword(pw, next); onChanged(next); setMsg('Changed.'); setNext(''); setTimeout(() => setOpen(false), 1200) } catch (x) { setMsg((x as Error).message === 'too_short' ? 'Use 12 or more characters.' : 'Could not change it.') } }}>
      <input type="password" value={next} onChange={e => setNext(e.target.value)} placeholder="New password (12+ characters)" autoComplete="new-password" className={`h-8 w-56 rounded-lg bg-void-900 border border-void-800 px-2.5 text-[12.5px] text-void-100 ${focus}`} />
      <button className={`h-8 px-3 rounded-lg bg-white text-void-950 text-[12.5px] font-medium ${focus}`}>Save</button>
      {msg && <span>{msg}</span>}
    </form>
  )
}
