import { ctx2d, makeCanvas, renderDoc, uid } from './engine'
import { layoutFrames } from './frames'
import { nextRev, useEditor } from './store'
import type { Doc, Group, Layer, TextLayer } from './types'

// ─── IndexedDB ─────────────────────────────────────────────────────
// One local database shared by every module: Editor projects, Studio boards,
// and an inbox used to pass work from one module to another.

const DB = 'voidcanvas'
const STORES = ['projects', 'index', 'inbox', 'boards', 'brand', 'versions', 'versionIndex', 'jobs', 'brands', 'looks'] as const
export type StoreName = (typeof STORES)[number]

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 5)
    req.onupgradeneeded = () => { for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' }) }
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

async function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((res, rej) => {
    let done = false
    const fail = (e: DOMException | null) => {
      if (done) return; done = true; db.close()
      // Safari can abort with a null error. Always reject with something readable.
      const quota = e?.name === 'QuotaExceededError'
      rej(new Error(quota ? 'Browser storage is full. Clear old designs from the home screen and try again.' : `Could not save to browser storage${e?.message ? `: ${e.message}` : '.'}`))
    }
    let t: IDBTransaction
    try { t = db.transaction(store, mode) } catch (e) { fail(e as DOMException); return }
    let r: IDBRequest<T>
    try { r = fn(t.objectStore(store)) } catch (e) { fail(e as DOMException); return }
    t.oncomplete = () => { if (done) return; done = true; res(r.result); db.close() }
    t.onerror = () => fail(t.error ?? r.error)
    t.onabort = () => fail(t.error ?? r.error)
  })
}

// Safari cannot always store Blob objects in IndexedDB. Every Blob is written as an
// ArrayBuffer with its type (and file name) and turned back into a Blob when read.
// Records written by older versions, with real Blobs inside, still read as before.
interface PackedBlob { __vcBlob: ArrayBuffer; type: string; name?: string }
async function pack(v: any): Promise<any> {
  if (typeof Blob !== 'undefined' && v instanceof Blob) {
    const out: PackedBlob = { __vcBlob: await v.arrayBuffer(), type: v.type }
    if (typeof File !== 'undefined' && v instanceof File) out.name = v.name
    return out
  }
  if (Array.isArray(v)) return Promise.all(v.map(pack))
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    const o: Record<string, any> = {}
    for (const k of Object.keys(v)) o[k] = await pack(v[k])
    return o
  }
  return v
}
function unpack(v: any): any {
  if (v && typeof v === 'object') {
    if (v.__vcBlob instanceof ArrayBuffer) {
      const p = v as PackedBlob
      return p.name && typeof File !== 'undefined' ? new File([p.__vcBlob], p.name, { type: p.type }) : new Blob([p.__vcBlob], { type: p.type })
    }
    if (Array.isArray(v)) return v.map(unpack)
    if (Object.getPrototypeOf(v) === Object.prototype) { for (const k of Object.keys(v)) v[k] = unpack(v[k]); return v }
  }
  return v
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
  get: <T>(store: StoreName, id: string): Promise<T | undefined> => PRIVATE ? Promise.resolve(clone(mem.get(store)!.get(id))) : tx<T | undefined>(store, 'readonly', s => s.get(id)).then(unpack),
  all: <T>(store: StoreName): Promise<T[]> => PRIVATE ? Promise.resolve(Array.from(mem.get(store)!.values()).map(clone)) : tx<T[]>(store, 'readonly', s => s.getAll()).then(unpack),
  put: async (store: StoreName, v: any) => { if (PRIVATE) { mem.get(store)!.set(v.id, clone(v)); return undefined as any } const packed = await pack(v); return tx(store, 'readwrite', s => s.put(packed)) },
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
  /** Editable pages: each becomes a board of real text, shape and image layers. */
  layered?: LayeredPage[]
  /** Studio job this work belongs to, with its brand; the new design takes `docId` so Studio can find it again. */
  job?: { id: string; brandId?: string | null; docId?: string }
  /** Open a saved design instead of making a new one. */
  openProject?: string
  /** Then build linked formats from its master board, or push master changes into them. */
  formats?: { deliverableId: string; label: string; width: number; height: number }[]
  rebuildFormats?: boolean
  /** The deliverable the master board answers. */
  masterDeliverableId?: string | null
  syncFormats?: boolean
  /** Fonts for new text (a job's chosen direction or brand). */
  fonts?: { display: string; body: string }
  /** Colour match: the look taken from a Studio reference, applied over the photo. */
  look?: { name: string; mean: [number, number, number]; std: [number, number, number]; grain: number }
  /** The brief and its must-haves, shown as a checklist in the Editor. */
  brief?: import('./types').DesignBrief
  /** When set, add the image plus a live, re-editable filter layer on top (from a tool page). */
  liveEffect?: { effect: string; params: Record<string, number | string> }
}

export async function sendHandoff(h: Omit<Handoff, 'id'>): Promise<string> {
  import('@/lib/analytics').then(m => m.track('handoff', { from: h.from, images: h.images?.length ?? 0, live: !!(h as any).liveEffect })).catch(() => {})
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
  import('@/lib/analytics').then(m => { const kinds = new Set((files as File[]).map(f => (/\.psd$/i.test(f.name || '') ? 'psd' : /\.pdf$/i.test(f.name || '') ? 'pdf' : f.type.startsWith('image/') ? 'image' : 'other'))); kinds.forEach(k => m.track('doc.import', { kind: k, count: files.length })) }).catch(() => {})
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
  import('@/lib/analytics').then(m => { m.track('export', { format: /\.void(\.png)?$/i.test(filename) ? 'void' : (filename.match(/\.([a-z0-9]+)$/i)?.[1] || blob.type.split('/')[1] || '?').toLowerCase(), kb: Math.round(blob.size / 1024) }); m.noteExportForPrompt() }).catch(() => {})
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

// ─── Projects ──────────────────────────────────────────────────────

/** Fonts added from files on this device. Saved inside each design that uses them, so they travel with it. */
export const localFonts = new Map<string, Blob>()
export async function registerLocalFont(family: string, blob: Blob) {
  const face = new FontFace(family, await blob.arrayBuffer())
  await face.load(); (document.fonts as any).add(face)
  localFonts.set(family, blob)
}

/** Split canvases out of the doc (saved channels) so it can be stored. */
export async function packDoc(doc: Doc, put: (key: string, c: HTMLCanvasElement) => Promise<void>): Promise<any> {
  const { channels, ...rest } = doc
  if (channels?.length) for (const c of channels) await put('ch:' + c.id, c.mask)
  return { ...rest, channelMeta: channels?.map(c => ({ id: c.id, name: c.name })) ?? [] }
}
export async function unpackDoc(d: any, get: (key: string) => Promise<HTMLCanvasElement | null>): Promise<Doc> {
  const { channelMeta, ...rest } = d ?? {}
  const channels = [] as NonNullable<Doc['channels']>
  for (const m of channelMeta ?? []) { const c = await get('ch:' + m.id); if (c) channels.push({ id: m.id, name: m.name, mask: c }) }
  return { ...rest, ...(channels.length ? { channels } : {}) } as Doc
}
async function packFonts(layers: Layer[]): Promise<Record<string, Blob>> {
  const out: Record<string, Blob> = {}
  for (const l of layers) if (l.type === 'text' && localFonts.has(l.fontFamily)) out[l.fontFamily] = localFonts.get(l.fontFamily)!
  return out
}
async function unpackFonts(fonts: Record<string, Blob> | undefined) {
  if (!fonts) return
  for (const [family, blob] of Object.entries(fonts)) { if (!localFonts.has(family)) { try { await registerLocalFont(family, blob) } catch { /* broken font file */ } } }
}

export interface ProjectSummary { id: string; name: string; updatedAt: number; width: number; height: number; thumb: string; template?: boolean }
export interface StoredProject { id: string; doc: Doc; layers: any[]; groups?: Group[]; swatches: string[]; blobs: Record<string, Blob>; fonts?: Record<string, Blob> }

export async function saveProject(): Promise<void> {
  const { doc, layers, groups, swatches, markSaved } = useEditor.getState()
  if (!doc) return
  await saveDesign(doc, layers, groups, swatches)
  markSaved()
}

/** Save any design, open or not. Used for autosave, templates and resized copies. */
export async function saveDesign(doc: Doc, layers: Layer[], groups: Group[], swatches: string[], template = false): Promise<void> {
  const { stored, summary } = await storeDesign(doc, layers, groups, swatches, template)
  await idb.put('projects', stored)
  await idb.put('index', summary)
}

/** Build the stored form of a design (used by saves and by version snapshots). */
export async function storeDesign(doc: Doc, layers: Layer[], groups: Group[], swatches: string[], template = false): Promise<{ stored: StoredProject; summary: ProjectSummary }> {
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
  const packed = await packDoc(doc, async (k, c) => { blobs[k] = await canvasToBlob(c) })
  const stored: StoredProject = { id: doc.id, doc: packed, layers: meta, groups, swatches, blobs, fonts: await packFonts(layers) }
  const summary: ProjectSummary = { id: doc.id, name: doc.name, updatedAt: Date.now(), width: doc.width, height: doc.height, thumb: thumb.toDataURL('image/jpeg', 0.7), template }
  return { stored, summary }
}

/** Turn a stored project back into live layers. */
export async function restoreStored(p: StoredProject): Promise<{ doc: Doc; layers: Layer[] }> {
  await unpackFonts(p.fonts)
  const layers: Layer[] = await Promise.all(p.layers.map(async m => {
    const { hasMask, ...rest } = m
    const l: any = { ...rest, rev: nextRev(), mask: hasMask && p.blobs[m.id + ':mask'] ? await blobToCanvas(p.blobs[m.id + ':mask'], 1e6) : null }
    if (m.type === 'raster') l.canvas = p.blobs[m.id] ? await blobToCanvas(p.blobs[m.id], 1e6) : makeCanvas(1, 1)
    return l as Layer
  }))
  const doc = await unpackDoc(p.doc, async k => (p.blobs[k] ? blobToCanvas(p.blobs[k], 1e6) : null))
  return { doc, layers }
}

export async function openProject(id: string, asCopy = false): Promise<boolean> {
  import('@/lib/analytics').then(m => m.track('doc.open', { copy: asCopy })).catch(() => {})
  const p = await idb.get<StoredProject>('projects', id)
  if (!p) return false
  const r = await restoreStored(p)
  const layers = r.layers
  const doc = asCopy ? { ...r.doc, id: 'd' + Date.now().toString(36), name: r.doc.name.replace(/ template$/i, '') } : r.doc
  if (doc.frames?.length) useEditor.getState().loadFramed(doc, layers, p.swatches, p.groups ?? [])
  else useEditor.getState().loadProject(doc, layers, p.swatches, p.groups ?? [])
  if (asCopy) useEditor.setState({ dirty: true })
  return true
}

// ─── .void portable file (self-contained, no backend) ──────────────
// A .void file is the whole project as one JSON: metadata plus every asset base64-encoded inline.

const blobToBase64 = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1] ?? ''); r.onerror = rej; r.readAsDataURL(b) })
const base64ToBlob = (b64: string, type = 'image/png') => { const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type }) }

// PNG chunk tools: embed the project bundle inside a real PNG so the file previews as the design
// everywhere (Finder, Preview, Quick Look) while still carrying the full editable project.
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** Insert a tEXt chunk (keyword "voidcanvas") holding `text` into `pngBytes`, before IEND. */
function embedTextChunk(pngBytes: Uint8Array, keyword: string, text: string): Uint8Array {
  const enc = new TextEncoder()
  const kw = enc.encode(keyword), tx = enc.encode(text)
  const data = new Uint8Array(kw.length + 1 + tx.length)
  data.set(kw, 0); data[kw.length] = 0; data.set(tx, kw.length + 1)
  const type = enc.encode('tEXt')
  const len = data.length
  const chunk = new Uint8Array(12 + len)
  const dv = new DataView(chunk.buffer)
  dv.setUint32(0, len)
  chunk.set(type, 4); chunk.set(data, 8)
  const crcInput = new Uint8Array(type.length + data.length)
  crcInput.set(type, 0); crcInput.set(data, type.length)
  dv.setUint32(8 + len, crc32(crcInput))
  // find IEND (last 12 bytes normally) and splice before it
  const iend = pngBytes.length - 12
  const out = new Uint8Array(pngBytes.length + chunk.length)
  out.set(pngBytes.subarray(0, iend), 0)
  out.set(chunk, iend)
  out.set(pngBytes.subarray(iend), iend + chunk.length)
  return out
}

/** Read the embedded "voidcanvas" tEXt chunk out of a PNG, if present. */
function readTextChunk(pngBytes: Uint8Array, keyword: string): string | null {
  for (let i = 0; i < 8; i++) if (pngBytes[i] !== PNG_SIG[i]) return null
  const dec = new TextDecoder()
  const u32 = (o: number) => ((pngBytes[o] << 24) | (pngBytes[o + 1] << 16) | (pngBytes[o + 2] << 8) | pngBytes[o + 3]) >>> 0
  let off = 8
  while (off + 8 <= pngBytes.length) {
    const len = u32(off)
    const type = dec.decode(pngBytes.subarray(off + 4, off + 8))
    if (type === 'tEXt') {
      const data = pngBytes.subarray(off + 8, off + 8 + len)
      const zero = data.indexOf(0)
      if (zero > 0 && dec.decode(data.subarray(0, zero)) === keyword) return dec.decode(data.subarray(zero + 1))
    }
    if (type === 'IEND') break
    off += 12 + len
  }
  return null
}

/** Build the project bundle (metadata + base64 assets) for the current design. */
async function buildBundle() {
  const { doc, layers, groups, swatches } = useEditor.getState()
  if (!doc) return null
  const blobs: Record<string, string> = {}
  const meta = await Promise.all(layers.map(async (l: any) => {
    const { canvas, mask, rev, ...rest } = l
    if (mask) blobs[l.id + ':mask'] = await blobToBase64(await canvasToBlob(mask))
    if (l.type === 'raster' && canvas) blobs[l.id] = await blobToBase64(await canvasToBlob(canvas))
    return { ...rest, hasMask: !!mask }
  }))
  const packed = await packDoc(doc, async (k, c) => { blobs[k] = await blobToBase64(await canvasToBlob(c)) })
  return { format: 'voidcanvas', version: 2, doc: packed, layers: meta, groups, swatches, blobs }
}

/** Restore a bundle object into the editor. */
async function loadBundle(bundle: any): Promise<boolean> {
  if (bundle?.format !== 'voidcanvas') return false
  const layers: Layer[] = await Promise.all((bundle.layers as any[]).map(async m => {
    const { hasMask, ...rest } = m
    const l: any = { ...rest, rev: nextRev(), mask: hasMask && bundle.blobs[m.id + ':mask'] ? await blobToCanvas(base64ToBlob(bundle.blobs[m.id + ':mask']), 1e6) : null }
    if (m.type === 'raster') l.canvas = bundle.blobs[m.id] ? await blobToCanvas(base64ToBlob(bundle.blobs[m.id]), 1e6) : makeCanvas(1, 1)
    return l as Layer
  }))
  const unpacked = await unpackDoc(bundle.doc, async k => (bundle.blobs[k] ? blobToCanvas(base64ToBlob(bundle.blobs[k]), 1e6) : null))
  const doc = { ...unpacked, id: 'd' + Date.now().toString(36) }
  if (doc.frames?.length) useEditor.getState().loadFramed(doc, layers, bundle.swatches, bundle.groups ?? [])
  else useEditor.getState().loadProject(doc, layers, bundle.swatches, bundle.groups ?? [])
  return true
}

/** Export the design as a PNG that previews as the artwork AND carries the full editable project inside it. */
export async function exportVoidPng(): Promise<void> {
  const { doc, layers, groups } = useEditor.getState()
  if (!doc) return
  const bundle = await buildBundle(); if (!bundle) return
  // render the visible design at a sensible thumbnail-friendly resolution
  const maxDim = 1600
  const k = Math.min(1, maxDim / Math.max(doc.width, doc.height))
  const c = makeCanvas(Math.round(doc.width * k), Math.round(doc.height * k))
  renderDoc(c, doc, layers, { groups, scale: k, noCache: true })
  const pngBlob = await canvasToBlob(c, 'image/png')
  const bytes = new Uint8Array(await pngBlob.arrayBuffer())
  const withData = embedTextChunk(bytes, 'voidcanvas', JSON.stringify(bundle))
  downloadBlob(new Blob([withData as BlobPart], { type: 'image/png' }), `${(doc.name || 'design').replace(/[^\w\- ]+/g, '')}.void.png`)
}

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
  const packed = await packDoc(doc, async (k, c) => { blobs[k] = await blobToBase64(await canvasToBlob(c)) })
  const bundle = { format: 'voidcanvas', version: 2, doc: packed, layers: meta, groups, swatches, blobs }
  const json = JSON.stringify(bundle)
  downloadBlob(new Blob([json], { type: 'application/json' }), `${(doc.name || 'design').replace(/[^\w\- ]+/g, '')}.void`)
}

/** Load a .void file into the editor. */
/** Open a Voidcanvas file: either a .void JSON or a .void.png with the project embedded in a PNG chunk. */
export async function importVoidFile(file: File): Promise<boolean> {
  import('@/lib/analytics').then(m => m.track('doc.import', { kind: 'void', count: 1 })).catch(() => {})
  try {
    let bundle: any = null
    const buf = new Uint8Array(await file.arrayBuffer())
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    if (isPng) {
      const text = readTextChunk(buf, 'voidcanvas')
      if (!text) { useEditor.getState().notify('That PNG has no Voidcanvas project inside it.'); return false }
      bundle = JSON.parse(text)
    } else {
      bundle = JSON.parse(new TextDecoder().decode(buf))
    }
    if (!(await loadBundle(bundle))) { useEditor.getState().notify('That is not a Voidcanvas file.'); return false }
    useEditor.getState().notify('Opened your Voidcanvas file.')
    return true
  } catch { useEditor.getState().notify('Could not read that file.'); return false }
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
// The UI's Inter comes from next/font under a generated name, so text layers set in Inter load it like any other family.
const loaded = new Set<string>()

const cssLink = (href: string) => new Promise<boolean>(r => {
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href
  link.onload = () => r(true); link.onerror = () => { link.remove(); r(false) }; setTimeout(() => r(true), 2500)
  document.head.appendChild(link)
})
/** A font added from a file on this device. It must never be requested from Google. */
const isLocalFace = (family: string) => { try { for (const f of Array.from(document.fonts)) if (f.family.replace(/["']/g, '') === family && f.status !== 'error') return true } catch { /* older browsers */ } return false }
const pending = new Map<string, Promise<void>>()

export async function ensureFont(family: string, weight = 400, italic = false): Promise<void> {
  if (typeof document === 'undefined') return
  if (!loaded.has(family) && !isLocalFace(family)) {
    if (!pending.has(family)) pending.set(family, (async () => {
      const fam = family.replace(/ /g, '+')
      // Families outside the built-in list: ask for the usual weights, and fall back if the family has fewer.
      if (family in FONT_SPECS) await cssLink(`https://fonts.googleapis.com/css2?family=${fam}${FONT_SPECS[family]}&display=swap`)
      else if (!(await cssLink(`https://fonts.googleapis.com/css2?family=${fam}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap`)) && !(await cssLink(`https://fonts.googleapis.com/css2?family=${fam}:wght@400;500;600;700&display=swap`)))
        await cssLink(`https://fonts.googleapis.com/css2?family=${fam}&display=swap`)
      loaded.add(family)
    })())
    await pending.get(family)
  }
  try { await document.fonts.load(`${italic ? 'italic ' : ''}${weight} 32px "${family}"`) } catch { /* render with fallback */ }
}

/** Load every font the document's text layers use, then redraw once they are ready. */
export async function ensureDocFonts() {
  const { layers } = useEditor.getState()
  const want = new Map<string, TextLayer>()
  for (const l of layers) if (l.type === 'text') want.set(`${l.fontFamily}|${l.fontWeight}|${l.italic}`, l)
  if (!want.size) return
  await Promise.all(Array.from(want.values()).map(l => ensureFont(l.fontFamily, l.fontWeight, l.italic)))
  useEditor.setState(s => ({ docRev: s.docRev + 1, layers: s.layers.map(l => (l.type === 'text' ? { ...l, rev: nextRev() } : l)) }))
}

// ─── Editable pages from Studio ────────────────────────────────────
// A page arrives as a list of items in page coordinates. Each becomes a real layer on its own board.

export type LayeredItem =
  | { kind: 'text'; name: string; text: string; fontFamily: string; fontSize: number; fontWeight: number; italic: boolean; color: string; align: 'left' | 'center' | 'right'; lineHeight: number; letterSpacing: number; x: number; y: number; opacity: number; boxWidth?: number }
  | { kind: 'shape'; name: string; shape: 'rect' | 'ellipse' | 'line'; x: number; y: number; w: number; h: number; fill: string | null; stroke: string | null; strokeWidth: number; radius: number; rotation: number; opacity: number }
  | { kind: 'image'; name: string; blob: Blob; x: number; y: number; scaleX: number; scaleY: number; opacity: number }
export interface LayeredPage { name: string; background: string | null; items: LayeredItem[] }

export async function buildFramedFromLayered(name: string, pages: LayeredPage[], size: { width: number; height: number }, palette?: string[]) {
  const { frames, width, height } = layoutFrames(pages.map(p => ({ name: p.name, width: size.width, height: size.height, background: p.background ?? '#ffffff' })))
  // Fonts first, so text measures and draws correctly on the first frame.
  const fontKeys = new Map<string, [string, number, boolean]>()
  for (const p of pages) for (const it of p.items) if (it.kind === 'text') fontKeys.set(`${it.fontFamily}|${it.fontWeight}|${it.italic}`, [it.fontFamily, it.fontWeight, it.italic])
  await Promise.all(Array.from(fontKeys.values()).map(([f, w, i]) => ensureFont(f, w, i)))

  const base = (nm: string, frameId: string, x: number, y: number, opacity: number) => ({ id: uid(), name: nm, visible: true, locked: false, opacity: Math.max(0, Math.min(1, opacity)), blend: 'source-over' as const, x, y, scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: true, groupId: null as string | null, frameId, rev: nextRev() })
  const layers: Layer[] = []
  for (let i = 0; i < pages.length; i++) {
    const f = frames[i]
    for (const it of pages[i].items) {
      const x = f.x + it.x, y = f.y + it.y
      if (it.kind === 'text') {
        layers.push({ ...base(it.name, f.id, x, y, it.opacity), type: 'text', text: it.text, fontFamily: it.fontFamily, fontSize: it.fontSize, fontWeight: it.fontWeight, italic: it.italic, color: it.color, align: it.align, lineHeight: it.lineHeight, letterSpacing: it.letterSpacing, outline: null, shadow: null, ...(it.boxWidth ? { boxWidth: it.boxWidth } : {}) } as TextLayer)
      } else if (it.kind === 'shape') {
        layers.push({ ...base(it.name, f.id, x, y, it.opacity), type: 'shape', shape: it.shape, w: it.w, h: it.h, fill: it.fill, stroke: it.stroke, strokeWidth: it.strokeWidth, radius: it.radius, rotation: it.rotation } as Layer)
      } else {
        const c = await blobToCanvas(it.blob, 8192)
        layers.push({ ...base(it.name, f.id, x, y, it.opacity), type: 'raster', canvas: c, scaleX: it.scaleX, scaleY: it.scaleY } as Layer)
      }
    }
  }
  const doc: Doc = { id: uid(), name, width, height, background: null, frames }
  useEditor.getState().loadFramed(doc, layers, undefined, [])
  useEditor.setState({ dirty: true })
  if (palette?.length) useEditor.setState({ swatches: Array.from(new Set([...palette, ...useEditor.getState().swatches])).slice(0, 21), fg: palette[0] })
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
