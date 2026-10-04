'use client'
import { useState } from 'react'
import { useEditor } from '../store'
import { colourEngine, cmykPixels, encodeProfile, profileBytes } from '../colour'
import { cmykTiff } from '../cmyk-tiff'
import { makeCanvas, renderDoc } from '../engine'
import { downloadBlob, renderFrame } from '../io'
import { renderBudget } from '../performance'
import { Button, Modal } from './ui'
export function ProofDialog({ onClose }: { onClose: () => void }) {
  const doc = useEditor((s) => s.doc),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [board, setBoard] = useState(useEditor.getState().activeFrameId ?? 'document')
  if (!doc) return null
  const set = (proof: typeof doc.proof) => useEditor.getState().setDoc({ proof }, true)
  const setDpi = (dpi: number) => useEditor.getState().setDoc({ dpi }, true)
  const budget = renderBudget(doc.width, doc.height)
  const load = async (file: File) => {
    setBusy(true); setError(''); const id = doc.id
    try {
      if (file.size > 8e6) throw Error('Profiles must be smaller than 8 MB.')
      const profile = encodeProfile(new Uint8Array(await file.arrayBuffer())), p = { profile, name: file.name, intent: 1 as const, enabled: true }
      await colourEngine(p); if (useEditor.getState().doc?.id === id) set(p)
    } catch (e) { setError(String((e as Error).message)) } finally { setBusy(false) }
  }
  const exportPrint = async () => {
    if (!doc.proof) return
    setBusy(true); setError('')
    try {
      const s = useEditor.getState(); let c: HTMLCanvasElement | null
      if (board !== 'document') c = renderFrame(board, 1, { transparent: false })
      else { c = makeCanvas(doc.width, doc.height); renderDoc(c, doc, s.layers, { groups: s.groups, noCache: true, fullRes: true }) }
      if (!c) throw Error('Choose an existing board.')
      const pixels = await cmykPixels(c, doc.proof), bytes = cmykTiff(c.width, c.height, pixels, profileBytes(doc.proof.profile), doc.dpi ?? 300)
      downloadBlob(new Blob([new Uint8Array(bytes).buffer], { type: 'image/tiff' }), doc.name.replace(/[^\w-]/g, '_') + '-CMYK.tif')
      c.width = 0; c.height = 0
    } catch (e) { setError(String((e as Error).message)) } finally { setBusy(false) }
  }
  const exportPsd = async () => {
    setBusy(true); setError('')
    try { const s = useEditor.getState(); const { downloadLayeredPsd } = await import('../psd-export'); downloadLayeredPsd(doc, s.layers, s.groups) }
    catch (e) { setError(`PSD export: ${String((e as Error).message)}`) } finally { setBusy(false) }
  }
  return (
    <Modal title="Production export" onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-sm text-void-400">Use a printer ICC profile for soft proof and true profile-based CMYK TIFF. For editable handoff, layered PSD keeps individual VoidCanvas layers and groups; unsupported live constructs are rasterised per layer, never as one flattened page.</p>
        {budget.large && <p className="text-xs rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-amber-200">Large document: interactive previews use a bounded memory budget. Production exports still render at full resolution.</p>}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-void-300">Document resolution</span>
          {[72, 150, 300].map(dpi => <button key={dpi} onClick={() => setDpi(dpi)} className={`px-2.5 py-1 rounded text-xs border ${doc.dpi === dpi || (!doc.dpi && dpi === 300) ? 'border-accent text-white' : 'border-white/10 text-void-400'}`}>{dpi} DPI</button>)}
        </div>
        <label className="block">Printer ICC profile <input aria-label="Printer ICC profile" type="file" accept=".icc,.icm" disabled={busy} onChange={(e) => { if (e.target.files?.[0]) load(e.target.files[0]) }} /></label>
        {doc.proof && <>
          <p className="text-sm">{doc.proof.name}</p>
          <label className="flex gap-2"><input type="checkbox" checked={doc.proof.enabled} disabled={busy} onChange={(e) => set({ ...doc.proof!, enabled: e.target.checked })} />Soft proof on canvas</label>
          <label className="block">Rendering intent <select aria-label="Print intent" className="bg-void-800 p-2 ml-2" disabled={busy} value={doc.proof.intent} onChange={(e) => set({ ...doc.proof!, intent: Number(e.target.value) as 0 | 1 })}><option value={1}>Relative colorimetric, black point compensation</option><option value={0}>Perceptual, black point compensation</option></select></label>
        </>}
        <label className="block">CMYK export target <select aria-label="Print board" className="bg-void-800 p-2 ml-2" value={board} onChange={(e) => setBoard(e.target.value)}><option value="document">Whole document</option>{doc.frames?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <p className="text-xs text-void-400">{doc.dpi ?? 300} DPI · 8-bit CMYK TIFF · embedded output profile. Editing remains RGB; the loaded profile controls proof and conversion.</p>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <div className="flex flex-wrap gap-2 justify-end">
          <Button onClick={onClose} disabled={busy}>Done</Button>
          <Button disabled={busy} onClick={exportPsd}>{busy ? 'Processing…' : 'Export layered PSD'}</Button>
          <Button disabled={!doc.proof || busy} onClick={exportPrint}>{busy ? 'Processing…' : 'Export CMYK TIFF'}</Button>
        </div>
      </div>
    </Modal>
  )
}
