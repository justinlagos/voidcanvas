import { describe, expect, it } from 'vitest'
import { profilePixels } from './asset'
import { deriveGraphicLanguage, measureShape } from './shape'

type Img = { data: Uint8ClampedArray; w: number; h: number }
const img = (w: number, h: number): Img => ({ data: new Uint8ClampedArray(w * h * 4), w, h })
const px = (i: Img, x: number, y: number, a = 255) => { const o = (y * i.w + x) * 4; i.data[o] = 20; i.data[o + 1] = 20; i.data[o + 2] = 20; i.data[o + 3] = a }
const rect = (i: Img, x0: number, y0: number, w: number, h: number) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && y >= 0 && x < i.w && y < i.h) px(i, x, y) }

function diagonal() {
  const i = img(120, 120)
  for (let y = 20; y < 100; y++) for (let t = -5; t <= 5; t++) px(i, y + t, y)
  return i
}

function ring() {
  const i = img(120, 120)
  for (let y = 0; y < 120; y++) for (let x = 0; x < 120; x++) {
    const d = Math.hypot(x - 60, y - 60)
    if (d >= 31 && d <= 43) px(i, x, y)
  }
  return i
}

describe('shape intelligence', () => {
  it('recognises an orthogonal mark and derives hard graphic rules', () => {
    const i = img(160, 100)
    rect(i, 20, 20, 120, 60)
    const asset = profilePixels(i.data, i.w, i.h)
    const shape = measureShape(i.data, i.w, i.h, asset)
    expect(shape.character).toBe('orthogonal')
    expect(shape.orthogonalShare).toBeGreaterThan(0.45)
    expect(shape.symmetry.vertical).toBeGreaterThan(0.9)
    const language = deriveGraphicLanguage(shape, asset)
    expect(language.frameAspect).toBeGreaterThan(1)
    expect(language.source.frameAspect).toMatch(/Detected from the mark/)
  })

  it('recognises a diagonal mark and uses an angle-field pattern', () => {
    const i = diagonal()
    const asset = profilePixels(i.data, i.w, i.h)
    const shape = measureShape(i.data, i.w, i.h, asset)
    expect(shape.character).toBe('diagonal')
    expect(shape.diagonalShare).toBeGreaterThan(0.3)
    expect(deriveGraphicLanguage(shape, asset).pattern).toBe('angle-field')
  })

  it('reads curved open marks as having meaningful negative space', () => {
    const i = ring()
    const asset = profilePixels(i.data, i.w, i.h)
    const shape = measureShape(i.data, i.w, i.h, asset)
    expect(shape.curvedShare).toBeGreaterThan(0.25)
    expect(shape.negativeSpace).toBeGreaterThan(0.3)
    expect(shape.distinctiveCounterspace).toBe(true)
  })
})
