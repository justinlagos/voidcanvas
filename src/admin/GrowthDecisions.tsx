'use client'

import { AlertTriangle, ArrowUpRight, Clock, Settings2, Sparkles } from 'lucide-react'
import { buildGrowthDecisions, decisionCounts, type GrowthDecision } from '@/growth/decisions'
import { buildExecutiveBrief } from '@/growth/executive'
import type { GrowthAttribution } from '@/growth/data'

const pct = (n: number) => `${Math.round(n * 100)}%`
const tone: Record<GrowthDecision['action'], string> = {
  amplify: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/[0.04]',
  repeat: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/[0.04]',
  fix: 'text-amber-200 border-amber-500/30 bg-amber-500/[0.04]',
  'pause-candidate': 'text-rose-200 border-rose-500/30 bg-rose-500/[0.04]',
  hold: 'text-void-300 border-void-700 bg-white/[0.02]',
}
const icon: Record<GrowthDecision['action'], typeof Sparkles> = {
  amplify: ArrowUpRight,
  repeat: Sparkles,
  fix: Settings2,
  'pause-candidate': AlertTriangle,
  hold: Clock,
}

export function GrowthDecisionsPanel({ data }: { data: GrowthAttribution }) {
  const decisions = buildGrowthDecisions(data)
  const counts = decisionCounts(decisions)
  const brief = buildExecutiveBrief(data)

  return (
    <section className="mt-6 rounded-2xl border border-void-800 bg-[#111116] p-4">
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.035] px-4 py-3">
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-semibold text-violet-300">What Voidcanvas learned</p>
        <p className="mt-1 text-[15px] font-medium text-white">{brief.headline}</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-void-300">{brief.summary}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-3">
        <div>
          <h2 className="font-semibold">What the system should do next</h2>
          <p className="mt-1 text-[12.5px] text-void-400">Rules convert activation evidence into bounded action. Low samples remain in Hold.</p>
        </div>
        <div className="ml-auto flex gap-2 text-[11.5px]">
          <span className={`rounded-lg border px-2.5 py-1.5 ${counts.founder ? 'border-amber-500/30 text-amber-200' : 'border-void-800 text-void-500'}`}>Founder decisions {counts.founder}</span>
          <span className={`rounded-lg border px-2.5 py-1.5 ${counts.autonomous ? 'border-emerald-500/30 text-emerald-300' : 'border-void-800 text-void-500'}`}>Automation candidates {counts.autonomous}</span>
        </div>
      </div>

      <div className="mt-4 grid lg:grid-cols-2 gap-2">
        {decisions.slice(0, 10).map(d => {
          const Icon = icon[d.action]
          return <article key={d.id} className={`rounded-xl border px-4 py-3 ${tone[d.action]}`}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-7 h-7 rounded-lg border border-current/20 flex items-center justify-center shrink-0"><Icon size={14} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="uppercase tracking-[0.08em] text-[10.5px] font-semibold">{d.action.replace('-', ' ')}</span>
                  <span className="text-[10.5px] opacity-60">{d.kind} · {d.autonomy} · priority {d.priority}</span>
                </div>
                <h3 className="mt-1 text-[13.5px] font-medium text-white truncate" title={d.subject}>{d.subject}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-void-300">{d.reason}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-void-400"><b className="text-void-200 font-medium">Next:</b> {d.next}</p>
                {d.sessions > 0 && <p className="mt-2 text-[10.5px] text-void-500 tabular-nums">{d.sessions} sessions · {d.activated} activated · {pct(d.rate)} rate</p>}
              </div>
            </div>
          </article>
        })}
      </div>

      <p className="mt-3 text-[11.5px] text-void-500">A1 items are founder/owner exceptions. A2 items are candidates for a future capped owned-channel executor; this panel does not publish or spend anything itself.</p>
    </section>
  )
}
