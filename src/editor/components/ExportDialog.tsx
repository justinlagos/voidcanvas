'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, ChevronDown, Copy, Download } from 'lucide-react'
import { exportPreflight, type Finding, type PreflightBoard, type PreflightLayer } from '@/lib/intelligence/preflight'
import { layerBounds } from '../engine'
import { fontAvailable } from './MoreDialogs'
import { downloadBlob, exportBoards, exportVoidFile, renderFrame } from '../io'
import { exportBoards as boardList, formatRange, parseRange, resultLabel, scaleOptions, type ExportFormat } from '../export'
import { useEditor } from '../store'
import { Button, Modal, Slider, focusRing } from './ui'
import { noteExportForPrompt, track } from '@/lib/analytics'

/** Where the file is going decides the settings. Advanced controls stay underneath. */
interface Preset { id: string; label: string; format: ExportFormat; scale: number; quality: number; transparent: boolean; help: string }
const PRESETS: Preset[] = [
  { id: 'social', label: 'PNG · Social', format: 'png', scale: 1, quality: 0.92, transparent: false, help: 'Board size, sharp, flat background. Instagram, WhatsApp, LinkedIn.' },
  { id: 'transparent', label: 'PNG · Transparent', format: 'png', scale: 1, quality: 0.92, transparent: true, help: 'Board colours left out, for placing on other work.' },
  { id: 'web', label: 'JPG · Web', format: 'jpeg', scale: 1, quality: 0.85, transparent: false, help: 'Small files for websites and email.' },
  { id: 'print', label: 'PDF · Print', format: 'pdf', scale: 1, quality: 0.95, transparent: false, help: 'One page per board at its own size. Studio delivery adds bleed and crop marks for print sizes.' },
  { id: 'proof', label: 'PDF · Client proof', format: 'pdf', scale: 0.5, quality: 0.8, transparent: false, help: 'Half size, lighter file, one page per board. For approvals, not production.' },
]

const FORMATS: { id: ExportFormat; label: string; help: string }[] = [
  { id: 'png', label: 'PNG', help: 'Sharpest. Keeps transparency.' },
  { id: 'jpeg', label: 'JPG', help: 'Smallest files for photos. No transparency.' },
  { id: 'webp', label: 'WEBP', help: 'Small files that keep transparency. Good for websites.' },
  { id: 'pdf', label: 'PDF', help: 'For printers and clients. One page per board, each at its own size.' },
]

// Remember the last choices while the app is open.
let last: { format: ExportFormat; scale: number; quality: number; pdfSplit: boolean; numbered: boolean } = { format: 'png', scale: 1, quality: 0.92, pdfSplit: false, numbered: true }

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const doc = useEditor(s => s.doc)!
  const activeFrameId = useEditor(s => s.activeFrameId)
  const boards = useMemo(() => boardList(doc), [doc])
  const multi = boards.length > 1
  const activeIdx = Math.max(0, boards.findIndex(b => b.id === activeFrameId))

  const [picked, setPicked] = useState<number[]>(() => [activeIdx])
  const [range, setRange] = useState(() => formatRange([activeIdx]))
  const [rangeBad, setRangeBad] = useState(false)
  const [format, setFormat] = useState<ExportFormat>(last.format)
  const [scale, setScale] = useState(last.scale)
  const [quality, setQuality] = useState(last.quality)
  const [transparent, setTransparent] = useState(false)
  const [pdfSplit, setPdfSplit] = useState(last.pdfSplit)
  const [numbered, setNumbered] = useState(last.numbered)
  const [more, setMore] = useState(false)
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const [preset, setPreset] = useState<string | null>(null)
  const applyPreset = (p: Preset) => { setPreset(p.id); setFormat(p.format); setScale(p.scale); setQuality(p.quality); setTransparent(p.transparent) }

  const chosen = picked.map(i => boards[i]).filter(Boolean)
  const canTransparent = format === 'png' || format === 'webp'
  const scales = useMemo(() => scaleOptions(chosen.length ? chosen : [boards[activeIdx]]), [chosen.map(b => b.id).join(), boards, activeIdx]) // eslint-disable-line react-hooks/exhaustive-deps
  const k = scales.includes(scale) ? scale : scale < 1 && preset === 'proof' ? scale : scales[scales.length - 1] >= 1 ? 1 : scales[0]
  // Preflight: what will happen to these boards at this size, said before the file is made.
  const layers = useEditor(s => s.layers)
  const [mmById, setMmById] = useState<Record<string, { w: number; h: number }>>({})
  useEffect(() => {
    // Print sizes come from the Studio job's formats when the design belongs to one.
    if (!doc.jobId) return
    import('@/studio/jobs').then(m => m.getJob(doc.jobId!)).then(j => { if (!j) return; const out: Record<string, { w: number; h: number }> = {}; for (const f of doc.frames ?? []) { const d = j.deliverables.find(x => x.id === f.deliverableId); if (d?.mm) out[f.id] = d.mm } setMmById(out) }).catch(() => {})
  }, [doc.jobId, doc.frames])
  const findings = useMemo<Finding[]>(() => {
    const pb: PreflightBoard[] = boards.map(b => ({ id: b.id, name: b.name, width: b.width, height: b.height, background: b.background, mm: mmById[b.id] ?? (doc.dpi && doc.dpi >= 150 ? { w: Math.round((b.width / doc.dpi) * 25.4), h: Math.round((b.height / doc.dpi) * 25.4) } : null) }))
    const pl: PreflightLayer[] = layers.map(l => { const bb = layerBounds(l, doc); const f = doc.frames?.find(x => x.id === l.frameId); const rel = f ? { x: bb.x - f.x, y: bb.y - f.y, w: bb.w, h: bb.h } : bb; return { id: l.id, name: l.name, type: l.type, visible: l.visible, frameId: l.frameId ?? (boards[0]?.id === '__doc' ? '__doc' : l.frameId), bounds: rel, pixels: l.type === 'raster' ? { w: l.canvas.width, h: l.canvas.height } : undefined, text: l.type === 'text' ? l.text : undefined, fontFamily: l.type === 'text' ? l.fontFamily : undefined, role: l.role ?? null } })
    const missing = Array.from(new Set(layers.filter(l => l.type === 'text' && l.visible).map(l => (l as any).fontFamily as string))).filter(f => f && !fontAvailable(f))
    return exportPreflight({ boards: pb, layers: pl, boardIds: chosen.map(b => b.id), format, scale: k, transparent: canTransparent && transparent, missingFonts: missing })
  }, [boards, layers, doc, chosen.map(b => b.id).join(), format, k, transparent, mmById]) // eslint-disable-line react-hooks/exhaustive-deps
  const [showAll, setShowAll] = useState(false)
  const working = !!progress

  const setPick = (idx: number[]) => { const s = Array.from(new Set(idx)).sort((a, b) => a - b); setPicked(s); setRange(formatRange(s)); setRangeBad(false) }
  const toggle = (i: number) => setPick(picked.includes(i) ? picked.filter(x => x !== i) : [...picked, i])
  const onRange = (v: string) => {
    setRange(v)
    const r = parseRange(v, boards.length)
    setRangeBad(!r && !!v.trim())
    if (r) setPicked(Array.from(new Set(r)).sort((a, b) => a - b))
  }

  const run = async (copy: boolean) => {
    if (!chosen.length) return
    last = { format, scale: k, quality, pdfSplit, numbered }
    setProgress([0, copy ? 1 : chosen.length])
    try {
      const { blob, name } = await exportBoards({ boardIds: chosen.map(b => b.id), format: copy ? 'png' : format, scale: k, quality, transparent: canTransparent && transparent, pdfSplit, numbered }, (d, t) => setProgress([d, t]))
      if (copy) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        useEditor.getState().notify('Copied. Paste it anywhere.')
        track('export', { format: 'clipboard', scale: k }); noteExportForPrompt()
      } else {
        import('../versions').then(m => m.saveVersion('Exported', true)).catch(() => {})
        downloadBlob(blob, name, { tracked: true })
        track('export', { format, scale: k, boards: chosen.length }); noteExportForPrompt()
      }
      onClose()
    } catch {
      track('export.failed', { format, scale: k, boards: chosen.length })
      const big = chosen.reduce((a, b) => Math.max(a, Math.max(b.width, b.height) * k), 0)
      useEditor.getState().notify(big > 8000 ? `Could not draw ${Math.round(big)} px on the long side. Export at ${Math.max(1, Math.floor(k / 2))}× or fewer boards at once.` : 'Export could not be written. Try one board at a time.')
    } finally { setProgress(null) }
  }

  const seg = (on: boolean) => `h-9 rounded-lg text-[13px] transition-colors ${focusRing} ${on ? 'bg-white text-void-950 font-medium' : 'text-void-300 hover:text-white hover:bg-white/[0.04]'}`
  const one = chosen[0]
  const sizeNote = chosen.length === 1 && one ? `${Math.round(one.width * k)} × ${Math.round(one.height * k)} px` : chosen.length > 1 ? `Each board at ${k}× its size` : ''

  return (
    <Modal title="Export" onClose={onClose} wide={multi}>
      <div className="p-5 space-y-6">
        {multi && (
          <section aria-label="Boards to export">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-void-900 border border-void-800" role="group" aria-label="Quick pick">
                <button className={`${seg(picked.length === 1 && picked[0] === activeIdx)} px-3`} onClick={() => setPick([activeIdx])}>This board</button>
                <button className={`${seg(picked.length === boards.length)} px-3`} onClick={() => setPick(boards.map((_, i) => i))}>All {boards.length}</button>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-void-400">
                Boards
                <input value={range} onChange={e => onRange(e.target.value)} placeholder="1-3, 5" aria-invalid={rangeBad}
                  className={`w-32 h-9 px-3 rounded-lg bg-surface-sunken border text-[13px] tabular-nums text-void-100 ${rangeBad ? 'border-rose-500/70' : 'border-white/[0.06]'} ${focusRing}`} />
              </label>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {boards.map((b, i) => {
                const on = picked.includes(i)
                return (
                  <button key={b.id} onClick={() => toggle(i)} aria-pressed={on} title={`${b.name}, ${b.width} × ${b.height}`}
                    className={`relative shrink-0 w-[120px] snap-start rounded-xl p-1.5 text-left border transition-colors ${focusRing} ${on ? 'border-accent bg-accent/10' : 'border-void-800 hover:border-void-600'}`}>
                    <div className="h-[76px] rounded-lg bg-void-950 overflow-hidden flex items-center justify-center"><Thumb id={b.id} /></div>
                    <span className={`absolute top-2.5 left-2.5 min-w-[20px] h-5 px-1 rounded-md text-[11px] font-semibold tabular-nums flex items-center justify-center ${on ? 'bg-accent text-white' : 'bg-black/60 text-void-200'}`}>{on ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
                    <span className="block mt-1.5 text-[11.5px] text-void-100 truncate">{i + 1}. {b.name}</span>
                    <span className="block text-[10.5px] text-void-500 tabular-nums">{b.width} × {b.height}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-1 text-[12px] text-void-500">{chosen.length ? `${chosen.length} of ${boards.length} boards` : 'Pick at least one board.'}</p>
          </section>
        )}

        <section aria-label="Where it is going">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => <button key={p.id} onClick={() => applyPreset(p)} aria-pressed={preset === p.id} className={`h-8 px-3 rounded-lg text-[12.5px] border transition-colors ${focusRing} ${preset === p.id ? 'border-accent bg-accent-soft text-white' : 'border-void-800 bg-void-900 text-void-300 hover:text-white'}`}>{p.label}</button>)}
          </div>
          <p className="mt-2 text-[12px] text-void-500">{preset ? PRESETS.find(p => p.id === preset)!.help : 'Pick where the file is going, or set the type and size yourself below.'}</p>
        </section>

        <section aria-label="File type">
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-void-900 border border-void-800" role="radiogroup">
            {FORMATS.map(f => <button key={f.id} role="radio" aria-checked={format === f.id} className={seg(format === f.id)} onClick={() => { setFormat(f.id); setPreset(null) }}>{f.label}</button>)}
          </div>
          <p className="mt-2 text-[12px] text-void-500">{FORMATS.find(f => f.id === format)!.help}</p>
        </section>

        <section aria-label="Size">
          <div className="flex items-center gap-3">
            <div className="flex gap-1 p-1 rounded-xl bg-void-900 border border-void-800" role="radiogroup">
              {scales.map(s => <button key={s} role="radio" aria-checked={k === s} className={`${seg(k === s)} px-3.5 tabular-nums`} onClick={() => { setScale(s); if (preset === 'proof') setPreset(null) }}>{s}×</button>)}
            </div>
            <span className="text-[12px] text-void-400 tabular-nums">{sizeNote}</span>
          </div>
        </section>

        <section>
          <button onClick={() => setMore(v => !v)} aria-expanded={more} className={`inline-flex items-center gap-1.5 text-[12.5px] text-void-400 hover:text-white rounded ${focusRing}`}>
            <ChevronDown size={14} className={`transition-transform ${more ? '' : '-rotate-90'}`} />More options
          </button>
          {more && (
            <div className="mt-3 space-y-3.5 pl-5">
              {format !== 'png' && <Slider label="Quality" value={Math.round(quality * 100)} min={40} max={100} unit="%" onChange={v => setQuality(v / 100)} />}
              {canTransparent && <Check2 on={transparent} set={setTransparent}>Transparent background (leave out board colours)</Check2>}
              {format === 'pdf' && chosen.length > 1 && (
                <div className="flex gap-1 p-1 rounded-xl bg-void-900 border border-void-800 w-fit" role="radiogroup" aria-label="PDF files">
                  <button role="radio" aria-checked={!pdfSplit} className={`${seg(!pdfSplit)} px-3`} onClick={() => setPdfSplit(false)}>One PDF</button>
                  <button role="radio" aria-checked={pdfSplit} className={`${seg(pdfSplit)} px-3`} onClick={() => setPdfSplit(true)}>A PDF per board</button>
                </div>
              )}
              {chosen.length > 1 && (format !== 'pdf' || pdfSplit) && <Check2 on={numbered} set={setNumbered}>Number files in board order (01, 02…)</Check2>}
            </div>
          )}
        </section>

        {findings.length > 0 && (
          <section aria-label="Before you export" data-preflight className="rounded-xl border border-void-800 bg-void-900/60 divide-y divide-void-800/70">
            {(showAll ? findings : findings.slice(0, 4)).map((f, i) => (
              <div key={i} className="flex items-start gap-2.5 px-3 py-2 text-[12.5px]">
                <span className={`mt-[3px] w-2 h-2 rounded-full shrink-0 ${f.level === 'attention' ? 'bg-rose-400' : f.level === 'check' ? 'bg-amber-300' : 'bg-emerald-400'}`} />
                <span className={`flex-1 leading-snug ${f.level === 'attention' ? 'text-void-100' : 'text-void-300'}`}>{f.text}</span>
                {f.layerId && <button onClick={() => { useEditor.getState().setActive(f.layerId!); if (f.boardId && f.boardId !== '__doc') useEditor.getState().setActiveFrame(f.boardId); onClose() }} className={`shrink-0 text-void-400 hover:text-white rounded ${focusRing}`}>{f.action ?? 'Select'}</button>}
                {!f.layerId && f.action === 'Review fonts' && <button onClick={() => { window.dispatchEvent(new CustomEvent('vc:open', { detail: { name: 'missingFonts', props: { fonts: [f.text.split(' is not')[0]] } } })); onClose() }} className={`shrink-0 text-void-400 hover:text-white rounded ${focusRing}`}>Review fonts</button>}
              </div>
            ))}
            {findings.length > 4 && <button onClick={() => setShowAll(v => !v)} className={`w-full text-left px-3 py-1.5 text-[12px] text-void-500 hover:text-white ${focusRing}`}>{showAll ? 'Fewer' : `${findings.length - 4} more`}</button>}
          </section>
        )}

        <div className="flex gap-2">
          <Button primary disabled={working || !chosen.length || rangeBad} onClick={() => run(false)} className="flex-1">
            <Download size={15} />{progress ? (progress[1] > 1 ? `Exporting ${progress[0]} of ${progress[1]}` : 'Exporting') : resultLabel(format, chosen.length, pdfSplit)}
          </Button>
          {chosen.length === 1 && <Button disabled={working} onClick={() => run(true)}><Copy size={15} />Copy</Button>}
        </div>

        <p className="text-[12px] text-void-500 -mt-2">
          Need to keep layers? <button onClick={() => { exportVoidFile().catch(() => useEditor.getState().notify('Could not save the project file.')); onClose() }} className={`underline underline-offset-2 hover:text-white rounded ${focusRing}`}>Download the project file (.void)</button>
        </p>
      </div>
    </Modal>
  )
}

function Check2({ on, set, children }: { on: boolean; set: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2.5 text-[13px] text-void-200 cursor-pointer">
      <input type="checkbox" checked={on} onChange={e => set(e.target.checked)} className="w-4 h-4 accent-[#8b7cff]" />
      {children}
    </label>
  )
}

/** Board thumbnails render one at a time after the dialog opens, so it opens instantly. */
let thumbQueue = Promise.resolve()
function Thumb({ id }: { id: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let live = true
    thumbQueue = thumbQueue.then(() => new Promise<void>(res => setTimeout(() => {
      if (live) {
        try {
          const b = useEditor.getState().doc?.frames?.find(f => f.id === id)
          const size = b ? Math.max(b.width, b.height) : Math.max(useEditor.getState().doc?.width ?? 1, useEditor.getState().doc?.height ?? 1)
          const c = renderFrame(id, Math.min(1, 220 / size), { preview: true })
          if (c) setUrl(c.toDataURL('image/jpeg', 0.7))
        } catch { /* leave blank */ }
      }
      res()
    }, 0)))
    return () => { live = false }
  }, [id])
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className="max-w-full max-h-full object-contain" /> : <span className="w-6 h-6 rounded-full border-2 border-void-700 border-t-void-400 animate-spin" />
}
