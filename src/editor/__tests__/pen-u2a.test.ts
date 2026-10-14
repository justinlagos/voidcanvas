import { describe, it, expect } from 'vitest'
import { node, gridCandidate, convertNodeKind, dragNodeHandle, bendSegment,
  moveNodes, convertNode, constrain45, nearestSegment, splitSegment, reverseSub } from '../pen'
import type { SubPath } from '../types'

const tri: SubPath = { closed: false, nodes: [node(0, 0), node(60, 70), node(150, 0)] }
const length = (x: number, y: number) => Math.hypot(x, y)
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 7)

describe('U2-A Bézier anchor and grid behaviour', () => {
  it('produces normal corner points by default', () => {
    expect(node(15, 31)).toMatchObject({x:15,y:31,inX:15,inY:31,outX:15,outY:31})
  })
  it('converts corners to true symmetric Bézier anchors', () => {
    const n = convertNodeKind(tri, 1, 'symmetric')
    expect(n).toMatchObject({ smooth:true, symmetric:true, auto:false })
    close(n.inX + n.outX, 2*n.x)
    close(n.inY + n.outY, 2*n.y)
    close(length(n.inX-n.x, n.inY-n.y), length(n.outX-n.x, n.outY-n.y))
  })
  it('converts symmetric nodes to smooth but unequal handle lengths', () => {
    const n = convertNodeKind(tri, 1, 'smooth')
    expect(n.smooth).toBe(true)
    expect(n.symmetric).toBe(false)
    expect(length(n.inX-n.x, n.inY-n.y)).not.toBeCloseTo(length(n.outX-n.x, n.outY-n.y))
  })
  it('corner conversion clears handles and both flags', () => {
    const n = convertNodeKind({ ...tri, nodes:[tri.nodes[0], convertNodeKind(tri,1,'symmetric'), tri.nodes[2]] }, 1, 'corner')
    expect(n).toMatchObject({smooth:false,symmetric:false,inX:60,inY:70,outX:60,outY:70})
  })
  it('throws instead of writing a nonexistent node', () => {
    expect(() => convertNodeKind(tri, 12, 'symmetric')).toThrow(RangeError)
  })
  it('symmetric outbound drag produces exactly mirrored handles', () => {
    const n = dragNodeHandle(convertNodeKind(tri,1,'symmetric'), 'out', {x:110,y:110})
    close(n.inX, 10);close(n.inY,30)
    expect(n.symmetric).toBe(true)
  })
  it('symmetric inbound drag also mirrors outbound length', () => {
    const n = dragNodeHandle(convertNodeKind(tri,1,'symmetric'), 'in', {x:20,y:30})
    close(n.outX,100);close(n.outY,110)
  })
  it('smooth drag preserves the opposite original handle length', () => {
    const sm = convertNodeKind(tri,1,'smooth')
    const was = length(sm.inX-sm.x,sm.inY-sm.y)
    const n = dragNodeHandle(sm,'out',{x:100,y:130})
    close(length(n.inX-n.x,n.inY-n.y),was)
    expect(n.symmetric).toBe(false)
  })
  it('Alt drag breaks the link and retains the other handle', () => {
    const orig = convertNodeKind(tri,1,'symmetric')
    const n = dragNodeHandle(orig,'out',{x:70,y:90},true)
    expect(n).toMatchObject({inX:orig.inX,inY:orig.inY,symmetric:false,smooth:false})
  })
  it('corner handle drag does not manufacture a linked handle', () => {
    const n = dragNodeHandle(node(30,30),'out',{x:50,y:35})
    expect(n.inX).toBe(30);expect(n.inY).toBe(30);expect(n.smooth).toBe(false)
  })
  it('ignores nonfinite handle destinations', () => {
    const n = node(5,5)
    expect(dragNodeHandle(n,'out',{x:Infinity,y:0})).toBe(n)
  })
  it('segment bending preserves symmetric anchor invariants', () => {
    const s: SubPath = {closed:false,nodes:[
      {...node(0,0),outX:20,outY:0,inX:-20,inY:0,smooth:true,symmetric:true},
      {...node(100,0),outX:120,outY:0,inX:80,inY:0,smooth:true,symmetric:true},
    ]}
    const b=bendSegment(s,0,0.5,4,25)
    for(const n of b.nodes){close(n.inX+n.outX,2*n.x);close(n.inY+n.outY,2*n.y)}
  })
  it('multi-selected anchors across subpaths move without mutating their originals', () => {
    const m:SubPath[]=[{closed:false,nodes:[convertNodeKind(tri,1,'symmetric'),node(12,12)]},
      {closed:false,nodes:[convertNodeKind(tri,1,'smooth'),node(55,55)]}]
    const moved=moveNodes(m,[{sub:0,idx:0},{sub:1,idx:0}],10,15)
    expect(moved[0].nodes[0].x).toBe(70)
    expect(moved[1].nodes[0].y).toBe(85)
    expect(m[0].nodes[0].x).toBe(60)
    expect(moved[0].nodes[0].symmetric).toBe(true)
  })
  it('grid candidate rounds to nearest document pixel grid under tolerance', () => {
    expect(gridCandidate(98.1,20,3)).toBe(100)
    expect(gridCandidate(-41,20,3)).toBe(-40)
    expect(gridCandidate(103.1,20,3)).toBeNull()
    expect(gridCandidate(0,20,3)).toBe(0)
  })
  it('grid snapping stays zoom aware through caller supplied document tolerance', () => {
    expect(gridCandidate(103,20,6)).toBe(100) // zoom=1 -> 6 doc px
    expect(gridCandidate(103,20,1.5)).toBeNull() // zoom=4 -> 1.5 doc px
  })
  it('does not snap on invalid grid sizes or values', () => {
    for(const v of [NaN,Infinity]) expect(gridCandidate(v,20,6)).toBeNull()
    expect(gridCandidate(12,0,6)).toBeNull()
    expect(gridCandidate(12,1,6)).toBeNull()
    expect(gridCandidate(12,20,0)).toBeNull()
  })
  it('continues honoring 45 degree constrained points', () => {
    const p=constrain45({x:0,y:0},{x:70,y:10})
    close(Math.abs(p.y),0)
  })
  it('adds anchors on a segment as editable points', () => {
    const s:SubPath={closed:false,nodes:[node(0,0),node(100,0)]}
    const hit=nearestSegment([s],{x:50,y:1})!
    const r=splitSegment([s],0,hit.seg,hit.t)
    expect(r.subs[0].nodes.length).toBe(3)
  })
  it('reversing an asymmetric path correctly swaps in and out handles', () => {
    const s:SubPath={closed:false,nodes:[{...node(1,2),outX:4,outY:6},node(20,30)]}
    const r=reverseSub(s)
    expect(r.nodes[1].inX).toBe(4)
    expect(r.nodes[1].inY).toBe(6)
  })
})
