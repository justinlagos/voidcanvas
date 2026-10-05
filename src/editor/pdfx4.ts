import { cmykPixels, profileBytes } from './colour'
import type { Doc } from './types'

const enc = new TextEncoder()
const PT_PER_MM = 72 / 25.4
const pdfString = (s: string) => s.normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, m => `\\${m}`)
const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface Pdfx4Options {
  title: string
  profileName: string
  dpi: number
  bleedMm: number
}

function edgeBleed(src: HTMLCanvasElement, bleedPx: number) {
  if (bleedPx <= 0) return src
  const w = src.width, h = src.height
  const c = document.createElement('canvas'); c.width = w + bleedPx * 2; c.height = h + bleedPx * 2
  const x = c.getContext('2d')!
  x.imageSmoothingEnabled = false
  x.drawImage(src, 0, 0, w, 1, bleedPx, 0, w, bleedPx)
  x.drawImage(src, 0, h - 1, w, 1, bleedPx, h + bleedPx, w, bleedPx)
  x.drawImage(src, 0, 0, 1, h, 0, bleedPx, bleedPx, h)
  x.drawImage(src, w - 1, 0, 1, h, w + bleedPx, bleedPx, bleedPx, h)
  x.drawImage(src, 0, 0, 1, 1, 0, 0, bleedPx, bleedPx)
  x.drawImage(src, w - 1, 0, 1, 1, w + bleedPx, 0, bleedPx, bleedPx)
  x.drawImage(src, 0, h - 1, 1, 1, 0, h + bleedPx, bleedPx, bleedPx)
  x.drawImage(src, w - 1, h - 1, 1, 1, w + bleedPx, h + bleedPx, bleedPx, bleedPx)
  x.drawImage(src, bleedPx, bleedPx)
  return c
}

function xmpPacket(title: string, profileName: string) {
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/">\n<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:pdfxid="http://www.npes.org/pdfx/ns/id/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">\n<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xml(title)}</rdf:li></rdf:Alt></dc:title>\n<pdf:Producer>VoidCanvas</pdf:Producer>\n<pdfxid:GTS_PDFXVersion>PDF/X-4</pdfxid:GTS_PDFXVersion>\n<pdfxid:GTS_PDFXConformance>PDF/X-4</pdfxid:GTS_PDFXConformance>\n<dc:description><rdf:Alt><rdf:li xml:lang="x-default">Output intent: ${xml(profileName)}</rdf:li></rdf:Alt></dc:description>\n</rdf:Description></rdf:RDF></x:xmpmeta>\n<?xpacket end="w"?>`
}

/**
 * Writes a single-page, colour-managed raster PDF/X-4 handoff. Artwork is flattened to the selected printer
 * CMYK profile before writing, avoiding accidental DeviceRGB content. Editable/source fidelity belongs to .void/PSD.
 */
export async function pdfx4FromCanvas(src: HTMLCanvasElement, proof: NonNullable<Doc['proof']>, options: Pdfx4Options): Promise<Blob> {
  const dpi = Math.max(1, options.dpi)
  const bleedPx = Math.max(0, Math.round(options.bleedMm / 25.4 * dpi))
  const canvas = edgeBleed(src, bleedPx)
  const cmyk = await cmykPixels(canvas, proof)
  const icc = profileBytes(proof.profile)
  const trimW = src.width / dpi * 72, trimH = src.height / dpi * 72
  const bleedPt = Math.max(0, options.bleedMm) * PT_PER_MM
  const mediaW = trimW + bleedPt * 2, mediaH = trimH + bleedPt * 2
  const xmp = enc.encode(xmpPacket(options.title, options.profileName))

  const parts: (string | Uint8Array)[] = []
  const offsets: number[] = []
  let pos = 0
  const push = (p: string | Uint8Array) => { parts.push(p); pos += typeof p === 'string' ? enc.encode(p).length : p.length }
  const object = (id: number, body: string) => { offsets[id] = pos; push(`${id} 0 obj\n${body}\nendobj\n`) }
  const stream = (id: number, dict: string, bytes: Uint8Array) => {
    offsets[id] = pos; push(`${id} 0 obj\n<< ${dict} /Length ${bytes.length} >>\nstream\n`); push(bytes); push('\nendstream\nendobj\n')
  }

  push('%PDF-1.6\n%\xE2\xE3\xCF\xD3\n')
  object(1, '<< /Type /Catalog /Pages 2 0 R /Metadata 3 0 R /OutputIntents [4 0 R] >>')
  object(2, '<< /Type /Pages /Kids [6 0 R] /Count 1 >>')
  stream(3, '/Type /Metadata /Subtype /XML', xmp)
  object(4, `<< /Type /OutputIntent /S /GTS_PDFX /OutputConditionIdentifier (${pdfString(options.profileName)}) /Info (${pdfString(options.profileName)}) /RegistryName (http://www.color.org) /DestOutputProfile 5 0 R >>`)
  stream(5, '/N 4', icc)
  object(6, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${mediaW.toFixed(3)} ${mediaH.toFixed(3)}] /TrimBox [${bleedPt.toFixed(3)} ${bleedPt.toFixed(3)} ${(bleedPt + trimW).toFixed(3)} ${(bleedPt + trimH).toFixed(3)}] /BleedBox [0 0 ${mediaW.toFixed(3)} ${mediaH.toFixed(3)}] /Resources << /XObject << /Im0 7 0 R >> >> /Contents 8 0 R >>`)
  stream(7, `/Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace [/ICCBased 5 0 R] /BitsPerComponent 8`, cmyk)
  const content = enc.encode(`q ${mediaW.toFixed(3)} 0 0 ${mediaH.toFixed(3)} 0 0 cm /Im0 Do Q`)
  stream(8, '', content)
  object(9, `<< /Producer (VoidCanvas) /Title (${pdfString(options.title)}) /GTS_PDFXVersion (PDF/X-4) /Trapped /False >>`)

  const xref = pos
  push('xref\n0 10\n0000000000 65535 f \n')
  for (let i = 1; i <= 9; i++) push(`${String(offsets[i] ?? 0).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size 10 /Root 1 0 R /Info 9 0 R >>\nstartxref\n${xref}\n%%EOF`)
  if (canvas !== src) { canvas.width = 0; canvas.height = 0 }
  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}

/** Lightweight structural assertion for CI. Independent external validator fixtures remain the release authority. */
export function pdfx4StructureText(bytes: Uint8Array) {
  const text = new TextDecoder('latin1').decode(bytes)
  return {
    pdf16: text.startsWith('%PDF-1.6'),
    outputIntent: text.includes('/S /GTS_PDFX') && text.includes('/DestOutputProfile'),
    iccBased: text.includes('/ColorSpace [/ICCBased'),
    trimBox: text.includes('/TrimBox'),
    bleedBox: text.includes('/BleedBox'),
    xmp: text.includes('pdfxid:GTS_PDFXVersion') && text.includes('PDF/X-4'),
    noDeviceRgb: !text.includes('/DeviceRGB'),
  }
}
