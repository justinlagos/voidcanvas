import type { LayeredItem, LayeredPage } from '@/editor/io'
import { coverCrop, readBrief, textItem, wrap } from './drafts'
import type { Direction, Job } from './jobs'

// Direction sheets: what the client sees when you present a direction, as a PDF or as
// images for WhatsApp. Built as layered pages, so they can also open in the Editor.

const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255 }

/** The items inside a direction's frame on the board. */
export function inside(job: Job, d: Direction) {
  return job.board.filter(b => b.x + b.w / 2 >= d.x && b.x + b.w / 2 <= d.x + d.w && b.y + b.h / 2 >= d.y && b.y + b.h / 2 <= d.y + d.h)
}

/** A direction's palette: its swatches, then the strongest colours of its references. */
export function directionPalette(job: Job, d: Direction): string[] {
  if (d.palette?.length) return d.palette
  const items = inside(job, d)
  const out: string[] = items.filter(i => i.kind === 'swatch').map(i => (i as any).hex)
  let refs = items.filter(i => i.kind === 'ref').map(i => job.refs.find(r => r.id === (i as any).refId)).filter(Boolean)
  // An empty direction borrows the job's references, so it never opens colourless.
  if (!refs.length && !out.length) refs = job.refs
  const votes = new Map<string, number>()
  for (const r of refs) for (const p of r!.analysis?.palette ?? r!.palette.map(h => ({ hex: h, share: 0.2 }))) votes.set(p.hex, (votes.get(p.hex) ?? 0) + p.share)
  const far = (a: string, b: string) => [1, 3, 5].reduce((n, i) => n + Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)), 0) > 70
  for (const [h] of Array.from(votes.entries()).sort((a, b) => b[1] - a[1])) if (out.every(o => far(o, h))) out.push(h)
  return out.slice(0, 6)
}
export function directionFonts(job: Job, d: Direction) {
  const types = inside(job, d).filter(i => i.kind === 'type') as Extract<Job['board'][number], { kind: 'type' }>[]
  return { display: d.display ?? types[0]?.family ?? 'Montserrat', body: d.body ?? types[1]?.family ?? (types[0] && types[0].family !== 'Inter' ? 'Inter' : 'DM Sans') }
}

export async function directionSheet(job: Job, d: Direction, index: number, count: number, size: { width: number; height: number }): Promise<LayeredPage> {
  const W = size.width, H = size.height, portrait = H > W
  const pal = directionPalette(job, d)
  const dark = pal.slice().sort((a, b) => lum(a) - lum(b))[0] ?? '#111111'
  const bg = lum(dark) < 0.25 ? dark : '#111114'
  const ink = '#ffffff', mutedInk = 'rgba(255,255,255,0.62)'
  const f = directionFonts(job, d)
  const m = Math.round(Math.min(W, H) * 0.06)
  const items: LayeredItem[] = []
  const colW = portrait ? W - m * 2 : W * 0.42 - m
  items.push(textItem('Job', `${job.client ? job.client + ' · ' : ''}${job.name} · Direction ${String.fromCharCode(65 + index)} of ${count}`, f.body, 500, Math.round(m * 0.32), mutedInk, m, m, colW))
  const nameSize = Math.round(Math.min(W, H) * (portrait ? 0.1 : 0.085))
  items.push(textItem('Direction name', d.name || `Direction ${String.fromCharCode(65 + index)}`, f.display, 700, nameSize, ink, m, m * 1.8, colW, 'left', 1.02))
  const nameLines = wrap(d.name || 'Direction', f.display, 700, nameSize, colW).length
  let y = m * 1.8 + nameLines * nameSize * 1.05 + m * 0.35
  if (d.idea) {
    const s = Math.round(m * 0.42)
    items.push(textItem('Idea', d.idea, f.body, 400, s, mutedInk, m, y, colW, 'left', 1.45))
    y += wrap(d.idea, f.body, 400, s, colW).length * s * 1.45 + m * 0.35
  }
  if (d.keywords.length) { const s = Math.round(m * 0.3); items.push(textItem('Keywords', d.keywords.map(k => k.toUpperCase()).join('   '), f.body, 700, s, ink, m, y, colW, 'left', 1.4, s * 0.12)); y += s * 2.4 }
  // Palette.
  const sw = Math.min((colW - (pal.length - 1) * 10) / Math.max(1, pal.length), m * 1.6)
  pal.forEach((hex, i) => {
    items.push({ kind: 'shape', name: `Colour ${hex}`, shape: 'rect', x: Math.round(m + i * (sw + 10)), y: Math.round(y), w: Math.round(sw), h: Math.round(sw), fill: hex, stroke: Math.abs(lum(hex) - lum(bg)) < 0.08 ? 'rgba(255,255,255,0.3)' : null, strokeWidth: 1, radius: Math.round(sw * 0.12), rotation: 0, opacity: 1 })
    items.push(textItem(`Hex ${hex}`, hex.toUpperCase(), f.body, 500, Math.round(m * 0.22), mutedInk, m + i * (sw + 10), y + sw + m * 0.15, sw + 10))
  })
  y += sw + m * 0.8
  // Type specimen.
  const headline = readBrief(job.brief, job.name).headline || job.name
  const specS = Math.round(m * 0.9)
  items.push(textItem('Type specimen', headline, f.display, 700, specS, ink, m, y, colW, 'left', 1.05))
  y += wrap(headline, f.display, 700, specS, colW).length * specS * 1.08 + m * 0.2
  items.push(textItem('Type names', `${f.display} for headlines, ${f.body} for text`, f.body, 400, Math.round(m * 0.28), mutedInk, m, y, colW))
  y += m * 0.7
  // Notes the designer left inside the direction.
  const notes = inside(job, d).filter(i => i.kind === 'note').map(i => (i as any).text as string).filter(t => t && t !== 'Note')
  if (notes.length && !portrait) { const s = Math.round(m * 0.3); const t = notes.join('\n'); items.push(textItem('Notes', t, f.body, 400, s, mutedInk, m, y, colW, 'left', 1.45)) }
  // References collage.
  const refs = (inside(job, d).filter(i => i.kind === 'ref').map(i => job.refs.find(r => r.id === (i as any).refId)).filter(Boolean) as Job['refs']).slice(0, 6)
  const box = portrait ? { x: m, y: Math.max(y + m * 0.9, H * 0.58), w: W - m * 2, h: H - Math.max(y + m * 0.9, H * 0.58) - m } : { x: W * 0.46, y: m, w: W * 0.54 - m, h: H - m * 2 }
  if (refs.length && box.h > 40) {
    const cols = refs.length === 1 ? 1 : refs.length <= 4 ? 2 : 3, rows = Math.ceil(refs.length / cols), gap = Math.round(m * 0.2)
    const cw = Math.floor((box.w - gap * (cols - 1)) / cols), ch = Math.floor((box.h - gap * (rows - 1)) / rows)
    for (let i = 0; i < refs.length; i++) {
      const x = box.x + (i % cols) * (cw + gap), yy = box.y + Math.floor(i / cols) * (ch + gap)
      const k = Math.min(1, 2400 / Math.max(cw, ch))
      items.push({ kind: 'image', name: refs[i].name, blob: await coverCrop({ blob: refs[i].blob, width: refs[i].w, height: refs[i].h }, cw, ch), x, y: yy, scaleX: cw / Math.max(1, Math.round(cw * k)), scaleY: ch / Math.max(1, Math.round(ch * k)), opacity: 1 })
    }
  }
  return { name: d.name || `Direction ${String.fromCharCode(65 + index)}`, background: bg, items }
}
