// Read preview.png out of a .void (ZIP) without loading the whole file: the central directory is at the end.
const fsp = require('node:fs/promises')
const zlib = require('node:zlib')

async function readPreview(file) {
  const fh = await fsp.open(file, 'r')
  try {
    const { size } = await fh.stat()
    const tailLen = Math.min(size, 65557)
    const tail = Buffer.alloc(tailLen)
    await fh.read(tail, 0, tailLen, size - tailLen)
    let eocd = -1
    for (let i = tailLen - 22; i >= 0; i--) if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
    if (eocd < 0) return null
    const cdSize = tail.readUInt32LE(eocd + 12), cdOff = tail.readUInt32LE(eocd + 16), count = tail.readUInt16LE(eocd + 10)
    const cd = Buffer.alloc(cdSize)
    await fh.read(cd, 0, cdSize, cdOff)
    let p = 0
    for (let n = 0; n < count && p + 46 <= cd.length; n++) {
      const method = cd.readUInt16LE(p + 10), csize = cd.readUInt32LE(p + 20)
      const nlen = cd.readUInt16LE(p + 28), xlen = cd.readUInt16LE(p + 30), clen = cd.readUInt16LE(p + 32), local = cd.readUInt32LE(p + 42)
      const name = cd.toString('utf8', p + 46, p + 46 + nlen)
      p += 46 + nlen + xlen + clen
      if (name !== 'preview.png' || csize > 8 * 1024 * 1024) continue
      const lh = Buffer.alloc(30); await fh.read(lh, 0, 30, local)
      const start = local + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28)
      const data = Buffer.alloc(csize); await fh.read(data, 0, csize, start)
      const png = method === 8 ? zlib.inflateRawSync(data) : data
      return 'data:image/png;base64,' + png.toString('base64')
    }
    return null
  } finally { await fh.close() }
}

module.exports = { readPreview }
