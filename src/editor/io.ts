import { suggestImageName } from '@/lib/intelligence/naming'
import { ctx2d, insideHiddenGroup, layerBounds, makeCanvas, maskBounds, renderDoc, uid } from './engine'
import { fxReach } from './effects'
import { styleReach } from './styles'
import { layoutFrames } from './frames'
import { nextRev, useEditor } from './store'
import type { Doc, Effect, ExportPrefs, ExportRecord, Frame, Group, Layer, TextLayer } from './types'
import { boardFileName, exportBoards as boardList, pdfPageSize, uniqueNames, type ExportFormat } from './export'
import { readVoid, VoidFileError, writeVoid, writeVoidPng } from './voidfile'
import { zipFiles } from './zip'
import { noteChanged, noteExported, noteFromTemplate, noteOpened, noteSaved } from './workflow'
export { zipFiles }

// ─── IndexedDB ─────────────────────────────────────────────────────
// One local database shared by every module: Editor projects, Studio boards,
// and an inbox used to pass work from one module to another.

const DB = 'voidcanvas'
const STORES = ['projects', 'index', 'inbox', 'boards', 'brand', 'versions', 'versionIndex', 'jobs', 'brands', 'looks', 'handles', 'account', 'teamfiles'] as const
export type StoreName = (typeof STORES)[number]

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 8)
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
  /** The same, for several effects in order (the Effects page stack). */
  liveEffects?: { effect: string; params: Record<string, number | string> }[]
  /** Put these effects on what is selected in a design that is already open, instead of starting a new one. */
  addEffects?: { projectId: string; effects: { effect: string; params: Record<string, number | string> }[] }
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
      // The document and its first layer arrive in the same tick, so the phone shell opens with the photo already selected.
      if (!useEditor.getState().doc) useEditor.getState().newDoc({ name: name.replace(/\.[a-z0-9]+$/i, ''), width: c.width, height: c.height, background: null })
      // A camera or screenshot name says nothing; the layer is named by what it is instead.
      useEditor.getState().addImage(c, c.width, c.height, suggestImageName(name, c.width, c.height))
    } catch (e) { ed.notify((e as Error).message) }
    i++
  }
}

// ─── Export ────────────────────────────────────────────────────────

export interface ExportOptions { format: 'png' | 'jpeg' | 'webp' | 'pdf'; scale: number; quality: number; transparent: boolean }

/** Render one artboard (frame) to its own canvas at scale. */
/** Render one board on its own, at its own size. Nothing outside the board is rendered. */
export function renderFrame(frameId: string, scale = 1, o: { transparent?: boolean; preview?: boolean } = {}): HTMLCanvasElement | null {
  const { doc, layers, groups } = useEditor.getState()
  if (!doc) return null
  const f = frameId === '__doc' ? null : doc.frames?.find(x => x.id === frameId)
  if (frameId !== '__doc' && !f) return null
  const region = f ? { x: f.x, y: f.y, w: f.width, h: f.height } : { x: 0, y: 0, w: doc.width, h: doc.height }
  // Layers that belong to another board are clipped to that board, so they can never show here.
  const own = f ? layers.filter(l => !l.frameId || l.frameId === f.id) : layers
  const out = makeCanvas(Math.max(1, Math.round(region.w * scale)), Math.max(1, Math.round(region.h * scale)))
  renderDoc(out, doc, own, { groups, scale, noCache: true, fullRes: !o.preview, noShadow: true, transparent: !!o.transparent, region, frameRects: f ? [f] : [] })
  return out
}

/** White under the art, for formats without transparency. */
function flatten(c: HTMLCanvasElement): HTMLCanvasElement {
  const flat = makeCanvas(c.width, c.height); const x = ctx2d(flat)
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(c, 0, 0)
  return flat
}

export interface BoardExport { boardIds: string[]; format: ExportFormat; scale: number; quality: number; transparent: boolean; pdfSplit?: boolean; numbered?: boolean; lossless?: boolean; names?: string }

/** One PDF page from a rendered board: JPEG, or deflated RGB when the export is lossless (print). */
async function pdfPageOf(c: HTMLCanvasElement, size: { w: number; h: number }, o: { quality: number; lossless?: boolean }) {
  const { flateRgb } = await import('../studio/brand-pdf')
  const img = o.lossless ? { flate: await flateRgb(c) } : { jpeg: new Uint8Array(await (await canvasToBlob(c, 'image/jpeg', Math.max(0.9, o.quality))).arrayBuffer()) }
  return { ...img, pxW: c.width, pxH: c.height, mediaW: size.w, mediaH: size.h, imgX: 0, imgY: 0, imgW: size.w, imgH: size.h }
}

/** A board as an SVG file: type and shapes as vectors, images embedded. */
async function boardSvg(b: Frame, o: { scale: number; transparent: boolean }): Promise<string> {
  const { doc, layers, groups } = useEditor.getState()
  if (!doc) throw new Error('Nothing to export')
  const f = b.id === '__doc' ? null : doc.frames?.find(x => x.id === b.id) ?? null
  const region = f ? { x: f.x, y: f.y, w: f.width, h: f.height } : { x: 0, y: 0, w: doc.width, h: doc.height }
  const own = f ? layers.filter(l => !l.frameId || l.frameId === f.id) : layers
  const { svgFor } = await import('./svg-export')
  return svgFor({ doc, layers: own, groups }, { region, board: f, scale: o.scale, transparent: o.transparent, background: f ? f.background : doc.background, title: f ? `${doc.name}: ${f.name}` : doc.name, localFonts, googleFonts: FONT_SPECS })
}

/**
 * Export chosen boards. One board gives one file. Several give a zip of images, or one PDF with
 * a page per board at each board's own size. Returns the file and its name.
 */
export async function exportBoards(o: BoardExport, onProgress?: (done: number, total: number) => void): Promise<{ blob: Blob; name: string }> {
  const { doc } = useEditor.getState()
  if (!doc) throw new Error('Nothing to export')
  const all = boardList(doc)
  const chosen = o.boardIds.map(id => all.find(b => b.id === id)).filter(Boolean) as Frame[]
  if (!chosen.length) throw new Error('No boards chosen')
  const base = doc.name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'design'
  const total = chosen.length
  const renderOne = (b: Frame) => {
    const c = renderFrame(b.id, o.scale, { transparent: o.transparent && (o.format === 'png' || o.format === 'webp') })
    if (!c) throw new Error('Render failed')
    return o.format === 'jpeg' || o.format === 'pdf' || (!o.transparent && !b.background && o.format !== 'png' && o.format !== 'webp') ? flatten(c) : c
  }
  const names = uniqueNames(chosen.map(b => boardFileName(b, all.indexOf(b), all.length, o.format, o.scale, o.numbered !== false && total > 1, o.names, doc.name)))
  if (o.format === 'pdf' && !o.pdfSplit) {
    const { assemble } = await import('../studio/brand-pdf')
    const pages = []
    for (let i = 0; i < total; i++) {
      const b = chosen[i], c = renderOne(b)
      pages.push(await pdfPageOf(c, pdfPageSize(b), o))
      c.width = 0; c.height = 0
      onProgress?.(i + 1, total)
      await new Promise(r => setTimeout(r, 0))
    }
    const name = total === 1 ? names[0] : `${base}.pdf`
    return { blob: await assemble(pages, false), name }
  }
  const files: { name: string; blob: Blob }[] = []
  for (let i = 0; i < total; i++) {
    const b = chosen[i]
    let blob: Blob
    if (o.format === 'svg') blob = new Blob([await boardSvg(b, o)], { type: 'image/svg+xml' })
    else {
      const c = renderOne(b)
      if (o.format === 'pdf') { const { assemble } = await import('../studio/brand-pdf'); blob = await assemble([await pdfPageOf(c, pdfPageSize(b), o)], false) }
      else blob = await canvasToBlob(c, `image/${o.format}`, o.format === 'png' ? undefined : o.quality)
      c.width = 0; c.height = 0
    }
    files.push({ name: names[i], blob })
    onProgress?.(i + 1, total)
    await new Promise(r => setTimeout(r, 0))
  }
  if (files.length === 1) return files[0]
  return { blob: await zipFiles(files), name: `${base}.zip` }
}

/** What the selected layers cover, grown by how far their effects and styles reach, in document pixels. */
export function selectionExtent(): { x: number; y: number; w: number; h: number; layers: Layer[]; name: string } | null {
  const { doc, layers, groups, selectedIds } = useEditor.getState()
  if (!doc || !selectedIds.length) return null
  const sel = new Set(selectedIds)
  const list = layers.filter(l => sel.has(l.id) && l.visible && !insideHiddenGroup(l, groups))
  const shapes = list.filter(l => l.type !== 'adjustment')
  if (!shapes.length) return null
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, pad = 2
  const gmap = new Map(groups.map(g => [g.id, g]))
  for (const l of shapes) {
    const b = layerBounds(l, doc)
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h)
    let reach = fxReach(l.effects) + styleReach(l) + (l.type === 'text' && l.shadow ? Math.abs(l.shadow.x) + Math.abs(l.shadow.y) + l.shadow.blur * 2 : 0)
    let gid = l.groupId ?? null, guard = 0
    while (gid && guard++ < 64) { const g = gmap.get(gid); if (!g) break; reach += fxReach(g.effects) + styleReach({ styles: g.styles } as Layer); gid = g.parentId ?? null }
    pad = Math.max(pad, reach + 2)
  }
  // Named for what it is: one layer, one whole group, or "Selection".
  const gids = new Set(shapes.map(l => l.groupId ?? ''))
  const g = gids.size === 1 ? gmap.get(Array.from(gids)[0]) : undefined
  const name = shapes.length === 1 ? shapes[0].name : g && layers.filter(l => l.groupId === g.id).every(l => sel.has(l.id)) ? g.name : 'Selection'
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2, layers: list, name }
}

/** Export the selected layers on their own, trimmed to what they cover, at any scale. */
export async function exportSelection(o: { format: ExportFormat; scale: number; quality: number; transparent: boolean; lossless?: boolean; names?: string }): Promise<{ blob: Blob; name: string; w: number; h: number }> {
  const { doc, groups } = useEditor.getState()
  const ext = selectionExtent()
  if (!doc || !ext) throw new Error('Nothing selected')
  const k = o.scale
  const region = { x: ext.x, y: ext.y, w: ext.w, h: ext.h }
  const c = makeCanvas(Math.max(1, Math.round(region.w * k)), Math.max(1, Math.round(region.h * k)))
  // Board and design effects belong to the board, so they are left out; layers are not cut at the board edge.
  renderDoc(c, doc, ext.layers, { groups, scale: k, region, frameRects: [], transparent: true, noShadow: true, noCache: true, fullRes: true, inner: true })
  const b = maskBounds(c)
  if (!b) throw new Error('The selection is empty')
  const trimmed = makeCanvas(b.w, b.h); ctx2d(trimmed).drawImage(c, -b.x, -b.y)
  c.width = 0; c.height = 0
  const docW = b.w / k, docH = b.h / k
  const name = boardFileName({ name: ext.name, width: docW, height: docH }, 0, 1, o.format, k, false, o.names, doc.name)
  const transparent = o.transparent && (o.format === 'png' || o.format === 'webp' || o.format === 'svg')
  let blob: Blob
  if (o.format === 'svg') {
    const { svgFor } = await import('./svg-export')
    const at = { x: region.x + b.x / k, y: region.y + b.y / k, w: docW, h: docH }
    blob = new Blob([await svgFor({ doc, layers: ext.layers, groups }, { region: at, board: null, scale: k, transparent, background: transparent ? null : '#ffffff', pageFx: false, title: `${doc.name}: ${ext.name}`, localFonts, googleFonts: FONT_SPECS })], { type: 'image/svg+xml' })
  } else if (o.format === 'pdf') {
    const { assemble } = await import('../studio/brand-pdf')
    blob = await assemble([await pdfPageOf(flatten(trimmed), pdfPageSize({ width: docW, height: docH }), o)], false)
  } else {
    const out = transparent ? trimmed : flatten(trimmed)
    blob = await canvasToBlob(out, `image/${o.format}`, o.format === 'png' ? undefined : o.quality)
  }
  return { blob, name, w: b.w, h: b.h }
}

/**
 * Keep what was exported, and the choices used, with the design (the last 20 exports). Not an undo step,
 * and not an edit: the design's "edited" time stays where it was.
 */
export function noteExport(rec: Omit<ExportRecord, 'at'>, prefs?: ExportPrefs) {
  const st = useEditor.getState(); if (!st.doc) return
  const before = st.doc.exports ?? []
  const exports = [...before, { ...rec, at: Date.now() }].slice(-20)
  st.setDoc(prefs ? { exports, exportPrefs: prefs } : { exports })
  noteExported(useEditor.getState().doc!, rec, before.length === 0)
}

/** Every board as its own PNG in a zip. */
export async function exportAllFrames(scale = 2): Promise<Blob> {
  const { doc } = useEditor.getState()
  if (!doc?.frames) throw new Error('No artboards')
  return (await exportBoards({ boardIds: doc.frames.map(f => f.id), format: 'png', scale, quality: 1, transparent: false })).blob
}

/**
 * One image of the design. A design with boards exports the active board (or the one given):
 * the pasteboard with its gaps is never a useful picture.
 */
export async function exportImage(o: ExportOptions, frameId?: string | null): Promise<Blob> {
  const { doc, activeFrameId } = useEditor.getState()
  if (!doc) throw new Error('Nothing to export')
  const id = doc.frames?.length ? (frameId ?? activeFrameId ?? doc.frames[0].id) : '__doc'
  return (await exportBoards({ boardIds: [id], format: o.format, scale: o.scale, quality: o.quality, transparent: o.transparent })).blob
}

/** Counts one export. Every way out of the Editor (download, share sheet, clipboard) calls this once. */
export function trackExport(filename: string, blob: Blob, meta: Record<string, string | number | boolean> = {}) {
  import('@/lib/analytics').then(m => { m.track('export', { format: /\.void(\.png)?$/i.test(filename) ? 'void' : (filename.match(/\.([a-z0-9]+)$/i)?.[1] || blob.type.split('/')[1] || '?').toLowerCase(), kb: Math.round(blob.size / 1024), ...meta }); m.noteExportForPrompt() }).catch(() => {})
}

export function downloadBlob(blob: Blob, filename: string, meta?: Record<string, string | number | boolean>) {
  trackExport(filename, blob, meta)
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

export interface ProjectSummary {
  id: string; name: string; updatedAt: number; width: number; height: number; thumb: string; template?: boolean
  /** When the design itself last changed (an export alone does not count). */
  editedAt?: number
  /** Boards in the design (1 without boards), how many of them have been exported, and the last export. */
  boards?: number
  exportedBoards?: number
  exports?: number
  lastExport?: { at: number; format: string; boards: number } | null
  /** The Studio job the design belongs to. */
  jobId?: string | null
}
export interface StoredProject { id: string; doc: Doc; layers: any[]; groups?: Group[]; swatches: string[]; blobs: Record<string, Blob>; fonts?: Record<string, Blob> }

// ─── Saving the open design ────────────────────────────────────────
// Every change to the open design bumps a generation number. A save writes the state it finds when it
// runs, and marks the design saved only if nothing changed while it was writing. Saves run one at a
// time, in order, so an older save can never land after a newer one. When the open design is closed or
// replaced (Back, New, a tab switch, another design opened), its last state is written, whatever closed it.

let saveChain: Promise<unknown> = Promise.resolve()
let gen = 0, savedGen = 0, liveId: string | null = null
let settling = false, marking = false, autosaveOn = false, failures = 0
let debounceT: ReturnType<typeof setTimeout> | null = null, maxWaitT: ReturnType<typeof setTimeout> | null = null

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const p = saveChain.then(fn, fn)
  saveChain = p.catch(() => {})
  return p
}
/** Resolves when every save started so far has finished. Lists of designs wait for this. */
export const whenSaved = () => saveChain.then(() => {})
/** True while the open design has changes that are not in storage yet. */
export const hasUnsaved = () => !PRIVATE && !!liveId && gen !== savedGen

function clearSaveTimers() { if (debounceT) clearTimeout(debounceT); if (maxWaitT) clearTimeout(maxWaitT); debounceT = maxWaitT = null }
function scheduleSave() {
  if (debounceT) clearTimeout(debounceT)
  debounceT = setTimeout(() => { saveOpen().catch(() => {}) }, 1200)
  // Typing for a long time still saves every few seconds.
  if (!maxWaitT) maxWaitT = setTimeout(() => { saveOpen().catch(() => {}) }, 5000)
}
function setDirtyQuietly(v: boolean) { marking = true; try { useEditor.setState({ dirty: v }) } finally { marking = false } }

function saveFailed(e: unknown) {
  failures++
  const msg = (e as Error)?.message || ''
  import('@/lib/analytics').then(m => { m.track('save.failed', { n: failures }); if (/full/i.test(msg)) m.track('storage.full', { n: failures }) }).catch(() => {})
  useEditor.getState().notify(/full/i.test(msg) ? msg : 'Could not save this design. It is still open; export it or free some space, and saving will try again.')
  if (failures < 4) scheduleSave()
}

async function saveOpen(): Promise<void> {
  clearSaveTimers()
  if (PRIVATE) return
  return enqueue(async () => {
    const st = useEditor.getState(); const doc = st.doc
    if (!doc || doc.id !== liveId || gen === savedGen) return
    const g = gen
    try { await saveDesign(doc, st.layers, st.groups, st.swatches); failures = 0; noteSaved(doc.id) } catch (e) { saveFailed(e); throw e }
    if (liveId !== doc.id) return
    savedGen = Math.max(savedGen, g)
    if (gen === savedGen) { if (useEditor.getState().dirty) setDirtyQuietly(false) } else scheduleSave()
  })
}

/** Save the open design now if it has changes, and wait for every save to finish. */
export async function saveProject(): Promise<void> {
  const st = useEditor.getState()
  if (!st.doc) { await saveChain; return }
  if (!autosaveOn) {
    // Outside the Editor (no autosave running): a plain save of what is open.
    await enqueue(() => saveDesign(st.doc!, st.layers, st.groups, st.swatches))
    st.markSaved(); return
  }
  if (liveId !== st.doc.id) { liveId = st.doc.id; gen = 1; savedGen = 0 }
  if (st.dirty && gen === savedGen) gen++
  await saveOpen()
}
export const flushSave = () => saveProject().catch(() => {})

/** True when two versions of a design differ only in what the Editor keeps about exports. */
function bookkeepingOnly(a: Doc | null, b: Doc | null): boolean {
  if (!a || !b) return false
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of Array.from(keys)) if (k !== 'exports' && k !== 'exportPrefs' && (a as any)[k] !== (b as any)[k]) return false
  return true
}

/** Start watching the open design. Called once by the Editor. */
export function startAutosave() {
  if (autosaveOn || typeof window === 'undefined') return
  autosaveOn = true
  const s0 = useEditor.getState()
  liveId = s0.doc?.id ?? null; savedGen = 0; gen = s0.dirty ? 1 : 0
  useEditor.subscribe((st, prev) => {
    if (marking) return
    const id = st.doc?.id ?? null, prevId = prev.doc?.id ?? null
    // The same design given a new id (a Studio job claiming it): keep its unsaved changes under the new id.
    if (id && prevId && id !== prevId && st.layers === prev.layers) { liveId = id; if (gen === savedGen) gen++; scheduleSave(); return }
    const loaded = st.history !== prev.history && st.history.length <= 1
    if (id !== prevId || loaded) {
      if (prevId && prevId !== id && prevId === liveId && gen !== savedGen && !PRIVATE) {
        const d = prev.doc!, L = prev.layers, G = prev.groups, S = prev.swatches
        enqueue(() => saveDesign(d, L, G, S)).catch(saveFailed)
      }
      clearSaveTimers(); gen = 0; savedGen = 0; liveId = id
      if (id) announceOpen(id)
      if (!settling && id) {
        settling = true
        // Loading sets several things in one go; once it has finished, a design that arrives unsaved (a copy, an import) is saved.
        queueMicrotask(() => { settling = false; const s = useEditor.getState(); if (s.doc?.id === liveId && s.dirty && gen === savedGen) { gen++; scheduleSave() } })
      }
      return
    }
    if (!id || settling) return
    // A real change moves "edited": every edit is an undo step (or an undo). Fonts arriving, an export record and
    // remembered export choices are not edits. The step often lands in its own update, after the change itself.
    if ((st.history !== prev.history || st.historyIndex !== prev.historyIndex) && !(st.doc !== prev.doc && bookkeepingOnly(st.doc, prev.doc) && st.layers === prev.layers)) { editedAt.set(id, Date.now()); noteChanged(id) }
    const changed = st.layers !== prev.layers || st.groups !== prev.groups || st.doc !== prev.doc || st.swatches !== prev.swatches || (st.dirty && !prev.dirty)
    if (!changed) return
    gen++
    if (!st.dirty) setDirtyQuietly(true)
    if (!PRIVATE) scheduleSave()
  })
  window.addEventListener('beforeunload', e => {
    if (!hasUnsaved()) return
    saveOpen().catch(() => {})
    // The desktop app saves on quit through its own flush; only the browser needs the warning.
    if (!(window as any).voidDesktop) { e.preventDefault(); e.returnValue = '' }
  })
  initDesignChannel()
}

// ─── One design, one tab ───────────────────────────────────────────
// Two tabs editing the same design would overwrite each other. When a design opens in one tab, any
// other tab that has it open writes its changes and closes it, then the new tab reloads the saved copy.

const TAB_KEY = Math.random().toString(36).slice(2)
let designChannel: BroadcastChannel | null = null
function initDesignChannel() {
  if (typeof BroadcastChannel === 'undefined') return
  designChannel = new BroadcastChannel('vc-open-designs')
  designChannel.onmessage = async (ev: MessageEvent) => {
    const m = ev.data as { t: string; id: string; from: string; wrote?: boolean }
    if (!m || m.from === TAB_KEY || !m.id || PRIVATE) return
    const st = useEditor.getState()
    if (m.t === 'open' && st.doc?.id === m.id) {
      const name = st.doc.name, wrote = hasUnsaved()
      await saveProject().catch(() => {})
      if (useEditor.getState().doc?.id !== m.id) return
      useEditor.getState().closeDoc()
      useEditor.getState().notify(`“${name}” was opened in another tab, so it was closed here. Your changes are saved.`)
      designChannel?.postMessage({ t: 'released', id: m.id, from: TAB_KEY, wrote })
    } else if (m.t === 'released' && m.wrote && st.doc?.id === m.id && gen === savedGen) {
      // The other tab had changes this tab did not load yet: reload the saved copy, keeping the view.
      const view = st.view
      if (await openProject(m.id, false, 'another-tab')) useEditor.setState({ view })
    }
  }
}
function announceOpen(id: string) { try { designChannel?.postMessage({ t: 'open', id, from: TAB_KEY }) } catch { /* ignore */ } }

/** When each open design last really changed, this session (exports and remembered choices do not count). */
const editedAt = new Map<string, number>()

/** Save any design, open or not. Used for autosave, templates and resized copies. */
export async function saveDesign(doc: Doc, layers: Layer[], groups: Group[], swatches: string[], template = false): Promise<void> {
  const { stored, summary } = await storeDesign(doc, layers, groups, swatches, template)
  // Not changed this session: keep when it was last changed (a design saved before this was recorded: its last save).
  if (!summary.editedAt) { const prev = await idb.get<ProjectSummary>('index', doc.id).catch(() => undefined); summary.editedAt = prev?.editedAt ?? prev?.updatedAt ?? summary.updatedAt }
  await idb.put('projects', stored)
  await idb.put('index', summary)
  // Once there is work worth keeping, ask the browser not to clear it.
  if (!PRIVATE) import('@/lib/persist').then(m => m.ensurePersistentStorage()).catch(() => {})
}

// Layer pixels are never changed in place (history keeps references to them), so a canvas that was
// encoded once can reuse its PNG. Saving then only encodes what changed since the last save.
const pngCache = new WeakMap<HTMLCanvasElement, Promise<Blob>>()
function encodePng(c: HTMLCanvasElement): Promise<Blob> {
  let p = pngCache.get(c)
  if (!p) { p = canvasToBlob(c); pngCache.set(c, p); p.catch(() => pngCache.delete(c)) }
  return p
}

/** Build the stored form of a design (used by saves and by version snapshots). */
export async function storeDesign(doc: Doc, layers: Layer[], groups: Group[], swatches: string[], template = false): Promise<{ stored: StoredProject; summary: ProjectSummary }> {
  const blobs: Record<string, Blob> = {}
  // An effect's mask is pixels: stored beside the layers under the effect's id, with a flag on the effect.
  const packFx = async (list: Effect[] | null | undefined, owner: string) => !list?.some(e => e.mask) ? list : Promise.all(list.map(async e => {
    if (!e.mask) return e
    const { mask, ...rest } = e; blobs[`fx:${owner}:${e.id}:mask`] = await encodePng(mask); return { ...rest, hasMask: true }
  }))
  const thumbDoc = doc
  doc = { ...doc, effects: await packFx(doc.effects, 'doc'), ...(doc.frames ? { frames: await Promise.all(doc.frames.map(async f => (f.effects?.some(e => e.mask) ? { ...f, effects: await packFx(f.effects, 'f' + f.id) } : f))) } : {}) }
  const meta = await Promise.all(layers.map(async l0 => {
    const l = l0.effects?.some(e => e.mask) ? ({ ...l0, effects: await packFx(l0.effects, l0.id) } as Layer) : l0
    const { mask, ...rest } = l as any
    if (mask) blobs[l.id + ':mask'] = await encodePng(mask)
    if (l.type === 'raster') { blobs[l.id] = await encodePng(l.canvas); delete rest.canvas }
    return { ...rest, hasMask: !!mask }
  }))
  const k = Math.min(1, 360 / Math.max(doc.width, doc.height))
  const thumb = makeCanvas(doc.width * k, doc.height * k)
  renderDoc(thumb, thumbDoc, layers, { groups, scale: k, noCache: true, fxDraft: true })
  const packed = await packDoc(doc, async (k, c) => { blobs[k] = await encodePng(c) })
  // A group's mask is pixels too: stored beside the layers, with a flag on the group.
  const gs = await Promise.all(groups.map(async g0 => {
    const g = g0.effects?.some(e => e.mask) ? { ...g0, effects: await packFx(g0.effects, 'g' + g0.id) } : g0
    if (!g.mask) return g; const { mask, ...rest } = g; blobs['g:' + g.id + ':mask'] = await encodePng(mask); return { ...rest, hasMask: true } as unknown as Group
  }))
  const stored: StoredProject = { id: doc.id, doc: packed, layers: meta, groups: gs, swatches, blobs, fonts: await packFonts(layers) }
  const boardIds = doc.frames?.length ? doc.frames.map(f => f.id) : ['__doc']
  const exported = new Set((doc.exports ?? []).filter(r => r.what !== 'selection').flatMap(r => r.boards).filter(id => boardIds.includes(id)))
  const last = doc.exports?.length ? doc.exports[doc.exports.length - 1] : null
  const summary: ProjectSummary = {
    id: doc.id, name: doc.name, updatedAt: Date.now(), width: doc.width, height: doc.height, thumb: thumb.toDataURL('image/jpeg', 0.7), template,
    editedAt: editedAt.get(doc.id), boards: boardIds.length, exportedBoards: exported.size, exports: doc.exports?.length ?? 0,
    lastExport: last ? { at: last.at, format: last.format, boards: last.boards.length } : null, jobId: doc.jobId ?? null,
  }
  return { stored, summary }
}

/** A canvas from a stored PNG. The PNG is remembered for that canvas, so saving an unchanged layer writes the
 *  same bytes again instead of encoding it anew (faster, and a design that did not change keeps its fingerprint). */
async function fromPng(b: Blob): Promise<HTMLCanvasElement> {
  const c = await blobToCanvas(b, 1e6)
  if (b.type === 'image/png' || !b.type) pngCache.set(c, Promise.resolve(b))
  return c
}

/** Turn a stored project back into live layers and groups. */
export async function restoreStored(p: StoredProject): Promise<{ doc: Doc; layers: Layer[]; groups: Group[] }> {
  await unpackFonts(p.fonts)
  const layers: Layer[] = await Promise.all(p.layers.map(async m => {
    const { hasMask, ...rest } = m
    const l: any = { ...rest, rev: nextRev(), mask: hasMask && p.blobs[m.id + ':mask'] ? await fromPng(p.blobs[m.id + ':mask']) : null }
    if (m.type === 'raster') l.canvas = p.blobs[m.id] ? await fromPng(p.blobs[m.id]) : makeCanvas(1, 1)
    return l as Layer
  }))
  const doc = await unpackDoc(p.doc, async k => (p.blobs[k] ? fromPng(p.blobs[k]) : null))
  const groups: Group[] = await Promise.all((p.groups ?? []).map(async (g: any) => {
    const { hasMask, ...rest } = g
    return { ...rest, ...(hasMask && p.blobs['g:' + g.id + ':mask'] ? { mask: await fromPng(p.blobs['g:' + g.id + ':mask']) } : {}) } as Group
  }))
  // Effects of kinds this version does not know (from a newer Voidcanvas) are kept but not drawn; masks come back.
  const { markUnknown } = await import('./effects')
  const fx = async (list: Effect[], owner: string) => markUnknown(await Promise.all(list.map(async e => {
    if (!e.hasMask) return e
    const { hasMask, ...rest } = e; const b = p.blobs[`fx:${owner}:${e.id}:mask`]
    return b ? { ...rest, mask: await fromPng(b) } : rest
  })))
  for (const l of layers) if (l.effects) l.effects = await fx(l.effects, l.id)
  for (const g of groups) if (g.effects) g.effects = await fx(g.effects, 'g' + g.id)
  if (doc.effects) doc.effects = await fx(doc.effects, 'doc')
  if (doc.frames) doc.frames = await Promise.all(doc.frames.map(async f => (f.effects ? { ...f, effects: await fx(f.effects, 'f' + f.id) } : f)))
  return { doc, layers, groups }
}

/**
 * Open a saved design. `asCopy` makes a fresh design from it (templates). `from` says where it was opened
 * from, for coming-back analytics: home, landing, link, studio, effects, tab, reload, crash, another-tab.
 */
export async function openProject(id: string, asCopy = false, from = 'other'): Promise<boolean> {
  const p = await idb.get<StoredProject>('projects', id)
  if (!p) return false
  import('@/lib/analytics').then(m => { m.track('doc.open', { from, copy: asCopy }); if (asCopy) m.track('template.use', { from }) }).catch(() => {})
  const r = await restoreStored(p)
  const layers = r.layers
  // A template copy starts its own export history.
  const doc = asCopy ? { ...r.doc, id: 'd' + Date.now().toString(36), name: r.doc.name.replace(/ template$/i, ''), exports: [] } : r.doc
  if (asCopy) noteFromTemplate(doc.id); else noteOpened(doc.id)
  if (doc.frames?.length) useEditor.getState().loadFramed(doc, layers, p.swatches, r.groups)
  else useEditor.getState().loadProject(doc, layers, p.swatches, r.groups)
  if (asCopy) useEditor.setState({ dirty: true })
  return true
}

// ─── .void files ───────────────────────────────────────────────────
// The format lives in voidfile.ts (spec: docs/void-format.md). These functions connect it to the editor.

const safeName = (n: string) => (n || 'design').replace(/[^\w\- ]+/g, '').trim() || 'design'

async function previewOf(doc: Doc, layers: Layer[], groups: Group[], max: number): Promise<Blob> {
  const k = Math.min(1, max / Math.max(doc.width, doc.height))
  const c = makeCanvas(Math.max(1, Math.round(doc.width * k)), Math.max(1, Math.round(doc.height * k)))
  renderDoc(c, doc, layers, { groups, scale: k, noCache: true })
  return canvasToBlob(c, 'image/png')
}

/** The open design as a .void file, ready to download or write to disk. */
export async function buildVoidFile(): Promise<{ blob: Blob; name: string } | null> {
  const { doc, layers, groups, swatches } = useEditor.getState()
  if (!doc) return null
  const { stored } = await storeDesign(doc, layers, groups, swatches)
  const blob = await writeVoid(stored, { preview: await previewOf(doc, layers, groups, 512) })
  return { blob, name: `${safeName(doc.name)}.void` }
}

/** The open design as a .void.png: previews as the artwork and carries the full editable project inside it. */
export async function buildVoidPng(): Promise<{ blob: Blob; name: string } | null> {
  const { doc, layers, groups, swatches } = useEditor.getState()
  if (!doc) return null
  const { stored } = await storeDesign(doc, layers, groups, swatches)
  const blob = await writeVoidPng(stored, await previewOf(doc, layers, groups, 1600))
  return { blob, name: `${safeName(doc.name)}.void.png` }
}

export async function exportVoidPng(): Promise<void> {
  const f = await buildVoidPng(); if (f) downloadBlob(f.blob, f.name)
}

/** Download the open design as a .void file. */
export async function exportVoidFile(): Promise<void> {
  const f = await buildVoidFile(); if (f) downloadBlob(f.blob, f.name)
}

/** Download a saved design as a .void file without opening it. */
export async function exportProjectVoid(id: string): Promise<void> {
  const p = await idb.get<StoredProject>('projects', id); if (!p) return
  const summary = await idb.get<ProjectSummary>('index', id)
  const preview = summary?.thumb ? await (await fetch(summary.thumb)).blob() : undefined
  downloadBlob(await writeVoid(p, { preview }), `${safeName(p.doc.name)}.void`)
}

/** Open .void bytes as a new design in the editor. Returns the new design's id, or null. */
export async function openVoidBytes(bytes: Uint8Array): Promise<string | null> {
  const ed = useEditor.getState()
  try {
    const { project, notes } = await readVoid(bytes)
    const id = 'd' + Date.now().toString(36)
    const { doc: d, layers, groups } = await restoreStored({ ...project, id, groups: project.groups ?? [] } as StoredProject)
    const doc = { ...d, id }
    if (doc.frames?.length) ed.loadFramed(doc, layers, project.swatches, groups)
    else ed.loadProject(doc, layers, project.swatches, groups)
    useEditor.setState({ dirty: true })
    ed.notify(notes.length ? notes.join(' ') : 'Opened your Voidcanvas file.')
    return id
  } catch (e) {
    ed.notify(e instanceof VoidFileError ? e.message : 'Could not read that file.')
    return null
  }
}

/** Open a Voidcanvas file: .void (any version) or .void.png. */
export async function importVoidFile(file: File): Promise<string | null> {
  import('@/lib/analytics').then(m => m.track('doc.import', { kind: 'void', count: 1 })).catch(() => {})
  return openVoidBytes(new Uint8Array(await file.arrayBuffer()))
}

export const listProjects = async () => { await whenSaved(); return (await idb.all<ProjectSummary>('index')).sort((a, b) => b.updatedAt - a.updatedAt) }
export async function deleteProject(id: string) {
  await idb.del('projects', id); await idb.del('index', id); await idb.del('handles', id).catch(() => {})
  // Its version history goes with it, or up to 30 full copies would keep using storage.
  const versions = (await idb.all<{ id: string; docId: string }>('versionIndex').catch(() => [])).filter(v => v.docId === id)
  for (const v of versions) { await idb.del('versions', v.id).catch(() => {}); await idb.del('versionIndex', v.id).catch(() => {}) }
}

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

/**
 * A copy of the open design as a new design, "Poster variation 2", for trying another idea without touching
 * this one. Its export history starts empty. Returns the new design's id.
 */
export async function duplicateAsVariation(): Promise<string | null> {
  const st = useEditor.getState(); if (!st.doc) return null
  await saveProject().catch(() => {})
  const base = st.doc.name.replace(/,?\s+variation\s+\d+$/i, '').trim() || 'Design'
  const names = new Set((await listProjects()).map(p => p.name))
  let k = 2; while (names.has(`${base} variation ${k}`)) k++
  const id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  await saveDesign({ ...st.doc, id, name: `${base} variation ${k}`, exports: [] }, st.layers, st.groups, st.swatches)
  import('@/lib/analytics').then(m => m.track('variation.make', { boards: st.doc?.frames?.length ?? 1 })).catch(() => {})
  return id
}

/**
 * Export a saved design from Home without opening it: each board as a PNG at its own size (a zip for
 * several), named with the design's file name pattern. The export is recorded with the design.
 */
export async function exportProjectPng(id: string): Promise<void> {
  const p = await idb.get<StoredProject>('projects', id); if (!p) return
  const r = await restoreStored(p)
  for (const l of r.layers) if (l.type === 'text') await ensureFont(l.fontFamily, l.fontWeight, l.italic)
  const boards = boardList(r.doc)
  const files: { name: string; blob: Blob }[] = []
  for (let i = 0; i < boards.length; i++) {
    const b = boards[i], f = b.id === '__doc' ? null : b
    const region = f ? { x: f.x, y: f.y, w: f.width, h: f.height } : { x: 0, y: 0, w: r.doc.width, h: r.doc.height }
    const own = f ? r.layers.filter(l => !l.frameId || l.frameId === f.id) : r.layers
    const c = makeCanvas(Math.max(1, Math.round(region.w)), Math.max(1, Math.round(region.h)))
    renderDoc(c, r.doc, own, { groups: r.groups, scale: 1, noCache: true, fullRes: true, noShadow: true, region, frameRects: f ? [f] : [] })
    files.push({ name: boardFileName(b, i, boards.length, 'png', 1, boards.length > 1, r.doc.exportPrefs?.names, r.doc.name), blob: await canvasToBlob(c) })
    c.width = 0; c.height = 0
  }
  const out = files.length === 1 ? files[0] : { name: `${safeName(r.doc.name)}.zip`, blob: await zipFiles(uniqueNames(files.map(x => x.name)).map((name, i) => ({ name, blob: files[i].blob }))) }
  downloadBlob(out.blob, out.name, { via: 'home', boards: boards.length })
  const rec: ExportRecord = { at: Date.now(), boards: boards.map(b => b.id), format: 'png', scale: 1, files: files.length, what: 'boards' }
  await idb.put('projects', { ...p, doc: { ...p.doc, exports: [...(p.doc.exports ?? []), rec].slice(-20) } })
  const idx = await idb.get<ProjectSummary>('index', id).catch(() => undefined)
  if (idx) await idb.put('index', { ...idx, exports: (idx.exports ?? 0) + 1, exportedBoards: boards.length, lastExport: { at: rec.at, format: 'png', boards: boards.length } })
}

// ─── Fonts ─────────────────────────────────────────────────────────

export const FONT_SPECS: Record<string, string> = {
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
let bundled: Promise<boolean> | null = null

export async function ensureFont(family: string, weight = 400, italic = false): Promise<void> {
  if (typeof document === 'undefined') return
  if (!loaded.has(family) && !isLocalFace(family)) {
    if (!pending.has(family)) pending.set(family, (async () => {
      const fam = family.replace(/ /g, '+')
      // Families outside the built-in list: ask for the usual weights, and fall back if the family has fewer.
      // The desktop app carries the built-in fonts, so they work offline.
      if (family in FONT_SPECS && process.env.NEXT_PUBLIC_DESKTOP) { bundled ??= cssLink('/fonts/fonts.css'); await bundled }
      else if (family in FONT_SPECS) await cssLink(`https://fonts.googleapis.com/css2?family=${fam}${FONT_SPECS[family]}&display=swap`)
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
