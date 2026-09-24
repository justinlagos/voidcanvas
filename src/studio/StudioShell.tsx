'use client'
import { track } from '@/lib/analytics'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Check, Download, ImagePlus, Layers, Plus, Sparkles, Trash2 } from 'lucide-react'
import { BrandGuideline } from './BrandGuideline'
import { AppNav, Logo } from '@/components/AppNav'
import { Button, focusRing } from '@/editor/components/ui'
import { blobToCanvas, downloadBlob, ensureFont, idb, sendHandoff, type LayeredPage } from '@/editor/io'
import { FONT_PAIRS, buildDrafts, buildMoodboard, briefItems, grade, paletteRoles, pickPair, readBrief, renderPage, type BriefFields, type DraftInput } from './drafts'
import { extractPalette, uid } from '@/editor/engine'
import { SIZE_PRESETS } from '@/editor/presets'

// Studio is the front half of the design process: read the brief, gather references,
// pull a palette, then hand all of it to the Editor as a ready-to-work design.
// Boards live in the same local database as Editor designs. When Art Director Studio's
// accounts, community and Artie are ported in, this data model is what they attach to.

interface Ref { id: string; name: string; blob: Blob; palette: string[]; w?: number; h?: number }
interface Board {
  id: string; title: string; brief: string; presetId: string; refs: Ref[]; updatedAt: number
  /** Fields corrected by hand, and which ones, so re-reading the brief never overwrites them. */
  fields?: Partial<BriefFields>; edited?: (keyof BriefFields)[]
  pairId?: string
  /** null = decide from the brief. */
  dark?: boolean | null
}

export function StudioShell() {
  const [boards, setBoards] = useState<Board[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [mode, setModeRaw] = useState<'boards' | 'brand'>('boards')
  const setMode = (m: 'boards' | 'brand') => { if (m !== mode) track('studio.mode', { mode: m }); setModeRaw(m) }
  const reload = useCallback(() => idb.all<Board>('boards').then(b => setBoards(b.sort((a, c) => c.updatedAt - a.updatedAt))).catch(() => setBoards([])), [])
  useEffect(() => { reload() }, [reload])
  const board = boards?.find(b => b.id === openId) ?? null

  const create = async () => {
    const b: Board = { id: uid(), title: 'Untitled project', brief: '', presetId: 'ig-post', refs: [], updatedAt: Date.now() }
    await idb.put('boards', b); await reload(); setOpenId(b.id)
  }

  return (
    <main className={`flex flex-col bg-void-950 text-void-100 ${mode === 'brand' ? 'min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden' : 'min-h-[100dvh]'}`}>
      <header className="h-12 shrink-0 flex items-center gap-3 px-3 border-b border-void-800/60"><Logo /><AppNav /></header>
      {mode === 'brand' ? <BrandGuideline onBack={() => setMode('boards')} /> : board ? <BoardView key={board.id} board={board} onBack={() => { setOpenId(null); reload() }} /> : (
        <div className="max-w-5xl w-full mx-auto px-5 sm:px-8 py-8 sm:py-12">
          <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-tight">Start with the brief</h1>
          <p className="mt-1.5 text-[14px] text-void-400 max-w-xl">Paste the client&apos;s brief and drop in references. Studio pulls out what must be on the design, gives your colours jobs, pairs the type, and lays out three editable first drafts. Nothing leaves your device.</p>
          <div className="mt-6 grid sm:grid-cols-2 gap-3 max-w-2xl">
            <button onClick={() => setMode('brand')} className={`flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-br from-[#8b7cff]/20 to-void-900 border border-accent/30 hover:border-accent/60 text-left ${focusRing}`}>
              <span className="w-11 h-11 rounded-xl bg-accent text-white flex items-center justify-center shrink-0"><BookOpen size={20} /></span>
              <span><span className="block text-[14px] font-semibold">Brand guideline builder</span><span className="block text-[12.5px] text-void-400">A full, unique brand system with mockups. Export to PDF.</span></span>
            </button>
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-void-900 border border-void-800 text-void-400 text-[12.5px]"><Sparkles size={18} className="text-accent-light shrink-0" />Projects turn a brief and references into three layered drafts, a moodboard for sign-off and a checklist in the Editor.</div>
          </div>
          <h2 className="mt-9 mb-3 text-[13px] font-semibold text-void-200">Projects</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <button onClick={create} className={`aspect-[4/3] rounded-2xl border border-dashed border-void-700 hover:border-void-500 flex flex-col items-center justify-center gap-2 text-[13.5px] font-medium ${focusRing}`}>
              <span className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center"><Plus size={20} /></span>New project
            </button>
            {boards?.map(b => <BoardCard key={b.id} board={b} onOpen={() => setOpenId(b.id)} onDelete={async () => { if (confirm(`Delete “${b.title}”? This cannot be undone.`)) { await idb.del('boards', b.id); reload() } }} />)}
          </div>
        </div>
      )}
    </main>
  )
}

function useObjectUrl(blob?: Blob) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return url
}

function BoardCard({ board, onOpen, onDelete }: { board: Board; onOpen: () => void; onDelete: () => void }) {
  const cover = useObjectUrl(board.refs[0]?.blob)
  return (
    <div className="group relative">
      <button onClick={onOpen} className={`block w-full text-left rounded-2xl overflow-hidden bg-void-900 border border-void-800 hover:border-void-600 ${focusRing}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className="block aspect-[4/3] bg-void-950">{cover && <img src={cover} alt="" className="w-full h-full object-cover" />}</span>
        <span className="block px-3 py-2.5"><span className="block text-[13px] font-medium truncate">{board.title}</span><span className="block text-[12px] text-void-500">{board.refs.length} reference{board.refs.length === 1 ? '' : 's'}</span></span>
      </button>
      <button aria-label={`Delete ${board.title}`} onClick={onDelete} className={`absolute top-2 right-2 w-7 h-7 rounded-md bg-black/70 text-void-200 hover:text-white items-center justify-center hidden group-hover:flex focus:flex ${focusRing}`}><Trash2 size={13} /></button>
    </div>
  )
}

function RefTile({ r, selected, onToggle, onRemove, pinned, onPin }: { r: Ref; selected: boolean; onToggle: () => void; onRemove: () => void; pinned: Set<string>; onPin: (hex: string) => void }) {
  const url = useObjectUrl(r.blob)
  return (
    <div className="group relative break-inside-avoid mb-3">
      <button onClick={onToggle} aria-pressed={selected} aria-label={`${selected ? 'Deselect' : 'Select'} ${r.name}`} className={`block w-full rounded-t-xl overflow-hidden border-2 border-b-0 ${selected ? 'border-accent' : 'border-transparent'} ${focusRing}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt={r.name} className="w-full block" />}
      </button>
      {/* HEX tags: click a swatch to pin/unpin it into the board palette */}
      <div className={`flex rounded-b-xl overflow-hidden border-2 border-t-0 ${selected ? 'border-accent' : 'border-transparent'}`}>
        {r.palette.map(c => {
          const on = pinned.has(c.toLowerCase())
          const dark = parseInt(c.slice(1, 3), 16) * 0.3 + parseInt(c.slice(3, 5), 16) * 0.59 + parseInt(c.slice(5, 7), 16) * 0.11 > 140
          return (
            <button key={c} onClick={() => onPin(c)} title={`${on ? 'Unpin' : 'Pin'} ${c}`} aria-pressed={on}
              className={`group/sw relative flex-1 h-7 flex items-center justify-center ${focusRing}`} style={{ background: c }}>
              <span className={`text-[9px] font-mono leading-none opacity-0 group-hover/sw:opacity-100 ${dark ? 'text-black/80' : 'text-white/90'}`}>{c.replace('#', '').toUpperCase()}</span>
              {on && <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-white border border-black/20 flex items-center justify-center"><Check size={7} strokeWidth={4} className="text-black" /></span>}
            </button>
          )
        })}
      </div>
      {selected && <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center pointer-events-none"><Check size={12} strokeWidth={3} /></span>}
      <button aria-label={`Remove ${r.name}`} onClick={onRemove} className={`absolute top-2 right-2 w-7 h-7 rounded-md bg-black/70 text-void-200 hover:text-white items-center justify-center hidden group-hover:flex focus:flex ${focusRing}`}><Trash2 size={13} /></button>
    </div>
  )
}

const FIELD_ROWS: { key: keyof BriefFields; label: string; ph: string }[] = [
  { key: 'headline', label: 'Headline', ph: 'The big line' },
  { key: 'subhead', label: 'Subheading', ph: 'One line of support' },
  { key: 'date', label: 'Date', ph: 'Sat 12 Oct' },
  { key: 'time', label: 'Time', ph: '7pm' },
  { key: 'venue', label: 'Venue', ph: 'Where' },
  { key: 'price', label: 'Price', ph: '₦5,000' },
  { key: 'cta', label: 'Call to action', ph: 'Get tickets' },
  { key: 'contact', label: 'Contact', ph: 'site, @handle, phone' },
]

/** Colours for a brief with no references yet, from its tone words. */
function feelPalette(feel: string[]): string[] {
  const dirs: Record<string, { hue: number; sat: number }> = {
    bold: { hue: 350, sat: 0.8 }, premium: { hue: 265, sat: 0.4 }, luxury: { hue: 45, sat: 0.55 }, playful: { hue: 25, sat: 0.85 },
    minimal: { hue: 210, sat: 0.5 }, calm: { hue: 195, sat: 0.4 }, warm: { hue: 20, sat: 0.6 }, modern: { hue: 240, sat: 0.75 },
    corporate: { hue: 215, sat: 0.6 }, energetic: { hue: 15, sat: 0.9 }, festive: { hue: 140, sat: 0.7 }, natural: { hue: 95, sat: 0.45 }, vibrant: { hue: 320, sat: 0.85 }, afro: { hue: 30, sat: 0.8 },
  }
  const dd = dirs[feel.find(f => dirs[f]) ?? 'modern']
  const toHex = (h: number, s: number, l: number) => { h = ((h % 360) + 360) % 360; const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('') }
  return [toHex(dd.hue, dd.sat, 0.5), toHex(dd.hue + 30, dd.sat, 0.62), toHex(dd.hue + 180, Math.min(0.9, dd.sat + 0.1), 0.55), toHex(dd.hue, 0.1, 0.12), toHex(dd.hue, 0.06, 0.96)]
}

function BoardView({ board: initial, onBack }: { board: Board; onBack: () => void }) {
  const router = useRouter()
  const [board, setBoard] = useState(initial)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [over, setOver] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const togglePin = (hex: string) => setPinned(p => { const n = new Set(p); const k = hex.toLowerCase(); n.has(k) ? n.delete(k) : n.add(k); return n })
  const file = useRef<HTMLInputElement>(null)
  const firstSave = useRef(true)

  useEffect(() => {
    if (firstSave.current) { firstSave.current = false; return }
    const t = setTimeout(() => idb.put('boards', { ...board, updatedAt: Date.now() }), 500)
    return () => clearTimeout(t)
  }, [board])

  const addFiles = useCallback(async (files: File[]) => {
    const refs: Ref[] = []
    for (const f of files.filter(x => x.type.startsWith('image/'))) {
      try { const c = await blobToCanvas(f, 512); refs.push({ id: uid(), name: f.name || 'Reference', blob: f, palette: extractPalette(c, 5), w: c.width, h: c.height }) } catch { /* skip unreadable files */ }
    }
    if (refs.length) setBoard(b => ({ ...b, refs: [...b.refs, ...refs] }))
  }, [])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => { const t = e.target as HTMLElement | null; if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return; const f = Array.from(e.clipboardData?.files ?? []); if (f.length) addFiles(f) }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  // The brief, read as you type. Anything you correct by hand is kept.
  const read = useMemo(() => readBrief(board.brief, board.title), [board.brief, board.title])
  const fields: BriefFields = useMemo(() => {
    const out = { ...read }
    for (const k of board.edited ?? []) (out as any)[k] = (board.fields as any)?.[k] ?? (out as any)[k]
    return out
  }, [read, board.fields, board.edited])
  const setField = (k: keyof BriefFields, v: any) => setBoard(b => ({ ...b, fields: { ...(b.fields ?? {}), [k]: v }, edited: Array.from(new Set([...(b.edited ?? []), k])) }))
  const resetField = (k: keyof BriefFields) => setBoard(b => ({ ...b, edited: (b.edited ?? []).filter(x => x !== k) }))

  // Board palette: pinned colours first, then colours weighted by how often they appear across references.
  const refPalette = useMemo(() => {
    const far = (a: string, b: string) => [1, 3, 5].reduce((n, i) => n + Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)), 0) > 60
    const out: string[] = Array.from(pinned).map(h => board.refs.flatMap(r => r.palette).find(c => c.toLowerCase() === h) ?? h)
    const votes: { c: string; w: number }[] = []
    for (const r of board.refs) r.palette.forEach((c, i) => { const hit = votes.find(v => !far(v.c, c)); if (hit) hit.w += 5 - i; else votes.push({ c, w: 5 - i }) })
    for (const v of votes.sort((a, b) => b.w - a.w)) if (out.every(o => far(o, v.c))) out.push(v.c)
    return out.slice(0, 8)
  }, [board.refs, pinned])
  const feelKey = fields.feel.join(',')
  const palette = useMemo(() => (refPalette.length ? refPalette : feelPalette(feelKey ? feelKey.split(',') : [])), [refPalette, feelKey])
  const roles = useMemo(() => paletteRoles(palette, feelKey ? feelKey.split(',') : [], board.dark ?? undefined), [palette, feelKey, board.dark])
  const pair = FONT_PAIRS.find(p => p.id === board.pairId) ?? pickPair(fields.feel)

  const preset = SIZE_PRESETS.find(p => p.id === board.presetId) ?? SIZE_PRESETS[0]
  const chosen = useMemo(() => board.refs.filter(r => selected.has(r.id)), [board.refs, selected])
  const hero = chosen[0] ?? null
  const size = useMemo(() => ({ width: preset.width, height: preset.height }), [preset.width, preset.height])

  const input = useCallback((): DraftInput => ({
    fields, roles, pair, size, palette, brief: board.brief, title: /^untitled/i.test(board.title.trim()) && fields.headline ? fields.headline : board.title,
    hero: hero ? { blob: hero.blob, width: hero.w ?? 1000, height: hero.h ?? 1000 } : null,
    refs: (chosen.length ? chosen : board.refs).map(r => ({ blob: r.blob, width: r.w ?? 1000, height: r.h ?? 1000 })),
  }), [fields, roles, pair, size, palette, board.brief, board.title, hero, chosen, board.refs])

  // Live previews of the three drafts.
  const [previews, setPreviews] = useState<string[]>([])
  const [pages, setPages] = useState<LayeredPage[]>([])
  useEffect(() => {
    let live = true
    const t = setTimeout(async () => {
      await Promise.all([ensureFont(pair.display, pair.displayWeight), ensureFont(pair.body, pair.bodyWeight), ensureFont(pair.body, 700)])
      const ps = await buildDrafts(input())
      const urls = await Promise.all(ps.map(async pg => (await renderPage(pg, size, 420)).toDataURL('image/jpeg', 0.85)))
      if (live) { setPages(ps); setPreviews(urls) }
    }, 350)
    return () => { live = false; clearTimeout(t) }
  }, [input, pair, size])

  const docName = /^untitled/i.test(board.title.trim()) && fields.headline ? fields.headline : board.title
  const briefPayload = () => ({ title: docName, text: board.brief, items: briefItems(fields), palette: [{ label: 'Background', hex: roles.bg }, { label: 'Text', hex: roles.text }, { label: 'Accent', hex: roles.accent }, { label: 'Muted', hex: roles.muted }] })

  const openDrafts = async (only?: number) => {
    setBusy('Building your drafts')
    try {
      const ps = pages.length ? pages : await buildDrafts(input())
      const pick = only === undefined ? ps : [ps[only]]
      const id = await sendHandoff({ from: 'studio', boards: true, name: docName, size, palette: [roles.bg, roles.text, roles.accent, roles.muted, ...palette], images: [], layered: pick, brief: briefPayload() })
      router.push(`/editor?inbox=${id}`)
    } finally { setBusy(null) }
  }

  const startBlank = async () => {
    const id = await sendHandoff({
      from: 'studio', name: docName, size, palette: [roles.bg, roles.text, roles.accent, ...palette],
      images: chosen.map(r => ({ name: r.name, blob: r.blob })), brief: briefPayload(),
    })
    router.push(`/editor?inbox=${id}`)
  }

  const downloadMoodboard = async () => {
    setBusy('Making the moodboard')
    try {
      await Promise.all([ensureFont(pair.display, pair.displayWeight), ensureFont(pair.body, 400), ensureFont(pair.body, 700)])
      const pg = await buildMoodboard(input())
      const c = await renderPage(pg, { width: 1920, height: 1080 }, 1920)
      const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/png'))
      if (blob) downloadBlob(blob, `${(docName || 'moodboard').replace(/[^\w\- ]+/g, '')} moodboard.png`)
    } finally { setBusy(null) }
  }

  const readCount = FIELD_ROWS.filter(r => fields[r.key]).length + fields.must.length
  const Grade = ({ r, big }: { r: number; big?: boolean }) => <span className={`text-[10.5px] font-medium ${r >= (big ? 3 : 4.5) ? 'text-emerald-400' : 'text-amber-300'}`}>{r.toFixed(1)}:1 {grade(r)}</span>

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      <aside className="lg:w-[360px] shrink-0 border-b lg:border-b-0 lg:border-r border-void-800/60 p-5 space-y-5 lg:overflow-y-auto">
        <button onClick={onBack} className={`flex items-center gap-1.5 text-[12.5px] text-void-400 hover:text-white rounded ${focusRing}`}><ArrowLeft size={14} />All projects</button>
        <input aria-label="Project name" value={board.title} onChange={e => setBoard({ ...board, title: e.target.value })} className={`w-full bg-transparent text-[20px] font-semibold tracking-tight rounded ${focusRing}`} />

        <section>
          <label htmlFor="brief" className="block text-[12px] font-semibold text-void-200 mb-1.5">1. The brief</label>
          <textarea id="brief" value={board.brief} onChange={e => setBoard({ ...board, brief: e.target.value })} rows={6} placeholder={'Paste the client\'s words. For example:\nAfrobeats night for young professionals in Lekki. Bold and warm. Sat 12 Oct, 8pm at The Hub. Tickets ₦10,000. Must include sponsor logos. Get tickets at tix.ng'}
            className={`w-full px-3 py-2.5 rounded-xl bg-void-900 border border-void-800 text-[13px] leading-relaxed placeholder:text-void-600 resize-y ${focusRing}`} />
        </section>

        {board.brief.trim().length > 8 && (
          <section>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[12px] font-semibold text-void-200">2. What goes on it <span className="font-normal text-void-500">({readCount} found)</span></span>
              <span className="text-[11px] text-void-500">Fix anything it got wrong</span>
            </div>
            <div className="rounded-xl bg-void-900/70 border border-void-800 p-2.5 space-y-1.5">
              {FIELD_ROWS.map(r => (
                <label key={r.key} className="grid grid-cols-[88px_1fr_auto] items-center gap-2">
                  <span className="text-[11.5px] text-void-500">{r.label}</span>
                  <input value={fields[r.key] as string} placeholder={r.ph} onChange={e => setField(r.key, e.target.value)}
                    className={`h-7 min-w-0 px-2 rounded-md bg-void-950 border border-void-800 text-[12.5px] placeholder:text-void-700 ${focusRing}`} />
                  {board.edited?.includes(r.key) ? <button title="Use what the brief says" aria-label={`Reset ${r.label}`} onClick={() => resetField(r.key)} className={`w-5 text-void-500 hover:text-white rounded ${focusRing}`}>↺</button> : <span className="w-5" />}
                </label>
              ))}
              <label className="block pt-1">
                <span className="text-[11.5px] text-void-500">Must include (one per line)</span>
                <textarea value={fields.must.join('\n')} onChange={e => setField('must', e.target.value.split('\n').map(x => x.trim()).filter(Boolean))} rows={Math.max(2, fields.must.length + 1)}
                  className={`mt-1 w-full px-2 py-1.5 rounded-md bg-void-950 border border-void-800 text-[12.5px] leading-snug resize-y ${focusRing}`} />
              </label>
              <p className="text-[11.5px] text-void-400 pt-0.5">{fields.audience ? <>For <span className="text-void-200">{fields.audience}</span>. </> : null}{fields.feel.length ? <>Feel: <span className="text-void-200">{fields.feel.join(', ')}</span>.</> : 'No tone words found. Add a few (bold, warm, premium, playful) and the colours and type follow.'}</p>
            </div>
          </section>
        )}

        <label className="block">
          <span className="block text-[12px] font-semibold text-void-200 mb-1.5">3. What you are making</span>
          <select value={board.presetId} onChange={e => setBoard({ ...board, presetId: e.target.value })} className={`w-full h-9 px-2.5 rounded-lg bg-void-900 border border-void-800 text-[13px] ${focusRing}`}>
            {SIZE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label} ({p.width} × {p.height})</option>)}
          </select>
        </label>

        <section>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[12px] font-semibold text-void-200">4. Colours</span>
            <span className="flex gap-0.5 text-[11.5px]">
              {([['Auto', null], ['Light', false], ['Dark', true]] as [string, boolean | null][]).map(([l, v]) => (
                <button key={l} onClick={() => setBoard({ ...board, dark: v })} aria-pressed={(board.dark ?? null) === v} className={`px-2 h-6 rounded-md ${focusRing} ${(board.dark ?? null) === v ? 'bg-void-700 text-white' : 'text-void-400 hover:text-white'}`}>{l}</button>
              ))}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {([['Background', roles.bg, null], ['Text', roles.text, roles.ratios.text], ['Accent', roles.accent, roles.ratios.accent]] as [string, string, number | null][]).map(([l, c, r]) => (
              <button key={l} onClick={() => { navigator.clipboard?.writeText(c); setCopied(c); setTimeout(() => setCopied(null), 1200) }} title={`Copy ${c}`}
                className={`text-left rounded-lg border border-void-800 overflow-hidden ${focusRing}`}>
                <span className="block h-9" style={{ background: c }} />
                <span className="block px-1.5 py-1 bg-void-900"><span className="block text-[10.5px] text-void-400">{l}</span><span className="block text-[11px] font-mono text-void-200">{copied === c ? 'Copied' : c.toUpperCase()}</span>{r !== null && <Grade r={r} big={l === 'Accent'} />}</span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11.5px] text-void-500 leading-snug">{refPalette.length ? 'From your references. Click a colour strip under a reference to pin it.' : 'From the tone of the brief until you add references.'} Text and accent are checked for contrast on the background.</p>
        </section>

        <label className="block">
          <span className="block text-[12px] font-semibold text-void-200 mb-1.5">5. Type</span>
          <select value={pair.id} onChange={e => setBoard({ ...board, pairId: e.target.value })} className={`w-full h-9 px-2.5 rounded-lg bg-void-900 border border-void-800 text-[13px] ${focusRing}`}>
            {FONT_PAIRS.map(p => <option key={p.id} value={p.id}>{p.label}: {p.display} + {p.body}{!board.pairId && p.id === pickPair(fields.feel).id ? ' (suggested)' : ''}</option>)}
          </select>
        </label>

        <div className="pt-1 space-y-2">
          <Button primary onClick={() => openDrafts()} disabled={!!busy} className="w-full !h-10"><Layers size={16} />{busy ?? 'Open all three drafts in the Editor'}</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={startBlank} className="!h-9 !text-[12.5px]">Blank canvas</Button>
            <Button onClick={downloadMoodboard} disabled={!!busy} className="!h-9 !text-[12.5px]"><Download size={14} />Moodboard</Button>
          </div>
          <p className="text-[11.5px] text-void-500 leading-relaxed">Every piece of text, shape and photo in a draft is its own layer. The brief goes with it as a checklist that ticks off as you design. Moodboard is a PNG to send the client for sign-off before you start.</p>
        </div>
      </aside>

      <section className="flex-1 min-w-0 p-5 lg:overflow-y-auto space-y-8"
        onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); addFiles(Array.from(e.dataTransfer.files)) }}>
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-void-200">First drafts <span className="text-void-500 font-normal">{preset.label}, {preset.width} × {preset.height}</span></h2>
            <span className="text-[11.5px] text-void-500 hidden sm:inline">{hero ? `Using “${hero.name}” as the photo in Draft B` : 'Select a reference below to use it as the photo in Draft B'}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="group">
                <button onClick={() => openDrafts(i)} disabled={!previews[i] || !!busy} aria-label={`Open ${pages[i]?.name ?? 'draft'} in the Editor`}
                  className={`relative block w-full rounded-xl overflow-hidden bg-void-900 border border-void-800 hover:border-void-500 ${focusRing}`} style={{ aspectRatio: `${preset.width} / ${preset.height}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {previews[i] ? <img src={previews[i]} alt="" className="w-full h-full object-contain" /> : <span className="absolute inset-0 animate-pulse bg-void-800/40" />}
                  <span className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity"><span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full bg-white text-void-950 text-[12px] font-medium">Open this one</span></span>
                </button>
                <p className="mt-1.5 text-[12px] text-void-400">{pages[i]?.name ?? ' '}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={e => addFiles(Array.from(e.target.files ?? []))} />
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold text-void-200">References <span className="text-void-500 font-normal">({board.refs.length})</span></h2>
            <Button onClick={() => file.current?.click()}><ImagePlus size={15} />Add images</Button>
          </div>
          {board.refs.length === 0 ? (
            <button onClick={() => file.current?.click()} className={`w-full rounded-2xl border border-dashed py-16 px-6 text-center ${over ? 'border-accent bg-accent/10' : 'border-void-700 hover:border-void-500'} ${focusRing}`}>
              <span className="block text-[15px] font-medium">Drop your references here</span>
              <span className="block mt-1 text-[13px] text-void-400">Screenshots, photos, past work. Paste with Ctrl+V. Their colours become the palette.</span>
            </button>
          ) : (
            <div className={`columns-2 md:columns-3 xl:columns-4 gap-3 rounded-2xl ${over ? 'outline outline-2 outline-accent' : ''}`}>
              {board.refs.map(r => (
                <RefTile key={r.id} r={r} selected={selected.has(r.id)} pinned={pinned} onPin={togglePin}
                  onToggle={() => setSelected(s => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n })}
                  onRemove={() => { setBoard(b => ({ ...b, refs: b.refs.filter(x => x.id !== r.id) })); setSelected(s => { const n = new Set(s); n.delete(r.id); return n }) }} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
