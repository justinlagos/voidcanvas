import { describe, expect, it } from 'vitest'
import { boardFileName, formatRange, maxScale, parseRange, pdfPageSize, resultLabel, scaleOptions, uniqueNames } from '../export'
import { boardGap, placeBeside, placeRowBelow } from '../frames'

describe('page ranges', () => {
  it('reads lists and ranges', () => {
    expect(parseRange('1-3, 5', 8)).toEqual([0, 1, 2, 4])
    expect(parseRange('6-', 8)).toEqual([5, 6, 7])
    expect(parseRange('-2', 8)).toEqual([0, 1])
    expect(parseRange('3-1', 8)).toEqual([2, 1, 0])
    expect(parseRange('2 2 2', 8)).toEqual([1])
  })
  it('drops numbers past the last board and rejects junk', () => {
    expect(parseRange('9, 2', 4)).toEqual([1])
    expect(parseRange('0', 4)).toBeNull()
    expect(parseRange('a-b', 4)).toBeNull()
    expect(parseRange('', 4)).toBeNull()
  })
  it('writes indexes back compactly', () => {
    expect(formatRange([0, 1, 2, 4])).toBe('1-3, 5')
    expect(formatRange([3])).toBe('4')
  })
})

describe('export sizes and names', () => {
  it('offers 1x and up for normal boards, a fraction only when 1x cannot fit', () => {
    expect(scaleOptions([{ width: 1080, height: 1080 }])).toEqual([1, 2, 3, 4])
    const big = scaleOptions([{ width: 9850, height: 2770 }])
    expect(big[0]).toBe(1)
    expect(Math.max(...big) * 9850).toBeLessThanOrEqual(16384)
    const huge = scaleOptions([{ width: 30000, height: 20000 }])
    expect(huge.length).toBe(1)
    expect(huge[0]).toBeLessThan(1)
  })
  it('limits by the largest chosen board', () => {
    expect(maxScale([{ width: 1000, height: 1000 }, { width: 8000, height: 1000 }])).toBeCloseTo(16384 / 8000, 3)
  })
  it('names files from a pattern: design, board and pixel size, numbered in a zip', () => {
    expect(boardFileName({ name: 'Square post', width: 1080, height: 1080 }, 0, 4, 'png', 2, true, undefined, 'Launch')).toBe('01_Launch_Square post_2160x2160.png')
    expect(boardFileName({ name: 'Story 1080x1920', width: 1080, height: 1920 }, 2, 4, 'jpeg', 1, true, undefined, 'Launch')).toBe('03_Launch_Story 1080x1920.jpg')
    expect(boardFileName({ name: 'a/b', width: 10, height: 10 }, 0, 1, 'webp', 1, false, undefined, 'x')).toBe('x_ab_10x10.webp')
    expect(boardFileName({ name: 'Story', width: 1080, height: 1920 }, 1, 2, 'png', 1, true, '{board}-{n}-{scale}', 'Launch')).toBe('Story-02-1x.png')
    expect(boardFileName({ name: 'Post', width: 100, height: 100 }, 0, 1, 'svg', 1, false, '{design} {date}', 'Kobo', new Date(2026, 8, 28))).toBe('Kobo 2026-09-28.svg')
    expect(uniqueNames(['a.png', 'a.png', 'b.png'])).toEqual(['a.png', 'a (2).png', 'b.png'])
  })
  it('sizes PDF pages per board', () => {
    expect(pdfPageSize({ width: 1080, height: 1080 })).toEqual({ w: 810, h: 810, dpi: 96 })
    const a4 = pdfPageSize({ width: 2480, height: 3508 })
    expect(a4.dpi).toBe(300)
    expect(a4.w / 72 * 25.4).toBeCloseTo(210, 0)
  })
  it('says what the download will be', () => {
    expect(resultLabel('pdf', 4, false)).toBe('Download PDF, 4 pages')
    expect(resultLabel('pdf', 4, true)).toBe('Download 4 PDFs (zip)')
    expect(resultLabel('png', 3, false)).toBe('Download 3 PNGs (zip)')
    expect(resultLabel('jpeg', 1, false)).toBe('Download JPG')
    expect(resultLabel('svg', 2, false)).toBe('Download 2 SVGs (zip)')
  })
})

describe('placing boards', () => {
  const overlap = (a: any, b: any, gap: number) => a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y
  it('never lands on another board', () => {
    const taken = [{ x: 0, y: 0, w: 1000, h: 500 }, { x: 1120, y: 0, w: 400, h: 400 }, { x: 0, y: 620, w: 1000, h: 300 }]
    for (const side of ['right', 'left', 'top', 'bottom'] as const) {
      const p = placeBeside(taken, taken[0], 1000, 500, side, 120)
      const r = { x: p.x, y: p.y, w: 1000, h: 500 }
      for (const t of taken) expect(overlap(r, t, 119)).toBe(false)
    }
  })
  it('puts the first free spot right beside the board', () => {
    expect(placeBeside([{ x: 0, y: 0, w: 100, h: 100 }], { x: 0, y: 0, w: 100, h: 100 }, 100, 100, 'right', 120)).toEqual({ x: 220, y: 0 })
  })
  it('lays a row under everything', () => {
    const r = placeRowBelow([{ x: 0, y: 0, w: 9850, h: 2770 }, { x: 0, y: 3000, w: 500, h: 900 }], 0, [{ width: 1584, height: 396 }, { width: 1080, height: 1080 }], 160)
    expect(r[0]).toEqual({ x: 0, y: 3900 + 320 })
    expect(r[1].x).toBe(1584 + 160)
  })
  it('scales the gap with big boards', () => {
    expect(boardGap([{ width: 1080, height: 1080 }])).toBe(120)
    expect(boardGap([{ width: 9850, height: 2770 }])).toBeGreaterThan(120)
  })
})
