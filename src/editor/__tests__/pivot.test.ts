import { describe, expect, it } from 'vitest'
import { rotatedAbout } from '../pivot'

const rect = { id: 'a', type: 'shape', shape: 'rect', x: 100, y: 100, w: 200, h: 100, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, blend: 'source-over', visible: true, name: 'R' } as any

describe('turning around a pivot', () => {
  it('keeps the centre still for the centre pivot', () => {
    const r = rotatedAbout(rect, undefined, { x: 200, y: 150 }, Math.PI / 2)
    expect(r.x).toBeCloseTo(100); expect(r.y).toBeCloseTo(100)
  })
  it('keeps a corner still for a corner pivot', () => {
    // A quarter turn around the top left corner (100, 100): the centre (200, 150) goes to (50, 200).
    const r = rotatedAbout(rect, undefined, { x: 100, y: 100 }, Math.PI / 2)
    expect(r.x + 100).toBeCloseTo(50); expect(r.y + 50).toBeCloseTo(200)
  })
})
