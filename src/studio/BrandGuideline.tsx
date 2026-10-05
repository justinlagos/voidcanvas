'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, AlertCircle, ChevronDown, ChevronRight, Copy, Download, Eye, EyeOff, FileText, Globe, ImagePlus, Layers, Lock, Unlock, Monitor, Printer, RefreshCw, RotateCcw, Upload, X, Settings2, PanelLeft, Save } from 'lucide-react'
import { tokensFor } from '@/brand/model'
import { Button, focusRing } from '@/editor/components/ui'
import { canvasToBlob, downloadBlob, sendHandoff, type LayeredItem, type LayeredPage } from '@/editor/io'
import { MAX_PHOTOS, guardUnload, useBrand } from './brand/store'
import { FONT_SUGGESTIONS, HARMONIES, PERSONALITIES, SCALES, buildBrand, resolve, type ArtDirection, type Brand, type FontRef, type TokKey } from './brand/tokens'
import { RAMP_STEPS, isHex } from './brand/color'
import { loadFont, registerLocalFont } from './brand/fonts'
import { fileSlug, toAse, toCss, toJson, toTailwind } from './brand/export'
import { PAGE_DEFS, SIZES, eachPage, lastPhotoPlan, recordPages, renderPage, type Orientation, type PageSpec } from './brand-pages'
import { MODE_LABEL, MODE_OF, VARIANT_OF, analyseLogo, grayMark, logoChecks, logoPlacements, logoVariants, monoMark, type LogoDecisions, type LogoInfo } from './brand/logo'
import { PRINT_TRIM } from './brand-pdf'
import { describeProfile } from '@/lib/intelligence/asset'
import { VARIANT_LABEL, VARIANT_USE, type VariantId } from '@/lib/intelligence/logo'
import { suggestLogoName } from '@/lib/intelligence/naming'
import { brandHealth, healthSummary, type HealthGroup } from '@/lib/intelligence/brand'
import type { Level } from '@/lib/intelligence/contrast'

function Page({ spec, pageNo, pageCount, brand, logo, o, cssWidth }: { spec: PageSpec; pageNo: number; pageCount: number; brand: Brand; logo: LogoInfo | null; o: Orientation; cssWidth: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const d = useBrand(s => s.decisions)
  const photos = useBrand(s => s.photos)
  useEffect(() => {
    let live = true
    const big = cssWidth > 400
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const scale = Math.min(2, Math.max(0.25, (cssWidth * dpr) / SIZES[o].w))
    const t = setTimeout(() => {
      renderPage(spec, pageNo, pageCount, brand, logo, o, scale, d, spec.kind === 'photo' ? photos : []).then(c => { if (!live || !ref.current) return; const x = ref.current.getContext('2d')!; ref.current.width = c.width; ref.current.height = c.height; x.drawImage(c, 0, 0) })
    }, big ? 0 : 80)
    return () => { live = false; clearTimeout(t) }
  }, [spec, pageNo, pageCount, brand, logo, o, cssWidth, d, spec.kind === 'photo' ? photos : null]) // eslint-disable-line react-hooks/exhaustive-deps
  const ar = SIZES[o].h / SIZES[o].w
  return <canvas ref={ref} className="block rounded-md shadow-lg bg-white" style={{ width: cssWidth, height: cssWidth * ar }} />
}

// ── small controls ──
const input = `min-w-0 w-full h-9 px-2.5 rounded-lg bg-void-900 border border-void-800 text-[13px] ${focusRing}`
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
function Field({ label, k, hint, children }: { label: ReactNode; k?: TokKey; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 min-h-6"><span className="text-[12px] text-void-400">{label}</span>{k && <LockBtn k={k} label={typeof label === 'string' ? label.replace(/ \d+%$/, '') : k} />}</div>
      {children}
      {hint && <p className="mt-1 text-[11.5px] text-void-500 leading-snug">{hint}</p>}
    </div>
  )
}
function Detail({ title, children }: { title: string; children: ReactNode }) {
  return <details className="group/detail border-t border-void-800 pt-3">
    <summary className={`flex cursor-pointer list-none items-center justify-between gap-2 py-2 text-[13px] text-void-200 ${focusRing}`}>
      {title}<ChevronDown size={15} className="shrink-0 transition-transform group-open/detail:rotate-180" />
    </summary>
    <div className="space-y-4 pt-3 pb-2">{children}</div>
  </details>
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
const LEVEL_TEXT: Record<Level, string> = { good: 'text-emerald-300', check: 'text-amber-300', attention: 'text-rose-300' }
const LEVEL_WORD: Record<Level, string> = { good: 'Pass', check: 'Marginal', attention: 'Fails' }
/** "Suggested" or "Set by you", so nothing pretends to be the client's rule. */
function Source({ locked }: { locked: boolean }) {
  return <span className={`text-[10.5px] px-1.5 py-0.5 rounded ${locked ? 'bg-accent-soft text-accent-light' : 'bg-void-800 text-void-400'}`}>{locked ? 'Set by you' : 'Suggested'}</span>
}

/** Thumbnail of one logo version on a checkerboard or a colour. */
function VariantThumb({ logo, mode, brand, bg }: { logo: LogoInfo; mode: keyof typeof MODE_LABEL; brand: Brand; bg?: string }) {
  const url = useMemo(() => {
    const c = mode === 'original' ? logo.img : mode === 'grayscale' ? grayMark(logo) : monoMark(logo, mode === 'white' ? '#ffffff' : mode === 'brand' ? brand.roles[0].hex : brand.surfaces.inkOnLight)
    return c.toDataURL('image/png')
  }, [logo, mode, brand.roles, brand.surfaces.inkOnLight])
  const dark = mode === 'white'
  // eslint-disable-next-line @next/next/no-img-element
  return <div className={`h-14 rounded-md flex items-center justify-center p-1.5 ${bg ? '' : dark ? 'bg-void-950' : 'bg-[repeating-conic-gradient(#2a2a31_0_25%,#1f1f25_0_50%)] bg-[length:12px_12px]'}`} style={bg ? { background: bg } : undefined}><img src={url} alt="" className="max-h-full max-w-full" /></div>
}

function IdentityTab({ logo, onLogo, brand, logoErr, suggestedColor, onUseColor }: { logo: LogoInfo | null; onLogo: (f: File) => void; brand: Brand; logoErr: string; suggestedColor: string | null; onUseColor: () => void }) {
  const t = useBrand(s => s.tokens), set = useBrand(s => s.set), setTok = useBrand(s => s.setTok)
  const decisions = useBrand(s => s.decisions), toggleVariant = useBrand(s => s.toggleVariant), chooseBackground = useBrand(s => s.chooseBackground)
  const r = useMemo(() => resolve(t), [t])
  const file = useRef<HTMLInputElement>(null)
  const variants = useMemo(() => logoVariants(brand, logo, decisions), [brand, logo, decisions])
  const validModes = variants.filter(v => v.valid).map(v => v.id)
  const places = useMemo(() => logoPlacements(brand, logo, decisions), [brand, logo, decisions])
  const [showAllBg, setShowAllBg] = useState(false)
  const minPx = r.logoMin.value, minMm = r.logoMinPrint.value
  return (
    <div className="space-y-4">
      <Field label="Brand name"><input value={t.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Northbound" className={input} /></Field>
      <Field label="Tagline"><input value={t.tagline} onChange={e => set('tagline', e.target.value)} placeholder="What it stands for" className={input} /></Field>
      <Field label="Logo" hint={logo ? `${describeProfile(logo.profile)} The original file is kept as supplied; versions below are made from it.` : 'SVG, PNG or JPG. The artwork is measured so the guideline can say where each version works.'}>
        <input ref={file} type="file" accept="image/*,.svg" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onLogo(f); e.target.value = '' }} />
        {logo && <div className="mb-2 h-20 rounded-lg bg-[repeating-conic-gradient(#2a2a31_0_25%,#1f1f25_0_50%)] bg-[length:14px_14px] flex items-center justify-center p-3"><img src={logo.img.toDataURL()} alt="Your logo" className="max-h-full max-w-full" /></div>}
        {logo && <p className="mb-2 text-[11.5px] text-void-400 truncate" title={logo.fileName}>{suggestLogoName(logo.fileName, logo.profile)} <span className="text-void-600">· {logo.fileName}</span></p>}
        <Button onClick={() => file.current?.click()} className="w-full"><ImagePlus size={15} />{logo ? 'Replace logo' : 'Add logo'}</Button>
        {logoErr && <p className="mt-1 text-[11.5px] text-rose-300">{logoErr}</p>}
        {suggestedColor && (
          <div className="mt-2 flex items-center gap-2 px-2.5 py-2 rounded-lg border border-void-800 bg-void-900/60 text-[12px]">
            <span className="w-5 h-5 rounded shrink-0" style={{ background: suggestedColor }} />
            <span className="flex-1 min-w-0 text-void-300">Brand colour from the logo: <span className="font-mono text-void-100">{suggestedColor.toUpperCase()}</span></span>
            <button onClick={onUseColor} className={`text-accent-light hover:text-white rounded ${focusRing}`}>Use it</button>
          </div>
        )}
      </Field>
      <Detail title="Logo versions & usage rules">
      {logo && (
        <Field label="Versions" hint="Only versions that keep the mark honest are made. A flat one-colour version is refused when the detail between colours would melt; ask the client for that artwork instead.">
          <ul className="space-y-1.5">
            {variants.map(v => {
              const off = decisions.off.includes(v.id), derivedBad = !v.valid && !off
              return (
                <li key={v.id} className={`rounded-lg border border-void-800 p-2 ${derivedBad ? 'opacity-70' : ''}`}>
                  <div className="flex items-start gap-2">
                    <div className="w-20 shrink-0">{v.valid ? <VariantThumb logo={logo} mode={MODE_OF[v.id]} brand={brand} /> : <div className="h-14 rounded-md border border-dashed border-void-700 flex items-center justify-center text-[10px] text-void-500">Not made</div>}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12.5px] text-void-100">{VARIANT_LABEL[v.id]}</span>
                        <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-void-800 text-void-400">{v.id === 'primary' ? 'Supplied' : !v.derived ? 'Same as the file' : v.valid ? 'Derived' : 'Refused'}</span>
                        {v.id !== 'primary' && v.derived && (v.valid || off) && <button onClick={() => toggleVariant(v.id)} className={`ml-auto text-[11.5px] rounded ${focusRing} ${off ? 'text-accent-light' : 'text-void-500 hover:text-white'}`}>{off ? 'Include' : 'Leave out'}</button>}
                      </div>
                      <p className="text-[11px] text-void-500 leading-snug mt-0.5">{off ? 'Left out by you.' : !v.valid ? v.reason : v.id === 'primary' && /reversed version/.test(v.reason) ? v.reason : VARIANT_USE[v.id]}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Field>
      )}
      <Field label={<span className="inline-flex items-center gap-1.5">Clear space <Source locked={t.logoClear.locked} /></span>} k="logoClear" hint="Measured from the height of the mark, H. Suggested from its shape: wide wordmarks need less, open symbols more.">
        <div className="grid grid-cols-3 gap-1.5">{[[0.25, '¼ H'], [0.5, '½ H'], [1, '1 H']].map(([v, l]) => <button key={v} onClick={() => setTok('logoClear', v as number)} aria-pressed={r.logoClear.value === v} className={seg(r.logoClear.value === v)}>{l}</button>)}</div>
      </Field>
      <Field label={<span className="inline-flex items-center gap-1.5">Minimum size <Source locked={t.logoMin.locked} /></span>} k="logoMin" hint={logo ? `Suggested so the thinnest stroke stays at least 1 px on screen and 0.3 mm in print.` : 'Width on screen, and in print.'}>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-1.5 text-[12px] text-void-400"><input type="number" min={12} max={600} value={minPx} onChange={e => setTok('logoMin', Math.max(12, Math.min(600, +e.target.value || 0)))} aria-label="Minimum width on screen" className={`${input} font-mono`} /><span className="shrink-0">px</span></label>
          <label className="flex items-center gap-1.5 text-[12px] text-void-400"><input type="number" min={4} max={200} value={minMm} onChange={e => setTok('logoMinPrint', Math.max(4, Math.min(200, +e.target.value || 0)))} aria-label="Minimum width in print" className={`${input} font-mono`} /><span className="shrink-0">mm</span></label>
        </div>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">{[24, 32, 48, 64].map(v => <button key={v} onClick={() => setTok('logoMin', v)} aria-pressed={minPx === v} className={seg(minPx === v)}>{v}px</button>)}</div>
      </Field>
      {logo && <Field label="Logo on backgrounds" hint="Full colour wherever it clears the target; otherwise the best honest version. Change any row to set your own rule.">
        <ul className="rounded-lg border border-void-800 divide-y divide-void-800/70">
          {(showAllBg ? places : places.slice(0, 5)).map(p => (
            <li key={p.id} className="px-2.5 py-1.5 text-[12px]">
              <div className="flex items-center gap-2">
                <span className="w-7 h-5 shrink-0 rounded" style={{ background: p.bg, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }} />
                <span className="flex-1 min-w-0 truncate text-void-300">{p.bgName}</span>
                <select value={p.designer ? VARIANT_OF[p.mode] : ''} onChange={e => chooseBackground(p.id, (e.target.value || null) as VariantId | null)} aria-label={`Logo version on ${p.bgName}`}
                  className={`h-7 max-w-[128px] px-1.5 rounded-md bg-void-900 border border-void-800 text-[11.5px] ${p.designer ? 'text-accent-light' : 'text-void-300'} ${focusRing}`}>
                  <option value="">{MODE_LABEL[p.mode]}{p.designer ? '' : ' (suggested)'}</option>
                  {validModes.map(v => <option key={v} value={v}>{VARIANT_LABEL[v]}</option>)}
                </select>
                <span className={`w-9 text-right font-mono ${LEVEL_TEXT[p.level]}`} title={LEVEL_WORD[p.level]}>{p.ratio.toFixed(1)}</span>
              </div>
              {p.level !== 'good' && <p className={`mt-1 text-[11px] leading-snug ${p.level === 'check' ? 'text-amber-200/80' : 'text-rose-200/80'}`}>{p.why}</p>}
            </li>))}
        </ul>
        {places.length > 5 && <button onClick={() => setShowAllBg(v => !v)} className={`mt-1.5 text-[11.5px] text-void-400 hover:text-white rounded ${focusRing}`}>{showAllBg ? 'Fewer backgrounds' : `All ${places.length} backgrounds`}</button>}
      </Field>}
      </Detail>
      <Detail title="Photography"><Photography /></Detail>
      <Detail title="Visual direction & layout">
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
      </Detail>
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
      <Detail title="Neutrals & contrast checks">
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
      </Detail>
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
      <Detail title="Type scale & advanced settings">
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
      </Detail>
    </div>
  )
}

function ExportTab({ brand, o, onPdf, onPrint, onHtml, onEditor, onSave, busy, count }: { brand: Brand; o: Orientation; onPdf: () => void; onPrint: () => void; onHtml: () => void; onEditor: () => void; onSave: () => void; busy: boolean; count: number }) {
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
          <Button onClick={onSave} disabled={busy} className="w-full col-span-2">Save to Brand workspace</Button>
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

function Diagnostics({ checks, health }: { checks: Brand['checks']; health: HealthGroup[] }) {
  const [open, setOpen] = useState(false)
  const bad = checks.filter(c => !c.ok)
  const sum = healthSummary(health)
  const level: Level = bad.length ? 'attention' : sum.level
  const tone = level === 'attention' ? 'border-amber-400/40 text-amber-200 bg-amber-400/10' : level === 'check' ? 'border-void-700 text-void-200 bg-void-900' : 'border-emerald-400/30 text-emerald-200 bg-emerald-400/10'
  const label = bad.length ? `${bad.length} ${bad.length === 1 ? 'issue' : 'issues'}` : sum.level === 'good' ? 'Brand complete' : sum.text
  const dot = (l: Level) => <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${l === 'good' ? 'bg-emerald-400' : l === 'check' ? 'bg-amber-300' : 'bg-rose-400'}`} />
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} aria-expanded={open} data-brand-health className={`h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-[12px] border ${focusRing} ${tone}`}>
        {level === 'attention' ? <AlertCircle size={13} /> : <Check size={13} />}
        <span className="sm:hidden">{bad.length ? bad.length : sum.level === 'good' ? 'Complete' : sum.text.split(' ')[0]}</span><span className="hidden sm:inline">{label}</span>
      </button>
      {open && (
        <div className="mt-3 w-full rounded-xl bg-[#17171c] border border-void-700 shadow-2xl p-3 max-h-[70vh] overflow-auto">
          <p className="text-[11px] uppercase tracking-wide text-void-500 mb-2">Brand health</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {health.map(g => (
              <div key={g.title}>
                <p className="text-[12px] font-medium text-void-200 mb-1">{g.title}</p>
                <ul className="space-y-1">{g.items.map(it => (
                  <li key={it.label} className="text-[11.5px] leading-snug">
                    <span className="inline-flex items-center gap-1.5 text-void-300">{dot(it.level)}{it.label}</span>
                    {it.note && it.level !== 'good' && <span className="block pl-3 text-void-500">{it.note}</span>}
                  </li>))}</ul>
              </div>
            ))}
          </div>
          <p className="text-[11px] uppercase tracking-wide text-void-500 mt-4 mb-1">Checks</p>
          <ul>{[...bad, ...checks.filter(c => c.ok)].map((c, i) => (
            <li key={i} className="flex gap-2 px-0.5 py-1 text-[12px] leading-snug">{c.ok ? <Check size={13} className="mt-0.5 shrink-0 text-emerald-300" /> : <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-300" />}<span className={c.ok ? 'text-void-400' : 'text-void-100'}>{c.text}</span></li>
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
  const tw = o === 'landscape' ? 158 : 112
  const rowW = 158 // the name row always uses the full list width, even under narrow portrait thumbnails
  const listRef = useRef<HTMLElement>(null)
  // Keep the page being previewed in view when it changes from the preview bar or the keyboard.
  useEffect(() => { listRef.current?.querySelector<HTMLElement>(`[data-page="${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }, [active])
  const iconBtn = `h-6 w-6 shrink-0 inline-flex items-center justify-center rounded ${focusRing}`
  return (
    <nav ref={listRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 min-h-0" aria-label="Pages">
      <div className="flex col-span-full items-center justify-between px-1.5 pb-1 shrink-0">
        <span className="text-[11.5px] text-void-500">{visible} of {pages.length} in export</span>
        <button onClick={reset} title="Restore default order and layouts" aria-label="Reset pages" className={`${iconBtn} text-void-500 hover:text-white`}><RotateCcw size={12} /></button>
      </div>
      {pages.map((p, i) => {
        const def = PAGE_DEFS[p.kind], multi = def.variants.length > 1
        return (
          <div key={p.kind} data-page={i} draggable
            onDragStart={e => { setDrag(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }}
            onDragOver={e => { e.preventDefault(); setOver(i) }} onDragLeave={() => setOver(v => (v === i ? null : v))}
            onDrop={e => { e.preventDefault(); if (drag != null) { move(drag, i); setActive(i) } setDrag(null); setOver(null) }}
            onDragEnd={() => { setDrag(null); setOver(null) }}
            className={`group relative shrink-0 rounded-lg p-1 ${active === i ? 'bg-void-800/70' : 'hover:bg-void-900'} ${over === i && drag !== i ? 'ring-2 ring-accent' : ''} ${drag === i ? 'opacity-40' : ''}`}>
            <button onClick={e => (e.altKey && multi ? cycle(i, e.shiftKey ? -1 : 1) : setActive(i))} aria-current={active === i}
              aria-label={`${p.on ? `Page ${nums[i]}, ` : ''}${def.title}${p.on ? '' : ', left out of exports'}`}
              title={multi ? 'Alt-click to try the next layout' : undefined}
              className={`block mx-auto rounded-md overflow-hidden border-2 ${active === i ? 'border-accent' : 'border-transparent'} ${focusRing} ${p.on ? '' : 'opacity-35'}`}>
              <Page spec={p} pageNo={nums[i] || 1} pageCount={visible || 1} brand={brand} logo={logo} o={o} cssWidth={tw} />
            </button>
            {/* Reorder controls sit over the thumbnail and only show on hover or keyboard focus, so they cost no height. */}
            <div className="absolute top-2 right-2 flex gap-0.5 rounded-md bg-black/70 backdrop-blur-sm p-0.5 opacity-100 lg:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <button onClick={() => { move(i, i - 1); setActive(i - 1) }} disabled={i === 0} aria-label={`Move ${def.title} up`} className={`${iconBtn} text-white/80 hover:text-white disabled:opacity-30`}><ArrowUp size={12} /></button>
              <button onClick={() => { move(i, i + 1); setActive(i + 1) }} disabled={i === pages.length - 1} aria-label={`Move ${def.title} down`} className={`${iconBtn} text-white/80 hover:text-white disabled:opacity-30`}><ArrowDown size={12} /></button>
            </div>
            <div className="mt-1 flex items-center gap-1" style={{ width: rowW }}>
              <span className={`min-w-0 flex-1 truncate text-[11.5px] ${p.on ? 'text-void-200' : 'text-void-500 line-through'}`}>{p.on ? <span className="text-void-500 tabular-nums">{nums[i]}  </span> : null}{def.title}</span>
              {multi && <button onClick={() => cycle(i)} aria-label={`${def.title} layout: ${def.variants[p.variant].label}. Next layout`} title={`Layout: ${def.variants[p.variant].label}. Click for the next one.`}
                className={`h-6 px-1.5 shrink-0 inline-flex items-center gap-0.5 rounded bg-void-900 border border-void-800 text-[10.5px] text-void-400 hover:text-white tabular-nums ${focusRing}`}>{p.variant + 1}/{def.variants.length}<ChevronRight size={10} /></button>}
              <button onClick={() => toggle(i)} aria-label={p.on ? `Leave ${def.title} out of exports` : `Include ${def.title}`} title={p.on ? 'Leave out of exports' : 'Include in exports'} className={`${iconBtn} text-void-500 hover:text-white`}>{p.on ? <Eye size={12} /> : <EyeOff size={12} />}</button>
            </div>
          </div>
        )
      })}
    </nav>
  )
}

/** The page preview. It fits the space it is given, in both directions, and never scrolls away. */
function Preview({ brand, logo, o, active, setActive }: { brand: Brand; logo: LogoInfo | null; o: Orientation; active: number; setActive: (i: number) => void }) {
  const pages = useBrand(s => s.pages), toggle = useBrand(s => s.togglePage), cycle = useBrand(s => s.cycleVariant)
  const box = useRef<HTMLDivElement>(null)
  const [avail, setAvail] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = box.current; if (!el) return
    const ro = new ResizeObserver(([e]) => setAvail({ w: Math.floor(e.contentRect.width / 8) * 8, h: Math.floor(e.contentRect.height / 8) * 8 }))
    ro.observe(el); return () => ro.disconnect()
  }, [])
  const i = Math.min(active, pages.length - 1), spec = pages[i]
  const visible = pages.filter(p => p.on), no = visible.indexOf(spec) + 1
  const ar = SIZES[o].h / SIZES[o].w
  // On a phone the column has no fixed height, so fit to width alone.
  const BAR = 100
  const fitW = Math.min(avail.w, Math.max(60, avail.h - BAR) / ar)
  const cssWidth = Math.max(60, Math.floor(fitW))
  const go = (d: number) => setActive(Math.max(0, Math.min(pages.length - 1, i + d)))
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable="true"], [role="tablist"]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); go(1) }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(-1) }
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  })
  if (!spec) return null
  const def = PAGE_DEFS[spec.kind], multi = def.variants.length > 1
  const bar = `h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-[12px] ${focusRing}`
  return (
    <div className="order-first lg:order-none flex-1 min-w-0 min-h-0 flex flex-col bg-void-900/40">
      <div ref={box} className="flex-1 min-h-0 m-3 sm:m-6 flex flex-col items-center justify-center">
        {avail.w > 0 && <Page spec={spec} pageNo={no || 1} pageCount={visible.length || 1} brand={brand} logo={logo} o={o} cssWidth={cssWidth} />}
        <div className="shrink-0 flex flex-wrap items-center justify-center gap-2 pt-3" style={{ minHeight: BAR - 12 }}>
          <button onClick={() => go(-1)} disabled={i === 0} aria-label="Previous page" className={`${bar} bg-void-800/80 text-void-200 hover:bg-void-700 disabled:opacity-30`}><ArrowLeft size={14} /></button>
          <span className="min-w-[140px] text-center text-[12.5px] text-void-300 tabular-nums" aria-live="polite">
            {spec.on ? <>{no} of {visible.length}</> : <span className="text-void-500">Left out</span>}<span className="text-void-600">  ·  </span><span className="text-void-100">{def.title}</span>
          </span>
          <button onClick={() => go(1)} disabled={i === pages.length - 1} aria-label="Next page" className={`${bar} bg-void-800/80 text-void-200 hover:bg-void-700 disabled:opacity-30`}><ArrowRight size={14} /></button>
          <span className="w-px h-5 bg-void-800 mx-1 hidden sm:block" />
          {multi && <button onClick={() => cycle(i)} className={`${bar} border border-void-800 text-void-300 hover:text-white`}>Layout: <span className="text-void-100">{def.variants[spec.variant].label}</span><ChevronRight size={13} /></button>}
          <button onClick={() => toggle(i)} className={`${bar} border border-void-800 text-void-300 hover:text-white`}>{spec.on ? <><Eye size={13} />In export</> : <><EyeOff size={13} />Left out</>}</button>
        </div>
      </div>
    </div>
  )
}

/** Up to three photos of the brand in use. The photography page shows where the logo sits on each. */
function Photography() {
  const photos = useBrand(s => s.photos), addPhotos = useBrand(s => s.addPhotos), removePhoto = useBrand(s => s.removePhoto)
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const urls = useMemo(() => photos.map(p => ({ id: p.id, name: p.name, url: (() => { const k = Math.min(1, 240 / Math.max(p.img.width, p.img.height)); const c = document.createElement('canvas'); c.width = Math.round(p.img.width * k); c.height = Math.round(p.img.height * k); c.getContext('2d')!.drawImage(p.img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.8) })() })), [photos])
  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return
    setMsg('')
    const files = Array.from(list), room = MAX_PHOTOS - photos.length
    const n = await addPhotos(files)
    if (files.length > room) setMsg(`Up to ${MAX_PHOTOS} photos. ${files.length - room} left out.`)
    else if (n < files.length) setMsg('One of those could not be read as a photo.')
  }
  return (
    <Field label="Photography" hint="Up to three photos of the brand in use. A page shows where the logo sits on each: the calm corner, the version that reads there, and where it should not go.">
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-brand-photos-input onChange={e => { onFiles(e.target.files); e.target.value = '' }} />
      {urls.length > 0 && (
        <div className="mb-2 grid grid-cols-3 gap-1.5" data-brand-photos>
          {urls.map(p => (
            <div key={p.id} className="relative group rounded-md overflow-hidden bg-void-900 aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
              <button onClick={() => removePhoto(p.id)} aria-label={`Remove ${p.name}`} className={`absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-[12px] inline-flex items-center justify-center ${focusRing}`}>×</button>
            </div>
          ))}
        </div>
      )}
      {photos.length < MAX_PHOTOS && <Button onClick={() => file.current?.click()} className="w-full"><ImagePlus size={15} />{photos.length ? 'Add another photo' : 'Add photos'}</Button>}
      {msg && <p className="mt-1 text-[11.5px] text-amber-200/80">{msg}</p>}
    </Field>
  )
}

const TABS = ['Identity', 'Colour', 'Type', 'Pages', 'Settings'] as const
const initialColor = '#3d5afe'

export function BrandGuideline({ onBack, initialBrand, backLabel = 'Studio' }: { onBack: () => void; initialBrand?: import('./jobs').ClientBrand; backLabel?: string }) {
  const router = useRouter()
  const savedId = useRef<string | null>(initialBrand?.id ?? null)
  const tokens = useBrand(s => s.tokens), set = useBrand(s => s.set), newTake = useBrand(s => s.newTake), pages = useBrand(s => s.pages)
  const logo = useBrand(s => s.logo), setLogoInfo = useBrand(s => s.setLogo), hydration = useBrand(s => s.hydration), hydrate = useBrand(s => s.hydrate), startOver = useBrand(s => s.startOver)
  const decisions = useBrand(s => s.decisions)
  const photos = useBrand(s => s.photos)
  const [tab, setTab] = useState<(typeof TABS)[number] | 'Export' | null>(null)
  const [logoErr, setLogoErr] = useState('')
  const [suggestedColor, setSuggestedColor] = useState<string | null>(null)
  const [takeMenu, setTakeMenu] = useState(false)
  const [restoredNote, setRestoredNote] = useState<'show' | 'confirm' | 'hidden'>('show')
  useEffect(() => {
    let live = true
    const load = async () => {
      await hydrate()
      const source = initialBrand?.guideline?.source
      if (!source || !live) return
      savedId.current = initialBrand!.id
      const { blobToCanvas } = await import('@/editor/io')
      const restoredPhotos = await Promise.all((initialBrand!.imagery ?? []).map(async p => ({ ...p, img: await blobToCanvas(p.blob, 1600) })))
      const file = source.logoFile ? new File([source.logoFile], 'brand-logo', { type: source.logoFile.type }) : null
      const info = file ? await analyseLogo(file) : null
      if (!live) return
      useBrand.setState({ tokens: tokensFor(initialBrand!), pages: source.pages, decisions: source.decisions, photos: restoredPhotos, logo: info, logoFile: file })
      setO(source.orientation)
    }
    load().catch(() => setErr('Could not restore this guideline. Your saved brand is safe.'))
    const cleanup = guardUnload(); return () => { live = false; cleanup() }
  }, [hydrate, initialBrand?.id])
  // For checks: where the photography page put the logo on each photo.
  useEffect(() => { (window as unknown as { __vcGuide: unknown }).__vcGuide = { photoPlan: () => lastPhotoPlan } }, [])
  const [o, setO] = useState<Orientation>('landscape')
  const [busy, setBusy] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const brand = useMemo(() => buildBrand(tokens), [tokens])
  const checks = useMemo(() => [...brand.checks, ...logoChecks(brand, logo, decisions)], [brand, logo, decisions])
  const health = useMemo(() => brandHealth({
    colors: [{ hex: brand.roles[0].hex, role: 'primary' }, { hex: brand.roles[1].hex, role: 'secondary' }, { hex: brand.surfaces.light, role: 'background' }, { hex: brand.surfaces.inkOnLight, role: 'text' }],
    display: brand.fonts.heading.family, body: brand.fonts.body.family,
    logos: logo ? logoVariants(brand, logo, decisions).filter(v => v.valid).map(v => ({ name: VARIANT_LABEL[v.id], variant: v.id, derivedFrom: v.id === 'primary' ? null : 'logo', profile: v.id === 'primary' ? logo.profile : null })) : [],
    logoRules: { clearSpace: { value: brand.logo.clearSpace, source: brand.logo.sources.clearSpace }, minWidth: { value: brand.logo.minWidth, source: brand.logo.sources.minWidth }, minPrint: { value: brand.logo.minPrint, source: brand.logo.sources.minPrint }, backgrounds: logo ? logoPlacements(brand, logo, decisions).map(p => ({ hex: p.bg, name: p.bgName, use: VARIANT_OF[p.mode], level: p.level, source: p.designer ? 'designer' as const : 'suggested' as const })) : [] },
  }), [brand, logo, decisions])
  const visible = pages.filter(p => p.on)

  useEffect(() => { loadFont(brand.fonts.heading); loadFont(brand.fonts.body); loadFont(brand.fonts.mono, [400]) }, [brand.fonts.heading, brand.fonts.body, brand.fonts.mono])

  const onLogo = async (f: File) => {
    setLogoErr(''); setSuggestedColor(null)
    try {
      const info = await analyseLogo(f); setLogoInfo(info, f)
      // The mark's main chromatic colour. Taken as the brand colour only while the brand colour is still the default; otherwise suggested.
      const pick = info.profile.colors.find(c => c.chroma > 0.12 && c.share >= 0.05)?.hex ?? null
      if (pick && pick.toLowerCase() !== tokens.brandColor.toLowerCase()) {
        if (tokens.brandColor === initialColor) set('brandColor', pick); else setSuggestedColor(pick)
      }
    } catch { setLogoErr('That file could not be read as an image. Try SVG, PNG or JPG.') }
  }
  const base = fileSlug(brand.name)
  const run = async (label: string, fn: () => Promise<void>) => { setBusy(label); setErr(null); try { await fn() } catch (e) { console.error(e); setErr(`${label.replace(/^Building /, 'The ')} could not be built. ${(e as Error)?.message || 'Try again.'}`) } finally { setBusy(null) } }
  const exportPdf = () => run('Building screen PDF', async () => { const { exportBrandPdf } = await import('./brand-pdf'); await exportBrandPdf(brand, logo, pages, o, `${base}-guidelines-${o}.pdf`, decisions, photos) })
  const exportPrint = () => run('Building print PDF', async () => { const { exportPrintPdf } = await import('./brand-pdf'); await exportPrintPdf(brand, logo, pages, o, `${base}-guidelines-print-${o}.pdf`, decisions, photos) })
  const exportHtml = () => run('Building HTML handoff', async () => {
    const { buildHandoffHtml } = await import('./brand/handoff')
    const { inlineGoogleFontFaces } = await import('./brand/fonts')
    const slides: string[] = []
    await eachPage(pages, brand, logo, o, 1, async c => { slides.push(c.toDataURL('image/jpeg', 0.85)) }, decisions, photos)
    // Fonts go into the file, so it reads the same offline. Anything that cannot be fetched is linked instead.
    setBusy('Embedding fonts')
    const google = Array.from(new Set([brand.fonts.heading, brand.fonts.body, brand.fonts.mono].filter(f => f.source === 'google').map(f => f.family)))
    const { css, missing } = await inlineGoogleFontFaces(google)
    downloadBlob(new Blob([buildHandoffHtml(brand, logo, slides, css, missing, decisions)], { type: 'text/html' }), `${base}-brand.html`)
    if (missing.length) setErr(`Saved. ${missing.join(', ')} could not be embedded, so the file loads ${missing.length === 1 ? 'it' : 'them'} from Google when online.`)
  })
  // Brand memory: the resolved system becomes a client brand Studio jobs can check against.
  const saveAsClient = () => run('Saving brand', async () => {
    const { newBrand, useJobs } = await import('./jobs')
    const roleOf = (i: number) => (i === 0 ? 'primary' : i === 1 ? 'secondary' : 'accent') as 'primary' | 'secondary' | 'accent'
    // The logo system travels with the brand: the supplied file, every honest version, the measured profile and the rules with their source.
    const logos: import('./jobs').BrandLogo[] = []
    if (logo) {
      const { plainProfile } = await import('@/lib/intelligence/dom')
      const profile = plainProfile(logo.profile)
      logos.push({ id: 'logo', name: suggestLogoName(logo.fileName, logo.profile), blob: await canvasToBlob(logo.img), w: logo.width, h: logo.height, variant: 'primary', profile })
      for (const v of logoVariants(brand, logo, decisions)) {
        if (v.id === 'primary' || !v.valid || !v.derived) continue
        const mode = MODE_OF[v.id]
        const c = mode === 'grayscale' ? grayMark(logo) : monoMark(logo, mode === 'white' ? '#ffffff' : mode === 'brand' ? brand.roles[0].hex : brand.surfaces.inkOnLight)
        logos.push({ id: `logo-${v.id}`, name: suggestLogoName(logo.fileName, logo.profile, v.id), blob: await canvasToBlob(c), w: logo.width, h: logo.height, variant: v.id, derivedFrom: 'logo', profile: plainProfile(v.profile), onDark: v.id === 'reversed' })
      }
    }
    const rules: import('@/lib/intelligence/brand').LogoRules = {
      clearSpace: { value: brand.logo.clearSpace, source: brand.logo.sources.clearSpace },
      minWidth: { value: brand.logo.minWidth, source: brand.logo.sources.minWidth },
      minPrint: { value: brand.logo.minPrint, source: brand.logo.sources.minPrint },
      backgrounds: logo ? logoPlacements(brand, logo, decisions).map(p => ({ hex: p.bg, name: p.bgName, use: VARIANT_OF[p.mode], level: p.level, source: p.designer ? 'designer' as const : 'suggested' as const, why: p.why })) : [],
    }
    const b = newBrand({
      ...(savedId.current === initialBrand?.id ? initialBrand : {}), ...(savedId.current ? { id: savedId.current } : {}),
      name: brand.name, client: initialBrand?.client ?? brand.name,
      colors: [...brand.roles.map((r, i) => ({ hex: r.hex, role: roleOf(i) })), { hex: brand.surfaces.light, role: 'background' as const }, { hex: brand.surfaces.inkOnLight, role: 'text' as const }, ...(brand.neutrals[4] ? [{ hex: brand.neutrals[4], role: 'neutral' as const }] : [])],
      display: brand.fonts.heading.family, body: brand.fonts.body.family, scale: { base: brand.baseSize, ratio: brand.ratio },
      logos, logoMin: Math.round(brand.logo.minWidth), clearSpace: Math.min(2, Math.max(0.1, brand.logo.clearSpace)), logoRules: rules,
      voice: brand.voice.tone.split(/,\s*/), dos: brand.voice.dos, donts: brand.voice.donts,
      imagery: photos.map(p => ({ id: p.id, name: p.name, blob: p.blob, w: p.img.width, h: p.img.height })),
    })
    const savedPages: import('@/brand/model').Asset[] = []
    await eachPage(pages, brand, logo, o, 0.7, async c => { savedPages.push({ name: `Guideline page ${savedPages.length + 1}`, data: c.toDataURL('image/jpeg', 0.8) }) }, decisions, photos)
    b.guideline = { system: brand, pages: savedPages, source: { tokens, pages, orientation: o, decisions, logoFile: useBrand.getState().logoFile } }
    savedId.current = b.id
    await useJobs.getState().saveBrand(b)
    setErr(null); setBusy(null)
    setErr(`Saved. ${brand.name} is in your Brand workspace, ready to publish or use in a design.`)
  })
  const openInEditor = async () => {
    setBusy('Opening in Editor'); setErr(null)
    try {
      // Pages go over as real layers: text stays text, shapes stay shapes, the logo stays an image.
      const recorded = await recordPages(pages, brand, logo, o, (i, n) => setBusy(`Building page ${i + 1} of ${n}`), decisions, photos)
      if (!recorded.length) throw new Error('Every page is hidden. Include at least one page in the page list.')
      setBusy('Opening in Editor')
      const layered: LayeredPage[] = []
      for (const p of recorded) {
        const items: LayeredItem[] = []
        for (const it of p.items) {
          if (it.kind === 'image') { const { canvas, ...rest } = it; items.push({ ...rest, blob: await canvasToBlob(canvas) }); canvas.width = 0 }
          else items.push(it)
        }
        layered.push({ name: p.title, background: p.background, items })
      }
      const id = await sendHandoff({ from: 'studio', boards: true, name: `${brand.name} guidelines`, size: { width: SIZES[o].w, height: SIZES[o].h }, palette: [...brand.roles.map(r => r.hex), brand.surfaces.light, brand.surfaces.dark], images: [], layered })
      router.push(`/editor?inbox=${id}`)
    } catch (e) {
      console.error(e); setBusy(null)
      setErr(`The guideline could not open in the Editor. ${(e as Error)?.message || 'Try again.'}`)
    }
  }

  return (
    <div className="brand-builder flex-1 flex flex-col min-h-0">
      <header className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-void-800/60">
        <button onClick={onBack} className={`flex items-center gap-1.5 text-[12.5px] text-void-400 hover:text-white rounded ${focusRing}`}><ArrowLeft size={14} />{backLabel}</button>
        <span className="text-void-700">/</span>
        <h1 className="text-[13.5px] font-semibold truncate min-w-0 flex-1">{tokens.name || 'Untitled brand'}</h1>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button onClick={saveAsClient} disabled={!!busy} className={`h-9 px-3 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-white text-void-950 text-[12px] font-medium ${focusRing}`}><Save size={14} />Save brand</button>
          <button onClick={() => setTab(tab === 'Export' ? null : 'Export')} aria-expanded={tab === 'Export'} className={`h-9 w-9 inline-flex items-center justify-center rounded-lg border border-void-700 ${focusRing}`} aria-label="Export guideline"><Download size={16} /></button>
        </div>
      </header>

      {hydration === 'restored' && restoredNote !== 'hidden' && (
        <div role="status" data-brand-restored className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-void-800/60 bg-void-900/60 text-[12.5px] text-void-300">
          {restoredNote === 'show' ? <>
            <span>Draft restored. Saved on this device.</span>
            <button onClick={() => setRestoredNote('confirm')} className={`ml-auto h-7 px-2.5 rounded-md border border-void-700 text-void-200 hover:text-white ${focusRing}`}>Start over</button>
            <button onClick={() => setRestoredNote('hidden')} aria-label="Dismiss" className={`h-7 px-2 rounded-md text-void-400 hover:text-white ${focusRing}`}>Dismiss</button>
          </> : <>
            <span>Start a new brand? The saved one on this device will be cleared.</span>
            <button onClick={() => { savedId.current = null; startOver(); setRestoredNote('hidden') }} className={`ml-auto h-7 px-2.5 rounded-md bg-red-900/60 border border-red-800 text-white ${focusRing}`}>Clear and start over</button>
            <button onClick={() => setRestoredNote('show')} className={`h-7 px-2 rounded-md text-void-400 hover:text-white ${focusRing}`}>Keep it</button>
          </>}
        </div>
      )}
      <nav aria-label="Guideline tools" className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-void-800/60 px-3 py-2">
        {TABS.map(t => <button key={t} onClick={() => setTab(tab === t ? null : t)} aria-expanded={tab === t} aria-controls="brand-controls"
          className={`h-10 shrink-0 px-2 sm:px-3 rounded-lg text-[12px] font-medium ${focusRing} ${tab === t ? 'bg-white text-void-950' : 'text-void-300 hover:bg-void-800 hover:text-white'}`}>{t === 'Pages' && <PanelLeft size={14} className="hidden sm:inline mr-1.5" />}{t === 'Settings' ? <><Settings2 size={14} className="hidden sm:inline mr-1.5" />Settings</> : t}</button>)}
        <span className="hidden xl:block ml-auto px-2 text-xs text-void-500">Your guideline, live as you edit</span>
      </nav>
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        <section aria-label="Guideline preview" className="flex flex-1 min-w-0 min-h-0">
          <Preview brand={brand} logo={logo} o={o} active={active} setActive={setActive} />
        </section>
        {tab && <aside id="brand-controls" aria-label={`${tab} controls`} className="flex flex-col shrink-0 h-[48%] lg:h-auto lg:w-[360px] min-h-0 border-t lg:border-t-0 lg:border-l border-void-800 bg-void-950">
          <div className="flex shrink-0 items-center justify-between px-4 py-2 border-b border-void-800">
            <h2 className="text-sm font-medium">{tab === 'Export' ? 'Export & handoff' : tab}</h2>
            <button onClick={() => setTab(null)} aria-label="Close brand controls" className={`w-9 h-9 flex items-center justify-center rounded-lg text-void-400 hover:bg-void-800 hover:text-white ${focusRing}`}><X size={16} /></button>
          </div>
          <div className="p-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
            {tab === 'Identity' && <IdentityTab logo={logo} onLogo={onLogo} brand={brand} logoErr={logoErr} suggestedColor={suggestedColor} onUseColor={() => { if (suggestedColor) set('brandColor', suggestedColor); setSuggestedColor(null) }} />}
            {tab === 'Colour' && <ColourTab brand={brand} />}
            {tab === 'Type' && <TypeTab brand={brand} />}
            {tab === 'Pages' && <Outliner brand={brand} logo={logo} o={o} active={active} setActive={setActive} />}
            {tab === 'Settings' && <div className="space-y-5"><p className="text-xs text-void-400 leading-relaxed">Choose a format, check the system or explore a new layout.</p>        <div className="flex flex-wrap items-center gap-3">
          <Diagnostics checks={checks} health={health} />
          <div className="flex rounded-lg border border-void-800 p-0.5">
            <button onClick={() => setO('landscape')} aria-label="Deck" aria-pressed={o === 'landscape'} className={`h-7 px-2 rounded-md text-[12px] inline-flex items-center gap-1.5 ${focusRing} ${o === 'landscape' ? 'bg-void-800 text-white' : 'text-void-400 hover:text-white'}`}><Monitor size={13} /><span >Deck</span></button>
            <button onClick={() => setO('portrait')} aria-label="Document" aria-pressed={o === 'portrait'} className={`h-7 px-2 rounded-md text-[12px] inline-flex items-center gap-1.5 ${focusRing} ${o === 'portrait' ? 'bg-void-800 text-white' : 'text-void-400 hover:text-white'}`}><FileText size={13} /><span >Document</span></button>
          </div>
          <div className="relative">
            <div className="flex rounded-lg border border-void-800 overflow-hidden">
              <button onClick={() => newTake('layout')} title="A variation: keeps colours, type and scale, redraws the composition" className={`h-8 px-2.5 sm:px-3 inline-flex items-center gap-1.5 text-[12.5px] bg-void-900 text-void-100 hover:bg-void-800 ${focusRing}`}><RefreshCw size={14} /><span >Vary layout</span></button>
              <button onClick={() => setTakeMenu(v => !v)} aria-expanded={takeMenu} aria-label="More takes" className={`h-8 w-7 inline-flex items-center justify-center border-l border-void-800 bg-void-900 text-void-300 hover:text-white ${focusRing}`}><ChevronDown size={13} /></button>
            </div>
            {takeMenu && (
              <div className="mt-3 w-full rounded-xl bg-[#17171c] border border-void-700 shadow-2xl p-1.5 text-[12.5px]">
                <button onClick={() => { newTake('layout'); setTakeMenu(false) }} className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-void-800 ${focusRing}`}><span className="block text-void-100">Vary the layout</span><span className="block text-[11.5px] text-void-500">Keeps the logo, colours, type and scale. Changes art direction, corners, spacing and grid.</span></button>
                <button onClick={() => { newTake('all'); setTakeMenu(false) }} className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-void-800 ${focusRing}`}><span className="block text-void-100">New take of everything</span><span className="block text-[11.5px] text-void-500">Regenerates every unlocked token, colours and fonts included.</span></button>
              </div>
            )}
          </div>
        </div><p className="text-xs text-void-500 leading-relaxed">Vary layout keeps your identity. New take changes unlocked values. Editing a value locks it.</p></div>}
            {tab === 'Export' && <ExportTab brand={brand} o={o} onPdf={exportPdf} onPrint={exportPrint} onHtml={exportHtml} onEditor={openInEditor} onSave={saveAsClient} busy={!!busy} count={visible.length} />}
          </div>
        </aside>}
      </div>

      {err && <div role={err.startsWith('Saved.') ? 'status' : 'alert'} className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[560px] flex items-start gap-3 px-4 py-3 rounded-xl bg-void-900 border border-void-700 text-[13px] text-void-100 shadow-2xl">{err.startsWith('Saved.') ? <Check size={16} className="mt-0.5 shrink-0 text-emerald-300" /> : <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-300" />}<span className="flex-1">{err}</span><button onClick={() => setErr(null)} className={`text-rose-200/70 hover:text-white text-[12px] ${focusRing}`}>Dismiss</button></div>}
      {busy && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55"><div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[#17171c] border border-void-700 text-[13.5px]"><span className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />{busy}</div></div>}
    </div>
  )
}
