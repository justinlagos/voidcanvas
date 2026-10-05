'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import { rankSearchOpportunities, summarizeSearchOpportunities, type RankedSearchOpportunity, type SearchDiscoveryArtifact } from '@/growth/discovery'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const actionTone: Record<RankedSearchOpportunity['action'], string> = {
  protect: 'text-emerald-300 border-emerald-500/30',
  improve: 'text-amber-200 border-amber-500/30',
  build: 'text-violet-300 border-violet-500/30',
  hold: 'text-void-400 border-void-700',
}

export function GrowthDiscoveryPanel() {
  const [artifact, setArtifact] = useState<SearchDiscoveryArtifact | null>(null)
  const [error, setError] = useState('')
  const [action, setAction] = useState<'all' | RankedSearchOpportunity['action']>('all')
  const [cluster, setCluster] = useState('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let live = true
    fetch('/growth-discovery.json', { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then(j => { if (live) setArtifact(j as SearchDiscoveryArtifact) })
      .catch(() => { if (live) setError('Search discovery artifact is unavailable. Production builds generate it from research/learn-seo/opportunities.csv.') })
    return () => { live = false }
  }, [])

  const summary = useMemo(() => artifact ? summarizeSearchOpportunities(artifact.opportunities) : null, [artifact])
  const rows = useMemo(() => {
    if (!artifact) return []
    const q = query.trim().toLowerCase()
    return rankSearchOpportunities(artifact.opportunities)
      .filter(x => action === 'all' || x.action === action)
      .filter(x => cluster === 'all' || x.cluster === cluster)
      .filter(x => !q || `${x.query} ${x.title} ${x.problem} ${x.cluster}`.toLowerCase().includes(q))
      .slice(0, 40)
  }, [artifact, action, cluster, query])

  return (
    <section className="mt-6 rounded-2xl border border-void-800 bg-[#111116] p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <h2 className="font-semibold">Search evidence backlog</h2>
          <p className="mt-1 text-[12.5px] text-void-400">Existing autocomplete + SERP research, kept separate from strategic product bets.</p>
        </div>
        {summary && <div className="ml-auto flex flex-wrap gap-2 text-[11.5px]">
          <span className="rounded-lg border border-void-800 px-2.5 py-1.5">{summary.total} opportunities</span>
          <span className="rounded-lg border border-void-800 px-2.5 py-1.5">{summary.clusters.length} clusters</span>
          <span className="rounded-lg border border-violet-500/30 px-2.5 py-1.5 text-violet-300">Build {summary.counts.build}</span>
          <span className="rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-emerald-300">Protect {summary.counts.protect}</span>
        </div>}
      </div>

      <div className="mt-3 rounded-xl border border-sky-500/20 bg-sky-500/[0.035] px-3.5 py-2.5 text-[11.5px] text-sky-100">
        Research evidence only. This dataset has autocomplete presence and hand-reviewed L/M/H SERP assessments; it does not contain search volume, CPC or keyword-difficulty figures.
      </div>

      {error && <div className="mt-4 flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] px-4 py-3 text-[12.5px] text-amber-100"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{error}</div>}

      {artifact && <>
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <label className="relative min-w-[220px] flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-2.5 text-void-500" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search query, problem or cluster" className={`w-full h-9 rounded-lg border border-void-800 bg-void-900 pl-8 pr-3 text-[12.5px] ${focus}`} />
          </label>
          <select value={cluster} onChange={e => setCluster(e.target.value)} className={`h-9 max-w-[240px] rounded-lg border border-void-800 bg-void-900 px-3 text-[12px] ${focus}`}>
            <option value="all">All clusters</option>
            {artifact.clusters.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
          {(['all', 'build', 'protect', 'improve', 'hold'] as const).map(x => <button key={x} onClick={() => setAction(x)} className={`h-9 px-3 rounded-lg border capitalize text-[12px] ${action === x ? 'border-white text-white' : 'border-void-800 text-void-400 hover:text-white'} ${focus}`}>{x}</button>)}
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-void-800">
          <table className="w-full min-w-[1080px] text-[12px]">
            <thead className="bg-[#15151b] text-left text-void-400"><tr><th className="p-3">Evidence</th><th className="p-3">Action</th><th className="p-3">Query / problem</th><th className="p-3">Cluster</th><th className="p-3">Intent</th><th className="p-3">SERP</th><th className="p-3">Product connection</th><th className="p-3">Current state</th></tr></thead>
            <tbody>{rows.map(x => <tr key={x.query} className="border-t border-void-800 align-top hover:bg-white/[0.02]">
              <td className="p-3"><span className="inline-flex w-11 h-9 rounded-lg bg-white text-void-950 items-center justify-center font-semibold tabular-nums">{x.evidenceScore}</span></td>
              <td className="p-3"><span className={`inline-flex rounded-md border px-2 py-1 capitalize ${actionTone[x.action]}`}>{x.action}</span></td>
              <td className="p-3 max-w-[290px]"><div className="font-medium text-white">{x.query}</div><div className="mt-1 text-void-500">{x.problem}</div></td>
              <td className="p-3 max-w-[170px]">{x.cluster}</td>
              <td className="p-3">{x.intent}</td>
              <td className="p-3 whitespace-nowrap"><span title="Competition">C:{x.competition}</span> · <span title="Opportunity">O:{x.opportunity}</span></td>
              <td className="p-3 max-w-[260px] text-void-300">{x.connection || '—'}</td>
              <td className="p-3 capitalize"><div>{x.status}</div><div className="mt-1 text-void-500">P{x.priority}</div></td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-void-500">Showing up to 40 matches. Source: {artifact.source}. {artifact.evidence}</p>
      </>}
    </section>
  )
}
