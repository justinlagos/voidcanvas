import { describe, expect, it } from 'vitest'
import { deflateRawSync } from 'node:zlib'
import { embedPngChunk, readVoid, VOID_MIME, VOID_VERSION, VoidFileError, writeVoid, writeVoidPng, type VoidProject } from '../voidfile'
import { crc32, unzip, zipFiles } from '../zip'

const bytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer())
const png = (seed: number) => new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, seed, seed + 1, seed + 2])], { type: 'image/png' })

// A minimal valid PNG (1x1), so chunk handling runs on the real structure.
function tinyPng(): Uint8Array {
  const enc = new TextEncoder()
  const chunk = (type: string, data: number[]) => {
    const t = enc.encode(type), d = new Uint8Array(data), out = new Uint8Array(12 + d.length), dv = new DataView(out.buffer)
    dv.setUint32(0, d.length); out.set(t, 4); out.set(d, 8)
    const c = new Uint8Array(4 + d.length); c.set(t); c.set(d, 4); dv.setUint32(8 + d.length, crc32(c))
    return out
  }
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]), chunk('IDAT', [120, 156, 99, 248, 15, 0, 1, 1, 1, 0]), chunk('IEND', [])]
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}

function project(): VoidProject {
  return {
    id: 'd1',
    doc: { id: 'd1', name: 'Poster', width: 1080, height: 1350, background: '#fff', channelMeta: [{ id: 'c1', name: 'Alpha 1' }] },
    layers: [
      { id: 'L1', type: 'raster', name: 'Photo', hasMask: true },
      { id: 'L2', type: 'text', name: 'Title', text: 'Hello', fontFamily: 'My Font' },
      { id: 'L3', type: 'raster', name: 'Photo copy', hasMask: false },
    ],
    groups: [],
    swatches: ['#111111'],
    blobs: { L1: png(1), 'L1:mask': png(2), L3: png(1), 'ch:c1': png(3) },
    fonts: { 'My Font': new Blob([new Uint8Array([0, 1, 0, 0, 9])], { type: 'font/ttf' }) },
  }
}

describe('.void version 3', () => {
  it('round-trips a design with masks, channels and fonts', async () => {
    const file = await writeVoid(project(), { preview: png(9) })
    expect(file.type).toBe(VOID_MIME)
    const r = await readVoid(await bytes(file))
    expect(r.version).toBe(VOID_VERSION)
    expect(r.notes).toEqual([])
    expect(r.project.doc.name).toBe('Poster')
    expect(r.project.layers.map(l => l.id)).toEqual(['L1', 'L2', 'L3'])
    expect(Object.keys(r.project.blobs).sort()).toEqual(['L1', 'L1:mask', 'L3', 'ch:c1'])
    expect(await bytes(r.project.blobs['L1:mask'])).toEqual(await bytes(png(2)))
    expect(r.project.blobs.L1.type).toBe('image/png')
    expect(await bytes(r.project.fonts!['My Font'])).toEqual(new Uint8Array([0, 1, 0, 0, 9]))
  })

  it('starts with the mimetype entry and stores identical pixels once', async () => {
    const files = await unzip(await bytes(await writeVoid(project(), { preview: png(9) })))
    const names = Array.from(files.keys())
    expect(names[0]).toBe('mimetype')
    expect(new TextDecoder().decode(files.get('mimetype'))).toBe(VOID_MIME)
    expect(names).toContain('manifest.json')
    expect(names).toContain('preview.png')
    // L1 and L3 share bytes: 3 distinct images + 1 font
    expect(names.filter(n => n.startsWith('blobs/'))).toHaveLength(4)
    const m = JSON.parse(new TextDecoder().decode(files.get('manifest.json')))
    expect(m.assets.L1.hash).toBe(m.assets.L3.hash)
    expect(m.assets.L1.hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('reads a file another tool re-zipped with deflate', async () => {
    const orig = await unzip(await bytes(await writeVoid(project())))
    // Rebuild as a deflate ZIP by hand.
    const enc = new TextEncoder(); const out: Uint8Array[] = []; const cen: Uint8Array[] = []; let off = 0
    for (const [name, data] of Array.from(orig)) {
      const comp = new Uint8Array(deflateRawSync(data)), n = enc.encode(name), crc = crc32(data)
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(8, 8, true); h.setUint32(14, crc, true); h.setUint32(18, comp.length, true); h.setUint32(22, data.length, true); h.setUint16(26, n.length, true)
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(10, 8, true); c.setUint32(16, crc, true); c.setUint32(20, comp.length, true); c.setUint32(24, data.length, true); c.setUint16(28, n.length, true); c.setUint32(42, off, true)
      out.push(new Uint8Array(h.buffer), n, comp); cen.push(new Uint8Array(c.buffer), n); off += 30 + n.length + comp.length
    }
    const size = cen.reduce((a, c) => a + c.length, 0)
    const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, orig.size, true); e.setUint16(10, orig.size, true); e.setUint32(12, size, true); e.setUint32(16, off, true)
    const r = await readVoid(await bytes(new Blob([...out, ...cen, new Uint8Array(e.buffer)] as BlobPart[])))
    expect(r.project.layers).toHaveLength(3)
    expect(await bytes(r.project.blobs['ch:c1'])).toEqual(await bytes(png(3)))
  })
})

describe('older and newer files', () => {
  const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64')

  it('opens a version 2 JSON .void', async () => {
    const v2 = { format: 'voidcanvas', version: 2, doc: { id: 'x', name: 'Old', width: 10, height: 10 }, layers: [{ id: 'A', type: 'raster', hasMask: false }], groups: [], swatches: [], blobs: { A: b64(await bytes(png(5))) } }
    const r = await readVoid(new TextEncoder().encode(JSON.stringify(v2)))
    expect(r.version).toBe(2)
    expect(r.project.doc.name).toBe('Old')
    expect(await bytes(r.project.blobs.A)).toEqual(await bytes(png(5)))
  })

  it('opens a version 2 .void.png (tEXt chunk)', async () => {
    const v2 = { format: 'voidcanvas', version: 2, doc: { id: 'x', name: 'Old png', width: 10, height: 10 }, layers: [], groups: [], swatches: [], blobs: {} }
    const enc = new TextEncoder(); const kw = enc.encode('voidcanvas'), tx = enc.encode(JSON.stringify(v2))
    const data = new Uint8Array(kw.length + 1 + tx.length); data.set(kw); data.set(tx, kw.length + 1)
    const r = await readVoid(embedPngChunk(tinyPng(), 'tEXt', data))
    expect(r.project.doc.name).toBe('Old png')
  })

  it('round-trips a version 3 .void.png and keeps the picture valid', async () => {
    const file = await bytes(await writeVoidPng(project(), new Blob([tinyPng() as BlobPart], { type: 'image/png' })))
    // Still ends with IEND, so image viewers show it.
    expect(new TextDecoder().decode(file.subarray(file.length - 8, file.length - 4))).toBe('IEND')
    const r = await readVoid(file)
    expect(r.version).toBe(3)
    expect(r.project.layers).toHaveLength(3)
  })

  it('opens a newer file that older readers are allowed to read, and says what was left out', async () => {
    const files = await unzip(await bytes(await writeVoid(project())))
    const m = JSON.parse(new TextDecoder().decode(files.get('manifest.json')))
    m.version = VOID_VERSION + 1
    m.layers.push({ id: 'L9', type: 'video' })
    files.set('manifest.json', new TextEncoder().encode(JSON.stringify(m)))
    const zip = await zipFiles(Array.from(files, ([name, data]) => ({ name, data })))
    const r = await readVoid(await bytes(zip))
    expect(r.project.layers.map(l => l.id)).toEqual(['L1', 'L2', 'L3'])
    expect(r.notes.join(' ')).toMatch(/newer Voidcanvas/)
    expect(r.notes.join(' ')).toMatch(/1 layer uses a feature/)
  })

  it('refuses a file that needs a newer reader, with a clear message', async () => {
    const files = await unzip(await bytes(await writeVoid(project())))
    const m = JSON.parse(new TextDecoder().decode(files.get('manifest.json')))
    m.version = m.minReader = VOID_VERSION + 1
    files.set('manifest.json', new TextEncoder().encode(JSON.stringify(m)))
    const zip = await zipFiles(Array.from(files, ([name, data]) => ({ name, data })))
    await expect(readVoid(await bytes(zip))).rejects.toThrow(/newer Voidcanvas/)
  })

  it('reports missing parts instead of failing', async () => {
    const files = await unzip(await bytes(await writeVoid(project())))
    const m = JSON.parse(new TextDecoder().decode(files.get('manifest.json')))
    files.delete(`blobs/${m.assets['ch:c1'].hash}.png`)
    const zip = await zipFiles(Array.from(files, ([name, data]) => ({ name, data })))
    const r = await readVoid(await bytes(zip))
    expect(r.project.blobs['ch:c1']).toBeUndefined()
    expect(r.notes.join(' ')).toMatch(/missing/)
  })

  it('rejects things that are not Voidcanvas files', async () => {
    await expect(readVoid(new TextEncoder().encode('hello'))).rejects.toBeInstanceOf(VoidFileError)
    await expect(readVoid(tinyPng())).rejects.toThrow(/no Voidcanvas project/)
    await expect(readVoid(new TextEncoder().encode('{"format":"other"}'))).rejects.toBeInstanceOf(VoidFileError)
  })
})
