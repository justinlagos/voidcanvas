'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Download, ImageIcon, Layers, Lock, RotateCcw, Shuffle, Sparkles, Upload } from 'lucide-react'
import { applyEffect } from '@/lib/effects'
import { renderEffectAt } from '@/lib/effect-runner'
import { EXPORT_MAX, FX_WORK } from '@/lib/effect-scale'
import { effectParams } from '@/components/ParamControls'
import { defaultParams, type EffectType, type EffectParams } from '@/store/useStore'
import { Logo } from '@/components/AppNav'
import { canvasToBlob, downloadBlob, sendHandoff } from '@/editor/io'
import { track } from '@/lib/analytics'
import { EFFECT_COUNT } from '@/components/effect-list'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
// Preview at the shared working size, so the tool, the Effects page and the download all look the same.
const MAX = FX_WORK

export interface ToolDef {
  slug: string
  effect: EffectType
  name: string
  tagline: string
  about: string
  faqs: { q: string; a: string }[]
  labels?: Record<string, string>
}

export const RELATED: { slug: string; name: string }[] = [
  { slug: 'halftone', name: 'Halftone' },
  { slug: 'dither', name: 'Dither' },
  { slug: 'glitch', name: 'Glitch' },
]

export function ToolPage({ def }: { def: ToolDef }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const srcRef = useRef<HTMLCanvasElement | null>(null)
  const outRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [imgRev, setImgRev] = useState(0)
  const [isSample, setIsSample] = useState(true)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const cfg = useMemo(() => effectParams[def.effect].filter(c => c.key !== 'opacity'), [def.effect])
  const [params, setParams] = useState<EffectParams>({ ...defaultParams, seed: 500 })
  const hasSeed = cfg.some(c => c.key === 'seed')

  const render = useCallback(() => {
    const src = srcRef.current, out = outRef.current
    if (!src || !out) return
    out.width = src.width; out.height = src.height
    const ctx = out.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(src, 0, 0)
    const img = ctx.getImageData(0, 0, out.width, out.height)
    ctx.putImageData(applyEffect(ctx, img, def.effect, params), 0, 0)
  }, [def.effect, params])

  useEffect(() => { if (ready) render() }, [ready, imgRev, params, render])

  const loadCanvas = (c: HTMLCanvasElement, sample: boolean) => { srcRef.current = c; setIsSample(sample); setReady(true); setImgRev(v => v + 1) }

  const loadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setBusy(true)
    try {
      const bmp = await createImageBitmap(file)
      fullRef.current = bmp
      const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height))
      const c = document.createElement('canvas'); c.width = bmp.width * k; c.height = bmp.height * k
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
      loadCanvas(c, false)
      track('effect.load', { tool: def.slug }); track('effect.apply', { id: String(def.effect), tool: def.slug })
    } finally { setBusy(false) }
  }

  // Load the sample on mount so the tool demonstrates itself immediately.
  useEffect(() => {
    let live = true
    const img = new Image()
    img.onload = () => {
      if (!live) return
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
      c.getContext('2d')!.drawImage(img, 0, 0)
      fullRef.current = null
      loadCanvas(c, true)
    }
    img.src = '/tool-sample.jpg'
    return () => { live = false }
  }, [])

  const fullRef = useRef<ImageBitmap | null>(null)
  // Full size: the original file rendered again with pixel settings scaled from the preview size, so it looks the same, only sharper.
  const download = async () => {
    const src = fullRef.current ?? srcRef.current
    if (!src) return
    setBusy(true)
    try {
      const c = await renderEffectAt(src, def.effect, params, EXPORT_MAX)
      downloadBlob(await canvasToBlob(c), `${def.slug}-${c.width}x${c.height}.png`)
    } catch { if (outRef.current) downloadBlob(await canvasToBlob(outRef.current), `${def.slug}.png`) }
    finally { setBusy(false) }
  }
  // Send the ORIGINAL image plus a live, re-editable filter layer (matches the reference's "Send to Layer Stack").
  const sendToLayerStack = async () => {
    const src = srcRef.current; if (!src) return
    const blob = await canvasToBlob(src)
    const liveParams: Record<string, number> = {}
    for (const c of cfg) liveParams[c.key] = params[c.key] as number
    if ('seed' in params) liveParams.seed = params.seed as number
    const id = await sendHandoff({ from: 'effects', name: def.name, images: [{ name: 'Photo', blob }], liveEffect: { effect: def.effect, params: liveParams } })
    router.push(`/editor?inbox=${id}`)
  }
  // Flattened result as a plain layer (kept as a secondary option).
  const openFlattened = async () => {
    if (!outRef.current) return
    const blob = await canvasToBlob(outRef.current)
    const id = await sendHandoff({ from: 'effects', name: `${def.name} result`, images: [{ name: def.name, blob }] })
    router.push(`/editor?inbox=${id}`)
  }

  return (
    <main className="min-h-[100dvh] bg-void-950 text-void-100 flex flex-col">
      <header className="h-14 shrink-0 flex items-center justify-between px-5 sm:px-8 border-b border-void-800/60">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="hidden sm:inline-flex items-center gap-1 px-2 h-6 rounded-full bg-void-900 border border-void-800 text-[11px] text-void-400"><Lock size={10} />Runs in your browser</span>
        </div>
        <nav className="flex items-center gap-1 text-[13px]">
          <Link href="/effects" className={`px-3 h-8 inline-flex items-center rounded-lg text-void-400 hover:text-white hover:bg-void-900 ${focus}`}>Effects</Link>
          <Link href="/editor" className={`px-3 h-8 inline-flex items-center rounded-lg text-void-100 bg-void-800/70 hover:bg-void-800 ${focus}`}>Open Editor</Link>
        </nav>
      </header>

      <div className="flex-1 w-full max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {/* Title */}
        <div className="mb-7 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-light mb-3"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Free browser tool</div>
          <h1 className="text-[36px] sm:text-[46px] font-semibold tracking-[-0.03em] leading-[1.02]">{def.name}</h1>
          <p className="mt-3 text-[16px] sm:text-[17px] text-void-300 leading-relaxed">{def.tagline}</p>
        </div>

        {/* Workspace: always two columns, sample loaded by default */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f) }} />
          {/* Canvas */}
          <section
            onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f) }}
            className={`relative rounded-2xl border overflow-hidden flex-1 min-w-0 h-[440px] lg:h-[560px] flex items-center justify-center transition-colors ${over ? 'border-accent bg-accent/[0.06]' : 'border-void-800 bg-[#0e0e12]'}`}>
            <div className="w-full h-full p-4 flex items-center justify-center" style={{ background: 'repeating-conic-gradient(#141418 0% 25%, #0e0e12 0% 50%) 50% / 22px 22px' }}>
              <canvas ref={outRef} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            </div>
            {isSample && ready && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-black/60 backdrop-blur text-[11.5px] text-void-200 border border-white/10"><Sparkles size={12} className="text-accent-light" />Example. Drop your own image to start.</span>
            )}
            {over && <div className="absolute inset-0 flex items-center justify-center bg-accent/10 pointer-events-none"><span className="px-4 h-10 inline-flex items-center rounded-xl bg-accent text-white text-[13px] font-medium">Drop to load</span></div>}
            {busy && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><span className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>}
          </section>

          {/* Controls */}
          <aside className="lg:w-[320px] shrink-0 rounded-2xl border border-void-800 bg-[#101014] flex flex-col">
            <div className="p-5 flex flex-col gap-4 flex-1">
              <button onClick={() => fileRef.current?.click()} className={`w-full h-11 rounded-xl bg-accent text-white text-[13.5px] font-medium flex items-center justify-center gap-2 hover:bg-accent-hover ${focus}`}><Upload size={16} />Upload your image</button>
              <div className="border-t border-void-800/70 pt-4">
                <h2 className="text-[13px] font-semibold text-void-200 mb-3">Adjust</h2>
                <div className="space-y-3.5">
                  {cfg.map(c => (
                    <label key={c.key} className="block">
                      <span className="flex items-center justify-between text-[12px] text-void-400 mb-1.5"><span>{def.labels?.[c.key] ?? c.label}</span><span className="tabular-nums text-void-200">{Math.round(params[c.key] as number)}{c.unit ?? ''}</span></span>
                      <input type="range" min={c.min ?? 0} max={c.max ?? 100} value={params[c.key] as number} onChange={e => setParams(p => ({ ...p, [c.key]: Number(e.target.value) }))} className="w-full accent-[#8b7cff]" />
                    </label>
                  ))}
                  {hasSeed && <button onClick={() => setParams(p => ({ ...p, seed: Math.random() * 1000 }))} className={`w-full h-9 rounded-lg bg-void-900 border border-void-800 text-[12.5px] text-void-200 hover:text-white flex items-center justify-center gap-1.5 ${focus}`}><Shuffle size={13} />Shuffle</button>}
                </div>
              </div>
              <div className="mt-auto pt-3 space-y-2 border-t border-void-800/70">
                <button onClick={download} className={`w-full h-11 rounded-xl bg-white text-void-950 text-[13.5px] font-medium flex items-center justify-center gap-2 hover:bg-void-100 ${focus}`}><Download size={16} />Download PNG</button>
                <button onClick={sendToLayerStack} className={`w-full h-11 rounded-xl bg-void-800 text-void-100 text-[13.5px] font-medium flex items-center justify-center gap-2 hover:bg-void-700 ${focus}`}><Layers size={16} />Send to Layer Stack</button>
                <button onClick={() => setParams({ ...defaultParams })} className={`w-full h-9 rounded-lg text-[12.5px] text-void-400 hover:text-white flex items-center justify-center gap-1.5 ${focus}`}><RotateCcw size={13} />Reset adjustments</button>
              </div>
            </div>
          </aside>
        </div>

        {/* Related tools */}
        <section className="mt-6 flex items-center gap-2 flex-wrap">
          <span className="text-[12.5px] text-void-500 mr-1">More tools</span>
          {RELATED.filter(r => r.slug !== def.slug).map(r => <Link key={r.slug} href={`/tools/${r.slug}`} className={`h-8 px-3 rounded-lg bg-void-900 border border-void-800 text-[12.5px] text-void-300 hover:text-white hover:border-void-600 inline-flex items-center ${focus}`}>{r.name}</Link>)}
          <Link href="/effects" className={`h-8 px-3 rounded-lg bg-void-900 border border-void-800 text-[12.5px] text-void-300 hover:text-white hover:border-void-600 inline-flex items-center gap-1 ${focus}`}>All {EFFECT_COUNT} effects <ArrowRight size={13} /></Link>
        </section>

        {/* About + FAQ */}
        <section className="mt-14 grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-x-14 gap-y-8 border-t border-void-800/60 pt-10">
          <div>
            <h2 className="text-[17px] font-semibold mb-2.5">About the {def.name.toLowerCase()}</h2>
            <p className="text-[14px] text-void-400 leading-relaxed">{def.about}</p>
            <p className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] text-void-500"><Lock size={12} className="text-accent-light" />Free, no account, private by default.</p>
          </div>
          <div className="divide-y divide-void-800/60">
            {def.faqs.map(f => <div key={f.q} className="py-3.5 first:pt-0"><h3 className="text-[14px] font-medium">{f.q}</h3><p className="mt-1.5 text-[13.5px] text-void-400 leading-relaxed">{f.a}</p></div>)}
          </div>
        </section>
      </div>

      <footer className="border-t border-void-800/60 px-5 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[12px] text-void-500">
          <Logo />
          <span className="flex items-center gap-4">
            <Link href="/editor" className={`hover:text-white ${focus}`}>Editor</Link>
            <Link href="/effects" className={`hover:text-white ${focus}`}>Effects</Link>
            <Link href="/" className={`hover:text-white ${focus}`}>Home</Link>
          </span>
        </div>
      </footer>
    </main>
  )
}
