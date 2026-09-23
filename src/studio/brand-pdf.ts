import { canvasToBlob, downloadBlob } from '@/editor/io'
import { eachPage, SIZES, type Orientation, type PageSpec } from './brand-pages'
import type { Brand } from './brand/tokens'
import type { LogoInfo } from './brand/logo'

// Two PDFs, both written by hand so no library ships to the browser.
// Screen: one page per slide at the slide's own aspect.
// Print: 300 dpi pages on a real trim size, 3 mm bleed, crop marks, TrimBox and BleedBox set.

const enc = new TextEncoder()
const PT = 72 / 25.4 // points per mm

interface Page { jpeg: Uint8Array; pxW: number; pxH: number; mediaW: number; mediaH: number; imgX: number; imgY: number; imgW: number; imgH: number; boxes?: string; extra?: string }

async function assemble(pages: Page[], withFont: boolean): Promise<Blob> {
  const parts: (string | Uint8Array)[] = []; let pos = 0; const off: number[] = []
  const push = (p: string | Uint8Array) => { parts.push(p); pos += typeof p === 'string' ? enc.encode(p).length : p.length }
  const obj = (n: number, body: string) => { off[n] = pos; push(`${n} 0 obj\n${body}\nendobj\n`) }
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  const n = pages.length, fontId = 3 + n * 3
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, `<< /Type /Pages /Kids [${Array.from({ length: n }, (_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${n} >>`)
  pages.forEach((p, i) => {
    const pageId = 3 + i * 3, imgId = pageId + 1, contId = pageId + 2
    const font = withFont ? ` /Font << /F1 ${fontId} 0 R >>` : ''
    obj(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.mediaW.toFixed(3)} ${p.mediaH.toFixed(3)}]${p.boxes ?? ''} /Resources << /XObject << /Im0 ${imgId} 0 R >>${font} >> /Contents ${contId} 0 R >>`)
    off[imgId] = pos
    push(`${imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.pxW} /Height ${p.pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`)
    push(p.jpeg); push('\nendstream\nendobj\n')
    const content = `q ${p.imgW.toFixed(3)} 0 0 ${p.imgH.toFixed(3)} ${p.imgX.toFixed(3)} ${p.imgY.toFixed(3)} cm /Im0 Do Q\n${p.extra ?? ''}`
    obj(contId, `<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream`)
  })
  let maxId = 2 + n * 3
  if (withFont) { obj(fontId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'); maxId = fontId }
  const xref = pos
  push(`xref\n0 ${maxId + 1}\n0000000000 65535 f \n`)
  for (let i = 1; i <= maxId; i++) push((off[i] != null ? String(off[i]).padStart(10, '0') + ' 00000 n ' : '0000000000 00000 f ') + '\n')
  push(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)
  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}

const jpegOf = async (c: HTMLCanvasElement, q: number) => new Uint8Array(await (await canvasToBlob(c, 'image/jpeg', q)).arrayBuffer())

/** Screen PDF: fit each slide to a page of the same aspect, 96 dpi baseline. */
export async function exportBrandPdf(brand: Brand, logo: LogoInfo | null, pages: PageSpec[], o: Orientation, filename: string) {
  const size = SIZES[o], w = (size.w / 96) * 72, h = (size.h / 96) * 72
  const out: Page[] = []
  await eachPage(pages, brand, logo, o, 2, async c => { out.push({ jpeg: await jpegOf(c, 0.92), pxW: c.width, pxH: c.height, mediaW: w, mediaH: h, imgX: 0, imgY: 0, imgW: w, imgH: h }) })
  downloadBlob(await assemble(out, false), filename)
}

export const PRINT_TRIM = { portrait: { w: 210, h: 297, label: 'A4 portrait, 210 × 297 mm' }, landscape: { w: 297, h: 297 * 9 / 16, label: '297 × 167 mm, 16:9' } }
const BLEED = 3, SLUG = 10

/** Grow a canvas by `b` px each side, repeating the edge pixels so full-bleed colour runs past the trim. */
function withBleed(src: HTMLCanvasElement, b: number) {
  const W = src.width, H = src.height
  const c = document.createElement('canvas'); c.width = W + b * 2; c.height = H + b * 2
  const x = c.getContext('2d')!
  x.imageSmoothingEnabled = false
  x.drawImage(src, 0, 0, W, 1, b, 0, W, b)            // top
  x.drawImage(src, 0, H - 1, W, 1, b, H + b, W, b)    // bottom
  x.drawImage(src, 0, 0, 1, H, 0, b, b, H)            // left
  x.drawImage(src, W - 1, 0, 1, H, W + b, b, b, H)    // right
  x.drawImage(src, 0, 0, 1, 1, 0, 0, b, b)            // corners
  x.drawImage(src, W - 1, 0, 1, 1, W + b, 0, b, b)
  x.drawImage(src, 0, H - 1, 1, 1, 0, H + b, b, b)
  x.drawImage(src, W - 1, H - 1, 1, 1, W + b, H + b, b, b)
  x.drawImage(src, b, b)
  return c
}

const ascii = (s: string) => s.normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, m => '\\' + m)

/** Print PDF: 300 dpi, 3 mm bleed, crop marks in registration, TrimBox and BleedBox for imposition. */
export async function exportPrintPdf(brand: Brand, logo: LogoInfo | null, pages: PageSpec[], o: Orientation, filename: string) {
  const trim = PRINT_TRIM[o], size = SIZES[o]
  const dpi = 300, pxTrimW = Math.round((trim.w / 25.4) * dpi)
  const scale = pxTrimW / size.w, bleedPx = Math.round((BLEED / 25.4) * dpi)
  const off = BLEED + SLUG // mm from media edge to trim
  const mediaW = (trim.w + off * 2) * PT, mediaH = (trim.h + off * 2) * PT
  const tx0 = off * PT, ty0 = off * PT, tx1 = (off + trim.w) * PT, ty1 = (off + trim.h) * PT
  const bx0 = SLUG * PT, by0 = SLUG * PT, bx1 = (off * 2 + trim.w - SLUG) * PT, by1 = (off * 2 + trim.h - SLUG) * PT
  const f = (n: number) => n.toFixed(3)
  const boxes = ` /TrimBox [${f(tx0)} ${f(ty0)} ${f(tx1)} ${f(ty1)}] /BleedBox [${f(bx0)} ${f(by0)} ${f(bx1)} ${f(by1)}]`

  // Crop marks start at the bleed edge and run 6 mm out, so they never print into the bleed.
  const gap = BLEED * PT, len = 6 * PT
  const marks: string[] = ['q 0.25 w 1 1 1 1 K']
  for (const [cx, sx] of [[tx0, -1], [tx1, 1]] as const) for (const [cy, sy] of [[ty0, -1], [ty1, 1]] as const) {
    marks.push(`${f(cx + sx * gap)} ${f(cy)} m ${f(cx + sx * (gap + len))} ${f(cy)} l S`)
    marks.push(`${f(cx)} ${f(cy + sy * gap)} m ${f(cx)} ${f(cy + sy * (gap + len))} l S`)
  }
  marks.push('Q')

  const out: Page[] = []
  await eachPage(pages, brand, logo, o, scale, async (page, title, i, count) => {
    const c = withBleed(page, bleedPx)
    const slug = ascii(`${brand.name} brand guidelines   Page ${i + 1} of ${count}: ${title}   Trim ${trim.w} x ${Math.round(trim.h * 10) / 10} mm   Bleed 3 mm   RGB images at 300 dpi. Convert with your printer's profile.`)
    const text = `BT /F1 6 Tf 0 0 0 1 k ${f(tx0)} ${f(SLUG * PT * 0.45)} Td (${slug}) Tj ET`
    out.push({ jpeg: await jpegOf(c, 0.95), pxW: c.width, pxH: c.height, mediaW, mediaH, imgX: bx0, imgY: by0, imgW: bx1 - bx0, imgH: by1 - by0, boxes, extra: marks.join('\n') + '\n' + text })
    c.width = 0; c.height = 0
  })
  downloadBlob(await assemble(out, true), filename)
}
