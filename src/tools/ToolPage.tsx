'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Download, ImageIcon, Layers, Lock, RotateCcw, Shuffle, Upload } from 'lucide-react'
import { applyEffect } from '@/lib/effects'
import { effectParams } from '@/components/ParamControls'
import { defaultParams, type EffectType, type EffectParams } from '@/store/useStore'
import { Logo } from '@/components/AppNav'
import { canvasToBlob, downloadBlob, sendHandoff } from '@/editor/io'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b7cff]'
const MAX = 2400

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
  const [hasImage, setHasImage] = useState(false)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const cfg = useMemo(() => effectParams[def.effect].filter(c => c.key !== 'opacity'), [def.effect])
  const [params, setParams] = useState<EffectParams>({ ...defaultParams })

  const render = useCallback(() => {
    const src = srcRef.current, out = outRef.current
    if (!src || !out) return
    out.width = src.width; out.height = src.height
    const ctx = out.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(src, 0, 0)
    const img = ctx.getImageData(0, 0, out.width, out.height)
    ctx.putImageData(applyEffect(ctx, img, def.effect, params), 0, 0)
  }, [def.effect, params])

  useEffect(() => { if (hasImage) render() }, [hasImage, params, render])

  const load = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setBusy(true)
    try {
      const bmp = await createImageBitmap(file)
      const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height))
      const c = document.createElement('canvas'); c.width = bmp.width * k; c.height = bmp.height * k
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
      srcRef.current = c; setHasImage(true)
    } finally { setBusy(false) }
  }

  const download = async () => { if (outRef.current) downloadBlob(await canvasToBlob(outRef.current), `${def.slug}.png`) }
  const openInEditor = async () => {
    if (!outRef.current) return
    const blob = await canvasToBlob(outRef.current)
    const id = await sendHandoff({ from: 'effects', name: `${def.name} result`, images: [{ name: def.name, blob }] })
    router.push(`/editor?inbox=${id}`)
  }
  const reset = () => { setParams({ ...defaultParams }); srcRef.current = null; setHasImage(false) }

  const hasSeed = cfg.some(c => c.key === 'seed')

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

      <div className="flex-1 w-full max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        {/* Title */}
        <div className="mb-6 max-w-2xl">
          <div className="flex items-center gap-2 text-[12px] text-[#b9afff] mb-2"><span className="w-1.5 h-1.5 rounded-full bg-[#8b7cff]" />Free browser tool</div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight">{def.name}</h1>
          <p className="mt-2 text-[14.5px] text-void-400 leading-relaxed">{def.tagline}</p>
        </div>

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) load(f) }} />

        {/* Workspace */}
        {!hasImage ? (
          <div className="max-w-2xl">
            <button
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
              onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) load(f) }}
              className={`group w-full rounded-2xl border border-dashed flex flex-col items-center justify-center gap-4 px-8 py-16 text-center transition-colors ${focus} ${over ? 'border-[#8b7cff] bg-[#8b7cff]/[0.06]' : 'border-void-700 hover:border-void-500 bg-[#0e0e12]'}`}>
              <span className="w-16 h-16 rounded-2xl bg-[#8b7cff]/15 border border-[#8b7cff]/25 text-[#b9afff] flex items-center justify-center transition-transform group-hover:scale-105"><Upload size={26} /></span>
              <span className="space-y-1">
                <span className="block text-[16px] font-medium text-void-100">Drop an image, or click to choose</span>
                <span className="block text-[13px] text-void-500">PNG, JPG or WebP. It never leaves your browser.</span>
              </span>
            </button>
            {busy && <div className="mt-3 flex items-center gap-2 text-[13px] text-void-400"><span className="w-4 h-4 rounded-full border-2 border-[#8b7cff] border-t-transparent animate-spin" />Loading image…</div>}
          </div>
        ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          {/* Canvas */}
          <section
            onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) load(f) }}
            className={`relative rounded-2xl border overflow-hidden flex-1 min-w-0 h-[440px] lg:h-[560px] flex items-center justify-center transition-colors ${over ? 'border-[#8b7cff] bg-[#8b7cff]/[0.06]' : 'border-void-800 bg-[#0e0e12]'}`}>
            <div className="w-full h-full p-4 flex items-center justify-center" style={{ background: 'repeating-conic-gradient(#141418 0% 25%, #0e0e12 0% 50%) 50% / 22px 22px' }}>
              <canvas ref={outRef} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            </div>
            {busy && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><span className="w-5 h-5 rounded-full border-2 border-[#8b7cff] border-t-transparent animate-spin" /></div>}
          </section>

          {/* Controls */}
          <aside className="lg:w-[320px] shrink-0 rounded-2xl border border-void-800 bg-[#101014] flex flex-col">
            <div className="p-5 flex flex-col gap-4 flex-1">
              <div>
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
                <button onClick={openInEditor} className={`w-full h-11 rounded-xl bg-[#8b7cff] text-white text-[13.5px] font-medium flex items-center justify-center gap-2 hover:bg-[#9a8dff] ${focus}`}><Layers size={16} />Open in Editor</button>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button onClick={() => fileRef.current?.click()} className={`h-9 rounded-lg bg-void-900 border border-void-800 text-[12.5px] text-void-300 hover:text-white flex items-center justify-center gap-1.5 ${focus}`}><ImageIcon size={14} />Replace</button>
                  <button onClick={reset} className={`h-9 rounded-lg bg-void-900 border border-void-800 text-[12.5px] text-void-300 hover:text-white flex items-center justify-center gap-1.5 ${focus}`}><RotateCcw size={14} />Reset</button>
                </div>
              </div>
            </div>
          </aside>
        </div>
        )}

        {/* Related tools */}
        <section className="mt-8">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12.5px] text-void-500 mr-1">More tools</span>
            {RELATED.filter(r => r.slug !== def.slug).map(r => <Link key={r.slug} href={`/tools/${r.slug}`} className={`h-8 px-3 rounded-lg bg-void-900 border border-void-800 text-[12.5px] text-void-300 hover:text-white hover:border-void-600 inline-flex items-center ${focus}`}>{r.name}</Link>)}
            <Link href="/effects" className={`h-8 px-3 rounded-lg bg-void-900 border border-void-800 text-[12.5px] text-void-300 hover:text-white hover:border-void-600 inline-flex items-center gap-1 ${focus}`}>All 60 effects <ArrowRight size={13} /></Link>
          </div>
        </section>

        {/* About + FAQ */}
        <section className="mt-12 grid md:grid-cols-2 gap-x-12 gap-y-8 max-w-4xl border-t border-void-800/60 pt-8">
          <div>
            <h2 className="text-[15px] font-semibold mb-2">About the {def.name.toLowerCase()}</h2>
            <p className="text-[13.5px] text-void-400 leading-relaxed">{def.about}</p>
            <p className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-void-500"><Lock size={12} className="text-[#b9afff]" />Free, no account, private by default.</p>
          </div>
          <div className="space-y-5">
            {def.faqs.map(f => <div key={f.q}><h3 className="text-[13.5px] font-medium">{f.q}</h3><p className="mt-1 text-[13px] text-void-400 leading-relaxed">{f.a}</p></div>)}
          </div>
        </section>
      </div>

      <footer className="border-t border-void-800/60 px-5 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[12px] text-void-500">
          <span>Voidcanvas</span>
          <Link href="/" className={`hover:text-white ${focus}`}>Home</Link>
        </div>
      </footer>
    </main>
  )
}
