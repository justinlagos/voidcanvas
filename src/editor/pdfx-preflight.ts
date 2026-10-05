import type { Doc, Layer } from './types'
import { documentColour } from './document-colour'

export type PdfxFindingLevel = 'error' | 'warning' | 'info'
export interface PdfxFinding { code: string; level: PdfxFindingLevel; message: string; layerId?: string }
export interface PdfxPreflightOptions {
  boardId?: string | null
  bleedMm: number
  minDpi?: number
  requireCmykDocument?: boolean
}

export function pdfxPreflight(doc: Doc, layers: Layer[], opts: PdfxPreflightOptions): PdfxFinding[] {
  const out: PdfxFinding[] = []
  const minDpi = opts.minDpi ?? 250
  const dpi = doc.dpi ?? 300
  const colour = documentColour(doc)
  if (!doc.proof?.profile) out.push({ code: 'output-intent', level: 'error', message: 'Load the printer ICC profile before PDF/X-4 export.' })
  if (opts.requireCmykDocument && colour.model !== 'cmyk') out.push({ code: 'working-space', level: 'error', message: 'This production policy requires a native CMYK working document.' })
  if (colour.model === 'cmyk' && !colour.profile) out.push({ code: 'working-profile', level: 'error', message: 'The CMYK document has no embedded working ICC profile.' })
  if (opts.bleedMm < 0) out.push({ code: 'bleed-invalid', level: 'error', message: 'Bleed cannot be negative.' })
  else if (opts.bleedMm === 0) out.push({ code: 'bleed-none', level: 'warning', message: 'No bleed is set. Confirm this job does not require bleed.' })
  if (dpi < minDpi) out.push({ code: 'document-dpi', level: 'warning', message: `Document resolution is ${dpi} DPI; production policy recommends at least ${minDpi} DPI.` })
  if (opts.boardId && !doc.frames?.some(f => f.id === opts.boardId)) out.push({ code: 'board-missing', level: 'error', message: 'The selected board no longer exists.' })

  const scoped = opts.boardId ? layers.filter(l => l.frameId === opts.boardId) : layers
  scoped.forEach(l => {
    if (!l.visible) return
    if (l.type === 'text' && !l.text.trim()) out.push({ code: 'empty-text', level: 'warning', message: `Text layer “${l.name}” is empty.`, layerId: l.id })
    if (l.type === 'raster' && (!l.canvas || !l.canvas.width || !l.canvas.height)) out.push({ code: 'missing-raster', level: 'error', message: `Raster layer “${l.name}” has no usable pixels.`, layerId: l.id })
  })
  return out
}

export const pdfxBlocking = (findings: PdfxFinding[]) => findings.filter(x => x.level === 'error')
