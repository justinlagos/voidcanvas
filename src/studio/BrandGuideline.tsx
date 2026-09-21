'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Download, ImagePlus, RefreshCw } from 'lucide-react'
import { Button, focusRing } from '@/editor/components/ui'
import { ensureFont } from '@/editor/io'
import { extractPalette } from '@/editor/engine'
import { generateBrand, onLight, type Brand } from './brandgen'

function useObjectUrl(blob?: Blob | null) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return url
}

// ── Mockups drawn from the brand, so every guideline shows the system in use ──

function CardMock({ b }: { b: Brand }) {
  const p = b.palette[0]
  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-black/5" style={{ background: p.hex, aspectRatio: '1.6' }}>
      <div className="h-full p-5 flex flex-col justify-between" style={{ color: onLight(p.hex) ? '#fff' : '#111' }}>
        <div style={{ fontFamily: b.fonts.heading, fontWeight: 700, fontSize: 22 }}>{b.name}</div>
        <div>
          <div style={{ fontFamily: b.fonts.body, fontSize: 12, opacity: 0.85 }}>{b.tagline || b.voice.tone}</div>
          <div className="mt-2 inline-block px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{ background: b.accent, color: onLight(b.accent) ? '#fff' : '#111', borderRadius: b.radius }}>Get started</div>
        </div>
      </div>
    </div>
  )
}

function PostMock({ b }: { b: Brand }) {
  const bg = b.neutrals[0]
  return (
    <div className="rounded-xl overflow-hidden border border-black/5" style={{ background: bg, aspectRatio: '0.8' }}>
      <div className="h-full p-5 flex flex-col" style={{ color: b.neutrals[4] }}>
        <div className="w-8 h-8 rounded-lg mb-auto" style={{ background: b.palette[0].hex }} />
        <div style={{ fontFamily: b.fonts.heading, fontWeight: 700, fontSize: 30, lineHeight: 1.05 }}>{b.voice.words[0]}</div>
        <div className="mt-2" style={{ fontFamily: b.fonts.body, fontSize: 12, color: b.neutrals[3] }}>{b.tagline || b.name}</div>
        <div className="mt-3 flex gap-1.5">{b.palette.slice(0, 3).map(c => <span key={c.hex} className="w-6 h-1.5 rounded-full" style={{ background: c.hex }} />)}</div>
      </div>
    </div>
  )
}

function ButtonMock({ b }: { b: Brand }) {
  return (
    <div className="rounded-xl p-5 border border-black/5 flex flex-col gap-2.5 justify-center" style={{ background: b.neutrals[0], aspectRatio: '1.6' }}>
      {[['Primary', b.accent, onLight(b.accent) ? '#fff' : '#111'], ['Secondary', b.palette[1].hex, onLight(b.palette[1].hex) ? '#fff' : '#111']].map(([label, bg, fg]) => (
        <div key={label} className="px-4 py-2.5 text-center text-[13px] font-medium" style={{ background: bg, color: fg, borderRadius: b.radius, fontFamily: b.fonts.body }}>{label} button</div>
      ))}
      <div className="px-4 py-2.5 text-center text-[13px] font-medium border" style={{ borderColor: b.accent, color: b.accent, borderRadius: b.radius, fontFamily: b.fonts.body }}>Outline button</div>
    </div>
  )
}

// ── The document itself. Everything is data-driven off `brand`. ──

function Guideline({ brand, logoUrl }: { brand: Brand; logoUrl: string | null }) {
  const b = brand
  useEffect(() => { ensureFont(b.fonts.heading, 700); ensureFont(b.fonts.body, 400) }, [b.fonts])
  const Section = ({ n, title, children }: any) => (
    <section className="px-10 py-9 border-t border-black/8 break-inside-avoid">
      <div className="flex items-baseline gap-3 mb-5"><span className="text-[12px] tabular-nums text-black/40">{String(n).padStart(2, '0')}</span><h2 className="text-[15px] font-semibold tracking-tight" style={{ fontFamily: b.fonts.heading }}>{title}</h2></div>
      {children}
    </section>
  )
  return (
    <div id="brand-doc" className="mx-auto bg-white text-[#111]" style={{ width: 820 }}>
      {/* Cover */}
      <div className="px-10 pt-14 pb-12" style={{ background: b.palette[0].hex, color: onLight(b.palette[0].hex) ? '#fff' : '#111' }}>
        {logoUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logoUrl} alt="" className="h-12 mb-8 object-contain" /> : <div className="h-12 w-12 rounded-xl mb-8" style={{ background: onLight(b.palette[0].hex) ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.15)' }} />}
        <div className="text-[13px] uppercase tracking-[0.2em] opacity-70 mb-3">Brand guidelines</div>
        <h1 className="text-[52px] leading-[0.98] font-semibold tracking-[-0.02em]" style={{ fontFamily: b.fonts.heading }}>{b.name}</h1>
        {b.tagline && <p className="mt-3 text-[16px] opacity-80" style={{ fontFamily: b.fonts.body }}>{b.tagline}</p>}
        <p className="mt-8 text-[13px] opacity-70">Personality: {b.personality}. {b.voice.tone}.</p>
      </div>

      <Section n={1} title="Logo">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-black/8 flex items-center justify-center p-8" style={{ minHeight: 150 }}>{logoUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logoUrl} alt="" className="max-h-16 object-contain" /> : <span className="text-black/30 text-[13px]">Add a logo to show it here</span>}</div>
          <div className="rounded-xl flex items-center justify-center p-8" style={{ minHeight: 150, background: b.palette[0].hex }}>{logoUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logoUrl} alt="" className="max-h-16 object-contain" style={{ filter: onLight(b.palette[0].hex) ? 'brightness(0) invert(1)' : 'none' }} /> : <span className="text-white/50 text-[13px]">On brand colour</span>}</div>
        </div>
        <p className="mt-4 text-[13px] text-black/60" style={{ fontFamily: b.fonts.body }}>Keep clear space of at least {b.logo.clearSpace}× the logo height on every side. Never place the logo smaller than {b.logo.minWidth}px wide. Do not stretch, recolour outside the palette, or add effects.</p>
      </Section>

      <Section n={2} title="Colour">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {b.palette.map(c => (
            <div key={c.hex} className="rounded-xl overflow-hidden border border-black/8">
              <div className="h-20 flex items-end p-2.5" style={{ background: c.hex, color: c.onLight ? '#fff' : '#111' }}><span className="text-[12px] font-medium">{c.name}</span></div>
              <div className="p-2.5"><div className="text-[12px] font-mono">{c.hex.toUpperCase()}</div><div className="flex gap-1 mt-1.5">{c.tints.map(t => <span key={t} className="flex-1 h-4 rounded" style={{ background: t }} />)}</div></div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-1.5">{b.neutrals.map(n => <div key={n} className="flex-1 h-10 rounded-lg border border-black/8 flex items-end p-1.5" style={{ background: n }}><span className="text-[9px] font-mono" style={{ color: onLight(n) ? '#fff' : '#111' }}>{n.slice(1)}</span></div>)}</div>
        <p className="mt-3 text-[13px] text-black/60" style={{ fontFamily: b.fonts.body }}>Primary carries the brand. Accent is for a single call to action per view. Neutrals build the layout. Each swatch above shows accessible text colour on it.</p>
      </Section>

      <Section n={3} title="Typography">
        <div className="rounded-xl border border-black/8 divide-y divide-black/8">
          {b.scale.map(s => <div key={s.label} className="flex items-baseline gap-5 px-4 py-3"><span className="w-16 text-[11px] text-black/40 shrink-0">{s.label} · {s.px}</span><span style={{ fontFamily: s.label === 'Body' || s.label === 'Small' ? b.fonts.body : b.fonts.heading, fontSize: Math.min(s.px, 40), fontWeight: s.weight, lineHeight: 1 }} className="truncate">{b.name} {b.voice.words[0]}</span></div>)}
        </div>
        <p className="mt-3 text-[13px] text-black/60" style={{ fontFamily: b.fonts.body }}>Headings in <b>{b.fonts.heading}</b>, body in <b>{b.fonts.body}</b>. {b.fonts.pairing}. Scale steps by a {(b.scale[1].px / b.scale[4].px).toFixed(2)}× ratio.</p>
      </Section>

      <Section n={4} title="In use">
        <div className="grid grid-cols-3 gap-4"><CardMock b={b} /><PostMock b={b} /><ButtonMock b={b} /></div>
        <p className="mt-3 text-[13px] text-black/60" style={{ fontFamily: b.fonts.body }}>The same system across a card, a social post and UI. Corners use a {b.radius}px radius. Spacing steps: {b.spacing.join(', ')}px.</p>
      </Section>

      <Section n={5} title="Voice">
        <p className="text-[15px] mb-4" style={{ fontFamily: b.fonts.body }}>{b.voice.tone}.</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-black/8 p-4"><div className="text-[12px] font-semibold text-emerald-700 mb-2">Do</div><ul className="space-y-1.5 text-[13px] text-black/70" style={{ fontFamily: b.fonts.body }}>{b.voice.dos.map(d => <li key={d}>{d}</li>)}</ul></div>
          <div className="rounded-xl border border-black/8 p-4"><div className="text-[12px] font-semibold text-rose-700 mb-2">Don't</div><ul className="space-y-1.5 text-[13px] text-black/70" style={{ fontFamily: b.fonts.body }}>{b.voice.donts.map(d => <li key={d}>{d}</li>)}</ul></div>
        </div>
      </Section>
      <div className="px-10 py-6 border-t border-black/8 text-[11px] text-black/40">{b.name} brand guidelines · generated in Voidcanvas Studio</div>
    </div>
  )
}

const PERSONALITIES = ['Bold', 'Refined', 'Playful', 'Minimal', 'Warm', 'Technical']

export function BrandGuideline({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [seed, setSeed] = useState('#8b7cff')
  const [pIndex, setPIndex] = useState(0)
  const [logo, setLogo] = useState<Blob | null>(null)
  const [salt, setSalt] = useState(0)
  const [exporting, setExporting] = useState(false)
  const logoUrl = useObjectUrl(logo)
  const file = useRef<HTMLInputElement>(null)

  const brand = useMemo(() => generateBrand({ name, tagline, seed: seed + ':' + salt, personality: pIndex }), [name, tagline, seed, pIndex, salt])

  const onLogo = async (f: File) => {
    setLogo(f)
    try { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const img = await createImageBitmap(f); c.getContext('2d')!.drawImage(img, 0, 0, 64, 64); const pal = extractPalette(c, 3); if (pal[0]) setSeed(pal[0]) } catch { /* keep current seed */ }
  }

  const exportPdf = async () => {
    setExporting(true)
    try {
      const { exportBrandPdf } = await import('./brand-pdf')
      let img: HTMLImageElement | null = null
      if (logoUrl) { img = new Image(); img.src = logoUrl; await img.decode().catch(() => { img = null }) }
      await exportBrandPdf(brand, img, `${(name || 'brand').replace(/[^\w ]+/g, '')} guidelines.pdf`)
    } catch (e) { console.error(e); alert('Could not build the PDF. Try again.') } finally { setExporting(false) }
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      <aside className="lg:w-[320px] shrink-0 border-b lg:border-b-0 lg:border-r border-void-800/60 p-5 space-y-4 lg:overflow-y-auto">
        <button onClick={onBack} className={`flex items-center gap-1.5 text-[12.5px] text-void-400 hover:text-white rounded ${focusRing}`}><ArrowLeft size={14} />Back to Studio</button>
        <div><h1 className="text-[20px] font-semibold tracking-tight">Brand guideline builder</h1><p className="mt-1 text-[12.5px] text-void-400">Fill in a little, get a complete system. Every build is different.</p></div>
        <label className="block"><span className="block text-[12px] text-void-400 mb-1">Brand name</span><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Northbound" className={`w-full h-9 px-2.5 rounded-lg bg-void-900 border border-void-800 text-[13px] ${focusRing}`} /></label>
        <label className="block"><span className="block text-[12px] text-void-400 mb-1">Tagline (optional)</span><input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="What it stands for" className={`w-full h-9 px-2.5 rounded-lg bg-void-900 border border-void-800 text-[13px] ${focusRing}`} /></label>
        <div><span className="block text-[12px] text-void-400 mb-1.5">Starting colour</span><div className="flex items-center gap-2"><input type="color" value={seed} onChange={e => setSeed(e.target.value)} className={`w-9 h-9 rounded-lg bg-transparent cursor-pointer ${focusRing}`} /><span className="text-[12px] font-mono text-void-300">{seed}</span></div></div>
        <div><span className="block text-[12px] text-void-400 mb-1.5">Personality</span><div className="grid grid-cols-3 gap-1.5">{PERSONALITIES.map((p, i) => <button key={p} onClick={() => setPIndex(i)} aria-pressed={pIndex === i} className={`h-8 rounded-lg text-[12px] border ${focusRing} ${pIndex === i ? 'border-[#8b7cff] bg-[#8b7cff]/15 text-white' : 'border-void-800 bg-void-900 text-void-300 hover:text-white'}`}>{p}</button>)}</div></div>
        <div><span className="block text-[12px] text-void-400 mb-1.5">Logo (optional)</span><input ref={file} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onLogo(f) }} /><Button onClick={() => file.current?.click()} className="w-full"><ImagePlus size={15} />{logo ? 'Change logo' : 'Add logo'}</Button><p className="mt-1.5 text-[11.5px] text-void-500">Its main colour becomes the starting colour.</p></div>
        <div className="flex gap-2 pt-1">
          <Button onClick={() => setSalt(s => s + 1)} className="flex-1"><RefreshCw size={15} />New take</Button>
          <Button primary onClick={exportPdf} disabled={exporting} className="flex-1"><Download size={15} />{exporting ? 'Building' : 'PDF'}</Button>
        </div>
      </aside>
      <section className="flex-1 min-w-0 overflow-y-auto bg-void-900/40 p-4 sm:p-8">
        <div className="shadow-2xl rounded-xl overflow-hidden w-fit mx-auto"><Guideline brand={brand} logoUrl={logoUrl} /></div>
      </section>
    </div>
  )
}
