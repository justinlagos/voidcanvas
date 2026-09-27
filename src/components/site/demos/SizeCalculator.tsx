'use client'

// Millimetres or inches to pixels at a chosen dpi, with bleed, and the Editor's own presets one click away.
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { SIZE_PRESETS } from '@/editor/presets'
import { track } from '@/lib/analytics'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const PAPER = [
  ['A6', 105, 148], ['A5', 148, 210], ['A4', 210, 297], ['A3', 297, 420], ['A2', 420, 594], ['A1', 594, 841], ['A0', 841, 1189],
  ['US Letter', 215.9, 279.4], ['Tabloid 11 × 17 in', 279.4, 431.8], ['18 × 24 in', 457.2, 609.6], ['24 × 36 in', 609.6, 914.4], ['Business card 85 × 55', 85, 55], ['Business card 3.5 × 2 in', 88.9, 50.8],
] as const

const px = (mm: number, dpi: number) => Math.round(mm / 25.4 * dpi)

export default function SizeCalculator({ caption }: { caption?: string }) {
  const [unit, setUnit] = useState<'mm' | 'in'>('mm')
  const [w, setW] = useState(297)
  const [h, setH] = useState(420)
  const [dpi, setDpi] = useState(300)
  const [bleed, setBleed] = useState(3)
  const touched = { current: false }
  const mm = (v: number) => unit === 'mm' ? v : v * 25.4
  const W = mm(w), H = mm(h), B = unit === 'mm' ? bleed : bleed * 25.4
  const bpx = Math.ceil(B / 25.4 * dpi) // bleed rounds up so it is never short
  const trim = { w: px(W, dpi), h: px(H, dpi) }, full = { w: trim.w + bpx * 2, h: trim.h + bpx * 2 }
  const preset = SIZE_PRESETS.find(p => Math.abs(p.width - trim.w) <= 2 && Math.abs(p.height - trim.h) <= 2)
  const mark = () => { if (!touched.current) { touched.current = true; track('learn.demo', { kind: 'size-calculator' }) } }
  const pick = (pw: number, ph: number) => { mark(); if (unit === 'mm') { setW(pw); setH(ph) } else { setW(+(pw / 25.4).toFixed(2)); setH(+(ph / 25.4).toFixed(2)) } }
  const field = `h-9 px-2.5 rounded-lg bg-[var(--lp-field)] border border-lp-line text-lp-text tabular-nums ${focus}`

  return (
    <figure className="not-prose rounded-[24px] border border-lp-line bg-lp-card overflow-hidden">
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="p-5 flex flex-col gap-4 text-[13.5px]">
          <div className="flex flex-wrap gap-1.5">
            {PAPER.map(([n, pw, ph]) => <button key={n} type="button" onClick={() => pick(pw, ph)} className={`h-7 px-2.5 rounded-full border border-lp-line text-[12.5px] text-lp-dim hover:text-lp-fg hover:border-lp-faint ${focus}`}>{n}</button>)}
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <label className="block"><span className="block text-lp-dim text-[12.5px]">Width</span><input type="number" step="any" value={w} onChange={e => { setW(+e.target.value); mark() }} className={`mt-1 w-full ${field}`} /></label>
            <label className="block"><span className="block text-lp-dim text-[12.5px]">Height</span><input type="number" step="any" value={h} onChange={e => { setH(+e.target.value); mark() }} className={`mt-1 w-full ${field}`} /></label>
            <div className="inline-flex p-0.5 rounded-full bg-lp-panel border border-lp-line h-9">
              {(['mm', 'in'] as const).map(u => <button key={u} type="button" onClick={() => { if (u !== unit) { setUnit(u); setW(+(u === 'in' ? w / 25.4 : w * 25.4).toFixed(2)); setH(+(u === 'in' ? h / 25.4 : h * 25.4).toFixed(2)); setBleed(u === 'in' ? 0.125 : 3) } }} aria-pressed={unit === u} className={`h-8 px-3 rounded-full text-[13px] ${unit === u ? 'bg-lp-btn text-lp-btn-fg' : 'text-lp-dim'} ${focus}`}>{u}</button>)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="block text-lp-dim text-[12.5px]">Resolution (dpi)</span>
              <select value={dpi} onChange={e => { setDpi(+e.target.value); mark() }} className={`mt-1 w-full ${field}`}>{[72, 96, 150, 200, 300, 600].map(d => <option key={d} value={d}>{d}</option>)}</select></label>
            <label className="block"><span className="block text-lp-dim text-[12.5px]">Bleed each side ({unit})</span><input type="number" step="any" value={bleed} onChange={e => { setBleed(+e.target.value); mark() }} className={`mt-1 w-full ${field}`} /></label>
          </div>
        </div>
        <div className="p-5 border-t md:border-t-0 md:border-l border-lp-line flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lp-faint">Set up the document as</p>
          <p className="text-[30px] leading-none font-semibold tracking-[-0.03em] text-lp-fg tabular-nums">{full.w} × {full.h} px</p>
          <p className="text-[13.5px] text-lp-dim">{B > 0 ? <>including {unit === 'mm' ? bleed : bleed.toFixed(3)} {unit} bleed on each side. The trim is <span className="text-lp-fg tabular-nums">{trim.w} × {trim.h} px</span>.</> : <>with no bleed. Add some if anything touches the edge.</>}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px] border-t border-lp-line pt-3">
            <dt className="text-lp-dim">1 mm</dt><dd className="tabular-nums text-lp-fg">{(dpi / 25.4).toFixed(1)} px</dd>
            <dt className="text-lp-dim">5 mm safe area</dt><dd className="tabular-nums text-lp-fg">{px(5, dpi)} px in from the trim</dd>
            <dt className="text-lp-dim">Photo needed</dt><dd className="tabular-nums text-lp-fg">at least {trim.w} px wide to fill the width</dd>
          </dl>
          {preset
            ? <Link href={`/editor?preset=${preset.id}`} onClick={() => track('learn.try', { where: 'size-calculator', preset: preset.id })} className={`mt-auto inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-lp-btn text-lp-btn-fg text-[14px] font-medium hover:bg-lp-btn-hover ${focus}`}>Open the {preset.label} preset <ArrowRight size={15} /></Link>
            : <Link href="/editor" onClick={() => track('learn.try', { where: 'size-calculator', custom: `${full.w}x${full.h}` })} className={`mt-auto inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-lp-btn text-lp-btn-fg text-[14px] font-medium hover:bg-lp-btn-hover ${focus}`}>Open the Editor at a custom size <ArrowRight size={15} /></Link>}
        </div>
      </div>
      {caption && <figcaption className="px-5 py-3 border-t border-lp-line text-[13.5px] text-lp-dim">{caption}</figcaption>}
    </figure>
  )
}
