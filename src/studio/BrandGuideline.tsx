'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, ImagePlus, Layers, Monitor, RefreshCw, FileText } from 'lucide-react'
import { Button, focusRing } from '@/editor/components/ui'
import { canvasToBlob, sendHandoff } from '@/editor/io'
import { extractPalette } from '@/editor/engine'
import { generateBrand, type Brand } from './brandgen'
import { PAGE_COUNT, SIZES, pageList, renderPage, type Orientation } from './brand-pages'

function useLogoImage(blob: Blob | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!blob) { setImg(null); return }
    const url = URL.createObjectURL(blob); const i = new Image()
    i.onload = () => setImg(i); i.onerror = () => setImg(null); i.src = url
    return () => URL.revokeObjectURL(url)
  }, [blob])
  return img
}

function Page({ index, brand, logo, o, cssWidth }: { index: number; brand: Brand; logo: HTMLImageElement | null; o: Orientation; cssWidth: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let live = true
    renderPage(index, brand, logo, o, 1.5).then(c => { if (!live || !ref.current) return; const x = ref.current.getContext('2d')!; ref.current.width = c.width; ref.current.height = c.height; x.drawImage(c, 0, 0) })
    return () => { live = false }
  }, [index, brand, logo, o])
  const ar = SIZES[o].h / SIZES[o].w
  return <canvas ref={ref} className="block rounded-lg shadow-lg bg-white" style={{ width: cssWidth, height: cssWidth * ar }} />
}

const PERSONALITIES = ['Bold', 'Refined', 'Playful', 'Minimal', 'Warm', 'Technical']

export function BrandGuideline({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [seed, setSeed] = useState('#8b7cff')
  const [pIndex, setPIndex] = useState(0)
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null)
  const [salt, setSalt] = useState(0)
  const [o, setO] = useState<Orientation>('landscape')
  const [busy, setBusy] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const logo = useLogoImage(logoBlob)
  const file = useRef<HTMLInputElement>(null)
  const brand = useMemo(() => generateBrand({ name, tagline, seed: seed + ':' + salt, personality: pIndex }), [name, tagline, seed, pIndex, salt])
  const pages = pageList()

  const onLogo = async (f: File) => {
    setLogoBlob(f)
    try { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const img = await createImageBitmap(f); c.getContext('2d')!.drawImage(img, 0, 0, 64, 64); const pal = extractPalette(c, 3); if (pal[0]) setSeed(pal[0]) } catch { /* keep seed */ }
  }

  const exportPdf = async () => {
    setBusy('Building PDF')
    try { const { exportBrandPdf } = await import('./brand-pdf'); await exportBrandPdf(brand, logo, o, `${(name || 'brand').replace(/[^\w ]+/g, '')} guidelines ${o}.pdf`) }
    catch (e) { console.error(e); alert('Could not build the PDF.') } finally { setBusy(null) }
  }

  const openInEditor = async () => {
    setBusy('Opening in Editor')
    try {
      const imgs: { name: string; blob: Blob }[] = []
      for (let i = 0; i < PAGE_COUNT; i++) { const c = await renderPage(i, brand, logo, o, 1.5); imgs.push({ name: pages[i].title, blob: await canvasToBlob(c) }) }
      const id = await sendHandoff({ from: 'studio', boards: true, name: `${name || 'Brand'} guidelines`, size: { width: SIZES[o].w, height: SIZES[o].h }, palette: brand.palette.map(p => p.hex), images: imgs })
      router.push(`/editor?inbox=${id}`)
    } catch (e) { console.error(e); setBusy(null) }
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      <aside className="lg:w-[320px] shrink-0 border-b lg:border-b-0 lg:border-r border-void-800/60 p-5 space-y-4 lg:overflow-y-auto">
        <button onClick={onBack} className={`flex items-center gap-1.5 text-[12.5px] text-void-400 hover:text-white rounded ${focusRing}`}><ArrowLeft size={14} />Back to Studio</button>
        <div><h1 className="text-[20px] font-semibold tracking-tight">Brand guideline builder</h1><p className="mt-1 text-[12.5px] text-void-400">Fill in a little, get a full deck or document. Designed pages, not a scroll.</p></div>
        <label className="block"><span className="block text-[12px] text-void-400 mb-1">Brand name</span><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Northbound" className={`w-full h-9 px-2.5 rounded-lg bg-void-900 border border-void-800 text-[13px] ${focusRing}`} /></label>
        <label className="block"><span className="block text-[12px] text-void-400 mb-1">Tagline (optional)</span><input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="What it stands for" className={`w-full h-9 px-2.5 rounded-lg bg-void-900 border border-void-800 text-[13px] ${focusRing}`} /></label>
        <div><span className="block text-[12px] text-void-400 mb-1.5">Starting colour</span><div className="flex items-center gap-2"><input type="color" value={seed} onChange={e => setSeed(e.target.value)} className={`w-9 h-9 rounded-lg bg-transparent cursor-pointer ${focusRing}`} /><span className="text-[12px] font-mono text-void-300">{seed}</span></div></div>
        <div><span className="block text-[12px] text-void-400 mb-1.5">Personality</span><div className="grid grid-cols-3 gap-1.5">{PERSONALITIES.map((p, i) => <button key={p} onClick={() => setPIndex(i)} aria-pressed={pIndex === i} className={`h-8 rounded-lg text-[12px] border ${focusRing} ${pIndex === i ? 'border-accent bg-accent-soft text-white' : 'border-void-800 bg-void-900 text-void-300 hover:text-white'}`}>{p}</button>)}</div></div>
        <div><span className="block text-[12px] text-void-400 mb-1.5">Format</span><div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => setO('landscape')} aria-pressed={o === 'landscape'} className={`h-9 rounded-lg text-[12.5px] border flex items-center justify-center gap-1.5 ${focusRing} ${o === 'landscape' ? 'border-accent bg-accent-soft text-white' : 'border-void-800 bg-void-900 text-void-300 hover:text-white'}`}><Monitor size={14} />Deck</button>
          <button onClick={() => setO('portrait')} aria-pressed={o === 'portrait'} className={`h-9 rounded-lg text-[12.5px] border flex items-center justify-center gap-1.5 ${focusRing} ${o === 'portrait' ? 'border-accent bg-accent-soft text-white' : 'border-void-800 bg-void-900 text-void-300 hover:text-white'}`}><FileText size={14} />Document</button>
        </div></div>
        <div><span className="block text-[12px] text-void-400 mb-1.5">Logo (optional)</span><input ref={file} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onLogo(f) }} /><Button onClick={() => file.current?.click()} className="w-full"><ImagePlus size={15} />{logoBlob ? 'Change logo' : 'Add logo'}</Button></div>
        <div className="space-y-2 pt-1">
          <Button onClick={() => setSalt(s => s + 1)} className="w-full"><RefreshCw size={15} />New art direction</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button primary onClick={exportPdf} disabled={!!busy} className="w-full"><Download size={15} />PDF</Button>
            <Button onClick={openInEditor} disabled={!!busy} className="w-full"><Layers size={15} />Editor</Button>
          </div>
          <p className="text-[11.5px] text-void-500 leading-relaxed">PDF exports all {PAGE_COUNT} pages. Editor opens them as layers to tweak by hand.</p>
        </div>
      </aside>

      <section className="flex-1 min-w-0 flex flex-col lg:flex-row min-h-0">
        <nav className="flex lg:flex-col gap-2 p-3 lg:w-[150px] shrink-0 overflow-x-auto lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-void-800/50 bg-void-950/40" aria-label="Pages">
          {pages.map((p, i) => (
            <button key={i} onClick={() => setActive(i)} aria-current={active === i} className={`shrink-0 rounded-lg overflow-hidden border-2 ${active === i ? 'border-accent' : 'border-transparent hover:border-void-600'} ${focusRing}`}>
              <Page index={i} brand={brand} logo={logo} o={o} cssWidth={o === 'landscape' ? 124 : 86} />
              <span className="block text-[10.5px] text-void-400 py-1 text-center truncate" style={{ width: o === 'landscape' ? 124 : 86 }}>{i + 1}. {p.title}</span>
            </button>
          ))}
        </nav>
        <div className="flex-1 min-w-0 overflow-auto bg-void-900/40 p-4 sm:p-8 flex items-start justify-center">
          <Page index={active} brand={brand} logo={logo} o={o} cssWidth={o === 'landscape' ? 1000 : 620} />
        </div>
      </section>

      {busy && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55"><div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[#17171c] border border-void-700 text-[13.5px]"><span className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />{busy}</div></div>}
    </div>
  )
}
