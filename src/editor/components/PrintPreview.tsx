'use client'

import { useEffect, useState } from 'react'
import { colourEngine, softProof } from '../colour'
import { renderPrintFrame } from '../io'
import { printGeometry } from '../print-geometry'
import { useEditor } from '../store'

/** Same board and bleed renderer as the handoff, bounded for interactive review. */
export function PrintPreview({ boardId, bleedMm }: { boardId: string | null; bleedMm: number }) {
  const doc = useEditor(s => s.doc)
  const rev = useEditor(s => s.docRev)
  const [preview, setPreview] = useState<{ doc: typeof doc; rev: number; boardId: string | null; bleedMm: number; url?: string; error?: string } | null>(null)
  useEffect(() => {
    if (!doc) return
    let cancelled = false
    const render = async () => {
      let source: HTMLCanvasElement | undefined, proofed: HTMLCanvasElement | undefined
      try {
        // Await the requested intent so an RGB preview is never labelled as a ready soft proof.
        if (doc.proof?.enabled) await colourEngine(doc.proof)
        if (cancelled) return
        source = renderPrintFrame(boardId, bleedMm, 960).canvas
        // CMYK handoffs composite transparency onto white before ICC conversion.
        const ctx = source.getContext('2d')!
        ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, source.width, source.height); ctx.restore()
        proofed = softProof(source, doc.proof)
        const url = proofed.toDataURL('image/png')
        if (!cancelled) setPreview({ doc, rev, boardId, bleedMm, url })
      } catch (e) {
        if (!cancelled) setPreview({ doc, rev, boardId, bleedMm, error: (e as Error).message })
      } finally {
        if (proofed && proofed !== source) { proofed.width = 0; proofed.height = 0 }
        if (source) { source.width = 0; source.height = 0 }
      }
    }
    void render()
    return () => { cancelled = true }
  }, [doc, rev, boardId, bleedMm])
  if (!doc) return null
  let geometry: ReturnType<typeof printGeometry>
  try { geometry = printGeometry(doc, boardId, bleedMm) } catch { return null }
  const current = preview?.doc === doc && preview.rev === rev && preview.boardId === boardId && preview.bleedMm === bleedMm ? preview : null
  const { region, trim, trimMm, bleedPx } = geometry
  const marginX = Math.min(trim.width / 2, 3 / trimMm.widthMm * trim.width)
  const marginY = Math.min(trim.height / 2, 3 / trimMm.heightMm * trim.height)
  const physicalBleedX = bleedMm / trimMm.widthMm * trim.width
  const physicalBleedY = bleedMm / trimMm.heightMm * trim.height
  return (
    <figure className="rounded-lg border border-white/10 p-3 space-y-2" aria-label="Print review">
      <figcaption className="flex flex-wrap justify-between gap-2 text-sm">
        <span>Print preview · {geometry.board?.name ?? 'Whole document'}</span>
        <span className="text-xs text-void-400">{doc.proof?.enabled ? `Soft proof · ${doc.proof.name}` : 'Original colours'}</span>
      </figcaption>
      {current?.error ? <p role="alert" className="text-sm text-red-300">Preview: {current.error}</p> : current?.url ? (
        <div className="relative mx-auto bg-white" style={{ width: '100%', maxWidth: 520, aspectRatio: `${region.w} / ${region.h}` }}>
          {/* The generated canvas is transient artwork, not a remote image asset. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.url} alt="Artwork with production bleed" className="block w-full h-full" />
          <svg viewBox={`0 0 ${region.w} ${region.h}`} className="absolute inset-0 w-full h-full pointer-events-none" role="img" aria-label="Bleed, trim and 3 mm safe area guides">
            <rect x={bleedPx - physicalBleedX} y={bleedPx - physicalBleedY} width={trim.width + 2 * physicalBleedX} height={trim.height + 2 * physicalBleedY} fill="none" stroke="#fb7185" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <rect x={bleedPx} y={bleedPx} width={trim.width} height={trim.height} fill="none" stroke="#0891b2" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <rect x={bleedPx + marginX} y={bleedPx + marginY} width={Math.max(0, trim.width - 2 * marginX)} height={Math.max(0, trim.height - 2 * marginY)} fill="none" stroke="#b45309" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      ) : <p role="status" className="text-xs text-void-400 py-6 text-center">Preparing print preview…</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="text-rose-300">Rose · {bleedMm} mm bleed edge</span>
        <span className="text-cyan-300">Cyan · trim</span>
        <span className="text-amber-200">Dashed · 3 mm safe area</span>
      </div>
      <p className="text-xs text-void-400">Guides are for review and stay out of exports. Check edge artwork and critical text before handing off to the printer.</p>
    </figure>
  )
}
