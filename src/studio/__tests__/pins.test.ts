import { beforeAll, describe, expect, it } from 'vitest'
import { boardBoxes, layerAt, layerSig, pinNow, placePin, type LayerBox } from '../pins'
import { applyShareEvents } from '../share-merge'
import type { Version } from '../jobs'

// Node has no DOMMatrix; layer geometry needs translate, rotate, scale and transformPoint.
class M {
  constructor(public a = 1, public b = 0, public c = 0, public d = 1, public e = 0, public f = 0) {}
  multiply(o: M) { return new M(this.a * o.a + this.c * o.b, this.b * o.a + this.d * o.b, this.a * o.c + this.c * o.d, this.b * o.c + this.d * o.d, this.a * o.e + this.c * o.f + this.e, this.b * o.e + this.d * o.f + this.f) }
  translate(x = 0, y = 0) { return this.multiply(new M(1, 0, 0, 1, x, y)) }
  scale(x = 1, y = x) { return this.multiply(new M(x, 0, 0, y, 0, 0)) }
  rotate(deg = 0) { const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return this.multiply(new M(c, s, -s, c, 0, 0)) }
  transformPoint(p: { x: number; y: number }) { return { x: this.a * p.x + this.c * p.y + this.e, y: this.b * p.x + this.d * p.y + this.f } }
}
beforeAll(() => { (globalThis as any).DOMMatrix = M })

const shape = (id: string, x: number, y: number, w: number, h: number, extra: any = {}) => ({ id, type: 'shape', shape: 'rect', name: id, x, y, w, h, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, blend: 'source-over', visible: true, fill: '#f00', stroke: null, strokeWidth: 0, ...extra }) as any
const doc = { id: 'd', name: 'D', width: 1000, height: 1000, background: '#fff' } as any

describe('pins on layers', () => {
  const boxes: LayerBox[] = [
    { id: 'photo', name: 'Photo', x: 0, y: 0, w: 500, h: 500, sig: '' },
    { id: 'title', name: 'Headline', x: 100, y: 100, w: 200, h: 50, sig: '' },
  ]
  it('matches the smallest layer under the pin', () => {
    expect(layerAt(boxes, 150, 120)?.id).toBe('title')
    expect(layerAt(boxes, 400, 400)?.id).toBe('photo')
    expect(layerAt(boxes, 900, 900)).toBeNull()
  })
  it('remembers where the pin sits on the layer', () => {
    const p = placePin({ x: 0.2, y: 0.25 }, boxes, 1000, 500)
    expect(p.layerId).toBe('title')
    expect(p.layerName).toBe('Headline')
    expect(p.rel!.x).toBeCloseTo(0.5); expect(p.rel!.y).toBeCloseTo(0.5)
  })
  it('keeps a pin that is already tied', () => {
    const p = { x: 0.9, y: 0.9, layerId: 'photo', layerName: 'Photo', rel: { x: 0.1, y: 0.1 } }
    expect(placePin(p, boxes, 1000, 500)).toBe(p)
  })
  it('follows its layer when the layer moves, and notices a change', () => {
    const before = shape('title', 100, 100, 200, 50)
    const box = { id: 'title', name: 'Headline', x: 100, y: 100, w: 200, h: 50, sig: layerSig(before, doc) }
    const pin = { x: 0.2, y: 0.125, layerId: 'title', rel: { x: 0.5, y: 0.5 } }
    const moved = shape('title', 400, 300, 200, 50)
    const now = pinNow(pin, box, null, doc, [moved])
    expect(now.x).toBeCloseTo(500); expect(now.y).toBeCloseTo(325)
    expect(now.changed).toBe(false)
    const recoloured = shape('title', 400, 300, 200, 50, { fill: '#00f' })
    expect(pinNow(pin, box, null, doc, [recoloured]).changed).toBe(true)
    const gone = pinNow(pin, box, null, doc, [])
    expect(gone.gone).toBe(true); expect(gone.x).toBeCloseTo(200)
  })
  it('records the layers a client might point at, leaving out the background and hidden layers', () => {
    const layers = [shape('bg', 0, 0, 1000, 1000), shape('a', 100, 100, 100, 100), shape('hidden', 300, 300, 50, 50, { visible: false }), shape('b', 900, 900, 200, 200)]
    const out = boardBoxes({ doc, layers, groups: [] }, null, 0.5)
    expect(out.map(b => b.id)).toEqual(['a', 'b'])
    expect(out[0]).toMatchObject({ x: 50, y: 50, w: 50, h: 50 })
    // Cut to the page: b runs off the edge.
    expect(out[1]).toMatchObject({ x: 450, y: 450, w: 50, h: 50 })
  })
  it('ties client pins from a review link to layers', () => {
    const v: Version = { id: 'v', n: 1, label: 'v1', notes: '', at: 0, images: [{ name: 'Post', blob: null as any, w: 1000, h: 500 }], pins: {}, todo: [], status: 'sent', share: { id: 's', secret: 'x', url: '', expiresAt: '2099-01-01', at: 0, seen: 0 }, boxes: { '0': boxes } }
    const next = applyShareEvents(v, [{ eid: 1, at: new Date().toISOString(), t: 'pin', id: 'p1', img: 0, x: 0.2, y: 0.25, text: 'Bigger', by: 'Ada' } as any])
    expect(next.pins['0'][0]).toMatchObject({ layerId: 'title', layerName: 'Headline' })
  })
})
