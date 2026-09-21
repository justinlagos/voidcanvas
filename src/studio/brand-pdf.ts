import { canvasToBlob, downloadBlob, ensureFont } from '@/editor/io'
import { onLight, type Brand } from './brandgen'

/** Draw the guideline straight to a tall canvas (no DOM screenshot, no library), then slice into A4 pages. */
export async function exportBrandPdf(brand: Brand, logo: HTMLImageElement | null, filename: string) {
  const b = brand
  await Promise.all([ensureFont(b.fonts.heading, 700), ensureFont(b.fonts.body, 400), ensureFont(b.fonts.body, 700)])
  const W = 1640, PAD = 80
  const c = document.createElement('canvas'); c.width = W; c.height = 6000
  const x = c.getContext('2d')!
  x.textBaseline = 'alphabetic'
  let y = 0
  const heading = (s: string, px: number, color: string) => { x.fillStyle = color; x.font = `700 ${px}px "${b.fonts.heading}", sans-serif`; x.fillText(s, PAD, y) }
  const body = (s: string, px: number, color: string, weight = 400, maxW = W - PAD * 2) => {
    x.fillStyle = color; x.font = `${weight} ${px}px "${b.fonts.body}", sans-serif`
    for (const line of wrap(x, s, maxW)) { x.fillText(line, PAD, y); y += px * 1.5 }
  }
  const rrect = (rx: number, ry: number, w: number, h: number, r: number) => { x.beginPath(); x.roundRect(rx, ry, w, h, r); }
  const sectionHead = (n: number, t: string) => { y += 70; x.strokeStyle = 'rgba(0,0,0,0.1)'; x.beginPath(); x.moveTo(PAD, y); x.lineTo(W - PAD, y); x.stroke(); y += 46; x.fillStyle = 'rgba(0,0,0,0.4)'; x.font = `500 22px "${b.fonts.body}"`; x.fillText(String(n).padStart(2, '0'), PAD, y); heading(t, 30, '#111'); y += 44 }

  // Cover
  const p0 = b.palette[0]; const cov = onLight(p0.hex) ? '#fff' : '#111'
  x.fillStyle = p0.hex; x.fillRect(0, 0, W, 560)
  y = 120
  if (logo) { const lh = 90, lw = (logo.width / logo.height) * lh; x.drawImage(logo, PAD, y - 40, Math.min(lw, 300), Math.min(lh, lh * (Math.min(lw, 300) / lw))) ; y += 90 } else { x.fillStyle = onLight(p0.hex) ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.15)'; rrect(PAD, y - 40, 90, 90, 18); x.fill(); y += 90 }
  x.fillStyle = cov; x.font = `600 26px "${b.fonts.body}"`; x.globalAlpha = 0.7; x.fillText('BRAND GUIDELINES', PAD, y); x.globalAlpha = 1; y += 90
  heading(b.name, 96, cov); y += 40
  if (b.tagline) { body(b.tagline, 30, cov); }
  y = 620
  x.fillStyle = 'rgba(0,0,0,0.5)'; body(`Personality: ${b.personality}. ${b.voice.tone}.`, 24, 'rgba(0,0,0,0.55)')

  // Colour
  sectionHead(1, 'Colour')
  const sw = (W - PAD * 2 - 60) / 4
  b.palette.forEach((col, i) => {
    const sx = PAD + i * (sw + 20)
    x.fillStyle = col.hex; rrect(sx, y, sw, 130, 12); x.fill()
    x.fillStyle = col.onLight ? '#fff' : '#111'; x.font = `600 20px "${b.fonts.body}"`; x.fillText(col.name, sx + 16, y + 110)
    x.fillStyle = '#111'; x.font = `500 18px monospace`; x.fillText(col.hex.toUpperCase(), sx, y + 165)
    col.tints.forEach((t, ti) => { x.fillStyle = t; rrect(sx + ti * (sw / 5), y + 180, sw / 5 - 4, 22, 5); x.fill() })
  })
  y += 240
  b.neutrals.forEach((nn, i) => { const nw = (W - PAD * 2 - 40) / 5; x.fillStyle = nn; rrect(PAD + i * (nw + 10), y, nw, 60, 10); x.fill() })
  y += 60; body('Primary carries the brand. Accent is for a single call to action per view. Neutrals build the layout.', 22, 'rgba(0,0,0,0.6)')

  // Typography
  sectionHead(2, 'Typography')
  b.scale.forEach(s => {
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.font = `400 18px "${b.fonts.body}"`; x.fillText(`${s.label} · ${s.px}`, PAD, y + 6)
    const useHead = s.label !== 'Body' && s.label !== 'Small'
    x.fillStyle = '#111'; x.font = `${s.weight} ${Math.min(s.px * 1.6, 72)}px "${useHead ? b.fonts.heading : b.fonts.body}"`
    x.fillText(`${b.name} ${b.voice.words[0]}`, PAD + 200, y + Math.min(s.px * 0.5, 24)); y += Math.min(s.px * 1.6, 72) + 22
  })
  y += 10; body(`Headings in ${b.fonts.heading}, body in ${b.fonts.body}. ${b.fonts.pairing}.`, 22, 'rgba(0,0,0,0.6)')

  // Voice
  sectionHead(3, 'Voice')
  body(b.voice.tone + '.', 28, '#111'); y += 20
  const colW = (W - PAD * 2 - 40) / 2
  const startY = y
  x.fillStyle = '#047857'; x.font = `600 20px "${b.fonts.body}"`; x.fillText('DO', PAD, y); y += 40
  b.voice.dos.forEach(d => { body('· ' + d, 22, 'rgba(0,0,0,0.7)', 400, colW) })
  const doEnd = y; y = startY
  x.fillStyle = '#be123c'; x.font = `600 20px "${b.fonts.body}"`; x.fillText("DON'T", PAD + colW + 40, y); y += 40
  const oldPad = PAD
  b.voice.donts.forEach(d => { x.fillStyle = 'rgba(0,0,0,0.7)'; x.font = `400 22px "${b.fonts.body}"`; for (const line of wrap(x, '· ' + d, colW)) { x.fillText(line, oldPad + colW + 40, y); y += 33 } })
  y = Math.max(doEnd, y) + 30

  const totalH = y + 60
  const doc = document.createElement('canvas'); doc.width = W; doc.height = totalH
  const dx = doc.getContext('2d')!; dx.fillStyle = '#fff'; dx.fillRect(0, 0, W, totalH); dx.drawImage(c, 0, 0)

  // slice to A4
  const pageW = 595, pageH = 842, scale = pageW / W, pageHpx = Math.floor(pageH / scale)
  const pages: Blob[] = []
  for (let yy = 0; yy < totalH; yy += pageHpx) {
    const h = Math.min(pageHpx, totalH - yy)
    const s = document.createElement('canvas'); s.width = W; s.height = pageHpx
    const sx = s.getContext('2d')!; sx.fillStyle = '#fff'; sx.fillRect(0, 0, W, pageHpx); sx.drawImage(doc, 0, yy, W, h, 0, 0, W, h)
    pages.push(await canvasToBlob(s, 'image/jpeg', 0.92))
  }
  downloadBlob(await assemble(pages, pageW, pageH, W * 2, pageHpx * 2), filename)
}

function wrap(x: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' '), lines: string[] = []; let line = ''
  for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w } else line = t }
  if (line) lines.push(line); return lines
}

const enc = new TextEncoder()
async function assemble(jpegs: Blob[], w: number, h: number, imgW: number, imgH: number): Promise<Blob> {
  const parts: (string | Uint8Array)[] = []; let pos = 0; const off: number[] = []
  const push = (p: string | Uint8Array) => { parts.push(p); pos += typeof p === 'string' ? enc.encode(p).length : p.length }
  const obj = (n: number, bdy: string) => { off[n] = pos; push(`${n} 0 obj\n${bdy}\nendobj\n`) }
  push('%PDF-1.4\n')
  const n = jpegs.length
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  const kids = Array.from({ length: n }, (_, i) => `${3 + i * 3} 0 R`).join(' ')
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`)
  for (let i = 0; i < n; i++) {
    const pageId = 3 + i * 3, imgId = pageId + 1, contId = pageId + 2
    const img = new Uint8Array(await jpegs[i].arrayBuffer())
    obj(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contId} 0 R >>`)
    off[imgId] = pos; push(`${imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`); push(img); push('\nendstream\nendobj\n')
    const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`
    obj(contId, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  }
  const xref = pos, maxId = 2 + n * 3
  push(`xref\n0 ${maxId + 1}\n0000000000 65535 f \n`)
  for (let i = 1; i <= maxId; i++) push((off[i] != null ? String(off[i]).padStart(10, '0') + ' 00000 n ' : '0000000000 00000 f ') + '\n')
  push(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)
  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}
