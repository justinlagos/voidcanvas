'use client'

import { useState } from 'react'
import { LayoutGrid, Plus, Trash2, Copy, Wand2, RefreshCw } from 'lucide-react'
import { SIZE_PRESETS } from '../presets'
import { renderFrame } from '../io'
import { useEditor } from '../store'
import { Button, Modal, focusRing } from './ui'
import { cascadeToFrames, resyncVariants } from '../cascade'

/** Add, rename, delete boards, and cascade the active board to many touchpoints at once. */
export function BoardsPanel({ onClose }: { onClose: () => void }) {
  const doc = useEditor(s => s.doc)
  const activeFrameId = useEditor(s => s.activeFrameId)
  const s = useEditor.getState()
  const [tab, setTab] = useState<'boards' | 'cascade'>('boards')
  const [picked, setPicked] = useState<Set<string>>(new Set(['square', 'story', 'yt', 'li']))
  const [cw, setCw] = useState(1080), [ch, setCh] = useState(1080)
  const frames = doc?.frames ?? []

  return (
    <Modal title="Boards" onClose={onClose} wide>
      <div className="p-5">
        <div className="flex gap-4 mb-4" role="tablist">
          {(['boards', 'cascade'] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`text-[13px] font-semibold rounded ${focusRing} ${tab === t ? 'text-white' : 'text-void-500 hover:text-void-200'}`}>{t === 'boards' ? 'Boards' : 'Cascade to touchpoints'}</button>)}
        </div>

        {tab === 'boards' ? (
          <div>
            {!frames.length && <p className="text-[13px] text-void-400 mb-4">This design has one canvas. Add a board to turn it into a multi-board layout, then add more boards beside it.</p>}
            {frames.length > 1 && <button onClick={() => { s.organiseFrames(); onClose() }} className={`mb-3 inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-surface-sunken border border-white/[0.06] text-[12.5px] text-void-200 hover:text-white ${focusRing}`}><Wand2 size={14} />Organise boards into a clean grid</button>}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {frames.map(f => (
                <div key={f.id} className={`rounded-xl border p-2.5 ${f.id === activeFrameId ? 'border-accent' : 'border-void-800'}`}>
                  <button onClick={() => { s.setActiveFrame(f.id) }} className="block w-full aspect-video rounded-lg bg-void-950 overflow-hidden mb-2">
                    {/* thumbnail */}
                    <FrameThumb id={f.id} />
                  </button>
                  <input value={f.name} onChange={e => s.renameFrame(f.id, e.target.value)} className={`w-full h-7 px-2 rounded bg-surface-sunken border border-white/[0.06] text-[12px] ${focusRing}`} />
                  <div className="flex items-center justify-between mt-1.5 text-[11px] text-void-500">
                    <span className="flex items-center gap-1">
                      <input type="number" defaultValue={f.width} key={'w'+f.width} onBlur={e => { const v = Number(e.target.value); if (v > 0) s.setFrameSize(f.id, v, f.height) }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} className={`w-12 h-6 px-1 rounded bg-surface-sunken border border-white/[0.06] text-[11px] tabular-nums text-void-200 ${focusRing}`} aria-label="Board width" />
                      <span>×</span>
                      <input type="number" defaultValue={f.height} key={'h'+f.height} onBlur={e => { const v = Number(e.target.value); if (v > 0) s.setFrameSize(f.id, f.width, v) }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} className={`w-12 h-6 px-1 rounded bg-surface-sunken border border-white/[0.06] text-[11px] tabular-nums text-void-200 ${focusRing}`} aria-label="Board height" />
                    </span>
                    <span className="flex items-center gap-1.5">
                      {frames.some(x => x.linkedFrom === f.id) && <button aria-label="Re-sync variants" title="Update linked variants from this board" onClick={() => resyncVariants(f.id)} className="text-void-400 hover:text-white"><RefreshCw size={13} /></button>}
                      <button aria-label="Duplicate board" title="Duplicate board" onClick={() => s.duplicateFrame(f.id)} className="text-void-400 hover:text-white"><Copy size={13} /></button>
                      <button aria-label="Delete board" title="Delete board" onClick={() => { if (confirm(`Delete board “${f.name}”?`)) s.removeFrame(f.id) }} className="text-void-500 hover:text-rose-400"><Trash2 size={13} /></button>
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <p className="text-[12px] text-void-400 mb-2">Add a board</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SIZE_PRESETS.slice(0, 8).map(p => <button key={p.id} onClick={() => s.addFrame({ name: p.label, width: p.width, height: p.height })} className={`flex items-center gap-2 p-2 rounded-lg bg-void-900 hover:bg-void-800 border border-void-800 text-left ${focusRing}`}><Plus size={14} className="text-accent-light shrink-0" /><span className="text-[12px] truncate">{p.label}</span></button>)}
              </div>
              <div className="mt-3 flex items-end gap-2">
                <label className="block"><span className="block text-[11px] text-void-500 mb-1">Width</span><input type="number" value={cw} min={16} max={8000} onChange={e => setCw(Number(e.target.value))} className={`w-20 h-8 px-2 rounded-lg bg-surface-sunken border border-white/[0.06] text-[12px] tabular-nums ${focusRing}`} /></label>
                <label className="block"><span className="block text-[11px] text-void-500 mb-1">Height</span><input type="number" value={ch} min={16} max={8000} onChange={e => setCh(Number(e.target.value))} className={`w-20 h-8 px-2 rounded-lg bg-surface-sunken border border-white/[0.06] text-[12px] tabular-nums ${focusRing}`} /></label>
                <Button onClick={() => s.addFrame({ name: `${cw}×${ch}`, width: Math.min(8000, Math.max(16, cw)), height: Math.min(8000, Math.max(16, ch)) })}><Plus size={14} />Add custom board</Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[13px] text-void-400 mb-4">Take the active board and lay it out at every size you pick. Backgrounds fill, everything else keeps its place. New boards are added beside the current ones.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SIZE_PRESETS.map(p => { const on = picked.has(p.id); return (
                <button key={p.id} aria-pressed={on} onClick={() => setPicked(v => { const n = new Set(v); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n })} className={`flex items-center gap-2 p-2.5 rounded-lg border text-left ${focusRing} ${on ? 'border-accent bg-accent/10' : 'border-void-800 bg-void-900 hover:bg-void-800'}`}>
                  <span className="text-[12px] truncate"><span className="block font-medium">{p.label}</span><span className="block text-[11px] text-void-500 tabular-nums">{p.width}×{p.height}</span></span>
                </button>) })}
            </div>
            <Button primary className="mt-4" onClick={() => { cascadeToFrames(activeFrameId, SIZE_PRESETS.filter(p => picked.has(p.id))); onClose() }}><LayoutGrid size={15} />Create {picked.size} boards</Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

function FrameThumb({ id }: { id: string }) {
  const [url] = useState(() => { try { const c = renderFrame(id, 0.4); return c ? c.toDataURL('image/jpeg', 0.6) : '' } catch { return '' } })
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className="w-full h-full object-contain" /> : null
}
