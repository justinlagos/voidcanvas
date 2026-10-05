'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, FlaskConical, Loader2, RefreshCw } from 'lucide-react'
import { activationRate, loadGrowthExperiments, type GrowthExperiments } from '@/growth/data'
import { assessExperiment } from '@/growth/experiments'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const pct = (n: number) => `${Math.round(n * 100)}%`

export function GrowthExperimentsPanel({ password, days = 30 }: { password: string; days?: number }) {
  const [data, setData] = useState<GrowthExperiments | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setBusy(true); setError('')
    try { setData(await loadGrowthExperiments(password, days)) }
    catch (e) {
      const msg = (e as Error).message
      setError(/404|Request failed/.test(msg) ? 'Experiment reporting is not live in Supabase yet. Apply the additive vc_admin_experiments migration; experiment links remain safe to use meanwhile.' : msg)
    } finally { setBusy(false) }
  }

  useEffect(() => { load() }, [password, days]) // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    if (!data) return []
    return data.experiments.map(exp => {
      const variants = data.variants.filter(v => v.experiment === exp.experiment)
      return { ...exp, variants, assessment: assessExperiment(variants) }
    })
  }, [data])

  return (
    <section className="mt-6 rounded-2xl border border-void-800 bg-[#111116] p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg border border-void-800 bg-void-900 flex items-center justify-center text-violet-300"><FlaskConical size={15} /></div>
        <div><h2 className="font-semibold">Experiments</h2><p className="mt-0.5 text-[12.5px] text-void-400">Variant outcomes measured by activated designers, with minimum-evidence guardrails.</p></div>
        <button onClick={load} aria-label="Refresh experiments" className={`ml-auto w-8 h-8 rounded-lg border border-void-800 inline-flex items-center justify-center text-void-400 hover:text-white ${focus}`}><RefreshCw size={14} className={busy ? 'animate-spin' : ''} /></button>
      </div>

      {busy && !data && <div className="mt-5 h-16 flex items-center justify-center text-void-500"><Loader2 size={15} className="animate-spin mr-2" />Loading experiments</div>}
      {error && <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[12.5px] text-amber-100 flex gap-2"><AlertTriangle size={15} className="shrink-0 mt-0.5" /><span>{error}</span></div>}

      {data && grouped.length === 0 && <p className="mt-4 rounded-xl border border-void-800 px-4 py-4 text-[12.5px] text-void-400">No experiment exposures in this period. Campaign links with both <code>vc_exp</code> and <code>vc_var</code> will appear here after real use.</p>}

      {data && grouped.length > 0 && <div className="mt-4 space-y-3">
        {grouped.map(exp => {
          const a = exp.assessment
          return <div key={exp.experiment} className="rounded-xl border border-void-800 overflow-hidden">
            <div className="px-4 py-3 bg-[#15151b] flex flex-wrap items-center gap-3">
              <div><div className="font-medium text-white">{exp.experiment}</div><div className="text-[11.5px] text-void-500">{exp.sessions} exposed sessions · {exp.activated} activated</div></div>
              <span className={`ml-auto text-[11.5px] px-2 py-1 rounded-md border ${a.signal === 'strong' ? 'border-emerald-500/30 text-emerald-300' : a.signal === 'collecting' ? 'border-amber-500/30 text-amber-300' : 'border-void-700 text-void-300'}`}>{a.label}</span>
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-[12px]"><thead className="text-void-500 text-left"><tr><th className="p-2.5">Variant</th><th className="p-2.5 text-right">Sessions</th><th className="p-2.5 text-right">Started</th><th className="p-2.5 text-right">Worked</th><th className="p-2.5 text-right">Activated</th><th className="p-2.5 text-right">Rate</th><th className="p-2.5 text-right">Exports</th></tr></thead><tbody>{[...exp.variants].sort((x, y) => activationRate(y.activated, y.sessions) - activationRate(x.activated, x.sessions)).map(v => <tr key={v.variant} className="border-t border-void-800"><td className="p-2.5 text-white">{v.variant}</td><td className="p-2.5 text-right tabular-nums">{v.sessions}</td><td className="p-2.5 text-right tabular-nums">{v.started}</td><td className="p-2.5 text-right tabular-nums">{v.worked}</td><td className="p-2.5 text-right tabular-nums">{v.activated}</td><td className="p-2.5 text-right tabular-nums text-emerald-300">{pct(activationRate(v.activated, v.sessions))}</td><td className="p-2.5 text-right tabular-nums text-void-400">{v.exported}</td></tr>)}</tbody></table></div>
            {!a.directionalEvidence && <p className="px-4 py-2.5 border-t border-void-800 text-[11.5px] text-void-500">No directional call: every variant needs at least 25 exposed sessions.</p>}
            {a.directionalEvidence && !a.autoAllocationEligible && <p className="px-4 py-2.5 border-t border-void-800 text-[11.5px] text-void-500">Directional evidence only. A3 reallocation stays locked until every variant has at least 100 sessions and the leader is ahead by 10 percentage points.</p>}
            {a.autoAllocationEligible && <p className="px-4 py-2.5 border-t border-emerald-500/20 bg-emerald-500/[0.03] text-[11.5px] text-emerald-300">Eligible for bounded A3 allocation. This is permission for a capped publisher, not an instruction to delete the other variant.</p>}
          </div>
        })}
      </div>}
    </section>
  )
}
