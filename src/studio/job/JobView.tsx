'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { STATUS_LABEL, nextAction, useJobs, type Job } from '../jobs'
import { focusRing, Toast, useToast } from '../ui'
import { BriefTab } from './BriefTab'
import { RefsTab } from './RefsTab'
import { DirectionsTab } from './DirectionsTab'
import { FormatsTab } from './FormatsTab'
import { ReviewTab } from './ReviewTab'
import { DeliverTab } from './DeliverTab'
import { ShareControl } from '@/components/account/ShareControl'

export type Update = (patch: Partial<Job> | ((j: Job) => Partial<Job>)) => void
export interface TabProps { job: Job; update: Update; toast: (m: string) => void; go: (t: TabId) => void; onBrands?: (id?: string) => void }

const TABS = [
  { id: 'brief', label: 'Brief' },
  { id: 'refs', label: 'References' },
  { id: 'directions', label: 'Directions' },
  { id: 'formats', label: 'Key visual' },
  { id: 'review', label: 'Review' },
  { id: 'deliver', label: 'Deliver' },
] as const
/** Which steps have something in them, so the stepper can show progress without a status dropdown. */
function stepDone(j: Job, id: TabId): boolean {
  switch (id) {
    case 'brief': return !!j.brief.trim()
    case 'refs': return j.refs.length > 0
    case 'directions': return j.directions.length > 0 && (!!j.chosenDirection || j.directions.length === 1)
    case 'formats': return !!j.designId && j.deliverables.length > 0 && j.deliverables.every(d => d.done)
    case 'review': return j.versions.some(v => v.status === 'approved')
    case 'deliver': return j.status === 'delivered'
  }
}
export type TabId = (typeof TABS)[number]['id']

export function JobView({ job, onBack, onBrands }: { job: Job; onBack: () => void; onBrands: (id?: string) => void }) {
  const { save, jobs } = useJobs()
  const [tab, setTab] = useState<TabId>(() => (job.refs.length || job.brief ? (job.designId ? 'formats' : 'refs') : 'brief'))
  const { msg, show } = useToast()
  const update: Update = useCallback(p => {
    const cur = useJobs.getState().jobs?.find(j => j.id === job.id) ?? job
    save({ ...cur, ...(typeof p === 'function' ? p(cur) : p) })
  }, [job, save])
  // Returning from the Editor: pick up a design the Editor just saved.
  useEffect(() => { const f = () => { if (document.visibilityState === 'visible') useJobs.getState().load() }; document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f) }, [])
  const live = jobs?.find(j => j.id === job.id) ?? job
  const props: TabProps = { job: live, update, toast: show, go: setTab }
  const next = nextAction(live)

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 border-b border-void-800/60 px-4 sm:px-6 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={onBack} aria-label="All jobs" className={`w-8 h-8 rounded-lg text-void-400 hover:text-white hover:bg-void-800 flex items-center justify-center ${focusRing}`}><ArrowLeft size={16} /></button>
          <div className="min-w-0 flex-1">
            <input aria-label="Client" value={live.client} placeholder="Client" onChange={e => update({ client: e.target.value })} className={`block w-full bg-transparent text-[12px] text-void-400 placeholder:text-void-600 rounded ${focusRing}`} />
            <input aria-label="Job name" value={live.name} onChange={e => update({ name: e.target.value })} className={`block w-full bg-transparent text-[18px] font-semibold tracking-tight rounded ${focusRing}`} />
          </div>
          <ShareControl kind="job" item={live} />
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[12px] text-void-400"><span className={`w-2 h-2 rounded-full ${live.status === 'delivered' ? 'bg-emerald-400' : live.status === 'review' ? 'bg-amber-300' : live.status === 'design' ? 'bg-accent' : 'bg-sky-400'}`} />{STATUS_LABEL[live.status]}</span>
        </div>
        {/* Steps, in the order a job runs. A tick means that step has something in it; the current one is white. */}
        <nav className="mt-2 flex gap-1 overflow-x-auto no-scrollbar" role="tablist" aria-label="Job steps">
          {TABS.map((t, i) => {
            const done = stepDone(live, t.id)
            return (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                className={`h-9 px-2.5 text-[12.5px] whitespace-nowrap border-b-2 -mb-px inline-flex items-center gap-1.5 ${focusRing} ${tab === t.id ? 'border-white text-white' : 'border-transparent text-void-400 hover:text-white'}`}>
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${done ? 'bg-emerald-400/20 text-emerald-300' : tab === t.id ? 'bg-white text-void-950' : 'bg-void-800 text-void-400'}`}>{done ? <Check size={10} strokeWidth={3} /> : i + 1}</span>
                {t.label}
              </button>
            )
          })}
        </nav>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'brief' && <BriefTab {...props} onBrands={onBrands} />}
        {tab === 'refs' && <RefsTab {...props} />}
        {tab === 'directions' && <DirectionsTab {...props} />}
        {tab === 'formats' && <FormatsTab {...props} />}
        {tab === 'review' && <ReviewTab {...props} />}
        {tab === 'deliver' && <DeliverTab {...props} />}
      </div>
      {next.tab !== tab && live.status !== 'delivered' && (
        <div data-mobile-actions className="shrink-0 border-t border-void-800/60 px-4 sm:px-6 py-2 flex items-center justify-end gap-3 bg-void-950">
          <span className="text-[12.5px] text-void-400">Next</span>
          <button onClick={() => setTab(next.tab)} className={`h-9 px-3.5 rounded-lg bg-white text-void-950 text-[13px] font-medium inline-flex items-center gap-1.5 ${focusRing}`}>{next.label}<ArrowRight size={14} /></button>
        </div>
      )}
      <Toast msg={msg} />
    </div>
  )
}
