'use client'

// A live effect on a sample image, with the same sliders as the quick tools. Loaded only on articles that ask for it.
// Uses the real effect code (src/lib/effects.ts), so what the reader sees is what the tool does.
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { applyEffect } from '@/lib/effects'
import type { EffectParams, EffectType } from '@/store/useStore'
import { track } from '@/lib/analytics'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const WORK = 720 // longest side of the working image; enough to read the dots, quick to redraw

type Control = { key: keyof EffectParams; label: string; min?: number; max?: number; type?: 'range' | 'color'; hint?: string }
const CONTROLS: Partial<Record<EffectType, Control[]>> = {
  halftone: [
    { key: 'scale', label: 'Dot size', min: 10, max: 100, hint: 'Bigger dots read from further away and print more safely.' },
    { key: 'intensity', label: 'Contrast', min: 20, max: 100, hint: 'How fast dots grow in the shadows.' },
  ],
  dither: [{ key: 'threshold', label: 'Threshold', min: 0, max: 100, hint: 'Where the pattern tips from light to dark.' }],
  duotone: [
    { key: 'color1', label: 'Shadows', type: 'color' },
    { key: 'color2', label: 'Highlights', type: 'color' },
  ],
  glitch: [
    { key: 'intensity', label: 'Offset', min: 10, max: 100, hint: 'How far the shifted strips move.' },
    { key: 'scale', label: 'Slice height', min: 5, max: 100, hint: 'Thin strips read as noise; tall ones as broken blocks.' },
    { key: 'seed', label: 'Randomize', min: 0, max: 1000, hint: 'Which strips move.' },
  ],
  posterize: [{ key: 'intensity', label: 'Levels', min: 10, max: 100 }],
  popart: [
    { key: 'intensity', label: 'Colour levels', min: 10, max: 100, hint: 'Low values give three flat colours; high values up to eight.' },
    { key: 'amount', label: 'Colour blend', min: 0, max: 100, hint: 'How much of the pop palette replaces the photo\'s own colours.' },
  ],
  edge: [{ key: 'threshold', label: 'Threshold', min: 0, max: 200, hint: 'Low shows every texture; high keeps only the strongest outlines.' }],
  vintage: [{ key: 'intensity', label: 'Intensity', min: 10, max: 100, hint: 'Fade, warmth and dark corners together. Higher looks older.' }],
  sketch: [{ key: 'intensity', label: 'Line strength', min: 10, max: 100, hint: 'Low gives a light outline; high brings in texture and heavy lines.' }],
  pixelSort: [{ key: 'threshold', label: 'Brightness threshold', min: 0, max: 100, hint: 'Only pixels brighter than this are sorted. Lower means longer streaks.' }],
  grain: [
    { key: 'amount', label: 'Amount', min: 0, max: 100, hint: 'How strong the grain is. Film is usually 10 to 30.' },
    { key: 'scale', label: 'Grain size', min: 10, max: 100, hint: 'Fine grain reads as fast film; coarse as pushed film or print.' },
    { key: 'seed', label: 'Randomize', min: 0, max: 1000, hint: 'A new grain pattern with the same strength.' },
  ],
  crt: [
    { key: 'intensity', label: 'Barrel distortion', min: 0, max: 100, hint: 'How much the screen bulges. 0 keeps it flat.' },
    { key: 'scale', label: 'Scanline gap', min: 10, max: 100, hint: 'Low gives dense lines; high spaces them out.' },
  ],
}
const START: Partial<Record<EffectType, Partial<EffectParams>>> = {
  halftone: { scale: 40, intensity: 60 },
  dither: { threshold: 50 },
  duotone: { color1: '#0078BF', color2: '#F4EFE6' }, // risograph blue on warm white
  glitch: { intensity: 40, scale: 30 },
  posterize: { intensity: 30 },
  popart: { intensity: 40, amount: 100 },
  edge: { threshold: 60 },
  vintage: { intensity: 60 },
  sketch: { intensity: 50 },
  pixelSort: { threshold: 55 },
  grain: { amount: 30, scale: 30, seed: 500 },
  crt: { intensity: 40, scale: 30 },
}
const SAMPLE: Partial<Record<EffectType, string>> = { halftone: '/landing/beard.jpg', dither: '/landing/beard.jpg', duotone: '/landing/red-teal.jpg', glitch: '/landing/smoke.jpg', popart: '/landing/beard.jpg', edge: '/landing/beard.jpg', vintage: '/landing/latte.jpg', sketch: '/landing/beard.jpg', pixelSort: '/landing/smoke.jpg', grain: '/landing/beanie.jpg', crt: '/landing/pink.jpg' }
const OPEN: Partial<Record<EffectType, { label: string; href: string }>> = {
  halftone: { label: 'Open the Halftone tool', href: '/tools/halftone' },
  dither: { label: 'Open the Dither tool', href: '/tools/dither' },
  glitch: { label: 'Open the Glitch tool', href: '/tools/glitch' },
}

const base: EffectParams = { intensity: 50, scale: 50, color1: '#000000', color2: '#ffffff', color3: '#ff4444', threshold: 50, amount: 50, seed: 500, frequency: 50, amplitude: 50, angle: 0, opacity: 100 } as EffectParams

export default function EffectDemo({ effect, caption }: { effect: string; caption?: string }) {
  const fx = effect as EffectType
  const controls = CONTROLS[fx] ?? []
  const start = { ...base, ...(START[fx] ?? {}) }
  const [params, setParams] = useState<EffectParams>(start)
  const [on, setOn] = useState(true)
  const [ready, setReady] = useState(false)
  const src = useRef<HTMLCanvasElement | null>(null)
  const out = useRef<HTMLCanvasElement>(null)
  const touched = useRef(false)

  useEffect(() => {
    let alive = true
    const img = new Image()
    img.src = SAMPLE[fx] ?? '/landing/beard.jpg'
    img.decode().then(() => {
      if (!alive) return
      const k = Math.min(1, WORK / Math.max(img.naturalWidth, img.naturalHeight))
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      src.current = c; setReady(true)
    }).catch(() => {})
    return () => { alive = false }
  }, [fx])

  const render = useCallback(() => {
    const s = src.current, o = out.current
    if (!s || !o) return
    o.width = s.width; o.height = s.height
    const ctx = o.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(s, 0, 0)
    if (!on) return
    const img = ctx.getImageData(0, 0, o.width, o.height)
    ctx.putImageData(applyEffect(ctx, img, fx, params), 0, 0)
  }, [fx, params, on])
  useEffect(() => { if (ready) render() }, [ready, render])

  const set = (key: keyof EffectParams, v: number | string) => {
    setParams(p => ({ ...p, [key]: v }))
    if (!touched.current) { touched.current = true; track('learn.demo', { kind: 'effect', effect: fx }) }
  }
  const open = OPEN[fx] ?? { label: 'Open Effects', href: `/effects?effect=${fx}` }

  return (
    <figure className="not-prose rounded-[24px] border border-lp-line bg-lp-card overflow-hidden">
      <div className="grid md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="relative bg-[#0b0b0d] flex items-center justify-center min-h-[240px]">
          <canvas ref={out} className="block w-full h-auto max-h-[520px] object-contain" aria-label={`Sample image with the ${effect} effect`} role="img" />
          {!ready && <span className="absolute text-[13px] text-white/60">Loading the sample…</span>}
        </div>
        <div className="p-5 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-lp-line">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-lp-faint">Try it</span>
            <button type="button" onClick={() => setOn(v => !v)} aria-pressed={!on} className={`h-7 px-2.5 rounded-full border border-lp-line text-[12px] ${on ? 'text-lp-dim hover:text-lp-fg' : 'bg-lp-btn text-lp-btn-fg'} ${focus}`}>{on ? 'Show original' : 'Show effect'}</button>
          </div>
          {controls.map(c => (
            <label key={c.key} className="block">
              <span className="flex items-center justify-between text-[13.5px] text-lp-fg"><span>{c.label}</span>{c.type !== 'color' && <span className="tabular-nums text-lp-dim">{params[c.key] as number}</span>}</span>
              {c.type === 'color'
                ? <input type="color" value={params[c.key] as string} onChange={e => set(c.key, e.target.value)} className="mt-1.5 block w-full h-9 rounded-lg border border-lp-line bg-transparent cursor-pointer" />
                : <input type="range" min={c.min} max={c.max} value={params[c.key] as number} onChange={e => set(c.key, Number(e.target.value))} className="mt-1.5 w-full accent-[var(--accent)]" />}
              {c.hint && <span className="block mt-1 text-[12.5px] leading-snug text-lp-dim">{c.hint}</span>}
            </label>
          ))}
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <button type="button" onClick={() => setParams(start)} className={`inline-flex items-center gap-1.5 text-[13px] text-lp-dim hover:text-lp-fg ${focus}`}><RotateCcw size={13} />Reset</button>
            <Link href={open.href} onClick={() => track('learn.try', { where: 'demo', effect: fx, href: open.href })} className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-lp-btn text-lp-btn-fg text-[14px] font-medium hover:bg-lp-btn-hover ${focus}`}>{open.label} <ArrowRight size={15} /></Link>
            <span className="text-[12px] text-lp-faint">Same code as the tool. Your own photo never leaves your device.</span>
          </div>
        </div>
      </div>
      {caption && <figcaption className="px-5 py-3 border-t border-lp-line text-[13.5px] text-lp-dim">{caption}</figcaption>}
    </figure>
  )
}
