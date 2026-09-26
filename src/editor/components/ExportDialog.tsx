'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Copy, Download } from 'lucide-react'
import { downloadBlob, exportBoards, exportVoidFile, renderFrame } from '../io'
import { exportBoards as boardList, formatRange, parseRange, resultLabel, scaleOptions, type ExportFormat } from '../export'
import { useEditor } from '../store'
import { Button, Modal, Slider, focusRing } from './ui'
import { noteExportForPrompt, track } from '@/lib/analytics'

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

  const chosen = picked.map(i => boards[i]).filter(Boolean)
  const scales = useMemo(() => scaleOptions(chosen.length ? chosen : [boards[activeIdx]]), [chosen.map(b => b.id).join(), boards, activeIdx]) // eslint-disable-line react-hooks/exhaustive-deps
  const k = scales.includes(scale) ? scale : scales[scales.length - 1] >= 1 ? 1 : scales[0]
  const canTransparent = format === 'png' || format === 'webp'
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
        downloadBlob(blob, name)
        track('export', { format, scale: k, boards: chosen.length }); noteExportForPrompt()
      }
      onClose()
    } catch {
      track('export.failed', { format, scale: k, boards: chosen.length })
      useEditor.getState().notify('Export failed. Try a smaller size.')
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

        <section aria-label="File type">
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-void-900 border border-void-800" role="radiogroup">
            {FORMATS.map(f => <button key={f.id} role="radio" aria-checked={format === f.id} className={seg(format === f.id)} onClick={() => setFormat(f.id)}>{f.label}</button>)}
          </div>
          <p className="mt-2 text-[12px] text-void-500">{FORMATS.find(f => f.id === format)!.help}</p>
        </section>

        <section aria-label="Size">
          <div className="flex items-center gap-3">
            <div className="flex gap-1 p-1 rounded-xl bg-void-900 border border-void-800" role="radiogroup">
              {scales.map(s => <button key={s} role="radio" aria-checked={k === s} className={`${seg(k === s)} px-3.5 tabular-nums`} onClick={() => setScale(s)}>{s}×</button>)}
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
