'use client'
import { useState } from 'react'
import { useEditor } from '../store'
import { colourEngine, cmykPixels, encodeProfile, profileBytes } from '../colour'
import { cmykTiff } from '../cmyk-tiff'
import { makeCanvas, renderDoc } from '../engine'
import { downloadBlob, renderFrame } from '../io'
import { renderBudget } from '../performance'
import { preferredRecommendation, type PrintRegion } from '../print-profiles'
import { documentColour } from '../document-colour'
import { nativeIccEngine } from '../native-colour'
import { pdfxBlocking, pdfxPreflight, type PdfxFinding } from '../pdfx-preflight'
import { pdfx4FromCanvas } from '../pdfx4'
import { Button, Modal } from './ui'

export function ProofDialog({ onClose }: { onClose: () => void }) {
  const doc = useEditor((s) => s.doc),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [board, setBoard] = useState(useEditor.getState().activeFrameId ?? 'document'),
    [region, setRegion] = useState<PrintRegion>('uk-europe'),
    [bleed, setBleed] = useState(3),
    [findings, setFindings] = useState<PdfxFinding[]>([])
  if (!doc) return null
  const set = (proof: typeof doc.proof) => useEditor.getState().setDoc({ proof }, true)
  const setDpi = (dpi: number) => useEditor.getState().setDoc({ dpi }, true)
  const budget = renderBudget(doc.width, doc.height)
  const recommended = preferredRecommendation(region)
  const working = documentColour(doc)
  const load = async (file: File) => {
    setBusy(true); setError(''); const id = doc.id
    try {
      if (file.size > 8e6) throw Error('Profiles must be smaller than 8 MB.')
      const profile = encodeProfile(new Uint8Array(await file.arrayBuffer())), p = { profile, name: file.name, intent: 1 as const, enabled: true }
      await colourEngine(p); if (useEditor.getState().doc?.id === id) set(p)
    } catch (e) { setError(String((e as Error).message)) } finally { setBusy(false) }
  }
  const renderTarget = () => {
    const s = useEditor.getState(); let c: HTMLCanvasElement | null
    if (board !== 'document') c = renderFrame(board, 1, { transparent: false })
    else { c = makeCanvas(doc.width, doc.height); renderDoc(c, doc, s.layers, { groups: s.groups, noCache: true, fullRes: true }) }
    if (!c) throw Error('Choose an existing board.')
    return c
  }
  const exportPrint = async () => {
    if (!doc.proof) return
    setBusy(true); setError('')
    try {
      const c = renderTarget()
      const pixels = await cmykPixels(c, doc.proof), bytes = cmykTiff(c.width, c.height, pixels, profileBytes(doc.proof.profile), doc.dpi ?? 300)
      downloadBlob(new Blob([new Uint8Array(bytes).buffer], { type: 'image/tiff' }), doc.name.replace(/[^\w-]/g, '_') + '-CMYK.tif')
      c.width = 0; c.height = 0
    } catch (e) { setError(String((e as Error).message)) } finally { setBusy(false) }
  }
  const useAsWorkingCmyk = async () => {
    if (!doc.proof) return
    setBusy(true); setError('')
    try {
      const colour = {
        model: 'cmyk' as const,
        profile: doc.proof.profile,
        profileName: doc.proof.name,
        intent: doc.proof.intent === 0 ? 'perceptual' as const : 'relative-colorimetric' as const,
        blackPointCompensation: true,
        preserveBlack: true,
        maxInk: region === 'nigeria' ? 300 : recommended?.maxInk,
      }
      await nativeIccEngine(colour)
      useEditor.getState().setDoc({ colour }, true)
    } catch (e) { setError(String((e as Error).message)) } finally { setBusy(false) }
  }
  const exportPdfx = async () => {
    if (!doc.proof) return
    setBusy(true); setError('')
    try {
      const s = useEditor.getState()
      const next = pdfxPreflight(doc, s.layers, { boardId: board === 'document' ? null : board, bleedMm: bleed, minDpi: 250 })
      setFindings(next)
      const blocking = pdfxBlocking(next)
      if (blocking.length) throw Error(blocking.map(x => x.message).join(' '))
      const c = renderTarget()
      const blob = await pdfx4FromCanvas(c, doc.proof, { title: doc.name, profileName: doc.proof.name, dpi: doc.dpi ?? 300, bleedMm: bleed })
      downloadBlob(blob, doc.name.replace(/[^\w-]/g, '_') + '-PDFX4.pdf')
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
        <p className="text-sm text-void-400">Use the printer's ICC profile for proofing and production conversion. PDF/X-4 is generated as a colour-managed CMYK handoff with the loaded ICC embedded as its output intent; layered PSD remains the editable interchange path.</p>
        {budget.large && <p className="text-xs rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-amber-200">Large document: interactive previews use a bounded memory budget. Production exports still render at full resolution.</p>}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-void-300">Document resolution</span>
          {[72, 150, 300].map(dpi => <button key={dpi} onClick={() => setDpi(dpi)} className={`px-2.5 py-1 rounded text-xs border ${doc.dpi === dpi || (!doc.dpi && dpi === 300) ? 'border-accent text-white' : 'border-white/10 text-void-400'}`}>{dpi} DPI</button>)}
        </div>
        <div className="rounded-lg border border-white/10 p-3 space-y-2">
          <label className="block text-sm">Printer region / starting point <select aria-label="Printer region" className="bg-void-800 p-2 ml-2" value={region} onChange={(e) => setRegion(e.target.value as PrintRegion)}><option value="uk-europe">UK / Europe</option><option value="nigeria">Nigeria</option><option value="custom">Custom / printer supplied</option></select></label>
          {recommended ? <p className="text-xs text-void-400"><strong className="text-void-200">Suggested starting point:</strong> {recommended.profileName}. {recommended.description}</p> : <p className="text-xs text-void-400">Use the ICC profile supplied by the printer or print provider.</p>}
          <p className="text-xs text-amber-200">Regional choices are guidance only. VoidCanvas never silently converts through a guessed profile; the ICC file you load controls proofing and output.</p>
        </div>
        <label className="block">Printer ICC profile <input aria-label="Printer ICC profile" type="file" accept=".icc,.icm" disabled={busy} onChange={(e) => { if (e.target.files?.[0]) load(e.target.files[0]) }} /></label>
        {doc.proof && <>
          <p className="text-sm">Loaded output profile: {doc.proof.name}</p>
          <label className="flex gap-2"><input type="checkbox" checked={doc.proof.enabled} disabled={busy} onChange={(e) => set({ ...doc.proof!, enabled: e.target.checked })} />Soft proof on canvas</label>
          <label className="block">Rendering intent <select aria-label="Print intent" className="bg-void-800 p-2 ml-2" disabled={busy} value={doc.proof.intent} onChange={(e) => set({ ...doc.proof!, intent: Number(e.target.value) as 0 | 1 })}><option value={1}>Relative colorimetric, black point compensation</option><option value={0}>Perceptual, black point compensation</option></select></label>
          <div className="rounded-lg border border-white/10 p-3 flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-sm">Working space: {working.model.toUpperCase()} · {working.profileName}</p><p className="text-xs text-void-400">The document working space is saved in the .void project independently of the printer/output target.</p></div>
            <Button disabled={busy || working.model === 'cmyk' && working.profile === doc.proof.profile} onClick={useAsWorkingCmyk}>Use loaded profile as CMYK working space</Button>
          </div>
        </>}
        <label className="block">Production target <select aria-label="Print board" className="bg-void-800 p-2 ml-2" value={board} onChange={(e) => setBoard(e.target.value)}><option value="document">Whole document</option>{doc.frames?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <label className="block text-sm">PDF/X bleed <input aria-label="PDFX bleed" className="bg-void-800 p-2 ml-2 w-20" type="number" min={0} max={30} step={0.5} value={bleed} onChange={(e) => setBleed(Math.max(0, Number(e.target.value) || 0))} /> mm</label>
        {findings.length > 0 && <div className="rounded-lg border border-white/10 p-3 space-y-1"><p className="text-xs font-medium">PDF/X preflight</p>{findings.map((f, i) => <p key={`${f.code}-${i}`} className={`text-xs ${f.level === 'error' ? 'text-red-300' : f.level === 'warning' ? 'text-amber-200' : 'text-void-400'}`}>{f.message}</p>)}</div>}
        <p className="text-xs text-void-400">{doc.dpi ?? 300} DPI · CMYK TIFF and PDF/X-4 embed the selected output profile. OPFS is scratch only and is never the canonical project save.</p>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <div className="flex flex-wrap gap-2 justify-end">
          <Button onClick={onClose} disabled={busy}>Done</Button>
          <Button disabled={busy} onClick={exportPsd}>{busy ? 'Processing…' : 'Export layered PSD'}</Button>
          <Button disabled={!doc.proof || busy} onClick={exportPrint}>{busy ? 'Processing…' : 'Export CMYK TIFF'}</Button>
          <Button disabled={!doc.proof || busy} onClick={exportPdfx}>{busy ? 'Processing…' : 'Export PDF/X-4'}</Button>
        </div>
      </div>
    </Modal>
  )
}
