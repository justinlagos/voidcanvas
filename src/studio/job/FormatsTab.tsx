'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ExternalLink, Layers, RefreshCw, Sparkles, Wand2 } from 'lucide-react'
import { sendHandoff, type Handoff } from '@/editor/io'
import { uid } from '@/editor/engine'
import { briefItems, paletteRoles, readBrief } from '../drafts'
import { directionFonts, directionPalette } from '../sheets'
import { flushJob, useJobs, type Deliverable, type Job } from '../jobs'
import { boardCanvas, boardsOf, loadDesign, thumbUrl, type LoadedDesign } from '../render'
import { Btn, Empty, Panel, focusRing } from '../ui'
import type { TabProps } from './JobView'

/** The job's look, from the chosen direction, else the brand, else nothing. */
export function jobStyle(job: Job) {
  const brand = useJobs.getState().brands.find(b => b.id === job.brandId)
  const dir = job.directions.find(d => d.id === job.chosenDirection)
  const palette = dir ? directionPalette(job, dir) : brand ? brand.colors.map(c => c.hex) : []
  const fonts = dir ? directionFonts(job, dir) : brand ? { display: brand.display, body: brand.body } : null
  return { palette, fonts, dir, brand }
}

export function briefPayload(job: Job) {
  const f = readBrief(job.brief, job.name)
  const { palette } = jobStyle(job)
  const roles = palette.length ? paletteRoles(palette, f.feel) : null
  return { title: job.name, text: job.brief, items: briefItems(f), ...(roles ? { palette: [{ label: 'Background', hex: roles.bg }, { label: 'Text', hex: roles.text }, { label: 'Accent', hex: roles.accent }, { label: 'Muted', hex: roles.muted }] } : {}) }
}

export function FormatsTab({ job, update, toast, go }: TabProps) {
  const router = useRouter()
  const [design, setDesign] = useState<LoadedDesign | null>(null)
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(!!job.designId)
  const [masterDel, setMasterDel] = useState<string>(() => job.deliverables.find(d => d.group === 'Social')?.id ?? job.deliverables[0]?.id ?? '')
  const style = jobStyle(job)

  const refresh = useCallback(async () => {
    if (!job.designId) { setDesign(null); setLoading(false); return }
    setLoading(true)
    const d = await loadDesign(job.designId)
    setDesign(d)
    if (d) {
      const out: Record<string, string> = {}
      for (const f of boardsOf(d)) { const k = Math.min(1, 520 / Math.max(f.width, f.height)); out[f.deliverableId ?? f.id] = await thumbUrl(boardCanvas(d, f, k), 520) }
      setThumbs(out)
    }
    setLoading(false)
  }, [job.designId])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { const f = () => { if (document.visibilityState === 'visible') refresh() }; document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f) }, [refresh])

  const frames = design ? boardsOf(design) : []
  const master = frames.find(f => frames.some(k => k.linkedFrom === f.id)) ?? frames.find(f => f.deliverableId && job.deliverables.some(d => d.id === f.deliverableId && !f.linkedFrom)) ?? frames[0]
  const byDel = useMemo(() => new Map(frames.filter(f => f.deliverableId).map(f => [f.deliverableId!, f])), [frames])
  const masterDelId = master?.deliverableId ?? job.masterDeliverableId ?? null
  const missing = job.deliverables.filter(d => !byDel.has(d.id) && d.id !== masterDelId)

  const go2 = async (h: Omit<Handoff, 'id'>) => { await flushJob(useJobs.getState().jobs?.find(j => j.id === job.id) ?? job); const id = await sendHandoff(h); router.push(`/editor?inbox=${id}`) }
  const base = { from: 'studio' as const, name: job.name, images: [], brief: briefPayload(job) }
  const targets = (ds: Deliverable[]) => ds.map(d => ({ deliverableId: d.id, label: d.label, width: d.width, height: d.height }))

  const start = async () => {
    const md = job.deliverables.find(d => d.id === masterDel)
    const size = md ? { width: md.width, height: md.height } : { width: 1080, height: 1350 }
    const docId = uid()
    update({ designId: docId, masterDeliverableId: md?.id ?? null, status: job.status === 'direction' ? 'design' : job.status })
    await go2({ ...base, name: `${job.name} key visual`, size, palette: style.palette, ...(style.fonts ? { fonts: style.fonts } : {}), job: { id: job.id, brandId: job.brandId ?? null, docId } })
  }
  const open = () => go2({ ...base, openProject: job.designId! })
  const build = (ds: Deliverable[], rebuild = false) => go2({ ...base, openProject: job.designId!, formats: targets(ds), rebuildFormats: rebuild, masterDeliverableId: masterDelId })
  const sync = () => go2({ ...base, openProject: job.designId!, syncFormats: true })

  if (!job.designId) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
          <Panel title="Start the key visual">
            <div className="grid sm:grid-cols-[1fr_auto] gap-5 items-start">
              <div className="space-y-3 text-[13px] text-void-300 leading-relaxed">
                <p>Design one hero in the Editor. Studio then builds every format you owe from it, placing each element by what it is (headline, logo, image, button) rather than shrinking the whole thing. The formats stay linked: change the date on the master and every size updates, while each keeps its own layout.</p>
                {style.dir ? <p>It opens with <span className="text-white">{style.dir.name}</span>: its palette in your swatches and {style.fonts?.display} for type.</p>
                  : style.brand ? <p>It opens with <span className="text-white">{style.brand.name}</span>&apos;s colours and fonts.</p>
                  : <p className="text-void-400">No direction chosen yet. <button onClick={() => go('directions')} className="underline hover:text-white">Pick one</button> so the key visual opens in its palette and type, or start plain.</p>}
                {style.palette.length > 0 && <div className="flex gap-1.5">{style.palette.map(h => <span key={h} className="w-8 h-8 rounded-lg border border-white/10" style={{ background: h }} />)}</div>}
              </div>
              <div className="w-full sm:w-64 space-y-2">
                <label className="block text-[12px] text-void-400">Master format
                  <select value={masterDel} onChange={e => setMasterDel(e.target.value)} className={`mt-1 w-full h-9 px-2 rounded-lg bg-void-950 border border-void-800 text-[13px] ${focusRing}`}>
                    {!job.deliverables.length && <option value="">Instagram post 1080 × 1350</option>}
                    {job.deliverables.map(d => <option key={d.id} value={d.id}>{d.label} ({d.width} × {d.height})</option>)}
                  </select>
                </label>
                <Btn primary onClick={start} className="w-full !h-10"><Sparkles size={15} />Start key visual in the Editor</Btn>
                {!job.deliverables.length && <p className="text-[11.5px] text-void-500">Add the formats you owe on the Brief tab first, so Studio can build them later.</p>}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Btn primary onClick={open}><ExternalLink size={14} />Open in the Editor</Btn>
          <Btn onClick={() => build(missing)} disabled={!missing.length || !design}><Wand2 size={14} />Build {missing.length || ''} missing format{missing.length === 1 ? '' : 's'}</Btn>
          <Btn onClick={sync} disabled={!frames.some(f => f.linkedFrom)}><RefreshCw size={14} />Update formats from the master</Btn>
          <span className="flex-1" />
          <Btn subtle onClick={refresh}><RefreshCw size={13} />Refresh</Btn>
        </div>
        {loading && !design ? <p className="text-[13px] text-void-400">Loading the design…</p> : !design ? (
          <Empty title="The key visual is not saved on this device yet" action={<><Btn primary onClick={open}>Open it</Btn><Btn onClick={() => update({ designId: null })}>Start again</Btn></>}>Open it in the Editor and it saves itself. If it was deleted, start a new one.</Empty>
        ) : (
          <>
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-5">
              <Panel title={<span className="flex items-center gap-2"><Layers size={14} />Master: {master?.name}</span>}>
                {master && thumbs[master.deliverableId ?? master.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbs[master.deliverableId ?? master.id]} alt="Key visual" className="w-full rounded-lg border border-void-800" />
                ) : <p className="text-[12.5px] text-void-500">Nothing drawn yet.</p>}
                <p className="mt-3 text-[12px] text-void-400 leading-relaxed">Give layers a role in the Editor (Properties &gt; Role in formats) if Studio guesses wrong. Roles decide where each element goes in other sizes.</p>
              </Panel>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 content-start">
                {job.deliverables.map(d => {
                  const f = byDel.get(d.id) ?? (masterDelId === d.id ? master : undefined)
                  const t = f ? thumbs[f.deliverableId ?? f.id] : undefined
                  return (
                    <div key={d.id} className="rounded-xl bg-void-900/60 border border-void-800 overflow-hidden">
                      <div className="bg-black/30 flex items-center justify-center p-2" style={{ aspectRatio: '4 / 3' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {t ? <img src={t} alt={d.label} className="max-w-full max-h-full rounded shadow-lg" /> : <span className="text-[12px] text-void-500">Not built yet</span>}
                      </div>
                      <div className="px-3 py-2 flex items-center gap-2">
                        <button onClick={() => update(j => ({ deliverables: j.deliverables.map(x => (x.id === d.id ? { ...x, done: !x.done } : x)) }))} aria-pressed={d.done} aria-label="Done" className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center ${d.done ? 'bg-emerald-400 text-black' : 'border border-void-600'} ${focusRing}`}>{d.done && <Check size={12} strokeWidth={3} />}</button>
                        <span className="min-w-0 flex-1"><span className="block text-[12.5px] truncate">{d.label}</span><span className="block text-[11px] text-void-500">{d.width} × {d.height}{f === master ? ' · master' : f?.linkedFrom ? ' · linked' : ''}</span></span>
                        {f && f !== master && <button onClick={() => build([d], true)} className={`text-[11.5px] text-void-400 hover:text-white rounded ${focusRing}`} title="Lay this format out from the master again, dropping its own changes">Re-lay</button>}
                        {!f && <button onClick={() => build([d])} className={`text-[11.5px] text-accent-light hover:text-white rounded ${focusRing}`}>Build</button>}
                      </div>
                    </div>
                  )
                })}
                {!job.deliverables.length && <p className="text-[12.5px] text-void-500 col-span-full">Add the formats you owe on the Brief tab. Each one is built from the master here.</p>}
              </div>
            </div>
            {frames.some(f => !f.deliverableId && f !== master) && <p className="text-[12px] text-void-500">Other boards in the design: {frames.filter(f => !f.deliverableId && f !== master).map(f => f.name).join(', ')}.</p>}
          </>
        )}
      </div>
    </div>
  )
}
