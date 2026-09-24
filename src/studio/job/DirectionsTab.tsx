'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Download, FileText, Frame as FrameIcon, Maximize2, Palette, Play, StickyNote, Trash2, Type } from 'lucide-react'
import { FONTS, downloadBlob, ensureFont, sendHandoff, zipFiles } from '@/editor/io'
import { uid } from '@/editor/engine'
import { renderPage } from '../drafts'
import { directionFonts, directionPalette, directionSheet, inside } from '../sheets'
import { screenPdf } from '../pdf'
import { slug, type BoardItem, type Direction, type Job } from '../jobs'
import { Btn, INPUT, Label, focusRing, isLight, useObjectUrl } from '../ui'
import type { TabProps } from './JobView'

type View = { x: number; y: number; k: number }
type Drag =
  | { kind: 'pan'; sx: number; sy: number; v: View }
  | { kind: 'item'; ids: string[]; sx: number; sy: number; start: Record<string, { x: number; y: number }> }
  | { kind: 'resize'; id: string; sx: number; sy: number; w: number; h: number; dir?: boolean }
  | { kind: 'dir'; id: string; sx: number; sy: number; x: number; y: number; items: Record<string, { x: number; y: number }> }

const LETTER = (i: number) => String.fromCharCode(65 + i)
type NewItem = BoardItem extends infer T ? (T extends BoardItem ? Omit<T, 'id' | 'x' | 'y'> : never) : never

export function DirectionsTab({ job, update, toast }: TabProps) {
  const router = useRouter()
  const wrap = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ x: 40, y: 40, k: 0.6 })
  const [sel, setSel] = useState<string[]>([])
  const [selDir, setSelDir] = useState<string | null>(job.directions[0]?.id ?? null)
  const [editing, setEditing] = useState<string | null>(null)
  const [present, setPresent] = useState<number | null>(null)
  const drag = useRef<Drag | null>(null)

  const toBoard = (cx: number, cy: number) => { const r = wrap.current!.getBoundingClientRect(); return { x: (cx - r.left - view.x) / view.k, y: (cy - r.top - view.y) / view.k } }
  const centre = () => { const r = wrap.current!.getBoundingClientRect(); return toBoard(r.left + r.width / 2, r.top + r.height / 2) }
  const setItems = (fn: (b: BoardItem[]) => BoardItem[]) => update(j => ({ board: fn(j.board) }))
  const setDirs = (fn: (d: Direction[]) => Direction[]) => update(j => ({ directions: fn(j.directions) }))

  // First visit: lay the references out and make three empty directions to sort them into.
  useEffect(() => {
    if (job.board.length || job.directions.length || !job.refs.length) return
    const dirs: Direction[] = [0, 1, 2].map(i => ({ id: uid(), name: `Direction ${LETTER(i)}`, idea: '', keywords: [], x: i * 1400, y: 0, w: 1300, h: 1000 }))
    const items: BoardItem[] = job.refs.map((r, i) => { const w = 300, h = Math.round(300 * (r.h / Math.max(1, r.w))); return { id: uid(), kind: 'ref', refId: r.id, x: (i % 8) * 340, y: 1150 + Math.floor(i / 8) * 420, w, h } })
    update({ board: items, directions: dirs })
    setSelDir(dirs[0].id)
    setTimeout(() => fitRef.current(), 80)
  }, [job.board.length, job.directions.length, job.refs, update])

  const fit = useCallback(() => {
    const el = wrap.current; if (!el) return
    const all = [...job.board, ...job.directions]
    if (!all.length) return
    const x0 = Math.min(...all.map(i => i.x)), y0 = Math.min(...all.map(i => i.y)), x1 = Math.max(...all.map(i => i.x + i.w)), y1 = Math.max(...all.map(i => i.y + i.h))
    const r = el.getBoundingClientRect(), k = Math.min(1.5, Math.min((r.width - 80) / (x1 - x0), (r.height - 80) / (y1 - y0)))
    setView({ k, x: 40 - x0 * k + (r.width - 80 - (x1 - x0) * k) / 2, y: 40 - y0 * k })
  }, [job.board, job.directions])
  const fitRef = useRef(fit); fitRef.current = fit
  useEffect(() => { const t = setTimeout(fit, 50); return () => clearTimeout(t) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = wrap.current; if (!el) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top
      setView(v => {
        if (e.ctrlKey || e.metaKey) { const k = Math.min(3, Math.max(0.08, v.k * Math.exp(-e.deltaY * 0.01))); return { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k } }
        return { ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }
      })
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement; if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel.length) { e.preventDefault(); setItems(b => b.filter(i => !sel.includes(i.id))); setSel([]) }
    }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  })

  const down = (e: React.PointerEvent, target: { item?: BoardItem; resize?: string; dir?: Direction; dirResize?: Direction } = {}) => {
    e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    if (target.resize) { const it = job.board.find(i => i.id === target.resize)!; drag.current = { kind: 'resize', id: it.id, sx: e.clientX, sy: e.clientY, w: it.w, h: it.h }; return }
    if (target.dirResize) { const d = target.dirResize; drag.current = { kind: 'resize', id: d.id, sx: e.clientX, sy: e.clientY, w: d.w, h: d.h, dir: true }; return }
    if (target.dir) {
      const d = target.dir; setSelDir(d.id); setSel([])
      const items = Object.fromEntries(inside(job, d).map(i => [i.id, { x: i.x, y: i.y }]))
      drag.current = { kind: 'dir', id: d.id, sx: e.clientX, sy: e.clientY, x: d.x, y: d.y, items }; return
    }
    if (target.item) {
      const id = target.item.id
      const ids = e.shiftKey ? (sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]) : sel.includes(id) ? sel : [id]
      setSel(ids)
      drag.current = { kind: 'item', ids, sx: e.clientX, sy: e.clientY, start: Object.fromEntries(job.board.filter(i => ids.includes(i.id)).map(i => [i.id, { x: i.x, y: i.y }])) }
      return
    }
    setSel([]); setEditing(null)
    drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, v: view }
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return
    const dx = (e.clientX - d.sx) / view.k, dy = (e.clientY - d.sy) / view.k
    if (d.kind === 'pan') setView({ ...d.v, x: d.v.x + e.clientX - d.sx, y: d.v.y + e.clientY - d.sy })
    else if (d.kind === 'item') setItems(b => b.map(i => (d.start[i.id] ? { ...i, x: Math.round(d.start[i.id].x + dx), y: Math.round(d.start[i.id].y + dy) } : i)))
    else if (d.kind === 'resize' && d.dir) setDirs(ds => ds.map(x => (x.id === d.id ? { ...x, w: Math.max(300, Math.round(d.w + dx)), h: Math.max(240, Math.round(d.h + dy)) } : x)))
    else if (d.kind === 'resize') setItems(b => b.map(i => { if (i.id !== d.id) return i; const w = Math.max(60, Math.round(d.w + dx)); return { ...i, w, h: i.kind === 'ref' ? Math.round(w * (d.h / d.w)) : Math.max(40, Math.round(d.h + dy)) } }))
    else if (d.kind === 'dir') {
      setDirs(ds => ds.map(x => (x.id === d.id ? { ...x, x: Math.round(d.x + dx), y: Math.round(d.y + dy) } : x)))
      setItems(b => b.map(i => (d.items[i.id] ? { ...i, x: Math.round(d.items[i.id].x + dx), y: Math.round(d.items[i.id].y + dy) } : i)))
    }
  }
  const up = () => { drag.current = null }

  const addAt = (it: NewItem) => {
    const c = centre(); const n = { ...it, id: uid(), x: Math.round(c.x - it.w / 2), y: Math.round(c.y - it.h / 2) } as BoardItem
    setItems(b => [...b, n]); setSel([n.id])
  }
  const addDirection = () => {
    const x = job.directions.length ? Math.max(...job.directions.map(d => d.x + d.w)) + 100 : 0
    const d: Direction = { id: uid(), name: `Direction ${LETTER(job.directions.length)}`, idea: '', keywords: [], x, y: 0, w: 1300, h: 1000 }
    setDirs(ds => [...ds, d]); setSelDir(d.id)
  }
  const dropRef = (e: React.DragEvent) => {
    const id = e.dataTransfer.getData('text/vc-ref'); if (!id) return
    e.preventDefault()
    const r = job.refs.find(x => x.id === id); if (!r) return
    const p = toBoard(e.clientX, e.clientY), w = 320, h = Math.round(320 * (r.h / Math.max(1, r.w)))
    setItems(b => [...b, { id: uid(), kind: 'ref', refId: id, x: Math.round(p.x - w / 2), y: Math.round(p.y - h / 2), w, h }])
  }

  const dir = job.directions.find(d => d.id === selDir) ?? null
  const setDir = (patch: Partial<Direction>) => dir && setDirs(ds => ds.map(x => (x.id === dir.id ? { ...x, ...patch } : x)))

  const sheets = async (size: { width: number; height: number }) => {
    const out: HTMLCanvasElement[] = []
    for (let i = 0; i < job.directions.length; i++) {
      const d = job.directions[i], f = directionFonts(job, d)
      await Promise.all([ensureFont(f.display, 700), ensureFont(f.body, 400), ensureFont(f.body, 700)])
      out.push(await renderPage(await directionSheet(job, d, i, job.directions.length, size), size, size.width))
    }
    return out
  }
  const exportPdf = async () => { toast('Building the PDF…'); const c = await sheets({ width: 1920, height: 1080 }); downloadBlob(await screenPdf(c), `${slug(job.client || 'client')}_${slug(job.name)}_directions.pdf`) }
  const exportWa = async () => {
    toast('Making images for WhatsApp…')
    const c = await sheets({ width: 1080, height: 1350 })
    const files = await Promise.all(c.map(async (cv, i) => ({ name: `${slug(job.name)}_direction-${LETTER(i).toLowerCase()}.jpg`, blob: await new Promise<Blob>(r => cv.toBlob(b => r(b!), 'image/jpeg', 0.86)) })))
    downloadBlob(await zipFiles(files), `${slug(job.name)}_directions_whatsapp.zip`)
  }
  const openInEditor = async () => {
    if (!dir) return
    const i = job.directions.indexOf(dir), f = directionFonts(job, dir)
    await Promise.all([ensureFont(f.display, 700), ensureFont(f.body, 400)])
    const page = await directionSheet(job, dir, i, job.directions.length, { width: 1920, height: 1080 })
    const id = await sendHandoff({ from: 'studio', boards: true, name: `${job.name} ${page.name}`, size: { width: 1920, height: 1080 }, images: [], layered: [page], palette: directionPalette(job, dir) })
    router.push(`/editor?inbox=${id}`)
  }

  return (
    <div className="h-full flex">
      <aside className="w-44 shrink-0 border-r border-void-800/60 overflow-y-auto p-3 hidden md:block">
        <p className="text-[11.5px] text-void-500 mb-2 leading-snug">Drag references onto the board and into a direction.</p>
        <div className="space-y-2">{job.refs.map(r => <TrayRef key={r.id} r={r} />)}</div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-11 shrink-0 flex items-center gap-1.5 px-3 border-b border-void-800/60 overflow-x-auto">
          <Btn subtle onClick={addDirection}><FrameIcon size={14} />Direction</Btn>
          <Btn subtle onClick={() => addAt({ kind: 'note', text: 'Note', w: 260, h: 140 })}><StickyNote size={14} />Note</Btn>
          <label className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-[12.5px] text-void-300 hover:text-white hover:bg-void-800 cursor-pointer ${focusRing}`}>
            <Palette size={14} />Swatch
            <input type="color" className="sr-only" onChange={e => addAt({ kind: 'swatch', hex: e.target.value, w: 140, h: 140 })} />
          </label>
          <select aria-label="Add a type card" value="" onChange={e => { if (!e.target.value) return; ensureFont(e.target.value, 700); addAt({ kind: 'type', family: e.target.value, weight: 700, sample: 'Aa Bb 123', w: 360, h: 200 }) }} className={`h-8 px-2 rounded-lg bg-transparent text-[12.5px] text-void-300 hover:bg-void-800 ${focusRing}`}>
            <option value="">Type card…</option>{FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <span className="flex-1" />
          <Btn subtle onClick={fit} title="Fit everything"><Maximize2 size={14} /></Btn>
          <Btn subtle onClick={() => setPresent(0)} disabled={!job.directions.length}><Play size={14} />Present</Btn>
          <Btn subtle onClick={exportPdf} disabled={!job.directions.length}><FileText size={14} />PDF</Btn>
          <Btn subtle onClick={exportWa} disabled={!job.directions.length}><Download size={14} />WhatsApp images</Btn>
        </div>
        <div ref={wrap} className="relative flex-1 min-h-0 overflow-hidden bg-[#0d0d10] touch-none select-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: `${24 * view.k}px ${24 * view.k}px`, backgroundPosition: `${view.x}px ${view.y}px`, cursor: drag.current?.kind === 'pan' ? 'grabbing' : 'default' }}
          onPointerDown={e => down(e)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          onDragOver={e => { if (e.dataTransfer.types.includes('text/vc-ref')) e.preventDefault() }} onDrop={dropRef}>
          <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
            {job.directions.map((d, i) => (
              <div key={d.id} className={`absolute rounded-3xl border-2 ${selDir === d.id ? 'border-accent/70 bg-accent/[0.04]' : 'border-white/10 bg-white/[0.015]'}`} style={{ left: d.x, top: d.y, width: d.w, height: d.h }}>
                <div onPointerDown={e => down(e, { dir: d })} className="absolute -top-16 left-0 right-0 h-14 flex items-end gap-3 cursor-move px-2" style={{ fontSize: 34 }}>
                  <span className="font-semibold text-white/90 truncate">{d.name || `Direction ${LETTER(i)}`}</span>
                  {job.chosenDirection === d.id && <span className="mb-1 px-3 h-9 rounded-full bg-emerald-400 text-black text-[20px] font-semibold flex items-center gap-1.5"><Check size={20} strokeWidth={3} />Chosen</span>}
                  <span className="ml-auto mb-1 flex gap-1">{directionPalette(job, d).map(h => <span key={h} className="w-9 h-9 rounded-lg border border-white/20" style={{ background: h }} />)}</span>
                </div>
                <div onPointerDown={e => down(e, { dirResize: d })} className="absolute -right-3 -bottom-3 w-8 h-8 rounded-full bg-accent cursor-nwse-resize" />
              </div>
            ))}
            {job.board.map(it => <Item key={it.id} it={it} job={job} selected={sel.includes(it.id)} editing={editing === it.id} onDown={e => down(e, { item: it })} onResize={e => down(e, { resize: it.id })} onEdit={() => setEditing(it.id)} onText={text => setItems(b => b.map(x => (x.id === it.id ? { ...x, text } as BoardItem : x)))} />)}
          </div>
          {!job.board.length && !job.directions.length && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><p className="text-[13px] text-void-500 max-w-sm text-center">Add references first, or start a direction and drop notes, swatches and type cards into it. Each direction becomes a page the client can pick from.</p></div>
          )}
          <p className="absolute bottom-3 left-3 text-[11px] text-void-600 pointer-events-none">Drag to pan · Ctrl + scroll to zoom · Shift-click to pick several · Delete removes</p>
        </div>
      </div>
      <aside className="w-80 shrink-0 border-l border-void-800/60 overflow-y-auto p-4 space-y-4 hidden lg:block">
        {!job.directions.length ? <p className="text-[12.5px] text-void-500">Add a direction to group references into an idea the client can pick.</p> : (
          <>
            <div className="flex gap-1 flex-wrap">{job.directions.map((d, i) => <button key={d.id} onClick={() => setSelDir(d.id)} className={`h-7 px-2.5 rounded-lg text-[12px] ${focusRing} ${selDir === d.id ? 'bg-void-700 text-white' : 'text-void-400 hover:text-white'}`}>{LETTER(i)}{job.chosenDirection === d.id ? ' ✓' : ''}</button>)}</div>
            {dir && <DirectionPanel job={job} d={dir} set={setDir}
              onChoose={() => { update({ chosenDirection: dir.id, status: job.status === 'direction' ? 'design' : job.status }); toast(`${dir.name} is the direction. Its palette and type go into the key visual.`) }}
              onDelete={() => { setDirs(ds => ds.filter(x => x.id !== dir.id)); setSelDir(null) }} onEditor={openInEditor} />}
          </>
        )}
      </aside>
      {present !== null && <Presenter job={job} i={present} onGo={setPresent} onClose={() => setPresent(null)} />}
    </div>
  )
}

function TrayRef({ r }: { r: Job['refs'][number] }) {
  const url = useObjectUrl(r.blob)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url ?? ''} alt={r.name} draggable onDragStart={e => e.dataTransfer.setData('text/vc-ref', r.id)} className="w-full rounded-lg border border-void-800 cursor-grab hover:border-void-500" />
  )
}

function Item({ it, job, selected, editing, onDown, onResize, onEdit, onText }: { it: BoardItem; job: Job; selected: boolean; editing: boolean; onDown: (e: React.PointerEvent) => void; onResize: (e: React.PointerEvent) => void; onEdit: () => void; onText: (t: string) => void }) {
  const r = it.kind === 'ref' ? job.refs.find(x => x.id === it.refId) : null
  const url = useObjectUrl(r?.blob)
  return (
    <div onPointerDown={onDown} onDoubleClick={it.kind === 'note' ? onEdit : undefined} className={`absolute ${selected ? 'outline outline-[3px] outline-accent' : ''}`} style={{ left: it.x, top: it.y, width: it.w, height: it.h }}>
      {it.kind === 'ref' && (url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt={r?.name} draggable={false} className="w-full h-full object-cover rounded-md shadow-2xl" />
        : <div className="w-full h-full rounded-md bg-void-800" />)}
      {it.kind === 'note' && (editing
        ? <textarea autoFocus value={it.text} onChange={e => onText(e.target.value)} onPointerDown={e => e.stopPropagation()} className="w-full h-full p-4 rounded-md bg-[#fff5b8] text-[22px] leading-snug text-black resize-none outline-none" />
        : <div className="w-full h-full p-4 rounded-md bg-[#fff5b8] text-[22px] leading-snug text-black whitespace-pre-wrap overflow-hidden shadow-xl">{it.text}</div>)}
      {it.kind === 'swatch' && <div className="w-full h-full rounded-xl flex items-end p-3 text-[18px] font-mono shadow-xl" style={{ background: it.hex, color: isLight(it.hex) ? '#000' : '#fff' }}>{it.hex.toUpperCase()}</div>}
      {it.kind === 'type' && <div className="w-full h-full rounded-xl bg-white text-black p-5 overflow-hidden shadow-xl"><div style={{ fontFamily: `"${it.family}"`, fontWeight: it.weight, fontSize: Math.min(it.h * 0.45, 96), lineHeight: 1 }}>{it.sample}</div><div className="mt-2 text-[18px] text-black/60">{it.family}</div></div>}
      {selected && <div onPointerDown={onResize} className="absolute -right-2.5 -bottom-2.5 w-5 h-5 rounded-full bg-accent cursor-nwse-resize" />}
    </div>
  )
}

function DirectionPanel({ job, d, set, onChoose, onDelete, onEditor }: { job: Job; d: Direction; set: (p: Partial<Direction>) => void; onChoose: () => void; onDelete: () => void; onEditor: () => void }) {
  const pal = useMemo(() => directionPalette(job, d), [job, d])
  const f = directionFonts(job, d)
  useEffect(() => { ensureFont(f.display, 700); ensureFont(f.body, 400) }, [f.display, f.body])
  const count = inside(job, d).length
  return (
    <div className="space-y-4">
      <input value={d.name} onChange={e => set({ name: e.target.value })} aria-label="Direction name" className={`w-full bg-transparent text-[17px] font-semibold rounded ${focusRing}`} />
      <div><Label>The idea, in a line</Label><textarea value={d.idea} onChange={e => set({ idea: e.target.value })} rows={3} placeholder="Night heat: warm neon on deep indigo, big condensed type, grain." className={`w-full px-2.5 py-2 rounded-lg bg-void-950 border border-void-800 text-[12.5px] leading-relaxed resize-y ${focusRing}`} /></div>
      <div><Label>Keywords</Label><input value={d.keywords.join(', ')} onChange={e => set({ keywords: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} placeholder="warm, nocturnal, loud" className={`${INPUT} w-full`} /></div>
      <div>
        <Label hint={d.palette ? <button onClick={() => set({ palette: undefined })} className="hover:text-white">Read from board</button> : 'From the board'}>Palette</Label>
        <div className="flex gap-1.5 flex-wrap">
          {pal.map((h, i) => (
            <label key={h + i} className="relative w-9 h-9 rounded-lg border border-white/15 cursor-pointer" style={{ background: h }} title={h}>
              <input type="color" value={h} onChange={e => set({ palette: pal.map((x, j) => (j === i ? e.target.value : x)) })} className="sr-only" />
            </label>
          ))}
          <label className="w-9 h-9 rounded-lg border border-dashed border-void-600 text-void-400 flex items-center justify-center cursor-pointer">+<input type="color" onChange={e => set({ palette: [...pal, e.target.value] })} className="sr-only" /></label>
        </div>
      </div>
      <div>
        <Label>Type</Label>
        <div className="grid grid-cols-2 gap-1.5">
          <select value={f.display} onChange={e => set({ display: e.target.value })} aria-label="Headline font" className={`${INPUT}`}>{FONTS.map(x => <option key={x}>{x}</option>)}</select>
          <select value={f.body} onChange={e => set({ body: e.target.value })} aria-label="Text font" className={`${INPUT}`}>{FONTS.map(x => <option key={x}>{x}</option>)}</select>
        </div>
        <p className="mt-2 text-[26px] leading-tight" style={{ fontFamily: `"${f.display}"`, fontWeight: 700 }}>{job.name}</p>
        <p className="text-[13px] text-void-300" style={{ fontFamily: `"${f.body}"` }}>The quick brown fox jumps over the lazy dog.</p>
      </div>
      <p className="text-[11.5px] text-void-500">{count} item{count === 1 ? '' : 's'} inside this direction.</p>
      <div className="space-y-2">
        <Btn primary onClick={onChoose} className="w-full"><Check size={14} />{job.chosenDirection === d.id ? 'Chosen by the client' : 'Client chose this one'}</Btn>
        <div className="grid grid-cols-2 gap-2"><Btn onClick={onEditor}>Open as a board</Btn><Btn onClick={onDelete}><Trash2 size={13} />Delete</Btn></div>
      </div>
    </div>
  )
}

function Presenter({ job, i, onGo, onClose }: { job: Job; i: number; onGo: (i: number) => void; onClose: () => void }) {
  const [urls, setUrls] = useState<string[]>([])
  useEffect(() => {
    let live = true
    ;(async () => {
      const out: string[] = []
      for (let k = 0; k < job.directions.length; k++) {
        const d = job.directions[k], f = directionFonts(job, d)
        await Promise.all([ensureFont(f.display, 700), ensureFont(f.body, 400), ensureFont(f.body, 700)])
        const c = await renderPage(await directionSheet(job, d, k, job.directions.length, { width: 1920, height: 1080 }), { width: 1920, height: 1080 }, 1920)
        out.push(c.toDataURL('image/jpeg', 0.9)); if (live) setUrls([...out])
      }
    })()
    return () => { live = false }
  }, [job])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight' || e.key === ' ') onGo(Math.min(job.directions.length - 1, i + 1)); if (e.key === 'ArrowLeft') onGo(Math.max(0, i - 1)) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [i, job.directions.length, onGo, onClose])
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {urls[i] ? <img src={urls[i]} alt="" className="max-w-full max-h-full" /> : <p className="text-void-400">Preparing…</p>}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[12px] text-void-300" onClick={e => e.stopPropagation()}>
        <button onClick={() => onGo(Math.max(0, i - 1))} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><ChevronLeft size={16} /></button>
        <span>{i + 1} / {job.directions.length}</span>
        <button onClick={() => onGo(Math.min(job.directions.length - 1, i + 1))} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><ChevronRight size={16} /></button>
      </div>
    </div>
  )
}
