import { canvasToBlob, downloadBlob } from '@/editor/io'
import { renderPage, PAGE_COUNT, SIZES, type Orientation } from './brand-pages'
import type { Brand } from './brandgen'

/** Render every page at print scale and assemble a real multi-page PDF, one page per slide. */
export async function exportBrandPdf(brand: Brand, logo: HTMLImageElement | null, o: Orientation, filename: string) {
  const size = SIZES[o]
  const jpegs: { blob: Blob; w: number; h: number }[] = []
  for (let i = 0; i < PAGE_COUNT; i++) {
    const c = await renderPage(i, brand, logo, o, 2)
    jpegs.push({ blob: await canvasToBlob(c, 'image/jpeg', 0.92), w: c.width, h: c.height })
  }
  // PDF points: fit the slide to a page of the same aspect, 96dpi baseline.
  const ptW = (size.w / 96) * 72, ptH = (size.h / 96) * 72
  downloadBlob(await assemble(jpegs, ptW, ptH), filename)
}

const enc = new TextEncoder()
async function assemble(pages: { blob: Blob; w: number; h: number }[], w: number, h: number): Promise<Blob> {
  const parts: (string | Uint8Array)[] = []; let pos = 0; const off: number[] = []
  const push = (p: string | Uint8Array) => { parts.push(p); pos += typeof p === 'string' ? enc.encode(p).length : p.length }
  const obj = (n: number, body: string) => { off[n] = pos; push(`${n} 0 obj\n${body}\nendobj\n`) }
  push('%PDF-1.4\n')
  const n = pages.length
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  const kids = Array.from({ length: n }, (_, i) => `${3 + i * 3} 0 R`).join(' ')
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`)
  for (let i = 0; i < n; i++) {
    const pageId = 3 + i * 3, imgId = pageId + 1, contId = pageId + 2
    const img = new Uint8Array(await pages[i].blob.arrayBuffer())
    obj(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w.toFixed(1)} ${h.toFixed(1)}] /Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contId} 0 R >>`)
    off[imgId] = pos; push(`${imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pages[i].w} /Height ${pages[i].h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`); push(img); push('\nendstream\nendobj\n')
    const content = `q ${w.toFixed(1)} 0 0 ${h.toFixed(1)} 0 0 cm /Im0 Do Q`
    obj(contId, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  }
  const xref = pos, maxId = 2 + n * 3
  push(`xref\n0 ${maxId + 1}\n0000000000 65535 f \n`)
  for (let i = 1; i <= maxId; i++) push((off[i] != null ? String(off[i]).padStart(10, '0') + ' 00000 n ' : '0000000000 00000 f ') + '\n')
  push(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)
  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}
