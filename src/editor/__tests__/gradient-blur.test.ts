import { describe, expect, it } from 'vitest'
import { gradientPosition } from '../gradient'
import { directionalBlur } from '../blur'
import { applyEffect } from '@/lib/effects'
import { defaultParams } from '@/store/useStore'

describe('gradient geometry', () => {
  it('keeps old linear direction and endpoint geometry', () => {
    expect(gradientPosition('linear', -50, 0, 50, 0)).toBe(0)
    expect(gradientPosition('linear', 50, 0, 50, 0)).toBe(1)
    expect(gradientPosition('linear', 0, -50, 50, 90)).toBe(1)
  })
  it('radial is circular unless explicitly elliptical', () => {
    expect(gradientPosition('radial', 30, 40, 50, 0)).toBe(1)
    expect(gradientPosition('radial', 0, 100, 50, 0, 2)).toBe(1)
  })
  it('reflected and diamond meet in the centre, with symmetric falloff', () => {
    expect(gradientPosition('reflected', -25, 0, 50, 0)).toBe(0.5)
    expect(gradientPosition('reflected', 25, 0, 50, 0)).toBe(0.5)
    expect(gradientPosition('diamond', 25, 25, 50, 0)).toBe(1)
    expect(gradientPosition('diamond', 0, 0, 50, 0)).toBe(0)
  })
  it('angular wraps once and never produces a negative position', () => {
    expect(gradientPosition('angle', 0, 50, 50, 0)).toBeCloseTo(0.25)
    expect(gradientPosition('angle', 0, -50, 50, 0)).toBeCloseTo(0.75)
    expect(Number.isFinite(gradientPosition('radial', 0, 0, 0, 0))).toBe(true)
  })
})

describe('filter finishing controls', () => {
  const ctx = { createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }) } as CanvasRenderingContext2D
  const img = { width: 1, height: 1, data: new Uint8ClampedArray([100, 150, 200, 128]) } as ImageData
  it('neutral finishing preserves the old result and alpha', () => {
    expect(Array.from(applyEffect(ctx, img, 'invert', defaultParams).data)).toEqual([155, 105, 55, 128])
  })
  it('saturation at minus 100 is monochrome and brightness adjusts real pixels', () => {
    const gray = applyEffect(ctx, img, 'invert', { ...defaultParams, finishSaturation: -100 }).data
    expect(gray[0]).toBe(gray[1]); expect(gray[1]).toBe(gray[2])
    const bright = applyEffect(ctx, img, 'invert', { ...defaultParams, finishBrightness: 10 }).data
    expect(bright[0]).toBeGreaterThan(155); expect(bright[3]).toBe(128)
  })
  it('zero opacity restores the original even when finish settings are active', () => {
    expect(Array.from(applyEffect(ctx, img, 'invert', { ...defaultParams, finishContrast: 50, finishBrightness: 30, opacity: 0 }).data)).toEqual(Array.from(img.data))
  })
})

describe('directional blur', () => {
  const image = () => ({ width: 7, height: 7, data: new Uint8ClampedArray(7 * 7 * 4) } as ImageData)
  it('zero reach leaves pixels unchanged', () => {
    const img = image(); img.data[0] = 73
    directionalBlur(img, 0, 0, 'motion')
    expect(img.data[0]).toBe(73)
  })
  it('direction changes the axis and transparent edges keep their original colour', () => {
    const horizontal = image(), vertical = image(), i = (3 * 7 + 3) * 4
    horizontal.data[i] = 255; horizontal.data[i + 3] = 255; vertical.data.set(horizontal.data)
    directionalBlur(horizontal, 4, 0, 'motion'); directionalBlur(vertical, 4, 90, 'motion')
    expect(horizontal.data[(3 * 7 + 2) * 4 + 3]).toBeGreaterThan(0)
    expect(horizontal.data[(2 * 7 + 3) * 4 + 3]).toBe(0)
    expect(vertical.data[(2 * 7 + 3) * 4 + 3]).toBeGreaterThan(0)
    expect(horizontal.data[(3 * 7 + 2) * 4]).toBe(255)
  })
})
