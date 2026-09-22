'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, ImagePlus, Layers, RotateCcw, Upload } from 'lucide-react'
import { applyEffect } from '@/lib/effects'
import { effectParams } from '@/components/ParamControls'
import { defaultParams, type EffectType, type EffectParams } from '@/store/useStore'
import { Logo } from '@/components/AppNav'
import { PrivateBadge } from '@/editor/components/PrivacyPanel'
import { canvasToBlob, downloadBlob, sendHandoff } from '@/editor/io'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b7cff]'
const MAX = 2000

export interface ToolDef {
  slug: string
  effect: EffectType
  name: string
  tagline: string
  /** Long-form copy shown under the workspace for SEO and clarity. */
  about: string
  faqs: { q: string; a: string }[]
  /** Friendly control labels override the raw effect param labels. */
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

  return (
    <main className="min-h-[100dvh] bg-void-950 text-void-100">
      <header className="h-14 flex items-center justify-between px-5 sm:px-8 border-b border-void-800/50">
        <div className="flex items-center gap-3"><Logo /><PrivateBadge /></div>
        <nav className="flex items-center gap-4 text-[13px] text-void-400">
          <Link href="/editor" className={`hover:text-white ${focus}`}>Editor</Link>
          <Link href="/effects" className={`hover:text-white ${focus}`}>Effects</Link>
        </nav>
      </header>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-tight">{def.name}</h1>
          <p className="mt-1.5 text-[14px] sm:text-[15px] text-void-400 max-w-xl">{def.tagline}</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">
          {/* workspace */}
          <div
            onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) load(f) }}
            className={`relative rounded-2xl border overflow-hidden bg-[#0f0f13] flex items-center justify-center min-h-[340px] ${over ? 'border-[#8b7cff]' : 'border-void-800'}`}
            style={{ background: 'repeating-conic-gradient(#161619 0% 25%, #101013 0% 50%) 50% / 22px 22px' }}>
            {!hasImage ? (
              <button onClick={() => fileRef.current?.click()} className={`m-8 flex flex-col items-center gap-3 text-center ${focus}`}>
                <span className="w-14 h-14 rounded-2xl bg-[#8b7cff] text-white flex items-center justify-center"><Upload size={24} /></span>
                <span className="text-[15px] font-medium">Drop an image here, or click to choose</span>
                <span className="text-[13px] text-void-400">Your image never leaves your browser.</span>
              </button>
            ) : (
              <canvas ref={outRef} className="max-w-full max-h-[64vh] object-contain" />
            )}
            {busy && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="w-5 h-5 rounded-full border-2 border-[#8b7cff] border-t-transparent animate-spin" /></div>}
          </div>

          {/* controls */}
          <aside className="rounded-2xl border border-void-800 bg-[#101014] p-4">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) load(f) }} />
            {!hasImage ? (
              <button onClick={() => fileRef.current?.click()} className={`w-full h-10 rounded-lg bg-[#8b7cff] text-white text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-[#9a8dff] ${focus}`}><ImagePlus size={16} />Upload image</button>
            ) : (
              <>
                <div className="space-y-3.5">
                  {cfg.map(c => (
                    <label key={c.key} className="block">
                      <span className="flex items-center justify-between text-[12px] text-void-400 mb-1"><span>{def.labels?.[c.key] ?? c.label}</span><span className="tabular-nums text-void-200">{Math.round(params[c.key] as number)}{c.unit ?? ''}</span></span>
                      <input type="range" min={c.min ?? 0} max={c.max ?? 100} value={params[c.key] as number} onChange={e => setParams(p => ({ ...p, [c.key]: Number(e.target.value) }))} className="w-full accent-[#8b7cff]" />
                    </label>
                  ))}
                  {cfg.some(c => c.key === 'seed') && (
                    <button onClick={() => setParams(p => ({ ...p, seed: Math.random() * 1000 }))} className={`w-full h-9 rounded-lg bg-void-900 border border-void-800 text-[12.5px] text-void-200 hover:text-white ${focus}`}>Randomize</button>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={() => setParams({ ...defaultParams })} className={`h-9 rounded-lg bg-void-900 border border-void-800 text-[12.5px] flex items-center justify-center gap-1.5 hover:text-white ${focus}`}><RotateCcw size={14} />Reset</button>
                  <button onClick={() => fileRef.current?.click()} className={`h-9 rounded-lg bg-void-900 border border-void-800 text-[12.5px] flex items-center justify-center gap-1.5 hover:text-white ${focus}`}><ImagePlus size={14} />New image</button>
                </div>
                <button onClick={download} className={`mt-2 w-full h-10 rounded-lg bg-white text-void-950 text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-void-100 ${focus}`}><Download size={16} />Download PNG</button>
                <button onClick={openInEditor} className={`mt-2 w-full h-10 rounded-lg bg-[#8b7cff] text-white text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-[#9a8dff] ${focus}`}><Layers size={16} />Open in Editor</button>
              </>
            )}
          </aside>
        </div>

        {/* related tools */}
        <section className="mt-8">
          <h2 className="text-[13px] font-semibold text-void-300 mb-2.5">More effect tools</h2>
          <div className="flex flex-wrap gap-2">
            {RELATED.filter(r => r.slug !== def.slug).map(r => <Link key={r.slug} href={`/tools/${r.slug}`} className={`h-9 px-3.5 rounded-lg bg-void-900 border border-void-800 text-[13px] text-void-200 hover:text-white hover:border-void-600 flex items-center ${focus}`}>{r.name}</Link>)}
            <Link href="/effects" className={`h-9 px-3.5 rounded-lg bg-void-900 border border-void-800 text-[13px] text-void-200 hover:text-white hover:border-void-600 flex items-center ${focus}`}>All 60 effects</Link>
          </div>
        </section>

        {/* SEO copy */}
        <section className="mt-10 max-w-2xl">
          <h2 className="text-[16px] font-semibold mb-2">About the {def.name.toLowerCase()}</h2>
          <p className="text-[14px] text-void-400 leading-relaxed">{def.about}</p>
          <div className="mt-6 space-y-4">
            {def.faqs.map(f => <div key={f.q}><h3 className="text-[14px] font-medium">{f.q}</h3><p className="mt-1 text-[13.5px] text-void-400 leading-relaxed">{f.a}</p></div>)}
          </div>
          <p className="mt-8 text-[12.5px] text-void-500">Free. No account. Runs entirely in your browser, so your image never leaves your device.</p>
        </section>
      </div>
    </main>
  )
}
