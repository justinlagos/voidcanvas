'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { FONTS, canvasToBlob, ensureFont, getBrand, saveBrand as saveKit } from '@/editor/io'
import { uid } from '@/editor/engine'
import { logoVariant, newBrand, primaryLogo, useJobs, type BrandLogo, type ClientBrand } from '../jobs'
import { Btn, Empty, INPUT, Label, Panel, focusRing, isLight, useObjectUrl } from '../ui'
import { PublishControl } from '@/brand/PublishControl'
import { createWithBrand } from '@/brand/client'
import { ShareControl } from '@/components/account/ShareControl'
import { VARIANT_LABEL, VARIANT_USE, planVariants, variantProfile, type VariantId } from '@/lib/intelligence/logo'
import { analyseLogoFile, deriveVariants, plainProfile } from '@/lib/intelligence/dom'
import { suggestLogoName } from '@/lib/intelligence/naming'
import { brandHealth, healthSummary, suggestRules, type LogoRules } from '@/lib/intelligence/brand'
import { backgroundSet, placeAll } from '@/lib/intelligence/backgrounds'
import { describeProfile } from '@/lib/intelligence/asset'
import type { Level } from '@/lib/intelligence/contrast'

const ROLES: ClientBrand['colors'][number]['role'][] = ['primary', 'secondary', 'accent', 'neutral', 'background', 'text']

export function BrandsView({ initial, onBack, onGuidelines }: { initial?: string; onBack: () => void; onGuidelines: () => void }) {
  const { brands, saveBrand, removeBrand, load } = useJobs()
  const [openId, setOpenId] = useState<string | null>(initial ?? null)
  const [draft, setDraft] = useState<ClientBrand | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  useEffect(() => { if (!brands.length) load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setDraft(brands.find(b => b.id === openId) ?? null) }, [openId, brands])
  // Save as you type, gently.
  // Only when something changed: the stored copy coming back must not count as an edit (that looped every half second).
  useEffect(() => {
    if (!draft) return
    const strip = (b: ClientBrand) => JSON.stringify({ ...b, updatedAt: 0, syncedAt: null, pushedAt: 0, logos: b.logos.map(l => ({ ...l, blob: l.blob?.size })) })
    const stored = brands.find(b => b.id === draft.id)
    if (stored && strip(stored) === strip(draft)) return
    const t = setTimeout(() => saveBrand(draft), 500); return () => clearTimeout(t)
  }, [draft]) // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => { const b = newBrand(); await saveBrand(b); setOpenId(b.id) }

  return (
    <div className="max-w-6xl w-full mx-auto px-5 sm:px-8 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} aria-label="Back to brands" className={`w-8 h-8 rounded-lg text-void-400 hover:text-white hover:bg-void-800 flex items-center justify-center ${focusRing}`}><ArrowLeft size={16} /></button>
        <div className="flex-1"><h1 className="text-[24px] font-semibold tracking-tight">Brands</h1><p className="text-[13px] text-void-400">Each client&apos;s logo system, colours, type and voice. Pick a brand on a job and the Editor checks every design against it as you work.</p></div>
        <Btn onClick={onGuidelines}><BookOpen size={14} />Build one with the guideline builder</Btn>
        <Btn primary onClick={create}><Plus size={15} />New brand</Btn>
      </div>
      <div className="mt-6 grid md:grid-cols-[240px_1fr] gap-5">
        <div className="space-y-1">
          {!brands.length && <p className="text-[12.5px] text-void-500">No brands yet.</p>}
          {brands.map(b => (
            <button key={b.id} onClick={() => setOpenId(b.id)} className={`w-full text-left px-3 py-2 rounded-lg ${focusRing} ${openId === b.id ? 'bg-void-800' : 'hover:bg-void-900'}`}>
              <span className="block text-[13px] font-medium truncate">{b.name}</span>
              <span className="flex gap-0.5 mt-1">{b.colors.slice(0, 7).map(c => <span key={c.hex + c.role} className="w-4 h-4 rounded-sm" style={{ background: c.hex }} />)}</span>
            </button>
          ))}
        </div>
        {!draft ? (
          <Empty title={brands.length ? 'Pick a brand' : 'Your client brands live here'} action={<><Btn primary onClick={create}><Plus size={14} />{brands.length ? 'New brand' : 'Create your first brand'}</Btn>{!brands.length && <Btn onClick={onGuidelines}><BookOpen size={14} />Start from a logo</Btn>}</>}>
            Save a logo, colours, fonts and usage rules once. VoidCanvas then checks them while you design: off-brand colours, wrong fonts, a logo too small or losing contrast, and offers the right version.
          </Empty>
        ) : (
          <BrandEditor key={draft.id} b={draft} set={p => setDraft(d => (d ? { ...d, ...p } : d))}
            onDelete={async () => { if (confirm(`Delete ${draft.name}?`)) { await removeBrand(draft.id); setOpenId(null) } }}
            onUseInEditor={async () => { const kit = await getBrand(); await saveKit({ ...kit, colors: draft.colors.map(c => c.hex), fonts: [draft.display, draft.body], logos: draft.logos.map(l => ({ id: l.id, name: l.name, blob: l.blob })) }); setSaved('Loaded into the Editor\'s brand kit (Edit > Brand kit).'); setTimeout(() => setSaved(null), 3500) }} saved={saved} />
        )}
      </div>
    </div>
  )
}

const LEVEL_DOT: Record<Level, string> = { good: 'bg-emerald-400', check: 'bg-amber-300', attention: 'bg-rose-400' }

/** Source label for a rule, so nothing pretends to be the client's decision. */
function Src({ rules, k }: { rules: LogoRules | null | undefined; k: 'clearSpace' | 'minWidth' | 'minPrint' }) {
  const s = rules?.[k]?.source
  return <span className={`text-[10.5px] px-1.5 py-0.5 rounded ${s === 'designer' ? 'bg-accent-soft text-accent-light' : 'bg-void-800 text-void-400'}`}>{s === 'designer' ? 'Set by you' : 'Suggested'}</span>
}

function BrandEditor({ b, set, onDelete, onUseInEditor, saved }: { b: ClientBrand; set: (p: Partial<ClientBrand>) => void; onDelete: () => void; onUseInEditor: () => void; saved: string | null }) {
  const logoIn = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => { ensureFont(b.display, 700); ensureFont(b.body, 400) }, [b.display, b.body])
  const primary = primaryLogo(b)
  const health = useMemo(() => brandHealth(b), [b])
  const summary = healthSummary(health)
  const ink = b.colors.find(c => c.role === 'text')?.hex ?? '#111111'
  const brandHex = b.colors.find(c => c.role === 'primary')?.hex ?? b.colors[0]?.hex ?? null

  /** Rules the brand has: existing, else suggested from the primary's profile, mirrored into the old fields. */
  const rules = (): LogoRules => b.logoRules ?? { ...suggestRules(primary?.profile ?? null), backgrounds: [] }
  const setRule = (k: 'clearSpace' | 'minWidth' | 'minPrint', value: number) => {
    const r = { ...rules(), [k]: { value, source: 'designer' as const } }
    set({ logoRules: r, clearSpace: r.clearSpace.value, logoMin: r.minWidth.value })
  }

  /** Read each file, name it, keep its profile, and derive the honest versions when it is a primary with none yet. */
  const addLogos = async (files: File[]) => {
    const out: BrandLogo[] = [...b.logos]
    setBusy('Reading the artwork')
    try {
      for (const f of files) {
        try {
          const a = await analyseLogoFile(f)
          const name = suggestLogoName(f.name, a.profile)
          const variant: VariantId = name.endsWith('Reversed') ? 'reversed' : name.endsWith('Mono dark') ? 'mono-dark' : name.endsWith('Greyscale') ? 'grayscale' : 'primary'
          const id = uid()
          out.push({ id, name, blob: f, w: a.width, h: a.height, variant, profile: plainProfile(a.profile), onDark: variant === 'reversed' })
          if (variant === 'primary' && !out.some(l => l.derivedFrom && l.derivedFrom !== id && (l.variant === 'reversed' || l.variant === 'mono-dark'))) {
            for (const v of deriveVariants(a, ink, brandHex)) {
              if (v.id === 'primary' || !v.plan.valid || !v.plan.derived) continue
              out.push({ id: uid(), name: suggestLogoName(f.name, a.profile, v.id), blob: await canvasToBlob(v.canvas), w: a.width, h: a.height, variant: v.id, derivedFrom: id, profile: plainProfile(v.profile), onDark: v.id === 'reversed' })
            }
          }
        } catch { /* skip a file that will not read */ }
      }
      const first = out.find(l => (l.variant ?? 'primary') === 'primary' && l.profile)
      const r = b.logoRules ?? { ...suggestRules(first?.profile ?? null), backgrounds: [] }
      set({ logos: out, logoRules: r, clearSpace: r.clearSpace.value, logoMin: r.minWidth.value })
    } finally { setBusy(null) }
  }

  /** Test the primary and its versions against this brand's colours again (after a colour changed, say). */
  const retest = () => {
    if (!primary?.profile) return
    const plans = planVariants(primary.profile, ink, brandHex)
    const have = new Set(b.logos.map(l => l.variant ?? 'primary'))
    const variants = plans.map(pl => ({ id: pl.id, valid: pl.id === 'primary' || (pl.valid && have.has(pl.id)), profile: b.logos.find(l => l.variant === pl.id)?.profile ?? variantProfile(primary.profile!, pl) }))
    const by = (role: string) => b.colors.find(c => c.role === role)?.hex ?? null
    const bgs = backgroundSet({ primary: by('primary') ?? '#3d5afe', secondary: by('secondary'), accent: by('accent'), light: by('background'), dark: by('neutral'), lightest: null, mid: null, darkest: null })
    const kept = new Map((b.logoRules?.backgrounds ?? []).filter(x => x.source === 'designer').map(x => [x.hex.toLowerCase(), x]))
    const backgrounds = placeAll(bgs, variants).map(p => kept.get(p.bg.hex.toLowerCase()) ?? ({ hex: p.bg.hex, name: p.bg.name, use: p.use, level: p.level, source: 'suggested' as const, why: p.why }))
    set({ logoRules: { ...rules(), backgrounds } })
  }
  const lines = (v: string) => v.split('\n').map(x => x.trim()).filter(Boolean)
  const r = rules()
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[200px]"><Label>Brand</Label><input value={b.name} onChange={e => set({ name: e.target.value })} className={`${INPUT} w-full !h-10 !text-[15px] font-semibold`} /></label>
        <label className="flex-1 min-w-[200px]"><Label>Client</Label><input value={b.client} onChange={e => set({ client: e.target.value })} className={`${INPUT} w-full !h-10`} /></label>
        <ShareControl kind="brand" item={b} />
        <PublishControl brand={b} />
        <Btn onClick={async () => { window.location.assign(await createWithBrand(b)) }}>Create design</Btn>
        <Btn onClick={onUseInEditor}>Use as the Editor brand kit</Btn>
        <Btn subtle onClick={onDelete}><Trash2 size={14} /></Btn>
      </div>
      {saved && <p className="text-[12.5px] text-emerald-300">{saved}</p>}

      <Panel title={<span className="flex items-center gap-2">Brand health <span className={`text-[11px] font-normal ${summary.level === 'good' ? 'text-emerald-300' : summary.level === 'check' ? 'text-amber-200' : 'text-void-300'}`}>{summary.text}</span></span>}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {health.map(g => (
            <div key={g.title}>
              <p className="text-[12px] font-medium text-void-200 mb-1.5">{g.title}</p>
              <ul className="space-y-1">{g.items.map(it => (
                <li key={it.label} className="text-[12px] leading-snug">
                  <span className="inline-flex items-center gap-1.5 text-void-300"><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${LEVEL_DOT[it.level]}`} />{it.label}</span>
                  {it.note && it.level !== 'good' && <span className="block pl-3 text-[11.5px] text-void-500">{it.note}</span>}
                </li>))}</ul>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Colours" action={<button onClick={() => set({ colors: [...b.colors, { hex: '#8b7cff', role: b.colors.length ? 'accent' : 'primary' }] })} className="text-[12px] text-accent-light hover:text-white">+ Add colour</button>}>
        <div className="grid sm:grid-cols-2 gap-2">
          {b.colors.map((c, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-void-950 border border-void-800 min-w-0">
              <label className="w-9 h-9 rounded-md border border-white/10 cursor-pointer shrink-0" style={{ background: c.hex }}><input type="color" value={c.hex} onChange={e => set({ colors: b.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)) })} className="sr-only" /></label>
              <input value={c.hex} onChange={e => /^#[0-9a-f]{6}$/i.test(e.target.value) && set({ colors: b.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value.toLowerCase() } : x)) })} className={`${INPUT} w-[88px] shrink-0 font-mono`} aria-label="Hex" />
              <select value={c.role} onChange={e => set({ colors: b.colors.map((x, j) => (j === i ? { ...x, role: e.target.value as any } : x)) })} className={`${INPUT} flex-1 min-w-0`}>{ROLES.map(r => <option key={r}>{r}</option>)}</select>
              <button aria-label="Remove colour" onClick={() => set({ colors: b.colors.filter((_, j) => j !== i) })} className="text-void-500 hover:text-white shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Logo system" action={<><input ref={logoIn} type="file" accept="image/*,.svg" multiple hidden onChange={e => { addLogos(Array.from(e.target.files ?? [])); e.target.value = '' }} /><button onClick={() => logoIn.current?.click()} className="text-[12px] text-accent-light hover:text-white"><Upload size={12} className="inline -mt-0.5" /> Add logo files</button></>}>
        {busy && <p className="mb-2 text-[12px] text-accent-light">{busy}…</p>}
        {!b.logos.length ? (
          <p className="text-[12.5px] text-void-400 leading-relaxed">Add the supplied logo. It is measured (colours, shape, thinnest stroke), named, and the versions that can honestly be made from it (reversed, mono, greyscale) are added with it. A version that would melt the detail between colours is refused, with the reason.</p>
        ) : (
          <div className="flex flex-wrap gap-3">{b.logos.map(l => <LogoTile key={l.id} l={l} onRemove={() => set({ logos: b.logos.filter(x => x.id !== l.id && x.derivedFrom !== l.id) })} onVariant={v => set({ logos: b.logos.map(x => (x.id === l.id ? { ...x, variant: v, onDark: v === 'reversed' } : x)) })} />)}</div>
        )}
        {primary?.profile && <p className="mt-3 text-[11.5px] text-void-500">{describeProfile(primary.profile)}</p>}
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          <label><Label hint={<Src rules={b.logoRules} k="minWidth" />}>Smallest on screen</Label><div className="flex items-center gap-1.5"><input type="number" min={10} value={r.minWidth.value} onChange={e => setRule('minWidth', Math.max(10, +e.target.value || 0))} className={`${INPUT} w-full`} /><span className="text-[11.5px] text-void-500 shrink-0">px at 1080</span></div></label>
          <label><Label hint={<Src rules={b.logoRules} k="minPrint" />}>Smallest in print</Label><div className="flex items-center gap-1.5"><input type="number" min={2} value={r.minPrint.value} onChange={e => setRule('minPrint', Math.max(2, +e.target.value || 0))} className={`${INPUT} w-full`} /><span className="text-[11.5px] text-void-500 shrink-0">mm</span></div></label>
          <label><Label hint={<Src rules={b.logoRules} k="clearSpace" />}>Clear space</Label><div className="flex items-center gap-1.5"><input type="number" min={0} max={2} step={0.05} value={r.clearSpace.value} onChange={e => setRule('clearSpace', Math.max(0, +e.target.value || 0))} className={`${INPUT} w-full`} /><span className="text-[11.5px] text-void-500 shrink-0">× height</span></div></label>
        </div>
        {primary?.profile && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5"><Label>On this brand&apos;s colours</Label><button onClick={retest} className={`text-[12px] text-void-400 hover:text-white inline-flex items-center gap-1 rounded ${focusRing}`}><RefreshCw size={12} />{b.logoRules?.backgrounds.length ? 'Test again' : 'Test the logo'}</button></div>
            {b.logoRules?.backgrounds.length ? (
              <ul className="rounded-lg border border-void-800 divide-y divide-void-800/70">
                {b.logoRules.backgrounds.map(x => (
                  <li key={x.hex} className="flex items-center gap-2 px-2.5 py-1.5 text-[12px]">
                    <span className="w-7 h-5 shrink-0 rounded" style={{ background: x.hex, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }} />
                    <span className="flex-1 min-w-0 truncate text-void-300">{x.name}</span>
                    <span className="text-void-400">{VARIANT_LABEL[x.use]}{x.source === 'designer' ? ' · set by you' : ''}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${LEVEL_DOT[x.level]}`} title={x.why} />
                  </li>))}
              </ul>
            ) : <p className="text-[12px] text-void-500">Not tested against these colours yet.</p>}
          </div>
        )}
      </Panel>

      <Panel title="Type">
        <div className="grid grid-cols-2 gap-2">
          <label><Label>Headlines</Label><input list="vc-fonts" value={b.display} onChange={e => set({ display: e.target.value })} className={`${INPUT} w-full`} /></label>
          <label><Label>Text</Label><input list="vc-fonts" value={b.body} onChange={e => set({ body: e.target.value })} className={`${INPUT} w-full`} /></label>
          <datalist id="vc-fonts">{FONTS.map(f => <option key={f} value={f} />)}</datalist>
        </div>
        <p className="mt-3 text-[28px] leading-tight" style={{ fontFamily: `"${b.display}"`, fontWeight: 700 }}>{b.name}</p>
        <p className="text-[14px] text-void-300" style={{ fontFamily: `"${b.body}"` }}>Any Google font name works; it loads when a design uses it.</p>
      </Panel>

      <Panel title="Voice">
        <div className="grid md:grid-cols-3 gap-3">
          <label><Label>Voice words</Label><textarea value={b.voice.join('\n')} onChange={e => set({ voice: lines(e.target.value) })} rows={5} placeholder={'warm\nconfident\nplain-spoken'} className={`w-full px-2.5 py-2 rounded-lg bg-void-950 border border-void-800 text-[12.5px] ${focusRing}`} /></label>
          <label><Label>Do</Label><textarea value={b.dos.join('\n')} onChange={e => set({ dos: lines(e.target.value) })} rows={5} className={`w-full px-2.5 py-2 rounded-lg bg-void-950 border border-void-800 text-[12.5px] ${focusRing}`} /></label>
          <label><Label>Don&apos;t</Label><textarea value={b.donts.join('\n')} onChange={e => set({ donts: lines(e.target.value) })} rows={5} className={`w-full px-2.5 py-2 rounded-lg bg-void-950 border border-void-800 text-[12.5px] ${focusRing}`} /></label>
        </div>
      </Panel>
    </div>
  )
}

function LogoTile({ l, onRemove, onVariant }: { l: BrandLogo; onRemove: () => void; onVariant: (v: VariantId) => void }) {
  const url = useObjectUrl(l.blob)
  const v = l.variant ?? (l.onDark ? 'reversed' : 'primary')
  const dark = v === 'reversed' || (l.profile ? l.profile.tone === 'light' : false)
  return (
    <div className="group relative w-36">
      <div className={`h-20 rounded-lg border border-void-800 flex items-center justify-center p-2 ${dark ? 'bg-void-950' : 'bg-white'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt={l.name} className="max-w-full max-h-full object-contain" />}
      </div>
      <p className="mt-1 text-[11px] text-void-300 truncate" title={l.name}>{l.name}</p>
      <div className="flex items-center gap-1 text-[10.5px]">
        <select value={v} onChange={e => onVariant(e.target.value as VariantId)} aria-label={`What ${l.name} is`} className={`h-6 px-1 rounded bg-void-900 border border-void-800 text-[10.5px] text-void-400 ${focusRing}`} title={VARIANT_USE[v]}>
          {(Object.keys(VARIANT_LABEL) as VariantId[]).map(k => <option key={k} value={k}>{VARIANT_LABEL[k]}</option>)}
        </select>
        <span className="text-void-600 truncate">{l.derivedFrom ? 'derived' : 'supplied'}</span>
      </div>
      <button aria-label={`Remove ${l.name}`} onClick={onRemove} className="absolute top-1 right-1 w-6 h-6 rounded bg-black/60 text-white hidden group-hover:flex items-center justify-center"><Trash2 size={12} /></button>
    </div>
  )
}

export { isLight, logoVariant }
