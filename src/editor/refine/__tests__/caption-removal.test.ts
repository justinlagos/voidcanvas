import { describe, expect, it } from 'vitest'
import { healPixels } from '../../healing'

/**
 * C3 flagship scenario as a deterministic fixture: dark caption bar carrying
 * white lettering, sitting on a photographic-style gradient with a sun disc.
 * Mirrors e2e/refine-flow.mjs (800x600). Hole CONTENT is irrelevant to donor
 * search (hole + excluded pixels are never read as donors), so lettering is
 * omitted — only the surrounding pixels the algorithm may sample are modelled.
 */
const W = 800
const H = 600
const BAR = { x: 120, y: 470, w: 560, h: 60 }

function fixture(): Uint8ClampedArray {
  const px = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = y / (H - 1)
      let r: number, g: number, b: number
      if (t < 0.7) {
        const k = t / 0.7
        r = 127 + (217 - 127) * k; g = 178 + (192 - 178) * k; b = 217 + (127 - 217) * k
      } else {
        const k = (t - 0.7) / 0.3
        r = 217 + (138 - 217) * k; g = 192 + (111 - 192) * k; b = 127 + (77 - 127) * k
      }
      if ((x - 620) ** 2 + (y - 140) ** 2 < 70 * 70) { r = 245; g = 230; b = 168 }
      if (x >= BAR.x && x < BAR.x + BAR.w && y >= BAR.y && y < BAR.y + BAR.h) { r = 58; g = 58; b = 58 }
      const i = (y * W + x) * 4
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255
    }
  }
  return px
}

function rect(x0: number, y0: number, w: number, h: number): Uint8ClampedArray {
  const m = new Uint8ClampedArray(W * H * 4)
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) m[(y * W + x) * 4 + 3] = 255
  return m
}

function mean(px: Uint8ClampedArray, x0: number, y0: number, w: number, h: number): number {
  let s = 0
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) { const i = (y * W + x) * 4; s += px[i] + px[i + 1] + px[i + 2] }
  return s / (w * h * 3)
}

describe('C3 caption removal: select the whole unwanted object', () => {
  it('removes the full caption bar and restores photographic background', () => {
    const src = fixture()
    const hole = rect(BAR.x, BAR.y, BAR.w, BAR.h)
    const out = healPixels(src, hole, hole, W, H)
    expect(out).not.toBeNull()
    // Bar was dark (~58); the filled region must read as background (~150+).
    expect(mean(out!, BAR.x, BAR.y, BAR.w, BAR.h)).toBeGreaterThan(150)
    // Pixel-integrity contract: everything outside the hole is bit-identical.
    for (let i = 0; i < src.length; i += 4) {
      if (hole[i + 3] !== 0) continue
      expect(out![i]).toBe(src[i])
      expect(out![i + 1]).toBe(src[i + 1])
      expect(out![i + 2]).toBe(src[i + 2])
      expect(out![i + 3]).toBe(src[i + 3])
    }
  })

  it('honestly refuses a hole buried inside the bar instead of faking a fill', () => {
    // A 300x40 rect deep inside the 560x60 bar has no clean full-box donor:
    // in-bar translations overlap the hole, out-of-bar donors mismatch the
    // bar-coloured ring. Null (shown as "No clean donor") beats a fake fill.
    const src = fixture()
    const hole = rect(200, 480, 300, 40)
    expect(healPixels(src, hole, hole, W, H)).toBeNull()
  })
})
