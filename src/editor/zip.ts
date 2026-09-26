// Small ZIP writer and reader, written by hand to avoid shipping a library.
// Writing stores files uncompressed (images are already compressed). Reading
// also accepts deflate, so a .void file someone re-zipped with another tool still opens.

const enc = new TextEncoder()
const dec = new TextDecoder()

let crcTable: Uint32Array | null = null
export function crc32(d: Uint8Array) {
  if (!crcTable) { crcTable = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c } }
  let c = 0xffffffff
  for (let i = 0; i < d.length; i++) c = crcTable[(c ^ d[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export interface ZipEntry { name: string; data: Uint8Array | Blob }

/** Uncompressed ZIP, entries in the order given. */
export async function zipFiles(files: { name: string; blob: Blob }[] | ZipEntry[], type = 'application/zip'): Promise<Blob> {
  const out: Uint8Array[] = [], central: Uint8Array[] = []
  let offset = 0
  for (const f of files as any[]) {
    const src: Blob | Uint8Array = f.data ?? f.blob
    const data = src instanceof Uint8Array ? src : new Uint8Array(await src.arrayBuffer())
    const name = enc.encode(f.name), crc = crc32(data)
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
  return new Blob([...out, ...central, new Uint8Array(end.buffer)] as BlobPart[], { type })
}

export const isZip = (b: Uint8Array) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot read compressed files.')
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw' as any))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Read every entry of a ZIP. Uses the central directory, so it copes with data descriptors. */
export async function unzip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new Error('Not a ZIP file')
  const count = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  const out = new Map<string, Uint8Array>()
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Damaged ZIP file')
    const method = dv.getUint16(p + 10, true)
    const csize = dv.getUint32(p + 20, true)
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true)
    const local = dv.getUint32(p + 42, true)
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nlen))
    p += 46 + nlen + xlen + clen
    if (name.endsWith('/')) continue
    const lnlen = dv.getUint16(local + 26, true), lxlen = dv.getUint16(local + 28, true)
    const start = local + 30 + lnlen + lxlen
    const raw = bytes.subarray(start, start + csize)
    if (method === 0) out.set(name, raw)
    else if (method === 8) out.set(name, await inflateRaw(raw))
    else throw new Error(`Unsupported compression in ${name}`)
  }
  return out
}
