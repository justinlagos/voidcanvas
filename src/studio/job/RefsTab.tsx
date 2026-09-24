'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, ImagePlus, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { blobToCanvas, sendHandoff } from '@/editor/io'
import { uid } from '@/editor/engine'
import { analyzeImage, type RefAnalysis } from '../analyze'
import { saveLook, type Ref } from '../jobs'
import { Btn, Empty, Overlay, focusRing, isLight, useObjectUrl } from '../ui'
import type { TabProps } from './JobView'

export function RefsTab({ job, update, toast, go }: TabProps) {
  const file = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState(0)

  const addFiles = useCallback(async (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith('image/'))
    if (!imgs.length) return
    setBusy(b => b + imgs.length)
    for (const f of imgs) {
      try {
        const c = await blobToCanvas(f, 2400)
        const blob = c.width < (await createImageBitmap(f)).width ? await new Promise<Blob>(r => c.toBlob(b => r(b!), 'image/jpeg', 0.9)) : f
        const analysis = await analyzeImage(blob)
        const r: Ref = { id: uid(), name: f.name?.replace(/\.[a-z0-9]+$/i, '') || 'Reference', blob, w: c.width, h: c.height, palette: analysis.palette.map(p => p.hex), analysis }
        update(j => ({ refs: [...j.refs, r] }))
      } catch { toast(`Could not read ${f.name}.`) }
      setBusy(b => b - 1)
    }
  }, [update, toast])

  // Older references (from boards) get read the first time they are shown.
  useEffect(() => {
    const todo = job.refs.filter(r => !r.analysis)
    if (!todo.length) return
    let live = true
    ;(async () => { for (const r of todo) { try { const a = await analyzeImage(r.blob); if (!live) return; update(j => ({ refs: j.refs.map(x => (x.id === r.id ? { ...x, analysis: a, palette: a.palette.map(p => p.hex) } : x)) })) } catch { /* unreadable */ } } })()
    return () => { live = false }
  }, [job.refs, update])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => { const t = e.target as HTMLElement | null; if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return; const f = Array.from(e.clipboardData?.files ?? []); if (f.length) addFiles(f) }
    window.addEventListener('paste', onPaste); return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  const open = job.refs.find(r => r.id === openId)
  return (
    <div className="h-full overflow-y-auto" onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); addFiles(Array.from(e.dataTransfer.files)) }}>
      <input ref={file} type="file" accept="image/*" multiple hidden onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-[13px] text-void-400 max-w-2xl">Drop in what the client sent and what you are thinking of. Each reference is read for colour, light, composition and texture. Open one to see why it works and take its look.</p>
          <div className="flex gap-2">
            {job.refs.length > 0 && <Btn onClick={() => go('directions')}>Group into directions</Btn>}
            <Btn primary onClick={() => file.current?.click()}><ImagePlus size={14} />Add references</Btn>
          </div>
        </div>
        {busy > 0 && <p className="mb-3 text-[12.5px] text-accent-light">Reading {busy} reference{busy === 1 ? '' : 's'}…</p>}
        {!job.refs.length ? (
          <div className={over ? 'ring-2 ring-accent rounded-2xl' : ''}>
            <Empty title="Drop references here" action={<Btn primary onClick={() => file.current?.click()}><ImagePlus size={14} />Choose images</Btn>}>Screenshots, photos, past work, the client&apos;s old posters. Paste with Ctrl+V too.</Empty>
          </div>
        ) : (
          <div className={`columns-2 md:columns-3 xl:columns-4 gap-4 ${over ? 'outline outline-2 outline-accent rounded-2xl' : ''}`}>
            {job.refs.map(r => <RefCard key={r.id} r={r} onOpen={() => setOpenId(r.id)} onRemove={() => update(j => ({ refs: j.refs.filter(x => x.id !== r.id), board: j.board.filter(b => !(b.kind === 'ref' && b.refId === r.id)) }))} />)}
          </div>
        )}
      </div>
      {open && <RefDetail r={open} job={job} onClose={() => setOpenId(null)} onNote={note => update(j => ({ refs: j.refs.map(x => (x.id === open.id ? { ...x, note } : x)) }))} toast={toast} />}
    </div>
  )
}

function RefCard({ r, onOpen, onRemove }: { r: Ref; onOpen: () => void; onRemove: () => void }) {
  const url = useObjectUrl(r.blob)
  const a = r.analysis
  return (
    <div className="group relative break-inside-avoid mb-4 rounded-xl overflow-hidden bg-void-900 border border-void-800 hover:border-void-600">
      <button onClick={onOpen} className={`block w-full text-left ${focusRing}`} aria-label={`Open ${r.name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt={r.name} className="w-full block" />}
        {a && <span className="flex h-3">{a.palette.map(p => <span key={p.hex} style={{ background: p.hex, flex: Math.max(0.04, p.share) }} />)}</span>}
        <span className="block px-3 py-2">
          <span className="block text-[12.5px] font-medium truncate">{r.name}</span>
          <span className="block text-[11.5px] text-void-400 truncate">{a ? `${a.key === 'low' ? 'Low-key' : a.key === 'high' ? 'High-key' : 'Mid-key'}, ${a.temp.label}, ${a.satLabel}` : 'Reading…'}</span>
        </span>
      </button>
      <button aria-label={`Remove ${r.name}`} onClick={onRemove} className={`absolute top-2 right-2 w-7 h-7 rounded-md bg-black/70 text-void-200 hover:text-white items-center justify-center hidden group-hover:flex focus:flex ${focusRing}`}><Trash2 size={13} /></button>
    </div>
  )
}

type OverlayKind = 'thirds' | 'golden' | 'focal' | 'saliency' | 'space'

function RefDetail({ r, job, onClose, onNote, toast }: { r: Ref; job: TabProps['job']; onClose: () => void; onNote: (n: string) => void; toast: (m: string) => void }) {
  const router = useRouter()
  const url = useObjectUrl(r.blob)
  const a = r.analysis
  const [show, setShow] = useState<Set<OverlayKind>>(new Set<OverlayKind>(['thirds', 'focal']))
  const heat = useRef<HTMLCanvasElement>(null)
  const photo = useRef<HTMLInputElement>(null)
  const toggle = (k: OverlayKind) => setShow(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  useEffect(() => {
    const c = heat.current; if (!c || !a) return
    const x = c.getContext('2d')!; const img = x.createImageData(32, 32)
    a.saliency.forEach((v, i) => {
      const space = show.has('space') && v < 0.18
      img.data[i * 4] = space ? 80 : 255; img.data[i * 4 + 1] = space ? 200 : Math.round(90 + 120 * (1 - v)); img.data[i * 4 + 2] = space ? 255 : 40
      img.data[i * 4 + 3] = space ? 110 : show.has('saliency') ? Math.round(v * v * 190) : 0
    })
    x.putImageData(img, 0, 0)
  }, [a, show])

  const takeLook = async () => {
    if (!a) return
    const c = await blobToCanvas(r.blob, 320)
    await saveLook({ id: r.id, name: r.name, thumb: c.toDataURL('image/jpeg', 0.8), mean: a.lab.mean, std: a.lab.std, grain: a.grain, at: Date.now() })
    toast('Look saved. It is in the Editor under New adjustment > Colour match from a saved look.')
  }
  const applyTo = async (f: File) => {
    if (!a) return
    await takeLook()
    const id = await sendHandoff({ from: 'studio', name: `${r.name} look`, images: [{ name: f.name.replace(/\.[a-z0-9]+$/i, '') || 'Photo', blob: f }], look: { name: r.name, mean: a.lab.mean, std: a.lab.std, grain: a.grain }, job: { id: job.id, brandId: job.brandId } })
    router.push(`/editor?inbox=${id}`)
  }

  return (
    <Overlay title={r.name} onClose={onClose} actions={<>
      <input ref={photo} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) applyTo(f) }} />
      <Btn onClick={takeLook} disabled={!a}><Sparkles size={14} />Take the look</Btn>
      <Btn primary onClick={() => photo.current?.click()} disabled={!a}><Wand2 size={14} />Apply the look to a photo</Btn>
    </>}>
      <div className="h-full grid lg:grid-cols-[1fr_380px]">
        <div className="relative min-h-0 bg-black/40 flex items-center justify-center p-4 overflow-hidden">
          <div className="relative max-w-full max-h-full" style={{ aspectRatio: `${r.w} / ${r.h}`, height: 'min(100%, 80vh)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {url && <img src={url} alt={r.name} className="absolute inset-0 w-full h-full object-contain" />}
            <canvas ref={heat} width={32} height={32} className="absolute inset-0 w-full h-full pointer-events-none" style={{ imageRendering: 'auto', filter: 'blur(6px)' }} />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
              {show.has('thirds') && [33.33, 66.67].map(v => <g key={v}><line x1={v} y1={0} x2={v} y2={100} stroke="#fff" strokeOpacity=".6" strokeWidth=".25" /><line x1={0} y1={v} x2={100} y2={v} stroke="#fff" strokeOpacity=".6" strokeWidth=".25" /></g>)}
              {show.has('golden') && [38.2, 61.8].map(v => <g key={v}><line x1={v} y1={0} x2={v} y2={100} stroke="#ffcf3f" strokeOpacity=".8" strokeWidth=".25" /><line x1={0} y1={v} x2={100} y2={v} stroke="#ffcf3f" strokeOpacity=".8" strokeWidth=".25" /></g>)}
            </svg>
            {show.has('focal') && a && <span className="absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,.5)] pointer-events-none" style={{ left: `${a.focal.x * 100}%`, top: `${a.focal.y * 100}%` }} />}
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 p-1 rounded-xl bg-black/70 backdrop-blur text-[12px]">
            {([['thirds', 'Thirds'], ['golden', 'Golden ratio'], ['focal', 'Focal point'], ['saliency', 'Where the eye goes'], ['space', 'Negative space']] as [OverlayKind, string][]).map(([k, l]) => (
              <button key={k} onClick={() => toggle(k)} aria-pressed={show.has(k)} className={`h-7 px-2.5 rounded-lg ${focusRing} ${show.has(k) ? 'bg-white text-void-950' : 'text-void-200 hover:text-white'}`}>{l}</button>
            ))}
          </div>
        </div>
        <aside className="min-h-0 overflow-y-auto border-l border-void-800/70 p-5 space-y-5">
          {!a ? <p className="text-void-400 text-[13px]">Reading…</p> : <Readout a={a} toast={toast} />}
          <div>
            <span className="block text-[12px] font-semibold text-void-200 mb-1.5">Your note</span>
            <textarea value={r.note ?? ''} onChange={e => onNote(e.target.value)} rows={3} placeholder="What you like about it: the type, the crop, the colour…" className={`w-full px-3 py-2 rounded-lg bg-void-950 border border-void-800 text-[12.5px] leading-relaxed resize-y ${focusRing}`} />
          </div>
        </aside>
      </div>
    </Overlay>
  )
}

function Readout({ a, toast }: { a: RefAnalysis; toast: (m: string) => void }) {
  const copy = (hex: string) => { navigator.clipboard?.writeText(hex); toast(`Copied ${hex.toUpperCase()}`) }
  const arrow = a.light.strength > 0.15
  return (
    <>
      <section>
        <h4 className="text-[12px] font-semibold text-void-200 mb-2">The recipe</h4>
        <ul className="space-y-1 text-[12.5px] text-void-200">{a.recipe.map(l => <li key={l} className="flex gap-2"><span className="text-accent-light">•</span>{l}</li>)}</ul>
      </section>
      <section>
        <h4 className="text-[12px] font-semibold text-void-200 mb-2">Colour, by how much of the image it covers</h4>
        <div className="flex h-9 rounded-lg overflow-hidden border border-white/10">{a.palette.map(p => <button key={p.hex} onClick={() => copy(p.hex)} title={`${p.hex} · ${Math.round(p.share * 100)}%`} style={{ background: p.hex, flex: Math.max(0.03, p.share) }} className={focusRing} />)}</div>
        <ul className="mt-2 space-y-1">
          {a.palette.map(p => (
            <li key={p.hex} className="flex items-center gap-2 text-[12px]">
              <span className="w-3.5 h-3.5 rounded-sm border border-white/15" style={{ background: p.hex }} />
              <button onClick={() => copy(p.hex)} className={`font-mono text-void-200 hover:text-white rounded ${focusRing}`}>{p.hex.toUpperCase()} <Copy size={10} className="inline opacity-50" /></button>
              <span className="text-void-500">{p.role}</span>
              <span className="ml-auto tabular-nums text-void-400">{Math.round(p.share * 100)}%</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4 className="text-[12px] font-semibold text-void-200 mb-2">Light</h4>
        <div className="flex items-end gap-px h-12 rounded-md bg-void-950 border border-void-800 p-1">
          {a.hist.map((v, i) => { const max = Math.max(...a.hist); return <span key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(2, (v / max) * 100)}%`, background: `hsl(0 0% ${20 + (i / 31) * 75}%)` }} /> })}
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
          <dt className="text-void-500">Key</dt><dd>{a.key === 'low' ? 'Low-key (dark, moody)' : a.key === 'high' ? 'High-key (bright, airy)' : 'Mid-key'}</dd>
          <dt className="text-void-500">Contrast</dt><dd>{a.contrastLabel} ({Math.round(a.contrast)})</dd>
          <dt className="text-void-500">Temperature</dt><dd>{a.temp.label}</dd>
          <dt className="text-void-500">Saturation</dt><dd>{a.satLabel}</dd>
          <dt className="text-void-500">Direction</dt>
          <dd className="flex items-center gap-1.5">{arrow && <span className="inline-block w-4 h-4 rounded-full border border-void-600 relative"><span className="absolute left-1/2 top-1/2 w-2 h-px bg-amber-300 origin-left" style={{ transform: `rotate(${(a.light.angle * 180) / Math.PI + 180}deg)` }} /></span>}{a.light.label}</dd>
        </dl>
      </section>
      <section>
        <h4 className="text-[12px] font-semibold text-void-200 mb-2">Composition</h4>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
          <dt className="text-void-500">Subject</dt><dd>{a.thirds}</dd>
          <dt className="text-void-500">Negative space</dt><dd>{Math.round(a.negative * 100)}%</dd>
          <dt className="text-void-500">Lines</dt><dd>{a.lines.label}</dd>
          <dt className="text-void-500">Symmetry</dt><dd>{a.symmetry > 0.75 ? 'near-symmetrical' : a.symmetry > 0.55 ? 'loosely balanced' : 'asymmetrical'}</dd>
        </dl>
      </section>
      <section>
        <h4 className="text-[12px] font-semibold text-void-200 mb-2">Texture</h4>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
          <dt className="text-void-500">Detail</dt><dd>{a.sharpness > 18 ? 'crisp' : a.sharpness > 9 ? 'moderate' : 'soft'}</dd>
          <dt className="text-void-500">Grain</dt><dd>{a.grain > 2.2 ? 'visible' : a.grain > 1.2 ? 'light' : 'clean'}</dd>
        </dl>
      </section>
      <p className="text-[11.5px] text-void-500 leading-relaxed">Take the look saves this reference&apos;s colour grade. Apply it to any photo in the Editor as a Colour match layer, with grain added when the reference has it.</p>
      <div className="flex flex-wrap gap-1.5">{a.palette.slice(0, 4).map(p => <span key={p.hex} className="text-[11px] px-2 h-6 rounded-full flex items-center font-mono" style={{ background: p.hex, color: isLight(p.hex) ? '#000' : '#fff' }}>{p.hex.toUpperCase()}</span>)}</div>
    </>
  )
}
