'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Briefcase, Plus, Search, SwatchBook, Trash2 } from 'lucide-react'
import { AppNav, Logo } from '@/components/AppNav'
import { BrandGuideline } from './BrandGuideline'
import { JobView } from './job/JobView'
import { BrandsView } from './brands/BrandsView'
import { STATUS_LABEL, newJob, useJobs, type Job, type JobStatus } from './jobs'
import { Btn, Empty, INPUT, focusRing, fmtDate, useObjectUrl } from './ui'

// Studio is the art director's desk: every job from brief to delivery.
// Effects is where you play, the Editor is where you make, Studio is where the job lives.

type View = { name: 'home' } | { name: 'job'; id: string } | { name: 'brands'; id?: string } | { name: 'guidelines' }

export function StudioShell() {
  const { jobs, load, save, remove } = useJobs()
  const [view, setView] = useState<View>({ name: 'home' })
  useEffect(() => {
    load().then(() => {
      const q = new URLSearchParams(window.location.search)
      const id = q.get('job')
      if (id) { setView({ name: 'job', id }); window.history.replaceState(null, '', '/studio') }
    })
  }, [load])

  const open = (v: View) => { setView(v); window.scrollTo(0, 0) }
  const create = () => { const j = newJob(); save(j); open({ name: 'job', id: j.id }) }
  const job = view.name === 'job' ? jobs?.find(j => j.id === view.id) : null

  return (
    <main className={`flex flex-col bg-void-950 text-void-100 ${view.name === 'home' || view.name === 'brands' ? 'min-h-[100dvh]' : 'h-[100dvh] overflow-hidden'}`}>
      <header className="h-12 shrink-0 flex items-center gap-3 px-3 border-b border-void-800/60"><Logo /><AppNav /></header>
      {view.name === 'guidelines' ? <BrandGuideline onBack={() => open({ name: 'home' })} />
        : view.name === 'brands' ? <BrandsView initial={view.id} onBack={() => open({ name: 'home' })} onGuidelines={() => open({ name: 'guidelines' })} />
        : view.name === 'job' ? (job ? <JobView key={job.id} job={job} onBack={() => open({ name: 'home' })} onBrands={id => open({ name: 'brands', id })} /> : <div className="p-10 text-void-400 text-[13px]">{jobs ? 'That job is not on this device.' : 'Loading…'}</div>)
        : <Home jobs={jobs} onOpen={id => open({ name: 'job', id })} onNew={create} onRemove={remove} onBrands={() => open({ name: 'brands' })} onGuidelines={() => open({ name: 'guidelines' })} />}
    </main>
  )
}

const STATUS_ORDER: JobStatus[] = ['direction', 'design', 'review', 'delivered']
const STATUS_DOT: Record<JobStatus, string> = { direction: 'bg-sky-400', design: 'bg-accent', review: 'bg-amber-300', delivered: 'bg-emerald-400' }

function Home({ jobs, onOpen, onNew, onRemove, onBrands, onGuidelines }: { jobs: Job[] | null; onOpen: (id: string) => void; onNew: () => void; onRemove: (id: string) => void; onBrands: () => void; onGuidelines: () => void }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<JobStatus | 'all'>('all')
  const list = useMemo(() => (jobs ?? []).filter(j => (filter === 'all' || j.status === filter) && `${j.client} ${j.name}`.toLowerCase().includes(q.toLowerCase())), [jobs, q, filter])
  const counts = useMemo(() => Object.fromEntries(STATUS_ORDER.map(s => [s, (jobs ?? []).filter(j => j.status === s).length])) as Record<JobStatus, number>, [jobs])
  return (
    <div className="max-w-6xl w-full mx-auto px-5 sm:px-8 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-tight">Studio</h1>
          <p className="mt-1 text-[14px] text-void-400 max-w-xl">Every job from brief to delivery: references read for you, direction the client signs off, one key visual in every format, and a clean package at the end. Nothing leaves this device.</p>
        </div>
        <div className="flex gap-2">
          <Btn onClick={onGuidelines}><BookOpen size={14} />Guideline builder</Btn>
          <Btn onClick={onBrands}><SwatchBook size={14} />Brands</Btn>
          <Btn primary onClick={onNew}><Plus size={15} />New job</Btn>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-2">
        <label className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-void-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a job or client" aria-label="Find a job" className={`${INPUT} pl-8 w-64`} />
        </label>
        <div className="flex gap-1 text-[12px]" role="tablist">
          {(['all', ...STATUS_ORDER] as const).map(s => (
            <button key={s} role="tab" aria-selected={filter === s} onClick={() => setFilter(s)} className={`h-8 px-3 rounded-lg ${focusRing} ${filter === s ? 'bg-void-700 text-white' : 'text-void-400 hover:text-white'}`}>
              {s === 'all' ? `All ${jobs?.length ?? ''}` : `${STATUS_LABEL[s]} ${counts[s] || ''}`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {jobs === null ? <p className="text-void-500 text-[13px]">Loading…</p>
          : !jobs.length ? (
            <Empty title="No jobs yet" action={<Btn primary onClick={onNew}><Plus size={15} />Start a job</Btn>}>
              A job holds the brief, the formats you owe, your references, the directions you show the client, the key visual, every version they saw, and the files you hand over.
            </Empty>
          ) : (
            <div className="rounded-2xl border border-void-800/80 overflow-hidden divide-y divide-void-800/70">
              {list.map(j => <JobRow key={j.id} job={j} onOpen={() => onOpen(j.id)} onRemove={() => { if (confirm(`Delete “${j.name}”? Its references, directions and versions go too. Editor designs stay.`)) onRemove(j.id) }} />)}
              {!list.length && <p className="px-4 py-6 text-[13px] text-void-500">No jobs match.</p>}
            </div>
          )}
      </div>
    </div>
  )
}

function JobRow({ job, onOpen, onRemove }: { job: Job; onOpen: () => void; onRemove: () => void }) {
  const cover = useObjectUrl(job.refs[0]?.blob)
  const done = job.deliverables.filter(d => d.done).length
  const due = job.deliverables.map(d => d.due).filter(Boolean).sort()[0]
  return (
    <div className="group flex items-center gap-4 px-4 py-3 bg-void-950 hover:bg-void-900/70">
      <button onClick={onOpen} className={`flex-1 min-w-0 flex items-center gap-4 text-left rounded-lg ${focusRing}`}>
        <span className="w-14 h-14 rounded-lg bg-void-900 border border-void-800 overflow-hidden shrink-0 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <Briefcase size={18} className="text-void-600" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11.5px] text-void-500 truncate">{job.client || 'No client yet'}</span>
          <span className="block text-[14px] font-medium truncate">{job.name}</span>
        </span>
        <span className="hidden sm:flex items-center gap-1.5 text-[12px] text-void-300 w-28"><span className={`w-2 h-2 rounded-full ${STATUS_DOT[job.status]}`} />{STATUS_LABEL[job.status]}</span>
        <span className="hidden md:block text-[12px] text-void-400 w-28 tabular-nums">{job.deliverables.length ? `${done} of ${job.deliverables.length} formats` : 'No formats yet'}</span>
        <span className="hidden md:block text-[12px] text-void-400 w-28">{due ? `Due ${due}` : `Updated ${fmtDate(job.updatedAt)}`}</span>
      </button>
      <button aria-label={`Delete ${job.name}`} onClick={onRemove} className={`w-8 h-8 rounded-lg text-void-500 hover:text-white hover:bg-void-800 items-center justify-center hidden group-hover:flex focus:flex ${focusRing}`}><Trash2 size={14} /></button>
    </div>
  )
}
