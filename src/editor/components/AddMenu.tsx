'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { applyEffect } from '@/lib/effects'
import { defaultParams, type EffectType } from '@/store/useStore'
import { ctx2d, makeCanvas, renderDoc } from '../engine'
import { getBrand, type BrandKit } from '../io'
import { ImagePlus, Layers, Search, Shapes, Type } from 'lucide-react'
import { effects } from '@/components/EffectSelector'
import { importFiles } from '../io'
import { ADJUSTMENT_LABELS, useEditor } from '../store'
import type { AdjustmentKind } from '../types'
import { Modal, focusRing } from './ui'

const ADJUSTMENTS: { kind: AdjustmentKind; hint: string }[] = [
  { kind: 'brightnessContrast', hint: 'Lighter, darker, punchier' },
  { kind: 'hueSaturation', hint: 'Shift or boost colours' },
  { kind: 'temperature', hint: 'Warmer or cooler' },
  { kind: 'curves', hint: 'Full control over tone and contrast' },
  { kind: 'levels', hint: 'Fix flat or washed-out photos' },
  { kind: 'blackWhite', hint: 'Remove colour' },
  { kind: 'blur', hint: 'Soften everything below' },
  { kind: 'invert', hint: 'Negative' },
]

// Previews run one at a time between frames so the menu opens instantly and never locks up.
const thumbCache = new Map<string, string>()
let queue: (() => void)[] = [], running = false
function pump() { if (running) return; running = true; const step = () => { const job = queue.shift(); if (!job) { running = false; return } job(); setTimeout(step, 0) }; setTimeout(step, 0) }

function FilterThumb({ effect, base, stamp, fallback }: { effect: EffectType; base: HTMLCanvasElement | null; stamp: string; fallback: string }) {
  const key = stamp + effect
  const [url, setUrl] = useState(thumbCache.get(key) ?? '')
  useEffect(() => {
    if (!base || thumbCache.has(key)) { setUrl(thumbCache.get(key) ?? ''); return }
    let live = true
    const job = () => {
      if (!live) return
      const c = makeCanvas(base.width, base.height), x = ctx2d(c, true)
      x.drawImage(base, 0, 0)
      try { x.putImageData(applyEffect(x, x.getImageData(0, 0, c.width, c.height), effect, defaultParams), 0, 0) } catch { return }
      const u = c.toDataURL('image/jpeg', 0.7); thumbCache.set(key, u); if (live) setUrl(u)
    }
    queue.push(job); pump()
    return () => { live = false; queue = queue.filter(j => j !== job) }
  }, [base, key, effect])
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className="w-full aspect-[4/3] object-cover rounded-lg" /> : <span className="w-full aspect-[4/3] rounded-lg bg-void-800 flex items-center justify-center text-[18px] text-void-500" aria-hidden>{fallback}</span>
}

function BrandLogo({ blob, name, onPick }: { blob: Blob; name: string; onPick: () => void }) {
  const [url, setUrl] = useState('')
  useEffect(() => { const u = URL.createObjectURL(blob); setUrl(u); return () => URL.revokeObjectURL(u) }, [blob])
  // eslint-disable-next-line @next/next/no-img-element
  return <button onClick={onPick} title={`Add ${name}`} className={`w-16 h-16 shrink-0 p-2 rounded-xl bg-void-900 hover:bg-void-800 border border-void-800 ${focusRing}`}>{url && <img src={url} alt={name} className="w-full h-full object-contain" />}</button>
}

export function AddMenu({ onClose, filtersOnly }: { onClose: () => void; filtersOnly?: boolean }) {
  const s = useEditor.getState()
  const file = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const list = useMemo(() => effects.filter(e => e.id !== 'none' && (cat === 'all' || e.category === cat) && (e.name + e.description).toLowerCase().includes(q.toLowerCase())), [q, cat])
  const done = (fn: () => void) => () => { fn(); onClose() }
  const [brand, setBrand] = useState<BrandKit | null>(null)
  useEffect(() => { getBrand().then(setBrand).catch(() => {}) }, [])
  // A small copy of the current design, so every filter previews on the user's own work.
  const { base, stamp } = useMemo(() => {
    const st = useEditor.getState(); if (!st.doc || !st.layers.length) return { base: null, stamp: '' }
    const k = 240 / Math.max(st.doc.width, st.doc.height)
    const c = makeCanvas(st.doc.width * k, st.doc.height * k)
    renderDoc(c, st.doc, st.layers, { groups: st.groups, scale: k, noCache: true })
    return { base: c, stamp: `${st.doc.id}:${st.docRev}:` }
  }, [])
  const tile = `flex items-center gap-3 p-3 rounded-xl bg-void-900 hover:bg-void-800 border border-void-800/70 text-left ${focusRing}`

  return (
    <Modal title={filtersOnly ? 'Filters and adjustments' : 'Add to your design'} onClose={onClose} wide>
      <div className="p-5 space-y-6">
        {!filtersOnly && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <input ref={file} type="file" accept="image/*,.psd,.pdf" multiple hidden onChange={e => { importFiles(Array.from(e.target.files ?? [])); onClose() }} />
            <button className={tile} onClick={() => file.current?.click()}><ImagePlus size={18} className="text-[#b9afff]" /><span className="text-[13px] font-medium">Photo</span></button>
            <button className={tile} onClick={done(() => s.addText())}><Type size={18} className="text-[#b9afff]" /><span className="text-[13px] font-medium">Text</span></button>
            <button className={tile} onClick={done(() => { const d = useEditor.getState().doc!; const k = Math.round(Math.min(d.width, d.height) * 0.35); s.addShape('rect', (d.width - k) / 2, (d.height - k) / 2, k, k) })}><Shapes size={18} className="text-[#b9afff]" /><span className="text-[13px] font-medium">Shape</span></button>
            <button className={tile} onClick={done(() => { s.addBlank(); s.setTool('brush') })}><Layers size={18} className="text-[#b9afff]" /><span className="text-[13px] font-medium">Blank layer</span></button>
          </div>
        )}

        {!filtersOnly && brand && brand.logos.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold mb-2.5">Your logos</h3>
            <div className="flex gap-2 overflow-x-auto pb-1">{brand.logos.map(l => <BrandLogo key={l.id} blob={l.blob} name={l.name} onPick={() => { importFiles([l.blob], [l.name]); onClose() }} />)}</div>
          </div>
        )}

        <div>
          <h3 className="text-[13px] font-semibold mb-1">Adjustments</h3>
          <p className="text-[12.5px] text-void-400 mb-3">Added as their own layer, so you can change or remove them any time.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ADJUSTMENTS.map(a => (
              <button key={a.kind} className={tile + ' !items-start flex-col !gap-0.5'} onClick={done(() => s.addAdjustment(a.kind))}>
                <span className="text-[13px] font-medium">{ADJUSTMENT_LABELS[a.kind]}</span>
                <span className="text-[12px] text-void-400">{a.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3 className="text-[13px] font-semibold">Void filters <span className="text-void-500 font-normal">({list.length})</span></h3>
            <label className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-void-500" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search filters" aria-label="Search filters" className={`h-8 w-48 pl-8 pr-2 rounded-lg bg-void-900 border border-void-800 text-[12.5px] ${focusRing}`} />
            </label>
          </div>
          <div className="flex gap-1.5 mb-3 overflow-x-auto">
            {['all', 'artistic', 'stylize', 'color', 'distortion', 'enhance'].map(c => (
              <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={`h-7 px-2.5 rounded-md text-[12px] capitalize shrink-0 ${focusRing} ${cat === c ? 'bg-void-700 text-white' : 'text-void-400 hover:text-white'}`}>{c === 'distortion' ? 'Distort' : c}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {list.map(e => (
              <button key={e.id} className={tile + ' !p-2 !flex-col !items-stretch !gap-2'} onClick={done(() => s.addAdjustment('voidEffect', e.id))}>
                <FilterThumb effect={e.id} base={base} stamp={stamp} fallback={e.icon} />
                <span className="min-w-0 px-0.5"><span className="block text-[12.5px] font-medium truncate">{e.name}</span><span className="block text-[11.5px] text-void-400 truncate">{e.description}</span></span>
              </button>
            ))}
            {list.length === 0 && <p className="col-span-full text-[12.5px] text-void-500 py-4">No filters match “{q}”.</p>}
          </div>
        </div>
      </div>
    </Modal>
  )
}
