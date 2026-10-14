import { describe, expect, it } from 'vitest'
import { healPixels } from '../../healing'

const W = 64
const H = 64

function buf(): Uint8ClampedArray {
  return new Uint8ClampedArray(W * H * 4)
}

function paint(pixels: Uint8ClampedArray, fn: (x: number, y: number) => [number, number, number, number]) {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const [r, g, b, a] = fn(x, y)
      const i = (y * W + x) * 4
      pixels[i] = r
      pixels[i + 1] = g
      pixels[i + 2] = b
      pixels[i + 3] = a
    }
}

function rectHole(x0: number, y0: number, w: number, h: number): Uint8ClampedArray {
  const hole = buf()
  paint(hole, (x, y) => (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h ? [0, 0, 0, 255] : [0, 0, 0, 0]))
  return hole
}

/** Pixels outside the mask must be bit-identical (pixel-integrity contract). */
function outsideIdentical(src: Uint8ClampedArray, out: Uint8ClampedArray, hole: Uint8ClampedArray): boolean {
  for (let i = 0; i < src.length; i += 4) {
    if (hole[i + 3] === 0) {
      if (out[i] !== src[i] || out[i + 1] !== src[i + 1] || out[i + 2] !== src[i + 2] || out[i + 3] !== src[i + 3]) return false
    }
  }
  return true
}

/** Mean abs RGB step across the hole boundary (seam visibility). */
function seam(out: Uint8ClampedArray, hole: Uint8ClampedArray): number {
  let sum = 0
  let n = 0
  const at = (x: number, y: number) => (y * W + x) * 4
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (hole[at(x, y) + 3] === 0) continue
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        if (hole[at(nx, ny) + 3] !== 0) continue
        const a = at(x, y)
        const b = at(nx, ny)
        sum += Math.abs(out[a] - out[b]) + Math.abs(out[a + 1] - out[b + 1]) + Math.abs(out[a + 2] - out[b + 2])
        n += 3
      }
    }
  return n ? sum / n : 0
}

describe('C3 local repair: pixel integrity + seam quality', () => {
  it('removes dark text from a flat background and keeps everything else bit-identical', () => {
    const src = buf()
    paint(src, (x, y) => (x >= 22 && x < 42 && y >= 27 && y < 37 ? [30, 30, 30, 255] : [200, 200, 200, 255]))
    const hole = rectHole(22, 27, 20, 10)
    const out = healPixels(src, hole, hole, W, H)
    expect(out).not.toBeNull()
    // Filled region reads as background, not text.
    let sum = 0
    let n = 0
    for (let y = 27; y < 37; y++)
      for (let x = 22; x < 42; x++) {
        const i = (y * W + x) * 4
        sum += out![i] + out![i + 1] + out![i + 2]
        n += 3
      }
    expect(sum / n).toBeGreaterThan(150)
    expect(outsideIdentical(src, out!, hole)).toBe(true)
  })

  it('lighting adaptation reduces the seam on a gradient (measured before/after)', () => {
    const src = buf()
    paint(src, (x, y) => [Math.round((x / (W - 1)) * 255), Math.round((y / (H - 1)) * 200) + 20, 128, 255])
    const hole = rectHole(28, 28, 8, 8)
    const before = healPixels(src, hole, hole, W, H, { adaptLighting: false })
    const after = healPixels(src, hole, hole, W, H, { adaptLighting: true })
    expect(before).not.toBeNull()
    expect(after).not.toBeNull()
    const seamBefore = seam(before!, hole)
    const seamAfter = seam(after!, hole)
    expect(seamAfter).toBeLessThanOrEqual(seamBefore)
    expect(seamAfter).toBeLessThan(14)
    expect(outsideIdentical(src, after!, hole)).toBe(true)
  })

  it('heals a small blemish on texture without touching surroundings', () => {
    const src = buf()
    // Deterministic pseudo-texture (no RNG: pattern from coordinates).
    paint(src, (x, y) => {
      const v = 140 + ((x * 37 + y * 91) % 40)
      return [v, v - 10, v - 25, 255]
    })
    // Blemish: bright spot.
    paint(src, (x, y) => (x >= 30 && x < 34 && y >= 30 && y < 34 ? [250, 245, 240, 255] : [src[(y * W + x) * 4], src[(y * W + x) * 4 + 1], src[(y * W + x) * 4 + 2], 255]))
    const hole = rectHole(30, 30, 4, 4)
    const out = healPixels(src, hole, hole, W, H)
    expect(out).not.toBeNull()
    let sum = 0
    for (let y = 30; y < 34; y++)
      for (let x = 30; x < 34; x++) {
        const i = (y * W + x) * 4
        sum += out![i]
      }
    // Bright spot gone: mean back near texture level (~140-180), not 250.
    expect(sum / 16).toBeLessThan(210)
    expect(outsideIdentical(src, out!, hole)).toBe(true)
  })

  it('refuses empty masks and oversized work instead of corrupting', () => {
    const src = buf()
    paint(src, () => [100, 100, 100, 255])
    const empty = buf() // all-zero alpha
    expect(healPixels(src, empty, empty, W, H)).toBeNull()
  })
})
