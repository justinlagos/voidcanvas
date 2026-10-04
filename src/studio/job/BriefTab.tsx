'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { briefItems, readBrief } from '../drafts'
import { FORMATS, deliverableFrom, useJobs, type Deliverable } from '../jobs'
import { uid } from '@/editor/engine'
import { Btn, INPUT, Label, Panel, focusRing } from '../ui'
import type { TabProps } from './JobView'
import { briefCheck, formatsIn, questionsEmail, sizesIn, type BriefSize } from '@/lib/intelligence/brief'
import { changeCampaignEverywhere, undoCampaignChange } from '../campaign'

/** Name the job from the brief until the designer names it themselves. */
function autoName(job: { name: string; brief: string }, brief: string): { brief: string; name?: string } {
  const was = job.name === 'New job' || job.name === readBrief(job.brief, '').headline
  if (!was) return { brief }
  const h = readBrief(brief, '').headline
  return h && h.length >= 3 ? { brief, name: h } : { brief, name: job.name === 'New job' ? 'New job' : job.name }
}

export function BriefTab({ job, update, toast, onBrands }: TabProps) {
  const brands = useJobs(s => s.brands)
  const [allSizes, setAllSizes] = useState(false)
  const [campaignBusy, setCampaignBusy] = useState(false)
  const [campaignUndo, setCampaignUndo] = useState<string | null>(null)
  const read = useMemo(() => readBrief(job.brief, job.name), [job.brief, job.name])
  const items = useMemo(() => briefItems(read), [read])
  // What is missing or does not add up, asked before the work starts.
  const check = useMemo(() => briefCheck(read, job.brief, new Date(), { hasBrand: !!job.brandId }), [read, job.brief, job.brandId])
  const questions = check.issues.filter(i => !(job.briefSkip ?? []).includes(i.id))
  const skipped = check.issues.length - questions.length
  const has = (w: number, h: number, presetId?: string) => job.deliverables.some(d => (presetId && d.presetId === presetId) || (d.width === w && d.height === h))
  const sizes = useMemo(() => sizesIn(job.brief, FORMATS).filter(z => !has(z.width, z.height, z.presetId)), [job.brief, job.deliverables]) // eslint-disable-line react-hooks/exhaustive-deps
  const suggestions = useMemo(() => formatsIn(job.brief).filter(id => !job.deliverables.some(d => d.presetId === id) && !sizes.some(z => z.presetId === id)), [job.brief, job.deliverables, sizes])
  const addSize = (z: BriefSize) => {
    if (z.presetId) { addFormat(z.presetId); return }
    update(j => ({ deliverables: [...j.deliverables, { id: uid(), label: z.mm ? `Print ${z.label}` : z.label, presetId: 'custom', width: z.width, height: z.height, group: z.mm ? 'Print' : 'Custom', ...(z.mm ? { mm: z.mm } : {}), done: false }] }))
  }
  const copyQuestions = async () => {
    const text = questionsEmail(questions, { client: job.client || undefined, job: job.name && job.name !== 'New job' ? job.name : undefined })
    try { await navigator.clipboard.writeText(text); toast('Questions copied. Paste them into your email to the client.') } catch { toast('Copying is blocked here. Select the questions and copy them.') }
  }
  const changeEverywhere = async () => {
    if (!job.designId || campaignBusy) return
    setCampaignBusy(true)
    try {
      const result = await changeCampaignEverywhere(job, { title: job.name, text: job.brief, items })
      setCampaignUndo(result.undoId ?? null)
      const changed = result.layers ? `${result.layers} linked text layer${result.layers === 1 ? '' : 's'} across ${result.designs} design${result.designs === 1 ? '' : 's'}` : 'No linked text needed changing'
      const overrides = result.overrides ? ` ${result.overrides} local override${result.overrides === 1 ? ' was' : 's were'} left alone.` : ''
      toast(`${changed}.${overrides}`)
    } finally { setCampaignBusy(false) }
  }
  const undoEverywhere = async () => {
    if (!campaignUndo || campaignBusy) return
    setCampaignBusy(true)
    try {
      const n = await undoCampaignChange(campaignUndo)
      setCampaignUndo(null)
      toast(n ? `Campaign update undone in ${n} design${n === 1 ? '' : 's'}.` : 'That campaign update is no longer available to undo.')
    } finally { setCampaignBusy(false) }
  }
  const [custom, setCustom] = useState({ label: '', w: 1080, h: 1080 })
  const setD = (id: string, patch: Partial<Deliverable>) => update(j => ({ deliverables: j.deliverables.map(d => (d.id === id ? { ...d, ...patch } : d)) }))
  const addFormat = (id: string) => { const f = FORMATS.find(x => x.id === id); if (f) update(j => ({ deliverables: [...j.deliverables, deliverableFrom(f)] })) }
  const groups = Array.from(new Set(FORMATS.map(f => f.group)))

  const common = suggestions.length ? suggestions : ['ig-post', 'story', 'a4'].filter(id => !job.deliverables.some(d => d.presetId === id))
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <Panel title="The brief">
          <textarea value={job.brief} onChange={e => { const brief = e.target.value; update(autoName(job, brief)) }} rows={9} aria-label="Brief" autoFocus={!job.brief}
            placeholder={'Paste the client\'s words, as they sent them.\n\nLaunch campaign for a new Afrobeats night in Lekki. Bold, warm, a bit premium. Sat 12 Oct, 8pm at The Hub. Tickets ₦10,000 at tix.ng. Must include sponsor logos. Need an IG post, a story and an A3 poster.'}
            className={`w-full px-3 py-2.5 rounded-xl bg-void-950 border border-void-800 text-[13px] leading-relaxed placeholder:text-void-600 resize-y ${focusRing}`} />
          {read.audience || read.feel.length ? (
            <p className="mt-2.5 text-[12px] text-void-400">{read.audience && <>For <span className="text-void-200">{read.audience}</span>. </>}{read.feel.length ? <>Tone: <span className="text-void-200">{read.feel.join(', ')}</span>.</> : null}</p>
          ) : null}
          {items.length > 0 && (
            <div className="mt-4 border-t border-void-800/70 pt-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11.5px] text-void-500">Read from the brief. Goes to the Editor as linked campaign details.</p>
                {job.designId && <span className="flex items-center gap-1.5">
                  {campaignUndo && <Btn onClick={undoEverywhere} disabled={campaignBusy} label="Undo the last campaign-wide token update"><RotateCcw size={12} />Undo update</Btn>}
                  <Btn onClick={changeEverywhere} disabled={campaignBusy} label="Update linked campaign details across saved designs">{campaignBusy ? 'Updating…' : 'Change everywhere'}</Btn>
                </span>}
              </div>
              <ul className="space-y-1.5">
                {items.map((it, i) => (
                  <li key={i} className="flex gap-3 text-[12.5px]"><span className="w-24 shrink-0 text-void-500">{it.label}</span><span className="text-void-100">{it.value}</span></li>
                ))}
              </ul>
              {job.designId && <p className="mt-2 text-[11.5px] text-void-500">Change everywhere only updates text still linked to these details. Text you deliberately changed on an individual format is treated as an override and left alone.</p>}
            </div>
          )}
          {brands.length > 0 && (
            <label className="mt-4 flex flex-wrap items-center gap-2 text-[12.5px] text-void-300 border-t border-void-800/70 pt-3">
              Which brand is this for?
              <select value={job.brandId ?? ''} onChange={e => { if (e.target.value === '__new') { onBrands?.(); return } update({ brandId: e.target.value || null }) }} className={`${INPUT} h-8`}>
                <option value="">No brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                <option value="__new">Manage brands…</option>
              </select>
              <span className="text-void-500">The Editor checks colours, fonts and logo space against it.</span>
            </label>
          )}
        </Panel>

        {job.brief.trim().length >= 12 && (questions.length > 0 || skipped > 0) && (
          <Panel title="Worth asking the client" action={questions.length ? <Btn onClick={copyQuestions} label="Copy the questions as an email"><Copy size={13} />Copy as questions</Btn> : undefined}>
            <div data-brief-questions>
              {questions.length ? (
                <ul className="space-y-2">
                  {questions.map(q => (
                    <li key={q.id} data-brief-question={q.id} className="flex items-start gap-2.5 rounded-xl bg-void-950 border border-void-800 px-3 py-2.5">
                      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${q.kind === 'missing' ? 'bg-void-500' : 'bg-amber-400'}`} aria-hidden />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] text-void-100 leading-snug">{q.question}</span>
                        {q.quote && <span className="block mt-0.5 text-[11.5px] text-void-500">From the brief: <q className="text-void-300">{q.quote}</q></span>}
                      </span>
                      <button onClick={() => update(j => ({ briefSkip: [...(j.briefSkip ?? []), q.id] }))} aria-label={`No need to ask: ${q.question}`} title="No need to ask" className={`w-7 h-7 shrink-0 rounded text-void-500 hover:text-white inline-flex items-center justify-center ${focusRing}`}><X size={13} /></button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-[12.5px] text-void-400">Nothing left to ask.</p>}
              {skipped > 0 && <button onClick={() => update({ briefSkip: [] })} className={`mt-2 h-7 text-[12px] text-void-400 hover:text-white rounded ${focusRing}`}>Show the {skipped} set aside</button>}
            </div>
          </Panel>
        )}

        <Panel title={job.deliverables.length ? `Formats (${job.deliverables.length})` : 'Formats'} action={job.deliverables.length ? <span className="text-[11.5px] text-void-500">{job.deliverables.filter(d => d.done).length} done</span> : undefined}>
          {job.deliverables.length ? (
            <div className="rounded-xl border border-void-800 overflow-hidden divide-y divide-void-800">
              {job.deliverables.map(d => (
                <div key={d.id} className="flex items-center gap-2 px-3 py-2 bg-void-950">
                  <button onClick={() => setD(d.id, { done: !d.done })} aria-pressed={d.done} aria-label={d.done ? 'Mark not done' : 'Mark done'} className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center ${d.done ? 'bg-emerald-400 text-void-950' : 'border border-void-600'} ${focusRing}`}>{d.done && <Check size={12} strokeWidth={3} />}</button>
                  <input value={d.label} onChange={e => setD(d.id, { label: e.target.value })} aria-label="Format name" className={`min-w-0 flex-1 bg-transparent text-[13px] rounded ${focusRing}`} />
                  <span className="text-[11.5px] text-void-500 tabular-nums text-right hidden sm:block">{d.mm ? `${d.mm.w} × ${d.mm.h} mm` : `${d.width} × ${d.height}`}</span>
                  <input type="date" value={d.due ?? ''} onChange={e => setD(d.id, { due: e.target.value || undefined })} aria-label="Due date" className={`${INPUT} !h-7 w-[132px] !px-1.5 hidden sm:block`} />
                  <button aria-label={`Remove ${d.label}`} onClick={() => update(j => ({ deliverables: j.deliverables.filter(x => x.id !== d.id) }))} className={`w-7 h-7 rounded text-void-500 hover:text-white ${focusRing}`}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          ) : null}
          {sizes.length > 0 && (
            <div className={`${job.deliverables.length ? 'mt-3' : ''} flex flex-wrap items-center gap-1.5 text-[12px]`} data-brief-sizes>
              <span className="text-void-400">Sizes in the brief:</span>
              {sizes.map(z => { const f = z.presetId ? FORMATS.find(x => x.id === z.presetId) : null; return <button key={z.label} onClick={() => addSize(z)} title={z.quote} className={`h-7 px-2.5 rounded-full bg-accent/15 text-accent-light hover:bg-accent/25 ${focusRing}`}><Plus size={11} className="inline -mt-px mr-0.5" />{f ? `${f.label} (${z.label})` : z.label}</button> })}
            </div>
          )}
          {common.length > 0 && (
            <div className={`${job.deliverables.length || sizes.length ? 'mt-3' : ''} flex flex-wrap items-center gap-1.5 text-[12px]`}>
              <span className="text-void-400">{suggestions.length ? 'The brief mentions:' : 'Usual ones:'}</span>
              {common.map(id => { const f = FORMATS.find(x => x.id === id)!; return <button key={id} onClick={() => addFormat(id)} className={`h-7 px-2.5 rounded-full bg-accent/15 text-accent-light hover:bg-accent/25 ${focusRing}`}><Plus size={11} className="inline -mt-px mr-0.5" />{f.label}</button> })}
              {suggestions.length > 1 && <button onClick={() => suggestions.forEach(addFormat)} className={`h-7 px-2 text-void-300 hover:text-white rounded ${focusRing}`}>Add all</button>}
            </div>
          )}
          <button onClick={() => setAllSizes(v => !v)} aria-expanded={allSizes} className={`mt-3 h-8 text-[12.5px] text-void-300 hover:text-white inline-flex items-center gap-1 rounded ${focusRing}`}>{allSizes ? 'Fewer sizes' : 'All sizes and custom'}</button>
          {allSizes && (
            <div className="mt-2 space-y-3">
              {groups.map(g => (
                <div key={g}>
                  <Label>{g}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {FORMATS.filter(f => f.group === g).map(f => {
                      const has = job.deliverables.some(d => d.presetId === f.id)
                      return <button key={f.id} onClick={() => addFormat(f.id)} title={`${f.width} × ${f.height}`} className={`h-7 px-2.5 rounded-lg text-[12px] ${focusRing} ${has ? 'bg-void-700 text-void-300' : 'bg-void-800/70 text-void-200 hover:bg-void-700'}`}>+ {f.label}</button>
                    })}
                  </div>
                </div>
              ))}
              <div>
                <Label>Custom size</Label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <input value={custom.label} onChange={e => setCustom({ ...custom, label: e.target.value })} placeholder="Name" className={`${INPUT} w-40`} />
                  <input type="number" value={custom.w} onChange={e => setCustom({ ...custom, w: +e.target.value })} aria-label="Width" className={`${INPUT} w-20`} />
                  <span className="text-void-500 text-[12px]">×</span>
                  <input type="number" value={custom.h} onChange={e => setCustom({ ...custom, h: +e.target.value })} aria-label="Height" className={`${INPUT} w-20`} />
                  <span className="text-void-500 text-[12px]">px</span>
                  <Btn onClick={() => { if (custom.w < 16 || custom.h < 16) return; update(j => ({ deliverables: [...j.deliverables, { id: uid(), label: custom.label || `${custom.w} × ${custom.h}`, presetId: 'custom', width: Math.round(custom.w), height: Math.round(custom.h), group: 'Custom', done: false }] })); setCustom({ label: '', w: 1080, h: 1080 }) }}><Plus size={13} />Add</Btn>
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
