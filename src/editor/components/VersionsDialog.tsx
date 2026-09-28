'use client'

import { useEffect, useRef, useState } from 'react'
import { Columns2, Download, Pin, PinOff, RotateCcw, SplitSquareHorizontal, Trash2 } from 'lucide-react'
import { useEditor } from '../store'
import type { Doc, Frame, Group, Layer } from '../types'
import { deleteVersion, keepVersion, listVersions, renameVersion, restoreVersion, saveVersion, versionProject, type VersionSummary } from '../versions'
import { Button, Modal, focusRing } from './ui'

// Version history: restore points for the open design, kept on this device. A version can be named
// ("Direction A"), kept for good (approved versions are kept automatically), restored, restored as a copy,
// and compared with another version or with the design as it is now, board by board.

const when = (t: number) => { const d = new Date(t); return d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
export const versionName = (v: VersionSummary) => v.name?.trim() || v.label

export function VersionsDialog({ onClose }: { onClose: () => void }) {
  const doc = useEditor(s => s.doc)!
  const [list, setList] = useState<VersionSummary[] | null>(null)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [compare, setCompare] = useState<{ a: string; b: string } | null>(null)
  const load = () => listVersions(doc.id).then(setList).catch(() => setList([]))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (compare && list) return <CompareView list={list} initial={compare} onBack={() => setCompare(null)} onClose={onClose} />
  return (
    <Modal title="Version history" onClose={onClose} wide>
      <div className="p-5" data-versions>
        <p className="text-[12.5px] text-void-400 mb-3">Restore points for this design, kept on this device. Restoring saves the current state first, so you can always come back. Named and approved versions are never removed to make room.</p>
        <form className="flex flex-wrap items-center gap-2 mb-4" onSubmit={async e => { e.preventDefault(); await saveVersion('Saved by you', false, { name: newName }); setNewName(''); load() }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name it (optional), such as Direction A" aria-label="Name for the new version" className={`flex-1 min-w-[180px] h-9 px-3 rounded-lg bg-surface-sunken border border-white/[0.06] text-[13px] ${focusRing}`} />
          <Button type="submit" className="shrink-0 whitespace-nowrap"><Download size={14} />Save a version now</Button>
        </form>
        {!list ? <p className="text-[13px] text-void-500">Loading…</p> : !list.length ? <p className="text-[13px] text-void-500 py-6">No versions yet. One is made automatically every few minutes while you work, and you can save one any time with Ctrl+Alt+S.</p> : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto">
            {list.map(v => (
              <li key={v.id} data-version={v.id} className="rounded-xl border border-white/[0.06] bg-surface-sunken overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.thumb} alt="" className="w-full h-28 object-contain bg-black/40" />
                <div className="p-2.5">
                  {editing === v.id ? (
                    <input autoFocus defaultValue={v.name ?? ''} placeholder={v.label} aria-label="Version name"
                      onBlur={async e => { if (!e.currentTarget.dataset.cancel) await renameVersion(v.id, e.currentTarget.value); setEditing(null); load() }}
                      onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.preventDefault(); e.currentTarget.dataset.cancel = '1'; e.currentTarget.blur() } }}
                      className={`w-full h-7 px-2 rounded-md bg-void-950 border border-white/[0.08] text-[12.5px] ${focusRing}`} />
                  ) : (
                    <button onClick={() => setEditing(v.id)} title="Click to name this version" className={`block w-full text-left text-[12.5px] text-void-100 truncate rounded ${focusRing}`}>{versionName(v)}</button>
                  )}
                  <p className="text-[11.5px] text-void-500 truncate">{v.name ? v.label + ' · ' : ''}{when(v.at)} · {v.width}×{v.height}</p>
                  {v.keep && <p className="mt-1 inline-flex text-[10.5px] px-1.5 h-5 items-center rounded bg-emerald-400/15 text-emerald-300">Kept for good</p>}
                  <div className="flex gap-1 mt-2">
                    <Button onClick={async () => { await restoreVersion(v.id); onClose() }} className="!h-7 !px-2 !text-[12px] flex-1"><RotateCcw size={12} />Restore</Button>
                    <Button onClick={async () => { await restoreVersion(v.id, true); onClose() }} className="!h-7 !px-2 !text-[12px]">As copy</Button>
                  </div>
                  <div className="flex gap-1 mt-1">
                    <Button onClick={() => setCompare({ a: v.id, b: 'now' })} className="!h-7 !px-2 !text-[12px] flex-1"><Columns2 size={12} />Compare</Button>
                    <button aria-label={v.keep ? 'Stop keeping this version for good' : 'Keep this version for good'} title={v.keep ? 'Kept for good. Click to let it go when room is needed.' : 'Keep for good'} onClick={async () => { await keepVersion(v.id, !v.keep); load() }} className={`w-7 h-7 inline-flex items-center justify-center rounded ${focusRing} ${v.keep ? 'text-emerald-300' : 'text-void-500 hover:text-white'}`}>{v.keep ? <PinOff size={13} /> : <Pin size={13} />}</button>
                    <button aria-label="Delete version" disabled={!!v.keep} title={v.keep ? 'Kept for good. Stop keeping it first.' : 'Delete'} onClick={async () => { await deleteVersion(v.id); load() }} className={`w-7 h-7 inline-flex items-center justify-center rounded text-void-500 hover:text-white disabled:opacity-30 ${focusRing}`}><Trash2 size={13} /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

interface Design { doc: Doc; layers: Layer[]; groups: Group[] }

/** Two versions (or a version and the design as it is now) side by side or under a slider, board by board. */
function CompareView({ list, initial, onBack, onClose }: { list: VersionSummary[]; initial: { a: string; b: string }; onBack: () => void; onClose: () => void }) {
  const [a, setA] = useState(initial.a), [b, setB] = useState(initial.b)
  const [style, setStyle] = useState<'split' | 'side'>('split')
  const [board, setBoard] = useState(0)
  const [pos, setPos] = useState(50)
  const [imgs, setImgs] = useState<{ a: string | null; b: string | null; names: string[]; w: number; h: number } | null>(null)
  const urls = useRef<string[]>([])
  const nameOf = (id: string) => (id === 'now' ? 'Now' : versionName(list.find(v => v.id === id) ?? ({ label: 'Version' } as VersionSummary)))

  useEffect(() => {
    let live = true
    setImgs(null)
    ;(async () => {
      const { renderBoard, boardsOf } = await import('@/studio/render')
      const load = async (id: string): Promise<Design | null> => {
        if (id === 'now') { const s = useEditor.getState(); return s.doc ? { doc: s.doc, layers: s.layers, groups: s.groups } : null }
        const p = await versionProject(id); if (!p) return null
        const { restoreStored } = await import('../io')
        const r = await restoreStored(p)
        return { doc: r.doc, layers: r.layers, groups: p.groups ?? [] }
      }
      const [da, db] = await Promise.all([load(a), load(b)])
      if (!live) return
      const ba = da ? boardsOf(da) : [], bb = db ? boardsOf(db) : []
      const i = Math.min(board, Math.max(0, ba.length - 1))
      const fa = ba[i] ?? null
      // The same board in the other version: by id first (boards keep their id), then by place in the list.
      const fb = (fa && bb.find(f => f.id === fa.id)) ?? bb[i] ?? null
      const draw = async (d: Design | null, f: Frame | null) => {
        if (!d || !f) return null
        const k = Math.min(1, 1400 / Math.max(f.width, f.height))
        const c = renderBoard(d, f.id === '__doc' ? null : f, k)
        const blob = await new Promise<Blob | null>(res => c.toBlob(res, 'image/jpeg', 0.9))
        if (!blob) return null
        const u = URL.createObjectURL(blob); urls.current.push(u); return u
      }
      const [ua, ub] = await Promise.all([draw(da, fa), draw(db, fb)])
      if (live) setImgs({ a: ua, b: ub, names: ba.map(f => f.name), w: fa?.width ?? 1, h: fa?.height ?? 1 })
    })().catch(() => { if (live) setImgs({ a: null, b: null, names: [], w: 1, h: 1 }) })
    return () => { live = false }
  }, [a, b, board])
  useEffect(() => () => { for (const u of urls.current) URL.revokeObjectURL(u) }, [])

  const pick = (value: string, set: (v: string) => void, label: string) => (
    <select value={value} onChange={e => set(e.target.value)} aria-label={label} className={`h-8 max-w-[200px] px-2 rounded-lg bg-surface-sunken border border-white/[0.06] text-[12.5px] ${focusRing}`}>
      <option value="now">Now</option>
      {list.map(v => <option key={v.id} value={v.id}>{versionName(v)} · {when(v.at)}</option>)}
    </select>
  )
  return (
    <Modal title="Compare versions" onClose={onClose} wide>
      <div className="p-4 space-y-3" data-compare>
        <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
          <Button onClick={onBack} className="!h-8 !px-2.5 !text-[12.5px]">Back</Button>
          {pick(a, setA, 'Left')}<span className="text-void-500">against</span>{pick(b, setB, 'Right')}
          {imgs && imgs.names.length > 1 && (
            <select value={board} onChange={e => setBoard(Number(e.target.value))} aria-label="Board" className={`h-8 px-2 rounded-lg bg-surface-sunken border border-white/[0.06] ${focusRing}`}>
              {imgs.names.map((n, i) => <option key={i} value={i}>{n}</option>)}
            </select>
          )}
          <span className="flex-1" />
          <button onClick={() => setStyle('split')} aria-pressed={style === 'split'} className={`h-8 px-2.5 rounded-lg flex items-center gap-1 ${focusRing} ${style === 'split' ? 'bg-void-700 text-white' : 'text-void-400'}`}><SplitSquareHorizontal size={14} />Slider</button>
          <button onClick={() => setStyle('side')} aria-pressed={style === 'side'} className={`h-8 px-2.5 rounded-lg flex items-center gap-1 ${focusRing} ${style === 'side' ? 'bg-void-700 text-white' : 'text-void-400'}`}><Columns2 size={14} />Side by side</button>
        </div>
        {!imgs ? <p className="text-[13px] text-void-500 py-10 text-center">Drawing both…</p> : style === 'side' ? (
          <div className="grid grid-cols-2 gap-3 h-[60vh]">
            {([[nameOf(a), imgs.a], [nameOf(b), imgs.b]] as const).map(([l, u], i) => (
              <div key={i} className="min-h-0 flex flex-col bg-black/30 rounded-xl p-2"><span className="text-[12px] text-void-400 mb-1">{l}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {u ? <img src={u} alt={l} className="flex-1 min-h-0 object-contain" /> : <span className="text-[12px] text-void-500">Not in this version</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[60vh] flex items-center justify-center bg-black/30 rounded-xl select-none">
            <div className="relative h-full max-w-full touch-none" style={{ aspectRatio: `${imgs.w} / ${imgs.h}` }} data-compare-slider
              onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))) }}
              onPointerMove={e => { if (!e.buttons) return; const r = e.currentTarget.getBoundingClientRect(); setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))) }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {imgs.a && <img src={imgs.a} alt={nameOf(a)} className="absolute inset-0 w-full h-full object-contain" />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {imgs.b && <img src={imgs.b} alt={nameOf(b)} className="absolute inset-0 w-full h-full object-contain" style={{ clipPath: `inset(0 0 0 ${pos}%)` }} />}
              <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} />
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[11px]">{nameOf(a)}</span>
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[11px]">{nameOf(b)}</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
