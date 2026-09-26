'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Columns2, Download, FileText, Image as ImageIcon, Link2, MessageSquarePlus, Plus, SplitSquareHorizontal, Trash2 } from 'lucide-react'
import { blobToCanvas, downloadBlob, zipFiles } from '@/editor/io'
import { uid } from '@/editor/engine'
import { slug, type Job, type Pin, type ShareLink, type Version } from '../jobs'
import { applyShareEvents } from '../share-merge'
import { LinkBox, SignInToShare, useCanShare } from './LinkBox'
import { boardCanvas, boardsOf, loadDesign, toBlob } from '../render'
import { screenPdf } from '../pdf'
import { SCENES, bestScene, findSurface, loadScenePhoto, quadAspect, renderOnPhoto, renderScene, sceneUrl, type Finish } from '../mockups'
import { Btn, Empty, Overlay, focusRing, fmtDate, useObjectUrl } from '../ui'
import type { TabProps } from './JobView'

const STATUS: Record<Version['status'], { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-void-800 text-void-300' },
  sent: { label: 'Sent', cls: 'bg-sky-400/15 text-sky-300' },
  changes: { label: 'Changes asked', cls: 'bg-amber-400/15 text-amber-200' },
  approved: { label: 'Approved', cls: 'bg-emerald-400/15 text-emerald-300' },
}

export function ReviewTab({ job, update, toast }: TabProps) {
  const [vid, setVid] = useState<string | null>(job.versions[job.versions.length - 1]?.id ?? null)
  const [img, setImg] = useState(0)
  const [mode, setMode] = useState<'pins' | 'compare' | 'mockup'>('pins')
  const [busy, setBusy] = useState<string | null>(null)
  const upload = useRef<HTMLInputElement>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const v = job.versions.find(x => x.id === vid) ?? null
  const setV = (patch: Partial<Version> | ((v: Version) => Partial<Version>)) => v && update(j => ({ versions: j.versions.map(x => (x.id === v.id ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch) } : x)) }))

  // Comments and decisions from review links arrive while this tab is open.
  const latest = useRef(job); latest.current = job
  const shared = job.versions.filter(x => x.share && Date.parse(x.share.expiresAt) > Date.now()).map(x => `${x.id}:${x.share!.id}`).join(',')
  useEffect(() => {
    if (!shared) return
    let stop = false
    const check = async () => {
      const { eventsFor } = await import('@/lib/share')
      for (const pair of shared.split(',')) {
        const [versionId, shareId] = pair.split(':')
        const cur = latest.current.versions.find(x => x.id === versionId)
        if (!cur?.share || cur.share.id !== shareId) continue
        try {
          const { events } = await eventsFor(cur.share, cur.share.seen ?? 0)
          if (stop || !events.length) continue
          update(j => ({ versions: j.versions.map(x => (x.id === versionId ? applyShareEvents(x, events) : x)) }))
        } catch { /* offline, or the link was stopped */ }
      }
    }
    check()
    const t = setInterval(check, 20_000)
    const vis = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', vis)
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', vis) }
  }, [shared]) // eslint-disable-line react-hooks/exhaustive-deps

  const snapshot = async () => {
    setBusy('Rendering the formats…')
    try {
      const d = await loadDesign(job.designId)
      if (!d) { toast('Start the key visual first (Key visual and formats tab), or add images by hand.'); return }
      const boards = boardsOf(d).filter(f => f.id === '__doc' || f.deliverableId || !d.doc.frames?.some(k => k.linkedFrom))
      const images: Version['images'] = []
      for (const f of boards) {
        const k = Math.min(1, 1800 / Math.max(f.width, f.height))
        const c = boardCanvas(d, f, k)
        images.push({ name: job.deliverables.find(x => x.id === f.deliverableId)?.label ?? f.name, blob: await toBlob(c, 'image/jpeg', 0.9), w: c.width, h: c.height })
      }
      addVersion(images)
    } finally { setBusy(null) }
  }
  const addVersion = (images: Version['images']) => {
    const n = job.versions.length + 1
    const ver: Version = { id: uid(), n, label: `v${n}`, notes: n === 1 ? 'First look.' : '', at: Date.now(), images, pins: {}, todo: [], status: 'draft' }
    update(j => ({ versions: [...j.versions, ver], status: j.status === 'design' || j.status === 'direction' ? 'review' : j.status }))
    setVid(ver.id); setImg(0); setMode('pins')
  }
  const fromFiles = async (files: File[]) => {
    const images: Version['images'] = []
    for (const f of files.filter(x => x.type.startsWith('image/'))) { const c = await blobToCanvas(f, 2400); images.push({ name: f.name.replace(/\.[a-z0-9]+$/i, ''), blob: await toBlob(c, 'image/jpeg', 0.9), w: c.width, h: c.height }) }
    if (images.length) addVersion(images)
  }

  const exportPack = async () => {
    if (!v) return
    setBusy('Building the review pack…')
    try { downloadBlob(await screenPdf(await reviewPages(job, v)), `${slug(job.client || 'client')}_${slug(job.name)}_review_v${v.n}.pdf`) } finally { setBusy(null) }
  }
  const exportWa = async () => {
    if (!v) return
    setBusy('Making images for WhatsApp…')
    try {
      const files = []
      for (const im of v.images) files.push({ name: `${slug(job.name)}_v${v.n}_${slug(im.name)}.jpg`, blob: await toBlob(await stamped(job, v, im), 'image/jpeg', 0.86) })
      downloadBlob(files.length === 1 ? files[0].blob : await zipFiles(files), files.length === 1 ? files[0].name : `${slug(job.name)}_v${v.n}_whatsapp.zip`)
    } finally { setBusy(null) }
  }

  return (
    <div className="h-full flex">
      <aside className="w-64 shrink-0 border-r border-void-800/60 overflow-y-auto p-3 space-y-2">
        <Btn primary onClick={snapshot} disabled={!!busy} className="w-full"><Plus size={14} />New version from the design</Btn>
        <input ref={upload} type="file" accept="image/*" multiple hidden onChange={e => { fromFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
        <Btn onClick={() => upload.current?.click()} className="w-full"><ImageIcon size={14} />New version from images</Btn>
        {busy && <p className="text-[12px] text-accent-light px-1">{busy}</p>}
        <div className="pt-2 space-y-1">
          {job.versions.slice().reverse().map(x => {
            const open = x.todo.filter(t => !t.done).length + Object.values(x.pins).flat().filter(p => !p.done).length
            return (
              <button key={x.id} onClick={() => { setVid(x.id); setImg(0) }} className={`w-full text-left px-3 py-2 rounded-lg ${focusRing} ${vid === x.id ? 'bg-void-800' : 'hover:bg-void-900'}`}>
                <span className="flex items-center gap-2"><span className="text-[13px] font-semibold">{x.label}</span><span className={`text-[10.5px] px-1.5 h-5 rounded flex items-center ${STATUS[x.status].cls}`}>{STATUS[x.status].label}</span></span>
                <span className="block text-[11.5px] text-void-500">{fmtDate(x.at)} · {x.images.length} image{x.images.length === 1 ? '' : 's'}{open ? ` · ${open} open` : ''}</span>
              </button>
            )
          })}
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        {!v ? (
          <div className="p-6"><Empty title="No versions yet">Save a version each time you show the client something. Pin their comments on it, turn their reply into a checklist, compare versions, and send a clean review pack.</Empty></div>
        ) : (
          <>
            <div className="h-11 shrink-0 flex items-center gap-1.5 px-3 border-b border-void-800/60 overflow-x-auto">
              {([['pins', 'Feedback', MessageSquarePlus], ['compare', 'Compare', Columns2], ['mockup', 'Mockups', ImageIcon]] as const).map(([k, l, I]) => (
                <button key={k} onClick={() => setMode(k)} className={`h-8 px-3 rounded-lg text-[12.5px] flex items-center gap-1.5 ${focusRing} ${mode === k ? 'bg-void-700 text-white' : 'text-void-400 hover:text-white'}`}><I size={14} />{l}</button>
              ))}
              <span className="flex-1" />
              <select value={v.status} onChange={e => { const st = e.target.value as Version['status']; setV({ status: st }); if (st === 'approved') update({ status: 'review' }) }} aria-label="Version status" className={`h-8 px-2 rounded-lg bg-void-900 border border-void-800 text-[12.5px] ${focusRing}`}>
                {Object.entries(STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
              <Btn primary={!v.share} subtle={!!v.share} onClick={() => setLinkOpen(true)}><Link2 size={14} />{v.share ? 'Review link' : 'Send a review link'}</Btn>
              <Btn subtle onClick={exportPack} disabled={!!busy}><FileText size={14} />Review pack PDF</Btn>
              <Btn subtle onClick={exportWa} disabled={!!busy}><Download size={14} />WhatsApp images</Btn>
              <Btn subtle onClick={() => { if (confirm(`Delete ${v.label}?`)) { update(j => ({ versions: j.versions.filter(x => x.id !== v.id) })); setVid(null) } }}><Trash2 size={14} /></Btn>
            </div>
            <div className="flex-1 min-h-0 flex">
              <div className="flex-1 min-w-0 flex flex-col">
                {v.images.length > 1 && (
                  <div className="flex gap-1 px-3 pt-3 overflow-x-auto">{v.images.map((im, i) => <button key={i} onClick={() => setImg(i)} className={`h-7 px-2.5 rounded-lg text-[12px] whitespace-nowrap ${focusRing} ${img === i ? 'bg-void-700 text-white' : 'text-void-400 hover:text-white'}`}>{im.name}</button>)}</div>
                )}
                <div className="flex-1 min-h-0 p-3">
                  {mode === 'pins' && v.images[img] && <PinBoard key={v.id + img} im={v.images[img]} pins={v.pins[String(img)] ?? []} share={v.share} onPins={pins => setV(x => ({ pins: { ...x.pins, [String(img)]: pins } }))} />}
                  {mode === 'compare' && <Compare job={job} v={v} img={img} />}
                  {mode === 'mockup' && v.images[img] && <Mockups im={v.images[img]} name={`${slug(job.name)}_v${v.n}_${slug(v.images[img].name)}`} />}
                </div>
              </div>
              {mode === 'pins' && <FeedbackSide v={v} img={img} setV={setV} />}
            </div>
          </>
        )}
      </div>
      {linkOpen && v && <ReviewLink job={job} v={v} setV={setV} onClose={() => setLinkOpen(false)} />}
    </div>
  )
}

function ReviewLink({ job, v, setV, onClose }: { job: Job; v: Version; setV: (p: Partial<Version>) => void; onClose: () => void }) {
  const can = useCanShare()
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState<string | null>(null)
  const make = async () => {
    setBusy('Encrypting…'); setError(null)
    try {
      const { createReviewShare } = await import('@/lib/share')
      const ref = await createReviewShare({ client: job.client, job: job.name, label: v.label, notes: v.notes, workspaceId: job.workspaceId }, v.images.map(im => ({ name: im.name, blob: im.blob, w: im.w, h: im.h })), (d, t) => setBusy(`Uploading ${Math.min(d + 1, t)} of ${t}…`))
      setV({ share: { ...ref, at: Date.now(), seen: 0 }, status: v.status === 'draft' ? 'sent' : v.status })
    } catch (e) { setError((e as Error).message || 'Could not make the link.') } finally { setBusy(null) }
  }
  const stop = async () => {
    const { deleteShare } = await import('@/lib/share')
    await deleteShare(v.share!.id)
    setV({ share: null })
  }
  return (
    <Overlay title={`Review link for ${v.label}`} onClose={onClose}>
      <div className="p-5 space-y-4 max-w-lg">
        <p className="text-[12.5px] text-void-300 leading-relaxed">Your client opens the link in any browser, with no account and nothing to install. They can pin comments on the images, reply, and approve or ask for changes. Their comments appear here.</p>
        {!v.images.length ? <p className="text-[12.5px] text-amber-200">This version has no images yet.</p>
          : v.share ? <LinkBox link={v.share as ShareLink} onStop={stop} what="review" />
          : !can ? <SignInToShare what="review" />
          : (
            <div className="space-y-2">
              <Btn primary onClick={make} disabled={!!busy}><Link2 size={14} />{busy ?? `Make a link for ${v.images.length} image${v.images.length === 1 ? '' : 's'}`}</Btn>
              <p className="text-[11.5px] text-void-500">The images and the notes for {v.label} are encrypted on this device first. Works for 30 days.</p>
            </div>
          )}
        {error && <p role="alert" className="text-[12px] text-rose-400">{error}</p>}
      </div>
    </Overlay>
  )
}

function PinBoard({ im, pins, onPins, share }: { im: Version['images'][number]; pins: Pin[]; onPins: (p: Pin[]) => void; share?: ShareLink | null }) {
  const [reply, setReply] = useState('')
  const post = (body: Parameters<typeof import('@/lib/share').postEventFor>[1]) => { if (share) import('@/lib/share').then(m => m.postEventFor(share, body)).catch(() => {}) }
  const url = useObjectUrl(im.blob)
  const [edit, setEdit] = useState<string | null>(null)
  const add = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const p: Pin = { id: uid(), x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, text: '', done: false, at: Date.now() }
    onPins([...pins, p]); setEdit(p.id)
  }
  return (
    <div className="h-full flex items-center justify-center bg-black/30 rounded-xl overflow-hidden">
      <div className="relative max-h-full max-w-full" style={{ aspectRatio: `${im.w} / ${im.h}`, height: '100%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt={im.name} className="absolute inset-0 w-full h-full object-contain" />}
        <div className="absolute inset-0 cursor-crosshair" onClick={add} title="Click to pin a comment" />
        {pins.map((p, i) => (
          <div key={p.id} className="absolute" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
            <button onClick={() => { setEdit(edit === p.id ? null : p.id); setReply('') }} className={`-ml-3.5 -mt-3.5 w-7 h-7 rounded-full text-[12px] font-bold shadow-lg ${p.done ? 'bg-emerald-400 text-black' : 'bg-accent text-white'} ${focusRing}`}>{i + 1}</button>
            {edit === p.id && (
              <div className="absolute left-5 top-0 z-10 w-64 p-2 rounded-xl bg-[#1d1d24] border border-void-700 shadow-2xl space-y-1.5">
                {p.shared ? (
                  <div className="space-y-1.5 text-[12.5px]">
                    <p><span className="font-semibold">{p.by}</span> <span className="text-void-300 whitespace-pre-wrap">{p.text}</span></p>
                    {p.replies?.map(r => <p key={r.id} className="pl-2 border-l border-void-700"><span className="font-semibold">{r.by}</span> <span className="text-void-300 whitespace-pre-wrap">{r.text}</span></p>)}
                    <textarea autoFocus value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder={`Reply to ${p.by}`} className={`w-full px-2 py-1.5 rounded-lg bg-void-950 border border-void-800 text-[12.5px] resize-none ${focusRing}`} />
                  </div>
                ) : (
                  <textarea autoFocus value={p.text} onChange={e => onPins(pins.map(x => (x.id === p.id ? { ...x, text: e.target.value } : x)))} rows={3} placeholder="What the client said about this spot" className={`w-full px-2 py-1.5 rounded-lg bg-void-950 border border-void-800 text-[12.5px] resize-none ${focusRing}`} />
                )}
                <div className="flex gap-1.5 justify-end">
                  {p.shared && reply.trim() && <Btn onClick={() => { const r = { id: uid(), by: 'Designer', text: reply.trim(), at: Date.now(), team: true }; onPins(pins.map(x => (x.id === p.id ? { ...x, replies: [...(x.replies ?? []), r] } : x))); post({ t: 'reply', id: r.id, pin: p.id, text: r.text, by: 'Designer' }); setReply('') }}>Reply</Btn>}
                  <Btn subtle onClick={() => { onPins(pins.filter(x => x.id !== p.id)); setEdit(null) }}>{p.shared ? 'Hide' : 'Delete'}</Btn>
                  <Btn onClick={() => { onPins(pins.map(x => (x.id === p.id ? { ...x, done: !x.done } : x))); if (p.shared) post({ t: 'done', pin: p.id, done: !p.done, by: 'Designer' }); setEdit(null) }}>{p.done ? 'Reopen' : 'Done'}</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Split a client's reply into separate to-dos: one per line, bullet or sentence. */
function splitReply(t: string) {
  return t.split(/\n+|(?<=[.!?])\s+(?=[A-Z])|\s*[•\-*]\s+/).map(s => s.trim().replace(/^\d+[.)]\s*/, '')).filter(s => s.length > 3)
}

function FeedbackSide({ v, img, setV }: { v: Version; img: number; setV: (p: Partial<Version> | ((v: Version) => Partial<Version>)) => void }) {
  const [reply, setReply] = useState('')
  const pins = v.pins[String(img)] ?? []
  return (
    <aside className="w-80 shrink-0 border-l border-void-800/60 overflow-y-auto p-4 space-y-5">
      {v.decision && (
        <div className={`rounded-lg px-3 py-2 text-[12.5px] ${v.decision.value === 'approved' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-100'}`}>
          <span className="font-semibold">{v.decision.by} {v.decision.value === 'approved' ? 'approved this version' : 'asked for changes'}</span> <span className="opacity-70">{fmtDate(v.decision.at)}</span>
          {v.decision.note && <span className="block mt-0.5 whitespace-pre-wrap">{v.decision.note}</span>}
        </div>
      )}
      <div>
        <span className="block text-[12px] font-semibold text-void-200 mb-1.5">What changed in {v.label}</span>
        <textarea value={v.notes} onChange={e => setV({ notes: e.target.value })} rows={3} placeholder="Bigger date, logo moved top right, warmer photo." className={`w-full px-2.5 py-2 rounded-lg bg-void-950 border border-void-800 text-[12.5px] leading-relaxed resize-y ${focusRing}`} />
      </div>
      <div>
        <span className="block text-[12px] font-semibold text-void-200 mb-1.5">Pinned comments ({pins.length})</span>
        {!pins.length ? <p className="text-[12px] text-void-500">Click on the image to pin a comment where the client pointed.</p> : (
          <ol className="space-y-1">{pins.map((p, i) => <li key={p.id} className="flex gap-2 text-[12.5px]"><span className={`w-5 h-5 shrink-0 rounded-full text-[10.5px] font-bold flex items-center justify-center ${p.done ? 'bg-emerald-400 text-black' : 'bg-accent text-white'}`}>{i + 1}</span><span className={p.done ? 'line-through text-void-500' : ''}>{p.by && <b className="font-semibold">{p.by}: </b>}{p.text || 'No comment yet'}{p.replies?.length ? <span className="text-void-500"> · {p.replies.length} repl{p.replies.length === 1 ? 'y' : 'ies'}</span> : null}</span></li>)}</ol>
        )}
      </div>
      <div>
        <span className="block text-[12px] font-semibold text-void-200 mb-1.5">Client&apos;s reply</span>
        <textarea value={reply} onChange={e => setReply(e.target.value)} rows={4} placeholder="Paste their WhatsApp message or email here." className={`w-full px-2.5 py-2 rounded-lg bg-void-950 border border-void-800 text-[12.5px] leading-relaxed resize-y ${focusRing}`} />
        <Btn onClick={() => { const items = splitReply(reply); if (!items.length) return; setV(x => ({ todo: [...x.todo, ...items.map(text => ({ id: uid(), text, done: false }))], status: x.status === 'approved' ? x.status : 'changes' })); setReply('') }} disabled={reply.trim().length < 4} className="mt-1.5 w-full">Turn into a checklist</Btn>
      </div>
      {v.todo.length > 0 && (
        <div>
          <span className="block text-[12px] font-semibold text-void-200 mb-1.5">To do ({v.todo.filter(t => !t.done).length} open)</span>
          <ul className="space-y-1">
            {v.todo.map(t => (
              <li key={t.id} className="flex items-start gap-2 text-[12.5px]">
                <button onClick={() => setV(x => ({ todo: x.todo.map(y => (y.id === t.id ? { ...y, done: !y.done } : y)) }))} aria-pressed={t.done} className={`mt-0.5 w-4 h-4 shrink-0 rounded flex items-center justify-center ${t.done ? 'bg-emerald-400 text-black' : 'border border-void-600'} ${focusRing}`}>{t.done && <Check size={11} strokeWidth={3} />}</button>
                <span className={`flex-1 ${t.done ? 'line-through text-void-500' : ''}`}>{t.text}</span>
                <button aria-label="Remove" onClick={() => setV(x => ({ todo: x.todo.filter(y => y.id !== t.id) }))} className="text-void-600 hover:text-white"><Trash2 size={12} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}

function Compare({ job, v, img }: { job: Job; v: Version; img: number }) {
  const others = job.versions.filter(x => x.id !== v.id)
  const [other, setOther] = useState(others[others.length - 1]?.id ?? '')
  const [style, setStyle] = useState<'side' | 'split'>('split')
  const [pos, setPos] = useState(50)
  const o = job.versions.find(x => x.id === other)
  const a = useObjectUrl(v.images[img]?.blob)
  const oi = o ? (o.images.findIndex(x => x.name === v.images[img]?.name) >= 0 ? o.images.findIndex(x => x.name === v.images[img]?.name) : Math.min(img, o.images.length - 1)) : -1
  const b = useObjectUrl(o && oi >= 0 ? o.images[oi].blob : null)
  if (!others.length) return <Empty title="Only one version so far">Save another version after the next round of changes to compare them here.</Empty>
  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[12.5px]">
        <span className="text-void-400">{v.label} against</span>
        <select value={other} onChange={e => setOther(e.target.value)} className={`h-8 px-2 rounded-lg bg-void-900 border border-void-800 ${focusRing}`}>{others.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        <button onClick={() => setStyle('split')} className={`h-8 px-2.5 rounded-lg flex items-center gap-1 ${style === 'split' ? 'bg-void-700' : 'text-void-400'}`}><SplitSquareHorizontal size={14} />Slider</button>
        <button onClick={() => setStyle('side')} className={`h-8 px-2.5 rounded-lg flex items-center gap-1 ${style === 'side' ? 'bg-void-700' : 'text-void-400'}`}><Columns2 size={14} />Side by side</button>
      </div>
      {style === 'side' ? (
        <div className="flex-1 min-h-0 grid grid-cols-2 gap-3">
          {[[o?.label, b], [v.label, a]].map(([l, u], i) => (
            <div key={i} className="min-h-0 flex flex-col bg-black/30 rounded-xl p-2"><span className="text-[12px] text-void-400 mb-1">{l}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {u && <img src={u as string} alt="" className="flex-1 min-h-0 object-contain" />}</div>
          ))}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex items-center justify-center bg-black/30 rounded-xl">
          <div className="relative h-full" style={{ aspectRatio: `${v.images[img]?.w ?? 1} / ${v.images[img]?.h ?? 1}` }}
            onPointerMove={e => { if (e.buttons !== 1) return; const r = e.currentTarget.getBoundingClientRect(); setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))) }}
            onPointerDown={e => { const r = e.currentTarget.getBoundingClientRect(); setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))) }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {b && <img src={b} alt="" className="absolute inset-0 w-full h-full object-contain" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {a && <img src={a} alt="" className="absolute inset-0 w-full h-full object-contain" style={{ clipPath: `inset(0 0 0 ${pos}%)` }} />}
            <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} />
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[11px]">{o?.label}</span>
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[11px]">{v.label}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function Mockups({ im, name }: { im: Version['images'][number]; name: string }) {
  // Start on the scene whose surface is closest in shape to the design.
  const [scene, setScene] = useState<string>(() => bestScene(im.w / im.h).id)
  const [fit, setFit] = useState<'auto' | 'fill' | 'fit'>('auto')
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [photo, setPhoto] = useState<ImageBitmap | null>(null)
  const [quad, setQuad] = useState<[number, number][] | null>(null)
  const [finish, setFinish] = useState<Finish>('print')
  const [keepFront, setKeepFront] = useState(false)
  const photoIn = useRef<HTMLInputElement>(null)
  const dragI = useRef<number | null>(null)
  const art = useRef<HTMLCanvasElement | null>(null)
  const seq = useRef(0)
  const [artReady, setArtReady] = useState(0)
  useEffect(() => { blobToCanvas(im.blob, 2400).then(c => { art.current = c; setArtReady(n => n + 1) }) }, [im])
  // Preload the other scenes' photos quietly so switching is instant (and cached for offline use).
  useEffect(() => { const t = setTimeout(() => SCENES.forEach(s => loadScenePhoto(s.id).catch(() => {})), 1500); return () => clearTimeout(t) }, [])

  const custom = scene === 'custom'
  const opts = { fit: fit === 'auto' ? undefined : fit, keepFront: custom ? keepFront : undefined }
  useEffect(() => {
    if (!art.current) return
    if (custom && (!photo || !quad)) { setUrl(null); return }
    const my = ++seq.current
    setBusy(true); setErr(null)
    // Let the busy state paint, then render. Dragging corners re-renders on release.
    const t = setTimeout(async () => {
      try {
        const def = SCENES.find(s => s.id === scene)
        const c = custom ? renderOnPhoto(photo!, [{ q: quad!, aspect: quadAspect(quad!, photo!.width, photo!.height), finish }], art.current!, opts) : await renderScene(def!, art.current!, opts)
        if (my !== seq.current) return
        setUrl(c.toDataURL('image/jpeg', 0.9)); c.width = 0; c.height = 0
      } catch (e) { if (my === seq.current) setErr((e as Error).message || 'Could not render this mockup.') }
      finally { if (my === seq.current) setBusy(false) }
    }, 30)
    return () => clearTimeout(t)
  }, [scene, fit, photo, quad, finish, keepFront, artReady]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPhoto = async (f: File) => {
    const b = await createImageBitmap(f)
    setPhoto(b); setQuad(findSurface(b)); setScene('custom')
  }
  const [dragQuad, setDragQuad] = useState<[number, number][] | null>(null)
  const shownQuad = dragQuad ?? quad
  const download = async () => { if (!url) return; const b = await (await fetch(url)).blob(); downloadBlob(b, `${name}_${scene}.jpg`) }
  const current = SCENES.find(s => s.id === scene)
  const ratio = custom && photo ? `${photo.width} / ${photo.height}` : undefined
  return (
    <div className="h-full flex gap-3 min-h-0">
      <div className="w-[132px] shrink-0 overflow-y-auto pr-1 space-y-1.5">
        <button onClick={() => (photo ? setScene('custom') : photoIn.current?.click())} className={`w-full rounded-lg border border-dashed px-2 py-3 text-[11.5px] text-left ${focusRing} ${custom ? 'border-accent text-white' : 'border-void-700 text-void-300 hover:text-white'}`}>
          <span className="font-medium block">Your own photo</span><span className="text-void-500">A blank wall, screen or print</span>
        </button>
        {SCENES.map(s => (
          <button key={s.id} onClick={() => setScene(s.id)} title={s.label} className={`block w-full rounded-lg overflow-hidden border-2 ${focusRing} ${scene === s.id ? 'border-accent' : 'border-transparent hover:border-void-600'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sceneUrl(s.id, true)} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover bg-void-900" />
            <span className="block px-1.5 py-1 text-[10.5px] text-left text-void-300 bg-void-950 truncate">{s.label}</span>
          </button>
        ))}
        <input ref={photoIn} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) loadPhoto(f); e.target.value = '' }} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] font-medium">{custom ? 'Your own photo' : current?.label}</span>
          <div role="radiogroup" aria-label="Placement" className="flex rounded-lg bg-void-950 border border-void-800 p-0.5">
            {([['auto', 'Auto'], ['fill', 'Fill'], ['fit', 'Fit']] as const).map(([k, l]) => <button key={k} role="radio" aria-checked={fit === k} onClick={() => setFit(k)} className={`h-7 px-2.5 rounded-md text-[12px] ${focusRing} ${fit === k ? 'bg-void-700 text-white' : 'text-void-400 hover:text-white'}`}>{l}</button>)}
          </div>
          {custom && photo && <>
            <select value={finish} onChange={e => setFinish(e.target.value as Finish)} aria-label="Surface" className="h-8 px-2 rounded-lg bg-void-950 border border-void-800 text-[12px]">
              <option value="print">Paper or print</option><option value="screen">Screen or lightbox</option><option value="fabric">Fabric</option>
            </select>
            <label className="flex items-center gap-1.5 text-[12px] text-void-300 cursor-pointer"><input type="checkbox" checked={keepFront} onChange={e => setKeepFront(e.target.checked)} className="accent-[#8b7cff]" />Keep hands and objects in front</label>
            <Btn subtle onClick={() => setQuad(findSurface(photo))}>Find the surface again</Btn>
            <Btn subtle onClick={() => photoIn.current?.click()}>Change photo</Btn>
          </>}
          <span className="flex-1" />
          {busy && <span className="text-[12px] text-accent-light">Rendering…</span>}
          <Btn onClick={download} disabled={!url || busy}><Download size={14} />Download mockup</Btn>
        </div>
        {custom && photo && <p className="text-[12px] text-void-400">Studio found the brightest plain surface. Drag the corners if it picked the wrong one. The photo&apos;s own light and shadows go over your design.</p>}
        {err && <p className="text-[12px] text-rose-300">{err}</p>}
        <div className="flex-1 min-h-0 flex items-center justify-center bg-black/30 rounded-xl overflow-hidden">
          {custom && !photo ? (
            <Empty title="Use a photo of your own" action={<Btn primary onClick={() => photoIn.current?.click()}>Choose a photo</Btn>}>Shoot a blank wall, poster frame, screen, sign or printed sheet straight on or at an angle. Studio finds the surface and puts the design on it with the photo&apos;s light.</Empty>
          ) : (
            <div className="relative max-h-full max-w-full" style={{ aspectRatio: ratio, height: ratio ? '100%' : undefined }}
              onPointerMove={e => {
                if (dragI.current === null || !photo || !shownQuad) return
                const r = e.currentTarget.getBoundingClientRect()
                const p: [number, number] = [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]
                setDragQuad(shownQuad.map((q, i) => (i === dragI.current ? p : q)))
              }} onPointerUp={() => { if (dragI.current !== null && dragQuad) setQuad(dragQuad); dragI.current = null; setDragQuad(null) }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {url ? <img src={url} alt="Mockup" className={`${ratio ? 'absolute inset-0 w-full h-full' : 'max-h-full max-w-full'} object-contain transition-opacity ${busy ? 'opacity-70' : ''}`} style={ratio ? undefined : { maxHeight: 'calc(100vh - 260px)' }} /> : <span className="block px-10 py-24 text-void-500 text-[13px]">{err ? '' : 'Rendering…'}</span>}
              {custom && photo && shownQuad && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1 1" preserveAspectRatio="none">
                  <polygon points={shownQuad.map(p => p.join(',')).join(' ')} fill="none" stroke="#8b7cff" strokeWidth={0.003} vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.5 }} />
                </svg>
              )}
              {custom && photo && shownQuad && shownQuad.map((q, i) => (
                <span key={i} role="slider" aria-label={['Top left', 'Top right', 'Bottom right', 'Bottom left'][i] + ' corner'} aria-valuenow={Math.round(q[0] * 100)} tabIndex={0}
                  onPointerDown={e => { (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId); dragI.current = i }}
                  onKeyDown={e => { const d = e.shiftKey ? 0.01 : 0.002; const m: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }; const v = m[e.key]; if (!v || !quad) return; e.preventDefault(); setQuad(quad.map((p, j) => (j === i ? [p[0] + v[0], p[1] + v[1]] : p))) }}
                  className={`absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-white border-2 border-accent cursor-move shadow-lg ${focusRing}`} style={{ left: `${q[0] * 100}%`, top: `${q[1] * 100}%` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Review pack and WhatsApp images ───────────────────────────────

/** A version image with a footer stamp, sized for WhatsApp. */
async function stamped(job: Job, v: Version, im: Version['images'][number]) {
  const src = await blobToCanvas(im.blob, 4000)
  const W = 1080, k = W / src.width, H = Math.round(src.height * k), band = 64
  const c = document.createElement('canvas'); c.width = W; c.height = H + band
  const x = c.getContext('2d')!
  x.drawImage(src, 0, 0, W, H)
  x.fillStyle = '#111114'; x.fillRect(0, H, W, band)
  x.fillStyle = '#fff'; x.font = '600 22px Inter, system-ui, sans-serif'; x.textBaseline = 'middle'
  x.fillText(`${job.client ? job.client + ' · ' : ''}${job.name} · ${im.name}`, 28, H + band / 2)
  x.textAlign = 'right'; x.fillStyle = 'rgba(255,255,255,0.6)'; x.font = '500 20px Inter, system-ui, sans-serif'
  x.fillText(`${v.label} · ${fmtDate(v.at)} · for review`, W - 28, H + band / 2)
  return c
}

async function reviewPages(job: Job, v: Version): Promise<HTMLCanvasElement[]> {
  const W = 1920, H = 1080
  const page = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d')!; x.fillStyle = '#111114'; x.fillRect(0, 0, W, H); return { c, x } }
  const wrapText = (x: CanvasRenderingContext2D, t: string, maxW: number) => { const out: string[] = []; for (const para of t.split('\n')) { let line = ''; for (const w of para.split(' ')) { const tr = line ? line + ' ' + w : w; if (x.measureText(tr).width > maxW && line) { out.push(line); line = w } else line = tr } out.push(line) } return out }
  const pages: HTMLCanvasElement[] = []
  // Cover.
  { const { c, x } = page()
    x.fillStyle = 'rgba(255,255,255,0.55)'; x.font = '500 30px Inter, system-ui, sans-serif'; x.fillText(job.client || 'Client', 120, 190)
    x.fillStyle = '#fff'; x.font = '700 96px Inter, system-ui, sans-serif'; wrapText(x, job.name, 1300).forEach((l, i) => x.fillText(l, 120, 300 + i * 104))
    x.font = '600 40px Inter, system-ui, sans-serif'; x.fillText(`Review ${v.label}`, 120, 560)
    x.fillStyle = 'rgba(255,255,255,0.6)'; x.font = '400 28px Inter, system-ui, sans-serif'; x.fillText(`${fmtDate(v.at)} · ${v.images.length} format${v.images.length === 1 ? '' : 's'}`, 120, 610)
    if (v.notes) { x.fillStyle = '#fff'; x.font = '600 28px Inter, system-ui, sans-serif'; x.fillText('What changed', 120, 720); x.fillStyle = 'rgba(255,255,255,0.75)'; x.font = '400 28px Inter, system-ui, sans-serif'; wrapText(x, v.notes, 1500).slice(0, 6).forEach((l, i) => x.fillText(l, 120, 770 + i * 40)) }
    pages.push(c) }
  // One page per format, with pins numbered and comments listed.
  for (let i = 0; i < v.images.length; i++) {
    const im = v.images[i], { c, x } = page()
    const src = await blobToCanvas(im.blob, 4000)
    const pins = v.pins[String(i)] ?? []
    const areaW = pins.length ? 1280 : 1680, areaH = 900, k = Math.min(areaW / src.width, areaH / src.height)
    const dw = src.width * k, dh = src.height * k, dx = 120 + (areaW - dw) / 2, dy = 110 + (areaH - dh) / 2
    x.drawImage(src, dx, dy, dw, dh)
    x.fillStyle = '#fff'; x.font = '600 30px Inter, system-ui, sans-serif'; x.fillText(im.name, 120, 70)
    x.fillStyle = 'rgba(255,255,255,0.5)'; x.font = '400 22px Inter, system-ui, sans-serif'; x.fillText(`${v.label} · page ${i + 2} of ${v.images.length + 1}`, 120, 1040)
    pins.forEach((p, n) => {
      const px = dx + p.x * dw, py = dy + p.y * dh
      x.fillStyle = p.done ? '#34d399' : '#8b7cff'; x.beginPath(); x.arc(px, py, 20, 0, Math.PI * 2); x.fill()
      x.fillStyle = p.done ? '#000' : '#fff'; x.font = '700 20px Inter, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n + 1), px, py + 1); x.textAlign = 'left'; x.textBaseline = 'alphabetic'
    })
    if (pins.length) {
      let y = 140
      x.fillStyle = '#fff'; x.font = '600 26px Inter, system-ui, sans-serif'; x.fillText('Comments', 1460, y); y += 44
      pins.forEach((p, n) => { x.fillStyle = 'rgba(255,255,255,0.8)'; x.font = '400 22px Inter, system-ui, sans-serif'; wrapText(x, `${n + 1}. ${p.text || '(no comment)'}${p.done ? '  ✓ done' : ''}`, 360).forEach(l => { x.fillText(l, 1460, y); y += 30 }); y += 10 })
    }
    pages.push(c)
  }
  return pages
}
