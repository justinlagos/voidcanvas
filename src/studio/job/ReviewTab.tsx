'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Columns2, Download, FileText, Image as ImageIcon, MessageSquarePlus, Plus, SplitSquareHorizontal, Trash2 } from 'lucide-react'
import { blobToCanvas, downloadBlob, zipFiles } from '@/editor/io'
import { uid } from '@/editor/engine'
import { slug, type Job, type Pin, type Version } from '../jobs'
import { boardCanvas, boardsOf, loadDesign, toBlob } from '../render'
import { screenPdf } from '../pdf'
import { SCENES, renderMockup, type Pt, type SceneId } from '../mockups'
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
  const v = job.versions.find(x => x.id === vid) ?? null
  const setV = (patch: Partial<Version> | ((v: Version) => Partial<Version>)) => v && update(j => ({ versions: j.versions.map(x => (x.id === v.id ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch) } : x)) }))

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
                  {mode === 'pins' && v.images[img] && <PinBoard key={v.id + img} im={v.images[img]} pins={v.pins[String(img)] ?? []} onPins={pins => setV(x => ({ pins: { ...x.pins, [String(img)]: pins } }))} />}
                  {mode === 'compare' && <Compare job={job} v={v} img={img} />}
                  {mode === 'mockup' && v.images[img] && <Mockups im={v.images[img]} name={`${slug(job.name)}_v${v.n}_${slug(v.images[img].name)}`} />}
                </div>
              </div>
              {mode === 'pins' && <FeedbackSide v={v} img={img} setV={setV} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PinBoard({ im, pins, onPins }: { im: Version['images'][number]; pins: Pin[]; onPins: (p: Pin[]) => void }) {
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
            <button onClick={() => setEdit(edit === p.id ? null : p.id)} className={`-ml-3.5 -mt-3.5 w-7 h-7 rounded-full text-[12px] font-bold shadow-lg ${p.done ? 'bg-emerald-400 text-black' : 'bg-accent text-white'} ${focusRing}`}>{i + 1}</button>
            {edit === p.id && (
              <div className="absolute left-5 top-0 z-10 w-64 p-2 rounded-xl bg-[#1d1d24] border border-void-700 shadow-2xl space-y-1.5">
                <textarea autoFocus value={p.text} onChange={e => onPins(pins.map(x => (x.id === p.id ? { ...x, text: e.target.value } : x)))} rows={3} placeholder="What the client said about this spot" className={`w-full px-2 py-1.5 rounded-lg bg-void-950 border border-void-800 text-[12.5px] resize-none ${focusRing}`} />
                <div className="flex gap-1.5 justify-end">
                  <Btn subtle onClick={() => { onPins(pins.filter(x => x.id !== p.id)); setEdit(null) }}>Delete</Btn>
                  <Btn onClick={() => { onPins(pins.map(x => (x.id === p.id ? { ...x, done: !x.done } : x))); setEdit(null) }}>{p.done ? 'Reopen' : 'Done'}</Btn>
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
      <div>
        <span className="block text-[12px] font-semibold text-void-200 mb-1.5">What changed in {v.label}</span>
        <textarea value={v.notes} onChange={e => setV({ notes: e.target.value })} rows={3} placeholder="Bigger date, logo moved top right, warmer photo." className={`w-full px-2.5 py-2 rounded-lg bg-void-950 border border-void-800 text-[12.5px] leading-relaxed resize-y ${focusRing}`} />
      </div>
      <div>
        <span className="block text-[12px] font-semibold text-void-200 mb-1.5">Pinned comments ({pins.length})</span>
        {!pins.length ? <p className="text-[12px] text-void-500">Click on the image to pin a comment where the client pointed.</p> : (
          <ol className="space-y-1">{pins.map((p, i) => <li key={p.id} className="flex gap-2 text-[12.5px]"><span className={`w-5 h-5 shrink-0 rounded-full text-[10.5px] font-bold flex items-center justify-center ${p.done ? 'bg-emerald-400 text-black' : 'bg-accent text-white'}`}>{i + 1}</span><span className={p.done ? 'line-through text-void-500' : ''}>{p.text || 'No comment yet'}</span></li>)}</ol>
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
  // Wide art goes on a billboard, tall art on a wall; the designer can change it.
  const [scene, setScene] = useState<SceneId>(() => (im.w / im.h > 1.5 ? 'billboard' : im.w / im.h < 0.7 ? 'phone' : 'wall'))
  const [url, setUrl] = useState<string | null>(null)
  const [photo, setPhoto] = useState<ImageBitmap | null>(null)
  const [quad, setQuad] = useState<Pt[] | null>(null)
  const photoIn = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const dragI = useRef<number | null>(null)
  const art = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => { blobToCanvas(im.blob, 2400).then(c => { art.current = c; setUrl(null); render() }) }, [im]) // eslint-disable-line react-hooks/exhaustive-deps
  const render = async (s: SceneId = scene, q: Pt[] | null = quad) => {
    if (!art.current) return
    if (s === 'custom' && (!photo || !q)) { setUrl(null); return }
    const c = await renderMockup(s, art.current, s === 'custom' && photo && q ? { photo, quad: q } : undefined)
    setUrl(c.toDataURL('image/jpeg', 0.9))
  }
  useEffect(() => { render() }, [scene, quad, photo]) // eslint-disable-line react-hooks/exhaustive-deps
  const loadPhoto = async (f: File) => {
    const b = await createImageBitmap(f)
    setPhoto(b)
    const w = b.width, h = b.height
    setQuad([{ x: w * 0.3, y: h * 0.2 }, { x: w * 0.7, y: h * 0.2 }, { x: w * 0.7, y: h * 0.8 }, { x: w * 0.3, y: h * 0.8 }])
    setScene('custom')
  }
  const download = async () => { if (!url) return; const b = await (await fetch(url)).blob(); downloadBlob(b, `${name}_${scene}.jpg`) }
  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {SCENES.map(s => <button key={s.id} onClick={() => (s.id === 'custom' && !photo ? photoIn.current?.click() : setScene(s.id))} className={`h-8 px-3 rounded-lg text-[12.5px] ${focusRing} ${scene === s.id ? 'bg-void-700 text-white' : 'text-void-400 hover:text-white'}`}>{s.label}</button>)}
        <input ref={photoIn} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) loadPhoto(f) }} />
        {scene === 'custom' && <Btn subtle onClick={() => photoIn.current?.click()}>Change photo</Btn>}
        <span className="flex-1" />
        <Btn onClick={download} disabled={!url}><Download size={14} />Download mockup</Btn>
      </div>
      {scene === 'custom' && photo && <p className="text-[12px] text-void-400">Drag the four corners onto the surface in your photo: a wall, a screen, a board, a shop window.</p>}
      <div ref={box} className="flex-1 min-h-0 flex items-center justify-center bg-black/30 rounded-xl overflow-hidden">
        <div className="relative max-h-full max-w-full" style={{ aspectRatio: scene === 'custom' && photo ? `${photo.width} / ${photo.height}` : '1800 / 1300', height: '100%' }}
          onPointerMove={e => {
            if (dragI.current === null || !photo || !quad) return
            const r = e.currentTarget.getBoundingClientRect()
            const p = { x: ((e.clientX - r.left) / r.width) * photo.width, y: ((e.clientY - r.top) / r.height) * photo.height }
            setQuad(quad.map((q, i) => (i === dragI.current ? p : q)))
          }} onPointerUp={() => { dragI.current = null }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? <img src={url} alt="Mockup" className="absolute inset-0 w-full h-full object-contain" /> : <span className="absolute inset-0 flex items-center justify-center text-void-500 text-[13px]">{scene === 'custom' ? 'Choose a photo' : 'Rendering…'}</span>}
          {scene === 'custom' && photo && quad && quad.map((q, i) => (
            <span key={i} onPointerDown={e => { (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId); dragI.current = i }} className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-white border-2 border-accent cursor-move shadow-lg" style={{ left: `${(q.x / photo.width) * 100}%`, top: `${(q.y / photo.height) * 100}%` }} />
          ))}
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
