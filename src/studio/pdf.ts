import { assemble, ascii, withBleed, type Page } from './brand-pdf'

// PDFs for Studio: review packs (screen) and print-ready formats (bleed, crop marks).

const PT = 72 / 25.4
const jpeg = async (c: HTMLCanvasElement, q: number) => new Uint8Array(await (await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', q))).arrayBuffer())

/** One page per canvas, each at its own aspect, 96 dpi baseline. */
export async function screenPdf(canvases: HTMLCanvasElement[]): Promise<Blob> {
  const pages: Page[] = []
  for (const c of canvases) {
    const w = (c.width / 96) * 72 * (c.width > 2400 ? 96 / 200 : 1), h = w * (c.height / c.width)
    pages.push({ jpeg: await jpeg(c, 0.9), pxW: c.width, pxH: c.height, mediaW: w, mediaH: h, imgX: 0, imgY: 0, imgW: w, imgH: h })
  }
  return assemble(pages, false)
}

/**
 * A print PDF: the art at its trim size in mm, 3 mm bleed made by extending the edges,
 * crop marks outside the bleed, TrimBox and BleedBox set, and a slug line.
 */
export async function printPdf(art: HTMLCanvasElement, trim: { w: number; h: number }, slug: string): Promise<Blob> {
  const BLEED = 3, SLUG = 10
  const pxPerMm = art.width / trim.w
  const bleedPx = Math.round(BLEED * pxPerMm)
  const c = withBleed(art, bleedPx)
  const off = BLEED + SLUG
  const mediaW = (trim.w + off * 2) * PT, mediaH = (trim.h + off * 2) * PT
  const tx0 = off * PT, ty0 = off * PT, tx1 = (off + trim.w) * PT, ty1 = (off + trim.h) * PT
  const bx0 = SLUG * PT, by0 = SLUG * PT, bx1 = (off * 2 + trim.w - SLUG) * PT, by1 = (off * 2 + trim.h - SLUG) * PT
  const f = (n: number) => n.toFixed(3)
  const boxes = ` /TrimBox [${f(tx0)} ${f(ty0)} ${f(tx1)} ${f(ty1)}] /BleedBox [${f(bx0)} ${f(by0)} ${f(bx1)} ${f(by1)}]`
  const gap = BLEED * PT, len = 6 * PT
  const marks: string[] = ['q 0.25 w 1 1 1 1 K']
  for (const [cx, sx] of [[tx0, -1], [tx1, 1]] as const) for (const [cy, sy] of [[ty0, -1], [ty1, 1]] as const) {
    marks.push(`${f(cx + sx * gap)} ${f(cy)} m ${f(cx + sx * (gap + len))} ${f(cy)} l S`)
    marks.push(`${f(cx)} ${f(cy + sy * gap)} m ${f(cx)} ${f(cy + sy * (gap + len))} l S`)
  }
  marks.push('Q')
  const text = `BT /F1 6 Tf 0 0 0 1 k ${f(tx0)} ${f(SLUG * PT * 0.45)} Td (${ascii(slug)}) Tj ET`
  const page: Page = { jpeg: await jpeg(c, 0.95), pxW: c.width, pxH: c.height, mediaW, mediaH, imgX: bx0, imgY: by0, imgW: bx1 - bx0, imgH: by1 - by0, boxes, extra: marks.join('\n') + '\n' + text }
  return assemble([page], true)
}
