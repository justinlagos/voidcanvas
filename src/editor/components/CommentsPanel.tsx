'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, MessageSquare, RotateCcw } from 'lucide-react'
import { useEditor } from '../store'
import { useComments, type CanvasPin } from '../comments'
import { stageApi } from './Stage'
import { Button, focusRing } from './ui'
import type { Job, Pin, Version } from '@/studio/jobs'
import type { LayerBox } from '@/studio/pins'

// Client comments on this design, from the Studio job it belongs to. Each pin says which layer it is on,
// selects that layer, and is marked done here as in Studio (a client using the review link sees it too).

type Row = { pin: Pin; k: string; n: number; image: Version['images'][number]; box?: LayerBox; layerId?: string; layerName?: string; rel?: { x: number; y: number } }

export function CommentsPanel() {
  const doc = useEditor(s => s.doc)
  const layers = useEditor(s => s.layers)
  const jobId = doc?.jobId ?? null
  const [job, setJob] = useState<Job | null | undefined>(undefined)
  const [vid, setVid] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const [reply, setReply] = useState<{ pin: string; text: string } | null>(null)

  const load = useCallback(async () => {
    if (!jobId) { setJob(null); return }
    const m = await import('@/studio/jobs')
    setJob((await m.getJob(jobId)) ?? null)
  }, [jobId])
  useEffect(() => { load() }, [load])

  // Versions of this design that have comments, newest first.
  const versions = useMemo(() => (job && doc ? job.versions.filter(v => Object.values(v.pins ?? {}).some(l => l.length)).slice().reverse() : []), [job, doc])
  const v = versions.find(x => x.id === vid) ?? versions[0] ?? null

  // New comments from the review link arrive here too.
  useEffect(() => {
    if (!job || !v?.share || Date.parse(v.share.expiresAt) < Date.now()) return
    let stop = false
    const check = async () => {
      try {
        const [{ eventsFor }, { applyShareEvents }, { updateJob }] = await Promise.all([import('@/lib/share'), import('@/studio/share-merge'), import('@/studio/jobs')])
        const { events } = await eventsFor(v.share!, v.share!.seen ?? 0)
        if (stop || !events.length) return
        const next = await updateJob(job.id, j => ({ versions: j.versions.map(x => (x.id === v.id ? applyShareEvents(x, events) : x)) }))
        if (next && !stop) setJob(next)
      } catch { /* offline, or the link was stopped */ }
    }
    check()
    const t = setInterval(check, 30_000)
    return () => { stop = true; clearInterval(t) }
  }, [job?.id, v?.id, v?.share?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const [placer, setPlacer] = useState<typeof import('@/studio/pins') | null>(null)
  useEffect(() => { import('@/studio/pins').then(setPlacer).catch(() => {}) }, [])
  const rows: Row[] = useMemo(() => {
    if (!v || !placer) return []
    const out: Row[] = []
    let n = 0
    Object.keys(v.pins).sort((a, b) => Number(a) - Number(b)).forEach(k => {
      const image = v.images[Number(k)]; if (!image) return
      for (const pin of v.pins[k]) {
        n++
        const placed = placer.placePin(pin, v.boxes?.[k], image.w, image.h)
        out.push({ pin, k, n, image, layerId: placed.layerId, layerName: placed.layerName, rel: placed.rel, box: v.boxes?.[k]?.find(b => b.id === placed.layerId) })
      }
    })
    return out
  }, [v, placer])

  // The canvas draws the pins while this panel is open.
  useEffect(() => {
    const pins: CanvasPin[] = rows.map(r => ({ id: r.pin.id, n: r.n, done: r.pin.done, layerId: r.layerId, rel: r.rel, frameId: r.image.frameId ?? boardByName(r.image.name), x: r.pin.x, y: r.pin.y }))
    useComments.setState({ pins, shown: true })
  }, [rows]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => useComments.setState({ pins: [], shown: false, focus: null }), [])
  const focus = useComments(s => s.focus)

  if (!doc) return null
  if (!jobId) return <Empty>Comments come from client reviews in Studio. Send a version of this design for review from its Studio job, and the client&apos;s pins show here on the layers they point at.</Empty>
  if (job === undefined) return <p className="p-4 text-[12.5px] text-void-500">Loading…</p>
  if (!job) return <Empty>The Studio job for this design is not on this device.</Empty>
  if (!v) return <Empty>No comments on this design yet. When the client pins a comment on a review version, it shows here.</Empty>

  const open = rows.filter(r => !r.pin.done), done = rows.filter(r => r.pin.done)
  const setDone = async (r: Row, value: boolean) => {
    const { updateJob } = await import('@/studio/jobs')
    const next = await updateJob(job.id, j => ({ versions: j.versions.map(x => (x.id === v.id ? { ...x, pins: { ...x.pins, [r.k]: x.pins[r.k].map(p => (p.id === r.pin.id ? { ...p, done: value } : p)) } } : x)) }))
    if (next) setJob(next)
    if (r.pin.shared && v.share) import('@/lib/share').then(m => m.postEventFor(v.share!, { t: 'done', pin: r.pin.id, done: value, by: 'Designer' })).catch(() => {})
  }
  const sendReply = async (r: Row, text: string) => {
    const [{ updateJob }, { uid }] = await Promise.all([import('@/studio/jobs'), import('../engine')])
    const rep = { id: uid(), by: 'Designer', text, at: Date.now(), team: true }
    const next = await updateJob(job.id, j => ({ versions: j.versions.map(x => (x.id === v.id ? { ...x, pins: { ...x.pins, [r.k]: x.pins[r.k].map(p => (p.id === r.pin.id ? { ...p, replies: [...(p.replies ?? []), rep] } : p)) } } : x)) }))
    if (next) setJob(next)
    if (r.pin.shared && v.share) import('@/lib/share').then(m => m.postEventFor(v.share!, { t: 'reply', id: rep.id, pin: r.pin.id, text, by: 'Designer' })).catch(() => {})
    setReply(null)
  }
  const show = (r: Row) => {
    const s = useEditor.getState()
    useComments.setState({ focus: r.pin.id })
    const frame = r.image.frameId ?? boardByName(r.image.name)
    if (frame) s.setActiveFrame(frame)
    const l = r.layerId ? s.layers.find(x => x.id === r.layerId) : null
    if (l) s.setActive(l.id)
    if (frame) stageApi.fitFrame()
  }
  const multi = v.images.length > 1

  const item = (r: Row) => {
    const l = r.layerId ? layers.find(x => x.id === r.layerId) : null
    const gone = !!r.layerId && !l
    const changed = !!l && !!r.box && !!placer && r.box.sig !== placer.layerSig(l, doc)
    return (
      <li key={r.pin.id} data-comment={r.pin.id} className={`px-3 py-2.5 ${focus === r.pin.id ? 'bg-accent/10' : ''}`}>
        <div className="flex gap-2">
          <span className={`w-5 h-5 shrink-0 rounded-full text-[10.5px] font-bold flex items-center justify-center ${r.pin.done ? 'bg-emerald-400 text-black' : 'bg-accent text-white'}`}>{r.n}</span>
          <div className="min-w-0 flex-1 text-[12.5px]">
            <p className={r.pin.done ? 'line-through text-void-500' : 'text-void-100'}>{r.pin.by && <b className="font-semibold">{r.pin.by}: </b>}{r.pin.text || 'No comment yet'}</p>
            {r.pin.replies?.map(x => <p key={x.id} className="mt-0.5 pl-2 border-l border-void-700 text-void-300"><b className="font-semibold">{x.by}: </b>{x.text}</p>)}
            <p className="mt-1 text-[11px] text-void-500">
              {r.layerName ? <>On: {r.layerName}</> : 'Not on a layer'}
              {multi && <> · {r.image.name}</>}
              {gone && <span className="text-amber-200"> · The layer is gone</span>}
              {changed && <span className="text-amber-200"> · Changed since the comment</span>}
            </p>
            {reply?.pin === r.pin.id && (
              <form className="mt-1.5 flex gap-1" onSubmit={e => { e.preventDefault(); if (reply.text.trim()) sendReply(r, reply.text.trim()) }}>
                <input autoFocus value={reply.text} onChange={e => setReply({ pin: r.pin.id, text: e.target.value })} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') setReply(null) }} placeholder={`Reply to ${r.pin.by ?? 'the client'}`} aria-label="Reply" className={`flex-1 min-w-0 h-7 px-2 rounded-md bg-void-950 border border-void-800 text-[12px] ${focusRing}`} />
                <Button type="submit" className="!h-7 !px-2 !text-[12px]">Send</Button>
              </form>
            )}
            <div className="mt-1.5 flex flex-wrap gap-1">
              <Button onClick={() => show(r)} className="!h-7 !px-2 !text-[12px]">{l ? 'Select layer' : 'Show'}</Button>
              <Button onClick={() => setDone(r, !r.pin.done)} className="!h-7 !px-2 !text-[12px]">{r.pin.done ? <><RotateCcw size={12} />Reopen</> : <><Check size={12} />Done</>}</Button>
              {r.pin.shared && <Button onClick={() => setReply({ pin: r.pin.id, text: '' })} className="!h-7 !px-2 !text-[12px]">Reply</Button>}
            </div>
          </div>
        </div>
      </li>
    )
  }

  return (
    <div className="h-full flex flex-col" data-comments-panel>
      <div className="px-3 py-2 border-b border-white/[0.05] space-y-1.5">
        {versions.length > 1 ? (
          <select value={v.id} onChange={e => setVid(e.target.value)} aria-label="Review version" className={`w-full h-8 px-2 rounded-md bg-surface-sunken border border-white/[0.06] text-[12.5px] ${focusRing}`}>
            {versions.map(x => <option key={x.id} value={x.id}>{x.name?.trim() ? `${x.name} · ${x.label}` : x.label}</option>)}
          </select>
        ) : <p className="text-[12.5px] text-void-200">{v.name?.trim() ? `${v.name} · ${v.label}` : v.label}</p>}
        <p className="text-[11.5px] text-void-500">{open.length} open{done.length ? `, ${done.length} done` : ''} · <a href={`/studio?job=${job.id}`} className="underline underline-offset-2 hover:text-white">Open the job in Studio</a></p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!open.length && <p className="px-3 py-4 text-[12.5px] text-void-400">Every comment on this version is done.</p>}
        <ul className="divide-y divide-white/[0.04]">{open.map(item)}</ul>
        {done.length > 0 && (
          <>
            <button onClick={() => setShowDone(x => !x)} className={`w-full text-left px-3 py-2 text-[11.5px] text-void-500 hover:text-white ${focusRing}`}>{showDone ? 'Hide' : 'Show'} done ({done.length})</button>
            {showDone && <ul className="divide-y divide-white/[0.04]">{done.map(item)}</ul>}
          </>
        )}
      </div>
    </div>
  )

  function boardByName(name: string): string | null {
    const f = doc?.frames?.find(x => x.name === name)
    return f?.id ?? null
  }
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-4 text-[12.5px] leading-relaxed text-void-400 flex gap-2"><MessageSquare size={15} className="shrink-0 mt-0.5 text-void-500" /><p>{children}</p></div>
}
