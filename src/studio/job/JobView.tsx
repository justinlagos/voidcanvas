'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { STATUS_LABEL, useJobs, type Job, type JobStatus } from '../jobs'
import { focusRing, Toast, useToast } from '../ui'
import { BriefTab } from './BriefTab'
import { RefsTab } from './RefsTab'
import { DirectionsTab } from './DirectionsTab'
import { FormatsTab } from './FormatsTab'
import { ReviewTab } from './ReviewTab'
import { DeliverTab } from './DeliverTab'

export type Update = (patch: Partial<Job> | ((j: Job) => Partial<Job>)) => void
export interface TabProps { job: Job; update: Update; toast: (m: string) => void; go: (t: TabId) => void }

const TABS = [
  { id: 'brief', label: 'Brief' },
  { id: 'refs', label: 'References' },
  { id: 'directions', label: 'Directions' },
  { id: 'formats', label: 'Key visual and formats' },
  { id: 'review', label: 'Review' },
  { id: 'deliver', label: 'Deliver' },
] as const
export type TabId = (typeof TABS)[number]['id']
const STATUSES: JobStatus[] = ['direction', 'design', 'review', 'delivered']

export function JobView({ job, onBack, onBrands }: { job: Job; onBack: () => void; onBrands: (id?: string) => void }) {
  const { save, brands, jobs } = useJobs()
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
  const idx = STATUSES.indexOf(live.status)

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 border-b border-void-800/60 px-4 sm:px-6 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={onBack} aria-label="All jobs" className={`w-8 h-8 rounded-lg text-void-400 hover:text-white hover:bg-void-800 flex items-center justify-center ${focusRing}`}><ArrowLeft size={16} /></button>
          <div className="min-w-0 flex-1">
            <input aria-label="Client" value={live.client} placeholder="Client" onChange={e => update({ client: e.target.value })} className={`block w-full bg-transparent text-[12px] text-void-400 placeholder:text-void-600 rounded ${focusRing}`} />
            <input aria-label="Job name" value={live.name} onChange={e => update({ name: e.target.value })} className={`block w-full bg-transparent text-[18px] font-semibold tracking-tight rounded ${focusRing}`} />
          </div>
          <ol className="flex items-center gap-1" aria-label="Job status">
            {STATUSES.map((s, i) => (
              <li key={s} className="flex items-center gap-1">
                <button onClick={() => update({ status: s })} aria-current={live.status === s ? 'step' : undefined}
                  className={`h-7 px-2.5 rounded-full text-[11.5px] flex items-center gap-1 ${focusRing} ${i < idx ? 'text-emerald-300' : i === idx ? 'bg-white text-void-950 font-medium' : 'text-void-500 hover:text-white'}`}>
                  {i < idx && <Check size={11} strokeWidth={3} />}{STATUS_LABEL[s]}
                </button>
                {i < STATUSES.length - 1 && <span className="w-3 h-px bg-void-700" />}
              </li>
            ))}
          </ol>
          <label className="flex items-center gap-1.5 text-[12px] text-void-400">
            Brand
            <select value={live.brandId ?? ''} onChange={e => { if (e.target.value === '__new') { onBrands(); return } update({ brandId: e.target.value || null }) }} className={`h-8 px-2 rounded-lg bg-void-900 border border-void-800 text-[12.5px] text-void-100 max-w-[160px] ${focusRing}`}>
              <option value="">None</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              <option value="__new">Manage brands…</option>
            </select>
          </label>
        </div>
        <nav className="mt-2 flex gap-1 overflow-x-auto" role="tablist" aria-label="Job sections">
          {TABS.map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`h-9 px-3 text-[12.5px] whitespace-nowrap border-b-2 -mb-px ${focusRing} ${tab === t.id ? 'border-white text-white' : 'border-transparent text-void-400 hover:text-white'}`}>
              {t.label}{t.id === 'refs' && live.refs.length ? <span className="ml-1 text-void-500">{live.refs.length}</span> : null}{t.id === 'review' && live.versions.length ? <span className="ml-1 text-void-500">v{live.versions.length}</span> : null}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'brief' && <BriefTab {...props} />}
        {tab === 'refs' && <RefsTab {...props} />}
        {tab === 'directions' && <DirectionsTab {...props} />}
        {tab === 'formats' && <FormatsTab {...props} />}
        {tab === 'review' && <ReviewTab {...props} />}
        {tab === 'deliver' && <DeliverTab {...props} />}
      </div>
      <Toast msg={msg} />
    </div>
  )
}
