'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { loadDashboard } from './data'
import { GrowthAttributionPanel } from './GrowthAttribution'
import { GrowthDiscoveryPanel } from './GrowthDiscovery'
import { OPPORTUNITIES } from '@/growth/opportunities'
import { CAPABILITIES } from '@/growth/knowledge'

const PW_KEY = 'vc-admin-pw'
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const store = {
  get() { try { return sessionStorage.getItem(PW_KEY) || localStorage.getItem(PW_KEY) || '' } catch { return '' } },
  set(pw: string) { try { sessionStorage.setItem(PW_KEY, pw) } catch { /* ignore */ } },
  clear() { try { sessionStorage.removeItem(PW_KEY); localStorage.removeItem(PW_KEY) } catch { /* ignore */ } },
}

const riskTone = { low: 'text-emerald-300', medium: 'text-amber-300', high: 'text-rose-300' } as const
const autonomyTone = { A0: 'text-void-400', A1: 'text-sky-300', A2: 'text-violet-300', A3: 'text-emerald-300' } as const

export function GrowthAdmin() {
  const [pw, setPw] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [surface, setSurface] = useState('all')

  const auth = async (password: string) => {
    if (!password) return
    setBusy(true); setErr('')
    try {
      await loadDashboard(password, 1)
      store.set(password); setPw(password)
    } catch (e) {
      const m = (e as Error).message
      if (m === 'wrong_password') { store.clear(); setErr('That password is not right.') }
      else setErr('Could not verify access.')
    } finally { setBusy(false) }
  }

  useEffect(() => { const p = store.get(); if (p) auth(p) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const surfaces = useMemo(() => ['all', ...Array.from(new Set(OPPORTUNITIES.map(o => o.surface)))], [])
  const rows = OPPORTUNITIES.filter(o => surface === 'all' || o.surface === surface)

  if (!pw) return (
    <main className="min-h-[100dvh] bg-void-950 text-void-100 flex items-center justify-center px-4">
      <form onSubmit={e => { e.preventDefault(); auth((e.currentTarget.elements.namedItem('pw') as HTMLInputElement).value) }} className="w-full max-w-sm rounded-2xl bg-[#131318] border border-void-800 p-6">
        <div className="flex items-center gap-2.5 mb-5"><ShieldCheck size={20} /><span className="text-[15px] font-semibold">Voidcanvas Growth OS</span></div>
        <label className="block text-[12.5px] text-void-400 mb-1.5" htmlFor="pw">Admin password</label>
        <input id="pw" name="pw" type="password" autoFocus autoComplete="current-password" className={`w-full h-10 rounded-xl bg-void-900 border border-void-800 px-3 text-[14px] ${focus}`} />
        {err && <p className="mt-3 text-[12.5px] text-rose-300">{err}</p>}
        <button disabled={busy} className={`mt-5 w-full h-10 rounded-xl bg-white text-void-950 text-[13.5px] font-medium disabled:opacity-40 ${focus}`}>{busy ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Checking</span> : 'Open Growth OS'}</button>
      </form>
    </main>
  )

  const a2 = OPPORTUNITIES.filter(o => o.autonomy === 'A2' || o.autonomy === 'A3').length
  const lowRisk = OPPORTUNITIES.filter(o => o.risk === 'low').length

  return (
    <main className="min-h-[100dvh] bg-void-950 text-void-100 px-4 sm:px-8 py-6 text-[13.5px]">
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <div className="flex items-center gap-3"><h1 className="text-[18px] font-semibold">Growth OS</h1><Link href="/admin" className="text-void-400 hover:text-white">Analytics</Link><Link href="/admin/research" className="text-void-400 hover:text-white">Study</Link></div>
          <p className="mt-1 text-void-400">Prioritised distribution opportunities, live activation attribution, product truth and autonomy boundaries.</p>
        </div>
        <button onClick={() => { store.clear(); setPw(null) }} className={`h-8 px-3 rounded-lg border border-void-700 text-void-300 hover:text-white ${focus}`}>Sign out</button>
      </header>

      <section className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-3xl">
        <Stat label="Strategic bets" value={OPPORTUNITIES.length} />
        <Stat label="A2/A3 eligible" value={a2} />
        <Stat label="Low risk" value={lowRisk} />
        <Stat label="Capabilities" value={CAPABILITIES.length} />
      </section>

      <GrowthAttributionPanel password={pw} />
      <GrowthDiscoveryPanel />

      <section className="mt-6 rounded-2xl border border-void-800 bg-[#111116] p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="mr-auto"><h2 className="font-semibold">Strategic product & distribution bets</h2><p className="mt-1 text-[12px] text-void-500">Hand-scored product advantage, conversion, risk and autonomy. Separate from search evidence.</p></div>
          <span className="text-[12px] text-void-500 mr-1">Surface</span>
          {surfaces.map(s => <button key={s} onClick={() => setSurface(s)} className={`h-8 px-3 rounded-lg border capitalize ${surface === s ? 'border-white text-white' : 'border-void-800 text-void-400 hover:text-white'} ${focus}`}>{s}</button>)}
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-void-800">
          <table className="w-full min-w-[1040px]">
            <thead className="bg-[#15151b] text-left text-[11.5px] text-void-400"><tr><th className="p-3">Priority</th><th className="p-3">Opportunity</th><th className="p-3">Audience / intent</th><th className="p-3">Capability</th><th className="p-3">Surface</th><th className="p-3">Risk</th><th className="p-3">Autonomy</th><th className="p-3">Next move</th></tr></thead>
            <tbody>
              {rows.map((o, i) => <tr key={o.id} className="border-t border-void-800 align-top hover:bg-white/[0.02]">
                <td className="p-3"><div className="w-12 h-12 rounded-xl bg-white text-void-950 flex items-center justify-center text-[17px] font-semibold tabular-nums">{o.score}</div><div className="text-[10.5px] text-void-500 mt-1">#{i + 1}</div></td>
                <td className="p-3 max-w-[230px]"><div className="font-medium text-white">{o.title}</div><div className="mt-1 text-[12px] text-void-500">{o.problem}</div></td>
                <td className="p-3 max-w-[240px]"><div>{o.audience}</div><div className="mt-1 text-[12px] text-void-500">{o.intent}</div></td>
                <td className="p-3"><code className="text-[11.5px] text-void-300">{o.capability}</code></td>
                <td className="p-3 capitalize">{o.surface}</td>
                <td className={`p-3 capitalize ${riskTone[o.risk]}`}>{o.risk}</td>
                <td className={`p-3 font-medium ${autonomyTone[o.autonomy]}`}>{o.autonomy}</td>
                <td className="p-3 max-w-[300px] text-void-300">{o.notes || 'Validate and define the smallest reversible experiment.'}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-void-800 bg-[#111116] p-4">
          <h2 className="font-semibold">Autonomy rules</h2>
          <div className="mt-3 space-y-2 text-[12.5px] text-void-300">
            <p><b className="text-white">A0</b> measures and recommends only.</p>
            <p><b className="text-sky-300">A1</b> can research and prepare, but publication needs approval.</p>
            <p><b className="text-violet-300">A2</b> may publish deterministic, reversible owned-surface output after validation.</p>
            <p><b className="text-emerald-300">A3</b> may optimise proven low-risk loops inside explicit limits.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-void-800 bg-[#111116] p-4">
          <h2 className="font-semibold">Safety gates</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-void-300">
            {['Product truth verified','Unique intent','CTA resolves','Editor handoff works','Desktop check','Mobile check','No unsupported claim','Build + tests pass'].map(x => <div key={x} className="rounded-lg border border-void-800 px-3 py-2 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{x}</div>)}
          </div>
        </div>
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-[#131318] border border-void-800 px-4 py-3"><div className="text-[11.5px] text-void-400">{label}</div><div className="text-[22px] font-semibold tabular-nums">{value}</div></div>
}
