'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { activationRate, loadGrowthAttribution, type GrowthAttribution } from '@/growth/data'
import { GrowthExperimentsPanel } from './GrowthExperiments'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const periods = [7, 30, 90] as const
const pct = (n: number) => `${Math.round(n * 100)}%`

export function GrowthAttributionPanel({ password }: { password: string }) {
  const [days, setDays] = useState<number>(30)
  const [data, setData] = useState<GrowthAttribution | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async (d = days) => {
    setBusy(true); setError('')
    try { setData(await loadGrowthAttribution(password, d)) }
    catch (e) {
      const msg = (e as Error).message
      setError(/404|Request failed/.test(msg) ? 'Growth attribution is not live in Supabase yet. Apply the additive vc_admin_growth migration; the rest of Growth OS can continue safely without it.' : msg)
    } finally { setBusy(false) }
  }

  useEffect(() => { load(days) }, [password]) // eslint-disable-line react-hooks/exhaustive-deps

  const best = useMemo(() => data?.sources?.filter(x => x.sessions >= 2).sort((a, b) => activationRate(b.activated, b.sessions) - activationRate(a.activated, a.sessions))[0], [data])

  return <>
    <section className="mt-6 rounded-2xl border border-void-800 bg-[#111116] p-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <h2 className="font-semibold">Activation attribution</h2>
          <p className="mt-1 text-[12.5px] text-void-400">Which sources and landing pages produce designers who actually work and finish something.</p>
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-lg bg-void-900 p-0.5 border border-void-800">
          {periods.map(d => <button key={d} onClick={() => { setDays(d); load(d) }} className={`h-7 px-2.5 rounded-md text-[12px] ${days === d ? 'bg-void-700 text-white' : 'text-void-400 hover:text-white'} ${focus}`}>{d}d</button>)}
        </div>
        <button onClick={() => load()} aria-label="Refresh attribution" className={`w-8 h-8 rounded-lg border border-void-800 inline-flex items-center justify-center text-void-400 hover:text-white ${focus}`}><RefreshCw size={14} className={busy ? 'animate-spin' : ''} /></button>
      </div>

      {busy && !data && <div className="mt-5 h-20 flex items-center justify-center text-void-500"><Loader2 size={16} className="animate-spin mr-2" />Loading attribution</div>}
      {error && <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[12.5px] text-amber-100 flex gap-2"><AlertTriangle size={15} className="shrink-0 mt-0.5" /><span>{error}</span></div>}

      {data && <>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Metric label="Sessions" value={data.totals.sessions} />
          <Metric label="Designers" value={data.totals.designers} />
          <Metric label="Started" value={data.totals.started} />
          <Metric label="Worked" value={data.totals.worked} />
          <Metric label="Activated" value={data.totals.activated} accent />
          <Metric label="Activation rate" value={pct(activationRate(data.totals.activated, data.totals.sessions))} />
        </div>

        {best && <p className="mt-3 text-[12.5px] text-void-300">Best qualified source right now: <b className="text-white">{best.source}</b> at <b className="text-emerald-300">{pct(activationRate(best.activated, best.sessions))}</b> activation from {best.sessions} sessions.</p>}

        <div className="mt-4 grid xl:grid-cols-2 gap-4">
          <RankTable title="Sources" rows={data.sources.slice(0, 15).map(x => ({ name: x.source || 'direct / unknown', sessions: x.sessions, activated: x.activated, exported: x.exported }))} />
          <RankTable title="Landing pages" rows={data.landings.slice(0, 15).map(x => ({ name: x.landing, sessions: x.sessions, activated: x.activated, exported: x.exported }))} />
        </div>

        {data.campaigns.length > 0 && <div className="mt-4 rounded-xl border border-void-800 overflow-x-auto">
          <table className="w-full min-w-[720px] text-[12.5px]">
            <thead className="bg-[#15151b] text-void-400 text-left"><tr><th className="p-3">Campaign</th><th className="p-3">Source</th><th className="p-3">Medium</th><th className="p-3">Content</th><th className="p-3 text-right">Sessions</th><th className="p-3 text-right">Activated</th><th className="p-3 text-right">Rate</th></tr></thead>
            <tbody>{data.campaigns.slice(0, 20).map((x, i) => <tr key={`${x.source}-${x.campaign}-${x.content}-${i}`} className="border-t border-void-800"><td className="p-3 text-white">{x.campaign || '—'}</td><td className="p-3">{x.source || '—'}</td><td className="p-3">{x.medium || '—'}</td><td className="p-3 text-void-400">{x.content || '—'}</td><td className="p-3 text-right tabular-nums">{x.sessions}</td><td className="p-3 text-right tabular-nums">{x.activated}</td><td className="p-3 text-right tabular-nums text-emerald-300">{pct(activationRate(x.activated, x.sessions))}</td></tr>)}</tbody>
          </table>
        </div>}

        <p className="mt-3 text-[11.5px] text-void-500">Activation: {data.definition}</p>
      </>}
    </section>
    <GrowthExperimentsPanel password={password} days={days} />
  </>
}

function Metric({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return <div className="rounded-xl bg-[#131318] border border-void-800 px-3 py-3"><div className="text-[11px] text-void-500">{label}</div><div className={`mt-0.5 text-[20px] font-semibold tabular-nums ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</div></div>
}

function RankTable({ title, rows }: { title: string; rows: { name: string; sessions: number; activated: number; exported: number }[] }) {
  return <div className="rounded-xl border border-void-800 overflow-hidden"><div className="px-3 py-2.5 bg-[#15151b] text-[12px] font-medium">{title}</div><table className="w-full text-[12px]"><thead className="text-void-500 text-left"><tr><th className="p-2.5">Name</th><th className="p-2.5 text-right">Visits</th><th className="p-2.5 text-right">Activated</th><th className="p-2.5 text-right">Rate</th><th className="p-2.5 text-right">Exports</th></tr></thead><tbody>{rows.map((x, i) => <tr key={`${x.name}-${i}`} className="border-t border-void-800"><td className="p-2.5 max-w-[280px] truncate text-void-200" title={x.name}>{x.name}</td><td className="p-2.5 text-right tabular-nums">{x.sessions}</td><td className="p-2.5 text-right tabular-nums">{x.activated}</td><td className="p-2.5 text-right tabular-nums text-emerald-300">{pct(activationRate(x.activated, x.sessions))}</td><td className="p-2.5 text-right tabular-nums text-void-400">{x.exported}</td></tr>)}</tbody></table></div>
}
