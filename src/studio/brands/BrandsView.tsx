'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, Plus, Trash2, Upload } from 'lucide-react'
import { FONTS, blobToCanvas, ensureFont, getBrand, saveBrand as saveKit } from '@/editor/io'
import { uid } from '@/editor/engine'
import { newBrand, useJobs, type ClientBrand } from '../jobs'
import { Btn, Empty, INPUT, Label, Panel, focusRing, isLight, useObjectUrl } from '../ui'

const ROLES: ClientBrand['colors'][number]['role'][] = ['primary', 'secondary', 'accent', 'neutral', 'background', 'text']

export function BrandsView({ initial, onBack, onGuidelines }: { initial?: string; onBack: () => void; onGuidelines: () => void }) {
  const { brands, saveBrand, removeBrand, load } = useJobs()
  const [openId, setOpenId] = useState<string | null>(initial ?? null)
  const [draft, setDraft] = useState<ClientBrand | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  useEffect(() => { if (!brands.length) load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setDraft(brands.find(b => b.id === openId) ?? null) }, [openId, brands])
  // Save as you type, gently.
  useEffect(() => { if (!draft) return; const t = setTimeout(() => saveBrand(draft), 500); return () => clearTimeout(t) }, [draft]) // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => { const b = newBrand(); await saveBrand(b); setOpenId(b.id) }

  return (
    <div className="max-w-6xl w-full mx-auto px-5 sm:px-8 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} aria-label="Back to Studio" className={`w-8 h-8 rounded-lg text-void-400 hover:text-white hover:bg-void-800 flex items-center justify-center ${focusRing}`}><ArrowLeft size={16} /></button>
        <div className="flex-1"><h1 className="text-[24px] font-semibold tracking-tight">Brands</h1><p className="text-[13px] text-void-400">Each client&apos;s colours, type, logos and voice. Pick a brand on a job and the Editor checks every design against it: off-brand colours, wrong fonts, logo size and clear space.</p></div>
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
        {!draft ? <Empty title="Pick or create a brand" action={<Btn primary onClick={create}><Plus size={14} />New brand</Btn>}>A brand here is the source of truth for a client. The guideline builder can save its result here too.</Empty> : (
          <BrandEditor key={draft.id} b={draft} set={p => setDraft(d => (d ? { ...d, ...p } : d))}
            onDelete={async () => { if (confirm(`Delete ${draft.name}?`)) { await removeBrand(draft.id); setOpenId(null) } }}
            onUseInEditor={async () => { const kit = await getBrand(); await saveKit({ ...kit, colors: draft.colors.map(c => c.hex), fonts: [draft.display, draft.body], logos: draft.logos.map(l => ({ id: l.id, name: l.name, blob: l.blob })) }); setSaved('Loaded into the Editor\'s brand kit (Edit > Brand kit).'); setTimeout(() => setSaved(null), 3500) }} saved={saved} />
        )}
      </div>
    </div>
  )
}

function BrandEditor({ b, set, onDelete, onUseInEditor, saved }: { b: ClientBrand; set: (p: Partial<ClientBrand>) => void; onDelete: () => void; onUseInEditor: () => void; saved: string | null }) {
  const logoIn = useRef<HTMLInputElement>(null)
  useEffect(() => { ensureFont(b.display, 700); ensureFont(b.body, 400) }, [b.display, b.body])
  const addLogos = async (files: File[]) => {
    const out: ClientBrand['logos'] = []
    for (const f of files) { try { const c = await blobToCanvas(f, 2000); out.push({ id: uid(), name: f.name.replace(/\.[a-z0-9]+$/i, ''), blob: f, w: c.width, h: c.height }) } catch { /* skip */ } }
    set({ logos: [...b.logos, ...out] })
  }
  const lines = (v: string) => v.split('\n').map(x => x.trim()).filter(Boolean)
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[200px]"><Label>Brand</Label><input value={b.name} onChange={e => set({ name: e.target.value })} className={`${INPUT} w-full !h-10 !text-[15px] font-semibold`} /></label>
        <label className="flex-1 min-w-[200px]"><Label>Client</Label><input value={b.client} onChange={e => set({ client: e.target.value })} className={`${INPUT} w-full !h-10`} /></label>
        <Btn onClick={onUseInEditor}>Use as the Editor brand kit</Btn>
        <Btn subtle onClick={onDelete}><Trash2 size={14} /></Btn>
      </div>
      {saved && <p className="text-[12.5px] text-emerald-300">{saved}</p>}
      <Panel title="Colours" action={<button onClick={() => set({ colors: [...b.colors, { hex: '#8b7cff', role: b.colors.length ? 'accent' : 'primary' }] })} className="text-[12px] text-accent-light hover:text-white">+ Add colour</button>}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {b.colors.map((c, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-void-950 border border-void-800">
              <label className="w-10 h-10 rounded-md border border-white/10 cursor-pointer shrink-0" style={{ background: c.hex }}><input type="color" value={c.hex} onChange={e => set({ colors: b.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)) })} className="sr-only" /></label>
              <input value={c.hex} onChange={e => /^#[0-9a-f]{6}$/i.test(e.target.value) && set({ colors: b.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value.toLowerCase() } : x)) })} className={`${INPUT} w-24 font-mono`} aria-label="Hex" />
              <select value={c.role} onChange={e => set({ colors: b.colors.map((x, j) => (j === i ? { ...x, role: e.target.value as any } : x)) })} className={`${INPUT} flex-1`}>{ROLES.map(r => <option key={r}>{r}</option>)}</select>
              <button aria-label="Remove colour" onClick={() => set({ colors: b.colors.filter((_, j) => j !== i) })} className="text-void-500 hover:text-white"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Type">
          <div className="grid grid-cols-2 gap-2">
            <label><Label>Headlines</Label><input list="vc-fonts" value={b.display} onChange={e => set({ display: e.target.value })} className={`${INPUT} w-full`} /></label>
            <label><Label>Text</Label><input list="vc-fonts" value={b.body} onChange={e => set({ body: e.target.value })} className={`${INPUT} w-full`} /></label>
            <datalist id="vc-fonts">{FONTS.map(f => <option key={f} value={f} />)}</datalist>
          </div>
          <p className="mt-3 text-[28px] leading-tight" style={{ fontFamily: `"${b.display}"`, fontWeight: 700 }}>{b.name}</p>
          <p className="text-[14px] text-void-300" style={{ fontFamily: `"${b.body}"` }}>Any Google font name works; it loads when a design uses it.</p>
        </Panel>
        <Panel title="Logos" action={<><input ref={logoIn} type="file" accept="image/*,.svg" multiple hidden onChange={e => { addLogos(Array.from(e.target.files ?? [])); e.target.value = '' }} /><button onClick={() => logoIn.current?.click()} className="text-[12px] text-accent-light hover:text-white"><Upload size={12} className="inline -mt-0.5" /> Add logo files</button></>}>
          <div className="flex flex-wrap gap-2">{b.logos.map(l => <LogoTile key={l.id} l={l} onRemove={() => set({ logos: b.logos.filter(x => x.id !== l.id) })} onDark={v => set({ logos: b.logos.map(x => (x.id === l.id ? { ...x, onDark: v } : x)) })} />)}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label><Label hint="px on a 1080 design">Smallest size</Label><input type="number" min={20} value={b.logoMin} onChange={e => set({ logoMin: Math.max(10, +e.target.value || 0) })} className={`${INPUT} w-full`} /></label>
            <label><Label hint="share of logo height">Clear space</Label><input type="number" min={0} max={2} step={0.05} value={b.clearSpace} onChange={e => set({ clearSpace: Math.max(0, +e.target.value || 0) })} className={`${INPUT} w-full`} /></label>
          </div>
        </Panel>
      </div>
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

function LogoTile({ l, onRemove, onDark }: { l: ClientBrand['logos'][number]; onRemove: () => void; onDark: (v: boolean) => void }) {
  const url = useObjectUrl(l.blob)
  return (
    <div className="group relative w-32">
      <div className={`h-20 rounded-lg border border-void-800 flex items-center justify-center p-2 ${l.onDark ? 'bg-void-950' : 'bg-white'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt={l.name} className="max-w-full max-h-full object-contain" />}
      </div>
      <div className="mt-1 flex items-center gap-1 text-[11px]"><span className="flex-1 truncate text-void-400">{l.name}</span><button onClick={() => onDark(!l.onDark)} className="text-void-500 hover:text-white">{l.onDark ? 'On dark' : 'On light'}</button></div>
      <button aria-label="Remove logo" onClick={onRemove} className="absolute top-1 right-1 w-6 h-6 rounded bg-black/60 text-white hidden group-hover:flex items-center justify-center"><Trash2 size={12} /></button>
    </div>
  )
}

export { isLight }
