import { ctx2d, makeCanvas, renderDoc, uid } from './engine'
import { layoutFrames } from './frames'
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

// Private session: everything lives in memory only and is dropped when the tab closes.
// No project, board, or brand data is ever written to disk in this mode.
let PRIVATE = false
const mem = new Map<StoreName, Map<string, any>>(STORES.map(s => [s, new Map()]))
const clone = (v: any) => (typeof structuredClone === 'function' ? structuredClone(v) : v)

export function setPrivateMode(on: boolean) { PRIVATE = on; if (typeof sessionStorage !== 'undefined') { try { on ? sessionStorage.setItem('vc-private', '1') : sessionStorage.removeItem('vc-private') } catch { /* ignore */ } } }
export function isPrivate() { return PRIVATE }
export function initPrivateFromSession() { if (typeof sessionStorage !== 'undefined') { try { PRIVATE = sessionStorage.getItem('vc-private') === '1' } catch { /* ignore */ } } return PRIVATE }

export const idb = {
  get: <T>(store: StoreName, id: string): Promise<T | undefined> => PRIVATE ? Promise.resolve(clone(mem.get(store)!.get(id))) : tx<T | undefined>(store, 'readonly', s => s.get(id)),
  all: <T>(store: StoreName): Promise<T[]> => PRIVATE ? Promise.resolve(Array.from(mem.get(store)!.values()).map(clone)) : tx<T[]>(store, 'readonly', s => s.getAll()),
  put: (store: StoreName, v: any) => { if (PRIVATE) { mem.get(store)!.set(v.id, clone(v)); return Promise.resolve(undefined as any) } return tx(store, 'readwrite', s => s.put(v)) },
  del: (store: StoreName, id: string) => { if (PRIVATE) { mem.get(store)!.delete(id); return Promise.resolve(undefined as any) } return tx(store, 'readwrite', s => s.delete(id)) },
}

/** Wipe every trace on this device: the whole IndexedDB database and any in-memory session. */
export async function wipeEverything(): Promise<void> {
  Array.from(mem.values()).forEach(m => m.clear())
  if (typeof indexedDB === 'undefined') return
  try {
    await new Promise<void>((res) => { const r = indexedDB.deleteDatabase(DB); r.onsuccess = () => res(); r.onerror = () => res(); r.onblocked = () => res() })
  } catch { /* ignore */ }
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
  /** True when each image should become its own artboard. */
  boards?: boolean
  /** When set, add the image plus a live, re-editable filter layer on top (from a tool page). */
  liveEffect?: { effect: string; params: Record<string, number> }
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

/** Render one artboard (frame) to its own canvas at scale. */
export function renderFrame(frameId: string, scale = 1): HTMLCanvasElement | null {
  const { doc, layers, groups } = useEditor.getState()
  const f = doc?.frames?.find(x => x.id === frameId); if (!doc || !f) return null
  const full = makeCanvas(doc.width * scale, doc.height * scale)
  renderDoc(full, doc, layers, { groups, scale, noCache: true })
  const out = makeCanvas(f.width * scale, f.height * scale)
  ctx2d(out).drawImage(full, f.x * scale, f.y * scale, f.width * scale, f.height * scale, 0, 0, f.width * scale, f.height * scale)
  return out
}

export async function exportAllFrames(scale = 2): Promise<Blob> {
  const { doc } = useEditor.getState()
  if (!doc?.frames) throw new Error('No artboards')
  const files: { name: string; blob: Blob }[] = []
  for (const f of doc.frames) { const c = renderFrame(f.id, scale); if (c) files.push({ name: `${f.name.replace(/[^\w ]+/g, '') || 'board'}.png`, blob: await canvasToBlob(c) }) }
  return zipFiles(files)
}

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
  if (doc.frames?.length) useEditor.getState().loadFramed(doc, layers, p.swatches, p.groups ?? [])
  else useEditor.getState().loadProject(doc, layers, p.swatches, p.groups ?? [])
  if (asCopy) useEditor.setState({ dirty: true })
  return true
}

// ─── .void portable file (self-contained, no backend) ──────────────
// A .void file is the whole project as one JSON: metadata plus every asset base64-encoded inline.

const blobToBase64 = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1] ?? ''); r.onerror = rej; r.readAsDataURL(b) })
const base64ToBlob = (b64: string, type = 'image/png') => { const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type }) }

/** Serialize the current design (or a stored one) to a self-contained .void file and download it. */
export async function exportVoidFile(): Promise<void> {
  const { doc, layers, groups, swatches } = useEditor.getState()
  if (!doc) return
  const blobs: Record<string, string> = {}
  const meta = await Promise.all(layers.map(async (l: any) => {
    const { canvas, mask, rev, ...rest } = l
    if (mask) blobs[l.id + ':mask'] = await blobToBase64(await canvasToBlob(mask))
    if (l.type === 'raster' && canvas) blobs[l.id] = await blobToBase64(await canvasToBlob(canvas))
    return { ...rest, hasMask: !!mask }
  }))
  const bundle = { format: 'voidcanvas', version: 1, doc, layers: meta, groups, swatches, blobs }
  const json = JSON.stringify(bundle)
  downloadBlob(new Blob([json], { type: 'application/json' }), `${(doc.name || 'design').replace(/[^\w\- ]+/g, '')}.void`)
}

/** Load a .void file into the editor. */
export async function importVoidFile(file: File): Promise<boolean> {
  try {
    const bundle = JSON.parse(await file.text())
    if (bundle.format !== 'voidcanvas') { useEditor.getState().notify('That is not a Voidcanvas (.void) file.'); return false }
    const layers: Layer[] = await Promise.all((bundle.layers as any[]).map(async m => {
      const { hasMask, ...rest } = m
      const l: any = { ...rest, rev: nextRev(), mask: hasMask && bundle.blobs[m.id + ':mask'] ? await blobToCanvas(base64ToBlob(bundle.blobs[m.id + ':mask']), 1e6) : null }
      if (m.type === 'raster') l.canvas = bundle.blobs[m.id] ? await blobToCanvas(base64ToBlob(bundle.blobs[m.id]), 1e6) : makeCanvas(1, 1)
      return l as Layer
    }))
    const doc = { ...bundle.doc, id: 'd' + Date.now().toString(36) }
    if (doc.frames?.length) useEditor.getState().loadFramed(doc, layers, bundle.swatches, bundle.groups ?? [])
    else useEditor.getState().loadProject(doc, layers, bundle.swatches, bundle.groups ?? [])
    useEditor.getState().notify('Opened your .void file.')
    return true
  } catch { useEditor.getState().notify('Could not read that .void file.'); return false }
}

export const listProjects = async () => (await idb.all<ProjectSummary>('index')).sort((a, b) => b.updatedAt - a.updatedAt)
export async function deleteProject(id: string) { await idb.del('projects', id); await idb.del('index', id) }

/** Duplicate a stored project as a new independent copy (no editor open needed). */
export async function duplicateProject(id: string): Promise<ProjectSummary | null> {
  const p = await idb.get<StoredProject>('projects', id); if (!p) return null
  const nid = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  const copy: StoredProject = { ...p, id: nid, doc: { ...p.doc, id: nid, name: p.doc.name + ' copy' } }
  await idb.put('projects', copy)
  const old = await idb.get<ProjectSummary>('index', id)
  const summary: ProjectSummary = { ...(old as ProjectSummary), id: nid, name: copy.doc.name, updatedAt: Date.now() }
  await idb.put('index', summary)
  return summary
}

/** Render a stored project to a full-resolution PNG and download it, without opening the editor. */
export async function exportProjectPng(id: string): Promise<void> {
  const p = await idb.get<StoredProject>('projects', id); if (!p) return
  const layers: Layer[] = await Promise.all(p.layers.map(async (m: any) => {
    const { hasMask, ...rest } = m
    const l: any = { ...rest, rev: nextRev(), mask: hasMask && p.blobs[m.id + ':mask'] ? await blobToCanvas(p.blobs[m.id + ':mask'], 1e6) : null }
    if (m.type === 'raster') l.canvas = p.blobs[m.id] ? await blobToCanvas(p.blobs[m.id], 1e6) : makeCanvas(1, 1)
    return l as Layer
  }))
  const c = makeCanvas(p.doc.width, p.doc.height)
  renderDoc(c, p.doc, layers, { groups: p.groups ?? [], scale: 1, noCache: true })
  downloadBlob(await canvasToBlob(c), `${p.doc.name.replace(/[^\w\- ]+/g, '') || 'design'}.png`)
}

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

/** Build a framed document where each image is one artboard with one image layer. */
export function buildFramedFromImages(name: string, canvases: HTMLCanvasElement[], names: string[], size: { width: number; height: number }, palette?: string[]) {
  const { frames, width, height } = layoutFrames(canvases.map((c, i) => ({ name: names[i] || `Board ${i + 1}`, width: size.width, height: size.height, background: '#ffffff' })))
  const doc: Doc = { id: uid(), name, width, height, background: null, frames }
  const base = (nm: string) => ({ id: uid(), name: nm, visible: true, locked: false, opacity: 1, blend: 'source-over' as const, x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: true, groupId: null as string | null, rev: nextRev() })
  const layers: Layer[] = canvases.map((c, i) => {
    const f = frames[i]
    const k = Math.min(f.width / c.width, f.height / c.height)
    return { ...base(names[i] || `Art ${i + 1}`), type: 'raster', canvas: c, frameId: f.id, scaleX: k, scaleY: k, x: f.x + (f.width - c.width * k) / 2, y: f.y + (f.height - c.height * k) / 2 } as Layer
  })
  useEditor.getState().loadFramed(doc, layers, undefined, [])
  if (palette?.length) useEditor.setState({ swatches: Array.from(new Set([...palette, ...useEditor.getState().swatches])).slice(0, 21), fg: palette[0] })
}
