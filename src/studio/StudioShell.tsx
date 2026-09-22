'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Check, ImagePlus, Layers, Palette, Plus, Sparkles, Trash2, Type } from 'lucide-react'
import { BrandGuideline } from './BrandGuideline'
import { AppNav, Logo } from '@/components/AppNav'
import { Button, focusRing } from '@/editor/components/ui'
import { blobToCanvas, idb, sendHandoff } from '@/editor/io'
import { extractPalette, uid } from '@/editor/engine'
import { SIZE_PRESETS } from '@/editor/presets'

// Studio is the front half of the design process: read the brief, gather references,
// pull a palette, then hand all of it to the Editor as a ready-to-work design.
// Boards live in the same local database as Editor designs. When Art Director Studio's
// accounts, community and Artie are ported in, this data model is what they attach to.

interface Ref { id: string; name: string; blob: Blob; palette: string[] }
interface Read { audience: string; feel: string[]; must: string[]; direction: string; palette: string[]; type: string }
interface Board { id: string; title: string; brief: string; presetId: string; refs: Ref[]; read?: Read; updatedAt: number }

export function StudioShell() {
  const [boards, setBoards] = useState<Board[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [mode, setMode] = useState<'boards' | 'brand'>('boards')
  const reload = useCallback(() => idb.all<Board>('boards').then(b => setBoards(b.sort((a, c) => c.updatedAt - a.updatedAt))).catch(() => setBoards([])), [])
  useEffect(() => { reload() }, [reload])
  const board = boards?.find(b => b.id === openId) ?? null

  const create = async () => {
    const b: Board = { id: uid(), title: 'Untitled project', brief: '', presetId: 'ig-post', refs: [], updatedAt: Date.now() }
    await idb.put('boards', b); await reload(); setOpenId(b.id)
  }

  return (
    <main className="min-h-[100dvh] flex flex-col bg-void-950 text-void-100">
      <header className="h-12 shrink-0 flex items-center gap-3 px-3 border-b border-void-800/60"><Logo /><AppNav /></header>
      {mode === 'brand' ? <BrandGuideline onBack={() => setMode('boards')} /> : board ? <BoardView key={board.id} board={board} onBack={() => { setOpenId(null); reload() }} /> : (
        <div className="max-w-5xl w-full mx-auto px-5 sm:px-8 py-8 sm:py-12">
          <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-tight">Start with the brief</h1>
          <p className="mt-1.5 text-[14px] text-void-400 max-w-xl">Write down what the job is, collect the references that feel right, and Studio pulls the colours out for you. When you are ready, it all opens in the Editor.</p>
          <div className="mt-6 grid sm:grid-cols-2 gap-3 max-w-2xl">
            <button onClick={() => setMode('brand')} className={`flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-br from-[#8b7cff]/20 to-void-900 border border-accent/30 hover:border-accent/60 text-left ${focusRing}`}>
              <span className="w-11 h-11 rounded-xl bg-accent text-white flex items-center justify-center shrink-0"><BookOpen size={20} /></span>
              <span><span className="block text-[14px] font-semibold">Brand guideline builder</span><span className="block text-[12.5px] text-void-400">A full, unique brand system with mockups. Export to PDF.</span></span>
            </button>
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-void-900 border border-void-800 text-void-400 text-[12.5px]"><Sparkles size={18} className="text-accent-light shrink-0" />Reference boards read your brief and pull a palette, then open in the Editor.</div>
          </div>
          <h2 className="mt-9 mb-3 text-[13px] font-semibold text-void-200">Reference boards</h2>
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

function BoardView({ board: initial, onBack }: { board: Board; onBack: () => void }) {
  const router = useRouter()
  const [board, setBoard] = useState(initial)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [over, setOver] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const togglePin = (hex: string) => setPinned(p => { const n = new Set(p); const k = hex.toLowerCase(); n.has(k) ? n.delete(k) : n.add(k); return n })
  const file = useRef<HTMLInputElement>(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    const t = setTimeout(() => idb.put('boards', { ...board, updatedAt: Date.now() }), 500)
    return () => clearTimeout(t)
  }, [board])

  const addFiles = useCallback(async (files: File[]) => {
    const refs: Ref[] = []
    for (const f of files.filter(x => x.type.startsWith('image/'))) {
      try { const c = await blobToCanvas(f, 512); refs.push({ id: uid(), name: f.name || 'Reference', blob: f, palette: extractPalette(c, 5) }) } catch { /* skip unreadable files */ }
    }
    if (refs.length) setBoard(b => ({ ...b, refs: [...b.refs, ...refs] }))
  }, [])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => { const f = Array.from(e.clipboardData?.files ?? []); if (f.length) addFiles(f) }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  // Board palette: the most common distinct colours across every reference.
  const palette = useMemo(() => {
    const far = (a: string, b: string) => [1, 3, 5].reduce((n, i) => n + Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)), 0) > 60
    // Pinned colours come first, then the most common distinct colours across references.
    const out: string[] = Array.from(pinned).map(h => board.refs.flatMap(r => r.palette).find(c => c.toLowerCase() === h) ?? h)
    for (let i = 0; i < 5; i++) for (const r of board.refs) { const c = r.palette[i]; if (c && out.every(o => far(o, c))) out.push(c) }
    return out.slice(0, 8)
  }, [board.refs, pinned])

  const preset = SIZE_PRESETS.find(p => p.id === board.presetId) ?? SIZE_PRESETS[0]
  const chosen = board.refs.filter(r => selected.has(r.id))

  const startFromRead = async (bd: Board) => {
    const id = await sendHandoff({ from: 'studio', name: bd.title, size: { width: preset.width, height: preset.height }, palette: bd.read!.palette, note: `Direction: ${bd.read!.direction}\nType: ${bd.read!.type}\nMust include: ${bd.read!.must.join('; ')}`, images: chosen.map(r => ({ name: r.name, blob: r.blob })) })
    router.push(`/editor?inbox=${id}`)
  }

  const startDesign = async () => {
    const id = await sendHandoff({
      from: 'studio', name: board.title, size: { width: preset.width, height: preset.height }, palette, note: board.read ? `${board.brief}\n\nMust include: ${board.read.must.join('; ')}` : board.brief,
      images: chosen.map(r => ({ name: r.name, blob: r.blob })),
    })
    router.push(`/editor?inbox=${id}`)
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      <aside className="lg:w-[340px] shrink-0 border-b lg:border-b-0 lg:border-r border-void-800/60 p-5 space-y-5 lg:overflow-y-auto">
        <button onClick={onBack} className={`flex items-center gap-1.5 text-[12.5px] text-void-400 hover:text-white rounded ${focusRing}`}><ArrowLeft size={14} />All projects</button>
        <input aria-label="Project name" value={board.title} onChange={e => setBoard({ ...board, title: e.target.value })} className={`w-full bg-transparent text-[20px] font-semibold tracking-tight rounded ${focusRing}`} />
        <label className="block">
          <span className="block text-[12px] font-semibold text-void-200 mb-1.5">The brief</span>
          <textarea value={board.brief} onChange={e => setBoard({ ...board, brief: e.target.value, read: undefined })} rows={7} placeholder="Who is it for? What should they feel or do? What must be on it? Paste the client's words here."
            className={`w-full px-3 py-2.5 rounded-xl bg-void-900 border border-void-800 text-[13px] leading-relaxed placeholder:text-void-600 resize-y ${focusRing}`} />
          {board.brief.trim().length > 30 && !board.read && (
            <button onClick={() => setBoard({ ...board, read: readBrief(board.brief) })} className={`mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-accent-light hover:text-white rounded ${focusRing}`}><Sparkles size={14} />Pull out the key points</button>
          )}
          {board.read && (
            <div className="mt-2.5 rounded-xl bg-void-900/70 border border-void-800 p-3 space-y-2 text-[12.5px]">
              <p><span className="text-void-500">Audience:</span> {board.read.audience}</p>
              <p><span className="text-void-500">Feel:</span> {board.read.feel.join(', ') || 'not stated'}</p>
              <div><span className="text-void-500">Must include:</span>{board.read.must.length ? <ul className="mt-1 space-y-0.5">{board.read.must.map((m, i) => <li key={i} className="flex gap-1.5"><Check size={13} className="mt-0.5 shrink-0 text-accent" />{m}</li>)}</ul> : ' nothing pinned down yet'}</div>
              <div className="pt-1"><span className="text-void-500">Colour direction:</span> {board.read.direction}
                <div className="flex gap-1 mt-1.5">{board.read.palette.map(c => <span key={c} className="h-6 flex-1 rounded" style={{ background: c }} />)}</div>
              </div>
              <p><span className="text-void-500">Type:</span> {board.read.type}</p>
              <button onClick={() => startFromRead(board)} className={`mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent hover:text-white rounded ${focusRing}`}><Sparkles size={14} />Open a design with this direction</button>
              <p className="text-[11px] text-void-500 pt-1">Read from your words. When accounts are on, Artie writes this and shows options.</p>
            </div>
          )}
        </label>
        <label className="block">
          <span className="block text-[12px] font-semibold text-void-200 mb-1.5">What you are making</span>
          <select value={board.presetId} onChange={e => setBoard({ ...board, presetId: e.target.value })} className={`w-full h-9 px-2.5 rounded-lg bg-void-900 border border-void-800 text-[13px] ${focusRing}`}>
            {SIZE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label} ({p.width} × {p.height})</option>)}
          </select>
        </label>
        <div>
          <span className="block text-[12px] font-semibold text-void-200 mb-1.5">Palette from your references</span>
          {palette.length ? (
            <div className="flex flex-wrap gap-1.5">
              {palette.map(c => (
                <button key={c} title={`Copy ${c}`} aria-label={`Copy ${c}`} onClick={() => { navigator.clipboard?.writeText(c); setCopied(c); setTimeout(() => setCopied(null), 1200) }}
                  className={`h-9 min-w-9 px-1 rounded-lg border border-white/10 text-[10px] font-mono ${focusRing}`} style={{ background: c, color: parseInt(c.slice(1, 3), 16) * 0.3 + parseInt(c.slice(3, 5), 16) * 0.59 + parseInt(c.slice(5, 7), 16) * 0.11 > 140 ? '#000' : '#fff' }}>
                  {copied === c ? 'Copied' : ''}
                </button>
              ))}
            </div>
          ) : <p className="text-[12.5px] text-void-500">Add references and the colours they share show up here.</p>}
        </div>
        <div className="pt-1">
          <Button primary onClick={startDesign} className="w-full !h-10"><Layers size={16} />Start design in Editor</Button>
          <p className="mt-2 text-[12px] text-void-500 leading-relaxed">
            Opens at {preset.width} × {preset.height} ({preset.label}) with this palette loaded{chosen.length ? ` and ${chosen.length} selected reference${chosen.length === 1 ? '' : 's'} as layers` : '. Select references to bring them along as layers'}.
          </p>
        </div>
      </aside>

      <section className="flex-1 min-w-0 p-5 lg:overflow-y-auto"
        onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); addFiles(Array.from(e.dataTransfer.files)) }}>
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={e => addFiles(Array.from(e.target.files ?? []))} />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13px] font-semibold text-void-200">References <span className="text-void-500 font-normal">({board.refs.length})</span></h2>
          <Button onClick={() => file.current?.click()}><ImagePlus size={15} />Add images</Button>
        </div>
        {board.refs.length === 0 ? (
          <button onClick={() => file.current?.click()} className={`w-full rounded-2xl border border-dashed py-20 px-6 text-center ${over ? 'border-accent bg-accent/10' : 'border-void-700 hover:border-void-500'} ${focusRing}`}>
            <span className="block text-[15px] font-medium">Drop your references here</span>
            <span className="block mt-1 text-[13px] text-void-400">Screenshots, photos, past work. You can also paste with Ctrl+V.</span>
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
      </section>
    </div>
  )
}

// Local stand-in for the Art Director Studio process-brief function. Same output shape
// (audience, tonal keywords, must-haves) so this swaps for the real Artie call once accounts are wired.
function readBrief(text: string): Read {
  const t = text.toLowerCase()
  const audMatch = text.match(/\b(?:for|aimed at|targeting|audience[:\s])\s+([a-z0-9 ,'-]{4,60})/i)
  const feelWords = ['bold', 'playful', 'premium', 'luxury', 'minimal', 'clean', 'warm', 'friendly', 'modern', 'retro', 'vintage', 'fun', 'serious', 'calm', 'energetic', 'elegant', 'edgy', 'corporate', 'youthful', 'trustworthy', 'bright', 'dark', 'soft']
  const feel = feelWords.filter(w => t.includes(w))
  const must: string[] = []
  for (const line of text.split(/[\n.;]+/)) {
    const l = line.trim()
    if (/\b(must|need|should|include|feature|logo|headline|tagline|cta|call to action|price|date|contact|address|phone|website|url|@)\b/i.test(l) && l.length > 6 && l.length < 120) must.push(l.replace(/^[-*\s]+/, ''))
  }
  // Map the strongest tonal word to a colour direction and a type feel. Local now, Artie later.
  const dirs: Record<string, { d: string; hue: number; sat: number }> = {
    bold: { d: 'high-contrast, saturated', hue: 350, sat: 0.8 }, premium: { d: 'deep, restrained, one metallic accent', hue: 265, sat: 0.4 },
    luxury: { d: 'near-black with gold or deep jewel tones', hue: 45, sat: 0.55 }, playful: { d: 'bright, warm, two or three lively hues', hue: 25, sat: 0.85 },
    minimal: { d: 'mostly neutral with a single accent', hue: 210, sat: 0.5 }, calm: { d: 'soft, low-saturation, cool', hue: 195, sat: 0.4 },
    warm: { d: 'earthy, sunlit, terracotta and cream', hue: 20, sat: 0.6 }, modern: { d: 'clean cool neutrals, one electric accent', hue: 240, sat: 0.75 },
    corporate: { d: 'trustworthy blues with a clear accent', hue: 215, sat: 0.6 }, energetic: { d: 'vivid, punchy, high-chroma', hue: 15, sat: 0.9 },
  }
  const key = feel.find(f => dirs[f]) ?? 'modern'
  const dd = dirs[key]
  const toHex = (h: number, s: number, l: number) => { const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(((h/60)%2)-1)),m=l-c/2; const [r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x]; return '#'+[r,g,b].map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('') }
  const palette = [toHex(dd.hue,dd.sat,0.45), toHex(dd.hue+30,dd.sat,0.6), toHex(dd.hue+180,Math.min(0.9,dd.sat+0.1),0.55), toHex(dd.hue,0.08,0.15), toHex(dd.hue,0.05,0.96)]
  const typeFeel = feel.includes('premium')||feel.includes('luxury')||feel.includes('elegant') ? 'A refined serif for headings over a clean sans' : feel.includes('playful')||feel.includes('fun')||feel.includes('youthful') ? 'A bold rounded display over a friendly sans' : feel.includes('bold') ? 'A heavy condensed display over a neutral sans' : 'A confident geometric sans throughout'
  return { audience: audMatch ? audMatch[1].trim() : 'not stated', feel, must: must.slice(0, 6), direction: dd.d, palette, type: typeFeel }
}
