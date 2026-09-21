import { ctx2d, makeCanvas, renderDoc } from './engine'
import { nextRev, useEditor } from './store'
import type { Doc, Group, Layer } from './types'

// ─── IndexedDB ─────────────────────────────────────────────────────
// One local database shared by every module: Editor projects, Studio boards,
// and an inbox used to pass work from one module to another.

const DB = 'voidcanvas'
const STORES = ['projects', 'index', 'inbox', 'boards', 'brand'] as const
type StoreName = (typeof STORES)[number]

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 3)
    req.onupgradeneeded = () => { for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' }) }
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

async function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode)
    const r = fn(t.objectStore(store))
    t.oncomplete = () => { res(r.result); db.close() }
    t.onerror = () => { rej(t.error); db.close() }
  })
}

export const idb = {
  get: <T>(store: StoreName, id: string) => tx<T | undefined>(store, 'readonly', s => s.get(id)),
  all: <T>(store: StoreName) => tx<T[]>(store, 'readonly', s => s.getAll()),
  put: (store: StoreName, v: unknown) => tx(store, 'readwrite', s => s.put(v)),
  del: (store: StoreName, id: string) => tx(store, 'readwrite', s => s.delete(id)),
}

// ─── Handoff between modules ───────────────────────────────────────

export interface Handoff {
  id: string
  from: 'effects' | 'studio' | 'editor'
  name: string
  images: { name: string; blob: Blob }[]
  palette?: string[]
  size?: { width: number; height: number }
  note?: string
}

export async function sendHandoff(h: Omit<Handoff, 'id'>): Promise<string> {
  const id = 'h' + Date.now().toString(36)
  await idb.put('inbox', { ...h, id })
  return id
}

export async function takeHandoff(id: string): Promise<Handoff | undefined> {
  const h = await idb.get<Handoff>('inbox', id)
  if (h) await idb.del('inbox', id)
  return h
}

// ─── Images ────────────────────────────────────────────────────────

export const MAX_IMPORT = 4096

export function canvasToBlob(c: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Could not encode image'))), type, quality))
}

export async function blobToCanvas(blob: Blob, max = MAX_IMPORT): Promise<HTMLCanvasElement> {
  let src: ImageBitmap | HTMLImageElement
  try { src = await createImageBitmap(blob) } catch {
    src = await new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image(); const url = URL.createObjectURL(blob)
      img.onload = () => { URL.revokeObjectURL(url); res(img) }
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That file is not an image we can open.')) }
      img.src = url
    })
  }
  const k = Math.min(1, max / Math.max(src.width, src.height))
  const c = makeCanvas(src.width * k, src.height * k)
  const x = ctx2d(c); x.imageSmoothingQuality = 'high'
  x.drawImage(src, 0, 0, c.width, c.height)
  return c
}

/** Add image files to the open design, or start a design sized to the first image. */
export async function importFiles(files: File[] | Blob[], names?: string[]) {
  const ed = useEditor.getState()
  const special = (files as File[]).filter(f => /\.(psd|pdf)$/i.test((f as File).name || ''))
  if (special.length) { const { importAny } = await import('./import-formats'); importAny(special as File[]) }
  let i = 0
  for (const f of files) {
    if (/\.(psd|pdf)$/i.test((f as File).name || '')) { i++; continue }
    if (!f.type.startsWith('image/')) { ed.notify('Only image files, PSD or PDF can be added.'); continue }
    try {
      const c = await blobToCanvas(f)
      const name = names?.[i] ?? (f as File).name ?? 'Image'
      if (!useEditor.getState().doc) useEditor.getState().newDoc({ name: name.replace(/\.[a-z0-9]+$/i, ''), width: c.width, height: c.height, background: null })
      useEditor.getState().addImage(c, c.width, c.height, name)
    } catch (e) { ed.notify((e as Error).message) }
    i++
  }
}

// ─── Export ────────────────────────────────────────────────────────

export interface ExportOptions { format: 'png' | 'jpeg' | 'webp' | 'pdf'; scale: number; quality: number; transparent: boolean }

export async function exportImage(o: ExportOptions): Promise<Blob> {
  const { doc, layers, groups } = useEditor.getState()
  if (!doc) throw new Error('Nothing to export')
  const c = makeCanvas(doc.width * o.scale, doc.height * o.scale)
  renderDoc(c, doc, layers, { groups, scale: o.scale, noCache: true, transparent: o.transparent && o.format !== 'jpeg' })
  if (o.format === 'pdf') {
    const flat = makeCanvas(c.width, c.height); const x = ctx2d(flat)
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(c, 0, 0)
    return jpegToPdf(await canvasToBlob(flat, 'image/jpeg', Math.max(0.9, o.quality)), c.width, c.height, doc.width, doc.height)
  }
  if (o.format === 'jpeg' && !doc.background) {
    const flat = makeCanvas(c.width, c.height); const x = ctx2d(flat)
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(c, 0, 0)
    return canvasToBlob(flat, 'image/jpeg', o.quality)
  }
  return canvasToBlob(c, `image/${o.format}`, o.quality)
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

// ─── Projects ──────────────────────────────────────────────────────

export interface ProjectSummary { id: string; name: string; updatedAt: number; width: number; height: number; thumb: string; template?: boolean }
interface StoredProject { id: string; doc: Doc; layers: any[]; groups?: Group[]; swatches: string[]; blobs: Record<string, Blob> }

export async function saveProject(): Promise<void> {
  const { doc, layers, groups, swatches, markSaved } = useEditor.getState()
  if (!doc) return
  await saveDesign(doc, layers, groups, swatches)
  markSaved()
}

/** Save any design, open or not. Used for autosave, templates and resized copies. */
export async function saveDesign(doc: Doc, layers: Layer[], groups: Group[], swatches: string[], template = false): Promise<void> {
  const blobs: Record<string, Blob> = {}
  const meta = await Promise.all(layers.map(async l => {
    const { mask, ...rest } = l as any
    if (mask) blobs[l.id + ':mask'] = await canvasToBlob(mask)
    if (l.type === 'raster') { blobs[l.id] = await canvasToBlob(l.canvas); delete rest.canvas }
    return { ...rest, hasMask: !!mask }
  }))
  const k = Math.min(1, 360 / Math.max(doc.width, doc.height))
  const thumb = makeCanvas(doc.width * k, doc.height * k)
  renderDoc(thumb, doc, layers, { groups, scale: k, noCache: true })
  const stored: StoredProject = { id: doc.id, doc, layers: meta, groups, swatches, blobs }
  await idb.put('projects', stored)
  const summary: ProjectSummary = { id: doc.id, name: doc.name, updatedAt: Date.now(), width: doc.width, height: doc.height, thumb: thumb.toDataURL('image/jpeg', 0.7), template }
  await idb.put('index', summary)
}

export async function openProject(id: string, asCopy = false): Promise<boolean> {
  const p = await idb.get<StoredProject>('projects', id)
  if (!p) return false
  const layers: Layer[] = await Promise.all(p.layers.map(async m => {
    const { hasMask, ...rest } = m
    const l: any = { ...rest, rev: nextRev(), mask: hasMask && p.blobs[m.id + ':mask'] ? await blobToCanvas(p.blobs[m.id + ':mask'], 1e6) : null }
    if (m.type === 'raster') l.canvas = p.blobs[m.id] ? await blobToCanvas(p.blobs[m.id], 1e6) : makeCanvas(1, 1)
    return l as Layer
  }))
  const doc = asCopy ? { ...p.doc, id: 'd' + Date.now().toString(36), name: p.doc.name.replace(/ template$/i, '') } : p.doc
  useEditor.getState().loadProject(doc, layers, p.swatches, p.groups ?? [])
  if (asCopy) useEditor.setState({ dirty: true })
  return true
}

export const listProjects = async () => (await idb.all<ProjectSummary>('index')).sort((a, b) => b.updatedAt - a.updatedAt)
export async function deleteProject(id: string) { await idb.del('projects', id); await idb.del('index', id) }

// ─── Fonts ─────────────────────────────────────────────────────────

const FONT_SPECS: Record<string, string> = {
  Inter: ':wght@400;700', Poppins: ':ital,wght@0,400;0,700;1,400;1,700', Montserrat: ':ital,wght@0,400;0,700;1,400;1,700',
  'Space Grotesk': ':wght@400;700', 'DM Sans': ':ital,wght@0,400;0,700;1,400;1,700', 'Archivo Black': '', 'Bebas Neue': '',
  Oswald: ':wght@400;700', Anton: '', 'Playfair Display': ':ital,wght@0,400;0,700;1,400;1,700', 'DM Serif Display': ':ital@0;1',
  Lora: ':ital,wght@0,400;0,700;1,400;1,700', Fraunces: ':ital,wght@0,400;0,700;1,400;1,700', Caveat: ':wght@400;700',
  'Permanent Marker': '', 'JetBrains Mono': ':ital,wght@0,400;0,700;1,400;1,700',
}
export const FONTS = Object.keys(FONT_SPECS)
const loaded = new Set<string>(['Inter'])

export async function ensureFont(family: string, weight = 400, italic = false): Promise<void> {
  if (typeof document === 'undefined') return
  if (!loaded.has(family)) {
    loaded.add(family)
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}${FONT_SPECS[family] ?? ''}&display=swap`
    document.head.appendChild(link)
    await new Promise(r => { link.onload = r; link.onerror = r; setTimeout(r, 2500) })
  }
  try { await document.fonts.load(`${italic ? 'italic ' : ''}${weight} 32px "${family}"`) } catch { /* render with fallback */ }
}

// ─── PDF and ZIP, written by hand to avoid shipping a library ───────

const enc = new TextEncoder()

/** One-page PDF holding the design as a JPEG. Large designs are assumed to be print work at 300 dpi. */
async function jpegToPdf(jpeg: Blob, pxW: number, pxH: number, docW: number, docH: number): Promise<Blob> {
  const dpi = Math.max(docW, docH) > 2000 ? 300 : 96
  const w = ((docW / dpi) * 72).toFixed(2), h = ((docH / dpi) * 72).toFixed(2)
  const img = new Uint8Array(await jpeg.arrayBuffer())
  const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`
  const parts: (string | Uint8Array)[] = [], offsets: number[] = []
  let pos = 0
  const push = (p: string | Uint8Array) => { parts.push(p); pos += typeof p === 'string' ? enc.encode(p).length : p.length }
  const obj = (n: number, body: string) => { offsets[n] = pos; push(`${n} 0 obj\n${body}\nendobj\n`) }
  push('%PDF-1.4\n')
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`)
  offsets[4] = pos
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`); push(img); push('\nendstream\nendobj\n')
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  const xref = pos
  push(`xref\n0 6\n0000000000 65535 f \n` + [1, 2, 3, 4, 5].map(n => String(offsets[n]).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)
  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}

let crcTable: Uint32Array | null = null
function crc32(d: Uint8Array) {
  if (!crcTable) { crcTable = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c } }
  let c = 0xffffffff
  for (let i = 0; i < d.length; i++) c = crcTable[(c ^ d[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Uncompressed ZIP. Images are already compressed, so storing them is the right call. */
export async function zipFiles(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const out: Uint8Array[] = [], central: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const data = new Uint8Array(await f.blob.arrayBuffer()), name = enc.encode(f.name), crc = crc32(data)
    const head = new DataView(new ArrayBuffer(30))
    head.setUint32(0, 0x04034b50, true); head.setUint16(4, 20, true); head.setUint16(6, 0x0800, true)
    head.setUint32(14, crc, true); head.setUint32(18, data.length, true); head.setUint32(22, data.length, true); head.setUint16(26, name.length, true)
    const cen = new DataView(new ArrayBuffer(46))
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true)
    cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true); cen.setUint16(28, name.length, true); cen.setUint32(42, offset, true)
    out.push(new Uint8Array(head.buffer), name, data); central.push(new Uint8Array(cen.buffer), name)
    offset += 30 + name.length + data.length
  }
  const size = central.reduce((n, c) => n + c.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, size, true); end.setUint32(16, offset, true)
  return new Blob([...out, ...central, new Uint8Array(end.buffer)] as BlobPart[], { type: 'application/zip' })
}

// ─── Brand kit ─────────────────────────────────────────────────────

export interface BrandKit { id: 'default'; colors: string[]; fonts: string[]; logos: { id: string; name: string; blob: Blob }[] }
export const getBrand = async (): Promise<BrandKit> => (await idb.get<BrandKit>('brand', 'default')) ?? { id: 'default', colors: [], fonts: [], logos: [] }
export const saveBrand = (b: BrandKit) => idb.put('brand', b)
