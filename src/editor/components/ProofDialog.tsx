'use client'
import { useState } from 'react'
import { useEditor } from '../store'
import { colourEngine, cmykPixels, encodeProfile, profileBytes } from '../colour'
import { cmykTiff } from '../cmyk-tiff'
import { makeCanvas, renderDoc } from '../engine'
import { downloadBlob, renderFrame } from '../io'
import { Button, Modal } from './ui'
export function ProofDialog({ onClose }: { onClose: () => void }) {
  const doc = useEditor((s) => s.doc),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [board, setBoard] = useState(useEditor.getState().activeFrameId ?? 'document')
  if (!doc) return null
  const set = (proof: typeof doc.proof) => useEditor.getState().setDoc({ proof }, true)
  const load = async (file: File) => {
    setBusy(true)
    setError('')
    const id = doc.id
    try {
      if (file.size > 8e6) throw Error('Profiles must be smaller than 8 MB.')
      const profile = encodeProfile(new Uint8Array(await file.arrayBuffer())),
        p = { profile, name: file.name, intent: 1 as const, enabled: true }
      await colourEngine(p)
      if (useEditor.getState().doc?.id === id) set(p)
    } catch (e) {
      setError(String((e as Error).message))
    } finally {
      setBusy(false)
    }
  }
  const exportPrint = async () => {
    if (!doc.proof) return
    setBusy(true)
    setError('')
    try {
      const s = useEditor.getState()
      let c: HTMLCanvasElement | null
      if (board !== 'document') c = renderFrame(board, 1, { transparent: false })
      else {
        c = makeCanvas(doc.width, doc.height)
        renderDoc(c, doc, s.layers, { groups: s.groups, noCache: true, fullRes: true })
      }
      if (!c) throw Error('Choose an existing board.')
      const pixels = await cmykPixels(c, doc.proof),
        bytes = cmykTiff(c.width, c.height, pixels, profileBytes(doc.proof.profile), doc.dpi ?? 300)
      downloadBlob(
        new Blob([new Uint8Array(bytes).buffer], { type: 'image/tiff' }),
        doc.name.replace(/[^\w-]/g, '_') + '-CMYK.tif',
      )
    } catch (e) {
      setError(String((e as Error).message))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Print proof and CMYK export" onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-sm text-void-400">
          Load the ICC profile supplied by your printer. The canvas previews sRGB through that printing
          condition. CMYK TIFF exports use the full ICC transform, embed the profile and record print
          resolution; transparency is flattened onto white.
        </p>
        <label className="block">
          Printer ICC profile
          <input
            aria-label="Printer ICC profile"
            type="file"
            accept=".icc,.icm"
            disabled={busy}
            onChange={(e) => {
              if (e.target.files?.[0]) load(e.target.files[0])
            }}
          />
        </label>
        {doc.proof && (
          <>
            <p className="text-sm">{doc.proof.name}</p>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={doc.proof.enabled}
                disabled={busy}
                onChange={(e) => set({ ...doc.proof!, enabled: e.target.checked })}
              />
              Soft proof on canvas
            </label>
            <label className="block">
              Rendering intent
              <select
                aria-label="Print intent"
                className="bg-void-800 p-2 ml-2"
                disabled={busy}
                value={doc.proof.intent}
                onChange={(e) => set({ ...doc.proof!, intent: Number(e.target.value) as 0 | 1 })}
              >
                <option value={1}>Relative colorimetric, black point compensation</option>
                <option value={0}>Perceptual, black point compensation</option>
              </select>
            </label>
          </>
        )}
        <label className="block">
          Export
          <select
            aria-label="Print board"
            className="bg-void-800 p-2 ml-2"
            value={board}
            onChange={(e) => setBoard(e.target.value)}
          >
            <option value="document">Whole document</option>
            {doc.frames?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-void-400">
          {doc.dpi ?? 300} DPI · 8-bit CMYK TIFF · embedded output profile. This is a proof and export
          workflow; the document stays editable in RGB.
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button onClick={onClose} disabled={busy}>
            Done
          </Button>
          <Button disabled={!doc.proof || busy} onClick={exportPrint}>
            {busy ? 'Processing…' : 'Export CMYK TIFF'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
