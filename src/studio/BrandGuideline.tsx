'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowLeft, ArrowUp, Check, AlertCircle, ChevronRight, Copy, Download, Eye, EyeOff, FileText, Globe, GripVertical, ImagePlus, Layers, Lock, Unlock, Monitor, Printer, RefreshCw, RotateCcw, Upload } from 'lucide-react'
import { Button, focusRing } from '@/editor/components/ui'
import { canvasToBlob, downloadBlob, sendHandoff } from '@/editor/io'
import { extractPalette } from '@/editor/engine'
import { useBrand } from './brand/store'
import { FONT_SUGGESTIONS, HARMONIES, PERSONALITIES, SCALES, buildBrand, resolve, type ArtDirection, type Brand, type FontRef, type TokKey } from './brand/tokens'
import { RAMP_STEPS, isHex } from './brand/color'
import { loadFont, registerLocalFont } from './brand/fonts'
import { fileSlug, toAse, toCss, toJson, toTailwind } from './brand/export'
import { PAGE_DEFS, SIZES, renderAll, renderPage, type Orientation, type PageSpec } from './brand-pages'
import { analyseLogo, logoChecks, logoPlacements, type LogoInfo } from './brand/logo'
import { PRINT_TRIM } from './brand-pdf'

function Page({ spec, pageNo, pageCount, brand, logo, o, cssWidth }: { spec: PageSpec; pageNo: number; pageCount: number; brand: Brand; logo: LogoInfo | null; o: Orientation; cssWidth: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let live = true
    const big = cssWidth > 400
    const t = setTimeout(() => {
      renderPage(spec, pageNo, pageCount, brand, logo, o, big ? 1.5 : 0.5).then(c => { if (!live || !ref.current) return; const x = ref.current.getContext('2d')!; ref.current.width = c.width; ref.current.height = c.height; x.drawImage(c, 0, 0) })
    }, big ? 0 : 80)
    return () => { live = false; clearTimeout(t) }
  }, [spec, pageNo, pageCount, brand, logo, o, cssWidth])
  const ar = SIZES[o].h / SIZES[o].w
  return <canvas ref={ref} className="block rounded-md shadow-lg bg-white" style={{ width: cssWidth, height: cssWidth * ar }} />
}

// ── small controls ──
const input = `w-full h-9 px-2.5 rounded-lg bg-void-900 border border-void-800 text-[13px] ${focusRing}`
const seg = (on: boolean) => `h-8 rounded-lg text-[12px] border ${focusRing} ${on ? 'border-accent bg-accent-soft text-white' : 'border-void-800 bg-void-900 text-void-300 hover:text-white'}`

function LockBtn({ k, label }: { k: TokKey; label: string }) {
  const locked = useBrand(s => s.tokens[k].locked), toggle = useBrand(s => s.toggleLock)
  return (
    <button type="button" onClick={() => toggle(k)} aria-pressed={locked} aria-label={`${locked ? 'Unlock' : 'Lock'} ${label.toLowerCase()}`}
      title={locked ? 'Locked. New takes keep this.' : 'Free. New takes can change this.'}
      className={`h-6 w-6 inline-flex items-center justify-center rounded-md ${focusRing} ${locked ? 'text-accent-light bg-accent-soft' : 'text-void-500 hover:text-void-200'}`}>
      {locked ? <Lock size={12.5} /> : <Unlock size={12.5} />}
    </button>
  )
}
function Field({ label, k, hint, children }: { label: string; k?: TokKey; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 min-h-6"><span className="text-[12px] text-void-400">{label}</span>{k && <LockBtn k={k} label={label.replace(/ \d+%$/, '')} />}</div>
      {children}
      {hint && <p className="mt-1 text-[11.5px] text-void-500 leading-snug">{hint}</p>}
    </div>
  )
}
function HexField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = () => { const v = draft.startsWith('#') ? draft : '#' + draft; if (isHex(v)) onChange(v.toLowerCase()); else setDraft(value) }
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} aria-label="Pick colour" className={`w-9 h-9 shrink-0 rounded-lg bg-transparent cursor-pointer ${focusRing}`} />
      <input value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => e.key === 'Enter' && commit()} spellCheck={false} aria-label="Hex value" className={`${input} font-mono uppercase`} />
    </div>
  )
}
function FontField({ k, value }: { k: 'heading' | 'body' | 'mono'; value: FontRef }) {
  const setTok = useBrand(s => s.setTok)
  const [draft, setDraft] = useState(value.family)
  const [err, setErr] = useState('')
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => setDraft(value.family), [value.family])
  const commit = () => { const f = draft.trim(); if (!f || f === value.family) { setDraft(value.family); return } setTok(k, { family: f, source: 'google' }) }
  const upload = async (f: File) => { setErr(''); try { setTok(k, await registerLocalFont(f)) } catch { setErr('That file could not be read as a font. Try .woff2, .woff, .ttf or .otf.') } }
  return (
    <>
      <div className="flex gap-1.5">
        <input value={draft} list="brand-fonts" onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => e.key === 'Enter' && (e.currentTarget.blur())}
          aria-label={`${k} font`} className={input} style={{ fontFamily: `"${value.family}"` }} />
        <input ref={file} type="file" accept=".woff2,.woff,.ttf,.otf" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
        <button type="button" onClick={() => file.current?.click()} title="Use a font file from this device" aria-label="Upload font file"
          className={`h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg bg-void-800/80 text-void-200 hover:bg-void-700 ${focusRing}`}><Upload size={14} /></button>
      </div>
      {value.source === 'local' && <p className="mt-1 text-[11.5px] text-void-500">From your device. It stays in this browser.</p>}
      {err && <p className="mt-1 text-[11.5px] text-rose-300">{err}</p>}
    </>
  )
}
function MiniRamp({ ramp, src }: { ramp: Record<number, string>; src?: number }) {
  return <div className="grid grid-cols-10 h-6 rounded-md overflow-hidden">{RAMP_STEPS.map(s => <span key={s} title={`${s} ${ramp[s]}`} style={{ background: ramp[s] }} className="relative">{s === src && <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/80 ring-1 ring-black/30" />}</span>)}</div>
}

// ── tabs ──
function IdentityTab({ logo, onLogo, brand, logoErr }: { logo: LogoInfo | null; onLogo: (f: File) => void; brand: Brand; logoErr: string }) {
  const t = useBrand(s => s.tokens), set = useBrand(s => s.set), setTok = useBrand(s => s.setTok)
  const r = useMemo(() => resolve(t), [t])
  const file = useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-4">
      <Field label="Brand name"><input value={t.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Northbound" className={input} /></Field>
      <Field label="Tagline"><input value={t.tagline} onChange={e => set('tagline', e.target.value)} placeholder="What it stands for" className={input} /></Field>
      <Field label="Logo" hint={logo ? (logo.knockedOut ? 'Flat background removed so the mark sits on any colour.' : undefined) : 'SVG, PNG or JPG. Adding a logo also sets the brand colour from it.'}>
        <input ref={file} type="file" accept="image/*,.svg" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onLogo(f); e.target.value = '' }} />
        {logo && <div className="mb-2 h-20 rounded-lg bg-[repeating-conic-gradient(#2a2a31_0_25%,#1f1f25_0_50%)] bg-[length:14px_14px] flex items-center justify-center p-3"><img src={logo.img.toDataURL()} alt="Your logo" className="max-h-full max-w-full" /></div>}
        <Button onClick={() => file.current?.click()} className="w-full"><ImagePlus size={15} />{logo ? 'Replace logo' : 'Add logo'}</Button>
        {logoErr && <p className="mt-1 text-[11.5px] text-rose-300">{logoErr}</p>}
      </Field>
      <Field label="Clear space" k="logoClear" hint="Measured from the height of the mark, H.">
        <div className="grid grid-cols-3 gap-1.5">{[[0.25, '¼ H'], [0.5, '½ H'], [1, '1 H']].map(([v, l]) => <button key={v} onClick={() => setTok('logoClear', v as number)} aria-pressed={r.logoClear.value === v} className={seg(r.logoClear.value === v)}>{l}</button>)}</div>
      </Field>
      <Field label="Minimum width" k="logoMin">
        <div className="grid grid-cols-4 gap-1.5">{[16, 24, 32, 48].map(v => <button key={v} onClick={() => setTok('logoMin', v)} aria-pressed={r.logoMin.value === v} className={seg(r.logoMin.value === v)}>{v}px</button>)}</div>
      </Field>
      {logo && <Field label="Logo contrast">
        <ul className="rounded-lg border border-void-800 divide-y divide-void-800/70">
          {logoPlacements(brand, logo).map(p => (
            <li key={p.bgName} className="flex items-center gap-2 px-2.5 py-1.5 text-[12px]">
              <span className="w-7 h-5 shrink-0 rounded" style={{ background: p.bg, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }} />
              <span className="flex-1 min-w-0 truncate text-void-300">{p.bgName}</span>
              <span className="text-void-500">{p.mode === 'original' ? 'Full colour' : p.mode === 'white' ? 'Reversed' : 'Dark mono'}</span>
              <span className={`w-11 text-right font-mono ${p.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{p.ratio.toFixed(1)}</span>
            </li>))}
        </ul>
      </Field>}
      <Field label="Personality" hint="Steers the fonts, scale and corners the generator reaches for.">
        <div className="grid grid-cols-3 gap-1.5">{PERSONALITIES.map((p, i) => <button key={p} onClick={() => set('personality', i)} aria-pressed={t.personality === i} className={seg(t.personality === i)}>{p}</button>)}</div>
      </Field>
      <Field label="Art direction" k="direction">
        <div className="grid grid-cols-3 gap-1.5">{(['editorial', 'graphic', 'systematic'] as ArtDirection[]).map(d => <button key={d} onClick={() => setTok('direction', d)} aria-pressed={r.direction.value === d} className={`${seg(r.direction.value === d)} capitalize`}>{d}</button>)}</div>
      </Field>
      <Field label="Corner radius" k="radius">
        <div className="grid grid-cols-5 gap-1.5">{[0, 4, 8, 12, 999].map(v => <button key={v} onClick={() => setTok('radius', v)} aria-pressed={r.radius.value === v} className={seg(r.radius.value === v)}>{v === 999 ? 'Pill' : v}</button>)}</div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Spacing unit" k="spaceBase"><div className="grid grid-cols-2 gap-1.5">{[4, 8].map(v => <button key={v} onClick={() => setTok('spaceBase', v)} aria-pressed={r.spaceBase.value === v} className={seg(r.spaceBase.value === v)}>{v}px</button>)}</div></Field>
        <Field label="Grid" k="gridCols"><div className="grid grid-cols-3 gap-1.5">{[6, 8, 12].map(v => <button key={v} onClick={() => setTok('gridCols', v)} aria-pressed={r.gridCols.value === v} className={seg(r.gridCols.value === v)}>{v}</button>)}</div></Field>
      </div>
    </div>
  )
}

function ColourTab({ brand }: { brand: Brand }) {
  const t = useBrand(s => s.tokens), set = useBrand(s => s.set), setTok = useBrand(s => s.setTok)
  const r = useMemo(() => resolve(t), [t])
  return (
    <div className="space-y-4">
      <Field label="Brand colour" hint="The source. Secondary and accent are built around it unless you lock them.">
        <HexField value={t.brandColor} onChange={v => set('brandColor', v)} />
        <div className="mt-2"><MiniRamp ramp={brand.roles[0].ramp} src={brand.roles[0].step} /></div>
      </Field>
      <Field label="Harmony" k="harmony">
        <div className="grid grid-cols-2 gap-1.5">{HARMONIES.map(h => <button key={h.id} onClick={() => setTok('harmony', h.id)} aria-pressed={r.harmony.value === h.id} className={seg(r.harmony.value === h.id)}>{h.label}</button>)}</div>
      </Field>
      <Field label="Secondary" k="secondary"><HexField value={r.secondary.value} onChange={v => setTok('secondary', v)} /><div className="mt-2"><MiniRamp ramp={brand.roles[1].ramp} src={brand.roles[1].step} /></div></Field>
      <Field label="Accent" k="accent"><HexField value={r.accent.value} onChange={v => setTok('accent', v)} /><div className="mt-2"><MiniRamp ramp={brand.roles[2].ramp} src={brand.roles[2].step} /></div></Field>
      <Field label={`Neutral warmth ${Math.round(r.neutralTint.value * 100)}%`} k="neutralTint" hint="How much of the brand hue shows in the greys.">
        <input type="range" min={0} max={1} step={0.05} value={r.neutralTint.value} onChange={e => setTok('neutralTint', +e.target.value)} aria-label="Neutral warmth" className="w-full accent-[#8b7cff]" />
        <div className="mt-1.5"><MiniRamp ramp={brand.neutral} /></div>
      </Field>
      <Field label="Contrast">
        <ul className="rounded-lg border border-void-800 divide-y divide-void-800/70">
          {brand.pairs.map((p, i) => { const ok = p.ratio >= p.need; return (
            <li key={i} className="flex items-center gap-2 px-2.5 py-1.5 text-[12px]">
              <span className="w-7 h-5 shrink-0 rounded text-[10px] font-semibold inline-flex items-center justify-center" style={{ background: p.bg, color: p.fg, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>Aa</span>
              <span className="flex-1 min-w-0 truncate text-void-300">{p.use}</span>
              <span className="font-mono text-void-400">{p.ratio.toFixed(2)}</span>
              <span className={`w-14 text-right font-medium ${ok ? 'text-emerald-300' : 'text-rose-300'}`}>{ok ? p.grade : 'Fail'}</span>
            </li>) })}
        </ul>
      </Field>
    </div>
  )
}

function TypeTab({ brand }: { brand: Brand }) {
  const t = useBrand(s => s.tokens), setTok = useBrand(s => s.setTok)
  const r = useMemo(() => resolve(t), [t])
  return (
    <div className="space-y-4">
      <datalist id="brand-fonts">{FONT_SUGGESTIONS.map(f => <option key={f} value={f} />)}</datalist>
      <Field label="Headings" k="heading"><FontField k="heading" value={r.heading.value} /></Field>
      <Field label="Body" k="body"><FontField k="body" value={r.body.value} /></Field>
      <Field label="Data and code" k="mono"><FontField k="mono" value={r.mono.value} /></Field>
      <p className="text-[11.5px] text-void-500 leading-snug -mt-1">Type any Google Fonts family, or upload a file. Uploaded fonts never leave this browser.</p>
      <Field label="Scale" k="scaleRatio">
        <div className="grid grid-cols-2 gap-1.5">{SCALES.map(s => <button key={s.ratio} onClick={() => setTok('scaleRatio', s.ratio)} aria-pressed={Math.abs(r.scaleRatio.value - s.ratio) < 0.002} className={`${seg(Math.abs(r.scaleRatio.value - s.ratio) < 0.002)} flex items-center justify-between px-2.5`}><span>{s.label}</span><span className="font-mono text-void-500">{s.ratio}</span></button>)}</div>
      </Field>
      <Field label="Base size" k="baseSize">
        <div className="grid grid-cols-5 gap-1.5">{[14, 15, 16, 17, 18].map(v => <button key={v} onClick={() => setTok('baseSize', v)} aria-pressed={r.baseSize.value === v} className={seg(r.baseSize.value === v)}>{v}</button>)}</div>
      </Field>
      <div className="rounded-lg border border-void-800 bg-white text-[#111] p-3 space-y-1 overflow-hidden">
        {brand.scale.map(s => (
          <div key={s.label} className="flex items-baseline gap-2 min-w-0">
            <span className="w-12 shrink-0 text-[10.5px] text-black/40 font-mono">{s.px}</span>
            <span className="truncate" style={{ fontFamily: `"${s.family === 'heading' ? brand.fonts.heading.family : brand.fonts.body.family}"`, fontSize: Math.min(s.px, 40), fontWeight: s.weight, letterSpacing: `${s.tracking}em`, lineHeight: s.lineHeight }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExportTab({ brand, o, onPdf, onPrint, onHtml, onEditor, busy, count }: { brand: Brand; o: Orientation; onPdf: () => void; onPrint: () => void; onHtml: () => void; onEditor: () => void; busy: boolean; count: number }) {
  const [fmt, setFmt] = useState<'css' | 'tailwind' | 'json'>('css')
  const [copied, setCopied] = useState(false)
  const code = fmt === 'css' ? toCss(brand) : fmt === 'tailwind' ? toTailwind(brand) : toJson(brand)
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* clipboard blocked */ } }
  const name = fileSlug(brand.name)
  return (
    <div className="space-y-4">
      <Field label={`Guideline, ${count} ${count === 1 ? 'page' : 'pages'}`}>
        <div className="grid grid-cols-2 gap-2">
          <Button primary onClick={onPdf} disabled={busy || !count} className="w-full"><Download size={15} />Screen PDF</Button>
          <Button onClick={onPrint} disabled={busy || !count} className="w-full"><Printer size={15} />Print PDF</Button>
          <Button onClick={onHtml} disabled={busy || !count} className="w-full"><Globe size={15} />HTML handoff</Button>
          <Button onClick={onEditor} disabled={busy || !count} className="w-full"><Layers size={15} />Editor</Button>
        </div>
        <p className="mt-2 text-[11.5px] text-void-500 leading-snug">Print PDF: {PRINT_TRIM[o].label}, 300 dpi, 3 mm bleed, crop marks. Images are RGB, so ask your printer to convert with their profile. HTML handoff is one file the client opens in a browser: pages with arrow-key navigation, logo downloads and click-to-copy colours.</p>
      </Field>
      <Field label="Tokens for developers">
        <div className="grid grid-cols-3 gap-1.5 mb-2">{(['css', 'tailwind', 'json'] as const).map(f => <button key={f} onClick={() => setFmt(f)} aria-pressed={fmt === f} className={seg(fmt === f)}>{f === 'css' ? 'CSS' : f === 'json' ? 'JSON' : 'Tailwind'}</button>)}</div>
        <pre className="h-56 overflow-auto rounded-lg bg-void-950 border border-void-800 p-2.5 text-[11px] leading-[1.5] text-void-300 font-mono whitespace-pre">{code}</pre>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button onClick={copy} className="w-full">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy'}</Button>
          <Button onClick={() => downloadBlob(new Blob([code], { type: 'text/plain' }), fmt === 'css' ? `${name}-tokens.css` : fmt === 'json' ? `${name}.tokens.json` : `tailwind.${name}.js`)} className="w-full"><Download size={15} />Save file</Button>
        </div>
      </Field>
      <Field label="Swatches" hint="Adobe Swatch Exchange, grouped by role. Opens in Illustrator, Photoshop and InDesign.">
        <Button onClick={() => downloadBlob(toAse(brand), `${name}.ase`)} className="w-full"><Download size={15} />Download .ase</Button>
      </Field>
    </div>
  )
}

function Diagnostics({ checks }: { checks: Brand['checks'] }) {
  const [open, setOpen] = useState(false)
  const bad = checks.filter(c => !c.ok)
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} aria-expanded={open} className={`h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-[12px] border ${focusRing} ${bad.length ? 'border-amber-400/40 text-amber-200 bg-amber-400/10' : 'border-emerald-400/30 text-emerald-200 bg-emerald-400/10'}`}>
        {bad.length ? <AlertCircle size={13} /> : <Check size={13} />}
        {bad.length ? `${bad.length} ${bad.length === 1 ? 'issue' : 'issues'}` : `All ${checks.length} checks pass`}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-40 w-[340px] rounded-xl bg-[#17171c] border border-void-700 shadow-2xl p-2">
          <ul className="max-h-80 overflow-auto">{[...bad, ...checks.filter(c => c.ok)].map((c, i) => (
            <li key={i} className="flex gap-2 px-2 py-1.5 text-[12px] leading-snug">{c.ok ? <Check size={13} className="mt-0.5 shrink-0 text-emerald-300" /> : <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-300" />}<span className={c.ok ? 'text-void-400' : 'text-void-100'}>{c.text}</span></li>
          ))}</ul>
        </div>
      )}
    </div>
  )
}

function Outliner({ brand, logo, o, active, setActive }: { brand: Brand; logo: LogoInfo | null; o: Orientation; active: number; setActive: (i: number) => void }) {
  const pages = useBrand(s => s.pages), move = useBrand(s => s.movePage), toggle = useBrand(s => s.togglePage), cycle = useBrand(s => s.cycleVariant), reset = useBrand(s => s.resetPages)
  const [drag, setDrag] = useState<number | null>(null), [over, setOver] = useState<number | null>(null)
  const visible = pages.filter(p => p.on).length
  let n = 0
  const nums = pages.map(p => (p.on ? ++n : 0))
  const tw = o === 'landscape' ? 150 : 104
  return (
    <nav className="flex lg:flex-col gap-1 p-2 lg:w-[190px] shrink-0 overflow-x-auto lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-void-800/50 bg-void-950/40" aria-label="Pages">
      <div className="hidden lg:flex items-center justify-between px-1.5 pb-1">
        <span className="text-[11.5px] text-void-500">{visible} of {pages.length} in export</span>
        <button onClick={reset} title="Restore default order and layouts" aria-label="Reset pages" className={`h-6 w-6 inline-flex items-center justify-center rounded text-void-500 hover:text-white ${focusRing}`}><RotateCcw size={12} /></button>
      </div>
      {pages.map((p, i) => {
        const def = PAGE_DEFS[p.kind], multi = def.variants.length > 1
        return (
          <div key={p.kind} draggable
            onDragStart={e => { setDrag(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }}
            onDragOver={e => { e.preventDefault(); setOver(i) }} onDragLeave={() => setOver(v => (v === i ? null : v))}
            onDrop={e => { e.preventDefault(); if (drag != null) { move(drag, i); setActive(i) } setDrag(null); setOver(null) }}
            onDragEnd={() => { setDrag(null); setOver(null) }}
            className={`group shrink-0 rounded-lg p-1.5 ${active === i ? 'bg-void-800/70' : 'hover:bg-void-900'} ${over === i && drag !== i ? 'ring-2 ring-accent' : ''} ${drag === i ? 'opacity-40' : ''}`}>
            <button onClick={e => (e.altKey && multi ? cycle(i, e.shiftKey ? -1 : 1) : setActive(i))} aria-current={active === i}
              title={multi ? 'Alt-click to try the next layout' : undefined}
              className={`block rounded-md overflow-hidden border-2 ${active === i ? 'border-accent' : 'border-transparent'} ${focusRing} ${p.on ? '' : 'opacity-35'}`}>
              <Page spec={p} pageNo={nums[i] || 1} pageCount={visible || 1} brand={brand} logo={logo} o={o} cssWidth={tw} />
            </button>
            <div className="mt-1 flex items-center gap-0.5" style={{ width: tw }}>
              <GripVertical size={12} className="text-void-600 shrink-0 cursor-grab" aria-hidden />
              <span className={`flex-1 min-w-0 truncate text-[11.5px] ${p.on ? 'text-void-200' : 'text-void-500 line-through'}`}>{p.on ? `${nums[i]}. ` : ''}{def.title}</span>
              <button onClick={() => toggle(i)} aria-label={p.on ? `Leave ${def.title} out of exports` : `Include ${def.title}`} title={p.on ? 'Leave out' : 'Include'} className={`h-6 w-6 shrink-0 inline-flex items-center justify-center rounded text-void-500 hover:text-white ${focusRing}`}>{p.on ? <Eye size={12} /> : <EyeOff size={12} />}</button>
            </div>
            <div className="flex items-center gap-0.5" style={{ width: tw }}>
              {multi
                ? <button onClick={() => cycle(i)} aria-label={`${def.title} layout: ${def.variants[p.variant].label}. Next layout`} className={`flex-1 min-w-0 h-6 px-1.5 inline-flex items-center justify-between rounded bg-void-900 border border-void-800 text-[11px] text-void-300 hover:text-white ${focusRing}`}><span className="truncate">{def.variants[p.variant].label}</span><span className="flex items-center shrink-0 text-void-500">{p.variant + 1}/{def.variants.length}<ChevronRight size={11} /></span></button>
                : <span className="flex-1 text-[11px] text-void-600 px-1.5">{def.variants[0].label}</span>}
              <button onClick={() => { move(i, i - 1); setActive(i - 1) }} disabled={i === 0} aria-label={`Move ${def.title} up`} className={`h-6 w-6 shrink-0 inline-flex items-center justify-center rounded text-void-500 hover:text-white disabled:opacity-25 ${focusRing}`}><ArrowUp size={12} /></button>
              <button onClick={() => { move(i, i + 1); setActive(i + 1) }} disabled={i === pages.length - 1} aria-label={`Move ${def.title} down`} className={`h-6 w-6 shrink-0 inline-flex items-center justify-center rounded text-void-500 hover:text-white disabled:opacity-25 ${focusRing}`}><ArrowDown size={12} /></button>
            </div>
          </div>
        )
      })}
    </nav>
  )
}

const TABS = ['Identity', 'Colour', 'Type', 'Export'] as const

export function BrandGuideline({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const tokens = useBrand(s => s.tokens), set = useBrand(s => s.set), newTake = useBrand(s => s.newTake), pages = useBrand(s => s.pages)
  const [tab, setTab] = useState<(typeof TABS)[number]>('Identity')
  const [logo, setLogo] = useState<LogoInfo | null>(null)
  const [logoErr, setLogoErr] = useState('')
  const [o, setO] = useState<Orientation>('landscape')
  const [busy, setBusy] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const brand = useMemo(() => buildBrand(tokens), [tokens])
  const checks = useMemo(() => [...brand.checks, ...logoChecks(brand, logo)], [brand, logo])
  const visible = pages.filter(p => p.on)
  const activeSpec = pages[Math.min(active, pages.length - 1)]
  const activeNo = visible.indexOf(activeSpec) + 1

  useEffect(() => { loadFont(brand.fonts.heading); loadFont(brand.fonts.body); loadFont(brand.fonts.mono, [400]) }, [brand.fonts.heading, brand.fonts.body, brand.fonts.mono])

  const onLogo = async (f: File) => {
    setLogoErr('')
    try {
      const info = await analyseLogo(f); setLogo(info)
      const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d')!
      x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 64); x.drawImage(info.img, 0, 0, 64, 64)
      // Only take a colour that has some chroma. A white, grey or black logo leaves the brand colour alone.
      const pick = extractPalette(c, 4).find(h => { const v = parseInt(h.slice(1), 16); const r = v >> 16, g = (v >> 8) & 255, b = v & 255; return Math.max(r, g, b) - Math.min(r, g, b) > 30 })
      if (pick) set('brandColor', pick)
    } catch { setLogoErr('That file could not be read as an image. Try SVG, PNG or JPG.') }
  }
  const base = fileSlug(brand.name)
  const run = async (label: string, fn: () => Promise<void>) => { setBusy(label); try { await fn() } catch (e) { console.error(e); alert(`${label} failed. Try again.`) } finally { setBusy(null) } }
  const exportPdf = () => run('Building screen PDF', async () => { const { exportBrandPdf } = await import('./brand-pdf'); await exportBrandPdf(brand, logo, pages, o, `${base}-guidelines-${o}.pdf`) })
  const exportPrint = () => run('Building print PDF', async () => { const { exportPrintPdf } = await import('./brand-pdf'); await exportPrintPdf(brand, logo, pages, o, `${base}-guidelines-print-${o}.pdf`) })
  const exportHtml = () => run('Building HTML handoff', async () => {
    const { buildHandoffHtml } = await import('./brand/handoff')
    const slides = (await renderAll(pages, brand, logo, o, 1)).map(r => r.canvas.toDataURL('image/jpeg', 0.85))
    downloadBlob(new Blob([buildHandoffHtml(brand, logo, slides)], { type: 'text/html' }), `${base}-brand.html`)
  })
  const openInEditor = async () => {
    setBusy('Opening in Editor')
    try {
      const imgs: { name: string; blob: Blob }[] = []
      for (const r of await renderAll(pages, brand, logo, o, 1.5)) imgs.push({ name: r.title, blob: await canvasToBlob(r.canvas) })
      const id = await sendHandoff({ from: 'studio', boards: true, name: `${brand.name} guidelines`, size: { width: SIZES[o].w, height: SIZES[o].h }, palette: [...brand.roles.map(r => r.hex), brand.surfaces.light, brand.surfaces.dark], images: imgs })
      router.push(`/editor?inbox=${id}`)
    } catch (e) { console.error(e); setBusy(null) }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-void-800/60">
        <button onClick={onBack} className={`flex items-center gap-1.5 text-[12.5px] text-void-400 hover:text-white rounded ${focusRing}`}><ArrowLeft size={14} />Studio</button>
        <span className="text-void-700">/</span>
        <h1 className="text-[13.5px] font-semibold truncate max-w-[40vw]">{tokens.name || 'Untitled brand'}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Diagnostics checks={checks} />
          <div className="flex rounded-lg border border-void-800 p-0.5">
            <button onClick={() => setO('landscape')} aria-pressed={o === 'landscape'} className={`h-7 px-2 rounded-md text-[12px] inline-flex items-center gap-1.5 ${focusRing} ${o === 'landscape' ? 'bg-void-800 text-white' : 'text-void-400 hover:text-white'}`}><Monitor size={13} />Deck</button>
            <button onClick={() => setO('portrait')} aria-pressed={o === 'portrait'} className={`h-7 px-2 rounded-md text-[12px] inline-flex items-center gap-1.5 ${focusRing} ${o === 'portrait' ? 'bg-void-800 text-white' : 'text-void-400 hover:text-white'}`}><FileText size={13} />Document</button>
          </div>
          <Button onClick={newTake}><RefreshCw size={14} />New take</Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <aside className="lg:w-[330px] shrink-0 border-b lg:border-b-0 lg:border-r border-void-800/60 flex flex-col min-h-0">
          <div role="tablist" className="grid grid-cols-4 gap-1 p-2 border-b border-void-800/60">
            {TABS.map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-8 rounded-md text-[12.5px] ${focusRing} ${tab === t ? 'bg-void-800 text-white' : 'text-void-400 hover:text-white'}`}>{t}</button>)}
          </div>
          <div className="p-4 overflow-y-auto flex-1">
            {tab === 'Identity' && <IdentityTab logo={logo} onLogo={onLogo} brand={brand} logoErr={logoErr} />}
            {tab === 'Colour' && <ColourTab brand={brand} />}
            {tab === 'Type' && <TypeTab brand={brand} />}
            {tab === 'Export' && <ExportTab brand={brand} o={o} onPdf={exportPdf} onPrint={exportPrint} onHtml={exportHtml} onEditor={openInEditor} busy={!!busy} count={visible.length} />}
          </div>
          <p className="px-4 py-2.5 border-t border-void-800/60 text-[11.5px] text-void-500 leading-snug">New take changes anything unlocked. Editing a value locks it. Page order and layouts are always kept.</p>
        </aside>

        <section className="flex-1 min-w-0 flex flex-col lg:flex-row min-h-0">
          <Outliner brand={brand} logo={logo} o={o} active={active} setActive={setActive} />
          <div className="flex-1 min-w-0 overflow-auto bg-void-900/40 p-4 sm:p-8 flex flex-col items-center gap-3">
            {activeSpec && <Page spec={activeSpec} pageNo={activeNo || 1} pageCount={visible.length || 1} brand={brand} logo={logo} o={o} cssWidth={o === 'landscape' ? 1000 : 620} />}
            {activeSpec && !activeSpec.on && <p className="text-[12.5px] text-void-400">This page is left out of exports. Use the eye in the page list to include it.</p>}
          </div>
        </section>
      </div>

      {busy && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55"><div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[#17171c] border border-void-700 text-[13.5px]"><span className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />{busy}</div></div>}
    </div>
  )
}
