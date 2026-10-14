import { describe, expect, it } from 'vitest'
import {
  clampRect,
  docToLocal,
  layerCentre,
  localRectToDoc,
  localToDoc,
  localToSource,
  selectionToProviderCrop,
  sourceToLocal,
  type LayerTransform,
} from '../coords'

const T = (over: Partial<LayerTransform> = {}): LayerTransform => ({
  x: 100, y: 50, scaleX: 2, scaleY: 2, rotation: 0, localW: 400, localH: 300, ...over,
})

describe('refine coords: document <-> layer-local mapping', () => {
  it('identity-ish: unrotated layer maps origin and corners exactly', () => {
    const t = T()
    expect(localToDoc(t, { x: 0, y: 0 })).toEqual({ x: 100, y: 50 })
    expect(localToDoc(t, { x: 400, y: 300 })).toEqual({ x: 900, y: 650 })
    expect(localToDoc(t, { x: 200, y: 150 })).toEqual({ x: 500, y: 350 })
  })
  it('round-trips doc<->local within float tolerance (fuzz, incl. rotation)', () => {
    const rots = [0, 0.3, Math.PI / 4, Math.PI / 2, Math.PI, -1.1]
    for (const rotation of rots) {
      const t = T({ rotation, scaleX: 1.7, scaleY: 0.6, x: -40, y: 911 })
      for (const p of [{ x: 0, y: 0 }, { x: 13.5, y: 277.25 }, { x: 399.9, y: 0.1 }, { x: 200, y: 150 }]) {
        const d = localToDoc(t, p)
        const back = docToLocal(t, d)
        expect(back, `rot=${rotation} p=${JSON.stringify(p)}`).not.toBeNull()
        expect(back!.x).toBeCloseTo(p.x, 9)
        expect(back!.y).toBeCloseTo(p.y, 9)
      }
    }
  })
  it('90-degree rotation maps the local corner to the expected doc corner', () => {
    // 100x100 local, scale 1, origin (0,0): centre (50,50); local (100,0) -> (100,100) for +90deg clockwise.
    const t = T({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: Math.PI / 2, localW: 100, localH: 100 })
    const d = localToDoc(t, { x: 100, y: 0 })
    expect(d.x).toBeCloseTo(100, 9)
    expect(d.y).toBeCloseTo(100, 9)
  })
  it('negative scale (flip) round-trips and mirrors', () => {
    const t = T({ scaleX: -2, scaleY: 2 })
    const d = localToDoc(t, { x: 0, y: 0 })
    // Flipped: local left edge lands on the max-x doc edge (centre -300 + 400).
    expect(d.x).toBeCloseTo(100, 9)
    expect(localToDoc(t, { x: 400, y: 0 }).x).toBeLessThan(d.x)
    const back = docToLocal(t, d)
    expect(back!.x).toBeCloseTo(0, 9)
    expect(back!.y).toBeCloseTo(0, 9)
  })
  it('degenerate scale returns null instead of Infinity', () => {
    expect(docToLocal(T({ scaleX: 0 }), { x: 1, y: 1 })).toBeNull()
    expect(docToLocal(T({ scaleY: NaN }), { x: 1, y: 1 })).toBeNull()
  })
  it('localRectToDoc bounds a rotated layer (corners, not edges)', () => {
    const t = T({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: Math.PI / 4, localW: 100, localH: 100 })
    const r = localRectToDoc(t, { x: 0, y: 0, w: 100, h: 100 })
    // Diagonal of 100x100 square rotated 45deg.
    expect(r.w).toBeCloseTo(100 * Math.SQRT2, 6)
    expect(r.h).toBeCloseTo(100 * Math.SQRT2, 6)
  })
  it('layerCentre matches the engine convention', () => {
    expect(layerCentre(T())).toEqual({ x: 500, y: 350 })
  })
})

describe('refine coords: source pixels and provider crops', () => {
  it('local<->source scales by asset ratio', () => {
    expect(localToSource({ x: 200, y: 150 }, 400, 300, 800, 600)).toEqual({ x: 400, y: 300 })
    expect(sourceToLocal({ x: 400, y: 300 }, 400, 300, 800, 600)).toEqual({ x: 200, y: 150 })
  })
  it('selection inside the layer maps to the exact source box', () => {
    // Local == source here; layer at (100,50) scale 2: doc point (100,50) is local (0,0).
    const t = T()
    const crop = selectionToProviderCrop(t, { x: 100, y: 50, w: 200, h: 100 }, 400, 300)
    expect(crop).toEqual({ x: 0, y: 0, w: 100, h: 50, clamped: false })
  })
  it('rotated selection still yields a non-empty bounded crop', () => {
    const t = T({ rotation: Math.PI / 6 })
    const crop = selectionToProviderCrop(t, { x: 400, y: 250, w: 200, h: 200 }, 400, 300)
    expect(crop).not.toBeNull()
    expect(crop!.w).toBeGreaterThanOrEqual(1)
    expect(crop!.h).toBeGreaterThanOrEqual(1)
  })
  it('out-of-bounds selection clamps and flags', () => {
    const t = T()
    const crop = selectionToProviderCrop(t, { x: 0, y: 0, w: 500, h: 500 }, 400, 300)
    expect(crop).not.toBeNull()
    expect(crop!.clamped).toBe(true)
    expect(crop!.x).toBeGreaterThanOrEqual(0)
    expect(crop!.y).toBeGreaterThanOrEqual(0)
    expect(crop!.x + crop!.w).toBeLessThanOrEqual(400)
    expect(crop!.y + crop!.h).toBeLessThanOrEqual(300)
  })
  it('zero-area and fully-outside selections return null', () => {
    const t = T()
    expect(selectionToProviderCrop(t, { x: 10, y: 10, w: 0, h: 50 }, 400, 300)).toBeNull()
    expect(selectionToProviderCrop(t, { x: 5000, y: 5000, w: 50, h: 50 }, 400, 300)).toBeNull()
  })
  it('clampRect keeps overlap, nulls misses', () => {
    expect(clampRect({ x: -5, y: -5, w: 10, h: 10 }, { x: 0, y: 0, w: 100, h: 100 })).toEqual({ x: 0, y: 0, w: 5, h: 5 })
    expect(clampRect({ x: 200, y: 200, w: 10, h: 10 }, { x: 0, y: 0, w: 100, h: 100 })).toBeNull()
  })
})
