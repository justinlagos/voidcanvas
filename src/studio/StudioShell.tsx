'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, ImagePlus, Layers, Plus, Trash2 } from 'lucide-react'
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
interface Board { id: string; title: string; brief: string; presetId: string; refs: Ref[]; updatedAt: number }

export function StudioShell() {
  const [boards, setBoards] = useState<Board[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
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
      {board ? <BoardView key={board.id} board={board} onBack={() => { setOpenId(null); reload() }} /> : (
        <div className="max-w-5xl w-full mx-auto px-5 sm:px-8 py-8 sm:py-12">
          <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-tight">Start with the brief</h1>
          <p className="mt-1.5 text-[14px] text-void-400 max-w-xl">Write down what the job is, collect the references that feel right, and Studio pulls the colours out for you. When you are ready, it all opens in the Editor.</p>
          <div className="mt-7 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <button onClick={create} className={`aspect-[4/3] rounded-2xl border border-dashed border-void-700 hover:border-void-500 flex flex-col items-center justify-center gap-2 text-[13.5px] font-medium ${focusRing}`}>
              <span className="w-10 h-10 rounded-xl bg-[#8b7cff] text-white flex items-center justify-center"><Plus size={20} /></span>New project
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

function RefTile({ r, selected, onToggle, onRemove }: { r: Ref; selected: boolean; onToggle: () => void; onRemove: () => void }) {
  const url = useObjectUrl(r.blob)
  return (
    <div className="group relative break-inside-avoid mb-3">
      <button onClick={onToggle} aria-pressed={selected} aria-label={`${selected ? 'Deselect' : 'Select'} ${r.name}`} className={`block w-full rounded-xl overflow-hidden border-2 ${selected ? 'border-[#8b7cff]' : 'border-transparent'} ${focusRing}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt={r.name} className="w-full block" />}
        <span className="flex h-1.5">{r.palette.map(c => <span key={c} className="flex-1" style={{ background: c }} />)}</span>
      </button>
      {selected && <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-[#8b7cff] text-white flex items-center justify-center pointer-events-none"><Check size={12} strokeWidth={3} /></span>}
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
    const out: string[] = []
    const far = (a: string, b: string) => [1, 3, 5].reduce((n, i) => n + Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)), 0) > 60
    for (let i = 0; i < 5; i++) for (const r of board.refs) { const c = r.palette[i]; if (c && out.every(o => far(o, c))) out.push(c) }
    return out.slice(0, 8)
  }, [board.refs])

  const preset = SIZE_PRESETS.find(p => p.id === board.presetId) ?? SIZE_PRESETS[0]
  const chosen = board.refs.filter(r => selected.has(r.id))

  const startDesign = async () => {
    const id = await sendHandoff({
      from: 'studio', name: board.title, size: { width: preset.width, height: preset.height }, palette, note: board.brief,
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
          <textarea value={board.brief} onChange={e => setBoard({ ...board, brief: e.target.value })} rows={7} placeholder="Who is it for? What should they feel or do? What must be on it? Paste the client's words here."
            className={`w-full px-3 py-2.5 rounded-xl bg-void-900 border border-void-800 text-[13px] leading-relaxed placeholder:text-void-600 resize-y ${focusRing}`} />
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
          <button onClick={() => file.current?.click()} className={`w-full rounded-2xl border border-dashed py-20 px-6 text-center ${over ? 'border-[#8b7cff] bg-[#8b7cff]/10' : 'border-void-700 hover:border-void-500'} ${focusRing}`}>
            <span className="block text-[15px] font-medium">Drop your references here</span>
            <span className="block mt-1 text-[13px] text-void-400">Screenshots, photos, past work. You can also paste with Ctrl+V.</span>
          </button>
        ) : (
          <div className={`columns-2 md:columns-3 xl:columns-4 gap-3 rounded-2xl ${over ? 'outline outline-2 outline-[#8b7cff]' : ''}`}>
            {board.refs.map(r => (
              <RefTile key={r.id} r={r} selected={selected.has(r.id)}
                onToggle={() => setSelected(s => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n })}
                onRemove={() => { setBoard(b => ({ ...b, refs: b.refs.filter(x => x.id !== r.id) })); setSelected(s => { const n = new Set(s); n.delete(r.id); return n }) }} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
