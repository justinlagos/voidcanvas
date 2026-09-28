import { ensureFont, idb, restoreStored, type StoredProject } from '@/editor/io'
import { makeCanvas, renderDoc } from '@/editor/engine'
import type { Doc, Frame, Group, Layer } from '@/editor/types'

// Render Editor designs from inside Studio, without opening the Editor.

export interface LoadedDesign { doc: Doc; layers: Layer[]; groups: Group[] }

export async function loadDesign(id: string | null | undefined): Promise<LoadedDesign | null> {
  if (!id) return null
  const p = await idb.get<StoredProject>('projects', id).catch(() => undefined)
  if (!p) return null
  return fromStored(p)
}

async function fromStored(p: StoredProject): Promise<LoadedDesign> {
  const { doc, layers, groups } = await restoreStored(p)
  // Thumbnails, mockups and delivered files must use the real fonts, not a stand-in.
  const want = new Map<string, [string, number, boolean]>()
  for (const l of layers) if (l.type === 'text') want.set(`${l.fontFamily}|${l.fontWeight}|${!!l.italic}`, [l.fontFamily, l.fontWeight, !!l.italic])
  await Promise.all(Array.from(want.values()).map(([f, w, i]) => ensureFont(f, w, i).catch(() => {})))
  try { await document.fonts.ready } catch { /* older browsers */ }
  return { doc, layers, groups }
}

/**
 * One board of a design on its own canvas. Only that board's layers are drawn. `full` runs filter layers at
 * the output size, as the Editor's export does; use it for files that leave Studio (delivery, review versions).
 */
export function renderBoard(d: LoadedDesign, frame: Frame | null, scale: number, full = false): HTMLCanvasElement {
  const { doc } = d
  if (!frame) {
    const c = makeCanvas(Math.max(1, Math.round(doc.width * scale)), Math.max(1, Math.round(doc.height * scale)))
    renderDoc(c, doc, d.layers, { groups: d.groups, scale, noCache: true, noShadow: true, fullRes: full })
    return c
  }
  const f0: Frame = { ...frame, x: 0, y: 0 }
  const sub: Doc = { ...doc, width: frame.width, height: frame.height, frames: [f0] }
  const layers = d.layers.filter(l => l.frameId === frame.id).map(l => ({ ...l, x: l.x - frame.x, y: l.y - frame.y }) as Layer)
  const c = makeCanvas(Math.max(1, Math.round(frame.width * scale)), Math.max(1, Math.round(frame.height * scale)))
  // Effects and filters on a board are worked out from the board itself, as the Editor draws and exports them.
  renderDoc(c, sub, layers, { groups: d.groups, scale, noCache: true, noShadow: true, fullRes: full })
  return c
}

export function boardsOf(d: LoadedDesign): Frame[] {
  return d.doc.frames?.length ? d.doc.frames : [{ id: '__doc', name: d.doc.name, x: 0, y: 0, width: d.doc.width, height: d.doc.height, background: d.doc.background }]
}
export const boardCanvas = (d: LoadedDesign, f: Frame, scale: number, full = false) => renderBoard(d, f.id === '__doc' ? null : f, scale, full)

/**
 * The boards a review version shows: every format and the master they come from (Studio formats and Editor
 * Cascade boards alike). A design with no formats shows all its boards. Loose working boards beside formats
 * are left out.
 */
export function reviewBoards(d: LoadedDesign): Frame[] {
  const all = boardsOf(d), frames = d.doc.frames ?? []
  if (!frames.some(f => f.linkedFrom || f.deliverableId)) return all
  const masters = new Set(frames.map(f => f.linkedFrom).filter(Boolean) as string[])
  return all.filter(f => f.deliverableId || f.linkedFrom || masters.has(f.id))
}

/** A design as it was in an Editor version (versions.ts), for delivering or comparing exactly that. */
export async function loadDesignVersion(versionId: string | null | undefined): Promise<LoadedDesign | null> {
  if (!versionId) return null
  const { versionProject } = await import('@/editor/versions')
  const p = await versionProject(versionId)
  if (!p) return null
  return fromStored(p)
}

export const toBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) => new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode'))), type, q))
export async function thumbUrl(c: HTMLCanvasElement, max = 480) {
  const k = Math.min(1, max / Math.max(c.width, c.height))
  const t = makeCanvas(Math.round(c.width * k), Math.round(c.height * k)); t.getContext('2d')!.drawImage(c, 0, 0, t.width, t.height)
  return t.toDataURL('image/jpeg', 0.82)
}
