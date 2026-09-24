import { ensureFont, idb, restoreStored, type StoredProject } from '@/editor/io'
import { makeCanvas, renderDoc } from '@/editor/engine'
import type { Doc, Frame, Group, Layer } from '@/editor/types'

// Render Editor designs from inside Studio, without opening the Editor.

export interface LoadedDesign { doc: Doc; layers: Layer[]; groups: Group[] }

export async function loadDesign(id: string | null | undefined): Promise<LoadedDesign | null> {
  if (!id) return null
  const p = await idb.get<StoredProject>('projects', id).catch(() => undefined)
  if (!p) return null
  const { doc, layers } = await restoreStored(p)
  // Thumbnails, mockups and delivered files must use the real fonts, not a stand-in.
  const want = new Map<string, [string, number, boolean]>()
  for (const l of layers) if (l.type === 'text') want.set(`${l.fontFamily}|${l.fontWeight}|${!!l.italic}`, [l.fontFamily, l.fontWeight, !!l.italic])
  await Promise.all(Array.from(want.values()).map(([f, w, i]) => ensureFont(f, w, i).catch(() => {})))
  try { await document.fonts.ready } catch { /* older browsers */ }
  return { doc, layers, groups: p.groups ?? [] }
}

/** One board of a design on its own canvas. Only that board's layers are drawn. */
export function renderBoard(d: LoadedDesign, frame: Frame | null, scale: number): HTMLCanvasElement {
  const { doc } = d
  if (!frame) {
    const c = makeCanvas(Math.max(1, Math.round(doc.width * scale)), Math.max(1, Math.round(doc.height * scale)))
    renderDoc(c, doc, d.layers, { groups: d.groups, scale, noCache: true, noShadow: true })
    return c
  }
  const f0: Frame = { ...frame, x: 0, y: 0 }
  const sub: Doc = { ...doc, width: frame.width, height: frame.height, frames: [f0] }
  const layers = d.layers.filter(l => l.frameId === frame.id).map(l => ({ ...l, x: l.x - frame.x, y: l.y - frame.y }) as Layer)
  const c = makeCanvas(Math.max(1, Math.round(frame.width * scale)), Math.max(1, Math.round(frame.height * scale)))
  renderDoc(c, sub, layers, { groups: d.groups, scale, noCache: true, noShadow: true })
  return c
}

export function boardsOf(d: LoadedDesign): Frame[] {
  return d.doc.frames?.length ? d.doc.frames : [{ id: '__doc', name: d.doc.name, x: 0, y: 0, width: d.doc.width, height: d.doc.height, background: d.doc.background }]
}
export const boardCanvas = (d: LoadedDesign, f: Frame, scale: number) => renderBoard(d, f.id === '__doc' ? null : f, scale)

export const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) => new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode'))), type, q))
export async function thumbUrl(c: HTMLCanvasElement, max = 480) {
  const k = Math.min(1, max / Math.max(c.width, c.height))
  const t = makeCanvas(Math.round(c.width * k), Math.round(c.height * k)); t.getContext('2d')!.drawImage(c, 0, 0, t.width, t.height)
  return t.toDataURL('image/jpeg', 0.82)
}
