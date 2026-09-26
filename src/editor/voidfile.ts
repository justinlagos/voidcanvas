// ─── The .void file format ─────────────────────────────────────────
// One format for every surface: the web app, the desktop app, backups, and later sync and share.
// The full specification is in docs/void-format.md. Keep the two in step.
//
// Version 3 (current) is a ZIP container:
//   mimetype              "application/vnd.voidcanvas+zip", first entry, stored
//   manifest.json         everything that is not pixels: doc, layers, groups, swatches, asset table
//   preview.png           a picture of the design (optional), for file browsers and previews
//   blobs/<sha256>.<ext>  one file per bitmap or font, named by the SHA-256 of its bytes
//
// Naming blobs by content hash means identical pixels are stored once, and a future sync only
// has to move the blobs that changed.
//
// Versions 1 and 2 were one JSON object with every bitmap base64-encoded inline. They still open.
// This module does not touch the DOM or the editor, so it runs in tests and in a worker.

import { crc32, isZip, unzip, zipFiles } from './zip'

export const VOID_MIME = 'application/vnd.voidcanvas+zip'
/** The version this build writes. */
export const VOID_VERSION = 3
/** The oldest reader that can open what this build writes. Raise it only for a change older readers would get wrong. */
export const VOID_MIN_READER = 3
/** Layer types this build knows how to draw. Newer types in a file are left out, with a note. */
export const KNOWN_LAYER_TYPES = ['raster', 'text', 'shape', 'adjustment']

/** A design in its stored form: metadata plus pixels and fonts as Blobs. Same shape as io.ts StoredProject. */
export interface VoidProject {
  id: string
  doc: any
  layers: any[]
  groups?: any[]
  swatches: string[]
  blobs: Record<string, Blob>
  fonts?: Record<string, Blob>
}

export interface AssetRef { hash: string; type: string; size: number }

export interface VoidManifest {
  format: 'voidcanvas'
  version: number
  minReader: number
  app: string
  savedAt: string
  doc: any
  layers: any[]
  groups: any[]
  swatches: string[]
  /** Pixels: layer bitmaps (key = layer id), masks (layer id + ':mask'), channels ('ch:' + id). */
  assets: Record<string, AssetRef>
  /** Fonts added from files, by family name. */
  fonts: Record<string, AssetRef>
  preview?: string
}

export interface ReadResult {
  project: VoidProject
  /** The version the file was written as. */
  version: number
  /** Plain-English notes for the person opening the file (things left out, newer version). */
  notes: string[]
}

export class VoidFileError extends Error {}

// ─── Helpers ───────────────────────────────────────────────────────

const enc = new TextEncoder()
const dec = new TextDecoder()

async function sha256(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('')
}

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'font/ttf': 'ttf', 'font/otf': 'otf', 'font/woff': 'woff', 'font/woff2': 'woff2' }
const extFor = (type: string) => EXT[type] ?? 'bin'

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64); const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

const blobOf = (bytes: Uint8Array, type: string) => new Blob([bytes as BlobPart], { type })

// ─── Write ─────────────────────────────────────────────────────────

/** Build a version 3 .void file. */
export async function writeVoid(p: VoidProject, opts: { preview?: Blob; app?: string } = {}): Promise<Blob> {
  const files = new Map<string, Uint8Array>()
  const addBlob = async (b: Blob): Promise<AssetRef> => {
    const bytes = new Uint8Array(await b.arrayBuffer())
    const hash = await sha256(bytes)
    const type = b.type || 'application/octet-stream'
    const path = `blobs/${hash}.${extFor(type)}`
    if (!files.has(path)) files.set(path, bytes)
    return { hash, type, size: bytes.length }
  }
  const assets: Record<string, AssetRef> = {}
  for (const [k, b] of Object.entries(p.blobs ?? {})) if (b) assets[k] = await addBlob(b)
  const fonts: Record<string, AssetRef> = {}
  for (const [k, b] of Object.entries(p.fonts ?? {})) if (b) fonts[k] = await addBlob(b)

  const manifest: VoidManifest = {
    format: 'voidcanvas', version: VOID_VERSION, minReader: VOID_MIN_READER,
    app: opts.app ?? 'voidcanvas-web', savedAt: new Date().toISOString(),
    doc: p.doc, layers: p.layers, groups: p.groups ?? [], swatches: p.swatches ?? [],
    assets, fonts,
    ...(opts.preview ? { preview: 'preview.png' } : {}),
  }
  const entries = [
    { name: 'mimetype', data: enc.encode(VOID_MIME) },
    { name: 'manifest.json', data: enc.encode(JSON.stringify(manifest)) },
    ...(opts.preview ? [{ name: 'preview.png', data: new Uint8Array(await opts.preview.arrayBuffer()) }] : []),
    ...Array.from(files, ([name, data]) => ({ name, data })),
  ]
  return zipFiles(entries, VOID_MIME)
}

// ─── Read ──────────────────────────────────────────────────────────

/** Open any .void: a version 3 ZIP, a version 1 or 2 JSON file, or either inside a .void.png. */
export async function readVoid(bytes: Uint8Array): Promise<ReadResult> {
  if (isPng(bytes)) {
    const zip = readPngChunk(bytes, 'voId')
    if (zip) return readVoid(zip)
    const text = readPngText(bytes, 'voidcanvas')
    if (!text) throw new VoidFileError('That PNG has no Voidcanvas project inside it.')
    return readLegacy(parseJson(text))
  }
  if (isZip(bytes)) return readZip(bytes)
  return readLegacy(parseJson(dec.decode(bytes)))
}

function parseJson(text: string): any {
  try { return JSON.parse(text) } catch { throw new VoidFileError('That is not a Voidcanvas file.') }
}

async function readZip(bytes: Uint8Array): Promise<ReadResult> {
  let files: Map<string, Uint8Array>
  try { files = await unzip(bytes) } catch { throw new VoidFileError('That file is damaged or is not a Voidcanvas file.') }
  const raw = files.get('manifest.json')
  if (!raw) throw new VoidFileError('That is not a Voidcanvas file.')
  const m = parseJson(dec.decode(raw)) as VoidManifest
  if (m?.format !== 'voidcanvas') throw new VoidFileError('That is not a Voidcanvas file.')
  const notes: string[] = []
  if ((m.minReader ?? m.version) > VOID_VERSION) throw new VoidFileError('This file was saved by a newer Voidcanvas. Reload the page or update the app to open it.')
  if (m.version > VOID_VERSION) notes.push('This file was saved by a newer Voidcanvas. Anything this version does not know about is left out.')

  const load = (ref: AssetRef | undefined, what: string): Blob | undefined => {
    if (!ref) return undefined
    const data = files.get(`blobs/${ref.hash}.${extFor(ref.type)}`) ?? findByHash(files, ref.hash)
    if (!data) { notes.push(`Part of the file is missing (${what}).`); return undefined }
    return blobOf(data, ref.type)
  }
  const blobs: Record<string, Blob> = {}
  for (const [k, ref] of Object.entries(m.assets ?? {})) { const b = load(ref, k); if (b) blobs[k] = b }
  const fonts: Record<string, Blob> = {}
  for (const [k, ref] of Object.entries(m.fonts ?? {})) { const b = load(ref, `font ${k}`); if (b) fonts[k] = b }

  const project = finish({ id: m.doc?.id, doc: m.doc, layers: m.layers ?? [], groups: m.groups ?? [], swatches: m.swatches ?? [], blobs, fonts }, notes)
  return { project, version: m.version, notes: dedupe(notes) }
}

function findByHash(files: Map<string, Uint8Array>, hash: string) {
  return Array.from(files.entries()).find(([name]) => name.startsWith(`blobs/${hash}`))?.[1]
}

/** Versions 1 and 2: one JSON object, bitmaps base64 inline. No fonts were saved in these versions. */
function readLegacy(b: any): ReadResult {
  if (b?.format !== 'voidcanvas' || !b.doc) throw new VoidFileError('That is not a Voidcanvas file.')
  const notes: string[] = []
  const types: Record<string, string> = b.types ?? {}
  const blobs: Record<string, Blob> = {}
  for (const [k, v] of Object.entries(b.blobs ?? {})) {
    try { blobs[k] = blobOf(base64ToBytes(v as string), types[k] ?? 'image/png') } catch { notes.push(`Part of the file is missing (${k}).`) }
  }
  const project = finish({ id: b.doc.id, doc: b.doc, layers: b.layers ?? [], groups: b.groups ?? [], swatches: b.swatches ?? [], blobs, fonts: {} }, notes)
  return { project, version: b.version ?? 1, notes: dedupe(notes) }
}

/** Checks common to every version: leave out layer types this build cannot draw. */
function finish(p: VoidProject, notes: string[]): VoidProject {
  const known = p.layers.filter(l => KNOWN_LAYER_TYPES.includes(l?.type))
  const dropped = p.layers.length - known.length
  if (dropped) notes.push(`${dropped} layer${dropped === 1 ? ' uses a feature' : 's use features'} from a newer Voidcanvas and ${dropped === 1 ? 'was' : 'were'} left out.`)
  return { ...p, layers: known }
}

const dedupe = (a: string[]) => Array.from(new Set(a))

// ─── .void.png: the project inside a real PNG ──────────────────────
// The picture previews anywhere. The project rides in a private ancillary chunk named "voId"
// (ancillary, private, safe to copy), holding the version 3 ZIP as raw bytes.
// Older .void.png files carry a version 2 JSON in a tEXt chunk with keyword "voidcanvas"; both are read.

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
export const isPng = (b: Uint8Array) => b.length > 8 && PNG_SIG.every((v, i) => b[i] === v)


function chunk(type: string, data: Uint8Array): Uint8Array {
  const t = enc.encode(type)
  const out = new Uint8Array(12 + data.length)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, data.length); out.set(t, 4); out.set(data, 8)
  const crcIn = new Uint8Array(4 + data.length); crcIn.set(t, 0); crcIn.set(data, 4)
  dv.setUint32(8 + data.length, crc32(crcIn))
  return out
}

/** Put `data` in a chunk of `type` just before IEND. */
export function embedPngChunk(png: Uint8Array, type: string, data: Uint8Array): Uint8Array {
  const c = chunk(type, data)
  const iend = findChunk(png, 'IEND') ?? png.length - 12
  const out = new Uint8Array(png.length + c.length)
  out.set(png.subarray(0, iend), 0); out.set(c, iend); out.set(png.subarray(iend), iend + c.length)
  return out
}

function findChunk(png: Uint8Array, want: string): number | null {
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength)
  let off = 8
  while (off + 8 <= png.length) {
    const len = dv.getUint32(off)
    if (dec.decode(png.subarray(off + 4, off + 8)) === want) return off
    off += 12 + len
  }
  return null
}

export function readPngChunk(png: Uint8Array, type: string): Uint8Array | null {
  const at = findChunk(png, type); if (at == null) return null
  const len = new DataView(png.buffer, png.byteOffset).getUint32(at)
  return png.subarray(at + 8, at + 8 + len)
}

function readPngText(png: Uint8Array, keyword: string): string | null {
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength)
  let off = 8
  while (off + 8 <= png.length) {
    const len = dv.getUint32(off)
    const type = dec.decode(png.subarray(off + 4, off + 8))
    if (type === 'tEXt') {
      const data = png.subarray(off + 8, off + 8 + len)
      const zero = data.indexOf(0)
      if (zero > 0 && dec.decode(data.subarray(0, zero)) === keyword) return dec.decode(data.subarray(zero + 1))
    }
    if (type === 'IEND') break
    off += 12 + len
  }
  return null
}

/** A .void.png: the preview picture with the version 3 project inside. */
export async function writeVoidPng(p: VoidProject, preview: Blob): Promise<Blob> {
  const zip = new Uint8Array(await (await writeVoid(p)).arrayBuffer())
  const png = new Uint8Array(await preview.arrayBuffer())
  return new Blob([embedPngChunk(png, 'voId', zip) as BlobPart], { type: 'image/png' })
}
