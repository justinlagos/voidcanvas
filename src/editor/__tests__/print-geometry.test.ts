import { describe, expect, it } from 'vitest'
import { printGeometry } from '../print-geometry'
import { pdfPageSize } from '../export'
import { SIZE_PRESETS } from '../presets'
import { pdfxPreflight } from '../pdfx-preflight'
import type { Doc, Layer } from '../types'
const card = SIZE_PRESETS.find(p=>p.id==='card')!
const doc: Doc = {id:'d',name:'Mixed campaign',width:4000,height:3000,background:'#fff',dpi:72,
  frames:[{id:'card',name:card.label,x:1200,y:800,width:card.width,height:card.height,background:'#fff',print:card.print}]}

describe('physical print fidelity',()=>{
  it('exports a small print board at its trim size, independent of the screen document DPI',()=>{
    const size=pdfPageSize(doc.frames![0],doc.dpi)
    expect(size.dpi).toBe(300)
    expect(size.w / 72 * 25.4).toBeCloseTo(88.9,8)
    expect(size.h / 72 * 25.4).toBeCloseTo(50.8,8)
  })
  it('uses an explicit custom document resolution instead of pixel-size guessing',()=>{
    expect(pdfPageSize({width:1200,height:600},150)).toEqual({w:576,h:288,dpi:150})
  })
  it('keeps A4 exactly 210 × 297 mm despite integer pixel rounding',()=>{
    const p=SIZE_PRESETS.find(p=>p.id==='a4')!, size=pdfPageSize(p)
    expect(size.w / 72 * 25.4).toBeCloseTo(210,8)
    expect(size.h / 72 * 25.4).toBeCloseTo(297,8)
  })
  it('extends the artwork region on every side without moving the trim',()=>{
    const g=printGeometry(doc,'card',3)
    expect(g.region).toEqual({x:1164,y:764,w:1122,h:672})
    expect(g.trim).toEqual({width:1050,height:600})
    expect(g.trimMm).toEqual({widthMm:88.9,heightMm:50.8})
  })
  it('rejects nonexistent boards and malformed bleed',()=>{
    expect(()=>printGeometry(doc,'deleted',3)).toThrow()
    expect(()=>printGeometry(doc,'card',NaN)).toThrow()
    expect(()=>printGeometry(doc,'card',-2)).toThrow()
  })
  it('warns for an enlarged low-resolution source on a 300 DPI print board',()=>{
    const l={id:'photo',name:'Low res photo',frameId:'card',type:'raster',visible:true,canvas:{width:100,height:100},scaleX:3,scaleY:3} as unknown as Layer
    const q=pdfxPreflight(doc,[l],{boardId:'card',bleedMm:3})
    expect(q.some(f=>f.code==='raster-dpi'&&f.message.includes('100 effective DPI'))).toBe(true)
    expect(q.some(f=>f.code==='document-dpi')).toBe(false)
  })
})
