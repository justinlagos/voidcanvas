import { describe, expect, it } from 'vitest'
import { scaleContent } from '../layout'
import type { Layer } from '../types'

const source: Layer = {
  id:'typography', type:'text', name:'Campaign headline', text:'A spectacular opening',
  x:100,y:100,frameId:'M',visible:true,locked:false,rev:1,opacity:1,
  scaleX:1,scaleY:1,rotation:0,blend:'source-over',mask:null,maskEnabled:false,
  fontFamily:'Inter',fontSize:60,fontWeight:700,italic:false,color:'#000',
  align:'left',lineHeight:1.3,letterSpacing:3,wordSpacing:8,indent:20,
  spaceAfter:14,baselineShift:5,boxWidth:450,outline:{color:'#fff',width:4},
  shadow:{color:'#000',x:4,y:6,blur:8},
}

describe('Cascade proportional typography',()=>{
  it('scales all absolute type spacing metrics without modifying its source',()=>{
    const v=scaleContent(source,0.5)
    if(v.type!=='text'||source.type!=='text')throw Error('Expected text')
    expect(v.fontSize).toBe(30)
    expect(v.letterSpacing).toBe(1.5)
    expect(v.wordSpacing).toBe(4)
    expect(v.indent).toBe(10)
    expect(v.spaceAfter).toBe(7)
    expect(v.baselineShift).toBe(2.5)
    expect(v.boxWidth).toBe(225)
    expect(v.lineHeight).toBe(1.3)
    expect(v.outline?.width).toBe(2)
    expect(v.shadow).toMatchObject({x:2,y:3,blur:4})
    expect(source.wordSpacing).toBe(8)
    expect(source.indent).toBe(20)
    expect(v.id).toBe(source.id)
  })
  it('preserves zero and optional metrics without inventing undefined fields',()=>{
    const plain = {...source,indent:0,wordSpacing:0,baselineShift:undefined,spaceAfter:undefined}
    const v=scaleContent(plain,1.6)
    if(v.type!=='text')throw Error('Expected text')
    expect(v.wordSpacing).toBe(0)
    expect(v.indent).toBe(0)
    expect(v.baselineShift).toBeUndefined()
    expect(v.spaceAfter).toBeUndefined()
    expect(v.fontSize).toBe(96)
  })
  it('keeps negative baseline shifts and non-integer scaling proportional',()=>{
    const v=scaleContent({...source,baselineShift:-7},1.25)
    if(v.type!=='text')throw Error('Expected text')
    expect(v.baselineShift).toBe(-8.75)
    expect(v.wordSpacing).toBe(10)
    expect(v.indent).toBe(25)
  })
})
