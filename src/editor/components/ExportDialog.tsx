'use client'

import { useState } from 'react'
import { Copy, Download } from 'lucide-react'
import { downloadBlob, exportAllFrames, exportImage, exportVoidFile, exportVoidPng, type ExportOptions } from '../io'
import { useEditor } from '../store'
import { Button, Modal, Slider, focusRing } from './ui'

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const doc = useEditor(s => s.doc)!
  const hasFrames = !!doc.frames?.length
  const [o, setO] = useState<ExportOptions>({ format: 'png', scale: 1, quality: 0.92, transparent: !doc.background })
  const [working, setWorking] = useState(false)
  const max = Math.max(doc.width, doc.height)
  const scales = [0.5, 1, 2, 3].filter(k => max * k <= 8192)
  const opt = (on: boolean) => `h-9 px-3 rounded-lg text-[13px] ${focusRing} ${on ? 'bg-white text-void-950 font-medium' : 'bg-void-900 text-void-300 hover:text-white border border-void-800'}`

  const run = async (copy: boolean) => {
    setWorking(true)
    try {
      const blob = await exportImage(copy ? { ...o, format: 'png' } : o)
      if (copy) { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); useEditor.getState().notify('Copied. Paste it anywhere.') }
      else downloadBlob(blob, `${doc.name.replace(/[^\w\- ]+/g, '').trim() || 'design'}.${o.format === 'jpeg' ? 'jpg' : o.format}`)
      onClose()
    } catch { useEditor.getState().notify('Export failed. Try a smaller size.') } finally { setWorking(false) }
  }

  return (
    <Modal title="Export" onClose={onClose}>
      <div className="p-5 space-y-5">
        <div>
          <p className="text-[12px] text-void-400 mb-2">File type</p>
          <div className="flex gap-2">
            {(['png', 'jpeg', 'webp', 'pdf'] as const).map(f => <button key={f} className={opt(o.format === f)} onClick={() => setO({ ...o, format: f })} aria-pressed={o.format === f}>{f === 'jpeg' ? 'JPG' : f.toUpperCase()}</button>)}
          </div>
          <p className="mt-2 text-[12px] text-void-500">{o.format === 'png' ? 'Best quality. Keeps transparency.' : o.format === 'jpeg' ? 'Smallest file for photos. No transparency.' : o.format === 'pdf' ? 'For printers and clients. One page, image based, 300 dpi for print sizes.' : 'Small file that keeps transparency. Best for websites.'}</p>
        </div>
        <div>
          <p className="text-[12px] text-void-400 mb-2">Size</p>
          <div className="flex flex-wrap gap-2">
            {scales.map(k => <button key={k} className={opt(o.scale === k)} onClick={() => setO({ ...o, scale: k })} aria-pressed={o.scale === k}>{k}× <span className="opacity-60 tabular-nums">{Math.round(doc.width * k)} × {Math.round(doc.height * k)}</span></button>)}
          </div>
        </div>
        {o.format !== 'png' && <Slider label="Quality" value={Math.round(o.quality * 100)} min={40} max={100} unit="%" onChange={v => setO({ ...o, quality: v / 100 })} />}
        {o.format !== 'jpeg' && o.format !== 'pdf' && doc.background && (
          <label className="flex items-center gap-2.5 text-[13px] text-void-200 cursor-pointer">
            <input type="checkbox" checked={o.transparent} onChange={e => setO({ ...o, transparent: e.target.checked })} className="w-4 h-4 accent-[#8b7cff]" />
            Leave out the background colour
          </label>
        )}
        {hasFrames && (
          <button onClick={async () => { setWorking(true); try { downloadBlob(await exportAllFrames(2), `${doc.name.replace(/[^\w\- ]+/g, '') || 'boards'}.zip`); onClose() } catch { useEditor.getState().notify('Export failed.') } finally { setWorking(false) } }}
            className={`w-full mb-2 h-10 rounded-lg text-[13px] font-medium bg-void-800 text-void-100 hover:bg-void-700 ${focusRing}`}>Each board as its own PNG (zip)</button>
        )}
        <button onClick={async () => { setWorking(true); try { await exportVoidPng(); onClose() } catch { useEditor.getState().notify('Export failed.') } finally { setWorking(false) } }}
          className={`w-full mb-2 h-10 rounded-lg text-[13px] font-medium bg-void-800 text-void-100 hover:bg-void-700 ${focusRing}`}>Save editable file (.void.png, previews as your design, keeps layers)</button>
        <div className="flex gap-2 pt-1">
          <Button primary disabled={working} onClick={() => run(false)} className="flex-1"><Download size={15} />{working ? 'Exporting' : 'Download'}</Button>
          <Button disabled={working} onClick={() => run(true)}><Copy size={15} />Copy image</Button>
        </div>
      </div>
    </Modal>
  )
}
