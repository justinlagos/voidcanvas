'use client'

import { useMemo, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { briefItems, readBrief } from '../drafts'
import { FORMATS, deliverableFrom, type Deliverable } from '../jobs'
import { uid } from '@/editor/engine'
import { Btn, INPUT, Label, Panel, focusRing } from '../ui'
import type { TabProps } from './JobView'

/** Formats a brief mentions, so the deliverables list starts itself. */
function suggestFormats(brief: string): string[] {
  const t = brief.toLowerCase(), out: string[] = []
  const add = (id: string, re: RegExp) => { if (re.test(t) && !out.includes(id)) out.push(id) }
  add('ig-post', /\b(instagram|ig|feed post|social post|carousel)\b/)
  add('story', /\b(story|stories|reel|status)\b/)
  add('wa-status', /\bwhatsapp\b/)
  add('a4', /\b(a4|flyer|handbill)\b/)
  add('a3', /\b(a3|poster)\b/)
  add('rollup', /\b(roll ?-?up|pull ?-?up|standee)\b/)
  add('billboard-48', /\b(billboard|48 ?-?sheet|hoarding)\b/)
  add('yt', /\b(youtube|thumbnail)\b/)
  add('x-post', /\b(twitter|x post|tweet)\b/)
  add('li', /\blinkedin\b/)
  add('fb-cover', /\bfacebook\b/)
  add('email', /\b(email|newsletter|mailer)\b/)
  add('web', /\b(website|web banner|hero|landing)\b/)
  add('slide', /\b(slide|deck|presentation)\b/)
  add('card', /\b(business card|complimentary card)\b/)
  return out
}

export function BriefTab({ job, update }: TabProps) {
  const read = useMemo(() => readBrief(job.brief, job.name), [job.brief, job.name])
  const items = useMemo(() => briefItems(read), [read])
  const suggestions = useMemo(() => suggestFormats(job.brief).filter(id => !job.deliverables.some(d => d.presetId === id)), [job.brief, job.deliverables])
  const [custom, setCustom] = useState({ label: '', w: 1080, h: 1080 })
  const setD = (id: string, patch: Partial<Deliverable>) => update(j => ({ deliverables: j.deliverables.map(d => (d.id === id ? { ...d, ...patch } : d)) }))
  const addFormat = (id: string) => { const f = FORMATS.find(x => x.id === id); if (f) update(j => ({ deliverables: [...j.deliverables, deliverableFrom(f)] })) }
  const groups = Array.from(new Set(FORMATS.map(f => f.group)))

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 grid lg:grid-cols-[1fr_1.15fr] gap-5">
        <div className="space-y-5">
          <Panel title="The brief">
            <textarea value={job.brief} onChange={e => update({ brief: e.target.value })} rows={11} aria-label="Brief"
              placeholder={'Paste the client\'s words, as they sent them. For example:\nLaunch campaign for a new Afrobeats night in Lekki. Bold, warm, a bit premium. Sat 12 Oct, 8pm at The Hub. Tickets ₦10,000 at tix.ng. Must include sponsor logos. Need an IG post, a story, an A3 poster and a 48-sheet billboard.'}
              className={`w-full px-3 py-2.5 rounded-xl bg-void-950 border border-void-800 text-[13px] leading-relaxed placeholder:text-void-600 resize-y ${focusRing}`} />
            {read.audience || read.feel.length ? (
              <p className="mt-2.5 text-[12px] text-void-400">{read.audience && <>For <span className="text-void-200">{read.audience}</span>. </>}{read.feel.length ? <>Tone: <span className="text-void-200">{read.feel.join(', ')}</span>.</> : null}</p>
            ) : null}
          </Panel>
          <Panel title="What must be on it" action={<span className="text-[11.5px] text-void-500">Read from the brief. Travels to the Editor as a checklist.</span>}>
            {items.length ? (
              <ul className="space-y-1.5">
                {items.map((it, i) => (
                  <li key={i} className="flex gap-3 text-[12.5px]"><span className="w-28 shrink-0 text-void-500">{it.label}</span><span className="text-void-100">{it.value}</span></li>
                ))}
              </ul>
            ) : <p className="text-[12.5px] text-void-500">Headline, date, venue, price, call to action, contact and must-haves show here as you paste the brief.</p>}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title={`Formats you owe (${job.deliverables.length})`} action={<span className="text-[11.5px] text-void-500">{job.deliverables.filter(d => d.done).length} done</span>}>
            {suggestions.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[12px]">
                <span className="text-void-400">The brief mentions:</span>
                {suggestions.map(id => { const f = FORMATS.find(x => x.id === id)!; return <button key={id} onClick={() => addFormat(id)} className={`h-7 px-2.5 rounded-full bg-accent/15 text-accent-light hover:bg-accent/25 ${focusRing}`}><Plus size={11} className="inline -mt-0.5" /> {f.label}</button> })}
                <button onClick={() => suggestions.forEach(addFormat)} className={`h-7 px-2 text-void-300 hover:text-white rounded ${focusRing}`}>Add all</button>
              </div>
            )}
            {job.deliverables.length ? (
              <div className="rounded-xl border border-void-800 overflow-hidden divide-y divide-void-800">
                {job.deliverables.map(d => (
                  <div key={d.id} className="flex items-center gap-2 px-3 py-2 bg-void-950">
                    <button onClick={() => setD(d.id, { done: !d.done })} aria-pressed={d.done} aria-label={d.done ? 'Mark not done' : 'Mark done'} className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center ${d.done ? 'bg-emerald-400 text-black' : 'border border-void-600'} ${focusRing}`}>{d.done && <Check size={12} strokeWidth={3} />}</button>
                    <input value={d.label} onChange={e => setD(d.id, { label: e.target.value })} aria-label="Format name" className={`min-w-0 flex-1 bg-transparent text-[13px] rounded ${focusRing}`} />
                    <span className="text-[11.5px] text-void-500 tabular-nums w-24 text-right">{d.mm ? `${d.mm.w} × ${d.mm.h} mm` : `${d.width} × ${d.height}`}</span>
                    <span className={`text-[10.5px] px-1.5 h-5 rounded flex items-center ${d.group === 'Print' || d.group === 'Outdoor' ? 'bg-amber-400/15 text-amber-200' : 'bg-void-800 text-void-300'}`}>{d.group}</span>
                    <input type="date" value={d.due ?? ''} onChange={e => setD(d.id, { due: e.target.value || undefined })} aria-label="Due date" className={`${INPUT} !h-7 w-[132px] !px-1.5`} />
                    <button aria-label={`Remove ${d.label}`} onClick={() => update(j => ({ deliverables: j.deliverables.filter(x => x.id !== d.id) }))} className={`w-7 h-7 rounded text-void-500 hover:text-white ${focusRing}`}><Trash2 size={13} className="mx-auto" /></button>
                  </div>
                ))}
              </div>
            ) : <p className="text-[12.5px] text-void-500">List every size the client needs. Studio builds each one from your key visual and packages them at the end.</p>}
            <div className="mt-4 space-y-3">
              {groups.map(g => (
                <div key={g}>
                  <Label>{g}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {FORMATS.filter(f => f.group === g).map(f => {
                      const has = job.deliverables.some(d => d.presetId === f.id)
                      return <button key={f.id} onClick={() => addFormat(f.id)} title={`${f.width} × ${f.height}`} className={`h-7 px-2.5 rounded-lg text-[12px] ${focusRing} ${has ? 'bg-void-700 text-void-300' : 'bg-void-800/70 text-void-200 hover:bg-void-700'}`}>{has ? '✓ ' : '+ '}{f.label}</button>
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
          </Panel>
        </div>
      </div>
    </div>
  )
}
