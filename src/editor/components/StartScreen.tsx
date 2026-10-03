'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2, MoreHorizontal, Download, Copy, FolderOpen } from 'lucide-react'
import { deleteProject, duplicateProject, exportProjectPng, exportProjectVoid, idb, importFiles, importVoidFile, listProjects, openProject, type ProjectSummary } from '../io'
import { countLine, designStatus, type DeskStatus } from '@/lib/desk'
import type { Job } from '@/studio/jobs'
import { SIZE_PRESETS } from '../presets'
import { useEditor } from '../store'
import { useTabs } from '../tabs'
import { clearSession, readCrashedSession, type SessionMarker } from '../versions'
import { Button, focusRing } from './ui'
import { UnitField } from './MoreDialogs'
import { SIZE_UNITS, fromPx, rememberUnit, rememberedUnit, toPx, type SizeUnit } from '../units'
import { track } from '@/lib/analytics'
import { desktop, type LibraryFile } from '@/lib/desktop'

/** Desktop app: the .void files in the person's Voidcanvas folder, kept in step with the folder. */
function LibrarySection() {
  const [lib, setLib] = useState<{ dir: string; files: LibraryFile[] } | null>(null)
  useEffect(() => {
    if (!desktop) return
    let live = true
    const load = () => desktop!.library.list().then(r => { if (live) setLib(r) }).catch(() => {})
    load()
    const off = desktop.library.onChange(load)
    return () => { live = false; off() }
  }, [])
  if (!desktop || !lib) return null
  const open = async (p: string) => { const { openPaths } = await import('../disk'); openPaths([p]) }
  return (
    <section className="mt-7">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-void-200">Your Voidcanvas folder</h2>
          <p className="text-[12px] text-void-500 truncate" title={lib.dir}>{lib.dir}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={() => desktop!.reveal()}><FolderOpen size={14} />Show folder</Button>
          <Button onClick={() => desktop!.library.choose()}>Change folder</Button>
        </div>
      </div>
      {lib.files.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {lib.files.slice(0, 20).map(f => (
            <button key={f.path} onClick={() => open(f.path)} title={f.path} className={`block w-full rounded-xl overflow-hidden bg-void-900 border border-void-800 hover:border-void-600 text-left ${focusRing}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span className="block aspect-[4/3] bg-void-950">{f.preview && <img src={f.preview} alt="" className="w-full h-full object-contain" />}</span>
              <span className="block px-2.5 py-2"><span className="block text-[12.5px] font-medium truncate">{f.name}</span><span className="block text-[11.5px] text-void-500">{new Date(f.modified).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[12.5px] text-void-500">Designs you save are kept here as .void files. Put this folder in Dropbox, Google Drive, OneDrive or iCloud Drive to have them on your other computers.</p>
      )}
    </section>
  )
}

/** "Edited 5 min ago", "Edited yesterday", "Edited 3 Sept". */
export function edited(at: number, now = Date.now()) {
  const m = Math.round((now - at) / 60000)
  if (m < 1) return 'Edited just now'
  if (m < 60) return `Edited ${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `Edited ${h} h ago`
  const d = new Date(at), y = new Date(now); y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Edited yesterday'
  return 'Edited ' + d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function RecentMenu({ p, onChanged }: { p: ProjectSummary; onChanged: (fn: (r: ProjectSummary[]) => ProjectSummary[]) => void }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { if (!open) return; const h = () => setOpen(false); window.addEventListener('pointerdown', h); return () => window.removeEventListener('pointerdown', h) }, [open])
  return (
    <div className="absolute top-1.5 right-1.5" onPointerDown={e => e.stopPropagation()}>
      <button aria-label={`Actions for ${p.name}`} onClick={() => setOpen(o => !o)}
        className={`w-8 h-8 rounded-md bg-black/70 text-void-200 hover:text-white items-center justify-center hidden group-hover:flex focus:flex [@media(hover:none)]:flex ${open ? '!flex' : ''} ${focusRing}`}><MoreHorizontal size={14} /></button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 rounded-lg bg-surface-overlay border border-white/[0.08] shadow-xl py-1 z-10 text-[12.5px]">
          <button onClick={async () => { setOpen(false); await exportProjectPng(p.id); const fresh = await listProjects(); onChanged(() => fresh) }} className={`w-full flex items-center gap-2 px-3 h-8 text-left text-void-200 hover:bg-surface-sunken ${focusRing}`}><Download size={13} />Export PNG{(p.boards ?? 1) > 1 ? 's' : ''}</button>
          <button onClick={async () => { setOpen(false); await exportProjectVoid(p.id) }} className={`w-full flex items-center gap-2 px-3 h-8 text-left text-void-200 hover:bg-surface-sunken ${focusRing}`}><Download size={13} />Download .void</button>
          <button onClick={async () => { setOpen(false); const c = await duplicateProject(p.id); if (c) onChanged(r => [c, ...r]) }} className={`w-full flex items-center gap-2 px-3 h-8 text-left text-void-200 hover:bg-surface-sunken ${focusRing}`}><Copy size={13} />Duplicate</button>
          <button onClick={async () => { setOpen(false); if (confirm(`Delete “${p.name}”? This cannot be undone.`)) { await deleteProject(p.id); onChanged(r => r.filter(x => x.id !== p.id)) } }} className={`w-full flex items-center gap-2 px-3 h-8 text-left text-rose-400 hover:bg-surface-sunken ${focusRing}`}><Trash2 size={13} />Delete</button>
        </div>
      )}
    </div>
  )
}

function RestoreBanner() {
  const [hidden, setHidden] = useState(false)
  // Read after mount: the server render has no localStorage, so the banner must not be in the first render.
  const [m, setM] = useState<SessionMarker | null>(null)
  useEffect(() => { let live = true; readCrashedSession().then(x => { if (live) setM(x) }).catch(() => {}); return () => { live = false } }, [])
  if (!m || hidden) return null
  const reopen = async () => {
    setHidden(true)
    for (const t of m.open) { if (await openProject(t.id, false, 'crash')) useTabs.getState().sync() }
    track('doc.resume', { how: 'crash', tabs: m.open.length })
    if (m.active && m.open.some(t => t.id === m.active)) await useTabs.getState().switchTo(m.active)
    clearSession()
  }
  return (
    <div role="alert" className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3">
      <p className="flex-1 text-[13px] text-amber-100">Voidcanvas closed unexpectedly last time. Your work was saved on this device: {m.open.map(t => t.name).join(', ')}.</p>
      <div className="flex gap-2 shrink-0"><Button primary onClick={reopen}>Reopen {m.open.length > 1 ? `all ${m.open.length}` : 'it'}</Button><Button onClick={() => { setHidden(true); clearSession() }}>Dismiss</Button></div>
    </div>
  )
}

const TONE: Record<DeskStatus['tone'], string> = { todo: 'text-amber-200', wait: 'text-sky-300', done: 'text-emerald-300/80', none: 'text-void-500' }

export function StartScreen() {
  const file = useRef<HTMLInputElement>(null)
  const [recent, setRecent] = useState<ProjectSummary[]>([])
  // Studio jobs, for what each job's design is waiting for, and how many client brands there are.
  const [jobs, setJobs] = useState<Record<string, Job>>({})
  const [brands, setBrands] = useState(0)
  useEffect(() => {
    idb.all<Job>('jobs').then(list => setJobs(Object.fromEntries(list.map(j => [j.id, j])))).catch(() => {})
    idb.all<{ id: string }>('brands').then(b => setBrands(b.length)).catch(() => {})
  }, [])
  const designs = recent.filter(p => !p.template)
  const counts = countLine({ designs: designs.length, brands, templates: recent.length - designs.length, exports: designs.reduce((a, p) => a + (p.exports ?? 0), 0) })
  const [over, setOver] = useState(false)
  const [w, setW] = useState(1600), [h, setH] = useState(1200)
  // Custom sizes in any unit: print units go through the resolution (300 dpi unless changed).
  const [unit, setUnit] = useState<SizeUnit>('px')
  useEffect(() => setUnit(rememberedUnit()), [])
  const [dpi, setDpi] = useState(300)
  const tooBig = Math.max(w, h) > 8000
  useEffect(() => { listProjects().then(setRecent).catch(() => {}) }, [])
  const start = (width: number, height: number, name?: string) => (track('doc.new', { preset: (name || 'custom').slice(0, 40), w: width, h: height }), useEditor.getState().newDoc({ width, height, background: '#ffffff', name }))
  const handleFiles = (files: File[]) => { const v = files.find(f => f.name.endsWith('.void') || f.name.endsWith('.void.png')); if (v) { importVoidFile(v); return } importFiles(files) }
  // A .void dropped in Chromium comes with a handle, so the design stays linked to its file.
  const dropFiles = (dt: DataTransfer) => {
    const files = Array.from(dt.files)
    if (desktop) { import('../disk').then(m => m.openDropped(files)); return }
    const i = files.findIndex(f => /\.void(\.png)?$/i.test(f.name))
    const item = i >= 0 ? Array.from(dt.items).filter(x => x.kind === 'file')[i] as any : null
    if (item?.getAsFileSystemHandle) {
      item.getAsFileSystemHandle().then(async (h: any) => { if (h?.kind === 'file') { const { openLinked } = await import('../disk'); await openLinked(h) } else handleFiles(files) }).catch(() => handleFiles(files))
      return
    }
    handleFiles(files)
  }
  const groups = Array.from(new Set(SIZE_PRESETS.map(p => p.group)))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
        <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-tight">What are you making?</h1>
        <p className="mt-1.5 text-[14px] text-void-400">Start from a photo or pick a size. Everything stays on your device until you export.</p>
        <RestoreBanner />

        {recent.some(p => !p.template) && (
          <section className="mt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
              <h2 className="text-[13px] font-semibold text-void-200">Pick up where you left off</h2>
              {counts && <p data-desk-count className="text-[12px] text-void-500 tabular-nums">{counts}</p>}
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 md:grid-cols-5">
              {designs.slice(0, 10).map(p => {
                const st = designStatus(p, p.jobId ? jobs[p.jobId] : null)
                return (
                <div key={p.id} className="group relative w-[150px] shrink-0 sm:w-auto">
                  <button onClick={() => openProject(p.id, false, 'home')} className={`block w-full rounded-xl overflow-hidden bg-void-900 border border-void-800 hover:border-void-600 text-left ${focusRing}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <span className="block aspect-[4/3] bg-void-950"><img src={p.thumb} alt="" className="w-full h-full object-contain" /></span>
                    <span className="block px-2.5 py-2">
                      <span className="block text-[12.5px] font-medium truncate">{p.name}</span>
                      <span className="block text-[11.5px] text-void-500 tabular-nums truncate">{edited(p.editedAt ?? p.updatedAt)} · {p.width} × {p.height}</span>
                      {st.text && <span data-desk-status={st.tone} className={`block text-[11.5px] truncate ${TONE[st.tone]}`}>{st.text}</span>}
                    </span>
                  </button>
                  <RecentMenu p={p} onChanged={setRecent} />
                </div>
              ) })}
            </div>
          </section>
        )}

        <LibrarySection />

        <input ref={file} type="file" accept="image/*,.psd,.pdf,.void" multiple hidden onChange={e => handleFiles(Array.from(e.target.files ?? []))} />
        <button
          onClick={async () => { const { openFromDisk } = await import('../disk'); if (!(await openFromDisk())) file.current?.click() }}
          onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); dropFiles(e.dataTransfer) }}
          className={`mt-6 w-full flex flex-row items-center gap-4 rounded-2xl border border-dashed px-5 py-5 sm:px-6 sm:py-7 text-left transition-colors ${focusRing} ${over ? 'border-accent bg-accent/10' : 'border-void-700 hover:border-void-500 bg-void-900/40'}`}>
          <span className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center shrink-0"><ImagePlus size={22} /></span>
          <span>
            <span className="block text-[15px] font-medium">Open a photo</span>
            <span className="block text-[13px] text-void-400"><span className="hidden sm:inline">Drop a photo, PSD, PDF or .void file, choose a file, or paste with Ctrl+V. PSDs and .void files keep their layers.</span><span className="sm:hidden">Photos, PSDs and PDFs. Layers are kept.</span></span>
          </span>
        </button>

        {recent.some(p => p.template) && (
          <section className="mt-10">
            <h2 className="text-[13px] font-semibold text-void-200 mb-1">Your templates</h2>
            <p className="text-[12.5px] text-void-500 mb-3">Opening one makes a fresh copy. The template itself never changes.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {recent.filter(p => p.template).map(p => (
                <div key={p.id} className="group relative">
                  <button onClick={() => openProject(p.id, true, 'template')} className={`block w-full rounded-xl overflow-hidden bg-void-900 border border-void-800 hover:border-accent text-left ${focusRing}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <span className="block aspect-[4/3] bg-void-950"><img src={p.thumb} alt="" className="w-full h-full object-contain" /></span>
                    <span className="block px-2.5 py-2 text-[12.5px] font-medium truncate">{p.name}</span>
                  </button>
                  <button aria-label={`Delete ${p.name}`} onClick={async () => { if (confirm(`Delete the template “${p.name}”?`)) { await deleteProject(p.id); setRecent(r => r.filter(x => x.id !== p.id)) } }} className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-md bg-black/70 text-void-200 hover:text-white items-center justify-center hidden group-hover:flex focus:flex ${focusRing}`}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </section>
        )}


        <section className="mt-8">
          {groups.map((g, gi) => (
            <div key={g} className={gi > 0 ? 'mt-5' : ''}>
              <h2 className="text-[12px] font-semibold text-void-400 uppercase tracking-wide mb-2">{g}</h2>
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 md:grid-cols-4">
                {SIZE_PRESETS.filter(p => p.group === g).map(p => {
                  const k = 20 / Math.max(p.width, p.height)
                  return (
                    <button key={p.id} onClick={() => start(p.width, p.height, p.label)}
                      className={`flex items-center gap-2.5 rounded-lg bg-void-900/50 hover:bg-void-800 border border-void-800/70 px-2.5 h-12 text-left shrink-0 w-[170px] sm:w-auto ${focusRing}`}>
                      <span className="w-6 flex items-center justify-center shrink-0"><span className="block rounded-[2px] bg-white/70" style={{ width: Math.max(4, p.width * k), height: Math.max(4, p.height * k) }} /></span>
                      <span className="min-w-0"><span className="block text-[12.5px] font-medium truncate">{p.label}</span><span className="block text-[11px] text-void-500 tabular-nums">{p.width} × {p.height}</span></span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10 pb-10">
          <h2 className="text-[13px] font-semibold text-void-200 mb-3">Custom size</h2>
          <form data-custom-size className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); if (tooBig) return; start(Math.max(16, w), Math.max(16, h)); if (unit !== 'px') useEditor.getState().setDoc({ dpi }) }}>
            {([['Width', w, setW], ['Height', h, setH]] as const).map(([l, v, set]) => (
              <div key={l + unit} className="w-28"><UnitField label={`${l} (${unit})`} px={v} fmt={px => fromPx(px, unit, dpi)} parse={x => set(toPx(x, unit, dpi))} className={`h-9 w-28 px-2.5 rounded-lg bg-void-900 border border-void-800 text-[13px] tabular-nums ${focusRing}`} /></div>
            ))}
            <label className="block"><span className="block text-[12px] text-void-400 mb-1">Units</span>
              <select aria-label="Units" value={unit} onChange={e => { const u = e.target.value as SizeUnit; setUnit(u); rememberUnit(u) }} className={`h-9 px-2 rounded-lg bg-void-900 border border-void-800 text-[13px] ${focusRing}`}>{SIZE_UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}</select></label>
            {unit !== 'px' && <label className="block"><span className="block text-[12px] text-void-400 mb-1">dpi</span>
              <input type="number" min={36} max={1200} aria-label="Resolution" value={dpi} onChange={e => setDpi(Math.max(1, Number(e.target.value) || 1))} className={`h-9 w-20 px-2.5 rounded-lg bg-void-900 border border-void-800 text-[13px] tabular-nums ${focusRing}`} /></label>}
            <Button type="submit" primary disabled={tooBig}>Create design</Button>
          </form>
          <p data-size-px className={`mt-2 text-[12px] tabular-nums ${tooBig ? 'text-amber-300' : 'text-void-500'}`}>{tooBig ? `${w} × ${h} px is more than the 8000 px a side the Editor works with. Lower the resolution, or make it smaller.` : unit !== 'px' ? `${w} × ${h} px at ${dpi} dpi` : ''}</p>
        </section>
      </div>
    </div>
  )
}
