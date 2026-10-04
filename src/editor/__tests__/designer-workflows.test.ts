import { describe, expect, it } from 'vitest'
import { healPixels } from '../healing'
import { liquifyPixels } from '../liquify'
import { cmykTiff } from '../cmyk-tiff'
const fixture = (w = 220, h = 180) => {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4,
        s = (x + y) % 12 < 3
      data.set(s ? [135, 24, 35, 255] : [90, 13, 26, 255], i)
    }
  return data
}
const mask = (w: number, h: number, rects: number[][]) => {
  const data = new Uint8ClampedArray(w * h * 4)
  for (const [xx, yy, bw, bh, a = 255] of rects)
    for (let y = yy; y < yy + bh; y++) for (let x = xx; x < xx + bw; x++) data[(y * w + x) * 4 + 3] = a
  return data
}
describe('Texture repair', () => {
  it('removes several disconnected text regions without copying the other selected text', () => {
    const w = 220,
      h = 180,
      clean = fixture(w, h),
      src = new Uint8ClampedArray(clean),
      hole = mask(w, h, [
        [55, 42, 65, 18],
        [80, 98, 72, 19],
      ])
    for (let i = 0; i < src.length; i += 4) if (hole[i + 3]) src.set([255, 230, 20, 255], i)
    const out = healPixels(src, hole, hole, w, h)
    expect(out).not.toBeNull()
    let wrong = 0,
      outside = 0
    for (let i = 0; i < src.length; i += 4) {
      if (hole[i + 3]) {
        for (let c = 0; c < 4; c++) if (out![i + c] !== clean[i + c]) wrong++
      } else for (let c = 0; c < 4; c++) if (out![i + c] !== src[i + c]) outside++
    }
    expect(wrong).toBe(0)
    expect(outside).toBe(0)
  })
  it('excludes a larger pixel selection when healing only a small stroke', () => {
    const w = 220,
      h = 180,
      clean = fixture(w, h),
      src = new Uint8ClampedArray(clean),
      hole = mask(w, h, [[80, 80, 20, 10]]),
      excluded = mask(w, h, [[50, 60, 80, 70]])
    for (let i = 0; i < src.length; i += 4) if (excluded[i + 3]) src.set([250, 220, 10, 255], i)
    const out = healPixels(src, hole, excluded, w, h)
    expect(out).not.toBeNull()
    for (let i = 0; i < src.length; i += 4)
      if (hole[i + 3]) expect(Array.from(out!.slice(i, i + 4))).toEqual(Array.from(clean.slice(i, i + 4)))
  })
  it('finds real background when the stroke crosses a selected edge of lettering', () => {
    const w = 400,
      h = 400,
      src = new Uint8ClampedArray(w * h * 4),
      hole = new Uint8ClampedArray(src.length),
      excluded = mask(w, h, [[100, 100, 100, 100]])
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        src.set(x >= 90 && x < 130 && y >= 138 && y < 162 ? [170, 34, 85, 255] : [51, 153, 85, 255], i)
        if (x >= 100 && Math.hypot(x - 105, y - 150) < 15) hole[i + 3] = 255
      }
    const out = healPixels(src, hole, excluded, w, h)
    expect(out).not.toBeNull()
    expect(out![(150 * w + 105) * 4]).toBe(51)
    expect(out![(150 * w + 105) * 4 + 1]).toBe(153)
  })
  it('rejects selections without an opaque clean donor instead of applying a bad fill', () => {
    const src = fixture(50, 50),
      hole = mask(50, 50, [[0, 0, 50, 50]])
    expect(healPixels(src, hole, hole, 50, 50)).toBeNull()
    expect(
      healPixels(
        new Uint8ClampedArray(400),
        mask(10, 10, [[2, 2, 3, 3]]),
        new Uint8ClampedArray(400),
        10,
        10,
      ),
    ).toBeNull()
  })
  it('applies feather coverage once and leaves unselected bytes intact', () => {
    const w = 100,
      h = 100,
      src = fixture(w, h),
      hole = mask(w, h, [[35, 35, 20, 10, 128]])
    for (let i = 0; i < src.length; i += 4) if (hole[i + 3]) src.set([255, 230, 20, 255], i)
    const out = healPixels(src, hole, hole, w, h)!
    expect(out).not.toBeNull()
    for (let i = 0; i < src.length; i += 4)
      if (!hole[i + 3]) expect(Array.from(out.slice(i, i + 4))).toEqual(Array.from(src.slice(i, i + 4)))
    expect(out[(35 * w + 35) * 4]).toBeLessThan(255)
    expect(out[(35 * w + 35) * 4]).toBeGreaterThan(90)
  })
})
describe('Reversible liquify', () => {
  it('identity and reset retain every source byte', () => {
    const src = fixture(40, 40),
      before = new Uint8ClampedArray(src)
    expect(liquifyPixels(src, 40, 40, [])).toEqual(src)
    expect(src).toEqual(before)
  })
  it('warps only inside the brush footprint while retaining the source', () => {
    const src = fixture(40, 40),
      before = new Uint8ClampedArray(src),
      out = liquifyPixels(src, 40, 40, [
        { x: 0.5, y: 0.5, dx: 0.12, dy: 0, radius: 0.3, strength: 1, mode: 'push' },
      ])
    expect(out).not.toEqual(src)
    expect(out.slice(0, 160)).toEqual(src.slice(0, 160))
    expect(src).toEqual(before)
  })
  it('uses premultiplied alpha so transparent pixels cannot introduce colour fringes', () => {
    const src = new Uint8ClampedArray(20 * 20 * 4)
    for (let i = 0; i < 400; i++) src.set(i % 20 < 10 ? [255, 0, 0, 0] : [0, 255, 0, 255], i * 4)
    const out = liquifyPixels(src, 20, 20, [
      { x: 0.5, y: 0.5, dx: 0.05, dy: 0, radius: 0.45, strength: 1, mode: 'push' },
    ])
    for (let i = 0; i < out.length; i += 4)
      if (out[i + 3] > 0) {
        expect(out[i]).toBe(0)
        expect(out[i + 1]).toBe(255)
      }
  })
})
describe('CMYK TIFF', () => {
  it('writes 4-channel ink bytes with ICC and resolution tags', () => {
    const pixels = new Uint8Array([0, 20, 30, 40, 255, 200, 100, 50]),
      icc = new Uint8Array(128).fill(7),
      out = cmykTiff(2, 1, pixels, icc, 300),
      v = new DataView(out.buffer),
      tags = new Map<number, { type: number; count: number; value: number }>()
    expect(Array.from(out.slice(0, 4))).toEqual([73, 73, 42, 0])
    const n = v.getUint16(8, true)
    for (let i = 0; i < n; i++) {
      const o = 10 + i * 12
      tags.set(v.getUint16(o, true), {
        type: v.getUint16(o + 2, true),
        count: v.getUint32(o + 4, true),
        value: v.getUint32(o + 8, true),
      })
    }
    expect(tags.get(262)!.value).toBe(5)
    expect(tags.get(277)!.value).toBe(4)
    expect(tags.get(332)!.value).toBe(1)
    expect(out.slice(tags.get(273)!.value)).toEqual(pixels)
    expect(out.slice(tags.get(34675)!.value, tags.get(34675)!.value + 128)).toEqual(icc)
    expect(v.getUint32(tags.get(282)!.value, true) / v.getUint32(tags.get(282)!.value + 4, true)).toBe(300)
  })
})
