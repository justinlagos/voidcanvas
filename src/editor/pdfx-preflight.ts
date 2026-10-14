import type { Doc, Group, Layer } from './types'
import { printGeometry } from './print-geometry'
import { layerBounds } from './engine'
import { documentColour } from './document-colour'

export type PdfxFindingLevel = 'error' | 'warning' | 'info'
export interface PdfxFinding { code: string; level: PdfxFindingLevel; message: string; layerId?: string }
export interface PdfxPreflightOptions {
  boardId?: string | null
  bleedMm: number
  minDpi?: number
  requireCmykDocument?: boolean
  groups?: Group[]
}

export function pdfxPreflight(doc: Doc, layers: Layer[], opts: PdfxPreflightOptions): PdfxFinding[] {
  const out: PdfxFinding[] = []
  const minDpi = opts.minDpi ?? 250
  let geometry: ReturnType<typeof printGeometry>
  try { geometry = printGeometry(doc, opts.boardId, opts.bleedMm) }
  catch (e) { return [{ code: 'print-geometry', level: 'error', message: (e as Error).message }] }
  const dpi = geometry.dpi
  const colour = documentColour(doc)
  if (!doc.proof?.profile) out.push({ code: 'output-intent', level: 'error', message: 'Load the printer ICC profile before PDF/X-4 export.' })
  if (opts.requireCmykDocument && colour.model !== 'cmyk') out.push({ code: 'working-space', level: 'error', message: 'This production policy requires a native CMYK working document.' })
  if (colour.model === 'cmyk' && !colour.profile) out.push({ code: 'working-profile', level: 'error', message: 'The CMYK document has no embedded working ICC profile.' })
  if (opts.bleedMm < 0) out.push({ code: 'bleed-invalid', level: 'error', message: 'Bleed cannot be negative.' })
  else if (opts.bleedMm === 0) out.push({ code: 'bleed-none', level: 'warning', message: 'No bleed is set. Confirm this job does not require bleed.' })
  if (dpi < minDpi) out.push({ code: 'document-dpi', level: 'warning', message: `Document resolution is ${dpi} DPI; production policy recommends at least ${minDpi} DPI.` })
  if (opts.boardId && !doc.frames?.some(f => f.id === opts.boardId)) out.push({ code: 'board-missing', level: 'error', message: 'The selected board no longer exists.' })

  const scoped = opts.boardId ? layers.filter(l => !l.frameId || l.frameId === opts.boardId) : layers
  scoped.forEach(l => {
    if (!l.visible || l.opacity <= 0) return
    let gid = l.groupId, guard = 0
    while (gid && guard++ < 64) {
      const g = opts.groups?.find(g => g.id === gid)
      if (!g) break
      if (!g.visible || g.opacity <= 0) return
      gid = g.parentId
    }
    if (l.type === 'raster' && l.canvas?.width && l.canvas?.height) {
      const effective = dpi / Math.max(Math.abs(l.scaleX), Math.abs(l.scaleY), 1e-9)
      if (effective < minDpi) out.push({ code: 'raster-dpi', level: 'warning', message: `Image “${l.name}” prints at ${Math.round(effective)} effective DPI; use a higher-resolution source or reduce its size.`, layerId: l.id })
    }
    if (l.type === 'text' || l.role === 'logo' || l.role === 'cta') {
      const b = layerBounds(l, doc), board = geometry.board
      const x = board?.x ?? 0, y = board?.y ?? 0, w = board?.width ?? doc.width, h = board?.height ?? doc.height
      const marginX = 3 / geometry.trimMm.widthMm * w, marginY = 3 / geometry.trimMm.heightMm * h
      if (b.x < x + marginX || b.y < y + marginY || b.x + b.w > x + w - marginX || b.y + b.h > y + h - marginY)
        out.push({ code: 'trim-safety', level: 'warning', message: `“${l.name}” is within 3 mm of the trim edge. Check cutting tolerance.`, layerId: l.id })
    }
    if (l.type === 'text' && !l.text.trim()) out.push({ code: 'empty-text', level: 'warning', message: `Text layer “${l.name}” is empty.`, layerId: l.id })
    if (l.type === 'raster' && (!l.canvas || !l.canvas.width || !l.canvas.height)) out.push({ code: 'missing-raster', level: 'error', message: `Raster layer “${l.name}” has no usable pixels.`, layerId: l.id })
  })
  return out
}

export const pdfxBlocking = (findings: PdfxFinding[]) => findings.filter(x => x.level === 'error')
