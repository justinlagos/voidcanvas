import type { Doc, Frame } from './types'
import { pdfPageSize } from './export'

/** One source of physical size for PDF, TIFF, preflight and artwork bleed rendering. */
export function printGeometry(doc: Doc, boardId?: string | null, bleedMm = 0) {
  if (!Number.isFinite(bleedMm) || bleedMm < 0 || bleedMm > 30) throw Error('Bleed must be between 0 and 30 mm.')
  const board = boardId ? doc.frames?.find(f => f.id === boardId) : null
  if (boardId && !board) throw Error('Choose an existing print board.')
  const size = board ?? doc
  const page = pdfPageSize(size, doc.dpi ?? 300)
  if (!Number.isFinite(page.dpi) || page.dpi <= 0 || !Number.isFinite(page.w) || !Number.isFinite(page.h) || page.w <= 0 || page.h <= 0) throw Error('Set a valid print size and resolution.')
  const bleedPx = Math.ceil(bleedMm / 25.4 * page.dpi)
  const x = board?.x ?? 0, y = board?.y ?? 0
  return {
    board, dpi: page.dpi, bleedPx, trim: { width: size.width, height: size.height },
    trimMm: { widthMm: page.w / 72 * 25.4, heightMm: page.h / 72 * 25.4 },
    region: { x: x - bleedPx, y: y - bleedPx, w: size.width + 2 * bleedPx, h: size.height + 2 * bleedPx },
    expanded: board ? { ...board, x: x - bleedPx, y: y - bleedPx, width: size.width + 2 * bleedPx, height: size.height + 2 * bleedPx } as Frame : null,
  }
}
