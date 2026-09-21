'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { deleteProject, importFiles, listProjects, openProject, type ProjectSummary } from '../io'
import { SIZE_PRESETS } from '../presets'
import { useEditor } from '../store'
import { Button, focusRing } from './ui'

export function StartScreen() {
  const file = useRef<HTMLInputElement>(null)
  const [recent, setRecent] = useState<ProjectSummary[]>([])
  const [over, setOver] = useState(false)
  const [w, setW] = useState(1600), [h, setH] = useState(1200)
  useEffect(() => { listProjects().then(setRecent).catch(() => {}) }, [])
  const start = (width: number, height: number, name?: string) => useEditor.getState().newDoc({ width, height, background: '#ffffff', name })
  const groups = Array.from(new Set(SIZE_PRESETS.map(p => p.group)))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
        <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-tight">What are you making?</h1>
        <p className="mt-1.5 text-[14px] text-void-400">Start from a photo or pick a size. Everything stays on your device until you export.</p>

        <input ref={file} type="file" accept="image/*" multiple hidden onChange={e => importFiles(Array.from(e.target.files ?? []))} />
        <button
          onClick={() => file.current?.click()}
          onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); importFiles(Array.from(e.dataTransfer.files)) }}
          className={`mt-7 w-full flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-dashed px-6 py-7 text-left transition-colors ${focusRing} ${over ? 'border-[#8b7cff] bg-[#8b7cff]/10' : 'border-void-700 hover:border-void-500 bg-void-900/40'}`}>
          <span className="w-12 h-12 rounded-xl bg-[#8b7cff] text-white flex items-center justify-center shrink-0"><ImagePlus size={22} /></span>
          <span>
            <span className="block text-[15px] font-medium">Open a photo</span>
            <span className="block text-[13px] text-void-400">Drop one here, choose a file, or paste with Ctrl+V. Retouch it, cut out the background, add type.</span>
          </span>
        </button>

        {recent.some(p => p.template) && (
          <section className="mt-10">
            <h2 className="text-[13px] font-semibold text-void-200 mb-1">Your templates</h2>
            <p className="text-[12.5px] text-void-500 mb-3">Opening one makes a fresh copy. The template itself never changes.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {recent.filter(p => p.template).map(p => (
                <div key={p.id} className="group relative">
                  <button onClick={() => openProject(p.id, true)} className={`block w-full rounded-xl overflow-hidden bg-void-900 border border-void-800 hover:border-[#8b7cff] text-left ${focusRing}`}>
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

        {recent.some(p => !p.template) && (
          <section className="mt-10">
            <h2 className="text-[13px] font-semibold text-void-200 mb-3">Pick up where you left off</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {recent.filter(p => !p.template).slice(0, 10).map(p => (
                <div key={p.id} className="group relative">
                  <button onClick={() => openProject(p.id)} className={`block w-full rounded-xl overflow-hidden bg-void-900 border border-void-800 hover:border-void-600 text-left ${focusRing}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <span className="block aspect-[4/3] bg-void-950"><img src={p.thumb} alt="" className="w-full h-full object-contain" /></span>
                    <span className="block px-2.5 py-2"><span className="block text-[12.5px] font-medium truncate">{p.name}</span><span className="block text-[11.5px] text-void-500 tabular-nums">{p.width} × {p.height}</span></span>
                  </button>
                  <button aria-label={`Delete ${p.name}`} onClick={async () => { if (confirm(`Delete “${p.name}”? This cannot be undone.`)) { await deleteProject(p.id); setRecent(r => r.filter(x => x.id !== p.id)) } }}
                    className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-md bg-black/70 text-void-200 hover:text-white items-center justify-center hidden group-hover:flex focus:flex ${focusRing}`}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </section>
        )}

        {groups.map(g => (
          <section key={g} className="mt-10">
            <h2 className="text-[13px] font-semibold text-void-200 mb-3">{g}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {SIZE_PRESETS.filter(p => p.group === g).map(p => {
                const k = 56 / Math.max(p.width, p.height)
                return (
                  <button key={p.id} onClick={() => start(p.width, p.height, p.label)} className={`flex flex-col items-center gap-3 rounded-xl bg-void-900/60 hover:bg-void-800 border border-void-800/70 px-3 pt-5 pb-3 ${focusRing}`}>
                    <span className="h-14 flex items-center"><span className="block rounded-[3px] bg-white/90" style={{ width: p.width * k, height: p.height * k }} /></span>
                    <span className="text-center"><span className="block text-[12.5px] font-medium">{p.label}</span><span className="block text-[11.5px] text-void-500 tabular-nums">{p.width} × {p.height}</span></span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        <section className="mt-10 pb-10">
          <h2 className="text-[13px] font-semibold text-void-200 mb-3">Custom size</h2>
          <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); start(Math.min(8000, Math.max(16, w)), Math.min(8000, Math.max(16, h))) }}>
            {([['Width', w, setW], ['Height', h, setH]] as const).map(([l, v, set]) => (
              <label key={l} className="block"><span className="block text-[12px] text-void-400 mb-1">{l} (px)</span>
                <input type="number" min={16} max={8000} value={v} onChange={e => set(Number(e.target.value))} className={`h-9 w-28 px-2.5 rounded-lg bg-void-900 border border-void-800 text-[13px] tabular-nums ${focusRing}`} /></label>
            ))}
            <Button type="submit" primary>Create design</Button>
          </form>
        </section>
      </div>
    </div>
  )
}
