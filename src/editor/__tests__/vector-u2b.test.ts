import { describe, expect, it } from 'vitest'
import { divide, expandOps, pathfinder, toPaper } from '../vector'
import { shapeToSubpaths } from '../pen'
import type { ShapeLayer, SubPath } from '../types'
const rect = (x: number, y: number, w: number, h: number): SubPath => ({ closed: true, nodes: [[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([x,y]) => ({x,y,inX:x,inY:y,outX:x,outY:y})) })
const area = (subs: SubPath[]) => { const p = toPaper(subs); p.reorient(false, true); return Math.abs(p.area) }
const filled = (subs: SubPath[], x: number, y: number) => toPaper(subs).contains([x,y] as any)

describe('U2-B real Boolean geometry', () => {
  it.each([['unite',15000],['minusFront',5000],['minusBack',5000],['intersect',5000],['exclude',10000]] as const)('%s has the exact expected area for overlapping rectangles', (op, expected) => {
    const a = rect(0,0,100,100), b = rect(50,0,100,100)
    const before = JSON.stringify([a,b])
    expect(area(pathfinder(op, [[a],[b]])[0])).toBeCloseTo(expected, 5)
    expect(JSON.stringify([a,b])).toBe(before)
  })
  it('keeps holes in a nested compound after a real union', () => {
    const outer = rect(0,0,100,100), hole = rect(25,25,50,50)
    const result = pathfinder('unite', [[outer,hole],[rect(90,0,20,100)]])[0]
    expect(filled(result,50,50)).toBe(false)
    expect(filled(result,105,50)).toBe(true)
    expect(area(result)).toBeCloseTo(8500,5)
  })
  it('expands render-time subtraction without filling its hole', () => {
    const result = expandOps([rect(0,0,100,100), {...rect(25,25,50,50),op:'sub'}])
    expect(filled(result,50,50)).toBe(false)
    expect(filled(result,10,10)).toBe(true)
    expect(result.every(sp => !sp.op)).toBe(true)
  })
  it('retains cubic curve handles when a curved shape is cut', () => {
    const circle = shapeToSubpaths({shape:'ellipse',w:100,h:100,stroke:null,strokeWidth:0} as ShapeLayer)
    const result = pathfinder('minusFront', [circle,[rect(50,-10,70,120)]])[0]
    expect(result.flatMap(sp=>sp.nodes).some(n=>n.inX!==n.x || n.outY!==n.y)).toBe(true)
    expect(filled(result,25,50)).toBe(true)
    expect(filled(result,75,50)).toBe(false)
  })
  it('divides into nonoverlapping pieces and retains the owning fill source', () => {
    const pieces = divide([[rect(0,0,100,100)],[rect(50,0,100,100)]])
    expect(pieces.map(p=>area(p.subs)).reduce((a,b)=>a+b,0)).toBeCloseTo(15000,5)
    expect(pieces.some(p=>p.owner===0)).toBe(true)
    expect(pieces.some(p=>p.owner===1)).toBe(true)
    expect(pieces.filter(p=>filled(p.subs,75,50))).toHaveLength(1)
  })
})
