/** Baseline uncompressed, chunky CMYK TIFF with ICC profile and physical print resolution. */
export function cmykTiff(w: number, h: number, pixels: Uint8Array, icc: Uint8Array, dpi = 300): Uint8Array {
  if (w < 1 || h < 1 || pixels.length !== w * h * 4 || !Number.isFinite(dpi) || dpi <= 0)
    throw Error('Invalid print image')
  const tags = 17,
    ifdEnd = 8 + 2 + tags * 12 + 4,
    bitsAt = ifdEnd,
    resAt = bitsAt + 8,
    iccAt = resAt + 16,
    dataAt = (iccAt + icc.length + 3) & ~3
  const bytes = new Uint8Array(dataAt + pixels.length),
    v = new DataView(bytes.buffer)
  bytes.set([73, 73])
  v.setUint16(2, 42, true)
  v.setUint32(4, 8, true)
  v.setUint16(8, tags, true)
  const list: [number, number, number, number][] = [
    [256, 4, 1, w],
    [257, 4, 1, h],
    [258, 3, 4, bitsAt],
    [259, 3, 1, 1],
    [262, 3, 1, 5],
    [273, 4, 1, dataAt],
    [277, 3, 1, 4],
    [278, 4, 1, h],
    [279, 4, 1, pixels.length],
    [282, 5, 1, resAt],
    [283, 5, 1, resAt + 8],
    [284, 3, 1, 1],
    [296, 3, 1, 2],
    [332, 3, 1, 1],
    [334, 3, 1, 4],
    [339, 3, 1, 1],
    [34675, 7, icc.length, iccAt],
  ]
  list.forEach(([tag, type, count, value], i) => {
    const o = 10 + i * 12
    v.setUint16(o, tag, true)
    v.setUint16(o + 2, type, true)
    v.setUint32(o + 4, count, true)
    if (type === 3 && count === 1) v.setUint16(o + 8, value, true)
    else v.setUint32(o + 8, value, true)
  })
  for (let i = 0; i < 4; i++) v.setUint16(bitsAt + i * 2, 8, true)
  for (const at of [resAt, resAt + 8]) {
    v.setUint32(at, Math.round(dpi * 1000), true)
    v.setUint32(at + 4, 1000, true)
  }
  bytes.set(icc, iccAt)
  bytes.set(pixels, dataAt)
  return bytes
}
