import { describe, expect, it } from 'vitest'
import { dpiFor, fromPx, toPx } from '../units'

describe('size units', () => {
  it('turns print sizes into pixels at the resolution', () => {
    expect(toPx(210, 'mm', 300)).toBe(2480)
    expect(toPx(297, 'mm', 300)).toBe(3508)
    expect(toPx(21, 'cm', 300)).toBe(2480)
    expect(toPx(8.5, 'in', 300)).toBe(2550)
    expect(toPx(72, 'pt', 300)).toBe(300)
    expect(toPx(1080, 'px', 300)).toBe(1080)
  })
  it('writes pixels back in each unit, rounded the usual way', () => {
    expect(fromPx(2480, 'mm', 300)).toBe(210)
    expect(fromPx(2480, 'cm', 300)).toBe(21)
    expect(fromPx(2550, 'in', 300)).toBe(8.5)
    expect(fromPx(300, 'pt', 300)).toBe(72)
    expect(fromPx(1080, 'mm', 72)).toBe(381)
  })
  it('assumes print resolution for print-sized designs', () => {
    expect(dpiFor({ width: 2480, height: 3508 })).toBe(300)
    expect(dpiFor({ width: 1080, height: 1350 })).toBe(72)
    expect(dpiFor({ width: 1080, height: 1350, dpi: 150 })).toBe(150)
  })
})
