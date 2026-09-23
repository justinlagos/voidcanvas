'use client'

import { useEffect, useState } from 'react'
import { HardDrive, ShieldCheck } from 'lucide-react'
import { historyMemoryMB, useEditor } from '../store'
import { useUi } from '../ui-store'
import { TOOLS } from './ToolRail'
import { stageApi } from './Stage'
import { focusRing } from './ui'

function docMemoryMB() {
  const s = useEditor.getState(); const seen = new Set<HTMLCanvasElement>(); let n = 0
  const add = (c?: HTMLCanvasElement | null) => { if (c && !seen.has(c)) { seen.add(c); n += c.width * c.height * 4 } }
  for (const l of s.layers) { add(l.mask); if (l.type === 'raster') add(l.canvas) }
  add(s.selection)
  return Math.round(n / 1048576)
}

/** Bottom bar: zoom you can type into, document size, pointer position, memory, and where the work is saved. */
export function StatusBar() {
  const show = useUi(s => s.showStatusBar)
  const doc = useEditor(s => s.doc)
  const zoom = useEditor(s => s.view.zoom)
  const pointer = useEditor(s => s.pointer)
  const tool = useEditor(s => s.tool)
  const dirty = useEditor(s => s.dirty)
  const docRev = useEditor(s => s.docRev)
  const [mem, setMem] = useState({ doc: 0, hist: 0, quota: '' })
  const [z, setZ] = useState<string | null>(null)
  useEffect(() => {
    const t = setTimeout(async () => {
      let quota = ''
      try { const e = await navigator.storage?.estimate?.(); if (e?.usage != null && e.quota) quota = `${Math.round(e.usage / 1048576)} MB of ${Math.round(e.quota / 1073741824)} GB stored` } catch { /* ignore */ }
      setMem({ doc: docMemoryMB(), hist: historyMemoryMB(useEditor.getState().history), quota })
    }, 600)
    return () => clearTimeout(t)
  }, [docRev])
  if (!show || !doc) return null
  const hint = TOOLS.find(t => t.id === tool)?.hint
  return (
    <footer className="vc-chrome hidden md:flex h-7 shrink-0 items-center gap-4 px-3 border-t border-white/[0.06] bg-surface-raised text-[11.5px] text-void-400 tabular-nums">
      <label className="flex items-center gap-1">
        <input aria-label="Zoom percentage" value={z ?? String(Math.round(zoom * 100))} onFocus={e => { setZ(String(Math.round(zoom * 100))); e.target.select() }}
          onChange={e => setZ(e.target.value)} onBlur={() => setZ(null)}
          onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { const v = parseFloat(z ?? ''); if (v > 0) stageApi.zoomTo(v / 100); (e.target as HTMLInputElement).blur() } if (e.key === 'Escape') (e.target as HTMLInputElement).blur() }}
          className={`w-12 h-5 px-1 rounded bg-transparent hover:bg-void-900 focus:bg-void-900 text-right text-void-200 ${focusRing}`} />%
      </label>
      <span>{doc.width} × {doc.height} px{doc.dpi ? ` · ${doc.dpi} dpi` : ''} · RGB 8-bit</span>
      <span className="w-28">{pointer ? `X ${Math.round(pointer.x)}  Y ${Math.round(pointer.y)}` : ''}</span>
      <span className="flex items-center gap-1" title={`Layers ${mem.doc} MB, undo history ${mem.hist} MB${mem.quota ? '. ' + mem.quota : ''}`}><HardDrive size={11} />{mem.doc + mem.hist} MB in use</span>
      {hint && <span className="truncate text-void-500">{hint}</span>}
      <span className="ml-auto flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-500" />{dirty ? 'Saving on this device' : 'Saved on this device'}</span>
    </footer>
  )
}
