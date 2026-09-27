'use client'

// A type scale you can feel: pick the ratio and base size, read the steps, see the hierarchy change on a real block of text.
import { useState } from 'react'
import { track } from '@/lib/analytics'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const RATIOS = [[1.2, 'Minor third'], [1.25, 'Major third'], [1.333, 'Perfect fourth'], [1.5, 'Perfect fifth'], [1.618, 'Golden ratio']] as const
const STEPS = ['Caption', 'Body', 'Lead', 'H3', 'H2', 'H1', 'Display']
const leading = (px: number) => px >= 48 ? 1.05 : px >= 32 ? 1.15 : px >= 22 ? 1.25 : 1.5

export default function TypeScaleDemo({ caption }: { caption?: string }) {
  const [ratio, setRatio] = useState<number>(1.25)
  const [base, setBase] = useState(16)
  const touched = { current: false }
  const mark = () => { if (!touched.current) { touched.current = true; track('learn.demo', { kind: 'type-scale' }) } }
  const sizes = STEPS.map((_, i) => Math.round(base * Math.pow(ratio, i - 1) * 10) / 10)
  const s = (i: number) => ({ fontSize: sizes[i], lineHeight: leading(sizes[i]) })

  return (
    <figure className="not-prose rounded-[24px] border border-lp-line bg-lp-card overflow-hidden">
      <div className="grid md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="p-6 sm:p-8 overflow-hidden">
          <p className="text-lp-fg font-semibold tracking-[-0.03em]" style={s(6)}>Late shift</p>
          <p className="mt-2 text-lp-fg font-semibold tracking-[-0.02em]" style={s(4)}>One night, three rooms, no phones</p>
          <p className="mt-3 text-lp-muted" style={s(2)}>Doors open at nine. The first room is quiet, the second is not, and the third is a surprise.</p>
          <p className="mt-3 text-lp-text max-w-[52ch]" style={s(1)}>Body text carries the facts: Friday 14 November, tickets on the door, no re-entry after midnight. It needs a comfortable size and a line length under about seventy characters.</p>
          <p className="mt-3 text-lp-dim" style={s(0)}>Caption. Small print sits here at the bottom of the scale.</p>
        </div>
        <div className="p-5 border-t md:border-t-0 md:border-l border-lp-line flex flex-col gap-4 text-[13.5px]">
          <fieldset>
            <legend className="text-lp-fg">Ratio</legend>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {RATIOS.map(([r, n]) => <button key={r} type="button" onClick={() => { setRatio(r); mark() }} aria-pressed={ratio === r} className={`h-7 px-2.5 rounded-full border text-[12.5px] ${ratio === r ? 'bg-lp-btn text-lp-btn-fg border-transparent' : 'border-lp-line text-lp-dim hover:text-lp-fg'} ${focus}`}>{r} <span className="opacity-70">{n}</span></button>)}
            </div>
          </fieldset>
          <label className="block">
            <span className="flex items-center justify-between text-lp-fg"><span>Base size</span><span className="tabular-nums text-lp-dim">{base} px</span></span>
            <input type="range" min={14} max={20} value={base} onChange={e => { setBase(+e.target.value); mark() }} className="mt-1.5 w-full accent-[var(--accent)]" />
          </label>
          <dl className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1 text-[13px] border-t border-lp-line pt-3">
            {STEPS.map((n, i) => <div key={n} className="contents"><dt className="text-lp-dim">{n}</dt><dd className="tabular-nums text-lp-fg text-right">{sizes[i]} px</dd><dd className="tabular-nums text-lp-faint">× {leading(sizes[i])}</dd></div>).reverse()}
          </dl>
          <p className="text-[12px] text-lp-faint leading-snug">Third column is the line spacing the brand guideline builder pairs with each size.</p>
        </div>
      </div>
      {caption && <figcaption className="px-5 py-3 border-t border-lp-line text-[13.5px] text-lp-dim">{caption}</figcaption>}
    </figure>
  )
}
